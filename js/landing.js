/* ============================================================
   BusFlow · js/landing.js
   Behaviour for the marketing / presentation landing page.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const C = BF.components;
  const $ = ui.$, $$ = ui.$$;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    brandMarks();
    navBehaviour();
    heroVisual();
    fleetPreview();
    roleGrid();
    scannerDemo();
    trackingSection();
    routesSection();
    passSection();
    parentFeed();
    controlCenterMock();
    footerActions();

    ui.hydrateIcons(document.body);
    ui.hydrateCounters(document.body);
    ui.observeReveal(document.body);

    ui.sim.start(2600);
    BF.on("sim:tick", scheduleRefresh);
    BF.on("state:change", scheduleRefresh);
  }

  /* ---------------- brand marks ---------------- */
  function brandMarks() {
    ["navLogo", "footLogo"].forEach(function (id) {
      const n = document.getElementById(id);
      if (n) n.innerHTML = ui.logoMark("h-8 w-8");
    });
    const mini = document.getElementById("miniLogo");
    if (mini) mini.innerHTML = ui.logoMark("h-6 w-6");
  }

  /* ---------------- nav ---------------- */
  function navBehaviour() {
    const nav = document.getElementById("siteNav");
    const onScroll = function () {
      const solid = global.scrollY > 12;
      nav.classList.toggle("border-line", solid);
      nav.classList.toggle("bg-ink/80", solid);
      nav.classList.toggle("backdrop-blur-xl", solid);
    };
    onScroll();
    global.addEventListener("scroll", onScroll, { passive: true });

    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("mobileMenu");
    toggle.addEventListener("click", function () {
      const open = menu.hidden === false && !menu.classList.contains("hidden");
      menu.classList.toggle("hidden", open);
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.innerHTML = ui.icon(open ? "menu" : "close", "h-4.5 w-4.5");
    });
    $$("#mobileMenu a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.add("hidden");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = ui.icon("menu", "h-4.5 w-4.5");
      });
    });
  }

  /* ---------------- hero network visual ---------------- */
  let heroMap = null;
  let heroBusId = "BUS-07";

  function heroVisual() {
    const host = document.getElementById("heroMap");
    if (!host) return;
    heroMap = BF.FleetMap.create(host, {
      labels: true,
      interactive: true,
      onSelect: function (bus) {
        heroBusId = bus.id;
        paintHeroReadout();
      }
    });
    heroMap.focus(heroBusId);
    paintHeroReadout();
    paintHeroStats();
  }

  function paintHeroReadout() {
    const bus = BF.get.bus(heroBusId);
    if (!bus) return;
    const route = BF.get.route(bus.routeId);
    const next = ui.nextStop(bus);
    const nameEl = document.getElementById("heroRouteName");
    const metaEl = document.getElementById("heroRouteMeta");
    if (nameEl) nameEl.textContent = route.short + " · " + bus.id;
    if (!metaEl) return;
    metaEl.innerHTML =
      row("ETA", bus.status === "arrived" ? "ARRIVED" : bus.etaMin + " min", bus.status === "delayed" ? "text-warn" : "text-accent") +
      row("Next", next ? next.name : "—", "text-mid") +
      row("Seats", bus.occupancy + "/" + bus.capacity, "text-mid") +
      row("Status", bus.status.toUpperCase(), bus.status === "delayed" ? "text-warn" : bus.status === "arrived" ? "text-accent" : "text-ok");
  }

  function row(label, value, tone) {
    return '<div class="flex items-center justify-between gap-3">' +
      '<span class="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">' + ui.esc(label) + "</span>" +
      '<span class="truncate font-mono text-[11px] ' + tone + '">' + ui.esc(value) + "</span></div>";
  }

  function paintHeroStats() {
    const host = document.getElementById("heroStats");
    if (!host) return;
    const live = BF.state.buses.filter(function (b) { return b.status === "running" || b.status === "delayed"; });
    const avg = live.length
      ? Math.round(live.reduce(function (a, b) { return a + (b.etaMin || 0); }, 0) / live.length)
      : 0;
    host.innerHTML = [
      cell("Buses live", live.length, "text-ok"),
      cell("Avg ETA", avg + "m", "text-hi"),
      cell("Occupancy", BF.get.fleetOccupancy() + "%", "text-accent")
    ].join("");
  }

  function cell(label, value, tone) {
    return '<div class="bg-panel px-4 py-3">' +
      '<p class="mono-label">' + ui.esc(label) + "</p>" +
      '<p class="mt-1 font-mono text-base tabular-nums ' + tone + '">' + ui.esc(value) + "</p></div>";
  }

  /* ---------------- live fleet preview ---------------- */
  const PREVIEW_IDS = ["BUS-07", "BUS-04", "BUS-12", "BUS-01"];

  function fleetPreview() {
    const host = document.getElementById("fleetPreview");
    if (!host) return;
    /* brief skeleton so the loading state is part of the design language */
    host.innerHTML = C.skeletonCards(4);
    setTimeout(function () {
      paintFleetPreview();
      ui.observeReveal(host);
    }, 420);

    const toggle = document.getElementById("simToggle");
    toggle.addEventListener("click", function () {
      const running = ui.sim.toggle();
      toggle.setAttribute("aria-pressed", String(running));
      $("span", toggle).textContent = running ? "Pause simulation" : "Resume simulation";
      ui.toast({ title: running ? "Live simulation resumed" : "Live simulation paused", type: running ? "success" : "info" });
    });
  }

  function paintFleetPreview() {
    const host = document.getElementById("fleetPreview");
    if (!host) return;
    host.innerHTML = PREVIEW_IDS.map(function (id) {
      const bus = BF.get.bus(id);
      return bus ? C.busCard(bus) : "";
    }).join("");
    ui.hydrateIcons(host);
    $$("[data-bus-card]", host).forEach(function (card) {
      card.addEventListener("click", function () {
        heroBusId = card.getAttribute("data-bus-card");
        if (heroMap) heroMap.focus(heroBusId);
        paintHeroReadout();
        document.getElementById("heroMap").scrollIntoView({ behavior: ui.reducedMotion() ? "auto" : "smooth", block: "center" });
      });
    });
  }

  /* ---------------- five roles ---------------- */
  const ROLE_CARDS = [
    { key: "admin", icon: "cpu", title: "Admin", tagline: "Full system control.", points: ["Fleet, routes & staff", "Live control center", "Reports & approvals"] },
    { key: "student", icon: "graduation", title: "Student", tagline: "Track bus, ETA, digital pass, leave and SOS.", points: ["Live bus & ETA", "Digital pass wallet", "Leave, complaints, SOS"] },
    { key: "parent", icon: "users", title: "Parent", tagline: "Track child, boarding and arrival notifications.", points: ["Journey timeline", "Boarding alerts", "Driver contact"] },
    { key: "driver", icon: "steering", title: "Driver", tagline: "Manage trips, routes and bus status.", points: ["Start / end trip", "Status broadcast", "Emergency button"] },
    { key: "conductor", icon: "scan", title: "Conductor", tagline: "Scan QR passes and manage attendance.", points: ["QR pass scanner", "Boarding manifest", "Manual override"] }
  ];

  function roleGrid() {
    const host = document.getElementById("roleGrid");
    if (!host) return;
    host.innerHTML = ROLE_CARDS.map(function (r, i) {
      const meta = BF.roles[r.key];
      return '<a class="card card-hover group relative overflow-hidden p-6" href="' + meta.page + '" data-reveal data-reveal-delay="' + (i * 70) + '">' +
        '<span class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" style="background:' + meta.accent + '30"></span>' +
        '<div class="relative flex items-start justify-between gap-4">' +
        '<span class="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[0.03]" style="color:' + meta.accent + '">' +
        ui.icon(r.icon, "h-5 w-5") + "</span>" +
        '<span class="mono-label">0' + (i + 1) + "</span></div>" +
        '<h3 class="relative mt-5 text-lg font-semibold tracking-[-0.02em]">' + ui.esc(r.title) + "</h3>" +
        '<p class="relative mt-1.5 text-sm leading-relaxed text-mute">' + ui.esc(r.tagline) + "</p>" +
        '<ul class="relative mt-5 space-y-2">' + r.points.map(function (p) {
          return '<li class="flex items-center gap-2.5 text-xs text-mid"><span class="h-1 w-1 rounded-full" style="background:' + meta.accent + '"></span>' + ui.esc(p) + "</li>";
        }).join("") + "</ul>" +
        '<span class="relative mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-mute transition-colors duration-200 group-hover:text-hi">' +
        "Open dashboard" + ui.icon("arrowRight", "h-3 w-3") + "</span></a>";
    }).join("") +
      '<div class="card card-pad flex flex-col justify-between bg-gradient-to-br from-accent/[0.08] to-transparent" data-reveal data-reveal-delay="350">' +
      '<div><p class="kicker"><span class="dot"></span>Presentation mode</p>' +
      '<h3 class="mt-4 text-lg font-semibold tracking-[-0.02em]">Walk the full journey</h3>' +
      '<p class="mt-2 text-sm leading-relaxed text-mute">Login → student → tracking → pass → conductor scan → attendance → parent alert → admin view. Every step shares one state.</p></div>' +
      '<a class="btn-primary mt-6" href="login.html">Start the demo' + ui.icon("arrowRight", "h-4 w-4") + "</a></div>";
    ui.hydrateIcons(host);
  }

  /* ---------------- QR scanner demo ---------------- */
  function scannerDemo() {
    const host = document.getElementById("scanDemo");
    if (!host) return;
    const student = BF.get.demoStudent();

    function idle() {
      host.innerHTML =
        '<div class="relative mx-auto grid aspect-square w-full max-w-[280px] place-items-center overflow-hidden rounded-2xl border border-line bg-ink">' +
        '<div class="absolute inset-0 bg-dots opacity-30"></div>' +
        corners() +
        '<div class="relative text-center">' +
        '<span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line bg-panel-2 text-accent">' +
        ui.icon("qr", "h-6 w-6") + "</span>" +
        '<p class="mt-4 text-sm font-medium text-hi">Ready to scan</p>' +
        '<p class="mt-1 text-xs text-mute">Hold the pass inside the frame</p></div></div>' +
        '<button class="btn-primary btn-block mt-5" data-scan>' +
        '<i data-icon="scan" data-icon-class="h-4 w-4"></i>Simulate scan</button>';
      ui.hydrateIcons(host);
      $("[data-scan]", host).addEventListener("click", scanning);
    }

    function corners() {
      return '<div class="pointer-events-none absolute inset-6">' +
        ['left-0 top-0 border-l-2 border-t-2 rounded-tl-lg', 'right-0 top-0 border-r-2 border-t-2 rounded-tr-lg',
         'left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg', 'right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg']
          .map(function (c) { return '<span class="absolute h-8 w-8 border-accent/70 ' + c + '"></span>'; }).join("") +
        "</div>";
    }

    function scanning() {
      host.innerHTML =
        '<div class="relative mx-auto grid aspect-square w-full max-w-[280px] place-items-center overflow-hidden rounded-2xl border border-accent/40 bg-ink">' +
        corners() +
        '<div class="relative h-32 w-32 opacity-90">' + BF.QR.svg(BF.QR.payload(student), { color: "#22d3ee" }) + "</div>" +
        '<div class="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-accent shadow-[0_0_18px_2px_rgba(34,211,238,.8)]" style="animation: scanline 1.4s var(--ease-out-soft) infinite"></div>' +
        "</div>" +
        '<div class="mt-5 space-y-2"><div class="skeleton h-3 w-32"></div><div class="skeleton h-3 w-48"></div></div>';
      setTimeout(verified, ui.reducedMotion() ? 200 : 1400);
    }

    function verified() {
      host.innerHTML =
        '<div class="rounded-2xl border border-ok/30 bg-ok/[0.06] p-5" style="animation: scale-in .35s var(--ease-premium) both">' +
        '<div class="flex items-center gap-3">' +
        '<span class="grid h-10 w-10 place-items-center rounded-full border border-ok/40 bg-ok/15 text-ok">' +
        ui.icon("check", "h-5 w-5", 2.4) + "</span>" +
        '<div><p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ok">Student verified</p>' +
        '<p class="text-base font-semibold">' + ui.esc(student.name) + "</p></div></div>" +
        '<dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5">' +
        field("Student ID", student.id) + field("Bus", student.busId) +
        field("Boarding stop", student.stop) + field("Time", ui.clockNow()) +
        "</dl></div>" +
        '<div class="mt-4 flex gap-2">' +
        '<button class="btn-secondary flex-1" data-cancel>Cancel</button>' +
        '<button class="btn-primary flex-1" data-mark>Mark attendance</button></div>';
      ui.hydrateIcons(host);
      $("[data-cancel]", host).addEventListener("click", idle);
      $("[data-mark]", host).addEventListener("click", function () {
        const res = BF.actions.markAttendance(student.id, { stop: student.stop });
        if (res && res.duplicate) {
          ui.toast({ title: "Already boarded today", msg: student.name + " was scanned earlier this trip.", type: "warning" });
        } else {
          ui.toast({ title: "Attendance marked", msg: student.name + " · " + student.busId + " · " + ui.clockNow(), type: "success" });
        }
        paintParentFeed();
        paintFleetPreview();
        done();
      });
    }

    function field(label, value) {
      return '<div><dt class="mono-label">' + ui.esc(label) + "</dt>" +
        '<dd class="mt-1 font-mono text-sm text-hi">' + ui.esc(value) + "</dd></div>";
    }

    function done() {
      const bus = BF.get.bus(student.busId);
      host.innerHTML =
        '<div class="rounded-2xl border border-line bg-panel-2/60 p-5 text-center">' +
        '<p class="mono-label">Boarding recorded</p>' +
        '<p class="mt-3 font-mono text-3xl tabular-nums text-hi">' + bus.occupancy + '<span class="text-mute">/' + bus.capacity + "</span></p>" +
        '<p class="mt-2 text-xs text-mute">Occupancy updated on driver console, control center and the parent app.</p>' +
        '<button class="btn-secondary btn-sm mt-5" data-again>Scan another pass</button></div>';
      $("[data-again]", host).addEventListener("click", idle);
    }

    idle();
  }

  /* ---------------- live tracking ---------------- */
  let trackMap = null;

  function trackingSection() {
    const host = document.getElementById("trackMap");
    if (!host) return;
    trackMap = BF.FleetMap.create(host, {
      routeIds: ["RT-A"],
      busIds: ["BUS-07", "BUS-03"],
      labels: true,
      interactive: false,
      focus: "BUS-07"
    });
    paintTrackTimeline();
  }

  function paintTrackTimeline() {
    const host = document.getElementById("trackTimeline");
    if (!host) return;
    const bus = BF.get.bus("BUS-07");
    host.innerHTML = C.routeTimeline(BF.get.route("RT-A"), bus, { showDistance: true });
    ui.hydrateIcons(host);
  }

  /* ---------------- smart routes ---------------- */
  let activeRoute = "RT-A";

  function routesSection() {
    const tabs = document.getElementById("routeTabs");
    if (!tabs) return;
    tabs.innerHTML = BF.state.routes.map(function (r) {
      return '<button class="tab" role="tab" data-route-tab="' + r.id + '" aria-selected="' + (r.id === activeRoute) + '">' +
        ui.esc(r.id) + "</button>";
    }).join("");
    $$("[data-route-tab]", tabs).forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeRoute = btn.getAttribute("data-route-tab");
        $$("[data-route-tab]", tabs).forEach(function (b) {
          b.setAttribute("aria-selected", String(b === btn));
        });
        paintRoutePreview();
      });
    });
    paintRoutePreview();

    document.getElementById("optimiseBtn").addEventListener("click", function () {
      const route = BF.get.route(activeRoute);
      const host = document.getElementById("routePreview");
      host.innerHTML = '<div class="space-y-3">' + C.skeletonRows(4, 2) + "</div>";
      setTimeout(function () {
        paintRoutePreview(true);
        ui.toast({
          title: "Shortest route calculated",
          msg: route.id + " · " + route.distanceKm + " km · Dijkstra over " + route.stops.length + " nodes (4.2 ms)",
          type: "success",
          icon: "zap"
        });
      }, ui.reducedMotion() ? 120 : 900);
    });
  }

  function paintRoutePreview(optimised) {
    const host = document.getElementById("routePreview");
    if (!host) return;
    const route = BF.get.route(activeRoute);
    const bus = BF.get.bus(route.busId);
    host.innerHTML =
      '<div class="flex flex-wrap items-center gap-2">' +
      '<span class="chip"><span class="dot" style="color:' + route.color + '"></span>' + ui.esc(route.name) + "</span>" +
      '<span class="chip font-mono text-[11px]">' + route.distanceKm + " km</span>" +
      '<span class="chip font-mono text-[11px]">' + route.etaMin + " min</span>" +
      (optimised ? '<span class="status-badge status-running"><span class="dot"></span>Optimised</span>' : "") +
      "</div>" +
      '<div class="mt-5">' + C.routeTimeline(route, bus) + "</div>";
    ui.hydrateIcons(host);
  }

  /* ---------------- digital pass ---------------- */
  function passSection() {
    const host = document.getElementById("passPreview");
    if (!host) return;
    const student = BF.get.demoStudent();
    host.innerHTML = C.passCard(student);
    ui.hydrateIcons(host);
    const dl = $("[data-pass-download]", host);
    if (dl) dl.addEventListener("click", function () {
      ui.toast({ title: "Pass downloaded", msg: student.id + " · saved to device wallet (simulated)", type: "success", icon: "download" });
    });
    const show = $("[data-pass-share]", host);
    if (show) show.addEventListener("click", function () {
      ui.modal({
        title: "Digital bus pass",
        kicker: "Present at boarding",
        size: "sm",
        body: '<div class="grid place-items-center gap-4 py-2">' +
          '<div class="grid h-56 w-56 place-items-center rounded-2xl bg-white p-4">' +
          BF.QR.svg(BF.QR.payload(student), { cells: 25 }) + "</div>" +
          '<p class="font-mono text-xs text-mute">' + ui.esc(BF.QR.payload(student)) + "</p></div>",
        footer: '<button class="btn-secondary" data-close>Close</button>'
      });
    });
  }

  /* ---------------- parent notification feed ---------------- */
  function parentFeed() { paintParentFeed(); }

  function paintParentFeed() {
    const host = document.getElementById("parentFeed");
    if (!host) return;
    const items = BF.get.notificationsFor("parent").slice(0, 4);
    if (!items.length) {
      host.innerHTML = C.empty({ icon: "bell", title: "No alerts yet", message: "Boarding and arrival updates will appear here." });
      ui.hydrateIcons(host);
      return;
    }
    host.innerHTML = items.map(function (n, i) {
      const tone = ui.noteTone(n.type);
      return '<div class="flex items-start gap-3 rounded-xl border border-line bg-panel-2/60 p-3" style="animation: fade-up .5s var(--ease-premium) both; animation-delay:' + (i * 70) + 'ms">' +
        '<span class="toast-icon ' + tone.cls + '">' + ui.icon(tone.icon, "h-4 w-4") + "</span>" +
        '<div class="min-w-0 flex-1"><p class="truncate text-xs font-medium text-hi">' + ui.esc(n.title) + "</p>" +
        '<p class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-mute">' + ui.esc(n.body) + "</p></div>" +
        '<span class="font-mono text-[9px] uppercase tracking-[0.1em] text-faint">' + ui.esc(n.time.split(" ")[0]) + "</span></div>";
    }).join("");
  }

  /* ---------------- admin control-center mock ---------------- */
  function controlCenterMock() {
    const nav = document.getElementById("miniNav");
    if (nav) {
      nav.innerHTML = [
        ["grid", "Dashboard", true], ["bus", "Fleet", false], ["route", "Routes", false],
        ["radar", "Live tracking", false], ["users", "Students", false], ["report", "Reports", false]
      ].map(function (item) {
        return '<span class="sidebar-item text-xs' + (item[2] ? " bg-accent/[0.09] text-hi" : "") + '">' +
          ui.icon(item[0], "h-4 w-4") + item[1] + "</span>";
      }).join("");
    }

    const kpis = document.getElementById("miniKpis");
    if (kpis) {
      const m = BF.state.metrics;
      kpis.innerHTML = [
        ["Active buses", m.activeBuses, "text-hi"],
        ["Students", m.totalStudents.toLocaleString("en-IN"), "text-hi"],
        ["Attendance", m.attendanceRate + "%", "text-ok"],
        ["Alerts", "0" + m.alerts, "text-warn"]
      ].map(function (k) {
        return '<div class="rounded-lg border border-line bg-panel/50 px-3.5 py-3">' +
          '<p class="mono-label">' + k[0] + "</p>" +
          '<p class="mt-1.5 font-mono text-lg tabular-nums ' + k[2] + '">' + k[1] + "</p></div>";
      }).join("");
    }

    const map = document.getElementById("miniMap");
    if (map) BF.FleetMap.create(map, { labels: false, interactive: false, showEta: false });
    ui.hydrateIcons(document.getElementById("control"));
  }

  /* ---------------- footer ---------------- */
  function footerActions() {
    const reset = document.getElementById("resetDemo");
    if (reset) reset.addEventListener("click", function () {
      BF.actions.resetAttendanceDemo();
      ui.toast({ title: "Demo data reset", msg: "Attendance, occupancy and boarding states restored.", type: "info" });
      paintFleetPreview();
      paintParentFeed();
    });
  }

  /* ---------------- refresh loop ---------------- */
  let queued = false;
  function scheduleRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      paintHeroReadout();
      paintHeroStats();
      paintFleetPreview();
      paintTrackTimeline();
      paintParentFeed();
    });
  }
})(window);
