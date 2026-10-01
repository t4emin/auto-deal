# AutoDealer CMS

AutoDealer CMS is a self-hosted vehicle inventory CMS for developers and agencies building car dealer, dealership, and vehicle listing websites. It manages vehicle records and exposes a public JSON API for a separate storefront or mobile app.

This is intentionally not a marketplace, payment platform, CRM, ERP, financing system, or booking engine. V1 focuses on inventory content management.

## Commercial Positioning

The buyer receives source code, an admin CMS, Vehicle CRUD, statuses, Dynamic Attributes, image upload support, authentication/admin users, a public Vehicle API, Cloudflare D1/R2 integration, migrations, demo data, and documentation.

AutoDealer CMS is self-hosted source code. The seller does not provide managed hosting, Cloudflare hosting, a D1 database, R2 storage, a domain, deployment operations, production credentials, or infrastructure management. Each buyer creates and configures their own Cloudflare account, D1 database, R2 bucket, domain, environment variables, deployment, and ongoing infrastructure billing.

## Features

- Vehicle CRUD with title, make, model, variant, year, mileage, price, condition, body type, transmission, fuel type, colors, dealer contact, and descriptions
- Vehicle statuses: `draft`, `available`, `reserved`, `sold`, `hidden`
- Public API visibility rules that exclude `draft` and `hidden`
- Multiple vehicle images through the existing upload pipeline
- Dynamic vehicle attributes for optional specifications
- Demo vehicle data for local development
- Admin authentication, sessions, user approval, login attempt protection, and password change
- Audit log for admin changes
- Cloudflare D1 and R2 oriented runtime

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Drizzle ORM
- SQLite / Cloudflare D1
- Cloudflare R2 for images
- Cloudflare Workers deployment flow through Vinext / Wrangler

## Requirements

- Node.js 22.13 or newer
- npm
- Cloudflare D1 database for deployed environments
- Cloudflare R2 bucket for image uploads in deployed environments

## Local Setup

```bash
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
npm run dev
```

Open:

```text
http://localhost:3000
```

Admin:

```text
http://localhost:3000/admin
```

## Environment Variables

Use `.env.example` for build/deployment values and `.dev.vars.example` for local Cloudflare Worker runtime variables.

`.env.example`:

```text
CLOUDFLARE_D1_DATABASE_ID=your-d1-database-id
CLOUDFLARE_R2_BUCKET_NAME=autodealer-vehicle-images
```

`.dev.vars.example`:

```text
BOOTSTRAP_ADMIN_USERNAME=owner
BOOTSTRAP_ADMIN_PASSWORD=change-this-password
```

`BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` create the first owner account automatically. Change both before deploying. For hosted deployments, configure these as runtime variables/secrets in the hosting platform or Cloudflare environment, not only in local files.

## Database

Fresh runtime startup creates the current AutoDealer tables and seeds demo vehicles. The Drizzle schema lives in `db/schema.ts`.

The migration `drizzle/0000_autodealer_initial.sql` creates the clean AutoDealer schema for migration-based installs. Fresh installs do not create the old source project's product or component compatibility tables.

To generate new migrations after schema customization:

```bash
npm run db:generate
```

## Demo Data

Demo seed data lives in `db/runtime.ts` and includes fictional dealer/contact URLs. It includes a mix of sedan, SUV, pickup, coupe, hatchback, EV, MPV, van, wagon, and different statuses.

No real dealer credentials or copyrighted dealer photography are bundled.

To remove demo data, edit `seedVehicles` in `db/runtime.ts` before first deployment, or delete seeded vehicle rows from your D1 database after setup.

## Image Storage

Uploads use the existing image pipeline and store objects under:

```text
vehicles/YYYY-MM-DD/<uuid>.<ext>
```

The public image endpoint is:

```text
GET /api/v1/images/:key
```

For production, configure the expected R2 binding used by the app runtime.

## Public API

List vehicles:

```http
GET /api/v1/vehicles
```

Vehicle detail:

```http
GET /api/v1/vehicles/:slug
```

Schema for dynamic attributes:

```http
GET /api/v1/schema
```

