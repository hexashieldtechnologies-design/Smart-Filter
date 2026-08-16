# Secure Vault

Secure Vault keeps identity documents organized and helps users complete supported forms only after explicit review.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/secure-vault-mobile/app/` — Expo Router screens for the vault, documents, Smart Fill, activity, and security flows
- `artifacts/secure-vault-mobile/context/VaultContext.tsx` — local vault state and audit history
- `artifacts/secure-vault-mobile/constants/colors.ts` — shared light/dark visual tokens
- `artifacts/secure-vault-mobile/services/smartFillNative.ts` — Android Smart Fill bridge contract and permission fallbacks
- `artifacts/api-server/` — shared Express API service
- `lib/api-spec/openapi.yaml` — API source of truth

## Architecture decisions

- Smart Fill is user-confirmed: it proposes matches, lets users select fields, and never submits forms.
- Sensitive fields require a second confirmation and are masked where possible.
- Web/Expo preview uses a controlled in-app form; cross-app Android overlay and accessibility interaction require a native `SmartFillModule` bridge.

## Product

- Stores verified identity documents locally for the prototype experience.
- Supports reviewable Smart Fill sessions with confidence scores, sensitive-field confirmation, pause/stop controls, and completion summaries.
- Records privacy-safe activity events without storing full form values.

## User preferences

- Do not build an Android APK unless the user explicitly requests the APK build after the requested updates are complete.

## Gotchas

- Do not claim unrestricted Chrome DOM access from an overlay. Use the native bridge for supported Android interaction or a controlled WebView/browser integration.
- Treat consent, CAPTCHA/security challenges, payments, and final submission as manual user actions.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
