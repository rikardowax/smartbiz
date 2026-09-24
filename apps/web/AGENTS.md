<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Authentication verification

- From the repository root, run `pnpm --filter @smartbiz/web typecheck`, `pnpm --filter @smartbiz/web build`, and `pnpm exec biome check` on changed files.
- `/login` and `/register` share an animated card. Native `history.replaceState` updates `usePathname`; keep the page-transition key stable between these paths so switching does not reset the form.
- `POST /auth/register` returns the new user and session tokens. New accounts have no shops; registration must not depend on a subsequent `/auth/me` request succeeding. Login still loads `/auth/me` for existing shops.
- Browser regression checks: switch both directions without losing input, register in French and English, simulate `/auth/me` being unavailable after registration, verify duplicate-account errors retain the form, and verify login reaches the dashboard. Mock API responses rather than creating real accounts for these UI checks.
