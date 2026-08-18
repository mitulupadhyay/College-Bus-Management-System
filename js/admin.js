/* ============================================================
   BusFlow · js/admin.js
   Administrator console — fleet operations, live control center,
   people, attendance, approvals and reports.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const C = BF.components;
  const $ = ui.$, $$ = ui.$$, esc = ui.esc;

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "fleet", label: "Fleet", icon: "bus" },
    { id: "routes", label: "Routes", icon: "route" },
    { id: "live", label: "Live Tracking", icon: "radar" },
    { id: "students", label: "Students", icon: "graduation" },
    { id: "drivers", label: "Drivers", icon: "steering" },
    { id: "conductors", label: "Conductors", icon: "id" },
    { id: "attendance", label: "Attendance", icon: "userCheck" },
    { id: "leave", label: "Leave Requests", icon: "calendar", badge: "17" },
    { id: "complaints", label: "Complaints", icon: "message" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    { id: "reports", label: "Reports", icon: "report" },
    { id: "settings", label: "Settings", icon: "settings" }
  ];

  const TITLES = {
    dashboard: ["Dashboard", "Transport operations overview"],
    fleet: ["Fleet", "Bus inventory and assignments"],
    routes: ["Routes", "Corridors, stops and schedules"],
    live: ["Live Fleet Control Center", "Real-time network telemetry"],
    students: ["Students", "Registered transport users"],
    drivers: ["Drivers", "Duty roster and assignments"],
    conductors: ["Conductors", "Scanning staff and shifts"],
    attendance: ["Attendance", "Boarding records for today"],
    leave: ["Leave Requests", "Approvals queue"],
    complaints: ["Complaints", "Service issues raised"],
    notifications: ["Notifications", "System event log"],
    reports: ["Reports", "Performance and utilisation"],
    settings: ["Settings", "System configuration"]
  };

  let current = "dashboard";
  let liveMap = null;
  let selectedBus = "BUS-07";

  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    if (!BF.session.get()) BF.session.set("admin");
    ui.mountShell({
      role: "admin",
      title: TITLES.dashboard[0],
      subtitle: TITLES.dashboard[1],
      items: NAV,
      onNavigate: render
    });

    render("dashboard");
    ui.sim.start(2600);

    const simBtn = $("[data-sim-toggle]");
    if (simBtn) simBtn.addEventListener("click", function () {
      const running = ui.sim.toggle();
      simBtn.textContent = running ? "Pause simulation" : "Resume simulation";
      ui.toast({ title: running ? "Simulation resumed" : "Simulation paused", type: "info" });
    });

    BF.on("sim:tick", softRefresh);
    BF.on("state:change", function (p) {
      if (p && p.reason === "sim") return;
      softRefresh();
      updateNavBadges();
    });
  });

  function updateNavBadges() {
    const pending = BF.state.leaveRequests.filter(function (l) { return l.status === "pending"; }).length;
    const node = $('[data-nav-badge="leave"]');
    if (node) node.textContent = String(BF.state.metrics.pendingLeaves || pending);
  }

  /* Refresh only the live parts of the current screen (no full re-render). */
  let queued = false;
  function softRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      if (current === "dashboard") { paintKpis(); paintBusRail("dashBusRail"); paintActivity(); }
      else if (current === "live") { paintBusRail("liveBusRail"); paintTelemetry(); }
      else if (current === "fleet") paintFleetTable();
      else if (current === "attendance") paintAttendanceTable();
    });
  }

  /* ------------------------------------------------------------
     ROUTER
     ------------------------------------------------------------ */
  function render(view) {
    current = view;
    const meta = TITLES[view] || TITLES.dashboard;
    ui.setPageTitle(meta[0], meta[1]);
    const host = $("#view");
    const painter = ({
      dashboard: viewDashboard,
      fleet: viewFleet,
      routes: viewRoutes,
      live: viewLive,
      students: viewStudents,
      drivers: viewDrivers,
      conductors: viewConductors,
      attendance: viewAttendance,
      leave: viewLeave,
      complaints: viewComplaints,
      notifications: viewNotifications,
      reports: viewReports,
      settings: viewSettings
    })[view] || viewDashboard;

    if (liveMap) { liveMap.destroy(); liveMap = null; }
    painter(host);
    ui.hydrateIcons(host);
    ui.hydrateCounters(host);
    ui.observeReveal(host);
    updateNavBadges();
  }

  /* ------------------------------------------------------------
     SHARED PIECES
     ------------------------------------------------------------ */
  function pageHead(title, sub, actions) {
    return '<div class="mb-6 flex flex-wrap items-end justify-between gap-4">' +
      '<div><h1 class="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">' + esc(title) + "</h1>" +
      '<p class="section-sub">' + esc(sub) + "</p></div>" +
      (actions ? '<div class="flex flex-wrap items-center gap-2">' + actions + "</div>" : "") + "</div>";
  }

  function table(columns, rowsHtml, opts) {
    const o = opts || {};
    return '<div class="table-container' + (o.class ? " " + o.class : "") + '"><table>' +
      "<thead><tr>" + columns.map(function (c) {
        return "<th" + (c.align === "right" ? ' class="text-right"' : "") + ">" + esc(c.label) + "</th>";
      }).join("") + "</tr></thead>" +
      "<tbody>" + rowsHtml + "</tbody></table></div>";
  }

  function busRow(bus) {
    const route = BF.get.route(bus.routeId);
    const driver = BF.get.driverOf(bus.id);
    const cond = BF.get.conductorOf(bus.id);
    return "<tr data-row-bus=\"" + bus.id + "\">" +
      '<td><div class="flex items-center gap-2.5"><span class="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/[0.03]" style="color:' + route.color + '">' +
      ui.icon("bus", "h-4 w-4") + '</span><span class="cell-mono">' + esc(bus.id) + "</span></div></td>" +
      '<td class="cell-mono text-mid">' + esc(bus.reg) + "</td>" +
      "<td>" + esc(route.short) + "</td>" +
      "<td>" + esc(driver ? driver.name : "—") + "</td>" +
      "<td>" + esc(cond ? cond.name : "—") + "</td>" +
      '<td class="cell-mono">' + bus.capacity + "</td>" +
      "<td>" + ui.occupancyBar(bus.occupancy, bus.capacity) + "</td>" +
      "<td>" + ui.badge(bus.status) + "</td>" +
      '<td class="text-right"><div class="inline-flex items-center gap-1">' +
      iconBtn("eye", "View " + bus.id, 'data-act="view" data-bus="' + bus.id + '"') +
      iconBtn("edit", "Edit " + bus.id, 'data-act="edit" data-bus="' + bus.id + '"') +
      iconBtn("route", "Assign " + bus.id, 'data-act="assign" data-bus="' + bus.id + '"') +
      iconBtn("trash", "Delete " + bus.id, 'data-act="delete" data-bus="' + bus.id + '"', "hover:text-bad") +
      "</div></td></tr>";
  }

  function iconBtn(icon, label, attrs, extra) {
    return '<button class="btn-icon h-8 w-8 ' + (extra || "") + '" title="' + esc(label) + '" aria-label="' + esc(label) + '" ' + attrs + ">" +
      ui.icon(icon, "h-3.5 w-3.5") + "</button>";
  }

  /* ------------------------------------------------------------
     VIEW · DASHBOARD
     ------------------------------------------------------------ */
  function viewDashboard(host) {
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const session = BF.session.get() || {};

    host.innerHTML =
      pageHead(greet + ", " + (session.name || "Admin").split(" ").slice(-1)[0],
        new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · morning shift in progress",
        '<button class="btn-secondary btn-sm" data-export><i data-icon="download" data-icon-class="h-3.5 w-3.5"></i>Export</button>' +
        '<button class="btn-primary btn-sm" data-add-bus><i data-icon="plus" data-icon-class="h-3.5 w-3.5"></i>Add bus</button>') +

      '<div id="kpiGrid" class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6"></div>' +

      '<div class="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">' +
        '<section class="card overflow-hidden" data-reveal>' +
          '<div class="panel-head">' +
            '<div class="flex items-center gap-2.5"><span class="live-dot"></span>' +
            '<div><h2 class="text-sm font-semibold">Live fleet control</h2>' +
            '<p class="mono-label mt-0.5">Bhimtal grid · 5 corridors</p></div></div>' +
            '<button class="btn-secondary btn-sm" data-goto="live">Open control center' +
            '<i data-icon="arrowUpRight" data-icon-class="h-3.5 w-3.5"></i></button>' +
          "</div>" +
          '<div id="dashMap" class="aspect-[16/9] w-full"></div>' +
        "</section>" +

        '<div class="flex flex-col gap-4">' +
          '<section class="card" data-reveal data-reveal-delay="60">' +
            '<div class="panel-head"><h2 class="text-sm font-semibold">Fleet status</h2>' +
            '<span class="mono-label" data-clock>07:42 AM</span></div>' +
            '<div id="dashBusRail" class="max-h-[300px] overflow-y-auto"></div>' +
          "</section>" +
          '<section class="card" data-reveal data-reveal-delay="120">' +
            '<div class="panel-head"><h2 class="text-sm font-semibold">Quick actions</h2></div>' +
            '<div class="grid grid-cols-2 gap-2 p-4">' +
              quickAction("plus", "Add bus", "add-bus") +
              quickAction("route", "New route", "add-route") +
              quickAction("calendar", "Approvals", "goto-leave") +
              quickAction("report", "Reports", "goto-reports") +
            "</div>" +
          "</section>" +
        "</div>" +
      "</div>" +

      '<div class="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">' +
        '<section class="card card-pad" data-reveal>' +
          '<div class="flex items-start justify-between"><div>' +
          '<h2 class="text-sm font-semibold">Weekly attendance</h2>' +
          '<p class="mono-label mt-1">Present vs enrolled</p></div>' +
          '<span class="status-badge status-running"><span class="dot"></span>+2.4%</span></div>' +
          '<div class="mt-6">' + C.barChart(BF.state.weekly) + "</div>" +
        "</section>" +
        '<section class="card card-pad" data-reveal data-reveal-delay="60">' +
          '<h2 class="text-sm font-semibold">Fleet utilisation</h2>' +
          '<p class="mono-label mt-1">Seats filled across active buses</p>' +
          '<div class="mt-5 flex items-center justify-around">' +
          C.donut(BF.get.fleetOccupancy(), "Occupancy") +
          C.donut(Math.round(BF.state.metrics.onTimeRate), "On time", "#34d399") +
          "</div>" +
        "</section>" +
        '<section class="card" data-reveal data-reveal-delay="120">' +
          '<div class="panel-head"><h2 class="text-sm font-semibold">Activity</h2>' +
          '<button class="btn-ghost btn-sm" data-goto="notifications">All</button></div>' +
          '<div id="dashActivity" class="max-h-[280px] space-y-2.5 overflow-y-auto p-4"></div>' +
        "</section>" +
      "</div>";

    paintKpis();
    paintBusRail("dashBusRail");
    paintActivity();

    liveMap = BF.FleetMap.create($("#dashMap"), {
      labels: true,
      onSelect: function (bus) { selectedBus = bus.id; ui.toast({ title: bus.id + " selected", msg: "ETA " + bus.etaMin + " min · " + bus.occupancy + "/" + bus.capacity + " onboard", type: "info", icon: "bus" }); }
    });

    $$("[data-goto]", host).forEach(function (b) {
      b.addEventListener("click", function () { ui.navigate(b.getAttribute("data-goto"), { onNavigate: render }); });
    });
    $$("[data-add-bus], [data-qa='add-bus']", host).forEach(function (b) { b.addEventListener("click", addBusModal); });
    const qaRoute = $("[data-qa='add-route']", host);
    if (qaRoute) qaRoute.addEventListener("click", addRouteModal);
    const qaLeave = $("[data-qa='goto-leave']", host);
    if (qaLeave) qaLeave.addEventListener("click", function () { ui.navigate("leave", { onNavigate: render }); });
    const qaRep = $("[data-qa='goto-reports']", host);
    if (qaRep) qaRep.addEventListener("click", function () { ui.navigate("reports", { onNavigate: render }); });
    const exp = $("[data-export]", host);
    if (exp) exp.addEventListener("click", exportReport);
  }

  function quickAction(icon, label, action) {
    return '<button class="flex flex-col items-start gap-3 rounded-xl border border-line bg-panel-2/50 p-3.5 text-left transition-all duration-200 hover:border-line-2 hover:bg-panel-3" data-qa="' + action + '">' +
      '<span class="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/[0.03] text-accent">' + ui.icon(icon, "h-4 w-4") + "</span>" +
      '<span class="text-xs font-medium text-hi">' + esc(label) + "</span></button>";
  }

  function paintKpis() {
    const host = $("#kpiGrid");
    if (!host) return;
    const m = BF.state.metrics;
    const running = BF.state.buses.filter(function (b) { return b.status === "running"; }).length;
    const html = [
      C.kpi({ label: "Active buses", value: m.activeBuses, pad: 2, icon: "bus", hint: running + " running now", hintIcon: "activity", hintTone: "text-ok" }),
      C.kpi({ label: "Students", value: m.totalStudents, icon: "graduation", hint: "1,246 passes active", hintIcon: "id" }),
      C.kpi({ label: "Today's attendance", value: m.attendanceRate, decimals: 1, suffix: "%", icon: "userCheck", tone: "text-ok", hint: BF.state.attendance.length + " scans today", hintIcon: "qr", hintTone: "text-ok" }),
      C.kpi({ label: "Active routes", value: m.activeRoutes, icon: "route", hint: "5 corridors mapped", hintIcon: "layers" }),
      C.kpi({ label: "Alerts", value: m.alerts, pad: 2, icon: "alert", tone: "text-warn", hint: "1 delay · 2 service", hintIcon: "info", hintTone: "text-warn" }),
      C.kpi({ label: "Pending leaves", value: m.pendingLeaves, icon: "calendar", tone: "text-violet", hint: "Awaiting approval", hintIcon: "clock" })
    ].join("");
    if (host.dataset.filled !== "1") {
      host.innerHTML = html;
      host.dataset.filled = "1";
      ui.hydrateIcons(host);
      ui.hydrateCounters(host);
      ui.observeReveal(host);
    } else {
      /* live values only — avoids re-running entrance animations */
      const values = $$(".stat-value", host);
      const nums = [m.activeBuses, m.totalStudents, m.attendanceRate, m.activeRoutes, m.alerts, m.pendingLeaves];
      values.forEach(function (n, i) {
        const dec = i === 2 ? 1 : 0;
        const txt = i === 2 ? nums[i].toFixed(1) + "%" : i === 1 ? nums[i].toLocaleString("en-IN") : (i === 0 || i === 4 ? String(nums[i]).padStart(2, "0") : String(nums[i]));
        if (n.textContent !== txt) n.textContent = txt;
        void dec;
      });
    }
  }

  function paintBusRail(id) {
    const host = document.getElementById(id);
    if (!host) return;
    const buses = BF.state.buses;
    host.innerHTML = buses.map(function (bus) {
      const route = BF.get.route(bus.routeId);
      const next = ui.nextStop(bus);
      const isSel = bus.id === selectedBus;
      return '<button class="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.03]' +
        (isSel ? " bg-accent/[0.06]" : "") + '" data-rail-bus="' + bus.id + '">' +
        '<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03]" style="color:' + route.color + '">' +
        ui.icon("bus", "h-4 w-4") + "</span>" +
        '<span class="min-w-0 flex-1">' +
        '<span class="flex items-center justify-between gap-2">' +
        '<span class="font-mono text-xs font-medium text-hi">' + esc(bus.id) + "</span>" +
        ui.badge(bus.status) + "</span>" +
        '<span class="mt-1 flex items-center justify-between gap-2">' +
        '<span class="truncate text-[11px] text-mute">' + esc(next ? next.name : route.short) + "</span>" +
        '<span class="font-mono text-[11px] ' + (bus.status === "delayed" ? "text-warn" : "text-mid") + '">' +
        (bus.status === "arrived" ? "—" : (bus.etaMin != null ? bus.etaMin + " min" : "—")) + "</span></span>" +
        '<span class="mt-2 block">' + ui.occupancyBar(bus.occupancy, bus.capacity) + "</span>" +
        "</span></button>";
    }).join("");
    ui.hydrateIcons(host);
    $$("[data-rail-bus]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        selectedBus = b.getAttribute("data-rail-bus");
        if (liveMap) liveMap.focus(selectedBus);
        paintBusRail(id);
        paintTelemetry();
      });
    });
  }

  function paintActivity() {
    const host = $("#dashActivity");
    if (!host) return;
    const items = BF.get.notificationsFor("admin").slice(0, 6);
    host.innerHTML = items.length
      ? items.map(C.notificationRow).join("")
      : C.empty({ icon: "bell", title: "No activity yet", message: "System events will stream in here." });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     VIEW · LIVE FLEET CONTROL CENTER
     ------------------------------------------------------------ */
  function viewLive(host) {
    host.innerHTML =
      pageHead("Live Fleet Control Center", "Real-time positions, ETA and occupancy across the network",
        '<span class="chip"><span class="live-dot"></span>Streaming</span>' +
        '<button class="btn-secondary btn-sm" data-recenter><i data-icon="radar" data-icon-class="h-3.5 w-3.5"></i>Show all</button>') +

      '<div class="grid items-start gap-4 xl:grid-cols-[1fr_20rem]">' +
        '<section class="card overflow-hidden" data-reveal>' +
          '<div class="panel-head">' +
            '<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filter buses">' +
              filterChip("all", "All", true) + filterChip("running", "Running") +
              filterChip("delayed", "Delayed") + filterChip("arrived", "Arrived") +
            "</div>" +
            '<div class="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">' +
            '<span>Refresh 2.6s</span><span class="h-1 w-1 rounded-full bg-line-2"></span><span data-clock>07:42 AM</span></div>' +
          "</div>" +
          '<div class="relative">' +
            '<div id="liveMap" class="h-[clamp(360px,54vh,620px)] w-full"></div>' +
            '<div class="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-2">' +
              legendChip("#34d399", "Running") + legendChip("#fbbf24", "Delayed") +
              legendChip("#22d3ee", "Arrived") + legendChip("#6f7a8b", "Stop") +
            "</div>" +
          "</div>" +
          '<div id="liveTelemetry" class="border-t border-line"></div>' +
        "</section>" +

        '<aside class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
          '<div class="panel-head"><h2 class="text-sm font-semibold">Fleet rail</h2>' +
          '<span class="mono-label">' + BF.state.buses.length + " units</span></div>" +
          '<div id="liveBusRail" class="max-h-[540px] overflow-y-auto"></div>' +
        "</aside>" +
      "</div>";

    liveMap = BF.FleetMap.create($("#liveMap"), {
      labels: true,
      onSelect: function (bus) { selectedBus = bus.id; paintBusRail("liveBusRail"); paintTelemetry(); }
    });
    liveMap.focus(selectedBus);
    paintBusRail("liveBusRail");
    paintTelemetry();

    $$("[data-filter]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-filter]", host).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        const f = b.getAttribute("data-filter");
        const match = BF.state.buses.filter(function (x) { return f === "all" || x.status === f; });
        if (!match.length) {
          ui.toast({ title: "No buses " + f, msg: "Try another filter.", type: "warning" });
          return;
        }
        selectedBus = match[0].id;
        liveMap.focus(f === "all" ? null : selectedBus);
        paintBusRail("liveBusRail");
        paintTelemetry();
      });
    });
    $("[data-recenter]", host).addEventListener("click", function () {
      liveMap.focus(null);
      ui.toast({ title: "Showing all corridors", type: "info", icon: "radar" });
    });
  }

  function filterChip(id, label, on) {
    return '<button class="tab" role="tab" data-filter="' + id + '" aria-selected="' + (!!on) + '">' + esc(label) + "</button>";
  }

  function legendChip(color, label) {
    return '<span class="flex items-center gap-1.5 rounded-md border border-line bg-ink/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mid backdrop-blur">' +
      '<span class="h-1.5 w-1.5 rounded-full" style="background:' + color + '"></span>' + esc(label) + "</span>";
  }

  function paintTelemetry() {
    const host = $("#liveTelemetry");
    if (!host) return;
    const bus = BF.get.bus(selectedBus) || BF.state.buses[0];
    const route = BF.get.route(bus.routeId);
    const driver = BF.get.driverOf(bus.id);
    const next = ui.nextStop(bus);
    host.innerHTML =
      '<div class="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">' +
      tile("Bus", bus.id, route.short) +
      tile("ETA", bus.status === "arrived" ? "Arrived" : bus.etaMin + " min", "Next · " + (next ? next.name : "—"), bus.status === "delayed" ? "text-warn" : "text-accent") +
      tile("Occupancy", bus.occupancy + "/" + bus.capacity, Math.round((bus.occupancy / bus.capacity) * 100) + "% full") +
      tile("Speed", bus.speed + " km/h", "Fuel " + bus.fuel + "% · " + (driver ? driver.name : "—")) +
      "</div>" +
      '<div class="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1.2fr]">' +
      '<div><p class="mono-label">Corridor</p>' +
      '<p class="mt-1.5 text-sm font-medium">' + esc(route.name) + "</p>" +
      '<p class="mt-1 text-xs text-mute">' + route.distanceKm + " km · " + route.stops.length + " stops · scheduled " + route.etaMin + " min</p>" +
      '<div class="mt-4 flex flex-wrap gap-2">' +
      '<button class="btn-secondary btn-sm" data-tel="call"><i data-icon="phone" data-icon-class="h-3.5 w-3.5"></i>Call driver</button>' +
      '<button class="btn-secondary btn-sm" data-tel="msg"><i data-icon="message" data-icon-class="h-3.5 w-3.5"></i>Message</button>' +
      '<button class="btn-danger btn-sm" data-tel="sos"><i data-icon="siren" data-icon-class="h-3.5 w-3.5"></i>Raise alert</button>' +
      "</div></div>" +
      '<div class="max-h-56 overflow-y-auto pr-1">' + C.routeTimeline(route, bus) + "</div>" +
      "</div>";
    ui.hydrateIcons(host);
    $$("[data-tel]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        const kind = b.getAttribute("data-tel");
        if (kind === "sos") {
          ui.confirm({
            title: "Raise emergency alert?",
            message: "This notifies the driver, conductor, transport desk and every parent on " + bus.id + ".",
            confirmLabel: "Raise alert",
            danger: true,
            onConfirm: function () {
              BF.actions.raiseSOS({ from: "Control center", busId: bus.id, location: next ? next.name : route.short });
              ui.toast({ title: "Emergency alert broadcast", msg: bus.id + " · transport desk notified", type: "danger" });
            }
          });
        } else if (kind === "call") {
          ui.toast({ title: "Calling " + (driver ? driver.name : "driver"), msg: driver ? driver.phone : "", type: "info", icon: "phone" });
        } else {
          ui.toast({ title: "Message sent to " + bus.id, msg: "Crew console will display it on arrival.", type: "success", icon: "message" });
        }
      });
    });
  }

  function tile(label, value, hint, tone) {
    return '<div class="bg-panel px-4 py-3.5">' +
      '<p class="mono-label">' + esc(label) + "</p>" +
      '<p class="mt-1.5 font-mono text-xl tabular-nums ' + (tone || "text-hi") + '">' + esc(value) + "</p>" +
      '<p class="mt-1 truncate text-[11px] text-mute">' + esc(hint) + "</p></div>";
  }

  /* ------------------------------------------------------------
     VIEW · FLEET
     ------------------------------------------------------------ */
  let fleetQuery = "", fleetStatus = "all";

  function viewFleet(host) {
    host.innerHTML =
      pageHead("Fleet", "Buses, assignments and live occupancy",
        '<button class="btn-secondary btn-sm" data-export><i data-icon="download" data-icon-class="h-3.5 w-3.5"></i>Export CSV</button>' +
        '<button class="btn-primary btn-sm" data-add-bus><i data-icon="plus" data-icon-class="h-3.5 w-3.5"></i>Add bus</button>') +
      '<div class="card overflow-hidden" data-reveal>' +
        '<div class="panel-head">' +
          '<div class="relative w-full max-w-xs">' +
            '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"><i data-icon="search" data-icon-class="h-4 w-4"></i></span>' +
            '<input class="input-field pl-9" id="fleetSearch" type="search" placeholder="Search bus, registration, driver…" aria-label="Search fleet" />' +
          "</div>" +
          '<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">' +
            fleetChip("all", "All") + fleetChip("running", "Running") + fleetChip("delayed", "Delayed") +
            fleetChip("arrived", "Arrived") + fleetChip("maintenance", "Maintenance") +
          "</div>" +
        "</div>" +
        '<div id="fleetTable"></div>' +
      "</div>";

    paintFleetTable();
    const search = $("#fleetSearch", host);
    search.addEventListener("input", function () { fleetQuery = search.value.trim().toLowerCase(); paintFleetTable(); });
    $$("[data-fleet-chip]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        fleetStatus = b.getAttribute("data-fleet-chip");
        $$("[data-fleet-chip]", host).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        paintFleetTable();
      });
    });
    $("[data-add-bus]", host).addEventListener("click", addBusModal);
    $("[data-export]", host).addEventListener("click", exportReport);
  }

  function fleetChip(id, label) {
    return '<button class="tab" data-fleet-chip="' + id + '" aria-selected="' + (fleetStatus === id) + '">' + esc(label) + "</button>";
  }

  function paintFleetTable() {
    const host = $("#fleetTable");
    if (!host) return;
    const rows = BF.state.buses.filter(function (b) {
      const driver = BF.get.driverOf(b.id);
      const hay = (b.id + " " + b.reg + " " + (driver ? driver.name : "") + " " + b.routeId).toLowerCase();
      return (fleetStatus === "all" || b.status === fleetStatus) && hay.indexOf(fleetQuery) > -1;
    });

    host.innerHTML = rows.length
      ? table([
          { label: "Bus ID" }, { label: "Registration" }, { label: "Route" }, { label: "Driver" },
          { label: "Conductor" }, { label: "Capacity" }, { label: "Occupancy" }, { label: "Status" },
          { label: "Actions", align: "right" }
        ], rows.map(busRow).join(""), { class: "rounded-none border-0" })
      : '<div class="p-6">' + C.empty({
          icon: "bus",
          title: "No buses match this view",
          message: fleetQuery ? 'Nothing found for "' + fleetQuery + '". Try a bus ID like BUS-07.' : "No buses currently have this status.",
          action: "Clear filters"
        }) + "</div>";

    ui.hydrateIcons(host);
    const clear = $("[data-empty-action]", host);
    if (clear) clear.addEventListener("click", function () {
      fleetQuery = ""; fleetStatus = "all";
      const s = $("#fleetSearch"); if (s) s.value = "";
      $$("[data-fleet-chip]").forEach(function (x) { x.setAttribute("aria-selected", String(x.getAttribute("data-fleet-chip") === "all")); });
      paintFleetTable();
    });

    $$("[data-act]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        const bus = BF.get.bus(btn.getAttribute("data-bus"));
        const act = btn.getAttribute("data-act");
        if (act === "view") viewBusModal(bus);
        if (act === "edit") editBusModal(bus);
        if (act === "assign") assignBusModal(bus);
        if (act === "delete") deleteBusModal(bus);
      });
    });
  }

  /* ---------- fleet modals ---------- */
  function addBusModal() {
    const routeOpts = BF.state.routes.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("");
    const driverOpts = BF.state.drivers.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + "</option>"; }).join("");
    const condOpts = BF.state.conductors.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("");
    const nextId = "BUS-" + String(BF.state.buses.length + 1).padStart(2, "0");

    ui.modal({
      kicker: "Fleet",
      title: "Add bus",
      subtitle: "Register a vehicle and assign it to a corridor.",
      body:
        '<form class="grid gap-4 sm:grid-cols-2" id="addBusForm" novalidate>' +
        field("Bus ID", '<input class="input-field font-mono" name="id" value="' + nextId + '" data-autofocus required />') +
        field("Registration", '<input class="input-field font-mono" name="reg" placeholder="UK 04 PA 0000" required />') +
        field("Route", '<select class="input-field" name="routeId">' + routeOpts + "</select>") +
        field("Capacity", '<input class="input-field font-mono" name="capacity" type="number" min="10" max="80" value="45" />') +
        field("Driver", '<select class="input-field" name="driverId">' + driverOpts + "</select>") +
        field("Conductor", '<select class="input-field" name="conductorId">' + condOpts + "</select>") +
        '<div class="sm:col-span-2">' + fieldInner("Model", '<input class="input-field" name="model" value="Tata Starbus 2024" />') + "</div>" +
        "</form>",
      footer: '<button class="btn-secondary" data-close>Cancel</button>' +
        '<button class="btn-primary" data-save><i data-icon="plus" data-icon-class="h-4 w-4"></i>Add to fleet</button>',
      onMount: function (dialog) {
        $("[data-save]", dialog).addEventListener("click", function () {
          const form = $("#addBusForm", dialog);
          const data = Object.fromEntries(new FormData(form).entries());
          if (!data.reg) {
            ui.toast({ title: "Registration required", msg: "Enter the vehicle registration number.", type: "warning" });
            return;
          }
          data.capacity = parseInt(data.capacity, 10) || 45;
          BF.actions.addBus(data);
          ui.closeModal();
          paintFleetTable();
          paintKpis();
          ui.toast({ title: data.id + " added to fleet", msg: data.reg + " · " + (BF.get.route(data.routeId) || {}).short, type: "success", icon: "bus" });
        });
      }
    });
  }

  function viewBusModal(bus) {
    const route = BF.get.route(bus.routeId);
    const driver = BF.get.driverOf(bus.id);
    const cond = BF.get.conductorOf(bus.id);
    const onboard = BF.get.studentsOnBus(bus.id);
    ui.modal({
      kicker: route.short,
      title: bus.id,
      subtitle: bus.reg + " · " + bus.model,
      size: "lg",
      body:
        '<div class="grid gap-4 sm:grid-cols-2">' +
          '<div class="rounded-xl border border-line bg-panel-2/40 p-4">' +
          '<p class="mono-label">Status</p><div class="mt-2">' + ui.badge(bus.status) + "</div>" +
          '<dl class="mt-4 space-y-2.5 text-sm">' +
          kv("ETA", bus.status === "arrived" ? "Arrived" : bus.etaMin + " min") +
          kv("Speed", bus.speed + " km/h") + kv("Fuel", bus.fuel + "%") +
          kv("Occupancy", bus.occupancy + "/" + bus.capacity) +
          "</dl></div>" +
          '<div class="rounded-xl border border-line bg-panel-2/40 p-4">' +
          '<p class="mono-label">Crew</p>' +
          '<dl class="mt-3 space-y-2.5 text-sm">' +
          kv("Driver", driver ? driver.name : "—") + kv("Contact", driver ? driver.phone : "—") +
          kv("Conductor", cond ? cond.name : "—") + kv("Route", route.name) +
          "</dl></div>" +
        "</div>" +
        '<div class="mt-4 rounded-xl border border-line bg-panel-2/40 p-4">' +
        '<p class="mono-label">Registered students · ' + onboard.length + "</p>" +
        '<div class="mt-3 flex flex-wrap gap-2">' +
        (onboard.length ? onboard.map(function (s) {
          return '<span class="chip">' + esc(s.name) + '<span class="font-mono text-[10px] ' + (s.boarded ? "text-ok" : "text-faint") + '">' + (s.boarded ? "boarded" : "pending") + "</span></span>";
        }).join("") : '<p class="text-xs text-mute">No students assigned yet.</p>') +
        "</div></div>" +
        '<div class="mt-4">' + C.routeTimeline(route, bus) + "</div>",
      footer: '<button class="btn-secondary" data-close>Close</button>'
    });
  }

  function editBusModal(bus) {
    ui.modal({
      kicker: "Fleet",
      title: "Edit " + bus.id,
      body:
        '<form class="grid gap-4 sm:grid-cols-2" id="editBusForm" novalidate>' +
        field("Registration", '<input class="input-field font-mono" name="reg" value="' + esc(bus.reg) + '" data-autofocus />') +
        field("Capacity", '<input class="input-field font-mono" name="capacity" type="number" value="' + bus.capacity + '" />') +
        field("Model", '<input class="input-field" name="model" value="' + esc(bus.model) + '" />') +
        field("Status", '<select class="input-field" name="status">' +
          ["running", "delayed", "arrived", "idle", "maintenance"].map(function (s) {
            return '<option value="' + s + '"' + (bus.status === s ? " selected" : "") + ">" + s + "</option>";
          }).join("") + "</select>") +
        "</form>",
      footer: '<button class="btn-secondary" data-close>Cancel</button><button class="btn-primary" data-save>Save changes</button>',
      onMount: function (dialog) {
        $("[data-save]", dialog).addEventListener("click", function () {
          const data = Object.fromEntries(new FormData($("#editBusForm", dialog)).entries());
          bus.reg = data.reg;
          bus.capacity = parseInt(data.capacity, 10) || bus.capacity;
          bus.model = data.model;
          BF.actions.setBusStatus(bus.id, data.status);
          ui.closeModal();
          paintFleetTable();
          ui.toast({ title: bus.id + " updated", msg: "Changes published to the fleet.", type: "success" });
        });
      }
    });
  }

  function assignBusModal(bus) {
    ui.modal({
      kicker: "Assignment",
      title: "Assign " + bus.id,
      subtitle: "Attach a corridor and crew to this vehicle.",
      body:
        '<form class="grid gap-4" id="assignForm" novalidate>' +
        field("Route", '<select class="input-field" name="routeId" data-autofocus>' +
          BF.state.routes.map(function (r) {
            return '<option value="' + r.id + '"' + (bus.routeId === r.id ? " selected" : "") + ">" + esc(r.name) + "</option>";
          }).join("") + "</select>") +
        field("Driver", '<select class="input-field" name="driverId">' +
          BF.state.drivers.map(function (d) {
            return '<option value="' + d.id + '"' + (bus.driverId === d.id ? " selected" : "") + ">" + esc(d.name) + " · " + d.exp + "y</option>";
          }).join("") + "</select>") +
        field("Conductor", '<select class="input-field" name="conductorId">' +
          BF.state.conductors.map(function (c) {
            return '<option value="' + c.id + '"' + (bus.conductorId === c.id ? " selected" : "") + ">" + esc(c.name) + " · " + c.shift + "</option>";
          }).join("") + "</select>") +
        "</form>" +
        '<p class="mt-4 flex items-start gap-2 rounded-lg border border-line bg-panel-2/50 p-3 text-xs text-mute">' +
        '<i data-icon="info" data-icon-class="h-4 w-4 shrink-0 text-accent"></i>' +
        "Reassignment recalculates ETAs for every student mapped to this corridor.</p>",
      footer: '<button class="btn-secondary" data-close>Cancel</button><button class="btn-primary" data-save>Assign</button>',
      onMount: function (dialog) {
        $("[data-save]", dialog).addEventListener("click", function () {
          const data = Object.fromEntries(new FormData($("#assignForm", dialog)).entries());
          bus.routeId = data.routeId;
          bus.driverId = data.driverId;
          bus.conductorId = data.conductorId;
          const d = BF.get.driver(data.driverId); if (d) d.busId = bus.id;
          const c = BF.get.conductor(data.conductorId); if (c) c.busId = bus.id;
          BF.emit("state:change", { reason: "assign" });
          ui.closeModal();
          paintFleetTable();
          ui.toast({ title: bus.id + " reassigned", msg: (BF.get.route(data.routeId) || {}).name, type: "success", icon: "route" });
        });
      }
    });
  }

  function deleteBusModal(bus) {
    ui.confirm({
      title: "Remove " + bus.id + "?",
      message: "The vehicle will be withdrawn from service and unassigned from " + (BF.get.route(bus.routeId) || {}).short + ". Students on this bus need reassignment.",
      confirmLabel: "Remove bus",
      danger: true,
      onConfirm: function () {
        BF.actions.removeBus(bus.id);
        paintFleetTable();
        paintKpis();
        ui.toast({ title: bus.id + " removed from fleet", type: "warning", icon: "trash" });
      }
    });
  }

  function field(label, control) {
    return "<div>" + fieldInner(label, control) + "</div>";
  }
  function fieldInner(label, control) {
    return '<label class="field-label">' + esc(label) + "</label>" + control;
  }
  function kv(k, v) {
    return '<div class="flex items-center justify-between gap-3"><dt class="text-mute">' + esc(k) + "</dt>" +
      '<dd class="font-mono text-xs text-hi">' + esc(v) + "</dd></div>";
  }

  /* ------------------------------------------------------------
     VIEW · ROUTES
     ------------------------------------------------------------ */
  let activeRoute = "RT-A";

  function viewRoutes(host) {
    host.innerHTML =
      pageHead("Routes", "Corridors, stop sequences and assigned vehicles",
        '<button class="btn-secondary btn-sm" data-optimise><i data-icon="zap" data-icon-class="h-3.5 w-3.5"></i>Optimise all</button>' +
        '<button class="btn-primary btn-sm" data-add-route><i data-icon="plus" data-icon-class="h-3.5 w-3.5"></i>New route</button>') +
      '<div class="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">' +
        '<section class="card overflow-hidden" data-reveal>' +
          '<div class="panel-head"><h2 class="text-sm font-semibold">All routes</h2>' +
          '<span class="mono-label">' + BF.state.routes.length + " corridors</span></div>" +
          '<div id="routeTable"></div>' +
        "</section>" +
        '<aside class="card" data-reveal data-reveal-delay="60" id="routeDetail"></aside>' +
      "</div>";

    paintRouteTable();
    paintRouteDetail();
    $("[data-add-route]", host).addEventListener("click", addRouteModal);
    $("[data-optimise]", host).addEventListener("click", function () {
      ui.toast({ title: "Network optimised", msg: "Dijkstra recomputed 38 edges in 4.2 ms · 2 corridors improved.", type: "success", icon: "zap" });
    });
  }

  function paintRouteTable() {
    const host = $("#routeTable");
    if (!host) return;
    host.innerHTML = table(
      [{ label: "Route ID" }, { label: "Name" }, { label: "Stops" }, { label: "Distance" }, { label: "ETA" }, { label: "Bus" }, { label: "Status" }],
      BF.state.routes.map(function (r) {
        return '<tr class="cursor-pointer' + (r.id === activeRoute ? " bg-accent/[0.05]" : "") + '" data-route-row="' + r.id + '" tabindex="0">' +
          '<td><span class="cell-mono" style="color:' + r.color + '">' + esc(r.id) + "</span></td>" +
          '<td class="cell-strong">' + esc(r.short) + '<span class="ml-2 text-xs text-mute">' + esc(r.name.split("·")[1] || "") + "</span></td>" +
          '<td class="cell-mono">' + r.stops.length + "</td>" +
          '<td class="cell-mono">' + r.distanceKm + " km</td>" +
          '<td class="cell-mono">' + r.etaMin + " min</td>" +
          '<td class="cell-mono">' + esc(r.busId) + "</td>" +
          "<td>" + ui.badge(r.status === "active" ? "running" : "idle", r.status) + "</td></tr>";
      }).join(""),
      { class: "rounded-none border-0" }
    );
    $$("[data-route-row]", host).forEach(function (tr) {
      const pick = function () {
        activeRoute = tr.getAttribute("data-route-row");
        paintRouteTable();
        paintRouteDetail();
      };
      tr.addEventListener("click", pick);
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") pick(); });
    });
  }

  function paintRouteDetail() {
    const host = $("#routeDetail");
    if (!host) return;
    const route = BF.get.route(activeRoute);
    const bus = BF.get.bus(route.busId);
    host.innerHTML =
      '<div class="panel-head"><div>' +
      '<h2 class="text-sm font-semibold">' + esc(route.short) + "</h2>" +
      '<p class="mono-label mt-1">' + esc(route.id) + " · " + route.distanceKm + " km</p></div>" +
      ui.badge(route.status === "active" ? "running" : "idle", route.status) + "</div>" +
      '<div class="grid grid-cols-3 gap-px border-b border-line bg-line">' +
      tile("Stops", String(route.stops.length), "sequence") +
      tile("ETA", route.etaMin + "m", "scheduled") +
      tile("Bus", route.busId, bus ? bus.status : "unassigned") +
      "</div>" +
      '<div class="p-5">' + C.routeTimeline(route, bus, { showDistance: true }) + "</div>" +
      '<div class="flex flex-wrap gap-2 border-t border-line p-4">' +
      '<button class="btn-secondary btn-sm" data-route-act="optimise"><i data-icon="zap" data-icon-class="h-3.5 w-3.5"></i>Shortest path</button>' +
      '<button class="btn-secondary btn-sm" data-route-act="edit"><i data-icon="edit" data-icon-class="h-3.5 w-3.5"></i>Edit stops</button>' +
      "</div>";
    ui.hydrateIcons(host);
    $$("[data-route-act]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-route-act") === "optimise") {
          ui.toast({ title: "Shortest route calculated", msg: route.id + " · " + route.distanceKm + " km · " + route.stops.length + " nodes · 4.2 ms", type: "success", icon: "zap" });
        } else {
          ui.toast({ title: "Stop editor", msg: "Drag-and-drop stop sequencing ships with the backend integration.", type: "info" });
        }
      });
    });
  }

  function addRouteModal() {
    ui.modal({
      kicker: "Network",
      title: "New route",
      subtitle: "Define a corridor and its stop sequence.",
      body:
        '<form class="grid gap-4 sm:grid-cols-2" id="routeForm" novalidate>' +
        field("Route ID", '<input class="input-field font-mono" name="id" value="RT-' + String.fromCharCode(65 + BF.state.routes.length) + '" data-autofocus />') +
        field("Route name", '<input class="input-field" name="name" placeholder="Route F · Ramnagar Line" />') +
        field("Distance (km)", '<input class="input-field font-mono" name="distanceKm" type="number" value="20" />') +
        field("Scheduled ETA (min)", '<input class="input-field font-mono" name="etaMin" type="number" value="45" />') +
        '<div class="sm:col-span-2">' + fieldInner("Stops (comma separated)", '<textarea class="input-field" name="stops" rows="3">Stop 1, Stop 2, Stop 3, College Campus</textarea>') + "</div>" +
        "</form>",
      footer: '<button class="btn-secondary" data-close>Cancel</button><button class="btn-primary" data-save>Create route</button>',
      onMount: function (dialog) {
        $("[data-save]", dialog).addEventListener("click", function () {
          const data = Object.fromEntries(new FormData($("#routeForm", dialog)).entries());
          ui.closeModal();
          ui.toast({
            title: "Route " + data.id + " queued",
            msg: "Geometry is drawn once the corridor is surveyed — stops saved.",
            type: "success",
            icon: "route"
          });
        });
      }
    });
  }

  /* ------------------------------------------------------------
     VIEW · STUDENTS  (instant lookup story)
     ------------------------------------------------------------ */
  let studentQuery = "", studentBus = "all";

  function viewStudents(host) {
    host.innerHTML =
      pageHead("Students", "Registered transport users and pass status",
        '<button class="btn-secondary btn-sm" data-export><i data-icon="download" data-icon-class="h-3.5 w-3.5"></i>Export</button>' +
        '<button class="btn-primary btn-sm" data-add-student><i data-icon="plus" data-icon-class="h-3.5 w-3.5"></i>Add student</button>') +
      '<div class="card overflow-hidden" data-reveal>' +
        '<div class="panel-head">' +
          '<div class="relative w-full max-w-sm">' +
          '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"><i data-icon="search" data-icon-class="h-4 w-4"></i></span>' +
          '<input class="input-field pl-9" id="studentSearch" type="search" placeholder="Search name, student ID, department…" aria-label="Search students" />' +
          "</div>" +
          '<div class="flex items-center gap-2">' +
          '<span class="mono-label hidden sm:inline">Bus</span>' +
          '<select class="input-field w-36 py-2 text-xs" id="studentBus" aria-label="Filter by bus">' +
          '<option value="all">All buses</option>' +
          BF.state.buses.map(function (b) { return '<option value="' + b.id + '">' + b.id + "</option>"; }).join("") +
          "</select></div>" +
        "</div>" +
        '<div id="studentTable"></div>' +
        '<div class="flex items-center justify-between border-t border-line px-5 py-3">' +
        '<p class="mono-label" id="studentCount"></p>' +
        '<p class="mono-label">Lookup · O(1) hash map</p></div>' +
      "</div>";

    paintStudentTable();
    $("#studentSearch", host).addEventListener("input", function () {
      studentQuery = this.value.trim().toLowerCase();
      paintStudentTable();
    });
    $("#studentBus", host).addEventListener("change", function () {
      studentBus = this.value;
      paintStudentTable();
    });
    $("[data-add-student]", host).addEventListener("click", function () {
      ui.toast({ title: "Student onboarding", msg: "Bulk import from the college ERP is part of the backend phase.", type: "info" });
    });
    $("[data-export]", host).addEventListener("click", exportReport);
  }

  function paintStudentTable() {
    const host = $("#studentTable");
    if (!host) return;
    const matches = BF.state.students.filter(function (s) {
      const hay = (s.name + " " + s.id + " " + s.dept + " " + s.stop).toLowerCase();
      return (studentBus === "all" || s.busId === studentBus) && hay.indexOf(studentQuery) > -1;
    });
    const LIMIT = 40;
    const rows = matches.slice(0, LIMIT);
    host.innerHTML = rows.length
      ? table(
          [{ label: "Student" }, { label: "Student ID" }, { label: "Department" }, { label: "Bus" },
           { label: "Stop" }, { label: "Pass" }, { label: "Today" }, { label: "Actions", align: "right" }],
          rows.map(function (s) {
            return "<tr>" +
              '<td><div class="flex items-center gap-3">' + ui.avatar(s.avatar) +
              '<div><p class="cell-strong">' + esc(s.name) + "</p>" +
              '<p class="text-xs text-mute">' + esc(s.year) + "</p></div></div></td>" +
              '<td class="cell-mono">' + esc(s.id) + "</td>" +
              "<td>" + esc(s.dept) + "</td>" +
              '<td class="cell-mono">' + esc(s.busId) + "</td>" +
              "<td>" + esc(s.stop) + "</td>" +
              "<td>" + ui.badge(s.pass === "active" ? "approved" : "expired", s.pass) + "</td>" +
              "<td>" + (s.boarded ? ui.badge("running", "boarded") : ui.badge("idle", "not boarded")) + "</td>" +
              '<td class="text-right"><div class="inline-flex gap-1">' +
              iconBtn("id", "View pass for " + s.name, 'data-student-pass="' + s.id + '"') +
              iconBtn("bell", "Notify parent of " + s.name, 'data-student-notify="' + s.id + '"') +
              "</div></td></tr>";
          }).join(""),
          { class: "rounded-none border-0" }
        )
      : '<div class="p-6">' + C.empty({
          icon: "search",
          title: "No students found",
          message: 'Nothing matched "' + studentQuery + '". Search by name, ID (GEHU2026-0117) or department.',
          action: "Clear search"
        }) + "</div>";

    const count = $("#studentCount");
    if (count) {
      count.textContent = matches.length > rows.length
        ? "Showing " + rows.length + " of " + matches.length + " matches (" + BF.state.students.length + " records)"
        : matches.length + " of " + BF.state.students.length + " records";
    }
    ui.hydrateIcons(host);

    const clear = $("[data-empty-action]", host);
    if (clear) clear.addEventListener("click", function () {
      studentQuery = ""; studentBus = "all";
      const s = $("#studentSearch"); if (s) s.value = "";
      const b = $("#studentBus"); if (b) b.value = "all";
      paintStudentTable();
    });
    $$("[data-student-pass]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        const student = BF.get.student(b.getAttribute("data-student-pass"));
        ui.modal({
          kicker: "Digital pass", title: student.name, size: "sm",
          body: C.passCard(student, { actions: false }),
          footer: '<button class="btn-secondary" data-close>Close</button>'
        });
      });
    });
    $$("[data-student-notify]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        const student = BF.get.student(b.getAttribute("data-student-notify"));
        BF.actions.notify({
          type: "info",
          title: "Message sent to " + student.parent,
          body: "Regarding " + student.name + " · " + student.busId,
          audience: ["admin", "parent"]
        }, { silent: true });
        ui.toast({ title: "Parent notified", msg: student.parent + " · " + student.parentPhone, type: "success", icon: "bell" });
      });
    });
  }

  /* ------------------------------------------------------------
     VIEW · DRIVERS / CONDUCTORS
     ------------------------------------------------------------ */
  function viewDrivers(host) {
    host.innerHTML =
      pageHead("Drivers", "Duty roster, licences and assignments",
        '<button class="btn-primary btn-sm" data-add><i data-icon="plus" data-icon-class="h-3.5 w-3.5"></i>Add driver</button>') +
      '<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">' +
      BF.state.drivers.map(function (d, i) {
        return '<article class="card card-hover card-pad" data-reveal data-reveal-delay="' + (i * 50) + '">' +
          '<div class="flex items-start justify-between gap-3">' +
          '<div class="flex items-center gap-3">' + ui.avatar(ui.initials(d.name), "text-warn") +
          '<div><p class="text-sm font-medium">' + esc(d.name) + "</p>" +
          '<p class="mono-label mt-0.5">' + esc(d.id) + "</p></div></div>" +
          ui.badge(d.status === "on-trip" ? "running" : d.status === "standby" ? "pending" : "idle", d.status) + "</div>" +
          '<dl class="mt-5 grid grid-cols-2 gap-y-3 text-sm">' +
          kv("Bus", d.busId) + kv("Experience", d.exp + " yrs") +
          kv("Licence", d.licence) + kv("Rating", d.rating + " ★") +
          "</dl>" +
          '<div class="mt-5 flex gap-2">' +
          '<button class="btn-secondary btn-sm flex-1" data-call="' + esc(d.phone) + '"><i data-icon="phone" data-icon-class="h-3.5 w-3.5"></i>Call</button>' +
          '<button class="btn-ghost btn-sm flex-1" data-roster="' + d.id + '">Roster</button></div>' +
          "</article>";
      }).join("") + "</div>";
    wirePeople(host);
  }

  function viewConductors(host) {
    host.innerHTML =
      pageHead("Conductors", "Scanning staff, shifts and daily scan counts",
        '<button class="btn-primary btn-sm" data-add><i data-icon="plus" data-icon-class="h-3.5 w-3.5"></i>Add conductor</button>') +
      '<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">' +
      BF.state.conductors.map(function (c, i) {
        const bus = BF.get.bus(c.busId);
        return '<article class="card card-hover card-pad" data-reveal data-reveal-delay="' + (i * 50) + '">' +
          '<div class="flex items-start justify-between gap-3">' +
          '<div class="flex items-center gap-3">' + ui.avatar(ui.initials(c.name), "text-violet") +
          '<div><p class="text-sm font-medium">' + esc(c.name) + "</p>" +
          '<p class="mono-label mt-0.5">' + esc(c.id) + " · " + esc(c.shift) + "</p></div></div>" +
          ui.badge(c.status === "on-trip" ? "running" : "idle", c.status) + "</div>" +
          '<dl class="mt-5 grid grid-cols-2 gap-y-3 text-sm">' +
          kv("Bus", c.busId) + kv("Scans today", String(c.scansToday)) +
          kv("Occupancy", bus ? bus.occupancy + "/" + bus.capacity : "—") + kv("Contact", c.phone) +
          "</dl>" +
          '<div class="mt-5 flex gap-2">' +
          '<button class="btn-secondary btn-sm flex-1" data-call="' + esc(c.phone) + '"><i data-icon="phone" data-icon-class="h-3.5 w-3.5"></i>Call</button>' +
          '<a class="btn-ghost btn-sm flex-1 justify-center" href="conductor.html">Scanner</a></div>' +
          "</article>";
      }).join("") + "</div>";
    wirePeople(host);
  }

  function wirePeople(host) {
    $$("[data-call]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        ui.toast({ title: "Dialling…", msg: b.getAttribute("data-call"), type: "info", icon: "phone" });
      });
    });
    $$("[data-roster]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        ui.toast({ title: "Roster view", msg: "Weekly shift planner arrives with the scheduling module.", type: "info" });
      });
    });
    const add = $("[data-add]", host);
    if (add) add.addEventListener("click", function () {
      ui.toast({ title: "Staff onboarding", msg: "Staff records sync from the HR module in the production build.", type: "info" });
    });
  }

  /* ------------------------------------------------------------
     VIEW · ATTENDANCE
     ------------------------------------------------------------ */
  let attBus = "all", attSort = "time";

  function viewAttendance(host) {
    host.innerHTML =
      pageHead("Attendance", "Boarding records captured by QR scans today",
        '<button class="btn-secondary btn-sm" data-reset><i data-icon="refresh" data-icon-class="h-3.5 w-3.5"></i>Reset demo</button>' +
        '<button class="btn-primary btn-sm" data-export><i data-icon="download" data-icon-class="h-3.5 w-3.5"></i>Export sorted</button>') +
      '<div class="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">' +
        '<section class="card overflow-hidden" data-reveal>' +
          '<div class="panel-head">' +
            '<div class="flex items-center gap-2">' +
            '<select class="input-field w-36 py-2 text-xs" id="attBus" aria-label="Filter by bus">' +
            '<option value="all">All buses</option>' +
            BF.state.buses.map(function (b) { return '<option value="' + b.id + '">' + b.id + "</option>"; }).join("") +
            "</select>" +
            '<select class="input-field w-40 py-2 text-xs" id="attSort" aria-label="Sort records">' +
            '<option value="time">Sort · time</option><option value="name">Sort · name</option><option value="bus">Sort · bus</option>' +
            "</select></div>" +
            '<span class="mono-label">Merge sort · O(n log n)</span>' +
          "</div>" +
          '<div id="attTable"></div>' +
        "</section>" +
        '<aside class="flex flex-col gap-4">' +
          '<div class="card card-pad" data-reveal data-reveal-delay="60">' +
          '<p class="mono-label">Today</p>' +
          '<p class="stat-value mt-3" data-count="' + BF.state.metrics.attendanceRate + '" data-decimals="1" data-suffix="%">0</p>' +
          '<p class="mt-2 text-xs text-mute">' + BF.state.attendance.length + " boarding events recorded</p>" +
          '<div class="mt-5">' + C.donut(Math.round(BF.state.metrics.attendanceRate), "Present", "#34d399") + "</div></div>" +
          '<div class="card card-pad" data-reveal data-reveal-delay="120">' +
          '<p class="mono-label">Per bus</p><div class="mt-4 space-y-3">' +
          BF.state.buses.slice(0, 5).map(function (b) {
            const n = BF.state.attendance.filter(function (a) { return a.busId === b.id; }).length;
            const pct = Math.min(100, Math.round((n / Math.max(1, BF.get.studentsOnBus(b.id).length)) * 100));
            return '<div><div class="flex items-center justify-between text-xs"><span class="font-mono text-mid">' + b.id + "</span>" +
              '<span class="font-mono text-mute">' + n + " scans</span></div>" +
              '<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8"><div class="h-full rounded-full bg-accent transition-[width] duration-700" style="width:' + pct + '%"></div></div></div>';
          }).join("") + "</div></div>" +
        "</aside>" +
      "</div>";

    paintAttendanceTable();
    $("#attBus", host).addEventListener("change", function () { attBus = this.value; paintAttendanceTable(); });
    $("#attSort", host).addEventListener("change", function () { attSort = this.value; paintAttendanceTable(); });
    $("[data-export]", host).addEventListener("click", exportReport);
    $("[data-reset]", host).addEventListener("click", function () {
      ui.confirm({
        title: "Reset demo attendance?",
        message: "Restores the seeded attendance list, occupancy counts and boarding flags. Useful right before a presentation.",
        confirmLabel: "Reset",
        onConfirm: function () {
          BF.actions.resetAttendanceDemo();
          render("attendance");
          ui.toast({ title: "Demo data reset", type: "success", icon: "refresh" });
        }
      });
    });
  }

  function paintAttendanceTable() {
    const host = $("#attTable");
    if (!host) return;
    let rows = BF.state.attendance.filter(function (a) { return attBus === "all" || a.busId === attBus; });
    rows = rows.slice().sort(function (a, b) {
      if (attSort === "name") {
        return (BF.get.student(a.studentId) || {}).name.localeCompare((BF.get.student(b.studentId) || {}).name);
      }
      if (attSort === "bus") return a.busId.localeCompare(b.busId);
      return ui.timeToMinutes(b.time) - ui.timeToMinutes(a.time);
    });

    const shown = rows.slice(0, 50);
    host.innerHTML = rows.length
      ? table(
          [{ label: "Record" }, { label: "Student" }, { label: "Bus" }, { label: "Stop" }, { label: "Time" }, { label: "Method" }, { label: "Status" }],
          shown.map(function (a) {
            const s = BF.get.student(a.studentId) || { name: a.studentId, avatar: "??", dept: "" };
            return "<tr>" +
              '<td class="cell-mono text-mute">' + esc(a.id) + "</td>" +
              '<td><div class="flex items-center gap-3">' + ui.avatar(s.avatar, "text-ok") +
              '<div><p class="cell-strong">' + esc(s.name) + '</p><p class="text-xs text-mute">' + esc(a.studentId) + "</p></div></div></td>" +
              '<td class="cell-mono">' + esc(a.busId) + "</td>" +
              "<td>" + esc(a.stop) + "</td>" +
              '<td class="cell-mono">' + esc(a.time) + "</td>" +
              '<td><span class="chip font-mono text-[10px]">' + esc(a.method) + "</span></td>" +
              "<td>" + ui.badge("present") + "</td></tr>";
          }).join("") +
          (rows.length > shown.length
            ? '<tr><td colspan="7" class="py-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Showing ' +
              shown.length + " of " + rows.length + " records · export for the full sorted list</td></tr>"
            : ""),
          { class: "rounded-none border-0" }
        )
      : '<div class="p-6">' + C.empty({
          icon: "userCheck",
          title: "No boarding records",
          message: "Attendance appears the moment a conductor scans a pass on this bus.",
          action: "Open conductor scanner"
        }) + "</div>";

    ui.hydrateIcons(host);
    const act = $("[data-empty-action]", host);
    if (act) act.addEventListener("click", function () { location.href = "conductor.html"; });
  }

  /* ------------------------------------------------------------
     VIEW · LEAVE REQUESTS
     ------------------------------------------------------------ */
  let leaveTab = "pending";

  function viewLeave(host) {
    host.innerHTML =
      pageHead("Leave Requests", "Student absence approvals",
        '<div class="flex gap-1.5" role="tablist">' +
        ["pending", "approved", "rejected", "all"].map(function (t) {
          return '<button class="tab" role="tab" data-leave-tab="' + t + '" aria-selected="' + (t === leaveTab) + '">' + t + "</button>";
        }).join("") + "</div>") +
      '<div id="leaveList" class="grid gap-3"></div>';
    paintLeave();
    $$("[data-leave-tab]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        leaveTab = b.getAttribute("data-leave-tab");
        $$("[data-leave-tab]", host).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        paintLeave();
      });
    });
  }

  function paintLeave() {
    const host = $("#leaveList");
    if (!host) return;
    const rows = BF.state.leaveRequests.filter(function (l) { return leaveTab === "all" || l.status === leaveTab; });
    if (!rows.length) {
      host.innerHTML = C.empty({ icon: "calendar", title: "No " + leaveTab + " requests", message: "The approvals queue is clear for this filter." });
      ui.hydrateIcons(host);
      return;
    }
    host.innerHTML = rows.map(function (l, i) {
      const s = BF.get.student(l.studentId) || { name: l.studentId, avatar: "??", busId: "—", dept: "" };
      return '<article class="card card-pad" data-reveal data-reveal-delay="' + (i * 40) + '">' +
        '<div class="flex flex-wrap items-start justify-between gap-4">' +
        '<div class="flex min-w-0 items-start gap-3">' + ui.avatar(s.avatar, "text-violet") +
        '<div class="min-w-0"><p class="text-sm font-medium">' + esc(s.name) + "</p>" +
        '<p class="mono-label mt-1">' + esc(l.id) + " · " + esc(s.busId) + " · " + esc(l.raised) + "</p>" +
        '<p class="mt-3 max-w-xl text-sm leading-relaxed text-mid">' + esc(l.reason) + "</p>" +
        '<p class="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] text-mute">' +
        '<span class="chip">' + esc(l.from) + "</span>→<span class=\"chip\">" + esc(l.to) + "</span></p></div></div>" +
        '<div class="flex items-center gap-2">' + ui.badge(l.status) +
        (l.status === "pending"
          ? '<button class="btn-danger btn-sm" data-leave-reject="' + l.id + '">Reject</button>' +
            '<button class="btn-primary btn-sm" data-leave-approve="' + l.id + '"><i data-icon="check" data-icon-class="h-3.5 w-3.5"></i>Approve</button>'
          : "") +
        "</div></div></article>";
    }).join("");
    ui.hydrateIcons(host);
    ui.observeReveal(host);

    $$("[data-leave-approve]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        BF.actions.setLeaveStatus(b.getAttribute("data-leave-approve"), "approved");
        paintLeave(); paintKpis();
        ui.toast({ title: "Leave approved", msg: b.getAttribute("data-leave-approve") + " · student and parent notified", type: "success" });
      });
    });
    $$("[data-leave-reject]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        BF.actions.setLeaveStatus(b.getAttribute("data-leave-reject"), "rejected");
        paintLeave(); paintKpis();
        ui.toast({ title: "Leave rejected", msg: b.getAttribute("data-leave-reject") + " · student notified", type: "warning" });
      });
    });
  }

  /* ------------------------------------------------------------
     VIEW · COMPLAINTS
     ------------------------------------------------------------ */
  function viewComplaints(host) {
    host.innerHTML =
      pageHead("Complaints", "Service issues raised by students and parents",
        '<span class="chip">' + BF.state.complaints.filter(function (c) { return c.status === "open"; }).length + " open</span>") +
      '<div class="grid gap-3" id="complaintList"></div>';
    paintComplaints();
  }

  function paintComplaints() {
    const host = $("#complaintList");
    if (!host) return;
    const rows = BF.state.complaints;
    if (!rows.length) {
      host.innerHTML = C.empty({ icon: "message", title: "No complaints", message: "Nothing has been reported today." });
      ui.hydrateIcons(host); return;
    }
    host.innerHTML = rows.map(function (c, i) {
      const s = BF.get.student(c.studentId) || { name: c.studentId, avatar: "??" };
      return '<article class="card card-pad" data-reveal data-reveal-delay="' + (i * 40) + '">' +
        '<div class="flex flex-wrap items-start justify-between gap-4">' +
        '<div class="flex min-w-0 items-start gap-3">' + ui.avatar(s.avatar, "text-warn") +
        '<div class="min-w-0"><div class="flex flex-wrap items-center gap-2">' +
        '<p class="text-sm font-medium">' + esc(c.category) + "</p>" +
        '<span class="chip font-mono text-[10px]">' + esc(c.busId) + "</span>" +
        '<span class="status-badge ' + (c.priority === "high" ? "status-alert" : "status-delayed") + '"><span class="dot"></span>' + esc(c.priority) + "</span></div>" +
        '<p class="mt-2 max-w-2xl text-sm leading-relaxed text-mid">' + esc(c.text) + "</p>" +
        '<p class="mono-label mt-2.5">' + esc(c.id) + " · " + esc(s.name) + " · " + esc(c.raised) + "</p></div></div>" +
        '<div class="flex items-center gap-2">' + ui.badge(c.status) +
        '<select class="input-field w-32 py-1.5 text-xs" data-complaint="' + c.id + '" aria-label="Update status">' +
        ["open", "in-review", "resolved"].map(function (s2) {
          return '<option value="' + s2 + '"' + (c.status === s2 ? " selected" : "") + ">" + s2 + "</option>";
        }).join("") + "</select></div></div></article>";
    }).join("");
    ui.hydrateIcons(host);
    ui.observeReveal(host);
    $$("[data-complaint]", host).forEach(function (sel) {
      sel.addEventListener("change", function () {
        BF.actions.setComplaintStatus(sel.getAttribute("data-complaint"), sel.value);
        paintComplaints();
        ui.toast({ title: "Complaint " + sel.value, msg: sel.getAttribute("data-complaint"), type: "success" });
      });
    });
  }

  /* ------------------------------------------------------------
     VIEW · NOTIFICATIONS
     ------------------------------------------------------------ */
  function viewNotifications(host) {
    const items = BF.get.notificationsFor("admin");
    host.innerHTML =
      pageHead("Notifications", "System event log · FIFO queue",
        '<button class="btn-secondary btn-sm" data-readall><i data-icon="check" data-icon-class="h-3.5 w-3.5"></i>Mark all read</button>') +
      '<div class="grid gap-2.5" id="noteList">' +
      (items.length ? items.map(C.notificationRow).join("")
        : C.empty({ icon: "bell", title: "No notifications", message: "Boarding, delay and arrival events land here." })) +
      "</div>";
    ui.hydrateIcons(host);
    $("[data-readall]", host).addEventListener("click", function () {
      BF.actions.markAllRead("admin");
      render("notifications");
      ui.toast({ title: "All notifications marked read", type: "success" });
    });
  }

  /* ------------------------------------------------------------
     VIEW · REPORTS
     ------------------------------------------------------------ */
  function viewReports(host) {
    const m = BF.state.metrics;
    host.innerHTML =
      pageHead("Reports", "Utilisation, punctuality and attendance analytics",
        '<select class="input-field w-32 py-2 text-xs" aria-label="Report period"><option>This week</option><option>This month</option><option>Semester</option></select>' +
        '<button class="btn-primary btn-sm" data-generate><i data-icon="report" data-icon-class="h-3.5 w-3.5"></i>Generate</button>') +

      '<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">' +
      C.kpi({ label: "Trips completed", value: 148, icon: "route", hint: "This week" }) +
      C.kpi({ label: "On-time rate", value: m.onTimeRate, decimals: 1, suffix: "%", icon: "clock", tone: "text-ok", hint: "+1.8% vs last week", hintTone: "text-ok", hintIcon: "trending" }) +
      C.kpi({ label: "Avg delay", value: m.avgDelay, decimals: 1, suffix: " min", icon: "alert", tone: "text-warn", hint: "Peak: Haldwani corridor" }) +
      C.kpi({ label: "Distance", value: m.kmToday, suffix: " km", icon: "navigation", hint: "Logged today" }) +
      "</div>" +

      '<div class="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">' +
      '<section class="card card-pad" data-reveal>' +
      '<div class="flex items-start justify-between"><div><h2 class="text-sm font-semibold">Attendance trend</h2>' +
      '<p class="mono-label mt-1">Six-day rolling window</p></div>' +
      '<span class="status-badge status-running"><span class="dot"></span>Healthy</span></div>' +
      '<div class="mt-6">' + C.barChart(BF.state.weekly, { height: 190 }) + "</div></section>" +
      '<section class="card card-pad" data-reveal data-reveal-delay="60">' +
      '<h2 class="text-sm font-semibold">Utilisation</h2><p class="mono-label mt-1">Seats vs capacity</p>' +
      '<div class="mt-6 flex items-center justify-around">' + C.donut(BF.get.fleetOccupancy(), "Fleet") +
      C.donut(Math.round(m.attendanceRate), "Attendance", "#34d399") + "</div></section>" +
      "</div>" +

      '<section class="card mt-4 overflow-hidden" data-reveal>' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Route performance</h2>' +
      '<span class="mono-label">Sorted by punctuality</span></div>' +
      table([{ label: "Route" }, { label: "Bus" }, { label: "Distance" }, { label: "Scheduled" }, { label: "Avg actual" }, { label: "Punctuality" }],
        BF.state.routes.slice().sort(function (a, b) { return a.etaMin - b.etaMin; }).map(function (r, i) {
          const punctual = [96, 88, 92, 97, 84][i % 5];
          return "<tr>" +
            '<td><span class="cell-mono" style="color:' + r.color + '">' + esc(r.id) + '</span> <span class="ml-2 text-mid">' + esc(r.short) + "</span></td>" +
            '<td class="cell-mono">' + esc(r.busId) + "</td>" +
            '<td class="cell-mono">' + r.distanceKm + " km</td>" +
            '<td class="cell-mono">' + r.etaMin + " min</td>" +
            '<td class="cell-mono">' + Math.round(r.etaMin * (1 + (100 - punctual) / 200)) + " min</td>" +
            '<td><div class="flex items-center gap-2.5"><div class="h-1.5 w-24 overflow-hidden rounded-full bg-white/8">' +
            '<div class="h-full rounded-full ' + (punctual > 90 ? "bg-ok" : "bg-warn") + '" style="width:' + punctual + '%"></div></div>' +
            '<span class="font-mono text-xs">' + punctual + "%</span></div></td></tr>";
        }).join(""), { class: "rounded-none border-0" }) +
      "</section>";

    $("[data-generate]", host).addEventListener("click", function () {
      const btn = this;
      btn.disabled = true;
      btn.innerHTML = '<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>Generating…';
      setTimeout(function () {
        btn.disabled = false;
        btn.innerHTML = ui.icon("report", "h-3.5 w-3.5") + "Generate";
        exportReport();
      }, ui.reducedMotion() ? 150 : 1100);
    });
  }

  function exportReport() {
    ui.toast({
      title: "Report exported",
      msg: "busflow-report-" + new Date().toISOString().slice(0, 10) + ".csv · sorted attendance included",
      type: "success",
      icon: "download"
    });
  }

  /* ------------------------------------------------------------
     VIEW · SETTINGS
     ------------------------------------------------------------ */
  function viewSettings(host) {
    host.innerHTML =
      pageHead("Settings", "System configuration for the transport module") +
      '<div class="grid gap-4 lg:grid-cols-2">' +
        settingsCard("Notifications", "Choose which events reach which audience", [
          toggleRow("Boarding alerts to parents", true),
          toggleRow("Delay alerts to students", true),
          toggleRow("Daily attendance digest", false),
          toggleRow("SOS escalation to security desk", true)
        ]) +
        settingsCard("Live simulation", "Presentation controls for the demo environment", [
          toggleRow("Run telemetry simulation", ui.sim.running, "sim"),
          rowStatic("Tick interval", "2.6 s"),
          rowStatic("Data source", "Mock adapter → C++ engine"),
          rowStatic("Storage", "Browser localStorage")
        ]) +
        settingsCard("Institution", "Campus and academic configuration", [
          rowStatic("College", BF.state.college.name),
          rowStatic("Campus", BF.state.college.campus),
          rowStatic("Academic year", "2026 – 2027"),
          rowStatic("Time zone", "Asia/Kolkata (IST)")
        ]) +
        '<section class="card card-pad" data-reveal>' +
        '<h2 class="text-sm font-semibold text-bad">Danger zone</h2>' +
        '<p class="section-sub">Reset the prototype to its seeded state before a presentation.</p>' +
        '<div class="mt-5 flex flex-wrap gap-2">' +
        '<button class="btn-secondary btn-sm" data-reset-att>Reset attendance</button>' +
        '<button class="btn-danger btn-sm" data-reset-all>Reset everything</button></div></section>' +
      "</div>";

    $$(".switch", host).forEach(function (sw) {
      sw.addEventListener("click", function () {
        const on = sw.getAttribute("aria-checked") !== "true";
        sw.setAttribute("aria-checked", String(on));
        if (sw.getAttribute("data-switch") === "sim") {
          on ? ui.sim.start(2600) : ui.sim.stop();
        }
      });
      sw.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sw.click(); }
      });
    });
    $("[data-reset-att]", host).addEventListener("click", function () {
      BF.actions.resetAttendanceDemo();
      ui.toast({ title: "Attendance reset", type: "success", icon: "refresh" });
    });
    $("[data-reset-all]", host).addEventListener("click", function () {
      ui.confirm({
        title: "Reset the entire prototype?",
        message: "Clears stored attendance, notifications, approvals and complaints, then reloads the seeded demo data.",
        confirmLabel: "Reset everything", danger: true,
        onConfirm: function () { BF.resetAll(); }
      });
    });
  }

  function settingsCard(title, sub, rows) {
    return '<section class="card" data-reveal>' +
      '<div class="panel-head"><div><h2 class="text-sm font-semibold">' + esc(title) + "</h2>" +
      '<p class="section-sub">' + esc(sub) + "</p></div></div>" +
      '<div class="divide-y divide-line">' + rows.join("") + "</div></section>";
  }

  function toggleRow(label, on, key) {
    return '<div class="flex items-center justify-between gap-4 px-5 py-3.5">' +
      '<span class="text-sm text-mid">' + esc(label) + "</span>" +
      '<button class="switch" role="switch" aria-checked="' + (!!on) + '" aria-label="' + esc(label) + '"' +
      (key ? ' data-switch="' + key + '"' : "") + "></button></div>";
  }

  function rowStatic(label, value) {
    return '<div class="flex items-center justify-between gap-4 px-5 py-3.5">' +
      '<span class="text-sm text-mid">' + esc(label) + "</span>" +
      '<span class="font-mono text-xs text-mute">' + esc(value) + "</span></div>";
  }
})(window);
