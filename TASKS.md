# TASKS

> Updated: 28.05.2026
> Active backlog only

---

## Sprint 5 — Frontend Quality

### App.vue Refactor

- [ ] Move network status logic to `composables/useNetworkStatus.js`
- [ ] Move Telegram WebApp init to `composables/useTelegramInit.js`
- [ ] Move timezone sync to `composables/useTimezone.js`
- [ ] Remove direct initialization business logic from `App.vue`

### UX

- [ ] Add close button for "No internet connection" banner in `App.vue`
- [ ] Fix client validation error handling: support string and array `[{ field, message }]`

---

## Sprint 6 — Testing

- [ ] Add unit tests for `notifications/service.js`
- [ ] Add integration test: course completion → certificate issuance
- [ ] Add bot payload validation test (`/start` with invalid payload)
- [ ] Add path traversal regression test for `extractFileNameFromUploadsUrl`
- [ ] Downgrade `exceljs` to 3.4.0 in backend to fix 2 remaining moderate `uuid` vulnerabilities (breaking change — requires approval)

---

## Tech Debt

---

## Feature Flags — Fixes

### P1: Eliminate duplicated logic

- [ ] Extract `parseDisabledModules()` into `backend/src/config/featureFlags.js` as a shared utility
- [ ] Add `getDisabledModulesSet()` and `getDisabledModulesList()` helpers to `featureFlags.js`
- [ ] Replace local `getDisabledModules()` in `auth/public/service.js` with the shared helper
- [ ] Replace local `getDisabledModules()` in `auth/admin/service.js` with the shared helper
- [ ] Remove the local `parseDisabledModules()` duplicate from `admin/settings/service.js`
- [ ] Remove the local `parseDisabledModules()` duplicate from `middleware/featureFlagsGate.js`

### P2: Improve test coverage

- [ ] Add test: `parseDisabledModules("null")` returns empty Set
- [ ] Add test: `parseDisabledModules` filters out null/empty entries from array
- [ ] Add test: `featureFlagsGate` calls `next(error)` when `getSetting` rejects
- [ ] Add test: `featureFlagsGate` calls `next()` when `disabledModules` is empty array
- [ ] Add test: `getModuleCodeByPath` returns `null` for unknown routes

### P3: Runtime flag propagation via WebSocket

- [ ] Emit `feature_flags_updated` WebSocket event after saving feature flags in `admin/settings/service.js`
- [ ] Handle `feature_flags_updated` in `frontend/src/stores/user.js` — refresh `disabledModules`
- [ ] Handle `feature_flags_updated` in `admin-frontend/src/stores/auth.js` — refresh `disabledModules`

### P4: Remove hardcoded role modules from frontend

- [ ] Remove `HARD_CODED_ROLE_MODULES` constant from `admin-frontend/src/stores/auth.js`
- [ ] Extend backend login/refresh responses with `availableModules` for the user's role
- [ ] Update `hasModuleAccess` getter to rely solely on server-provided data