Useful list filters:

```text
make
model
bodyType
status
year
minPrice
maxPrice
search
page
limit
sort=updated|price_asc|price_desc
```

Example:

```http
GET /api/v1/vehicles?make=Toyota&bodyType=coupe&minPrice=500000
```

Public endpoints only return `available`, `reserved`, and `sold` vehicles. `draft` and `hidden` records are excluded.

## Admin Areas

- Dashboard
- Vehicles
- Attributes
- Users
- Audit Log
- Public API reference

Media and settings are intentionally minimal in V1. Image upload is available inside the vehicle editor.

## Commands

```bash
npm run lint
npm test
npm run build
npm run dev
npm run package
```

`npm run package` creates a clean commercial archive in `outputs/` and excludes dependencies, build output, runtime state, real env files, and `.git`.

## Deployment Notes

1. Create/configure a Cloudflare D1 database.
2. Create/configure a Cloudflare R2 bucket.
3. Set the bootstrap admin runtime variables/secrets:
   - `BOOTSTRAP_ADMIN_USERNAME`
   - `BOOTSTRAP_ADMIN_PASSWORD`
4. Set deployment variables:
   - `CLOUDFLARE_D1_DATABASE_ID`
   - `CLOUDFLARE_R2_BUCKET_NAME`
   - optionally `CLOUDFLARE_D1_DATABASE_NAME`
   - optionally `CLOUDFLARE_WORKER_NAME`
5. Run the project build:

```bash
npm run build
```

6. Deploy through the existing Cloudflare/Vinext flow used by the project.

The build script prints a reminder when `CLOUDFLARE_D1_DATABASE_ID` is not set.

## Project Structure

- `app/admin/AdminConsole.tsx` - admin inventory UI
- `app/api/admin/vehicles` - protected vehicle CRUD
- `app/api/v1/vehicles` - public vehicle API
- `app/api-helpers.ts` - parsing, validation, status visibility, request helpers
- `app/config.ts` - product name and app-level config
- `db/runtime.ts` - runtime table creation and demo seed
- `db/schema.ts` - Drizzle schema
- `tests/rendered-html.test.mjs` - focused smoke/domain tests

## Customization

To change starter body types, update `bodyTypes` in:

- `app/api-helpers.ts`
- `db/runtime.ts`

To add vehicle specification fields, use the Attributes admin screen or seed definitions in `db/runtime.ts`.

Core frequently queried fields should stay as normal vehicle columns. Optional or niche specifications should use dynamic attributes.

## Updating Admin Credentials

The first owner account is created from `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD`. Change those before first production login.

After an owner exists, change a logged-in user's password from the admin account dialog. If you need to rotate the bootstrap owner on an existing production database, update the user record or create a new approved admin account, then remove the old account.

## Troubleshooting

- `BOOTSTRAP_ADMIN_PASSWORD is not configured`: create `.dev.vars` locally from `.dev.vars.example`, or configure the runtime secret in production.
- Public API returns no draft vehicle: this is expected. Public endpoints only expose `available`, `reserved`, and `sold`.
- Image uploads fail in production: verify the R2 binding is named `PRODUCT_IMAGES` and the bucket exists.
- Build warns about missing `CLOUDFLARE_D1_DATABASE_ID`: set it before production deploy. Local development can still run with Miniflare.
- Login works locally but not in production: verify runtime secrets are configured in the deployed environment, not only in local files.

## Current Quality Gate

These commands currently pass:

```bash
npm install
npm run lint
npm test
npm run build
```

`npm install` reports existing dependency audit findings from the inherited dependency tree. They were not force-fixed because `npm audit fix --force` may introduce breaking dependency changes.

## Known Limitations

- No payment gateway
- No online checkout
- No customer accounts
- No booking or reservation payment flow
- No financing calculator or loan application
- No CRM or lead pipeline
- No VIN decoding API
- No vehicle history API
- No marketplace syndication
- No analytics platform
- No multi-tenant SaaS or subscription billing

## Distribution Notes

Before selling or shipping a ZIP, include the seller's commercial license/EULA and review `THIRD_PARTY_NOTICES.md`.
