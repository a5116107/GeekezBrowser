# Security Audit Command

## Purpose

Provide a stable dependency audit entrypoint even when the default npm mirror does not support advisory endpoints.

## Commands

- Non-strict (recommended for environment compatibility):
  - `npm run audit:deps`
- Strict mode (fails when vulnerabilities are detected):
  - `npm run audit:deps:strict`
  - or `NPM_AUDIT_FAIL_ON_VULN=1 npm run audit:deps`

## Fallback Behavior

`audit:deps` runs:

1. `npm audit --omit=dev --json` on the current registry.
2. If advisory endpoint is unavailable (e.g. mirror returns NOT_IMPLEMENTED/404 on security advisory API), it automatically retries with fallback registry:
   - default: `https://registry.npmjs.org`
   - override via env: `NPM_AUDIT_FALLBACK_REGISTRY`

The command prints:

- route used (primary/fallback)
- whether fallback was used
- vulnerability total and severity breakdown (when available)

In non-strict mode, command exits `0` after successful audit report retrieval even when vulnerabilities are present (to keep audit usable in constrained environments).  
Use strict mode for security gating.
