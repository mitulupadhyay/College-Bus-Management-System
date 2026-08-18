# BusFlow — College Transportation Management System

A presentation-ready **frontend prototype** of BusFlow: a digital transportation platform that
connects students, parents, drivers, conductors and college administrators on one live network.

Built with **HTML5 + Tailwind CSS (Tailwind CLI) + Vanilla JavaScript**.
No React, no Vue, no Bootstrap, no Tailwind CDN, no backend required.

The production system is planned to run on a **C++ (OOP + DSA)** engine — this repository is the
interface layer, with the backend simulated in JavaScript using centralised mock data.

---

## 1. Quick start

```bash
# 1 · install the Tailwind CLI (only dependency)
npm install

# 2 · build the stylesheet once
npm run build

#    …or rebuild automatically while editing
npm run dev

# 3 · serve the folder (any static server works)
npx serve .
#    or:  python3 -m http.server 8080
```

Then open <http://localhost:8080/index.html>.

> `dist/output.css` is already committed, so the prototype also works by simply opening
> `index.html` in a browser — no build step needed for the demo.

The exact Tailwind command required by the brief:

```bash
npx @tailwindcss/cli -i ./css/input.css -o ./dist/output.css --watch
```

---

## 2. Project structure

```
BusFlow/
├── index.html             # Landing page (hero network visual + 11 sections)
├── login.html             # Role gateway (mock authentication)
│
├── pages/
│   ├── admin.html         # Control center: 13 modules
│   ├── student.html       # Student app
│   ├── parent.html        # Parent app
│   ├── driver.html        # Driver console
│   └── conductor.html     # Conductor QR scanner
│
├── css/
│   └── input.css          # Design tokens + @apply component layer
├── dist/
│   └── output.css         # Tailwind CLI output (generated)
│
├── js/
│   ├── data.js            # Centralised mock data + reactive store  ← single source of truth
│   ├── app.js             # UI kit: icons, toasts, modals, drawer, shell, palette, simulation
│   ├── components.js      # Shared renderers (KPI, bus card, timeline, pass, charts, states)
│   ├── fleetmap.js        # SVG live transport-network visualisation
│   ├── qr.js              # Deterministic QR-style pass renderer
│   ├── landing.js         # Landing page behaviour
│   ├── login.js           # Role selection + session
│   ├── admin.js           # Admin console views
│   ├── student.js         # Student app views
│   ├── parent.js          # Parent app views
│   ├── driver.js          # Driver console views
│   └── conductor.js       # Conductor scanner views
│
├── assets/
│   └── favicon.svg
├── package.json
└── README.md
```

---

## 3. Design system

Everything reusable lives in `css/input.css`; one-off layout stays as Tailwind utilities in the HTML.

**Tokens** (`@theme`)

| Group | Token | Value |
|---|---|---|
| Background | `--color-void` | `#06070a` |
| Surface | `--color-panel` / `--color-panel-2` | `#0f1218` / `#141821` |
| Line | `--color-line` / `--color-line-2` | `#1c222c` / `#262e3a` |
| Text | `--color-hi` / `--color-mid` / `--color-mute` | `#f2f5f9` / `#a5aebd` / `#6f7a8b` |
| Accent | `--color-accent` / `--color-accent-2` | `#22d3ee` / `#3b82f6` |
| Status | `ok` / `warn` / `bad` / `violet` | `#34d399` / `#fbbf24` / `#fb7185` / `#a78bfa` |
| Type | `--font-sans` / `--font-mono` | Sora / JetBrains Mono |
| Motion | `--ease-premium` | `cubic-bezier(0.16, 1, 0.3, 1)` |

**Component classes built with `@apply`**

`btn` · `btn-primary` · `btn-secondary` · `btn-ghost` · `btn-danger` · `btn-icon` · `card` ·
`card-pad` · `card-hover` · `stat-card` · `stat-value` · `stat-label` · `status-badge`
(+ `status-running/-delayed/-arrived/-idle/-alert/-pending`) · `chip` · `live-dot` ·
`input-field` · `field-label` · `switch` · `sidebar-item` · `nav-item` · `tab` ·
`table-container` · `modal` (+ head/body/foot) · `drawer` · `toast` · `timeline` / `tl-node` ·
`skeleton` · `empty-state` · `section-title` · `kicker` · `mono-label`

Utilities: `bg-grid`, `bg-dots`, `mask-fade-b`, `text-gradient`, `glow-accent`, `stagger`.

