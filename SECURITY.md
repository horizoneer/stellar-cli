# Security Policy

## Security Audit

This project follows security best practices to ensure the safety of user data and system integrity.

## Dependency Management

### Regular Updates

Dependencies are regularly updated to include security patches and bug fixes. The project uses:

- `npm audit` to check for known vulnerabilities
- Dependabot for automated dependency updates (via GitHub Actions)
- Manual review of security advisories

### Security Scripts

Run these commands to check for security issues:

```bash
# Check for vulnerabilities
npm audit

# Check for vulnerabilities with moderate severity or higher
npm audit --audit-level=moderate

# Automatically fix vulnerabilities
npm audit fix

# Review outdated packages
npm outdated
```

## Security Best Practices

1. **No Hardcoded Secrets**: The CLI does not store or request private keys or secrets
2. **Input Validation**: All user inputs are validated before processing
3. **Secure Communication**: All API calls use HTTPS
4. **Error Handling**: Sensitive information is not exposed in error messages
5. **Dependency Scanning**: Regular security audits of dependencies

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. Do not create a public issue
2. Send details to the maintainers privately
3. Include steps to reproduce the vulnerability
4. Allow time for the issue to be fixed before disclosure

## Security Features

- **Rate Limiting**: Built-in rate limiting to prevent API abuse
- **Input Sanitization**: All inputs are sanitized before processing
- **Secure Defaults**: Default configuration prioritizes security
- **Logging**: Security-relevant events are logged for monitoring

## CI/CD Security

The GitHub Actions CI/CD pipeline includes:

- Automated security scanning with Snyk
- Dependency vulnerability checks
- Code quality checks
- Automated testing

## Keeping Dependencies Secure

To maintain security:

1. Run `npm audit` regularly
2. Keep Node.js updated to the latest LTS version
3. Review security advisories for dependencies
4. Update dependencies when security patches are released
5. Use `npm ci` for clean installs in production

## Environment Variables

The CLI supports environment variables for configuration:

- `HORIZON_MAINNET_URL`: Custom Horizon mainnet endpoint
- `HORIZON_TESTNET_URL`: Custom Horizon testnet endpoint
- `LOG_LEVEL`: Logging verbosity level
- `NODE_ENV`: Environment setting (development/production)

Never commit environment variables with sensitive data to version control.
