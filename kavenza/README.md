# KAVENZA website

The KAVENZA marketing site is a React, TypeScript, and Vite application.

```sh
npm ci
npm run dev
npm run build
```

## Production SEO

Set `SITE_URL` to the final HTTPS origin before building for deployment. Copy
`.env.example` to `.env.production` and replace its placeholder, or set the
environment variable in the deployment platform. Do not deploy with the
placeholder value.

When a real URL is configured, the production build adds the canonical URL and
absolute Open Graph/Twitter image URLs, generates `sitemap.xml`, and adds its
location to `robots.txt`. Without a configured URL (or with the example
placeholder), the build omits canonical and sitemap URLs rather than publishing
invented ones. The sitemap currently lists the public homepage; add entries
when additional public routes are implemented.

## Contact form API

The contact form submits JSON to a separate Flask API. Flask validates the
request and delivers a plain-text email through SMTP. The business email
configured by `MAIL_BUSINESS_EMAIL` is both the sender and recipient; the
visitor's email is used only as Reply-To.
A successful API response means the SMTP server accepted the message for
sending; SMTP does not confirm that it reached the recipient's inbox. Check
the sender's Sent folder and the recipient's spam/quarantine folders if a
message is accepted but not visible in the inbox.

### Local development (PowerShell)

Local development requires **two terminals**. Copy the example configuration
once, then put your Gmail App Password in `.env` as `SMTP_PASSWORD`. Create an
App Password in your Google Account; do not use your regular Gmail password.
The password stays on the Flask server and `.env` is ignored by Git. Never
commit it or expose it through a `VITE_` variable.

**Terminal 1 — Flask API**, from the project root:

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m flask --app backend.app run --host 127.0.0.1 --port 5000
```

**Terminal 2 — Vite frontend**, from the project root:

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

Vite is pinned to `127.0.0.1:5173` to match `CONTACT_ALLOWED_ORIGIN`.
If that port is already in use, Vite exits instead of selecting a different
port that the Flask API will reject. Stop the duplicate frontend process and
restart it; use `127.0.0.1` (not `localhost`) consistently in the browser.

The expected URLs are:

- Frontend: `http://127.0.0.1:5173`
- Flask: `http://127.0.0.1:5000`
- Contact API: `http://127.0.0.1:5000/api/contact`

`CONTACT_ALLOWED_ORIGIN` must exactly match the frontend origin; `localhost`
and `127.0.0.1` are different origins. The example configuration uses
`http://127.0.0.1:5173`. The contact form cannot connect if Flask is not
running. Backend tests do not use credentials or deliver real email:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
```

### Production deployment

Deploy the Vite build and Flask API as separate services. Configure
`VITE_CONTACT_API_URL` to the public HTTPS origin of the Flask API when building
the frontend. Configure these variables on the Flask host (never in frontend
code or a public build):

For the current Render services, use these settings:

- **Frontend static site** (root directory `kavenza`): build with
  `npm ci && npm run build` and publish `dist`. Set
  `VITE_CONTACT_API_URL=https://kavenza-backend.onrender.com` and
  `SITE_URL=https://kavenza-website.onrender.com` as build environment
  variables, then trigger a new build after changing either value.
- **Backend web service** (root directory `kavenza/backend`): install with
  `pip install -r requirements.txt` and start with
  `gunicorn app:app --bind 0.0.0.0:$PORT`. The `.python-version` file selects
  Python 3.12.10.
- Set the backend's `CONTACT_ALLOWED_ORIGIN` to exactly
  `https://kavenza-website.onrender.com`. Use `SESSION_COOKIE_SECURE=true`
  over HTTPS and keep `SESSION_COOKIE_SAMESITE=Lax` for these same-site
  Render origins.
- Generate a long random `SECRET_KEY` and configure it in the backend service.
  Keep the same value across restarts; do not set it as a frontend `VITE_`
  variable. Store SMTP credentials only in the backend service's secret
  environment variables.
- Render's web-service filesystem is ephemeral. To retain customer accounts
  across deploys, attach a persistent disk mounted at `/var/data` and set
  `DATABASE_PATH=/var/data/kavenza.sqlite3`. Back up any existing database
  before changing its path.

