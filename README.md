# CampusTransit — College Bus Management System (Frontend)

A production-styled frontend prototype for a college bus management system.
HTML5 + Tailwind CSS v4 (CLI, not CDN) + vanilla JavaScript. No frameworks.

---

## 1. Folder structure

```text
college-bus-management/
│
├── index.html                  # Login / role-selection page
│
├── pages/
│   ├── admin-dashboard.html
│   ├── student-dashboard.html
│   ├── parent-dashboard.html
│   ├── driver-dashboard.html
│   └── conductor-dashboard.html
│
├── css/
│   └── input.css               # Tailwind v4 source (@theme tokens + @utility/@apply components)
│
├── js/
│   ├── mock-data.js             # Centralized mock data (buses, students, routes, etc.)
│   ├── layout.js                # Builds the responsive sidebar/topbar shell per page
│   ├── app.js                   # Shared utilities: modals, toasts, notifications, search, sidebar
│   ├── auth.js                  # Login page: role selection + mock authentication
│   ├── admin.js                 # Admin dashboard routing + rendering
│   ├── student.js               # Student dashboard routing + rendering
│   ├── parent.js                # Parent dashboard routing + rendering
│   ├── driver.js                # Driver dashboard routing + rendering
│   └── conductor.js             # Conductor dashboard routing + rendering (QR scan simulation)
│
├── assets/
│   ├── images/
│   └── icons/
│
├── dist/
│   └── output.css              # Compiled Tailwind CSS (generated — don't edit directly)
│
├── package.json
└── README.md
```

---

## 2. Tailwind CLI commands

Install dependencies (already done if you received this project with `node_modules`; otherwise):

```bash
npm install
```

Build CSS once (minified, production):

```bash
npm run build
```

Watch mode while developing (rebuilds `dist/output.css` on save):

```bash
npm run watch
```

Both scripts wrap the underlying Tailwind CLI command:

```bash
npx tailwindcss -i ./css/input.css -o ./dist/output.css --minify
```

---

## 3. Running the project locally

No build server is required to view pages — everything reads from static
files and `dist/output.css`.

1. Run `npm install` once to get Tailwind CLI.
2. Run `npm run build` (or `npm run watch` while editing styles).
3. Open `index.html` directly in a browser, **or** serve the folder so
   relative paths behave identically to a real deployment:

   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```

4. From the login page, pick a role and sign in with any password
   (mock authentication) — you'll be redirected to that role's dashboard:

   | Role       | Email                |
   |------------|-----------------------|
   | Admin      | admin@college.edu     |
   | Student    | student@college.edu   |
   | Parent     | parent@college.edu    |
   | Driver     | driver@college.edu    |
   | Conductor  | conductor@college.edu |

---

## 4. Architecture notes

- **No frameworks.** Every dashboard is a single HTML file containing
  `<template>` blocks for each in-page "section" (e.g. Admin has
  Dashboard/Fleet/Routes/Attendance/Leaves/Complaints). A tiny hash-based
  router (`#fleet`, `#routes`, ...) swaps the active template into
  `#mainContent` and re-renders it from `window.__BUS_DB__`, avoiding a
  full page reload per section while staying framework-free.

- **Shared shell.** `layout.js` generates the sidebar, topbar (search,
  notifications, profile menu) and mobile drawer once per page via
  `renderShell()`, so every dashboard shares identical responsive
  behavior. `app.js` then wires up interactivity (sidebar toggle,
  dropdowns, toast/modal systems, global search, live-tracking ticker).
  Script load order matters: `mock-data.js → layout.js → app.js →
  <role>.js` — the role script calls `renderShell()` first, then the
  shared init functions, so elements exist before listeners attach.

- **Centralized mock data.** `mock-data.js` defines one `DB` object
  (buses, students, drivers, conductors, routes, leave requests,
  complaints, notifications) attached to `window.__BUS_DB__`, mutated
  in place by page interactions (e.g. approving a leave request,
  marking QR attendance) so state stays consistent within a session.

- **Responsive strategy.** Sidebar is a fixed off-canvas drawer under
  `lg` (hamburger button + overlay + slide-in) and a static in-flow
  column at `lg` and above (with a collapse-to-icons toggle). Tables
  scroll horizontally on narrow viewports instead of breaking layout.
  KPI/grid layouts step from 2 → 3 → 6 columns across breakpoints.

- **Design system.** `css/input.css` defines design tokens via
  Tailwind v4's `@theme` (colors, fonts, shadows) and reusable
  component classes via `@utility` (composable base classes like
  `.btn`, `.card`, `.badge`, `.input`, `.sidebar-link`) plus `@layer
  components` for variants built with `@apply` on top of them.

- **Ready for a backend.** Every write action (add bus, approve leave,
  mark attendance, send SOS, report emergency) currently mutates the
  in-memory mock DB and shows a toast — these are the exact seams
  where a C++/DSA or REST backend would plug in later (replace the
  mutation + toast with a `fetch()` call and re-render on response).

---

## 5. Known scope notes

This is the frontend deliverable only. A few backend-dependent
affordances (edit bus, delete bus, GPS-based live map, reports export)
are intentionally stubbed with a toast or "Module coming soon" empty
state rather than faked with more mock data, to keep it obvious what
still needs a real API.
