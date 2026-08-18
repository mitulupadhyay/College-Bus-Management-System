/* ============================================================
   BusFlow · js/student.js
   Student app — live bus, ETA, digital pass, attendance,
   leave requests, complaints, notifications and SOS.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const C = BF.components;
  const $ = ui.$, $$ = ui.$$, esc = ui.esc;

  const NAV = [
    { id: "home", label: "Home", icon: "home" },
    { id: "track", label: "Live Tracking", icon: "radar" },
    { id: "pass", label: "Bus Pass", icon: "id" },
    { id: "attendance", label: "Attendance", icon: "userCheck" },
    { id: "leave", label: "Leave", icon: "calendar" },
    { id: "complaints", label: "Complaints", icon: "message" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    { id: "sos", label: "SOS", icon: "siren" }
  ];

  const MOBILE = [
    { id: "home", label: "Home", icon: "home" },
    { id: "track", label: "Track", icon: "radar" },
    { id: "pass", label: "Pass", icon: "id" },
    { id: "notifications", label: "Alerts", icon: "bell" },
    { id: "sos", label: "SOS", icon: "siren" }
  ];

  const TITLES = {
    home: ["My commute", "Live bus, ETA and today's status"],
    track: ["Live tracking", "Follow BUS-07 on Route A"],
    pass: ["Digital bus pass", "Present this at boarding"],
    attendance: ["My attendance", "Boarding history"],
    leave: ["Leave requests", "Apply and track approvals"],
    complaints: ["Complaints", "Report a service issue"],
    notifications: ["Notifications", "Everything about your commute"],
    sos: ["Emergency SOS", "Immediate help from the transport desk"]
  };

  let student, bus, route, map = null, current = "home";

  document.addEventListener("DOMContentLoaded", function () {
    student = BF.get.demoStudent();
    bus = BF.get.bus(student.busId);
    route = BF.get.route(student.routeId);
    if (!BF.session.get() || BF.session.get().role !== "student") BF.session.set("student", student.name);

    ui.mountShell({
      role: "student",
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
      bus = BF.get.bus(student.busId);
      if (current === "home") { paintEtaCard(); paintTimeline("homeTimeline"); paintFeed("homeFeed"); }
      if (current === "track") { paintEtaStrip(); paintTimeline("trackTimeline"); }
    });
  }

  function render(view) {
    current = view;
    const meta = TITLES[view] || TITLES.home;
    ui.setPageTitle(meta[0], meta[1]);
    if (map) { map.destroy(); map = null; }
    const host = $("#view");
    ({
      home: viewHome, track: viewTrack, pass: viewPass, attendance: viewAttendance,
      leave: viewLeave, complaints: viewComplaints, notifications: viewNotifications, sos: viewSos
    })[view](host);
    ui.hydrateIcons(host);
    ui.hydrateCounters(host);
    ui.observeReveal(host);
  }

  /* ------------------------------------------------------------
     HOME
     ------------------------------------------------------------ */
  function viewHome(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><p class="kicker"><span class="dot"></span>Good morning</p>' +
      '<h1 class="display mt-2 text-2xl sm:text-3xl">' + esc(student.name.split(" ")[0]) + "'s commute</h1></div>" +
      '<span class="chip"><span class="live-dot"></span>Live · <span data-clock>07:42 AM</span></span></div>' +

      '<section id="etaCard" class="mt-5" data-reveal></section>' +

      '<div class="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">' +
        '<section class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
          '<div class="panel-head"><div class="flex items-center gap-2.5"><span class="live-dot"></span>' +
          '<h2 class="text-sm font-semibold">' + esc(bus.id) + " · " + esc(route.short) + "</h2></div>" +
          '<button class="btn-ghost btn-sm" data-go="track">Full map<i data-icon="arrowRight" data-icon-class="h-3.5 w-3.5"></i></button></div>' +
          '<div id="homeMap" class="aspect-[16/10] w-full"></div>' +
        "</section>" +
        '<section class="card" data-reveal data-reveal-delay="120">' +
          '<div class="panel-head"><h2 class="text-sm font-semibold">Journey</h2>' +
          '<span class="mono-label">' + route.stops.length + " stops</span></div>" +
          '<div class="max-h-[320px] overflow-y-auto p-5" id="homeTimeline"></div>' +
        "</section>" +
      "</div>" +

      '<h2 class="section-title mt-8">Quick actions</h2>' +
      '<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">' +
      [["id", "Bus pass", "pass"], ["userCheck", "Attendance", "attendance"], ["calendar", "Leave", "leave"],
       ["message", "Complaint", "complaints"], ["bell", "Alerts", "notifications"], ["siren", "SOS", "sos"]]
        .map(function (a, i) {
          return '<button class="card card-hover flex flex-col items-start gap-3 p-4 text-left" data-go="' + a[2] + '" data-reveal data-reveal-delay="' + (i * 40) + '">' +
            '<span class="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white/[0.03] ' +
            (a[2] === "sos" ? "text-bad" : "text-accent") + '">' + ui.icon(a[0], "h-4 w-4") + "</span>" +
            '<span class="text-xs font-medium">' + esc(a[1]) + "</span></button>";
        }).join("") + "</div>" +

      '<div class="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">' +
        '<section class="card" data-reveal>' +
          '<div class="panel-head"><h2 class="text-sm font-semibold">Today</h2>' +
          '<span class="mono-label">' + new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + "</span></div>" +
          '<div class="grid grid-cols-2 gap-px bg-line" id="todayStats"></div>' +
        "</section>" +
        '<section class="card" data-reveal data-reveal-delay="60">' +
          '<div class="panel-head"><h2 class="text-sm font-semibold">Recent alerts</h2>' +
          '<button class="btn-ghost btn-sm" data-go="notifications">All</button></div>' +
          '<div class="space-y-2.5 p-4" id="homeFeed"></div>' +
        "</section>" +
      "</div>";

    paintEtaCard();
    paintTimeline("homeTimeline");
    paintToday();
    paintFeed("homeFeed");
    map = BF.FleetMap.create($("#homeMap"), {
      routeIds: [route.id], busIds: [bus.id], labels: true, interactive: false, focus: bus.id
    });
    wireGo(host);
  }

  function wireGo(host) {
    $$("[data-go]", host).forEach(function (b) {
      b.addEventListener("click", function () { ui.navigate(b.getAttribute("data-go"), { onNavigate: render }); });
    });
  }

  function paintEtaCard() {
    const host = $("#etaCard");
    if (!host) return;
    const next = ui.nextStop(bus);
    const eta = bus.status === "arrived" ? "0" : String(bus.etaMin);
    const tone = bus.status === "delayed" ? "text-warn" : bus.status === "arrived" ? "text-accent" : "text-ok";
    host.innerHTML =
      '<div class="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-accent/[0.12] via-panel to-panel p-px">' +
      '<div class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl"></div>' +
      '<div class="relative rounded-[calc(1rem-1px)] bg-ink/70 p-5 sm:p-6">' +
      '<div class="flex flex-wrap items-start justify-between gap-4">' +
      '<div><p class="mono-label">Your bus</p>' +
      '<p class="mt-2 font-mono text-2xl font-semibold tracking-tight">' + esc(bus.id) + "</p>" +
      '<p class="mt-1 text-xs text-mute">' + esc(route.name) + "</p></div>" +
      ui.badge(bus.status) + "</div>" +

      '<div class="mt-6 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">' +
      "<div>" +
      '<p class="font-mono text-[3.25rem] font-semibold leading-none tabular-nums ' + tone + '">' + esc(eta) +
      '<span class="ml-2 text-lg font-normal text-mute">min</span></p>' +
      '<p class="mono-label mt-2">Estimated arrival at your stop</p></div>' +
      '<div class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:max-w-sm sm:justify-self-end">' +
      '<div class="bg-panel/80 px-4 py-3"><p class="mono-label">Next stop</p>' +
      '<p class="mt-1 truncate text-sm text-hi">' + esc(next ? next.name : "Campus") + "</p></div>" +
      '<div class="bg-panel/80 px-4 py-3"><p class="mono-label">Seats</p>' +
      '<p class="mt-1 font-mono text-sm text-hi">' + bus.occupancy + "/" + bus.capacity + "</p></div></div>" +
      "</div>" +

      '<div class="mt-6"><div class="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">' +
      '<div class="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent transition-[width] duration-1000" style="width:' +
      Math.round(bus.progress * 100) + '%"></div></div>' +
      '<div class="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-faint">' +
      "<span>" + esc(route.stops[0].name) + "</span><span>" + Math.round(bus.progress * 100) + "% complete</span>" +
      "<span>Campus</span></div></div>" +

      '<div class="mt-6 flex flex-wrap gap-2">' +
      '<button class="btn-primary" data-go="track"><i data-icon="radar" data-icon-class="h-4 w-4"></i>Track live</button>' +
      '<button class="btn-secondary" data-go="pass"><i data-icon="id" data-icon-class="h-4 w-4"></i>Show pass</button>' +
      '<button class="btn-ghost" data-notify-me><i data-icon="bell" data-icon-class="h-4 w-4"></i>Notify me at 5 min</button>' +
      "</div></div></div>";
    ui.hydrateIcons(host);
    wireGo(host);
    const notifyBtn = $("[data-notify-me]", host);
    if (notifyBtn) notifyBtn.addEventListener("click", function () {
      ui.toast({ title: "Reminder set", msg: "You'll be alerted when " + bus.id + " is 5 minutes away.", type: "success", icon: "bell" });
    });
  }

  function paintTimeline(id) {
    const host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = C.routeTimeline(route, bus, { showDistance: true });
    ui.hydrateIcons(host);
  }

  function paintToday() {
    const host = $("#todayStats");
    if (!host) return;
    const record = BF.state.attendance.find(function (a) { return a.studentId === student.id; });
    host.innerHTML =
      statCell("Boarding", record ? record.time : "Not boarded", record ? "text-ok" : "text-mute") +
      statCell("Status", record ? "Present" : "Pending scan", record ? "text-ok" : "text-warn") +
      statCell("This month", "96.2%", "text-hi") +
      statCell("Pass", student.pass === "active" ? "Active" : "Expired", student.pass === "active" ? "text-ok" : "text-bad");
  }

  function statCell(label, value, tone) {
    return '<div class="bg-panel px-4 py-3.5"><p class="mono-label">' + esc(label) + "</p>" +
      '<p class="mt-1.5 font-mono text-sm ' + tone + '">' + esc(value) + "</p></div>";
  }

  function paintFeed(id) {
    const host = document.getElementById(id);
    if (!host) return;
    const items = BF.get.notificationsFor("student").slice(0, 3);
    host.innerHTML = items.length
      ? items.map(C.notificationRow).join("")
      : C.empty({ icon: "bell", title: "No alerts", message: "Delay and boarding updates will appear here." });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     LIVE TRACKING
     ------------------------------------------------------------ */
  function viewTrack(host) {
    const driver = BF.get.driverOf(bus.id);
    const cond = BF.get.conductorOf(bus.id);
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><h1 class="display text-2xl sm:text-3xl">Live tracking</h1>' +
      '<p class="section-sub">' + esc(route.name) + " · updated every 2.8 s</p></div>" +
      '<span class="chip"><span class="live-dot"></span>GPS lock</span></div>' +

      '<div id="etaStrip" class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"></div>' +

      '<div class="mt-4 grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">' +
      '<section class="card overflow-hidden" data-reveal>' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Network view</h2>' +
      '<span class="mono-label">' + esc(route.id) + " · " + route.distanceKm + " km</span></div>" +
      '<div id="trackMap" class="aspect-[4/3] w-full sm:aspect-[16/10]"></div></section>' +

      '<div class="flex flex-col gap-4">' +
      '<section class="card" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Stops</h2></div>' +
      '<div class="max-h-[300px] overflow-y-auto p-5" id="trackTimeline"></div></section>' +
      '<section class="card card-pad" data-reveal data-reveal-delay="120">' +
      '<h2 class="text-sm font-semibold">Crew</h2>' +
      '<div class="mt-4 space-y-3">' +
      crewRow(driver ? driver.name : "—", "Driver · " + (driver ? driver.exp + " yrs" : ""), driver ? driver.phone : "", "text-warn") +
      crewRow(cond ? cond.name : "—", "Conductor · " + (cond ? cond.shift : ""), cond ? cond.phone : "", "text-violet") +
      "</div></section></div></div>";

    paintEtaStrip();
    paintTimeline("trackTimeline");
    map = BF.FleetMap.create($("#trackMap"), {
      routeIds: [route.id], busIds: [bus.id], labels: true, interactive: false, focus: bus.id
    });
    $$("[data-call]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        ui.toast({ title: "Calling…", msg: b.getAttribute("data-call"), type: "info", icon: "phone" });
      });
    });
  }

  function crewRow(name, meta, phone, tone) {
    return '<div class="flex items-center gap-3 rounded-xl border border-line bg-panel-2/50 p-3">' +
      ui.avatar(ui.initials(name), tone) +
      '<div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">' + esc(name) + "</p>" +
      '<p class="mono-label mt-0.5">' + esc(meta) + "</p></div>" +
      (phone ? '<button class="btn-icon" data-call="' + esc(phone) + '" aria-label="Call ' + esc(name) + '">' +
        ui.icon("phone", "h-4 w-4") + "</button>" : "") + "</div>";
  }

  function paintEtaStrip() {
    const host = $("#etaStrip");
    if (!host) return;
    const next = ui.nextStop(bus);
    host.innerHTML =
      strip("ETA", bus.status === "arrived" ? "Arrived" : bus.etaMin + " min", bus.status === "delayed" ? "text-warn" : "text-accent") +
      strip("Next stop", next ? next.name : "Campus", "text-hi") +
      strip("Speed", bus.speed + " km/h", "text-hi") +
      strip("Occupancy", bus.occupancy + "/" + bus.capacity, "text-hi");
  }

  function strip(label, value, tone) {
    return '<div class="card px-4 py-3.5"><p class="mono-label">' + esc(label) + "</p>" +
      '<p class="mt-1.5 truncate font-mono text-base tabular-nums ' + tone + '">' + esc(value) + "</p></div>";
  }

  /* ------------------------------------------------------------
     DIGITAL PASS
     ------------------------------------------------------------ */
  function viewPass(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><h1 class="display text-2xl sm:text-3xl">Digital bus pass</h1>' +
      '<p class="section-sub">Valid for the ' + esc(student.validity) + " academic year</p></div>" +
      ui.badge(student.pass === "active" ? "approved" : "expired", student.pass) + "</div>" +

      '<div class="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">' +
      '<div data-reveal id="passHost"></div>' +
      '<div class="space-y-4">' +
      '<section class="card card-pad" data-reveal data-reveal-delay="60">' +
      '<h2 class="text-sm font-semibold">Pass details</h2>' +
      '<dl class="mt-4 grid gap-3 sm:grid-cols-2">' +
      detail("Issued on", "01 Jul 2026") + detail("Expires", "30 Jun 2027") +
      detail("Route", route.name) + detail("Boarding stop", student.stop) +
      detail("Fee status", "Paid · ₹ 12,400") + detail("Pass ID", "BFP-" + student.id.slice(-4)) +
      "</dl></section>" +
      '<section class="card card-pad" data-reveal data-reveal-delay="120">' +
      '<h2 class="text-sm font-semibold">How boarding works</h2>' +
      '<ol class="mt-4 space-y-3 text-sm text-mid">' +
      step(1, "Open the pass at your stop — it works offline.") +
      step(2, "The conductor scans the QR code on boarding.") +
      step(3, "Attendance is recorded and your parent is notified.") +
      "</ol></section></div></div>";

    const passHost = $("#passHost", host);
    passHost.innerHTML = C.passCard(student);
    ui.hydrateIcons(passHost);
    $("[data-pass-download]", passHost).addEventListener("click", function () {
      ui.toast({ title: "Pass saved", msg: "busflow-pass-" + student.id + ".png added to your wallet (simulated).", type: "success", icon: "download" });
    });
    $("[data-pass-share]", passHost).addEventListener("click", function () {
      ui.modal({
        kicker: "Boarding", title: "Show this to the conductor", size: "sm",
        body: '<div class="grid place-items-center gap-4">' +
          '<div class="grid h-60 w-60 place-items-center rounded-2xl bg-white p-4">' + BF.QR.svg(BF.QR.payload(student)) + "</div>" +
          '<p class="font-mono text-[11px] text-mute">' + esc(BF.QR.payload(student)) + "</p>" +
          '<p class="text-center text-xs text-mute">Screen brightness is raised automatically while the pass is open.</p></div>',
        footer: '<button class="btn-secondary" data-close>Close</button>'
      });
    });
  }

  function detail(k, v) {
    return '<div class="rounded-lg border border-line bg-panel-2/40 px-3.5 py-3">' +
      '<dt class="mono-label">' + esc(k) + "</dt>" +
      '<dd class="mt-1 truncate text-sm text-hi">' + esc(v) + "</dd></div>";
  }

  function step(n, text) {
    return '<li class="flex gap-3"><span class="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line bg-panel-2 font-mono text-[10px] text-accent">' +
      n + "</span><span class=\"leading-relaxed\">" + esc(text) + "</span></li>";
  }

  /* ------------------------------------------------------------
     ATTENDANCE
     ------------------------------------------------------------ */
  const HISTORY = [
    { date: "18 Aug 2026", stop: "Bhimtal Market", time: "07:42 AM", status: "present" },
    { date: "17 Aug 2026", stop: "Bhimtal Market", time: "07:39 AM", status: "present" },
    { date: "16 Aug 2026", stop: "Bhimtal Market", time: "07:44 AM", status: "present" },
    { date: "14 Aug 2026", stop: "—", time: "—", status: "leave" },
    { date: "13 Aug 2026", stop: "Bhimtal Market", time: "07:41 AM", status: "present" },
    { date: "12 Aug 2026", stop: "Bhimtal Market", time: "07:47 AM", status: "present" },
    { date: "11 Aug 2026", stop: "—", time: "—", status: "absent" }
  ];

  function viewAttendance(host) {
    const today = BF.state.attendance.find(function (a) { return a.studentId === student.id; });
    const rows = (today
      ? [{ date: "Today", stop: today.stop, time: today.time, status: "present" }]
      : []).concat(HISTORY);

    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">My attendance</h1>' +
      '<p class="section-sub">Boarding records captured by QR scans</p>' +

      '<div class="mt-5 grid items-start gap-4 lg:grid-cols-[18rem_1fr]">' +
      '<section class="card card-pad" data-reveal>' +
      '<p class="mono-label">This semester</p>' +
      '<div class="mt-4 grid place-items-center">' + C.donut(96, "Present", "#34d399") + "</div>" +
      '<dl class="mt-5 space-y-2.5 text-sm">' +
      kv("Trips taken", "118") + kv("Leaves", "3") + kv("Missed", "2") +
      "</dl></section>" +

      '<section class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">History</h2>' +
      '<span class="mono-label">Sorted · newest first</span></div>' +
      (rows.length
        ? '<div class="table-container rounded-none border-0"><table><thead><tr>' +
          "<th>Date</th><th>Stop</th><th>Time</th><th>Status</th></tr></thead><tbody>" +
          rows.map(function (r) {
            return "<tr><td class=\"cell-strong\">" + esc(r.date) + "</td><td>" + esc(r.stop) + "</td>" +
              '<td class="cell-mono">' + esc(r.time) + "</td><td>" +
              ui.badge(r.status === "present" ? "present" : r.status === "leave" ? "pending" : "rejected", r.status) +
              "</td></tr>";
          }).join("") + "</tbody></table></div>"
        : '<div class="p-6">' + C.empty({ icon: "userCheck", title: "No records yet", message: "Your first scan of the semester will show up here." }) + "</div>") +
      "</section></div>";
    ui.hydrateIcons(host);
  }

  function kv(k, v) {
    return '<div class="flex items-center justify-between"><dt class="text-mute">' + esc(k) + "</dt>" +
      '<dd class="font-mono text-xs text-hi">' + esc(v) + "</dd></div>";
  }

  /* ------------------------------------------------------------
     LEAVE
     ------------------------------------------------------------ */
  function viewLeave(host) {
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Leave requests</h1>' +
      '<p class="section-sub">Tell the transport desk when you will not board</p>' +

      '<div class="mt-5 grid items-start gap-4 lg:grid-cols-[22rem_1fr]">' +
      '<section class="card card-pad" data-reveal>' +
      '<h2 class="text-sm font-semibold">Apply for leave</h2>' +
      '<form class="mt-4 space-y-4" id="leaveForm" novalidate>' +
      '<div><label class="field-label" for="lvFrom">From</label>' +
      '<input class="input-field" type="date" id="lvFrom" name="from" value="2026-08-19" required /></div>' +
      '<div><label class="field-label" for="lvTo">To</label>' +
      '<input class="input-field" type="date" id="lvTo" name="to" value="2026-08-20" required /></div>' +
      '<div><label class="field-label" for="lvReason">Reason</label>' +
      '<textarea class="input-field" id="lvReason" name="reason" rows="3" placeholder="Briefly describe the reason"></textarea></div>' +
      '<button class="btn-primary btn-block" type="submit"><i data-icon="calendar" data-icon-class="h-4 w-4"></i>Submit request</button>' +
      "</form></section>" +

      '<section class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">My requests</h2>' +
      '<span class="mono-label" id="leaveCount"></span></div>' +
      '<div class="space-y-3 p-4" id="leaveList"></div></section></div>';

    paintLeaveList();
    $("#leaveForm", host).addEventListener("submit", function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(this).entries());
      if (!data.reason.trim()) {
        ui.toast({ title: "Add a reason", msg: "A short reason helps the transport desk approve faster.", type: "warning" });
        return;
      }
      BF.actions.addLeaveRequest({ studentId: student.id, from: data.from, to: data.to, reason: data.reason.trim() });
      this.reset();
      paintLeaveList();
      ui.toast({ title: "Leave request submitted", msg: "The transport desk will review it shortly.", type: "success", icon: "calendar" });
    });
  }

  function paintLeaveList() {
    const host = $("#leaveList");
    if (!host) return;
    const rows = BF.state.leaveRequests.filter(function (l) { return l.studentId === student.id; });
    const count = $("#leaveCount");
    if (count) count.textContent = rows.length + " total";
    host.innerHTML = rows.length
      ? rows.map(function (l) {
          return '<article class="rounded-xl border border-line bg-panel-2/40 p-4">' +
            '<div class="flex flex-wrap items-start justify-between gap-3">' +
            '<div><p class="font-mono text-xs text-mute">' + esc(l.id) + " · " + esc(l.raised) + "</p>" +
            '<p class="mt-1.5 text-sm text-hi">' + esc(l.from) + " → " + esc(l.to) + "</p>" +
            '<p class="mt-2 max-w-lg text-sm leading-relaxed text-mute">' + esc(l.reason) + "</p></div>" +
            ui.badge(l.status) + "</div></article>";
        }).join("")
      : C.empty({ icon: "calendar", title: "No leave requests", message: "Submit one on the left — approvals usually arrive the same day." });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     COMPLAINTS
     ------------------------------------------------------------ */
  function viewComplaints(host) {
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Complaints</h1>' +
      '<p class="section-sub">Report an issue with your bus or route</p>' +

      '<div class="mt-5 grid items-start gap-4 lg:grid-cols-[22rem_1fr]">' +
      '<section class="card card-pad" data-reveal>' +
      '<h2 class="text-sm font-semibold">Raise a complaint</h2>' +
      '<form class="mt-4 space-y-4" id="cmForm" novalidate>' +
      '<div><label class="field-label" for="cmCat">Category</label>' +
      '<select class="input-field" id="cmCat" name="category">' +
      ["Delay", "Overcrowding", "Cleanliness", "Driving", "Behaviour", "Other"].map(function (c) {
        return '<option value="' + c + '">' + c + "</option>";
      }).join("") + "</select></div>" +
      '<div><label class="field-label" for="cmBus">Bus</label>' +
      '<select class="input-field" id="cmBus" name="busId">' +
      BF.state.buses.map(function (b) {
        return '<option value="' + b.id + '"' + (b.id === bus.id ? " selected" : "") + ">" + b.id + "</option>";
      }).join("") + "</select></div>" +
      '<div><label class="field-label" for="cmText">Details</label>' +
      '<textarea class="input-field" id="cmText" name="text" rows="4" placeholder="What happened?"></textarea></div>' +
      '<button class="btn-primary btn-block" type="submit"><i data-icon="message" data-icon-class="h-4 w-4"></i>Submit complaint</button>' +
      "</form></section>" +

      '<section class="card overflow-hidden" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">My complaints</h2></div>' +
      '<div class="space-y-3 p-4" id="cmList"></div></section></div>';

    paintComplaintList();
    $("#cmForm", host).addEventListener("submit", function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(this).entries());
      if (!data.text.trim()) {
        ui.toast({ title: "Add some details", msg: "Describe the issue so the desk can act on it.", type: "warning" });
        return;
      }
      BF.actions.addComplaint({ studentId: student.id, category: data.category, busId: data.busId, text: data.text.trim() });
      this.reset();
      paintComplaintList();
      ui.toast({ title: "Complaint submitted", msg: "Ticket raised with the transport desk.", type: "success", icon: "message" });
    });
  }

  function paintComplaintList() {
    const host = $("#cmList");
    if (!host) return;
    const rows = BF.state.complaints.filter(function (c) { return c.studentId === student.id; });
    host.innerHTML = rows.length
      ? rows.map(function (c) {
          return '<article class="rounded-xl border border-line bg-panel-2/40 p-4">' +
            '<div class="flex flex-wrap items-start justify-between gap-3">' +
            '<div><div class="flex flex-wrap items-center gap-2">' +
            '<p class="text-sm font-medium">' + esc(c.category) + "</p>" +
            '<span class="chip font-mono text-[10px]">' + esc(c.busId) + "</span></div>" +
            '<p class="mt-2 max-w-lg text-sm leading-relaxed text-mute">' + esc(c.text) + "</p>" +
            '<p class="mono-label mt-2">' + esc(c.id) + " · " + esc(c.raised) + "</p></div>" +
            ui.badge(c.status) + "</div></article>";
        }).join("")
      : C.empty({ icon: "message", title: "No complaints raised", message: "Everything looks fine on your route." });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     NOTIFICATIONS
     ------------------------------------------------------------ */
  function viewNotifications(host) {
    const items = BF.get.notificationsFor("student");
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><h1 class="display text-2xl sm:text-3xl">Notifications</h1>' +
      '<p class="section-sub">Boarding, delay and approval updates</p></div>' +
      '<button class="btn-secondary btn-sm" data-readall><i data-icon="check" data-icon-class="h-3.5 w-3.5"></i>Mark all read</button></div>' +
      '<div class="mt-5 grid gap-2.5">' +
      (items.length ? items.map(C.notificationRow).join("")
        : C.empty({ icon: "bell", title: "Nothing new", message: "Alerts about your bus will show up here." })) + "</div>";
    ui.hydrateIcons(host);
    $("[data-readall]", host).addEventListener("click", function () {
      BF.actions.markAllRead("student");
      render("notifications");
      ui.toast({ title: "All caught up", type: "success" });
    });
  }

  /* ------------------------------------------------------------
     SOS
     ------------------------------------------------------------ */
  function viewSos(host) {
    const driver = BF.get.driverOf(bus.id);
    host.innerHTML =
      '<div class="mx-auto max-w-xl text-center">' +
      '<p class="kicker justify-center"><span class="dot"></span>Emergency</p>' +
      '<h1 class="display mt-3 text-2xl sm:text-3xl">Send an SOS</h1>' +
      '<p class="section-sub mx-auto max-w-md">Your location, bus and student ID are shared instantly with the transport desk, ' +
      "your driver, conductor and your parent.</p>" +

      '<div class="mt-8 grid place-items-center">' +
      '<button class="group relative grid h-44 w-44 place-items-center rounded-full border border-bad/40 bg-bad/10 transition-transform duration-300 hover:scale-[1.03] active:scale-95" id="sosBtn" aria-label="Hold to send SOS">' +
      '<span class="absolute inset-0 rounded-full border border-bad/30" style="animation: pulse-ring 2.6s ease-out infinite"></span>' +
      '<span class="relative grid place-items-center gap-2 text-bad">' +
      ui.icon("siren", "h-10 w-10", 1.4) +
      '<span class="font-mono text-xs uppercase tracking-[0.24em]">Hold 2s</span></span></button>' +
      '<div class="mt-4 h-1 w-44 overflow-hidden rounded-full bg-white/[0.06]">' +
      '<div class="h-full w-0 rounded-full bg-bad transition-none" id="sosProgress"></div></div></div>' +

      '<div class="mt-10 grid gap-3 text-left sm:grid-cols-2">' +
      contactCard("Transport desk", "+91 94100 00110", "shield") +
      contactCard(driver ? driver.name : "Driver", driver ? driver.phone : "—", "steering") +
      contactCard("Campus security", "+91 94100 00220", "alert") +
      contactCard("Parent · " + student.parent, student.parentPhone, "users") +
      "</div></div>";
    ui.hydrateIcons(host);

    const btn = $("#sosBtn", host);
    const bar = $("#sosProgress", host);
    let raf = null, start = 0, fired = false;

    function begin() {
      if (fired) return;
      start = performance.now();
      const tick = function (now) {
        const p = Math.min(1, (now - start) / 2000);
        bar.style.width = (p * 100) + "%";
        if (p >= 1) { trigger(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    function cancel() {
      if (fired) return;
      cancelAnimationFrame(raf);
      bar.style.width = "0%";
    }
    function trigger() {
      fired = true;
      cancelAnimationFrame(raf);
      bar.style.width = "100%";
      BF.actions.raiseSOS({ from: student.name, busId: bus.id, location: (ui.nextStop(bus) || {}).name });
      ui.modal({
        kicker: "SOS transmitted",
        title: "Help is on the way",
        size: "sm",
        body: '<div class="space-y-3 text-sm text-mid">' +
          '<p class="flex items-center gap-2 text-ok"><i data-icon="checkCircle" data-icon-class="h-4 w-4"></i>Transport desk acknowledged · 07:43 AM</p>' +
          '<p class="rounded-lg border border-line bg-panel-2/50 p-3 text-xs leading-relaxed text-mute">' +
          "Shared: " + esc(student.name) + " · " + esc(student.id) + " · " + esc(bus.id) + " · live location on " + esc(route.short) +
          "</p><p class=\"text-xs text-mute\">Stay where you are. The conductor has been alerted on the bus console.</p></div>",
        footer: '<button class="btn-secondary" data-close>Close</button>'
      });
      ui.toast({ title: "SOS sent", msg: "Transport desk, driver, conductor and parent notified.", type: "danger", icon: "siren" });
      setTimeout(function () { fired = false; bar.style.width = "0%"; }, 3000);
    }

    ["mousedown", "touchstart"].forEach(function (ev) { btn.addEventListener(ev, begin); });
    ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(function (ev) { btn.addEventListener(ev, cancel); });
    btn.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); begin(); } });
    btn.addEventListener("keyup", cancel);

    $$("[data-call]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        ui.toast({ title: "Calling " + b.getAttribute("data-name"), msg: b.getAttribute("data-call"), type: "info", icon: "phone" });
      });
    });
  }

  function contactCard(name, phone, icon) {
    return '<button class="card card-hover flex items-center gap-3 p-4 text-left" data-call="' + esc(phone) + '" data-name="' + esc(name) + '">' +
      '<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.03] text-accent">' +
      ui.icon(icon, "h-4 w-4") + "</span>" +
      '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">' + esc(name) + "</span>" +
      '<span class="block font-mono text-[11px] text-mute">' + esc(phone) + "</span></span>" +
      ui.icon("phone", "h-4 w-4 text-faint") + "</button>";
  }
})(window);
