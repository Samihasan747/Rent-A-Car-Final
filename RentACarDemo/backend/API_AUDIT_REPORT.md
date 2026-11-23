# RentACarDemo — Backend Audit & API Documentation

> Generated from a full source inspection of `src/main/java`, `src/main/resources`, and `pom.xml`.
> Nothing in this report is inferred beyond what the code actually implements. Where something is
> missing, it is explicitly labelled **MISSING** or **INCOMPLETE**. No existing files were modified.

---

## 1. Executive Summary

| Item | Value |
|---|---|
| Framework | Spring Boot **4.1.1** (Spring Framework 7 / Spring Security 7) |
| Language | Java **21** |
| Build | Maven (`pom.xml`) |
| Database | **MySQL** `localhost:3306/rentacardemo_db` |
| Schema management | Hibernate `ddl-auto=update` (no migrations) |
| Auth | **Stateless JWT** (HS256, 15-minute expiry), Bearer token |
| Backend port | **8080** (no `server.port` override → Spring Boot default) |
| Context path | none (root) |
| CORS | **NOT CONFIGURED** — browser frontend on another origin will be blocked |
| REST controllers | **4** |
| Total endpoints | **15** |
| Entities | **2** (`User`, `Cars`) — **no Booking/Reservation entity** |
| Roles | `CUSTOMER`, `ADMIN` |

**Overall verdict:** authentication, user profile management, car CRUD and a minimal
"one-car-per-user" booking toggle are implemented. A real rental/reservation domain
(dates, duration, price, history) is **not implemented**. Several endpoints return
`500` for normal business failures, soft-deleted users can still authenticate, and
no CORS configuration exists — all of which materially affect frontend development
(see §11, §12).

---

## 2. Runtime & Configuration

`src/main/resources/application.properties`:

| Property | Value | Notes |
|---|---|---|
| `spring.application.name` | `RentACarDemo` | |
| `spring.datasource.url` | `jdbc:mysql://localhost:3306/rentacardemo_db` | MySQL assumed running |
| `spring.datasource.username` | `root` | hardcoded |
| `spring.datasource.password` | `MySQL@747` | hardcoded secret committed to repo |
| `spring.jpa.hibernate.ddl-auto` | `update` | auto-creates/updates tables; no Flyway/Liquibase |
| `spring.jpa.show-sql` | `true` | verbose logging |
| `spring.jpa.properties.hibernate.format_sql` | `true` | |
| `jwt.secret` | base64 HMAC key | committed to repo |
| `jwt.issuer` | `rentacar-api` | validated on every token |
| `jwt.expiry` | `900` | **seconds → 15 minutes** |
| `server.port` | *(absent)* | **8080** |

Base URL for the frontend: **`http://localhost:8080`**

---

## 3. Complete Endpoint Inventory

All paths are case-sensitive. `{id}` = numeric database ID.

| # | Method | Path | Access | Request body | Success | Response type |
|---|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | Public | `{ email, password }` | 200 | `{ accessToken }` |
| 2 | POST | `/api/user/register` | Public | `{ name, email, password }` | 201 | `UserResponse` |
| 3 | POST | `/api/user/book/{cid}` | ADMIN, CUSTOMER | none | 200 | **plain text** `"Done"` |
| 4 | POST | `/api/user/cancel` | ADMIN, CUSTOMER | none | 200 | **plain text** `"Booking Canceled"` |
| 5 | GET | `/api/user/me` | ADMIN, CUSTOMER | none | 200 | `UserResponse` |
| 6 | PUT | `/api/user/me` | ADMIN, CUSTOMER | `{ name, email, password }` | 200 | `UserResponse` |
| 7 | PATCH | `/api/user/me` | ADMIN, CUSTOMER | none | 204 | *(empty — soft delete)* |
| 8 | GET | `/api/admin/user/all` | ADMIN | none | 200 | `[UserResponse]` |
| 9 | DELETE | `/api/admin/user/{id}` | ADMIN | none | 204 | *(empty — hard delete)* |
| 10 | POST | `/api/admin/cars/add` | ADMIN | `{ name, model, price }` | 201 | `CarResponse` |
| 11 | PUT | `/api/admin/cars/{id}` | ADMIN | `{ name, model, price }` | 200 | `CarResponse` |
| 12 | DELETE | `/api/admin/cars/{id}` | ADMIN | none | 204 | *(empty)* |
| 13 | GET | `/api/cars/{id}` | ADMIN, CUSTOMER | none | 200 | `CarResponse` |
| 14 | GET | `/api/cars` | ADMIN, CUSTOMER | none | 200 | `[CarResponse]` |
| 15 | GET | `/api/cars/available` | ADMIN, CUSTOMER | none | 200 | `[CarResponse]` |