---

## 4. How the prototype stays connected

`js/data.js` holds one store (`BusFlow.state`) with buses, routes, stops, students, drivers,
conductors, attendance, notifications, leave requests and complaints. Actions mutate that store,
persist to `localStorage` and emit events; every screen subscribes.

So a single QR scan on the conductor screen results in:

```
conductor scans pass
   ↓ BusFlow.actions.markAttendance()
attendance record created  →  student.boarded = true
   ↓
bus occupancy +1           →  driver console + control center update
   ↓
notification queued        →  parent app + toast + notification drawer
   ↓
admin KPI (attendance %)   →  dashboard counters refresh
```

A small simulation engine (`BusFlow.ui.sim`) advances bus positions, recalculates ETA and emits
occasional delay/arrival events every 2.6 s. Pause it from the admin footer or Settings.

---

## 5. Presentation flow (demo script)

Click the ✨ button in any dashboard topbar for this list with jump links.

1. **`login.html`** — choose a role (session is shared across pages).
2. **Student → Home** — BUS-07, live ETA, next stop.
3. **Student → Live Tracking** — bus moving along Route A, stop-by-stop.
4. **Student → Bus Pass** — the QR pass the conductor scans.
5. **Conductor → Scan** — pick *Mitul Upadhyay*, scan, **Mark attendance**.
6. **Parent → Overview / Journey** — boarding alert + timeline turn green.
7. **Driver → Trip** — occupancy rose; broadcast *Delayed* or *Arrived*.
8. **Admin → Dashboard / Attendance** — the same event in the KPIs and records.

Reset before presenting: **Admin → Settings → Reset attendance** (or the *Reset demo* link in the
landing page footer).

Handy shortcuts: `Ctrl/⌘ + K` instant lookup · `Esc` closes modals/drawers.

---

## 6. Feature map

| Area | Where |
|---|---|
| Landing hero network visual | `index.html` + `js/fleetmap.js` |
| Live fleet control center | Admin → Live Tracking |
| Fleet CRUD (view / edit / assign / delete + Add bus modal) | Admin → Fleet |
| Route timeline (completed / current / upcoming) | Admin → Routes, all apps |
| Instant student lookup (hash-map story) | Admin → Students, `Ctrl K` palette |
| Sorted attendance + reports | Admin → Attendance / Reports |
| Approvals & complaints | Admin → Leave Requests / Complaints |
| QR attendance workflow | Conductor → Scan |
| Digital bus pass | Student → Bus Pass, landing §Digital pass |
| Journey timeline & alerts | Parent → Overview / Journey |
| Trip controls & status broadcast | Driver → Trip |
| Emergency SOS | Student → SOS, Driver → Emergency |
| Loading / empty / error states | Skeletons on first paint, empty states in every list |

---

## 7. Accessibility & motion

* Semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`), skip links, labelled controls.
* Full keyboard support: focus-visible rings, focus trap in modals, `Esc` to close, arrow keys in
  the command palette, `Enter`/`Space` on custom switches and the SOS button.
* `aria-current`, `aria-selected`, `aria-expanded`, `role="dialog"`, `aria-live` toasts.
* `prefers-reduced-motion: reduce` disables animation (map interpolation, counters, transitions)
  while keeping every feature working.

---

## 8. DSA hooks for the C++ backend

The UI already exposes the surfaces the algorithms will power:

| Structure | Surface in the UI |
|---|---|
| Graph + Dijkstra | Route optimiser → "Shortest route calculated · 4.2 ms" |
| Hash map | Instant student/bus lookup (`Ctrl K`, Students search) |
| Queue | Notification event stream / drawer |
| Sorting | Attendance & report sorting (time / name / bus, punctuality) |
| Binary search | Sorted attendance record retrieval |
| Stack / BFS / DFS | Trip history and stop-network traversal |
| Vector / Array | Fleet, roster and manifest collections |

Replacing the mock layer means swapping `js/data.js` for a thin fetch/WebSocket adapter that
returns the same shapes — no UI changes required.

---

## 9. Notes

* Mock data only. No real authentication, GPS, database or payments — by design.
* Fonts load from Google Fonts; offline they fall back to the system sans/mono stack.
* Tested in current Chrome/Edge/Firefox/Safari. Layouts: mobile (bottom nav), tablet
  (collapsible sidebar), desktop (full control center).

© 2026 BusFlow · student project prototype · Graphic Era Hills University, Bhimtal.
