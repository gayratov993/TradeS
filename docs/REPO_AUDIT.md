# GitHub Repository Audit

Audited on 2026-11-20 for `gayratov993/TradeS`.

This is a practical review of what is complete, what is missing, and what still fails on GitHub. It is not a security guarantee.

For the full user-requested feature checklist and acceptance criteria, see [COMPLETION_CHECKLIST.md](./COMPLETION_CHECKLIST.md).

---

## 1. Repository snapshot

| Item | Value |
|---|---|
| Repository | `gayratov993/TradeS` |
| Visibility | Public |
| Default branch | `main` |
| Branch protection | **Not configured** |
| Tags / releases | **None** |
| Homepage / deploy URL | **Not set** |
| Open human issues | 0 |
| Open pull requests | 15, all Dependabot dependency bumps |
| Languages | JavaScript, TypeScript, Kotlin, CSS, Ruby, Swift, Batchfile, Dockerfile, HTML, C |

---

## 2. Working / complete

- Full monorepo is pushed: `backend`, `web`, `web/admin`, `mobile`, `docs`, Render blueprint.
- Root `README.md` is now fully in **English** and links to the other current docs.
- `docs/LAYOUTS.md` now catalogs all web, admin, and mobile screens in English.
- `docs/index.md` is now in English and clearly marks older docs as historical.
- An MIT `LICENSE` file now exists; previously the README claimed MIT but no file was present.
- No `.env`, `.env.local`, Android keystore, or backup file is committed.
- `render.yaml` now points to the correct `gayratov993/TradeS` repository.
- Prisma migrations and POS seed are committed and documented.

---

## 3. Fixed in this change

| Issue | Cause | Fix |
|---|---|---|
| Secret Scan workflow always failed | Shallow checkout meant the scanned commit's parent was missing; Gitleaks logged `failed to scan Git repository: "stderr is not empty"`. The upload step also looked for `gitleaks-report.json`, but the action writes `results.sarif`. | Added `fetch-depth: 0`, removed conflicting custom Gitleaks args, upload `results.sarif`. |
| README was in Uzbek | Requested English documentation. | Rewrote the root README in English. |
| No screen catalog | Repository had only route source files, no English layout document. | Added `docs/LAYOUTS.md`. |
| No LICENSE | Metadata said MIT but the file was missing. | Added `LICENSE`. |
| Stale Render comment | Still referenced `atxamov99/TradeS`. | Updated to `gayratov993/TradeS`. |

Verified: Secret Scan run [44602578571](https://github.com/gayratov993/TradeS/actions/runs/44602578571) completed with **success** on commit `8734d00`.

---

## 4. Still open on GitHub

### CI / automation

- **`npm audit (backend, web, mobile)` is failing.** This is a real dependency finding, not a workflow typo.

  | Package | High | Critical | Notable blockers |
  |---|---:|---:|---|
  | `backend` | 6 | 1 | `prisma` / `@prisma/config` / `deepmerge-ts` require Prisma 7 major upgrade; `joi`, `body-parser`, `brace-expansion`, `proxy-addr` have non-major fixes |
  | `web` | 7 | 0 | `vite` requires major upgrade to 8; `axios`, `postcss`, `browserslist`, `form-data`, `nanoid`, `source-map-js` have fixes |
  | `mobile` | 20 | 1 | `expo-router` / Expo 58 major upgrade; `shell-quote`, `postcss`, `tar`, `undici`, `js-yaml`, `node-forge`, etc. |

- There are **15 open Dependabot PRs**. Several are major upgrades (`expo`, `expo-router`, `prisma`, `vite`, `react-dom`) and should not be merged blindly into a production POS app.
- No CI workflow runs `npm test`, lint, or build. GitHub currently checks only npm audit and secret scanning.
- `main` is not protected: no required checks, no review requirement.
- No tags or releases exist for deployment tracking.

### Metadata / presentation

- No homepage or live deployment URL is set in the GitHub repository.
- No repository topics were configured.
- No status badges in the README.
- No screenshots, GIFs, or visual mockups are stored in the repository.
- No `CHANGELOG.md`, root `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates, or pull request template.

### Documentation debt

Several older documents under `docs/` and client README files are still in Uzbek or mention the former project/infrastructure:

- `docs/api.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/contributing.md`
- `docs/backend-bugs.md`
- `docs/web-bugs.md`
- `docs/testing.md`
- `docs/admin/*`
- `backend/README.md`, `web/README.md`, `web/admin/README.md`, `mobile/README.md`

They are now explicitly marked as historical in `docs/index.md`, but they have not been rewritten yet.

### Product work still missing

- Multi-item POS cart, payment dialog, change calculation, receipt print/share.
- Register shift open/close and cash drawer flow.
- Return/refund flow.
- Per-store inventory operations.
- Enforcing `Plan.maxStores`, `maxRegistersPerStore`, and `maxUsers` in services and UI.
- Production email OTP needs `RESEND_API_KEY`.
- A real user Telegram number still needs to be linked.

---

## 5. Suggested order of work

1. Merge safe non-major Dependabot fixes first, one package group at a time, running `npm run build` and API smoke tests after each.
2. Schedule major upgrades (`prisma@7`, `vite@8`, `expo@58`) as separate branches with regression tests.
3. Add a CI workflow that runs backend syntax checks, `prisma validate`, and `npm run build` for web/admin.
4. Enable branch protection on `main` once CI is green.
5. Translate the remaining historical docs and add screenshots to `docs/LAYOUTS.md`.
6. Finish the multi-item POS workflow and plan-limit enforcement.
