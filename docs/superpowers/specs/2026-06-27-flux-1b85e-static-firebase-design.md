# flux-1b85e — Static site + Firebase backend

**Date:** 2026-06-27
**Status:** Approved

## Goal

A simple static website (plain HTML + Tailwind, styled to match the shadcn
design system) with Firebase as the backend, deployed to Firebase Hosting on
the free Spark plan, deployed from the local machine.

## Decisions

- **Frontend:** Plain HTML, no build framework. Tailwind via the Play CDN for
  zero-build prototyping. shadcn/ui is React-only, so its *visual style* is
  replicated using shadcn's CSS design tokens ("New York" neutral/zinc theme) —
  not the actual React components.
- **Backend:** Firebase. Web SDK loaded via CDN and initialized client-side.
  Auth / Firestore are not wired up yet; the SDK is loaded and ready to add.
- **Hosting:** Firebase Hosting, Spark (free) plan. No SSR, no Cloud Functions.
- **Tooling:** `firebase-tools` as a project devDependency (not global, to avoid
  system permission issues). Deploy from local with `npm run deploy`.
- **Project ID:** `flux-1b85e` (set as default in `.firebaserc`).

## Structure

```
PR-1/
  public/
    index.html          # landing page (Tailwind + shadcn tokens, demo card/button)
    firebase-config.js   # Firebase web config (public values; fill from console)
  firebase.json          # hosting -> "public", cleanUrls
  .firebaserc            # default project: flux-1b85e
  package.json           # firebase-tools devDep + login/serve/deploy scripts
  .gitignore
```

## Deploy flow

1. `npm install` — installs local firebase-tools. (done)
2. `npm run login` / `firebase login` — interactive, run by the user.
3. Fill real values in `public/firebase-config.js` from the Firebase console.
4. `npm run deploy` — deploys `public/` to `flux-1b85e.web.app`.

## Trade-offs accepted

- Tailwind Play CDN is for prototyping; swap for a Tailwind CLI build before
  production.
- No shadcn React components — visual parity only.
- Static only: no server-side rendering or API routes (fine for Spark plan).

## Next steps (later)

- Add Firebase Authentication (client-side; works with static hosting).
- Add Firestore + security rules.
- Replace Play CDN with a Tailwind CLI build step.
