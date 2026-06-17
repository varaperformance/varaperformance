# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public issue**.

Report it privately via [GitHub Security Advisories](https://github.com/varaperformance/varaperformance/security/advisories/new). You can also reach the maintainer directly through GitHub ([@worlddrknss](https://github.com/worlddrknss)).

Please include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

## What to Expect

| Step | Timeline |
| ---- | -------- |
| Acknowledgment | Within 48 hours |
| Severity assessment | Within 5 days |
| Patch for critical issues | Within 7 days |
| Credit in release notes | Unless you prefer anonymity |

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest (`main`) | Yes |
| older tags | No |

## Deployment Security

When self-hosting:

- Generate unique secrets for `JWT_SECRET`, `ENCRYPTION_KEK`, and signing keys — never reuse example values
- Use Infisical (or equivalent) for secrets management in production — see `apps/backend/.env.example`
- Enable HTTPS and keep dependencies up to date
- Restrict database access to the application network only

## Scope

**In scope:**

- Authentication and authorization bypasses
- SQL injection
- Remote code execution
- Sensitive data exposure

**Out of scope:**

- Denial of service
- Social engineering
- Physical security
