# Tech Stack

This document defines the canonical technology stack for the Codex hackathon platform.

## Application Stack

- `Nuxt` for the web application
- `shadcn-vue` for the component primitive layer
- `Tailwind CSS` for the interface styling system
- `Zod` for validation and data contracts
- `Drizzle ORM` for database schema management and queries
- `Vitest` for unit and integration testing
- `Playwright` for end-to-end testing
- `Cloudflare Workers` for application hosting and server-side execution
- `Cloudflare D1` for the primary relational database
- `Cloudflare R2` for file storage, including account profile icons, hackathon background/banner images, and public hackathon gallery image delivery through custom domains
- `Cloudflare Images` bindings for protected hackathon photo preview transformations
- `Cloudflare Queues` for asynchronous jobs
- `Cloudflare Cron Triggers` for scheduled platform tasks
- `Cloudflare Email Service` for outbound transactional email delivery
- `Auth0` for user authentication and identity

## Architecture Notes

- Auth0 is responsible for authentication and identity.
- Application authorization remains in the platform database through hackathon roles, team roles, approvals, and related business rules.
- `Cloudflare D1` is the primary relational database.
