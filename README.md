# SPOKES Goal Setting Project

## Runtime model
- `/` -> cover/auth page (Sign Up, Sign In, optional Google OAuth)
- `/lesson` -> authenticated goal-setting lesson experience
- API + static assets are served by the same Node process

## Start the app
1. Open a terminal in this project folder.
2. Run:
```powershell
node server.js
```
3. Open:
```text
http://localhost:8787
```

## Student access flow
1. New student: **Create Account** on the cover page.
2. Returning student: **Sign In**.
3. On success, the app redirects to `/lesson`.
4. Goal entries auto-save and sync to the server.

## Data persistence
- Student records + drafts are stored in:
`data/student-goals.json`

## Export behavior
- `Export Snapshot` now creates a student PDF report with:
  - Goal hierarchy (BHAG -> Monthly -> Weekly -> Daily -> Tasks)
  - SMART goal formatting and scoring
  - Growth prompt responses
  - Daily/archived execution summary
- Vision board content is intentionally excluded from the PDF.
- If PDF generation is unavailable in the browser, the app falls back to JSON snapshot export.

## Use across classroom devices
1. Keep `server.js` running on one host machine.
2. Find that machine's LAN IP (example: `192.168.1.44`).
3. Student devices open:
```text
http://192.168.1.44:8787
```
4. Students sign in with their same account credentials.

## Optional Google OAuth setup
Set these environment variables before launching the server:

```powershell
$env:GOOGLE_CLIENT_ID = "your-google-client-id"
$env:GOOGLE_CLIENT_SECRET = "your-google-client-secret"
$env:GOOGLE_REDIRECT_URI = "http://localhost:8787/api/auth/oauth/google/callback"
$env:GOOGLE_ALLOWED_DOMAIN = "your-school.org"   # optional
$env:SPOKES_TOKEN_SECRET = "replace-with-a-long-random-secret"
node server.js
```

Notes:
- If `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is missing, the Google button is disabled.
- `GOOGLE_ALLOWED_DOMAIN` is optional but recommended for school-only access.

## Manual QA script
- Strict click-path QA runbook:
`QA_MANUAL_V2.md`

## Playwright E2E regression tests
1. Install dependencies:
```powershell
npm install
```
2. Install browser:
```powershell
npx playwright install chromium
```
3. Run tests:
```powershell
npm run test:e2e
```

Notes:
- E2E tests run against a separate store file: `data/student-goals.e2e.json`
- Main classroom data file (`data/student-goals.json`) is not used by the E2E server.
