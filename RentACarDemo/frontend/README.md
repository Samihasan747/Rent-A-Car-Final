# VELOCITY — frontend

React + TypeScript frontend for the RentACarDemo backend. Phase 0 provides the
application foundation: theme system, layout and navigation, routing and guards,
the API client, shared types and a designed home shell.

## Requirements

- Node.js 20+
- The Spring Boot backend running on `http://localhost:8080`
- MySQL database configured by the backend

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

## Environment

Copy `.env.example` to `.env` when overriding defaults.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Axios `baseURL`. Empty by default, so the browser uses the Vite proxy. |
| `VITE_PROXY_TARGET` | Backend origin for the dev proxy (`/api`, `/auth`). Defaults to `http://localhost:8080`. |

Using the proxy means the frontend calls the real backend without CORS issues in
development. The backend already allows `http://localhost:5173` as a fallback.

## Structure

```
src/
  api/            Axios modules per backend domain (no mock data)
  auth/           AuthProvider, context, guards
  components/
    feedback/     Route loader, placeholder page
    home/         Home page sections
    layout/       Header, footer, navigation, user menu
    theme/        Theme provider, toggle, hook
    ui/           shadcn/ui primitives
  lib/            HTTP client, JWT helpers, adapters, formatting, query keys
  pages/          Route components (lazy-loaded)
  types/          TypeScript mirrors of backend DTOs
```

## Backend contracts respected

- `POST /auth/login` → `{ accessToken }`; 15-minute HS256 token, no refresh.
- JWT claims: `sub`, `uid`, `authorities` (`ROLE_ADMIN` / `ROLE_CUSTOMER`), `exp`.
- `GET /api/user/me` has no role field; the role comes from the token.
- `PUT /api/user/me` uses `{ name, email }` (no password).
- Car JSON uses `Id` (capital I); adapters normalise it to `id`.
- Both error shapes are normalised into `ApiError`:
  - `{ statusCode, error, message, path }`
  - `{ status, error, message, path, fieldErrors }`
- Bookings use inclusive `yyyy-MM-dd` ranges via `/api/bookings` and
  `/api/admin/bookings`.

## Vehicle imagery

The backend has no image column. `src/lib/car-images.ts` maps a car's model to a
local SVG in `public/images/cars`; replace those files with photography later
without touching components or the database.

## Phase 0 scope

Implemented: theme system and persistence, responsive layout and navigation,
route guards, Axios/JWT handling, QueryClient, API types, home shell, and honest
placeholders for the fleet, booking, account and admin screens.

Not yet implemented: login/register forms, car catalogue, booking flow, account
and admin dashboards.