Method distribution: **GET 5 · POST 5 · PUT 2 · PATCH 1 · DELETE 2**.

There are **no** endpoints for: bookings history, date-based availability, admin booking
management, password change, logout/refresh, creating an admin, single-user admin lookup,
car images/search/filter, or public (anonymous) car browsing.

---

## 4. Endpoint Reference (exact contract)

### 4.1 `AuthController` — base `/auth`

#### POST `/auth/login` — public
Request `LoginRequestDto`:
```json
{ "email": "user@example.com", "password": "secret123" }
```
- Validation annotations exist on the DTO but **`@Valid` is not applied**, so they are inert.
- Success **200**, `LoginResponseDto`:
```json
{ "accessToken": "<jwt>" }
```
JWT payload (HS256, `iss=rentacar-api`, `sub=<email>`, `exp=now+900s`):
```json
{
  "iss": "rentacar-api",
  "sub": "user@example.com",
  "iat": 1700000000,
  "exp": 1700000900,
  "authorities": ["ROLE_CUSTOMER"]
}
```
- Failure: bad credentials throw `BadCredentialsException` (a `RuntimeException`) which the
  global handler maps to **500**, not 401:
```json
{ "timespan":"...", "statusCode":500, "error":"Internal Server Error",
  "message":"Bad credentials", "path":"/auth/login" }
```

### 4.2 `UserController` — base `/api/user`