- `CONTACT_ALLOWED_ORIGIN`: the exact HTTPS origin of the deployed frontend,
  with no path or trailing slash.
- `MAIL_BUSINESS_EMAIL`: KAVENZA's SMTP-authorized business address, used as
  both From and To.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, and `SMTP_PASSWORD`: credentials
  for an SMTP service that supports STARTTLS on the configured port.

The API rejects requests whose Origin does not exactly match
`CONTACT_ALLOWED_ORIGIN`. Use HTTPS for both services in production, keep
SMTP credentials in the hosting provider's secret store, and configure
rate-limiting at the API gateway or hosting platform to reduce automated abuse.
For a production build, `VITE_CONTACT_API_URL` must be the public HTTPS origin
of the deployed Flask API, not `127.0.0.1` or `localhost`; rebuild the frontend
after changing it. A loopback URL in a deployed page refers to each visitor's
own computer.

## Customer accounts

The account pages are available at `/register`, `/login`, and `/dashboard`.
The Flask API creates a local SQLite database at `DATABASE_PATH` on startup.
The local setting is `backend/kavenza.sqlite3`, resolved relative to the
project root, so it is unchanged by the directory from which Flask is launched.
The database file is excluded from Git. Back it up and use persistent storage
if hosting the API; ephemeral containers will lose accounts when replaced.

Registration validates email, Indian mobile numbers, required education fields,
optional age, and matching passwords of at least 12 characters. Passwords are
stored as Werkzeug hashes. Duplicate email addresses are rejected. After the
account is stored, the API tries to send a welcome email using the existing
SMTP settings. If SMTP fails, the account remains created and the response
clearly says the welcome email could not be sent.
After an inquiry is saved, the API sends a confirmation to the customer's
registered address and a notification to `MAIL_BUSINESS_EMAIL`. SMTP delivery
failures are logged without removing the saved inquiry, and the response
reports each email's delivery status separately. A small
`inquiry_email_deliveries` table records idempotency keys and delivery states;
reposting the same inquiry with the same key retries only failed email types
without creating another project or resending notifications already marked
sent. The customer portal retains that key while a retry is possible.

Login uses an HttpOnly Flask session cookie, generic credential errors, and a
per-client rate limit. `/api/auth/dashboard` returns only the signed-in
customer's profile and saved project summaries/counts. Customers can submit
inquiries through `POST /api/auth/projects`; new inquiries are stored for that
customer with the initial `Inquiry Submitted` status. `GET /api/auth/projects`
and `GET /api/auth/projects/<id>` return only that customer's inquiries.
Account-created and inquiry-submitted events are stored and shown in Recent
Activity and `GET /api/auth/notifications`; customers can mark their own
notifications read using `POST /api/auth/notifications/<id>/read`.

There is not yet an administrator workflow for changing project status,
requesting customer information, or adding progress milestones. The dashboard
therefore shows only the project status and events actually stored; it does not
invent progress. Profile details are read-only, and there is no password-reset
flow in this initial version. Account-changing JSON requests require the exact
configured `CONTACT_ALLOWED_ORIGIN`, which also provides cross-origin/CSRF
protection.

Set these additional backend environment variables locally and in the Flask
host:

- `SECRET_KEY`: a long, random secret used to sign session cookies. Keep the
  same value across restarts and never expose it to the frontend.
- `DATABASE_PATH`: persistent writable SQLite file path (optional; defaults to
  `backend/kavenza.sqlite3`).
- `SESSION_COOKIE_SAMESITE`: `Lax` for local development or same-site hosting.
  If the frontend and API are on different sites, set this to `None`.
- `SESSION_COOKIE_SECURE`: `false` for local HTTP development; set to `true`
  with HTTPS in production. Cross-site `SameSite=None` cookies require HTTPS.

Use a cryptographically random key, for example:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"
```

Configure the frontend `VITE_CONTACT_API_URL` and backend
`CONTACT_ALLOWED_ORIGIN` as described above. Because the frontend has
pathname-based pages, configure the static host to serve `index.html` for
`/register`, `/login`, and `/dashboard`. Test registration using an address
you control if you want to confirm that the SMTP provider accepts the welcome
email; provider acceptance still cannot guarantee inbox delivery.
