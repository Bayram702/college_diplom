# Application Documents Gosuslugi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add applicant document uploads, mock Gosuslugi profile autofill, and a personal data consent gate.

**Architecture:** Server changes stay in focused routes and a small Gosuslugi service. The client keeps the feature in `ApplicantDashboard.vue` because the existing dashboard is already a single-view cabinet.

**Tech Stack:** Express, multer, Vue 3, axios, node:test.

---

### Task 1: Server Tests

**Files:**
- Modify: `server/tests/functional.test.js`

- [x] Add a failing test for `getGosuslugiProfile()` env-backed mock data.
- [x] Add a failing test for allowed application document types.
- [x] Run `npm.cmd test` in `server`; expected failure is missing `../services/gosuslugi`.

### Task 2: Server Implementation

**Files:**
- Create: `server/services/gosuslugi.js`
- Create: `server/routes/gosuslugi.js`
- Modify: `server/middleware/upload.js`
- Modify: `server/routes/upload.js`
- Modify: `server/index.js`

- [ ] Implement mock profile service with env overrides and no external network call by default.
- [ ] Register `GET /api/gosuslugi/profile` for applicants.
- [ ] Add `POST /api/upload/application-document` with document type validation.
- [ ] Keep existing college image upload behavior intact.

### Task 3: Client Implementation

**Files:**
- Modify: `client/src/views/ApplicantDashboard.vue`

- [ ] Add consent modal/banner state.
- [ ] Block document upload and Gosuslugi autofill until consent is accepted.
- [ ] Add 4 document upload controls: passport, certificate, snils, consent.
- [ ] Add Gosuslugi autofill button and populate profile fields from response.

### Task 4: Verification

**Files:**
- No new source files.

- [ ] Run `npm.cmd test` in `server`.
- [ ] Run `npm.cmd run build` in `client`.