#### POST `/api/user/register` — public
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }
```
Rules: `name` non-blank, valid email, password ≥ 8 chars. Role is forced to `CUSTOMER`;
`isDeleted=false`. Password is BCrypt-hashed in `AuthService`.
- **201** `UserResponse` (see §4.5), `bookedCar` is `null` for a new user.
- **400** validation error (`ValidationExceptionDto`, see §8).
- **409** duplicate email — message is hardcoded `"Email already exists!"` (raised by the
  generic `DataIntegrityViolationException` handler).
- No token is returned; the client must call `/auth/login` afterwards.

#### POST `/api/user/book/{cid}` — ADMIN or CUSTOMER
- No body. Resolves the caller from JWT subject (email) → user ID.
- Sets `user.booked_car = cid` and `cars.is_booked = true`.
- **200** `text/plain`: `Done`
- Business failures (all currently **500**, see §11):
  - user already has a booking → `"User already has a booking"`
  - car already booked → `"Car is not free"`
  - unknown car → **404** `"Car does not exist"`
  - unknown user → 500 `"User not found"`

#### POST `/api/user/cancel` — ADMIN or CUSTOMER
- No body. Cancels the caller's *current* booking (car ID taken from `user.bookedCar`).
- **200** `text/plain`: `Booking Canceled`
- **If the user has no booking → `NullPointerException` → 500.**
- Clears `user.booked_car` and `cars.is_booked=false`.

#### GET `/api/user/me` — ADMIN or CUSTOMER
- **200** `UserResponse` for the JWT subject.
- **404** if the account is soft-deleted (lookup uses `findByIdAndIsDeletedFalse`).
- **500** `"User not found"` if the JWT subject no longer matches any row (e.g. email changed,
  or account hard-deleted) — see finding **H7**.

#### PUT `/api/user/me` — ADMIN or CUSTOMER
```json
{ "name": "New Name", "email": "new@example.com", "password": "dummy1234" }
```
- Updates **name and email only**. `password` is **validated (non-blank, ≥8)** but **ignored**.
- **200** `UserResponse`.
- **404** if soft-deleted; **409** if the new email collides.
- Changing the email invalidates the current token (subject is the old email → later calls
  return 500). The user must log in again.

#### PATCH `/api/user/me` — ADMIN or CUSTOMER
- Soft delete (`is_deleted=true`), **204** empty body.
- Does **not** release a booked car and does **not** invalidate existing JWTs.

### 4.3 `AdminController` — base `/api/admin` (ADMIN only)

#### GET `/api/admin/user/all`
- **200** `[UserResponse]`, only users with `isDeleted=false` (admins included).
- No pagination, sorting, or search.

#### DELETE `/api/admin/user/{id}`
- Hard delete, **204**.
- Does **not** release the user's booked car (car stays `is_booked=true` forever).
- **404** unknown ID.
- DB constraint errors surface as **409** `"Email already exists!"` (misleading).

#### POST `/api/admin/cars/add`
```json
{ "name": "Toyota", "model": "Corolla", "price": 45.5 }
```
- `name`/`model` non-blank, `price` non-null (**no positivity/range check**).
- New car is stored with `isBooked=false`. **201** `CarResponse`.

#### PUT `/api/admin/cars/{id}`
- Same body. Updates **name, model, price only**; booking state is untouched. **200** `CarResponse`.

#### DELETE `/api/admin/cars/{id}`
- **204**. If the car is currently referenced by a user (`user_table.booked_car` FK), the DB
  rejects the delete → **409** `"Email already exists!"` (again misleading).

### 4.4 `CarController` — base `/api/cars` (ADMIN or CUSTOMER)

| Endpoint | Behaviour |
|---|---|
| GET `/api/cars/{id}` | Single car; **404** if absent |
| GET `/api/cars` | All cars, including booked ones |
| GET `/api/cars/available` | Only `is_booked=false` |

Route note: the literal `/available` is more specific than `/{id}` and correctly wins.

### 4.5 Serialized JSON shapes

`UserResponse` (`UserResponseDto`):
```json
{
  "id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "bookedCar": {
    "id": 3, "name": "Toyota", "model": "Corolla",
    "booked": true, "price": 45.5
  }
}
```
- `bookedCar` is the **raw `Cars` entity**, `null` when nothing is booked.
- No password, role, or `isDeleted` is exposed.

`CarResponse` (`CarRespondDto`):
```json
{ "id": 3, "name": "Toyota", "model": "Corolla", "booked": false, "price": 45.5 }
```
- The JSON key is **`booked`** (from `getBooked()`), **not** `isBooked`.

---

## 5. Authentication & Authorization

**Mechanism:** Spring Security + OAuth2 Resource Server JWT (no sessions, no cookies).

- CSRF disabled; `SessionCreationPolicy.STATELESS`.
- `POST /auth/login` authenticates via `DaoAuthenticationProvider` (BCrypt) and issues an
  HS256 JWT through `JwtEncoder` (`NimbusJwtEncoder.withSecretKey`).
- Every protected request must send:
  `Authorization: Bearer <accessToken>`
- `JwtDecoder` validates signature, expiry, and issuer `rentacar-api`.
- Authorities are read from the custom `authorities` claim with **no prefix added**
  (`setAuthorityPrefix("")`), e.g. `ROLE_CUSTOMER`, `ROLE_ADMIN`; `hasRole("X")` maps to `ROLE_X`.
- No refresh token, no revocation list, no logout endpoint, no "disabled/deleted" check.

**Public paths (permitAll):** `/api/user/register`, `/auth/login`.
**Everything else:** `authenticated()`.

**Security responses:** there is no custom `AuthenticationEntryPoint` or
`AccessDeniedHandler`, so 401/403 bodies are Spring Security defaults (often empty) — not
the `ExceptionResponseDto` shape used by controllers.

---

## 6. Roles & Permission Matrix

| Area | Anonymous | CUSTOMER | ADMIN |
|---|---|---|---|
| POST `/auth/login` | ✅ | ✅ | ✅ |
| POST `/api/user/register` | ✅ | ✅ | ✅ |
| GET/PUT/PATCH `/api/user/me` | ❌ 401 | ✅ | ✅ |
| POST `/api/user/book/{cid}` | ❌ 401 | ✅ | ✅ *(ADMIN may book too)* |
| POST `/api/user/cancel` | ❌ 401 | ✅ | ✅ |
| GET `/api/cars`, `/api/cars/{id}`, `/api/cars/available` | ❌ 401 | ✅ | ✅ |
| GET `/api/admin/user/all` | ❌ 401 | ❌ 403 | ✅ |
| POST/PUT/DELETE `/api/admin/cars/**` | ❌ 401 | ❌ 403 | ✅ |
| DELETE `/api/admin/user/{id}` | ❌ 401 | ❌ 403 | ✅ |

**Role assignment:** registration hardcodes `Role.CUSTOMER`. There is **no API** to create
or promote an `ADMIN`; an admin row must be inserted directly into MySQL (with a BCrypt
password hash) before the admin area is usable.

---

## 7. Data Model

### 7.1 Entities

**`User` → table `user_table`**

| Column | Type | Notes |
|---|---|---|
| `user_id` | Long PK, IDENTITY | |
| `name` | String | |
| `email` | String, **unique** | login username |
| `password` | String | BCrypt hash |
| `role` | enum STRING | `CUSTOMER` / `ADMIN` |
| `booked_car` | FK → `cars_table.car_id`, **unique** (`@OneToOne`) | nullable |
| `is_deleted` | Boolean | soft-delete flag |

**`Cars` → table `cars_table`**

| Column | Type | Notes |
|---|---|---|
| `car_id` | Long PK, IDENTITY | |
| `name` | String | brand/make |
| `model` | String | |
| `is_booked` | Boolean | availability flag |
| `price` | Double | money as floating point (finding **M2**) |

### 7.2 Relationships

```
user_table 1 ──── 0..1 cars_table
      (booked_car FK, unique)
```
- Unidirectional `@OneToOne`; `Cars` has no back-reference to `User`.
- **There is no `Booking`/`Reservation` entity.** A booking is only a nullable FK plus a boolean.
- No timestamps, no audit fields, no version/lock column.

### 7.3 Derived queries in repositories

`UserRepository`:
- `findByIdAndIsDeletedFalse(Long)`
- `findByIsDeletedFalse()`
- `findByEmail(String)` — **does not filter deleted users**
- *(commented-out `@EntityGraph(attributePaths="roles")`)*

`CarRepository`:
- `findByIsBookedFalse()`
- `findByIdAndIsBookedFalse(Long)` — **unused**
- `findByIdAndIsBookedTrue(Long)` — **unused** (returns `Optional<Object>`)

---

## 8. Error Response Contract (inconsistent)

Two different JSON shapes are produced.

**`ExceptionResponseDto`** — 404, 409, 500:
```json
{
  "timespan": "2026-11-19T10:15:30.123",
  "statusCode": 404,
  "error": "Not Found",
  "message": "Car with id 9 does not exist!",
  "path": "/api/cars/9"
}
```

**`ValidationExceptionDto`** — 400 only:
```json
{
  "timestamp": "2026-11-19T10:15:30.123",
  "status": 400,
  "error": "Bad Request",
  "path": "/api/user/register",
  "message": "Invalid Input",
  "fieldErrors": { "email": "Invalid Email format" }
}
```

Note the differing keys: `timespan`/`statusCode` vs `timestamp`/`status`.

Mapping table:

| Exception | Status | Body |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | `ValidationExceptionDto` |
| `ResourceNotFoundException` | 404 | `ExceptionResponseDto` |
| `DataIntegrityViolationException` | 409 | `ExceptionResponseDto`, message always `"Email already exists!"` |
| `RuntimeException` (business errors, `BadCredentialsException`, NPE) | **500** | `ExceptionResponseDto` |
| Anything else | 500 | `ExceptionResponseDto` |
| Spring Security 401/403 | 401/403 | default (not this contract) |

Because `RuntimeException` is handled at 500, ordinary outcomes such as "car already booked",
"user already has a booking", and "wrong password" are **server errors** from the client's
point of view.

---

## 9. Car Management & Availability — assessment

**Implemented:**
- Admin create car (`POST /api/admin/cars/add`) — stored as available.
- Admin update car name/model/price.
- Admin delete car (blocked by FK if currently booked).
- List all cars and list available cars.
- Admin create car (`POST /api/admin/cars/add`) — stored as available.
- Per-car `booked` flag exposed in every car response.

**Missing / incomplete:**
- No date range, pickup/return dates, or date-based availability.
- No booking/reservation records, so "availability" = a single boolean, not a schedule.
- No way to mark a car unavailable for maintenance directly; only the booking flow toggles it.
- No car metadata: plate number, category, transmission, seats, year, location, image URL.
- No search, filter, sort, or pagination.
- `price` has no positivity check and uses `Double` (rounding risk for money).

---

## 10. Booking & Reservation — assessment

**Implemented (minimal model):**
- A customer may hold **exactly one** car at a time (`user.booked_car`).
- Book: `POST /api/user/book/{cid}` → sets FK and `is_booked=true`.
- Cancel: `POST /api/user/cancel` → clears both.
- `GET /api/user/me` exposes the current booked car.
- Admin/user list responses also expose `bookedCar`.

**Missing / incomplete:**
- No `Booking` entity: no start/end dates, rental duration, total price, status
  (`PENDING/CONFIRMED/COMPLETED/CANCELLED`), or creation timestamp.
- No booking history (cancelling erases all traces).
- No admin booking list/management.
- No multiple/simultaneous bookings, no per-date availability.
- No price calculation or confirmation step.
- Cancel without an active booking → `NullPointerException` → 500.
- Soft/hard user deletion leaves the car permanently marked booked.
- Concurrency: no `@Version` / pessimistic lock; two simultaneous bookings of the same car
  rely on the DB unique constraint on `user_table.booked_car` (which would surface as a
  misleading 409).
- Cancelling is a `POST`, not `DELETE`, and takes no identifier.

---

## 11. Findings — bugs, risks, and severity

### High / blocking for frontend

| ID | Finding | Evidence | Impact |
|---|---|---|---|
| **H1** | **No CORS configuration at all** — no `cors()`, no `CorsConfigurationSource`, no `@CrossOrigin`, no `WebMvcConfigurer` | `SecurityConfig`, global grep | Browser calls from Vite/React on another port are blocked; preflight `OPTIONS` likely 401. Dev proxy or backend CORS is mandatory. |
| **H2** | Wrong password returns **500**, not 401 | `BadCredentialsException` is a `RuntimeException`; `GlobalExceptionHandler` maps it to 500 | Frontend cannot distinguish invalid credentials from a server crash without parsing the message. |
| **H3** | Business conflicts return **500** | `"Car is not free"`, `"User already has a booking"` thrown as `RuntimeException` | Should be 409; UI error handling is unreliable. |
| **H4** | Soft-deleted users can still log in and use the API | `CustomUserDetailsService` uses unfiltered `findByEmail`; `UserDetails.isEnabled()` defaults to `true`; `createBooking` uses `findById` | "Deleted" accounts retain full access with old or new tokens. |
| **H5** | Deleting/soft-deleting a user does not release their booked car | `deleteUser`, `softDelete` in `UserService` | Car stays unavailable forever unless manually fixed in DB. |
| **H6** | Deleting a booked car → FK violation mapped to `409 "Email already exists!"` | `DELETE /api/admin/cars/{id}` + generic handler | Misleading error; admin cannot delete an actively booked car. |
| **H7** | Changing email breaks the current JWT | Token `sub` = email; `Authentication.getName()` returns it; `findByEmail` then fails | After `PUT /api/user/me` with a new email, all calls fail with 500 until re-login. |
| **H8** | `PUT /api/user/me` **requires** a `password` field that it ignores | Shared `UserRequestDto` with `@NotBlank`/`@Size` | Frontend must send a dummy ≥8-char password to change a name. |
| **H9** | Cancel with no active booking → `NullPointerException` → 500 | `user.getBookedCar().getId()` in `UserController` | Any double-click / stale UI state produces a server error. |
| **H10** | Secrets committed in `application.properties` | JWT HMAC key + MySQL root password | Must be rotated/externalised before any real deployment. |
| **H11** | No refresh token, no logout/revocation; hard 15-minute expiry | `jwt.expiry=900`, `JwtService` | Users are logged out every 15 minutes; only client-side "logout". |
| **H12** | No DB migrations; `ddl-auto=update` | `application.properties` | Schema changes are implicit; unsafe for production. |

### Medium

| ID | Finding |
|---|---|
| **M1** | No pagination/sorting/search on `GET /api/cars` or `GET /api/admin/user/all`. |
| **M2** | `price` is `Double`, not `BigDecimal` — floating-point money errors. |
| **M3** | Mixed response types: `text/plain` strings for book/cancel, DTOs, and empty 204s. |
| **M4** | Two incompatible error schemas (`timespan/statusCode` vs `timestamp/status`). |
| **M5** | Dead `UserService.createUser` stores the **raw plaintext password** (not exposed by any controller, but dangerous if reused). |
| **M6** | Unknown paths are caught by the catch-all `Exception` handler → **500** instead of 404 (`NoResourceFoundException`). |
| **M7** | `LoginRequestDto` validation annotations are never executed (missing `@Valid`). |
| **M8** | `price` has no `@Positive`; names have no length limits; `isDeleted`/`isBooked` are nullable. |
| **M9** | Only test is `contextLoads`; no controller/service/security tests. |
| **M10** | No OpenAPI/Swagger. |
| **M11** | No rate limiting or account lockout on `/auth/login`. |
| **M12** | No password change or reset flow. |
| **M13** | No admin creation/promotion endpoint; admin must be seeded manually in MySQL. |
| **M14** | Unused code/injections: `UserController.authService`, `AdminController` `authService` ctor param, `AuthController.resourceLoader`, unused repository methods, unused imports. |

### Low

| ID | Finding |
|---|---|
| **L1** | `System.out.println("Ready")` in the application main. |
| **L2** | `spring.jpa.show-sql=true` left enabled. |
| **L3** | `POST /api/admin/cars/add` is inconsistent with REST style (`PUT /api/admin/cars/{id}`). |
| **L4** | `DELETE /api/admin/user/{id}` can delete the calling admin's own account. |
| **L5** | Email comparison case-sensitivity depends on MySQL collation. |

---

## 12. Implemented vs. Incomplete — explicit checklist

| Capability | Status |
|---|---|
| Customer registration | ✅ Implemented (BCrypt, forced CUSTOMER) |
| JWT login | ✅ Implemented (15 min, HS256) |
| Get / update own profile | ✅ Implemented (password update **not** supported) |
| Soft-delete own account | ⚠️ Implemented, but broken semantics (login still works, car not released) |
| Admin list users | ✅ Implemented (no pagination) |
| Admin delete user | ⚠️ Implemented (hard delete, leaves car booked) |
| Admin create/update/delete car | ✅ Implemented (delete blocked when booked) |
| List all / available cars | ✅ Implemented (boolean availability only) |
| Book one car per customer | ⚠️ Minimal toggle, no dates/history |
| Cancel booking | ⚠️ Only current booking; crashes if none |
| Booking history / reservation records | ❌ Missing |
| Date-based availability | ❌ Missing |
| Admin booking management | ❌ Missing |
| Password change / reset | ❌ Missing |
| Refresh token / logout endpoint | ❌ Missing |
| Admin user creation / role management | ❌ Missing |
| CORS | ❌ Missing |
| Pagination / search / filter | ❌ Missing |
| API documentation (OpenAPI) | ❌ Missing |
| Automated tests | ❌ Missing (context load only) |

---

## 13. Proposed Frontend Implementation Plan

### 13.0 Integration prerequisites (must be decided first)

1. **CORS or proxy.** Because the backend has no CORS, the dev frontend must use a Vite proxy:
   ```ts
   // vite.config.ts
   server: {
     proxy: {
       '/api':  { target: 'http://localhost:8080', changeOrigin: true },
       '/auth': { target: 'http://localhost:8080', changeOrigin: true },
     },
   }
   ```
   Production requires either the same-origin deployment or a backend CORS change.
2. **Token strategy.** No refresh token exists: store the JWT, decode `exp`, auto-logout and
   redirect to `/login` at expiry (15 min). Support a `returnUrl`.
3. **Error normaliser.** Build one utility that handles all four shapes: `ValidationExceptionDto`,
   `ExceptionResponseDto`, plain-text successes, and empty 204s / default Spring Security 401s.
   Document the workaround: `status === 500 && path === '/auth/login' && message === 'Bad credentials'`
   means invalid credentials until H2 is fixed.

### 13.1 Recommended stack

React + TypeScript + Vite, React Router, TanStack Query, Axios, Tailwind CSS (or shadcn/ui),
React Hook Form + Zod for forms.

### 13.2 API client layer

- `authStore`: token, decoded `sub` (email), `authorities` → role, `exp`.
- Axios request interceptor: `Authorization: Bearer <token>`.
- Response interceptor: 401 → clear session → `/login`; 403 → "not allowed"; 400 → field errors.
- Query keys: `['cars']`, `['cars','available']`, `['car',id]`, `['me']`, `['admin','users']`.
- Invalidate `['cars']`, `['me']` after book/cancel; `['cars']` after admin car mutations;
  `['admin','users']` after user deletion.

### 13.3 Routes & pages

| Route | Role | API usage |
|---|---|---|
| `/login` | public | `POST /auth/login` |
| `/register` | public | `POST /api/user/register`, then redirect to login |
| `/cars` | CUSTOMER, ADMIN | `GET /api/cars/available` (toggle to `GET /api/cars` to show all) |
| `/cars/:id` | CUSTOMER, ADMIN | `GET /api/cars/{id}`; `POST /api/user/book/{cid}` |
| `/account` | CUSTOMER, ADMIN | `GET /api/user/me`; `POST /api/user/cancel`; `PUT /api/user/me`; `PATCH /api/user/me` |
| `/admin/cars` | ADMIN | `GET /api/cars`; `DELETE /api/admin/cars/{id}` |
| `/admin/cars/new` | ADMIN | `POST /api/admin/cars/add` |
| `/admin/cars/:id/edit` | ADMIN | `PUT /api/admin/cars/{id}` |
| `/admin/users` | ADMIN | `GET /api/admin/user/all`; `DELETE /api/admin/user/{id}` |

Route guards read `authorities` from the JWT (`ROLE_ADMIN` → admin area, otherwise customer area).
Because role is only in the token, a role change requires re-login.

### 13.4 Phased delivery

**Phase 0 — Foundation (≈0.5–1 day)**
Vite + TS + router + query client; Axios client, auth store, token/expiry handling, error
normaliser, dev proxy, route guards, app shell/navbar.

**Phase 1 — Public auth (≈1 day)**
Login form → store `accessToken` → role-based redirect. Register form with client-side
name/email/password (≥8) validation; map 400 `fieldErrors` and 409 duplicate email.
Handle the 500-on-bad-credentials quirk gracefully.

**Phase 2 — Customer catalog & booking (≈1.5–2 days)**
Car grid from `/api/cars/available` (name, model, price, booked badge); car detail.
Booking button with confirmation, disabled when `GET /api/user/me` already shows `bookedCar`
or the car is booked. Call `POST /api/user/book/{cid}`; invalidate/refetch. Show current
booking banner and a Cancel action (`POST /api/user/cancel`) with confirmation. Handle
404/500 business messages.

**Phase 3 — Account management (≈1–1.5 days)**
Profile page from `/api/user/me`; booked-car card. Edit name/email via `PUT /api/user/me`
— **must include a dummy password ≥8 chars** (H8); after an email change, warn that
re-login is required (H7). Delete account via `PATCH /api/user/me` (confirm dialog),
then clear the session.

**Phase 4 — Admin cars (≈1.5 days)**
Car table with booking status; create/edit forms (`name`, `model`, `price` — positive number,
2 decimals); delete with confirmation and a clear "car is currently booked" message on 409.

**Phase 5 — Admin users (≈1 day)**
Users table (`id`, `name`, `email`, booked car); delete with confirmation. Read-only otherwise
(no create/edit/role endpoints exist).

**Phase 6 — Polish & hardening (≈1–2 days)**
Loading skeletons, empty states, toasts, responsive layout, 403/404 pages, auto-logout timer,
accessibility pass. Optional dashboard counters computed from the two list endpoints.

### 13.5 What the frontend **cannot** build against the current backend

- Date/calendar-based booking and rental duration.
- Booking history or booking IDs.
- Multiple simultaneous bookings.
- Admin booking management/approval.
- Password change or "forgot password".
- Silent refresh / remember-me.
- Admin user creation or role changes.
- Car images, categories, seat/transmission filters, search, server-side pagination.
- Anonymous browsing of the catalog (all car endpoints require a token).

### 13.6 Recommended backend changes before/alongside the frontend

**P0 (unblocks frontend work)**
1. Add CORS config (or commit to a dev proxy + same-origin production).
2. Map `BadCredentialsException` → 401 and business conflicts → 409.
3. Guard cancel when no booking exists (avoid NPE).
4. Introduce a `Booking` entity with `car`, `user`, `startDate`, `endDate`, `totalPrice`, `status`,
   `createdAt`, plus endpoints: create booking, list my bookings, cancel by booking ID,
   list all bookings (admin), date-range availability query.

**P1 (correctness & UX)**
5. Filter `isDeleted=true` in `findByEmail` and reject deleted accounts at login.
6. Release `booked_car` on user soft/hard delete; validate before car delete.
7. Separate DTO for profile update (no password requirement) and add password-change endpoint.
8. Fix `DataIntegrityViolation` messaging; use specific constraint handling.
9. Return consistent error schema and add custom 401/403 handlers.

**P2 (scale & maintainability)**
10. Replace `Double` price with `BigDecimal`.
11. Add pagination, sorting, and filters to list endpoints.
12. Add OpenAPI/Swagger, integration tests, and Flyway migrations.
13. Externalise secrets; shorten/rotate them.
14. Add `@Version` or pessimistic locking for booking concurrency.

---

## 14. Quick reference for the frontend developer

```text
Base URL:            http://localhost:8080
Auth header:         Authorization: Bearer <accessToken>
Login response:      { "accessToken": "..." }
Token lifetime:      900 seconds (15 min), no refresh
Car JSON key:        "booked"  (not "isBooked")
Booking:             POST /api/user/book/{carId}   -> text "Done"
Cancel:              POST /api/user/cancel         -> text "Booking Canceled"
Current user:        GET  /api/user/me
```

**Golden rules while this backend is unchanged:**
1. Always send a ≥8-char `password` on `PUT /api/user/me` (it is ignored).
2. Re-login after changing the account email.
3. Treat `POST /api/user/cancel` as unsafe when `bookedCar` is `null`.
4. Expect 500 for wrong credentials and booking conflicts.
5. Use a dev proxy — there is no CORS.
6. Only one car per user; only one booking at a time; no dates.
