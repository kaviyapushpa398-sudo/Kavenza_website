import os
import hashlib
import hmac
import json
import re
import secrets
import smtplib
import sqlite3
import ssl
import time
import uuid
from contextlib import closing, contextmanager
from datetime import datetime, timezone
from email.message import EmailMessage
from html import escape
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash


PROJECT_TYPES = {
    "AI Product",
    "Web Application",
    "Business Solution",
    "Partnership",
    "Something Else",
}
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
INDIAN_MOBILE_PATTERN = re.compile(r"^(?:\+91)?[6-9]\d{9}$")
ALLOWED_FIELDS = {"projectType", "name", "email", "organization", "message"}
REGISTRATION_FIELDS = {
    "name",
    "age",
    "department",
    "college",
    "university",
    "mobile",
    "email",
    "password",
    "confirmPassword",
}
PROJECT_FIELDS = {"title", "category", "description", "technologies", "requirements"}
PROJECT_STATUSES = {
    "Inquiry Submitted",
    "Under Review",
    "Awaiting Customer Response",
    "Approved",
    "In Progress",
    "Completed",
    "Cancelled",
}
DUMMY_PASSWORD_HASH = generate_password_hash("not-a-real-customer-password")


def create_app(test_config=None):
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    app = Flask(__name__)
    default_database = Path(__file__).resolve().with_name("kavenza.sqlite3")
    configured_secret = os.environ.get("SECRET_KEY", "").strip()
    secret_is_usable = bool(configured_secret) and configured_secret.lower() not in {
        "replace-with-a-long-random-secret",
        "your-secret-key",
    }
    app.config.from_mapping(
        SECRET_KEY=configured_secret if secret_is_usable else secrets.token_hex(32),
        DATABASE_PATH=os.environ.get("DATABASE_PATH", str(default_database)),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE=os.environ.get("SESSION_COOKIE_SAMESITE", "Lax"),
        SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "").lower()
        in {"1", "true", "yes"},
        LOGIN_RATE_LIMIT=10,
        LOGIN_RATE_WINDOW=900,
        CONTACT_ALLOWED_ORIGIN=os.environ.get("CONTACT_ALLOWED_ORIGIN", ""),
        MAIL_BUSINESS_EMAIL=os.environ.get("MAIL_BUSINESS_EMAIL", ""),
        SMTP_HOST=os.environ.get("SMTP_HOST", ""),
        SMTP_PORT=os.environ.get("SMTP_PORT", ""),
        SMTP_USERNAME=os.environ.get("SMTP_USERNAME", ""),
        SMTP_PASSWORD=os.environ.get("SMTP_PASSWORD", ""),
        MAX_CONTENT_LENGTH=16 * 1024,
    )
    if test_config:
        app.config.update(test_config)

    if not secret_is_usable and not (test_config and test_config.get("SECRET_KEY")):
        app.logger.warning("SECRET_KEY is unset; sessions will not survive an application restart.")

    initialize_database(app)

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin and origin == app.config["CONTACT_ALLOWED_ORIGIN"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Idempotency-Key"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.vary.add("Origin")
        return response

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify(error="The request is too large."), 413

    @app.route("/api/contact", methods=["POST", "OPTIONS"])
    def contact():
        allowed_origin = app.config["CONTACT_ALLOWED_ORIGIN"]
        if not allowed_origin:
            return jsonify(error="The contact service is not configured."), 503
        if request.headers.get("Origin") != allowed_origin:
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")

        if not request.is_json:
            return jsonify(error="A JSON request body is required."), 400
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="A valid JSON object is required."), 400

        errors = validate_payload(payload)
        if errors:
            return jsonify(error=errors[0]), 400

        mail_config = get_mail_config(app.config)
        if mail_config is None:
            app.logger.error("Contact email configuration is incomplete or invalid.")
            return jsonify(error="The contact service is not configured."), 503

        try:
            send_contact_email(payload, mail_config)
        except (OSError, smtplib.SMTPException) as error:
            app.logger.error(
                "Contact email delivery failed (error_type=%s).",
                type(error).__name__,
            )
            return jsonify(error="We could not send your message. Please try again later."), 502

        return jsonify(status="sent"), 200

    @app.route("/api/auth/session", methods=["GET", "OPTIONS"])
    def auth_session():
        if not app.config["CONTACT_ALLOWED_ORIGIN"]:
            return jsonify(error="The account service is not configured."), 503
        origin = request.headers.get("Origin")
        if origin and origin != app.config["CONTACT_ALLOWED_ORIGIN"]:
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")

        customer_id = session.get("customer_id")
        if not customer_id:
            return jsonify(user=None), 200
        try:
            with database_connection(app) as connection:
                customer = connection.execute(
                    "SELECT id, name, email FROM customers WHERE id = ? AND status = 'registered'",
                    (customer_id,),
                ).fetchone()
        except sqlite3.Error:
            app.logger.exception("Could not load the authenticated customer session.")
            return jsonify(error="The account service is temporarily unavailable."), 503
        if customer is None:
            session.clear()
            return jsonify(user=None), 200
        return jsonify(user=dict(customer)), 200

    @app.route("/api/auth/register", methods=["POST", "OPTIONS"])
    def register():
        if not auth_request_is_allowed(app):
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="A valid JSON object is required."), 400
        errors = validate_registration(payload)
        if errors:
            return jsonify(error=errors[0]), 400

        normalized_email = payload["email"].strip().lower()
        customer_id = uuid.uuid4().hex
        password_hash = generate_password_hash(payload["password"])
        created_at = datetime.now(timezone.utc).isoformat()
        try:
            with database_connection(app) as connection:
                connection.execute(
                    """
                    INSERT INTO customers (
                        id, name, age, department, college, university, mobile,
                        email, password_hash, created_at, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'registered')
                    """,
                    (
                        customer_id,
                        payload["name"].strip(),
                        payload["age"],
                        payload["department"].strip(),
                        payload["college"].strip(),
                        payload["university"].strip(),
                        normalize_indian_mobile(payload["mobile"]),
                        normalized_email,
                        password_hash,
                        created_at,
                    ),
                )
                add_customer_event(
                    connection,
                    customer_id,
                    "account_created",
                    "Account created",
                    "Your KAVENZA customer account was created.",
                    created_at,
                )
        except sqlite3.IntegrityError:
            return jsonify(error="An account with this email already exists."), 409
        except sqlite3.Error:
            app.logger.exception("Could not create a customer account.")
            return jsonify(error="We could not create your account right now."), 503

        email_sent = False
        mail_config = get_mail_config(app.config)
        if mail_config is None:
            app.logger.error("Welcome email was not sent because email configuration is incomplete.")
        else:
            try:
                send_welcome_email(payload["name"].strip(), normalized_email, mail_config)
                email_sent = True
            except (OSError, smtplib.SMTPException):
                app.logger.exception("Welcome email sending failed for a newly registered customer.")

        return jsonify(
            status="created",
            emailSent=email_sent,
            message=(
                "Your account was created and a welcome email was sent."
                if email_sent
                else "Your account was created, but we could not send the welcome email."
            ),
        ), 201

    @app.route("/api/auth/login", methods=["POST", "OPTIONS"])
    def login():
        if not auth_request_is_allowed(app):
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")
        payload = request.get_json(silent=True)
        if (
            not isinstance(payload, dict)
            or not isinstance(payload.get("email"), str)
            or not isinstance(payload.get("password"), str)
            or len(payload["email"]) > 254
            or len(payload["password"]) > 128
        ):
            return jsonify(error="Please enter a valid email and password."), 400

        rate_key = login_rate_key(app, request.remote_addr or "unknown")
        try:
            if is_login_rate_limited(app, rate_key):
                return jsonify(error="Too many login attempts. Please try again later."), 429
            with database_connection(app) as connection:
                customer = connection.execute(
                    """
                    SELECT id, name, email, password_hash
                    FROM customers
                    WHERE email = ? AND status = 'registered'
                    """,
                    (payload["email"].strip().lower(),),
                ).fetchone()
        except sqlite3.Error:
            app.logger.exception("Could not authenticate a customer.")
            return jsonify(error="The account service is temporarily unavailable."), 503

        password_hash_to_check = customer["password_hash"] if customer else DUMMY_PASSWORD_HASH
        if not check_password_hash(password_hash_to_check, payload["password"]) or customer is None:
            try:
                record_failed_login(app, rate_key)
            except sqlite3.Error:
                app.logger.exception("Could not record a failed login attempt.")
            return jsonify(error="Email or password is incorrect."), 401

        try:
            clear_login_attempts(app, rate_key)
        except sqlite3.Error:
            app.logger.exception("Could not clear successful login attempts.")
        session.clear()
        session["customer_id"] = customer["id"]
        return jsonify(status="authenticated", user={"id": customer["id"], "name": customer["name"], "email": customer["email"]}), 200

    @app.route("/api/auth/logout", methods=["POST", "OPTIONS"])
    def logout():
        if not auth_request_is_allowed(app):
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")
        session.clear()
        return jsonify(status="logged_out"), 200

    @app.route("/api/auth/dashboard", methods=["GET", "OPTIONS"])
    def dashboard():
        if not app.config["CONTACT_ALLOWED_ORIGIN"]:
            return jsonify(error="The account service is not configured."), 503
        origin = request.headers.get("Origin")
        if origin and origin != app.config["CONTACT_ALLOWED_ORIGIN"]:
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")
        customer_id = session.get("customer_id")
        if not customer_id:
            return jsonify(error="Authentication is required."), 401
        try:
            with database_connection(app) as connection:
                customer = connection.execute(
                    """
                    SELECT id, name, age, department, college, university, mobile, email, created_at
                    FROM customers
                    WHERE id = ? AND status = 'registered'
                    """,
                    (customer_id,),
                ).fetchone()
                if customer is None:
                    session.clear()
                    return jsonify(error="Authentication is required."), 401

                projects = [
                    project_to_dict(row)
                    for row in connection.execute(
                        """
                        SELECT id, title, category, description, technologies, requirements,
                               status, created_at, updated_at
                        FROM projects
                        WHERE customer_id = ?
                        ORDER BY created_at DESC
                        """,
                        (customer_id,),
                    ).fetchall()
                ]
                counts = connection.execute(
                    """
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN status IN ('Inquiry Submitted', 'Under Review', 'Awaiting Customer Response') THEN 1 ELSE 0 END) AS pending,
                        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
                        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
                    FROM projects
                    WHERE customer_id = ?
                    """,
                    (customer_id,),
                ).fetchone()
                activity = [
                    dict(row)
                    for row in connection.execute(
                        """
                        SELECT id, event_type AS type, title, message, project_id, created_at
                        FROM customer_events
                        WHERE customer_id = ?
                        ORDER BY created_at DESC
                        LIMIT 8
                        """,
                        (customer_id,),
                    ).fetchall()
                ]
                unread_count = connection.execute(
                    "SELECT COUNT(*) FROM customer_events WHERE customer_id = ? AND read_at IS NULL",
                    (customer_id,),
                ).fetchone()[0]
        except sqlite3.Error:
            app.logger.exception("Could not load the customer dashboard.")
            return jsonify(error="The account service is temporarily unavailable."), 503
        return jsonify(
            profile=dict(customer),
            accountStatus="Registered",
            summary={
                "total": counts["total"] or 0,
                "pending": counts["pending"] or 0,
                "inProgress": counts["in_progress"] or 0,
                "completed": counts["completed"] or 0,
            },
            projects=projects,
            activity=activity,
            unreadNotifications=unread_count,
        ), 200

    @app.route("/api/auth/projects", methods=["GET", "POST", "OPTIONS"])
    def customer_projects():
        if not auth_resource_request_is_allowed(app):
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")
        customer_id = session.get("customer_id")
        if not customer_id:
            return jsonify(error="Authentication is required."), 401

        if request.method == "GET":
            try:
                with database_connection(app) as connection:
                    rows = connection.execute(
                        """
                        SELECT id, title, category, description, technologies, requirements,
                               status, created_at, updated_at
                        FROM projects
                        WHERE customer_id = ?
                        ORDER BY created_at DESC
                        """,
                        (customer_id,),
                    ).fetchall()
            except sqlite3.Error:
                app.logger.exception("Could not load customer projects.")
                return jsonify(error="We could not load your projects right now."), 503
            return jsonify(projects=[project_to_dict(row) for row in rows]), 200

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="A valid JSON object is required."), 400
        errors = validate_project(payload)
        if errors:
            return jsonify(error=errors[0]), 400

        normalized_payload = {
            "title": payload["title"].strip(),
            "category": payload["category"],
            "description": payload["description"].strip(),
            "technologies": [item.strip() for item in payload["technologies"] if item.strip()],
            "requirements": payload["requirements"].strip(),
        }
        idempotency_key = request.headers.get("Idempotency-Key")
        if idempotency_key is None:
            idempotency_key = uuid.uuid4().hex
        try:
            idempotency_key = uuid.UUID(idempotency_key).hex
        except (ValueError, AttributeError):
            return jsonify(error="A valid inquiry submission key is required."), 400
        request_hash = hashlib.sha256(
            json.dumps(normalized_payload, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()

        is_new_submission = False
        try:
            with database_connection(app) as connection:
                connection.execute("BEGIN IMMEDIATE")
                delivery = connection.execute(
                    """
                    SELECT customer_id, request_hash, project_id,
                           business_status, customer_status
                    FROM inquiry_email_deliveries
                    WHERE idempotency_key = ?
                    """,
                    (idempotency_key,),
                ).fetchone()
                if delivery is not None:
                    if delivery["customer_id"] != customer_id:
                        return jsonify(
                            error="This submission key is already in use."
                        ), 409
                    if delivery["request_hash"] != request_hash:
                        return jsonify(
                            error="This submission key was already used for a different inquiry."
                        ), 409
                    project_id = delivery["project_id"]
                else:
                    customer = connection.execute(
                        """
                        SELECT id, name, email, mobile
                        FROM customers
                        WHERE id = ? AND status = 'registered'
                        """,
                        (customer_id,),
                    ).fetchone()
                    if customer is None:
                        session.clear()
                        return jsonify(error="Authentication is required."), 401

                    project_id = f"KZ-{uuid.uuid4().hex[:10].upper()}"
                    created_at = datetime.now(timezone.utc).isoformat()
                    connection.execute(
                        """
                        INSERT INTO projects (
                            id, customer_id, title, category, description, technologies,
                            requirements, status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Inquiry Submitted', ?, ?)
                        """,
                        (
                            project_id,
                            customer_id,
                            normalized_payload["title"],
                            normalized_payload["category"],
                            normalized_payload["description"],
                            json.dumps(normalized_payload["technologies"]),
                            normalized_payload["requirements"],
                            created_at,
                            created_at,
                        ),
                    )
                    add_customer_event(
                        connection,
                        customer_id,
                        "inquiry_submitted",
                        "Inquiry submitted",
                        f'Your inquiry "{normalized_payload["title"]}" was saved and is awaiting review.',
                        created_at,
                        project_id,
                    )
                    connection.execute(
                        """
                        INSERT INTO inquiry_email_deliveries (
                            idempotency_key, customer_id, request_hash, project_id,
                            business_status, customer_status, updated_at
                        ) VALUES (?, ?, ?, ?, 'pending', 'pending', ?)
                        """,
                        (idempotency_key, customer_id, request_hash, project_id, created_at),
                    )
                    is_new_submission = True

                project = connection.execute(
                    """
                    SELECT id, title, category, description, technologies, requirements,
                           status, created_at, updated_at
                    FROM projects WHERE id = ? AND customer_id = ?
                    """,
                    (project_id, customer_id),
                ).fetchone()
                customer = connection.execute(
                    """
                    SELECT id, name, email, mobile
                    FROM customers WHERE id = ? AND status = 'registered'
                    """,
                    (customer_id,),
                ).fetchone()
                delivery = connection.execute(
                    """
                    SELECT business_status, customer_status
                    FROM inquiry_email_deliveries WHERE idempotency_key = ?
                    """,
                    (idempotency_key,),
                ).fetchone()
        except sqlite3.Error:
            app.logger.exception("Could not save a customer project inquiry.")
            return jsonify(error="We could not save your inquiry right now."), 503

        project = dict(project)
        customer = dict(customer)
        email_project = dict(project)
        email_project["technologies"] = json.loads(project["technologies"])
        mail_config = get_mail_config(app.config)
        business_email = app.config.get("MAIL_BUSINESS_EMAIL")
        delivery_status = {
            "business": delivery["business_status"],
            "customer": delivery["customer_status"],
        }
        if not isinstance(business_email, str) or not business_email.strip():
            app.logger.error(
                "Inquiry email notifications were skipped because MAIL_BUSINESS_EMAIL is not configured."
            )
            mail_config = None
        elif not EMAIL_PATTERN.fullmatch(business_email.strip()):
            app.logger.error(
                "Inquiry email notifications were skipped because MAIL_BUSINESS_EMAIL is invalid."
            )
            mail_config = None
        elif mail_config is None:
            app.logger.error(
                "Inquiry email notifications were skipped because the SMTP configuration is incomplete or invalid."
            )

        notifications = (
            (
                "business",
                "business notification",
                send_business_inquiry_email,
                (
                    customer,
                    mail_config["business_email"] if mail_config else "",
                    email_project,
                    mail_config,
                ),
            ),
            (
                "customer",
                "customer acknowledgement",
                send_inquiry_confirmation_email,
                (customer, email_project, mail_config),
            ),
        )
        for notification_key, notification_name, send_notification, args in notifications:
            if delivery_status[notification_key] == "sent":
                continue
            if mail_config is None:
                delivery_status[notification_key] = "failed"
            else:
                try:
                    send_notification(*args)
                    delivery_status[notification_key] = "sent"
                except smtplib.SMTPAuthenticationError as error:
                    app.logger.error(
                        "Inquiry %s email failed due to SMTP authentication (error_type=%s).",
                        notification_name,
                        type(error).__name__,
                    )
                    delivery_status[notification_key] = "failed"
                except (OSError, smtplib.SMTPException) as error:
                    failure_type = (
                        "SMTP connection"
                        if isinstance(
                            error,
                            (OSError, smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected),
                        )
                        else "SMTP delivery"
                    )
                    app.logger.error(
                        "Inquiry %s email failed due to %s (error_type=%s).",
                        notification_name,
                        failure_type,
                        type(error).__name__,
                    )
                    delivery_status[notification_key] = "failed"

            try:
                with database_connection(app) as connection:
                    connection.execute(
                        f"""
                        UPDATE inquiry_email_deliveries
                        SET {notification_key}_status = ?, updated_at = ?
                        WHERE idempotency_key = ?
                        """,
                        (
                            delivery_status[notification_key],
                            datetime.now(timezone.utc).isoformat(),
                            idempotency_key,
                        ),
                    )
            except sqlite3.Error:
                app.logger.exception(
                    "Could not record inquiry %s email delivery status.",
                    notification_name,
                )
                delivery_status[notification_key] = "failed"

        response_body = {
            "status": "created",
            "project": project_to_dict(project),
            "emailNotifications": delivery_status,
            "duplicateSubmission": not is_new_submission,
        }
        return jsonify(response_body), 201

    @app.route("/api/auth/projects/<project_id>", methods=["GET"])
    def customer_project_detail(project_id):
        if not auth_resource_request_is_allowed(app):
            return jsonify(error="This request is not allowed."), 403
        customer_id = session.get("customer_id")
        if not customer_id:
            return jsonify(error="Authentication is required."), 401
        try:
            with database_connection(app) as connection:
                project = connection.execute(
                    """
                    SELECT id, title, category, description, technologies, requirements,
                           status, created_at, updated_at
                    FROM projects
                    WHERE id = ? AND customer_id = ?
                    """,
                    (project_id, customer_id),
                ).fetchone()
        except sqlite3.Error:
            app.logger.exception("Could not load a customer project detail.")
            return jsonify(error="We could not load this project right now."), 503
        if project is None:
            return jsonify(error="Project not found."), 404
        return jsonify(project=project_to_dict(project)), 200

    @app.route("/api/auth/notifications", methods=["GET"])
    def customer_notifications():
        if not auth_resource_request_is_allowed(app):
            return jsonify(error="This request is not allowed."), 403
        customer_id = session.get("customer_id")
        if not customer_id:
            return jsonify(error="Authentication is required."), 401
        try:
            with database_connection(app) as connection:
                rows = connection.execute(
                    """
                    SELECT id, event_type AS type, title, message, project_id,
                           created_at, read_at
                    FROM customer_events
                    WHERE customer_id = ?
                    ORDER BY created_at DESC
                    """,
                    (customer_id,),
                ).fetchall()
        except sqlite3.Error:
            app.logger.exception("Could not load customer notifications.")
            return jsonify(error="We could not load your notifications right now."), 503
        return jsonify(notifications=[dict(row) for row in rows]), 200

    @app.route("/api/auth/notifications/<int:notification_id>/read", methods=["POST", "OPTIONS"])
    def mark_customer_notification_read(notification_id):
        if not auth_request_is_allowed(app):
            return jsonify(error="This request is not allowed."), 403
        if request.method == "OPTIONS":
            return jsonify(status="ok")
        customer_id = session.get("customer_id")
        if not customer_id:
            return jsonify(error="Authentication is required."), 401
        if request.get_json(silent=True) is None:
            return jsonify(error="A JSON request body is required."), 400
        try:
            with database_connection(app) as connection:
                result = connection.execute(
                    """
                    UPDATE customer_events
                    SET read_at = ?
                    WHERE id = ? AND customer_id = ? AND read_at IS NULL
                    """,
                    (datetime.now(timezone.utc).isoformat(), notification_id, customer_id),
                )
                if result.rowcount == 0:
                    exists = connection.execute(
                        "SELECT 1 FROM customer_events WHERE id = ? AND customer_id = ?",
                        (notification_id, customer_id),
                    ).fetchone()
                    if exists is None:
                        return jsonify(error="Notification not found."), 404
        except sqlite3.Error:
            app.logger.exception("Could not mark a customer notification as read.")
            return jsonify(error="We could not update this notification right now."), 503
        return jsonify(status="read"), 200

    return app


def initialize_database(app):
    database_path = Path(app.config["DATABASE_PATH"]).expanduser()
    if not database_path.is_absolute():
        database_path = Path(__file__).resolve().parents[1] / database_path
    database_path = database_path.resolve()
    app.config["DATABASE_PATH"] = str(database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(database_path, timeout=10)) as connection:
        with connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    age INTEGER,
                    department TEXT NOT NULL,
                    college TEXT NOT NULL,
                    university TEXT NOT NULL,
                    mobile TEXT NOT NULL,
                    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('registered', 'disabled'))
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS login_attempts (
                    rate_key TEXT NOT NULL,
                    attempted_at REAL NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS login_attempts_key_time ON login_attempts (rate_key, attempted_at)"
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT NOT NULL,
                    technologies TEXT NOT NULL,
                    requirements TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN (
                        'Inquiry Submitted', 'Under Review', 'Awaiting Customer Response',
                        'Approved', 'In Progress', 'Completed', 'Cancelled'
                    )),
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS projects_customer_created ON projects (customer_id, created_at)"
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS customer_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                    created_at TEXT NOT NULL,
                    read_at TEXT
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS customer_events_customer_created ON customer_events (customer_id, created_at)"
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS inquiry_email_deliveries (
                    idempotency_key TEXT PRIMARY KEY,
                    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                    request_hash TEXT NOT NULL,
                    project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
                    business_status TEXT NOT NULL CHECK (
                        business_status IN ('pending', 'sent', 'failed')
                    ),
                    customer_status TEXT NOT NULL CHECK (
                        customer_status IN ('pending', 'sent', 'failed')
                    ),
                    updated_at TEXT NOT NULL
                )
                """
            )


@contextmanager
def database_connection(app):
    connection = sqlite3.connect(app.config["DATABASE_PATH"], timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def auth_request_is_allowed(app):
    return bool(
        app.config["CONTACT_ALLOWED_ORIGIN"]
        and request.headers.get("Origin") == app.config["CONTACT_ALLOWED_ORIGIN"]
        and (request.method == "OPTIONS" or request.is_json)
    )


def auth_resource_request_is_allowed(app):
    origin = request.headers.get("Origin")
    return bool(
        app.config["CONTACT_ALLOWED_ORIGIN"]
        and (
            (
                request.method == "GET"
                and (origin is None or origin == app.config["CONTACT_ALLOWED_ORIGIN"])
            )
            or (
                request.method == "OPTIONS"
                and origin == app.config["CONTACT_ALLOWED_ORIGIN"]
            )
            or (
                request.method not in {"GET", "OPTIONS"}
                and origin == app.config["CONTACT_ALLOWED_ORIGIN"]
                and request.is_json
            )
        )
    )


def add_customer_event(connection, customer_id, event_type, title, message, created_at, project_id=None):
    connection.execute(
        """
        INSERT INTO customer_events (
            customer_id, event_type, title, message, project_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (customer_id, event_type, title, message, project_id, created_at),
    )


def project_to_dict(row):
    project = dict(row)
    try:
        technologies = json.loads(project["technologies"])
    except (TypeError, json.JSONDecodeError):
        technologies = []
    project["technologies"] = technologies if isinstance(technologies, list) else []
    return project


def validate_project(payload):
    if set(payload) != PROJECT_FIELDS:
        return ["Please provide all required inquiry fields."]
    if any(
        not isinstance(payload[field], str)
        for field in ("title", "category", "description", "requirements")
    ):
        return ["Please check the inquiry fields."]
    if not isinstance(payload["technologies"], list) or any(
        not isinstance(item, str) for item in payload["technologies"]
    ):
        return ["Please provide required technologies as a list."]

    title = payload["title"].strip()
    description = payload["description"].strip()
    requirements = payload["requirements"].strip()
    technologies = payload["technologies"]
    if not title or len(title) > 150:
        return ["Please enter a project title under 151 characters."]
    if payload["category"] not in PROJECT_TYPES:
        return ["Please choose a valid project category."]
    if len(description) < 20 or len(description) > 5000:
        return ["Please enter a project description between 20 and 5,000 characters."]
    if len(requirements) > 3000:
        return ["Please keep additional requirements under 3,001 characters."]
    if len(technologies) > 10 or any(len(item.strip()) > 80 for item in technologies):
        return ["Please list up to 10 technologies, each under 81 characters."]
    if any(contains_header_break(value) for value in (title, payload["category"])):
        return ["Please enter valid inquiry details."]
    if sum(len(item.strip()) for item in technologies) > 1000:
        return ["Please keep required technologies under 1,001 characters in total."]
    return []


def validate_registration(payload):
    if set(payload) != REGISTRATION_FIELDS:
        return ["Please provide all required registration fields."]
    text_fields = ("name", "department", "college", "university", "mobile", "email", "password", "confirmPassword")
    if any(not isinstance(payload[field], str) for field in text_fields):
        return ["Please check the registration form fields."]
    age = payload["age"]
    if age is not None and (not isinstance(age, int) or isinstance(age, bool) or not 1 <= age <= 120):
        return ["Please enter an age between 1 and 120, or leave it blank."]

    limits = {"name": 150, "department": 150, "college": 200, "university": 200}
    for field, limit in limits.items():
        value = payload[field].strip()
        if not value or len(value) > limit or contains_header_break(value):
            return [f"Please enter a valid {field}."]
    email = payload["email"].strip()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        return ["Please enter a valid email address."]
    mobile = re.sub(r"[\s-]", "", payload["mobile"])
    if not INDIAN_MOBILE_PATTERN.fullmatch(mobile):
        return ["Please enter a valid Indian mobile number."]
    if not 12 <= len(payload["password"]) <= 128:
        return ["Your password must be between 12 and 128 characters."]
    if payload["password"] != payload["confirmPassword"]:
        return ["The passwords do not match."]
    return []


def normalize_indian_mobile(mobile):
    normalized = re.sub(r"[\s-]", "", mobile)
    if normalized.startswith("+91"):
        return normalized
    return f"+91{normalized}"


def login_rate_key(app, remote_address):
    return hmac.new(
        app.secret_key.encode() if isinstance(app.secret_key, str) else app.secret_key,
        remote_address.encode(),
        hashlib.sha256,
    ).hexdigest()


def is_login_rate_limited(app, rate_key):
    cutoff = time.time() - app.config["LOGIN_RATE_WINDOW"]
    with database_connection(app) as connection:
        connection.execute("DELETE FROM login_attempts WHERE attempted_at < ?", (cutoff,))
        count = connection.execute(
            "SELECT COUNT(*) FROM login_attempts WHERE rate_key = ? AND attempted_at >= ?",
            (rate_key, cutoff),
        ).fetchone()[0]
    return count >= app.config["LOGIN_RATE_LIMIT"]


def record_failed_login(app, rate_key):
    with database_connection(app) as connection:
        connection.execute(
            "INSERT INTO login_attempts (rate_key, attempted_at) VALUES (?, ?)",
            (rate_key, time.time()),
        )


def clear_login_attempts(app, rate_key):
    with database_connection(app) as connection:
        connection.execute("DELETE FROM login_attempts WHERE rate_key = ?", (rate_key,))


def validate_payload(payload):
    if set(payload) != ALLOWED_FIELDS:
        return ["Please provide all contact form fields."]

    project_type = payload["projectType"]
    name = payload["name"]
    email = payload["email"]
    organization = payload["organization"]
    message = payload["message"]

    if not isinstance(project_type, str) or project_type not in PROJECT_TYPES:
        return ["Please choose a valid project type."]
    if not isinstance(name, str) or not name.strip():
        return ["Please enter your name."]
    if len(name.strip()) > 150 or contains_header_break(name):
        return ["Please enter a name under 151 characters."]
    if not isinstance(email, str) or not email.strip():
        return ["Please enter your email."]
    email = email.strip()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        return ["Please enter a valid email address."]
    if not isinstance(organization, str) or len(organization.strip()) > 200:
        return ["Please enter an organization under 201 characters."]
    if contains_header_break(organization):
        return ["Please enter a valid organization."]
    if not isinstance(message, str) or not message.strip():
        return ["Please add a short message."]
    if len(message.strip()) < 10:
        return ["Please add a little more detail (at least 10 characters)."]
    if len(message.strip()) > 5000:
        return ["Please keep your message under 5,001 characters."]
    return []


def contains_header_break(value):
    return "\r" in value or "\n" in value


def get_mail_config(config):
    required = ("MAIL_BUSINESS_EMAIL", "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD")
    if any(not isinstance(config.get(key), str) or not config[key].strip() for key in required):
        return None
    if not EMAIL_PATTERN.fullmatch(config["MAIL_BUSINESS_EMAIL"].strip()):
        return None
    try:
        port = int(config["SMTP_PORT"])
    except (TypeError, ValueError):
        return None
    if not 1 <= port <= 65535:
        return None

    return {
        "business_email": config["MAIL_BUSINESS_EMAIL"].strip(),
        "host": config["SMTP_HOST"].strip(),
        "port": port,
        "username": config["SMTP_USERNAME"],
        "password": config["SMTP_PASSWORD"],
    }


def send_email_message(email, mail_config):
    with smtplib.SMTP(mail_config["host"], mail_config["port"], timeout=10) as server:
        server.ehlo()
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
        server.login(mail_config["username"], mail_config["password"])
        refused_recipients = server.send_message(email)
        if refused_recipients:
            raise smtplib.SMTPRecipientsRefused(refused_recipients)


def send_contact_email(payload, mail_config):
    email = EmailMessage()
    customer_name = payload["name"].strip()
    customer_email = payload["email"].strip()
    project_type = payload["projectType"]
    organization = payload["organization"].strip() or "Not provided"
    email["Subject"] = f"KAVENZA Inquiry | {project_type} | {customer_name}"
    email["From"] = mail_config["username"]
    email["To"] = mail_config["business_email"]
    email["Reply-To"] = customer_email
    email.set_content(
        "\n".join(
            (
                f"Customer: {customer_name} | Email: {customer_email}",
                "",
                "NEW CUSTOMER INQUIRY",
                "",
                f"Customer Name: {customer_name}",
                f"Customer Email: {customer_email}",
                f"Project Type: {project_type}",
                f"Organization: {organization}",
                "",
                "Customer Message:",
                payload["message"].strip(),
            )
        )
    )

    send_email_message(email, mail_config)


def send_welcome_email(customer_name, recipient, mail_config):
    safe_name = escape(customer_name)
    email = EmailMessage()
    email["Subject"] = "Welcome to KAVENZA | Registration Successful"
    email["From"] = mail_config["business_email"]
    email["To"] = recipient
    email.set_content(
        f"""Hi {customer_name},

Welcome to KAVENZA!

Your account has been successfully registered with us.

Thank you for choosing KAVENZA for your project requirements. Our team will review your inquiry and contact you using the details you provided.

We will notify you about the next steps and any updates regarding your project.

If you have any questions, please contact us through our website.

Best regards,
Team KAVENZA
Build. Innovate. Evolve."""
    )
    email.add_alternative(
        f"""<!doctype html>
<html lang="en">
  <body style="margin:0;background:#101010;color:#f4f0e8;font-family:Arial,sans-serif">
    <main style="max-width:600px;margin:32px auto;padding:32px;border:1px solid #55472d;background:#171717">
      <p style="color:#c5a66a;letter-spacing:.18em;text-transform:uppercase">KAVENZA</p>
      <h1 style="font-size:24px">Welcome to KAVENZA!</h1>
      <p>Hi {safe_name},</p>
      <p>Your account has been successfully registered with us.</p>
      <p>Thank you for choosing KAVENZA for your project requirements. Our team will review your inquiry and contact you using the details you provided.</p>
      <p>We will notify you about the next steps and any updates regarding your project.</p>
      <p>If you have any questions, please contact us through our website.</p>
      <p>Best regards,<br>Team KAVENZA<br>Build. Innovate. Evolve.</p>
    </main>
  </body>
</html>""",
        subtype="html",
    )
    send_email_message(email, mail_config)


def send_inquiry_confirmation_email(customer, project, mail_config):
    customer_name = customer["name"]
    customer_email = customer["email"]
    title = project["title"]
    email = EmailMessage()
    email["Subject"] = "KAVENZA | Your Project Inquiry Has Been Received"
    email["From"] = mail_config["username"]
    email["To"] = customer_email
    email["Reply-To"] = mail_config["business_email"]
    email.set_content(
        f"""Dear {customer_name},

Thank you for contacting KAVENZA and sharing your project requirements.

We have successfully received your inquiry regarding {title}.

Our team will review your requirements, evaluate the project scope, and contact you with the next steps.

Our expected initial review and response period is within 7 days of receiving your inquiry. This is an initial review timeframe, not a project delivery commitment.

If additional information is required, we will contact you using the email address you provided ({customer_email}).

Thank you for choosing KAVENZA.

Best regards,
KAVENZA Team
Build. Innovate. Evolve."""
    )
    send_email_message(email, mail_config)


def send_business_inquiry_email(customer, recipient, project, mail_config):
    technologies = project["technologies"]
    if not technologies:
        technologies = ["Not provided"]
    requirements = project["requirements"] or "Not provided"
    email = EmailMessage()
    email["Subject"] = f"New KAVENZA Inquiry | {project['title']} | {project['category']}"
    email["From"] = mail_config["username"]
    email["To"] = recipient
    email["Reply-To"] = customer["email"]
    email.set_content(
        f"""Customer: {customer['name']} | Email: {customer['email']}

NEW KAVENZA CUSTOMER INQUIRY

CUSTOMER DETAILS
Customer name: {customer['name']}
Customer email: {customer['email']}
Mobile: {customer['mobile']}

PROJECT DETAILS
Project title: {project['title']}
Project type: {project['category']}
Project description:
{project['description']}
Required technologies: {', '.join(technologies)}
Additional requirements: {requirements}

INQUIRY TRACKING
Inquiry ID: {project['id']}
Submission date: {project['created_at']}
Current status: {project['status']}
"""
    )
    send_email_message(email, mail_config)


app = create_app()
