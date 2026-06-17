# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do NOT open a public issue for security vulnerabilities.**

Instead, please send an email to **[security@astryxlabs.com]** with:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will investigate and assess the severity
- **Updates**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical issues within 7 days
- **Credit**: We will credit you in the fix (unless you prefer anonymity)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Security Best Practices

When deploying this application:

- Use strong, unique secrets for JWT and encryption keys
- Enable HTTPS in production
- Keep dependencies updated
- Use environment variables for sensitive configuration
- Implement rate limiting
- Enable database connection encryption

## Scope

The following are in scope for security reports:

- Authentication/authorization bypasses
- SQL injection
- Remote code execution
- Sensitive data exposure
- Cross-site scripting (if applicable)

Out of scope:

- Denial of service attacks
- Social engineering
- Physical security

Thank you for helping keep this project secure.
