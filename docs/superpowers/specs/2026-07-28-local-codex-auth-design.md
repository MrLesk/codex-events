# Local Codex Authentication

## Goal

Contributors can run Codex Events locally and use the existing sign-in and
sign-out controls without configuring Auth0. Production authentication remains
on Auth0.

## Activation

Local Codex authentication is enabled only when Nuxt is running in development
mode and the required Auth0 settings are absent. When the Auth0 settings are
present, the application uses Auth0 exactly as it does today. A production build
never falls back to local authentication.

## Sign-in

The existing `/auth/login` entry point starts `codex login` and waits for it to
finish. Codex owns the browser authorization flow and all OpenAI credentials.
After successful login, the application asks Codex app-server for the current
account and requires a ChatGPT email address.

The application creates a local Codex Events session containing only that
email. The session presents the existing application with this identity:

```text
sub: local-chatgpt|<normalized email>
email: <normalized email>
email_verified: true
```

If Codex is already authenticated, its login command may complete without
another interactive prompt.

## Sign-out

The existing `/auth/logout` entry point clears only the local Codex Events
session and redirects to the application. It does not run `codex logout`, revoke
OpenAI credentials, or change the maintainer's Codex login.

## Application Integration

The local identity enters through the same request-level session seam used by
Auth0. Existing account registration, actor resolution, permissions, client
authentication state, and navigation continue to consume the same user shape.
No provider abstraction, account-linking behavior, migration, or production
fallback is added.

The email is intentionally the local identity key. Changing the ChatGPT email
creates a different local identity. This limitation is acceptable for the
development-only path.

## Errors

Local sign-in returns a clear development error when:

- the `codex` executable is unavailable;
- the maintainer cancels or Codex login fails;
- app-server cannot be started or queried; or
- the ChatGPT account does not provide an email address.

Errors do not expose command output, tokens, or other credential material.

## Session and Credential Boundaries

The local session is scoped to Codex Events and requires no environment secret.
It stores no OpenAI access token, refresh token, authorization code, or device
code. Codex remains responsible for storing and refreshing its own credentials.

## Validation

Focused automated tests cover mode selection, successful local session
creation, local sign-out, and actionable failures. Contributor documentation
explains the zero-Auth0 local workflow and its email-based identity limitation.
The existing Auth0-backed browser suite remains the production authentication
test path.
