# Distribution Guide

AutoDealer CMS is sold as clean self-hosted source code. Buyers receive source files and documentation; they do not receive the seller's local build output, credentials, Cloudflare resources, or runtime state.

## Include

Include these in the commercial package:

- `README.md`
- `COMMERCIAL_LICENSE.md`
- `THIRD_PARTY_NOTICES.md`
- `DISTRIBUTION.md`
- `FINAL_RELEASE_REPORT.md`
- `SELL_READY_REPORT.md`
- `.env.example`
- `.dev.vars.example`
- `.gitignore`
- `.openai/hosting.json`
- `package.json`
- `package-lock.json`
- `app/`
- `db/`
- `drizzle/`
- `public/`
- `scripts/`
- `tests/`
- `build/`
- `worker/`
- `drizzle.config.ts`
- `eslint.config.mjs`
- `next.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `vite.config.ts`

## Exclude

Do not include:

- `.git/`
- `node_modules/`
- `.next/`
- `dist/`
- `.vinext/`
- `.wrangler/`
- `coverage/`
- `.env`
- `.dev.vars`
- `outputs/`
- `work/`
- `*.tsbuildinfo`
- `.DS_Store`
- `npm-debug.log*`
- `yarn-debug.log*`
- `yarn-error.log*`
- `.pnpm-debug.log*`
- private notes
- real Cloudflare IDs or credentials
- real customer data
- real dealer images without redistribution rights

## Package Command

Run:

```bash
npm run package
```

This creates:

```text
outputs/autodealer-cms-v0.1.0.tar.gz
```

The package script excludes `.git`, dependencies, build output, runtime state, real environment files, and other development artifacts.

## Manual Packaging Checklist

If packaging manually:

1. Start from a clean source tree.
2. Confirm `.env` and `.dev.vars` do not exist in the package.
3. Confirm `.env.example` and `.dev.vars.example` contain placeholders only.
4. Confirm no `.wrangler`, `.vinext`, `dist`, `node_modules`, or `.git` directories are included.
5. Run `npm install`.
6. Run `npm run lint`.
7. Run `npm test`.
8. Run `npm run build`.
9. Run `npm audit --omit=dev`.
10. Include the seller-reviewed commercial license.
