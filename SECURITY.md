# Security Policy

## Supported Versions

The following versions of NutriTrack are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Active support  |
| < 1.0   | ❌ Not supported   |

---

## Reporting a Vulnerability

We take the security of NutriTrack seriously. If you discover a security vulnerability, please follow the responsible disclosure process below.

### ⚠️ Please DO NOT open a public GitHub Issue for security vulnerabilities.

### How to Report

1. **Email us directly** at: `security@nutritrack.app` *(replace with your actual email)*
2. Include as much detail as possible:
   - A clear description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested mitigations (optional)

### What to Expect

| Timeline | Action |
|---|---|
| **Within 48 hours** | Acknowledgement of your report |
| **Within 7 days** | Initial assessment and severity classification |
| **Within 30 days** | Patch released (for critical/high severity) |
| **After patch** | Public disclosure (coordinated with reporter) |

We will keep you informed throughout the process and credit you in the release notes (unless you prefer to remain anonymous).

---

## Security Architecture

### Authentication
- Powered by **Supabase Auth** (industry-standard JWT tokens)
- Email/password authentication with secure hashing (bcrypt)
- Google OAuth 2.0 support
- Sessions are short-lived and automatically refreshed
- Password reset via secure email link (time-limited)

### Data Protection
- **Row-Level Security (RLS)** enforced at the database level — users can only read/write their own data
- All data is scoped to `auth.uid()` via PostgreSQL RLS policies
- No cross-user data access is possible at the database layer

### Transport Security
- All connections use **HTTPS / TLS 1.3**
- Supabase API keys are `anon` (public) keys — safe to expose on the client side
- Row-Level Security ensures the anon key cannot bypass per-user data isolation

### Storage
- Avatar images are stored in **Supabase Storage** with per-user access policies
- Storage bucket RLS policies restrict uploads/reads to the authenticated owner
- Files are served via Supabase's CDN with signed URLs

### Frontend
- No sensitive credentials (passwords, secret keys) are ever stored in the frontend
- The `SUPABASE_ANON_KEY` is a public key by design — it cannot access other users' data
- `localStorage` is used only for theme preference and UI state (no sensitive data)
- All user inputs are sanitized before rendering (XSS prevention via `textContent` and HTML escaping)

---

## Known Limitations

| Area | Note |
|---|---|
| **Anon key in source** | The Supabase `anon` key is intentionally public — RLS policies enforce all security |
| **No 2FA yet** | Two-factor authentication is on the roadmap |
| **Rate limiting** | Handled by Supabase's built-in rate limiting on auth endpoints |

---

## Scope

### In Scope
- Authentication bypass vulnerabilities
- SQL injection or RLS policy bypass
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Insecure direct object references (IDOR) — accessing another user's data
- Data leakage between users
- Storage bucket access control issues

### Out of Scope
- Social engineering attacks
- Denial of Service (DoS/DDoS)
- Vulnerabilities in third-party services (Supabase, Vercel, Google)
- Issues in unsupported browsers (IE11 and below)
- Theoretical vulnerabilities with no practical exploit

---

## Security Best Practices for Deployers

If you're self-hosting NutriTrack, please follow these guidelines:

1. **Never commit real Supabase keys** to version control — use environment variables
2. **Enable RLS** on all tables (the provided `schema.sql` does this by default)
3. **Restrict the `avatars` storage bucket** to authenticated users only
4. **Set up Supabase Auth email restrictions** if you want to limit signups to specific domains
5. **Enable Supabase's built-in rate limiting** on authentication endpoints
6. **Review and apply** all Supabase security advisories regularly

---

## Acknowledgements

We appreciate the security research community. Responsible disclosures will be credited here.

*No vulnerabilities reported yet.*

---

> This security policy follows the [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories) best practices.
