# MCDR Settlement Service — Setup & Foundation

This covers the (D) and (A) items from the Setup & Foundation section of the
task list:

- [x] Docker Compose skeleton: NestJS API, MongoDB, Keycloak
- [x] Keycloak realm with two roles (`owner`, `backoffice_employee`) + one test user each
- [x] MongoDB schemas: Owner, Company, Employee, SettlementRequest, Meeting, SettlementDocument
- [ ] REST API contract (routes, DTOs) — do this with the team, not solo; see note at the bottom
- [ ] Owner/Backoffice frontend scaffolds with Keycloak login — placeholder folders only, for tracks B/C

## Project layout

```
mcdr-settlement-service/
├── docker-compose.yml
├── keycloak/
│   └── realm-export.json      # auto-imported when Keycloak starts
├── backend/                   # NestJS API (track A)
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── schemas/           # the 6 Mongoose schemas from the ERD
│       ├── database/          # Mongoose connection + model registration
│       └── app.module.ts
├── owner-portal/               # placeholder for track B
└── backoffice-portal/          # placeholder for track C
```

## Running it

```bash
cd backend && cp .env.example .env && cd ..
docker compose up --build
```

First boot takes a minute or two — Keycloak has to come up, connect to its
own Postgres, and import the realm. Once it's healthy:

- Backend: http://localhost:3000
- Keycloak admin console: http://localhost:8080 (login: `admin` / `admin`)
- Mongo: `mongodb://localhost:27017/mcdr` (e.g. via MongoDB Compass)

## Keycloak, explained for someone who's never touched it

Four concepts cover essentially everything you'll need for this project:

**Realm** — an isolated tenant. Ours is called `mcdr`. Everything below
(roles, clients, users) lives inside this one realm and doesn't leak into
any other project sharing the same Keycloak instance.

**Roles** — `owner` and `backoffice_employee`. These get embedded inside
the JWT Keycloak issues after login, in a claim called `realm_access.roles`.
Your NestJS guards will check this claim to decide who can hit which
endpoint — this is what "role-guarded" means in the task list's Definition
of Done.

**Client** — think of it as "an application allowed to ask Keycloak for
tokens." We defined one: `mcdr-backend`. Both portal apps authenticate
through this same client for now; it's easy to split into two later if the
frontend tracks want separate clients.

**Direct access grants** — the sequence diagram shows the Owner's App
posting `username/password` straight to Keycloak and getting a token back,
no redirect/login-page hop. That's the "Resource Owner Password
Credentials" grant, and it's why `directAccessGrantsEnabled: true` is set
on the client. (Worth knowing: Keycloak's own docs call this grant
discouraged for production SPAs because the frontend handles raw passwords
— fine for an internship project matching a spec that already assumes it,
but flag it if this ever goes further.)

**Test login**, once the stack is up:

```bash
curl -X POST http://localhost:8080/realms/mcdr/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=mcdr-backend" \
  -d "client_secret=change-me" \
  -d "grant_type=password" \
  -d "username=test.owner" \
  -d "password=Owner123!"
```

That returns an `access_token` — paste it into https://jwt.io to see the
`realm_access.roles` claim your guards will read later.

## What's deliberately not wired up yet

- **Endpoint role guards / JWT validation on the NestJS side.** Not needed
  for Setup & Foundation — becomes relevant the moment the first guarded
  endpoint gets written. `nest-keycloak-connect` looked like the obvious
  pick but only supports Nest <11 outside an unstable 2.0 alpha, and this
  project scaffolded on Nest 11 — worth a team decision, not a solo call
  baked into the foundation. The safer well-supported route is
  `@nestjs/passport` + `passport-jwt` + `jwks-rsa`, validating tokens
  straight against Keycloak's JWKS endpoint
  (`/realms/mcdr/protocol/openid-connect/certs`) — no version coupling to
  a smaller community package. Flagging it here so whoever picks up
  Backoffice Review doesn't have to rediscover this.
- **Frontend scaffolds** — `owner-portal/` and `backoffice-portal/` are
  empty. Whoever owns tracks B/C should run their own `create-vite`/`next`
  scaffold in there and wire Keycloak login using the same realm/client.
- **REST API contract** — the task list is explicit that the team designs
  this together, not any one person solo. Worth a short sync before track A
  starts writing controllers, so routes/DTOs don't drift from what B/C are
  expecting.
