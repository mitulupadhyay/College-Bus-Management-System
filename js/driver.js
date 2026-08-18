/* ============================================================
   BusFlow · js/driver.js
   Driver console — deliberately simple, large targets, one
   primary action visible at all times.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const C = BF.components;
  const $ = ui.$, $$ = ui.$$, esc = ui.esc;

  const NAV = [
    { id: "trip", label: "Trip", icon: "steering" },
    { id: "route", label: "Route", icon: "route" },
    { id: "manifest", label: "Manifest", icon: "users" },
    { id: "alerts", label: "Alerts", icon: "bell" }
  ];
  const MOBILE = NAV;
  const TITLES = {
    trip: ["Trip console", "Live trip status and controls"],
    route: ["Route", "Stop sequence and progress"],
    manifest: ["Manifest", "Students boarded on this trip"],
    alerts: ["Alerts", "Messages from the control center"]
  };

  let driver, bus, route, map = null, current = "trip";
  let tripActive = true;

  document.addEventListener("DOMContentLoaded", function () {
    driver = BF.get.driver("DRV-01");
    bus = BF.get.bus(driver.busId);
    route = BF.get.route(bus.routeId);
    if (!BF.session.get() || BF.session.get().role !== "driver") BF.session.set("driver", driver.name);

    ui.mountShell({
      role: "driver",
      title: TITLES.trip[0],
      subtitle: TITLES.trip[1],
      items: NAV,
      mobileItems: MOBILE,
      onNavigate: render
    });

    render("trip");
    ui.sim.start(2800);
    BF.on("sim:tick", softRefresh);
    BF.on("state:change", softRefresh);
  });

  let queued = false;
  function softRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      bus = BF.get.bus(driver.busId);
      if (current === "trip") paintTripCard();
      if (current === "route") paintRouteTimeline();
      if (current === "manifest") paintManifest();
    });
  }

  function render(view) {
    current = view;
    const meta = TITLES[view] || TITLES.trip;
    ui.setPageTitle(meta[0], meta[1]);
    if (map) { map.destroy(); map = null; }
    const host = $("#view");
    ({ trip: viewTrip, route: viewRoute, manifest: viewManifest, alerts: viewAlerts })[view](host);
    ui.hydrateIcons(host);
    ui.hydrateCounters(host);
    ui.observeReveal(host);
  }

  /* ------------------------------------------------------------
     TRIP CONSOLE
     ------------------------------------------------------------ */
  function viewTrip(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><p class="kicker"><span class="dot"></span>' + esc(driver.name) + " · " + esc(driver.id) + "</p>" +
      '<h1 class="display mt-2 text-2xl sm:text-3xl">' + esc(bus.id) + " · " + esc(route.short) + "</h1></div>" +
      '<span class="chip"><span class="live-dot"></span>Shift 06:45 – 10:30</span></div>' +

      '<section id="tripCard" class="mt-5" data-reveal></section>' +

      '<div class="mt-4 grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">' +
      '<section class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Corridor</h2>' +
      '<span class="mono-label">' + route.distanceKm + " km · " + route.stops.length + " stops</span></div>" +
      '<div id="tripMap" class="aspect-[16/10] w-full"></div></section>' +
      '<section class="card" data-reveal data-reveal-delay="120">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Vehicle</h2></div>' +
      '<div class="grid grid-cols-2 gap-px bg-line">' +
      cell("Registration", bus.reg, bus.model) +
      cell("Fuel", bus.fuel + "%", bus.fuel > 40 ? "Sufficient" : "Refuel after trip", bus.fuel > 40 ? "text-ok" : "text-warn") +
      cell("Conductor", (BF.get.conductorOf(bus.id) || {}).name || "—", "On board") +
      cell("Capacity", bus.capacity + " seats", bus.occupancy + " occupied") +
      "</div>" +
      '<div class="p-4"><button class="btn-secondary btn-block" data-checklist>' +
      '<i data-icon="shield" data-icon-class="h-4 w-4"></i>Pre-trip checklist</button></div></section></div>';

    paintTripCard();
    map = BF.FleetMap.create($("#tripMap"), { routeIds: [route.id], busIds: [bus.id], labels: true, interactive: false, focus: bus.id });
    $("[data-checklist]", host).addEventListener("click", checklistModal);
  }

  function cell(label, value, hint, tone) {
    return '<div class="bg-panel px-4 py-3.5"><p class="mono-label">' + esc(label) + "</p>" +
      '<p class="mt-1.5 truncate font-mono text-sm ' + (tone || "text-hi") + '">' + esc(value) + "</p>" +
      '<p class="mt-1 truncate text-[11px] text-mute">' + esc(hint) + "</p></div>";
  }

  function paintTripCard() {
    const host = $("#tripCard");
    if (!host) return;
    const next = ui.nextStop(bus);
    const tone = bus.status === "delayed" ? "text-warn" : bus.status === "arrived" ? "text-accent" : "text-ok";
    host.innerHTML =
      '<div class="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-warn/[0.08] via-panel to-panel p-px">' +
      '<div class="relative rounded-[calc(1rem-1px)] bg-ink/70 p-5 sm:p-6">' +

      '<div class="flex flex-wrap items-center justify-between gap-3">' +
      '<p class="font-mono text-[11px] uppercase tracking-[0.2em] ' + (tripActive ? "text-ok" : "text-mute") + '">' +
      (tripActive ? "Trip active" : "Trip not started") + "</p>" + ui.badge(bus.status) + "</div>" +

      '<div class="mt-6 grid gap-6 sm:grid-cols-3">' +
      '<div><p class="mono-label">Students onboard</p>' +
      '<p class="mt-2 font-mono text-4xl font-semibold tabular-nums">' + bus.occupancy +
      '<span class="text-lg text-mute">/' + bus.capacity + "</span></p></div>" +
      '<div><p class="mono-label">Next stop</p>' +
      '<p class="mt-2 text-xl font-medium">' + esc(next ? next.name : "Campus") + "</p>" +
      '<p class="mt-1 text-xs text-mute">Scheduled ' + esc(next ? next.time : "08:10") + "</p></div>" +
      '<div><p class="mono-label">ETA</p>' +
      '<p class="mt-2 font-mono text-4xl font-semibold tabular-nums ' + tone + '">' +
      (bus.status === "arrived" ? "0" : bus.etaMin) + '<span class="ml-1 text-lg font-normal text-mute">min</span></p></div>' +
      "</div>" +

      '<div class="mt-6"><div class="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">' +
      '<div class="h-full rounded-full bg-gradient-to-r from-warn/70 to-ok transition-[width] duration-1000" style="width:' +
      Math.round(bus.progress * 100) + '%"></div></div>' +
      '<div class="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-faint">' +
      "<span>" + esc(route.stops[0].name) + "</span><span>" + Math.round(bus.progress * 100) + "%</span><span>Campus</span></div></div>" +

      '<div class="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">' +
      bigBtn("play", "Start trip", "start", tripActive ? "" : "btn-primary") +
      bigBtn("stop", "End trip", "end") +
      bigBtn("activity", "Running", "running", bus.status === "running" ? "ring-1 ring-ok/40" : "") +
      bigBtn("clock", "Delayed", "delayed", bus.status === "delayed" ? "ring-1 ring-warn/40" : "") +
      bigBtn("pin", "Arrived", "arrived", bus.status === "arrived" ? "ring-1 ring-accent/40" : "") +
      bigBtn("siren", "Emergency", "sos", "border-bad/40 text-bad hover:bg-bad/10") +
      "</div></div></div>";
    ui.hydrateIcons(host);

    $$("[data-trip]", host).forEach(function (b) {
      b.addEventListener("click", function () { tripAction(b.getAttribute("data-trip")); });
    });
  }

  function bigBtn(icon, label, action, extra) {
    return '<button class="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-panel-2/60 px-3 py-4 text-center transition-all duration-200 hover:border-line-2 hover:bg-panel-3 ' +
      (extra || "") + '" data-trip="' + action + '">' +
      ui.icon(icon, "h-5 w-5") +
      '<span class="font-mono text-[10px] uppercase tracking-[0.14em]">' + esc(label) + "</span></button>";
  }

  function tripAction(action) {
    if (action === "start") {
      tripActive = true;
      BF.actions.setBusStatus(bus.id, "running");
      BF.actions.notify({ type: "info", title: bus.id + " started the trip", body: route.name + " · departed " + route.stops[0].name, audience: ["admin", "parent", "student"] }, { silent: true });
      ui.toast({ title: "Trip started", msg: route.short + " · students notified", type: "success", icon: "play" });
    } else if (action === "end") {
      ui.confirm({
        title: "End this trip?",
        message: "The manifest is closed and the attendance summary is sent to the control center.",
        confirmLabel: "End trip",
        onConfirm: function () {
          tripActive = false;
          BF.actions.setBusStatus(bus.id, "arrived");
          ui.toast({ title: "Trip ended", msg: bus.occupancy + " students · attendance submitted", type: "success", icon: "check" });
          paintTripCard();
        }
      });
      return;
    } else if (action === "sos") {
      ui.confirm({
        title: "Raise emergency?",
        message: "The transport desk, campus security and every parent on " + bus.id + " will be alerted immediately.",
        confirmLabel: "Raise emergency", danger: true,
        onConfirm: function () {
          BF.actions.raiseSOS({ from: driver.name, busId: bus.id, location: (ui.nextStop(bus) || {}).name });
          ui.toast({ title: "Emergency broadcast", msg: "Control center acknowledged.", type: "danger", icon: "siren" });
        }
      });
      return;
    } else {
      BF.actions.setBusStatus(bus.id, action);
      BF.actions.notify({
        type: action === "delayed" ? "delay" : action === "arrived" ? "arrival" : "info",
        title: bus.id + " marked " + action,
        body: route.name + " · reported by " + driver.name,
        audience: ["admin", "parent", "student"]
      }, { silent: true });
      ui.toast({ title: "Status · " + action, msg: "Broadcast to control center and parents.", type: action === "delayed" ? "warning" : "success" });
    }
    paintTripCard();
  }

  function checklistModal() {
    const items = ["Brakes and horn", "Tyre pressure", "Fuel level", "First-aid kit", "Fire extinguisher", "Seat belts"];
    ui.modal({
      kicker: "Safety", title: "Pre-trip checklist", subtitle: bus.id + " · " + new Date().toLocaleDateString("en-IN"),
      body: '<ul class="space-y-2.5">' + items.map(function (i, idx) {
        return '<li><label class="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-panel-2/40 px-3.5 py-3 text-sm text-mid">' +
          '<input type="checkbox" class="h-4 w-4 accent-[#22d3ee]"' + (idx < 4 ? " checked" : "") + " />" + esc(i) + "</label></li>";
      }).join("") + "</ul>",
      footer: '<button class="btn-secondary" data-close>Later</button><button class="btn-primary" data-close-confirm>Submit checklist</button>',
      onMount: function (dialog) {
        $("[data-close-confirm]", dialog).addEventListener("click", function () {
          ui.closeModal();
          ui.toast({ title: "Checklist submitted", msg: "Logged against today's shift.", type: "success", icon: "shield" });
        });
      }
    });
  }

  /* ------------------------------------------------------------
     ROUTE
     ------------------------------------------------------------ */
  function viewRoute(host) {
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">' + esc(route.name) + "</h1>" +
      '<p class="section-sub">' + route.distanceKm + " km · scheduled " + route.etaMin + " min · " + route.stops.length + " stops</p>" +
      '<div class="mt-5 grid items-start gap-4 lg:grid-cols-[1fr_1fr]">' +
      '<section class="card" data-reveal><div class="panel-head"><h2 class="text-sm font-semibold">Stop sequence</h2>' +
      '<span class="mono-label">Live progress</span></div>' +
      '<div class="p-5" id="routeTimeline"></div></section>' +
      '<section class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Map</h2></div>' +
      '<div id="routeMap" class="aspect-[4/3] w-full"></div></section></div>';
    paintRouteTimeline();
    map = BF.FleetMap.create($("#routeMap"), { routeIds: [route.id], busIds: [bus.id], labels: true, interactive: false, focus: bus.id });
  }

  function paintRouteTimeline() {
    const host = $("#routeTimeline");
    if (!host) return;
    host.innerHTML = C.routeTimeline(route, bus, { showDistance: true });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     MANIFEST
     ------------------------------------------------------------ */
  function viewManifest(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><h1 class="display text-2xl sm:text-3xl">Manifest</h1>' +
      '<p class="section-sub">Students registered on ' + esc(bus.id) + "</p></div>" +
      '<span class="chip font-mono text-xs" id="manifestCount"></span></div>' +
      '<div class="mt-5" id="manifestList"></div>';
    paintManifest();
  }

  function paintManifest() {
    const host = $("#manifestList");
    if (!host) return;
    const all = BF.get.studentsOnBus(bus.id);
    const students = all.slice(0, 25);
    const boarded = all.filter(function (s) { return s.boarded; }).length;
    const count = $("#manifestCount");
    if (count) count.textContent = boarded + " / " + all.length + " boarded";

    host.innerHTML = all.length
      ? '<div class="card overflow-hidden"><div class="table-container rounded-none border-0"><table>' +
        "<thead><tr><th>Student</th><th>Stop</th><th>Pass</th><th>Status</th></tr></thead><tbody>" +
        students.map(function (s) {
          return "<tr><td><div class=\"flex items-center gap-3\">" + ui.avatar(s.avatar) +
            '<div><p class="cell-strong">' + esc(s.name) + '</p><p class="text-xs text-mute">' + esc(s.id) + "</p></div></div></td>" +
            "<td>" + esc(s.stop) + "</td>" +
            "<td>" + ui.badge(s.pass === "active" ? "approved" : "expired", s.pass) + "</td>" +
            "<td>" + (s.boarded ? ui.badge("running", "boarded") : ui.badge("idle", "waiting")) + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        (all.length > students.length ? '<p class="border-t border-line px-4 py-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Showing ' + students.length + " of " + all.length + " students</p>" : "") + "</div>"
      : C.empty({ icon: "users", title: "No students assigned", message: "The control center has not mapped students to this bus yet." });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     ALERTS
     ------------------------------------------------------------ */
  function viewAlerts(host) {
    const items = BF.get.notificationsFor("driver");
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Alerts</h1>' +
      '<p class="section-sub">Messages from the control center</p>' +
      '<div class="mt-5 grid gap-2.5">' +
      (items.length ? items.map(C.notificationRow).join("")
        : C.empty({ icon: "bell", title: "No alerts", message: "Dispatch messages will appear here." })) + "</div>";
    ui.hydrateIcons(host);
  }
})(window);
