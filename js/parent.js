/* ============================================================
   BusFlow · js/parent.js
   Parent app — child status, journey timeline, live tracking,
   boarding/arrival notifications and crew contact.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const C = BF.components;
  const $ = ui.$, $$ = ui.$$, esc = ui.esc;

  const NAV = [
    { id: "home", label: "Overview", icon: "home" },
    { id: "journey", label: "Journey", icon: "route" },
    { id: "track", label: "Live Tracking", icon: "radar" },
    { id: "attendance", label: "Attendance", icon: "userCheck" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    { id: "contact", label: "Contact", icon: "phone" }
  ];
  const MOBILE = [
    { id: "home", label: "Home", icon: "home" },
    { id: "journey", label: "Journey", icon: "route" },
    { id: "track", label: "Track", icon: "radar" },
    { id: "notifications", label: "Alerts", icon: "bell" },
    { id: "contact", label: "Call", icon: "phone" }
  ];
  const TITLES = {
    home: ["My child", "Live status and today's journey"],
    journey: ["Journey timeline", "Boarding to arrival"],
    track: ["Live tracking", "Where the bus is right now"],
    attendance: ["Attendance", "Boarding history"],
    notifications: ["Notifications", "Boarding, delay and arrival alerts"],
    contact: ["Contact", "Driver, conductor and transport desk"]
  };

  let child, bus, route, map = null, current = "home";

  document.addEventListener("DOMContentLoaded", function () {
    child = BF.get.demoStudent();
    bus = BF.get.bus(child.busId);
    route = BF.get.route(child.routeId);
    if (!BF.session.get() || BF.session.get().role !== "parent") BF.session.set("parent", child.parent);

    ui.mountShell({
      role: "parent",
      title: TITLES.home[0],
      subtitle: TITLES.home[1],
      items: NAV,
      mobileItems: MOBILE,
      onNavigate: render
    });

    render("home");
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
      bus = BF.get.bus(child.busId);
      if (current === "home") { paintChildCard(); paintJourney("homeJourney"); paintFeed("homeFeed"); }
      if (current === "journey") paintJourney("journeyFull");
      if (current === "track") paintTrackStrip();
    });
  }

  function render(view) {
    current = view;
    const meta = TITLES[view] || TITLES.home;
    ui.setPageTitle(meta[0], meta[1]);
    if (map) { map.destroy(); map = null; }
    const host = $("#view");
    ({ home: viewHome, journey: viewJourney, track: viewTrack, attendance: viewAttendance,
       notifications: viewNotifications, contact: viewContact })[view](host);
    ui.hydrateIcons(host);
    ui.hydrateCounters(host);
    ui.observeReveal(host);
  }

  /* ------------------------------------------------------------
     JOURNEY MODEL — derived from shared state
     ------------------------------------------------------------ */
  function journeySteps() {
    const record = BF.state.attendance.find(function (a) { return a.studentId === child.id; });
    const boarded = !!record || child.boarded;
    const departed = boarded && bus.progress > 0.08;
    const approaching = bus.progress > 0.62 && bus.status !== "arrived";
    const arrived = bus.status === "arrived" || bus.progress >= 0.999;
    return [
      { label: "Boarded", meta: record ? record.stop + " · " + record.time : "Waiting for QR scan at " + child.stop, done: boarded, current: !boarded },
      { label: "Departed", meta: departed ? "Left " + route.stops[0].name : "Not started", done: departed, current: boarded && !departed },
      { label: "Approaching College", meta: approaching ? "ETA " + bus.etaMin + " min" : (arrived ? "Completed" : "En route"), done: arrived, current: approaching },
      { label: "Arrived at College", meta: arrived ? "Campus gate · " + ui.clockNow() : "Expected 08:10 AM", done: arrived, current: false },
      { label: "Return trip", meta: "Departs campus 04:30 PM", done: false, current: false },
      { label: "Home", meta: "Expected 05:25 PM at " + child.stop, done: false, current: false }
    ];
  }

  function journeyHtml() {
    const steps = journeySteps();
    return '<ol class="timeline">' + steps.map(function (s) {
      const cls = s.done ? "tl-node tl-done" : s.current ? "tl-node tl-current" : "tl-node";
      return '<li class="tl-item">' +
        '<span class="' + cls + '">' + (s.done ? ui.icon("check", "h-3 w-3", 2.4) : s.current ? '<span class="h-2 w-2 rounded-full bg-current"></span>' : "") + "</span>" +
        '<div class="min-w-0 flex-1 pt-0.5">' +
        '<p class="text-sm font-medium ' + (s.done ? "text-mid" : s.current ? "text-hi" : "text-mute") + '">' + esc(s.label) + "</p>" +
        '<p class="mt-1 text-xs ' + (s.current ? "text-accent" : "text-mute") + '">' + esc(s.meta) + "</p></div></li>";
    }).join("") + "</ol>";
  }

  function paintJourney(id) {
    const host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = journeyHtml();
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     HOME
     ------------------------------------------------------------ */
  function viewHome(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><p class="kicker"><span class="dot"></span>Today</p>' +
      '<h1 class="display mt-2 text-2xl sm:text-3xl">Your child</h1></div>' +
      '<span class="chip"><span class="live-dot"></span>Live · <span data-clock>07:42 AM</span></span></div>' +

      '<section id="childCard" class="mt-5" data-reveal></section>' +

      '<div class="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">' +
      '<section class="card" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Journey today</h2>' +
      '<button class="btn-ghost btn-sm" data-go="journey">Details</button></div>' +
      '<div class="p-5" id="homeJourney"></div></section>' +

      '<section class="card overflow-hidden" data-reveal data-reveal-delay="120">' +
      '<div class="panel-head"><div class="flex items-center gap-2.5"><span class="live-dot"></span>' +
      '<h2 class="text-sm font-semibold">' + esc(bus.id) + " · " + esc(route.short) + "</h2></div>" +
      '<button class="btn-ghost btn-sm" data-go="track">Full map</button></div>' +
      '<div id="homeMap" class="aspect-[16/10] w-full"></div></section></div>' +

      '<div class="mt-8 grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">' +
      '<section class="card" data-reveal>' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Recent alerts</h2>' +
      '<button class="btn-ghost btn-sm" data-go="notifications">All</button></div>' +
      '<div class="space-y-2.5 p-4" id="homeFeed"></div></section>' +
      '<section class="card card-pad" data-reveal data-reveal-delay="60">' +
      '<h2 class="text-sm font-semibold">Peace of mind</h2>' +
      '<p class="section-sub">You are notified at each of these moments.</p>' +
      '<div class="mt-4 grid grid-cols-2 gap-2.5">' +
      [["userCheck", "Boarded", "text-ok"], ["navigation", "Departed", "text-accent"],
       ["pin", "Arrived", "text-accent"], ["alert", "Delay", "text-warn"]].map(function (a) {
        return '<div class="flex items-center gap-2.5 rounded-xl border border-line bg-panel-2/40 px-3 py-2.5">' +
          '<span class="' + a[2] + '">' + ui.icon(a[0], "h-4 w-4") + "</span>" +
          '<span class="text-xs text-mid">' + a[1] + "</span></div>";
      }).join("") + "</div></section></div>";

    paintChildCard();
    paintJourney("homeJourney");
    paintFeed("homeFeed");
    map = BF.FleetMap.create($("#homeMap"), { routeIds: [route.id], busIds: [bus.id], labels: true, interactive: false, focus: bus.id });
    wireGo(host);
  }

  function wireGo(host) {
    $$("[data-go]", host).forEach(function (b) {
      b.addEventListener("click", function () { ui.navigate(b.getAttribute("data-go"), { onNavigate: render }); });
    });
  }

  function paintChildCard() {
    const host = $("#childCard");
    if (!host) return;
    const record = BF.state.attendance.find(function (a) { return a.studentId === child.id; });
    const next = ui.nextStop(bus);
    const tone = bus.status === "delayed" ? "text-warn" : bus.status === "arrived" ? "text-accent" : "text-ok";
    host.innerHTML =
      '<div class="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ok/[0.10] via-panel to-panel p-px">' +
      '<div class="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-ok/15 blur-3xl"></div>' +
      '<div class="relative rounded-[calc(1rem-1px)] bg-ink/70 p-5 sm:p-6">' +
      '<div class="flex flex-wrap items-start justify-between gap-4">' +
      '<div class="flex items-center gap-4">' +
      '<span class="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-panel-2 font-mono text-base text-ok">' + esc(child.avatar) + "</span>" +
      '<div><p class="text-lg font-semibold tracking-[-0.02em]">' + esc(child.name) + "</p>" +
      '<p class="mt-1 text-xs text-mute">' + esc(child.dept) + " · " + esc(child.year) + " · " + esc(child.id) + "</p></div></div>" +
      '<div class="flex items-center gap-2">' +
      (record ? ui.badge("running", "Boarded " + record.time) : ui.badge("idle", "Not boarded")) +
      ui.badge(bus.status) + "</div></div>" +

      '<div class="mt-6 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">' +
      cell("Bus", bus.id, route.short) +
      cell("ETA to campus", bus.status === "arrived" ? "Arrived" : bus.etaMin + " min", "Next · " + (next ? next.name : "Campus"), tone) +
      cell("Boarding stop", child.stop, record ? "Scanned " + record.time : "Awaiting scan") +
      cell("Occupancy", bus.occupancy + "/" + bus.capacity, Math.round((bus.occupancy / bus.capacity) * 100) + "% full") +
      "</div>" +
      '<div class="mt-5 flex flex-wrap gap-2">' +
      '<button class="btn-primary" data-go="track"><i data-icon="radar" data-icon-class="h-4 w-4"></i>Track bus</button>' +
      '<button class="btn-secondary" data-go="contact"><i data-icon="phone" data-icon-class="h-4 w-4"></i>Contact driver</button>' +
      "</div></div></div>";
    ui.hydrateIcons(host);
    wireGo(host);
  }

  function cell(label, value, hint, tone) {
    return '<div class="bg-panel/80 px-4 py-3.5"><p class="mono-label">' + esc(label) + "</p>" +
      '<p class="mt-1.5 truncate font-mono text-base ' + (tone || "text-hi") + '">' + esc(value) + "</p>" +
      '<p class="mt-1 truncate text-[11px] text-mute">' + esc(hint) + "</p></div>";
  }

  function paintFeed(id) {
    const host = document.getElementById(id);
    if (!host) return;
    const items = BF.get.notificationsFor("parent").slice(0, 4);
    host.innerHTML = items.length
      ? items.map(C.notificationRow).join("")
      : C.empty({ icon: "bell", title: "No alerts yet", message: "You'll be notified the moment your child boards." });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     JOURNEY (full)
     ------------------------------------------------------------ */
  function viewJourney(host) {
    const record = BF.state.attendance.find(function (a) { return a.studentId === child.id; });
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Journey timeline</h1>' +
      '<p class="section-sub">' + esc(child.name) + " · " + esc(bus.id) + " · " + esc(route.name) + "</p>" +

      '<div class="mt-5 grid items-start gap-4 lg:grid-cols-[1fr_1fr]">' +
      '<section class="card card-pad" data-reveal>' +
      '<h2 class="text-sm font-semibold">Today</h2>' +
      '<div class="mt-5" id="journeyFull"></div></section>' +

      '<div class="flex flex-col gap-4">' +
      '<section class="card" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Trip facts</h2></div>' +
      '<div class="grid grid-cols-2 gap-px bg-line">' +
      cell("Boarding time", record ? record.time : "—", record ? record.stop : "Awaiting scan") +
      cell("Arrival (expected)", "08:10 AM", route.stops[route.stops.length - 1].name) +
      cell("Delay", bus.status === "delayed" ? "+8 min" : "On time", bus.status === "delayed" ? "Traffic near Jeolikot" : "No incidents") +
      cell("Distance covered", (route.distanceKm * bus.progress).toFixed(1) + " km", "of " + route.distanceKm + " km") +
      "</div></section>" +
      '<section class="card" data-reveal data-reveal-delay="120">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Stops on this route</h2></div>' +
      '<div class="max-h-[280px] overflow-y-auto p-5">' + C.routeTimeline(route, bus) + "</div></section>" +
      "</div></div>";
    paintJourney("journeyFull");
  }

  /* ------------------------------------------------------------
     TRACK
     ------------------------------------------------------------ */
  function viewTrack(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><h1 class="display text-2xl sm:text-3xl">Live tracking</h1>' +
      '<p class="section-sub">' + esc(bus.id) + " · " + esc(route.name) + "</p></div>" +
      '<span class="chip"><span class="live-dot"></span>Updated every 2.8 s</span></div>' +
      '<div id="trackStrip" class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"></div>' +
      '<section class="card mt-4 overflow-hidden" data-reveal>' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Network view</h2>' +
      '<span class="mono-label">' + esc(route.id) + "</span></div>" +
      '<div id="trackMap" class="aspect-[4/3] w-full sm:aspect-[16/9]"></div></section>';
    paintTrackStrip();
    map = BF.FleetMap.create($("#trackMap"), { routeIds: [route.id], busIds: [bus.id], labels: true, interactive: false, focus: bus.id });
  }

  function paintTrackStrip() {
    const host = $("#trackStrip");
    if (!host) return;
    const next = ui.nextStop(bus);
    host.innerHTML =
      strip("ETA", bus.status === "arrived" ? "Arrived" : bus.etaMin + " min", bus.status === "delayed" ? "text-warn" : "text-accent") +
      strip("Next stop", next ? next.name : "Campus", "text-hi") +
      strip("Speed", bus.speed + " km/h", "text-hi") +
      strip("Status", bus.status, bus.status === "delayed" ? "text-warn" : "text-ok");
  }

  function strip(label, value, tone) {
    return '<div class="card px-4 py-3.5"><p class="mono-label">' + esc(label) + "</p>" +
      '<p class="mt-1.5 truncate font-mono text-base ' + tone + '">' + esc(value) + "</p></div>";
  }

  /* ------------------------------------------------------------
     ATTENDANCE
     ------------------------------------------------------------ */
  function viewAttendance(host) {
    const record = BF.state.attendance.find(function (a) { return a.studentId === child.id; });
    const rows = (record ? [{ date: "Today", stop: record.stop, time: record.time, status: "present" }] : [])
      .concat([
        { date: "17 Aug 2026", stop: child.stop, time: "07:39 AM", status: "present" },
        { date: "16 Aug 2026", stop: child.stop, time: "07:44 AM", status: "present" },
        { date: "14 Aug 2026", stop: "—", time: "—", status: "leave" },
        { date: "13 Aug 2026", stop: child.stop, time: "07:41 AM", status: "present" }
      ]);
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Attendance</h1>' +
      '<p class="section-sub">Every boarding scan for ' + esc(child.name) + "</p>" +
      '<div class="mt-5 grid items-start gap-4 lg:grid-cols-[18rem_1fr]">' +
      '<section class="card card-pad" data-reveal><p class="mono-label">This semester</p>' +
      '<div class="mt-4 grid place-items-center">' + C.donut(96, "Present", "#34d399") + "</div>" +
      '<p class="mt-4 text-center text-xs text-mute">118 trips · 3 approved leaves</p></section>' +
      '<section class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">History</h2><span class="mono-label">Newest first</span></div>' +
      '<div class="table-container rounded-none border-0"><table><thead><tr><th>Date</th><th>Stop</th><th>Time</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return "<tr><td class=\"cell-strong\">" + esc(r.date) + "</td><td>" + esc(r.stop) + "</td>" +
          '<td class="cell-mono">' + esc(r.time) + "</td><td>" +
          ui.badge(r.status === "present" ? "present" : "pending", r.status) + "</td></tr>";
      }).join("") + "</tbody></table></div></section></div>";
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     NOTIFICATIONS / CONTACT
     ------------------------------------------------------------ */
  function viewNotifications(host) {
    const items = BF.get.notificationsFor("parent");
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><h1 class="display text-2xl sm:text-3xl">Notifications</h1>' +
      '<p class="section-sub">Boarding, delay, arrival and emergency alerts</p></div>' +
      '<button class="btn-secondary btn-sm" data-readall><i data-icon="check" data-icon-class="h-3.5 w-3.5"></i>Mark all read</button></div>' +
      '<div class="mt-5 grid gap-2.5">' +
      (items.length ? items.map(C.notificationRow).join("")
        : C.empty({ icon: "bell", title: "No notifications", message: "Alerts about your child's commute appear here." })) + "</div>";
    ui.hydrateIcons(host);
    $("[data-readall]", host).addEventListener("click", function () {
      BF.actions.markAllRead("parent");
      render("notifications");
      ui.toast({ title: "All notifications read", type: "success" });
    });
  }

  function viewContact(host) {
    const driver = BF.get.driverOf(bus.id);
    const cond = BF.get.conductorOf(bus.id);
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Contact</h1>' +
      '<p class="section-sub">Reach the crew on ' + esc(bus.id) + " or the transport desk</p>" +
      '<div class="mt-5 grid gap-3 sm:grid-cols-2">' +
      contactCard(driver ? driver.name : "Driver", "Driver · " + bus.id, driver ? driver.phone : "—", "steering", "text-warn") +
      contactCard(cond ? cond.name : "Conductor", "Conductor · " + bus.id, cond ? cond.phone : "—", "id", "text-violet") +
      contactCard("Transport desk", "Campus operations", "+91 94100 00110", "shield", "text-accent") +
      contactCard("Campus security", "24×7 helpline", "+91 94100 00220", "alert", "text-bad") +
      "</div>" +
      '<section class="card card-pad mt-4" data-reveal>' +
      '<h2 class="text-sm font-semibold">Send a message to the transport desk</h2>' +
      '<form class="mt-4 space-y-3" id="msgForm" novalidate>' +
      '<label class="field-label" for="msgText">Message</label>' +
      '<textarea class="input-field" id="msgText" rows="3" placeholder="e.g. Mitul will board at Tallital tomorrow."></textarea>' +
      '<button class="btn-primary" type="submit"><i data-icon="mail" data-icon-class="h-4 w-4"></i>Send message</button>' +
      "</form></section>";
    ui.hydrateIcons(host);
    $$("[data-call]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        ui.toast({ title: "Calling " + b.getAttribute("data-name"), msg: b.getAttribute("data-call"), type: "info", icon: "phone" });
      });
    });
    $("#msgForm", host).addEventListener("submit", function (e) {
      e.preventDefault();
      const text = $("#msgText").value.trim();
      if (!text) { ui.toast({ title: "Write a message first", type: "warning" }); return; }
      this.reset();
      BF.actions.notify({ type: "info", title: "Message from " + child.parent, body: text, audience: ["admin"] }, { silent: true });
      ui.toast({ title: "Message sent", msg: "The transport desk will respond shortly.", type: "success", icon: "mail" });
    });
  }

  function contactCard(name, meta, phone, icon, tone) {
    return '<button class="card card-hover flex items-center gap-3 p-4 text-left" data-call="' + esc(phone) + '" data-name="' + esc(name) + '">' +
      '<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.03] ' + tone + '">' +
      ui.icon(icon, "h-4 w-4") + "</span>" +
      '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">' + esc(name) + "</span>" +
      '<span class="block truncate text-xs text-mute">' + esc(meta) + "</span>" +
      '<span class="mt-0.5 block font-mono text-[11px] text-faint">' + esc(phone) + "</span></span>" +
      ui.icon("phone", "h-4 w-4 text-faint") + "</button>";
  }
})(window);
