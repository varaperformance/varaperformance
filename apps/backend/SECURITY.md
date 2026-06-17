# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do NOT open a public issue for security vulnerabilities.**

Instead, report privately via [GitHub Security Advisories](https://github.com/varaperformance/varaperformance/security/advisories/new) with:

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

## Secrets Management

**Production deployments MUST use Infisical for secrets management.**

### Why Infisical?

- **Audit Logging**: Full trail of who accessed which secrets
- **Role-Based Access**: Fine-grained permissions per environment
- **Key Rotation**: Rotate secrets without redeployment
- **E2E Encryption**: Secrets encrypted at rest and in transit
- **SOC2 Compliant**: Infisical is SOC2 Type II certified

### Critical Secrets

The following secrets MUST be stored in Infisical for production:

| Secret           | Description                     | Risk if Exposed                |
| ---------------- | ------------------------------- | ------------------------------ |
| `ENCRYPTION_KEK` | Master encryption key for PII   | All encrypted data compromised |
| `JWT_SECRET`     | JWT signing key                 | Authentication bypass          |
| `DATABASE_URL`   | Production database credentials | Data breach                    |
| `SMTP_PASSWORD`  | Email service credentials       | Email abuse, phishing          |
| `GITHUB_TOKEN`   | GitHub API access               | Repository access              |

### Setup Instructions

1. Create an Infisical account at [infisical.com](https://infisical.com)
2. Create a project for your environment
3. Add secrets to the project
4. Create a Machine Identity for server access
5. Set the following environment variables:
   - `INFISICAL_CLIENT_ID`
   - `INFISICAL_CLIENT_SECRET`
   - `INFISICAL_PROJECT_ID`
   - `INFISICAL_ENVIRONMENT` (e.g., `prod`, `staging`)

See `.env.example` for all required variables.

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
