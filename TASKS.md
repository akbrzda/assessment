# TASKS

> Updated: 26.05.2026
> Active backlog only

---

## Sprint 5 — Frontend Quality

### App.vue Refactor

- [ ] Move network status logic to `composables/useNetworkStatus.js`
- [ ] Move Telegram WebApp init to `composables/useTelegramInit.js`
- [ ] Move timezone sync to `composables/useTimezone.js`
- [ ] Remove direct initialization business logic from `App.vue`

### Service Worker

- [ ] Add Service Worker registration error handling in `frontend/src/main.js`

### UX

- [ ] Add close button for "No internet connection" banner in `App.vue`
- [ ] Fix client validation error handling: support string and array `[{ field, message }]`

---

## Sprint 6 — Testing

- [ ] Add unit tests for `notifications/service.js`
- [ ] Add integration test: course completion → certificate issuance
- [ ] Add bot payload validation test (`/start` with invalid payload)
- [ ] Add path traversal regression test for `extractFileNameFromUploadsUrl`
- [ ] Run `npm audit` for all modules and update vulnerable dependencies
