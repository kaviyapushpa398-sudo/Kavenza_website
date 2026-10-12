import socket
import smtplib
import sqlite3
import tempfile
import unittest
from contextlib import closing
from unittest.mock import patch

from backend.app import (
    create_app,
    get_mail_config,
    send_business_inquiry_email,
    send_inquiry_confirmation_email,
    send_welcome_email,
)
from werkzeug.security import check_password_hash


class ContactEndpointTests(unittest.TestCase):
    def setUp(self):
        self.database_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.database_directory.cleanup)
        smtp_patcher = patch("backend.app.smtplib.SMTP")
        self.smtp_factory = smtp_patcher.start()
        self.addCleanup(smtp_patcher.stop)
        self.smtp_factory.return_value.__enter__.return_value.send_message.return_value = {}
        self.app = create_app(
            {
                "TESTING": True,
                "SECRET_KEY": "test-session-secret",
                "DATABASE_PATH": f"{self.database_directory.name}\\test.sqlite3",
                "CONTACT_ALLOWED_ORIGIN": "http://127.0.0.1:5173",
                "SESSION_COOKIE_SAMESITE": "Lax",
                "SESSION_COOKIE_SECURE": False,
                "MAIL_BUSINESS_EMAIL": "contact@example.test",
                "SMTP_HOST": "smtp.example.test",
                "SMTP_PORT": "587",
                "SMTP_USERNAME": "sender@example.test",
                "SMTP_PASSWORD": "test-password",
            }
        )
        self.client = self.app.test_client()
        self.headers = {
            "Origin": "http://127.0.0.1:5173",
            "Content-Type": "application/json",
        }

    def valid_payload(self):
        return {
            "projectType": "AI Product",
            "name": "Mani",
            "email": "mani@example.test",
            "organization": "Test Organization",
            "message": "I would like to discuss a new product.",
        }

    def test_valid_contact_sends_email_with_business_sender_and_reply_to(self):
        with patch("backend.app.smtplib.SMTP") as smtp_factory:
            smtp = smtp_factory.return_value.__enter__.return_value
            smtp.send_message.return_value = {}
            response = self.client.post(
                "/api/contact", json=self.valid_payload(), headers=self.headers
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"status": "sent"})
        smtp_factory.assert_called_once_with("smtp.example.test", 587, timeout=10)
        self.assertEqual(smtp.send_message.return_value, {})
        smtp.starttls.assert_called_once()
        self.assertIsNotNone(smtp.starttls.call_args.kwargs["context"])
        smtp.login.assert_called_once_with("sender@example.test", "test-password")
        method_names = [call[0] for call in smtp.method_calls]
        self.assertLess(method_names.index("starttls"), method_names.index("login"))
        self.assertLess(method_names.index("login"), method_names.index("send_message"))
        sent_email = smtp.send_message.call_args.args[0]
        self.assertEqual(sent_email["From"], "sender@example.test")
        self.assertEqual(sent_email["To"], "contact@example.test")
        self.assertEqual(sent_email["Reply-To"], "mani@example.test")
        self.assertEqual(
            sent_email["Subject"], "KAVENZA Inquiry | AI Product | Mani"
        )
        body = sent_email.get_content()
        self.assertEqual(
            body.splitlines()[0], "Customer: Mani | Email: mani@example.test"
        )
        self.assertIn("NEW CUSTOMER INQUIRY", body)
        self.assertIn("Customer Name: Mani", body)
        self.assertIn("Customer Email: mani@example.test", body)
        self.assertIn("Project Type: AI Product", body)
        self.assertIn("Organization: Test Organization", body)
        self.assertIn("Customer Message:", body)
        self.assertIn("I would like to discuss a new product.", body)

    def test_invalid_email_is_rejected_without_sending(self):
        for invalid_email in ("not-an-email", "visitor@example.test\r\nBcc:attacker@example.test"):
            with self.subTest(email=invalid_email):
                payload = self.valid_payload()
                payload["email"] = invalid_email
                with patch("backend.app.smtplib.SMTP") as smtp_factory:
                    response = self.client.post(
                        "/api/contact", json=payload, headers=self.headers
                    )

                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json, {"error": "Please enter a valid email address."})
                smtp_factory.assert_not_called()

    def test_missing_fields_are_rejected(self):
        response = self.client.post(
            "/api/contact", json={"name": "Test Visitor"}, headers=self.headers
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json, {"error": "Please provide all contact form fields."})

    def test_unapproved_origin_is_rejected(self):
        response = self.client.post(
            "/api/contact",
            json=self.valid_payload(),
            headers={**self.headers, "Origin": "https://unapproved.example"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

    def test_smtp_failure_returns_safe_json_error(self):
        with patch("backend.app.smtplib.SMTP") as smtp_factory:
            smtp_factory.return_value.__enter__.side_effect = smtplib.SMTPException(
                "internal smtp detail"
            )
            with self.assertLogs(self.app.logger.name, level="ERROR") as captured:
                response = self.client.post(
                    "/api/contact", json=self.valid_payload(), headers=self.headers
                )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json,
            {"error": "We could not send your message. Please try again later."},
        )
        self.assertNotIn("internal smtp detail", response.get_data(as_text=True))
        self.assertTrue(any("SMTPException" in message for message in captured.output))
        self.assertIn("internal smtp detail", "\n".join(captured.output))
        self.assertIn("smtp_host=smtp.example.test, smtp_port=587", "\n".join(captured.output))

    def test_smtp_connection_errors_log_sanitized_diagnostics(self):
        failures = (
            (
                socket.gaierror(
                    socket.EAI_AGAIN,
                    "DNS lookup temporarily failed sender@example.test "
                    "contact@example.test test-password test-session-secret",
                ),
                "DNS lookup",
            ),
            (
                TimeoutError(
                    "SMTP connection timed out sender@example.test "
                    "contact@example.test test-password test-session-secret"
                ),
                "connection timed out",
            ),
            (
                ConnectionRefusedError(
                    "SMTP connection refused sender@example.test "
                    "contact@example.test test-password test-session-secret"
                ),
                "connection refused",
            ),
        )
        for error, diagnostic in failures:
            with self.subTest(error=type(error).__name__):
                with patch(
                    "backend.app.send_contact_email", side_effect=error
                ), self.assertLogs(self.app.logger.name, level="ERROR") as captured:
                    response = self.client.post(
                        "/api/contact", json=self.valid_payload(), headers=self.headers
                    )

                log_output = "\n".join(captured.output)
                self.assertEqual(response.status_code, 502)
                self.assertEqual(
                    response.json,
                    {"error": "We could not send your message. Please try again later."},
                )
                self.assertIn(type(error).__name__, log_output)
                self.assertIn(diagnostic, log_output)
                for sensitive_value in (
                    "sender@example.test",
                    "contact@example.test",
                    "test-password",
                    "test-session-secret",
                ):
                    self.assertNotIn(sensitive_value, log_output)

    def test_gmail_mail_configuration_requires_valid_environment_values(self):
        config = {
            "MAIL_BUSINESS_EMAIL": "contact@gmail.com",
            "SMTP_HOST": "smtp.gmail.com",
            "SMTP_PORT": "587",
            "SMTP_USERNAME": "sender@gmail.com",
            "SMTP_PASSWORD": "gmail-app-password",
        }
        self.assertEqual(
            get_mail_config(config),
            {
                "business_email": "contact@gmail.com",
                "host": "smtp.gmail.com",
                "port": 587,
                "username": "sender@gmail.com",
                "password": "gmail-app-password",
            },
        )

        for field, invalid_value in (
            ("MAIL_BUSINESS_EMAIL", "not-an-email"),
            ("SMTP_PORT", "not-a-port"),
            ("SMTP_PORT", "0"),
            ("SMTP_PORT", "65536"),
        ):
            with self.subTest(field=field, value=invalid_value):
                self.assertIsNone(
                    get_mail_config({**config, field: invalid_value})
                )

        for field in (
            "MAIL_BUSINESS_EMAIL",
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_USERNAME",
            "SMTP_PASSWORD",
        ):
            with self.subTest(missing=field):
                self.assertIsNone(get_mail_config({**config, field: ""}))

    def test_missing_email_configuration_returns_503_without_sending(self):
        self.app.config["SMTP_PASSWORD"] = ""
        with patch("backend.app.smtplib.SMTP") as smtp_factory:
            response = self.client.post(
                "/api/contact", json=self.valid_payload(), headers=self.headers
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json, {"error": "The contact service is not configured."}
        )
        smtp_factory.assert_not_called()

    def test_refused_recipient_returns_error_instead_of_success(self):
        with patch("backend.app.smtplib.SMTP") as smtp_factory:
            smtp = smtp_factory.return_value.__enter__.return_value
            smtp.send_message.return_value = {
                "contact@example.test": (550, b"recipient rejected")
            }
            response = self.client.post(
                "/api/contact", json=self.valid_payload(), headers=self.headers
            )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json,
            {"error": "We could not send your message. Please try again later."},
        )
        self.assertNotIn("recipient rejected", response.get_data(as_text=True))

    def test_options_preflight_returns_cors_headers_for_exact_origin(self):
        response = self.client.options("/api/contact", headers={"Origin": self.headers["Origin"]})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"status": "ok"})
        self.assertEqual(
            response.headers["Access-Control-Allow-Origin"], "http://127.0.0.1:5173"
        )

    def registration_payload(self):
        return {
            "name": "Test Customer",
            "age": None,
            "department": "Computer Science",
            "college": "Test College",
            "university": "Test University",
            "mobile": "+91 98765 43210",
            "email": "Customer@Example.test",
            "password": "a-strong-password-123",
            "confirmPassword": "a-strong-password-123",
        }

    def register_customer(self):
        with patch("backend.app.send_welcome_email"):
            response = self.client.post(
                "/api/auth/register", json=self.registration_payload(), headers=self.headers
            )
        self.assertEqual(response.status_code, 201)
        return response

    def login_customer(self, client=None, email="customer@example.test"):
        client = client or self.client
        response = client.post(
            "/api/auth/login",
            json={"email": email, "password": "a-strong-password-123"},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        return response

    def project_payload(self):
        return {
            "title": "Customer project inquiry",
            "category": "Web Application",
            "description": "A customer-owned project inquiry with enough detail to pass validation.",
            "technologies": ["React", "Flask"],
            "requirements": "Accessible and mobile-friendly.",
        }

    def test_registration_hashes_password_and_sends_welcome_email(self):
        with patch("backend.app.send_welcome_email") as send_welcome:
            response = self.client.post(
                "/api/auth/register", json=self.registration_payload(), headers=self.headers
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["status"], "created")
        self.assertTrue(response.json["emailSent"])
        send_welcome.assert_called_once()
        self.assertEqual(send_welcome.call_args.args[:2], ("Test Customer", "customer@example.test"))
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            row = connection.execute(
                "SELECT email, mobile, password_hash FROM customers"
            ).fetchone()
        self.assertEqual(row[0], "customer@example.test")
        self.assertEqual(row[1], "+919876543210")
        self.assertNotEqual(row[2], "a-strong-password-123")
        self.assertTrue(check_password_hash(row[2], "a-strong-password-123"))

    def test_registration_validation_rejects_invalid_fields(self):
        cases = (
            ("email", "not-an-email"),
            ("mobile", "12345"),
            ("confirmPassword", "a-different-password"),
            ("password", "short"),
        )
        for field, value in cases:
            with self.subTest(field=field):
                payload = self.registration_payload()
                payload[field] = value
                response = self.client.post("/api/auth/register", json=payload, headers=self.headers)
                self.assertEqual(response.status_code, 400)

    def test_duplicate_email_is_rejected_without_sending_a_second_email(self):
        self.register_customer()
        with patch("backend.app.send_welcome_email") as send_welcome:
            response = self.client.post(
                "/api/auth/register", json=self.registration_payload(), headers=self.headers
            )
        self.assertEqual(response.status_code, 409)
        send_welcome.assert_not_called()

    def test_email_failure_does_not_remove_created_account(self):
        with patch(
            "backend.app.send_welcome_email",
            side_effect=smtplib.SMTPException("private provider detail"),
        ), self.assertLogs(self.app.logger.name, level="ERROR") as captured:
            response = self.client.post(
                "/api/auth/register", json=self.registration_payload(), headers=self.headers
            )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json["emailSent"])
        self.assertNotIn("private provider detail", response.get_data(as_text=True))
        self.assertNotIn("private provider detail", "\n".join(captured.output))
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            count = connection.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        self.assertEqual(count, 1)

    def test_welcome_email_has_branded_html_and_plain_text(self):
        mail_config = {
            "business_email": "contact@example.test",
            "host": "smtp.example.test",
            "port": 587,
            "username": "sender@example.test",
            "password": "test-password",
        }
        with patch("backend.app.smtplib.SMTP") as smtp_factory:
            smtp = smtp_factory.return_value.__enter__.return_value
            smtp.send_message.return_value = {}
            send_welcome_email("<Customer>", "customer@example.test", mail_config)

        sent_email = smtp.send_message.call_args.args[0]
        self.assertEqual(sent_email["Subject"], "Welcome to KAVENZA | Registration Successful")
        self.assertEqual(sent_email["From"], "contact@example.test")
        self.assertEqual(sent_email["To"], "customer@example.test")
        self.assertIn("Hi <Customer>", sent_email.get_body(("plain",)).get_content())
        html = sent_email.get_body(("html",)).get_content()
        self.assertIn("Hi &lt;Customer&gt;", html)
        smtp_factory.assert_called_once_with("smtp.example.test", 587, timeout=10)

    def test_login_dashboard_and_logout_use_customer_session(self):
        self.register_customer()
        response = self.client.post(
            "/api/auth/login",
            json={"email": "customer@example.test", "password": "a-strong-password-123"},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "authenticated")
        self.assertIn("HttpOnly", response.headers["Set-Cookie"])
        self.assertIn("SameSite=Lax", response.headers["Set-Cookie"])
        self.assertNotIn("Secure", response.headers["Set-Cookie"])
        dashboard = self.client.get("/api/auth/dashboard", headers=self.headers)
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.json["profile"]["email"], "customer@example.test")
        self.assertEqual(dashboard.json["accountStatus"], "Registered")
        self.assertEqual(
            dashboard.json["summary"],
            {"total": 0, "pending": 0, "inProgress": 0, "completed": 0},
        )
        self.assertNotIn("password_hash", dashboard.json["profile"])
        logout = self.client.post("/api/auth/logout", json={}, headers=self.headers)
        self.assertEqual(logout.status_code, 200)
        self.assertIn("HttpOnly", logout.headers["Set-Cookie"])
        session_after_logout = self.client.get("/api/auth/session", headers=self.headers)
        self.assertEqual(session_after_logout.status_code, 200)
        self.assertEqual(session_after_logout.json, {"user": None})
        self.assertEqual(
            session_after_logout.headers["Access-Control-Allow-Origin"],
            self.headers["Origin"],
        )
        self.assertEqual(
            session_after_logout.headers["Access-Control-Allow-Credentials"], "true"
        )
        self.assertEqual(
            self.client.get("/api/auth/dashboard", headers=self.headers).status_code, 401
        )

    def test_inquiry_submission_persists_and_triggers_both_email_notifications(self):
        self.register_customer()
        self.login_customer()
        with patch("backend.app.send_inquiry_confirmation_email") as customer_email, patch(
            "backend.app.send_business_inquiry_email"
        ) as business_email:
            response = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=self.headers
            )

        self.assertEqual(response.status_code, 201)
        project = response.json["project"]
        self.assertEqual(
            response.json["emailNotifications"],
            {"business": "sent", "customer": "sent"},
        )
        customer_email.assert_called_once()
        business_email.assert_called_once()
        self.assertEqual(
            customer_email.call_args.args[0]["email"], "customer@example.test"
        )
        self.assertEqual(
            business_email.call_args.args[0]["email"], "customer@example.test"
        )
        self.assertEqual(
            business_email.call_args.args[1], "contact@example.test"
        )
        self.assertEqual(
            customer_email.call_args.args[1]["title"], "Customer project inquiry"
        )
        self.assertEqual(
            customer_email.call_args.args[1]["status"], "Inquiry Submitted"
        )
        self.assertEqual(
            customer_email.call_args.args[1]["created_at"], project["created_at"]
        )
        self.assertEqual(
            business_email.call_args.args[2], customer_email.call_args.args[1]
        )
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            saved = connection.execute(
                "SELECT id FROM projects WHERE id = ?", (project["id"],)
            ).fetchone()
        self.assertIsNotNone(saved)

    def test_invalid_inquiry_does_not_trigger_email_notifications(self):
        self.register_customer()
        self.login_customer()
        payload = self.project_payload()
        payload["title"] = ""
        with patch("backend.app.send_inquiry_confirmation_email") as customer_email, patch(
            "backend.app.send_business_inquiry_email"
        ) as business_email:
            response = self.client.post(
                "/api/auth/projects", json=payload, headers=self.headers
            )

        self.assertEqual(response.status_code, 400)
        customer_email.assert_not_called()
        business_email.assert_not_called()

    def test_inquiry_email_failures_are_logged_without_erasing_saved_inquiry(self):
        self.register_customer()
        self.login_customer()
        with patch(
            "backend.app.send_inquiry_confirmation_email",
            side_effect=smtplib.SMTPAuthenticationError(535, b"authentication failed"),
        ), patch(
            "backend.app.send_business_inquiry_email",
            side_effect=OSError("private transport detail"),
        ), self.assertLogs(self.app.logger.name, level="ERROR") as captured:
            response = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=self.headers
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json["emailNotifications"],
            {"business": "failed", "customer": "failed"},
        )
        self.assertTrue(any("SMTP authentication" in message for message in captured.output))
        self.assertTrue(any("SMTP connection" in message for message in captured.output))
        self.assertNotIn("private transport detail", "\n".join(captured.output))
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            count = connection.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        self.assertEqual(count, 1)

    def test_business_notification_failure_is_reported_and_retry_skips_sent_acknowledgement(self):
        self.register_customer()
        self.login_customer()
        headers = {**self.headers, "Idempotency-Key": "d94f4c29-c54a-4c58-a031-881132116a18"}
        with patch(
            "backend.app.send_business_inquiry_email",
            side_effect=smtplib.SMTPException("business mail unavailable"),
        ) as business_email, patch(
            "backend.app.send_inquiry_confirmation_email"
        ) as customer_email, self.assertLogs(self.app.logger.name, level="ERROR"):
            response = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=headers
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json["emailNotifications"],
            {"business": "failed", "customer": "sent"},
        )
        customer_email.assert_called_once()

        with patch("backend.app.send_business_inquiry_email") as retry_business, patch(
            "backend.app.send_inquiry_confirmation_email"
        ) as retry_customer:
            retry = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=headers
            )

        self.assertEqual(retry.status_code, 201)
        self.assertTrue(retry.json["duplicateSubmission"])
        self.assertEqual(
            retry.json["emailNotifications"],
            {"business": "sent", "customer": "sent"},
        )
        retry_business.assert_called_once()
        retry_customer.assert_not_called()
        self.assertEqual(business_email.call_count, 1)
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            count = connection.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        self.assertEqual(count, 1)

    def test_customer_acknowledgement_failure_is_reported_and_retry_skips_business_email(self):
        self.register_customer()
        self.login_customer()
        headers = {**self.headers, "Idempotency-Key": "cb78f60c-8a99-47a2-9913-5772262cc779"}
        with patch(
            "backend.app.send_business_inquiry_email"
        ) as business_email, patch(
            "backend.app.send_inquiry_confirmation_email",
            side_effect=smtplib.SMTPConnectError(421, "temporary failure"),
        ), self.assertLogs(self.app.logger.name, level="ERROR"):
            response = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=headers
            )

        self.assertEqual(
            response.json["emailNotifications"],
            {"business": "sent", "customer": "failed"},
        )
        business_email.assert_called_once()

        with patch("backend.app.send_business_inquiry_email") as retry_business, patch(
            "backend.app.send_inquiry_confirmation_email"
        ) as retry_customer:
            retry = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=headers
            )

        self.assertEqual(
            retry.json["emailNotifications"],
            {"business": "sent", "customer": "sent"},
        )
        retry_business.assert_not_called()
        retry_customer.assert_called_once()

    def test_repeating_successful_submission_does_not_resend_emails(self):
        self.register_customer()
        self.login_customer()
        headers = {**self.headers, "Idempotency-Key": "453a02d4-eed1-4de3-98dc-f1de2d62f1fd"}
        with patch("backend.app.send_business_inquiry_email") as business_email, patch(
            "backend.app.send_inquiry_confirmation_email"
        ) as customer_email:
            first = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=headers
            )
            second = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=headers
            )

        self.assertEqual(first.json["project"]["id"], second.json["project"]["id"])
        self.assertFalse(first.json["duplicateSubmission"])
        self.assertTrue(second.json["duplicateSubmission"])
        business_email.assert_called_once()
        customer_email.assert_called_once()
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            count = connection.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        self.assertEqual(count, 1)

    def test_missing_business_notification_address_is_logged_after_saving(self):
        self.register_customer()
        self.login_customer()
        self.app.config["MAIL_BUSINESS_EMAIL"] = ""
        with patch("backend.app.send_inquiry_confirmation_email") as customer_email, patch(
            "backend.app.send_business_inquiry_email"
        ) as business_email, self.assertLogs(self.app.logger.name, level="ERROR") as captured:
            response = self.client.post(
                "/api/auth/projects", json=self.project_payload(), headers=self.headers
            )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(any("MAIL_BUSINESS_EMAIL is not configured" in message for message in captured.output))
        customer_email.assert_not_called()
        business_email.assert_not_called()
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            count = connection.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        self.assertEqual(count, 1)

    def test_inquiry_email_senders_include_expected_details_and_mock_smtp(self):
        mail_config = {
            "business_email": "contact@example.test",
            "host": "smtp.example.test",
            "port": 587,
            "username": "sender@example.test",
            "password": "test-password",
        }
        customer = {
            "id": "customer-1",
            "name": "Test Customer",
            "email": "customer@example.test",
            "mobile": "+919876543210",
        }
        project = {
            "id": "KZ-TEST123456",
            "title": "Customer project inquiry",
            "category": "Web Application",
            "description": "A sufficiently detailed description for email testing.",
            "technologies": ["React", "Flask"],
            "requirements": "Accessible and mobile-friendly.",
            "status": "Inquiry Submitted",
            "created_at": "2026-10-11T12:00:00+00:00",
        }
        with patch("backend.app.smtplib.SMTP") as smtp_factory:
            smtp = smtp_factory.return_value.__enter__.return_value
            smtp.send_message.return_value = {}
            send_inquiry_confirmation_email(customer, project, mail_config)
            send_business_inquiry_email(
                customer,
                "contact@example.test",
                project,
                mail_config,
            )

        self.assertEqual(smtp.send_message.call_count, 2)
        customer_message, business_message = [
            call.args[0] for call in smtp.send_message.call_args_list
        ]
        customer_content = customer_message.get_body(("plain",)).get_content()
        self.assertEqual(customer_message["From"], "sender@example.test")
        self.assertEqual(customer_message["To"], "customer@example.test")
        self.assertEqual(customer_message["Reply-To"], "contact@example.test")
        self.assertEqual(
            customer_message["Subject"],
            "KAVENZA | Your Project Inquiry Has Been Received",
        )
        self.assertIn("Dear Test Customer", customer_content)
        self.assertIn("Customer project inquiry", customer_content)
        self.assertIn("expected initial review and response period is within 7 days", customer_content)
        self.assertNotIn("7 days of receiving your inquiry for project delivery", customer_content)
        business_content = business_message.get_body(("plain",)).get_content()
        self.assertEqual(business_message["From"], "sender@example.test")
        self.assertEqual(business_message["To"], "contact@example.test")
        self.assertEqual(business_message["Reply-To"], "customer@example.test")
        self.assertEqual(
            business_message["Subject"],
            "New KAVENZA Inquiry | Customer project inquiry | Web Application",
        )
        for detail in (
            "Test Customer",
            "customer@example.test",
            "+919876543210",
            project["title"],
            project["category"],
            project["description"],
            "React, Flask",
            project["requirements"],
            project["id"],
            project["status"],
        ):
            self.assertIn(detail, business_content)
        self.assertIn(project["created_at"], business_content)

    def test_registered_account_survives_backend_app_restart(self):
        payload = self.registration_payload()
        with patch("backend.app.send_welcome_email") as send_welcome:
            created = self.client.post(
                "/api/auth/register", json=payload, headers=self.headers
            )
        self.assertEqual(created.status_code, 201)
        send_welcome.assert_called_once()

        database_path = self.app.config["DATABASE_PATH"]
        with closing(sqlite3.connect(database_path)) as connection:
            row = connection.execute(
                "SELECT email, password_hash FROM customers WHERE email = ?",
                ("customer@example.test",),
            ).fetchone()
        self.assertIsNotNone(row)
        self.assertNotEqual(row[1], payload["password"])
        self.assertTrue(check_password_hash(row[1], payload["password"]))

        restarted_app = create_app(
            {
                "TESTING": True,
                "SECRET_KEY": "test-session-secret",
                "DATABASE_PATH": database_path,
                "CONTACT_ALLOWED_ORIGIN": "http://127.0.0.1:5173",
                "SESSION_COOKIE_SAMESITE": "Lax",
                "SESSION_COOKIE_SECURE": False,
                "MAIL_BUSINESS_EMAIL": "",
                "SMTP_HOST": "",
                "SMTP_PORT": "",
                "SMTP_USERNAME": "",
                "SMTP_PASSWORD": "",
            }
        )
        restarted_client = restarted_app.test_client()
        successful_login = restarted_client.post(
            "/api/auth/login",
            json={"email": payload["email"], "password": payload["password"]},
            headers=self.headers,
        )
        self.assertEqual(successful_login.status_code, 200)
        self.assertEqual(successful_login.json["user"]["email"], "customer@example.test")
        self.assertEqual(
            restarted_client.get(
                "/api/auth/dashboard", headers=self.headers
            ).status_code,
            200,
        )

        restarted_client.post(
            "/api/auth/logout", json={}, headers=self.headers
        )
        self.assertEqual(
            restarted_client.get(
                "/api/auth/dashboard", headers=self.headers
            ).status_code,
            401,
        )
        failed_login = restarted_app.test_client().post(
            "/api/auth/login",
            json={"email": payload["email"], "password": "incorrect-password"},
            headers=self.headers,
        )
        self.assertEqual(failed_login.status_code, 401)

        with patch("backend.app.send_welcome_email") as duplicate_email:
            duplicate = restarted_app.test_client().post(
                "/api/auth/register", json=payload, headers=self.headers
            )
        self.assertEqual(duplicate.status_code, 409)
        duplicate_email.assert_not_called()

    def test_dashboard_uses_real_customer_project_counts_and_persisted_activity(self):
        self.register_customer()
        self.login_customer()
        before = self.client.get("/api/auth/dashboard", headers=self.headers)
        self.assertEqual(before.status_code, 200)
        self.assertEqual(
            before.json["summary"],
            {"total": 0, "pending": 0, "inProgress": 0, "completed": 0},
        )

        submitted = self.client.post(
            "/api/auth/projects", json=self.project_payload(), headers=self.headers
        )
        self.assertEqual(submitted.status_code, 201)
        self.assertEqual(submitted.json["project"]["status"], "Inquiry Submitted")
        self.assertEqual(submitted.json["project"]["technologies"], ["React", "Flask"])

        after = self.client.get("/api/auth/dashboard", headers=self.headers)
        self.assertEqual(after.json["summary"]["total"], 1)
        self.assertEqual(after.json["summary"]["pending"], 1)
        self.assertEqual(after.json["summary"]["inProgress"], 0)
        self.assertEqual(after.json["projects"][0]["id"], submitted.json["project"]["id"])
        self.assertEqual(after.json["activity"][0]["type"], "inquiry_submitted")
        self.assertEqual(after.json["unreadNotifications"], 2)
        with closing(sqlite3.connect(self.app.config["DATABASE_PATH"])) as connection:
            connection.execute(
                "UPDATE projects SET status = 'In Progress' WHERE id = ?",
                (submitted.json["project"]["id"],),
            )
            connection.commit()
        updated = self.client.get("/api/auth/dashboard", headers=self.headers)
        self.assertEqual(updated.json["summary"]["pending"], 0)
        self.assertEqual(updated.json["summary"]["inProgress"], 1)

    def test_project_validation_requires_all_valid_fields(self):
        self.register_customer()
        self.login_customer()
        cases = (
            ({**self.project_payload(), "description": "short"},),
            ({**self.project_payload(), "category": "Unlisted"},),
            ({**self.project_payload(), "technologies": "React, Flask"},),
            ({**self.project_payload(), "title": ""},),
        )
        for (payload,) in cases:
            with self.subTest(payload=payload):
                response = self.client.post("/api/auth/projects", json=payload, headers=self.headers)
                self.assertEqual(response.status_code, 400)

    def test_project_inquiry_requires_authenticated_session(self):
        response = self.client.post(
            "/api/auth/projects", json=self.project_payload(), headers=self.headers
        )
        self.assertEqual(response.status_code, 401)

    def test_project_submission_preflight_allows_idempotency_key_header(self):
        response = self.client.options(
            "/api/auth/projects",
            headers={
                "Origin": self.headers["Origin"],
                "Access-Control-Request-Headers": "content-type, idempotency-key",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "Idempotency-Key",
            response.headers["Access-Control-Allow-Headers"],
        )

    def test_customer_cannot_read_another_customers_project_or_notifications(self):
        self.register_customer()
        self.login_customer()
        submitted = self.client.post(
            "/api/auth/projects", json=self.project_payload(), headers=self.headers
        )
        project_id = submitted.json["project"]["id"]
        first_customer_notifications = self.client.get(
            "/api/auth/notifications", headers=self.headers
        ).json["notifications"]
        first_customer_inquiry_notice = next(
            notification for notification in first_customer_notifications
            if notification["project_id"] == project_id
        )

        second_payload = self.registration_payload()
        second_payload["email"] = "second-customer@example.test"
        with patch("backend.app.send_welcome_email"):
            second_registration = self.client.post(
                "/api/auth/register", json=second_payload, headers=self.headers
            )
        self.assertEqual(second_registration.status_code, 201)
        second_client = self.app.test_client()
        self.login_customer(second_client, email="second-customer@example.test")

        own_projects = second_client.get("/api/auth/projects", headers=self.headers)
        other_project = second_client.get(
            f"/api/auth/projects/{project_id}", headers=self.headers
        )
        own_dashboard = second_client.get("/api/auth/dashboard", headers=self.headers)
        own_notifications = second_client.get("/api/auth/notifications", headers=self.headers)
        self.assertEqual(own_projects.json["projects"], [])
        self.assertEqual(other_project.status_code, 404)
        self.assertEqual(own_dashboard.json["summary"]["total"], 0)
        self.assertEqual(len(own_notifications.json["notifications"]), 1)
        unauthorized_read = second_client.post(
            f"/api/auth/notifications/{first_customer_inquiry_notice['id']}/read",
            json={},
            headers=self.headers,
        )
        self.assertEqual(unauthorized_read.status_code, 404)

    def test_notifications_are_customer_scoped_and_can_be_marked_read(self):
        self.register_customer()
        self.login_customer()
        events = self.client.get("/api/auth/notifications", headers=self.headers)
        self.assertEqual(events.status_code, 200)
        self.assertEqual(len(events.json["notifications"]), 1)
        notification_id = events.json["notifications"][0]["id"]
        read_response = self.client.post(
            f"/api/auth/notifications/{notification_id}/read",
            json={},
            headers=self.headers,
        )
        self.assertEqual(read_response.status_code, 200)
        dashboard = self.client.get("/api/auth/dashboard", headers=self.headers)
        self.assertEqual(dashboard.json["unreadNotifications"], 0)
        stranger = self.app.test_client()
        self.assertEqual(
            stranger.post(
                f"/api/auth/notifications/{notification_id}/read",
                json={},
                headers=self.headers,
            ).status_code,
            401,
        )

    def test_login_errors_are_generic_and_dashboard_requires_authentication(self):
        self.register_customer()
        wrong_password = self.client.post(
            "/api/auth/login",
            json={"email": "customer@example.test", "password": "incorrect-password"},
            headers=self.headers,
        )
        unknown_email = self.client.post(
            "/api/auth/login",
            json={"email": "unknown@example.test", "password": "incorrect-password"},
            headers=self.headers,
        )
        self.assertEqual(wrong_password.status_code, 401)
        self.assertEqual(unknown_email.status_code, 401)
        self.assertEqual(wrong_password.json, unknown_email.json)
        self.assertEqual(
            self.client.get("/api/auth/dashboard", headers=self.headers).status_code, 401
        )

    def test_login_attempts_are_rate_limited(self):
        self.app.config["LOGIN_RATE_LIMIT"] = 2
        for _ in range(2):
            self.client.post(
                "/api/auth/login",
                json={"email": "unknown@example.test", "password": "incorrect-password"},
                headers=self.headers,
            )
        response = self.client.post(
            "/api/auth/login",
            json={"email": "unknown@example.test", "password": "incorrect-password"},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 429)

    def test_auth_endpoints_reject_unapproved_origins(self):
        response = self.client.post(
            "/api/auth/register",
            json=self.registration_payload(),
            headers={**self.headers, "Origin": "https://unapproved.example"},
        )
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
