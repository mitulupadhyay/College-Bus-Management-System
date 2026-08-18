/* ============================================================
   BusFlow · js/conductor.js
   Conductor console — the QR scanning workflow.

   Scan → verify → mark attendance. One tap updates attendance,
   occupancy, the driver console, the parent app and the admin
   dashboard, because every screen reads the same store.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const C = BF.components;
  const $ = ui.$, $$ = ui.$$, esc = ui.esc;

  const NAV = [
    { id: "scan", label: "Scan", icon: "scan" },
    { id: "boarded", label: "Boarded", icon: "userCheck" },
    { id: "manifest", label: "Manifest", icon: "users" },
    { id: "alerts", label: "Alerts", icon: "bell" }
  ];
  const TITLES = {
    scan: ["Scan student pass", "QR boarding verification"],
    boarded: ["Boarded", "Students scanned on this trip"],
    manifest: ["Manifest", "Everyone mapped to this bus"],
    alerts: ["Alerts", "Messages from the control center"]
  };

  let conductor, bus, route, current = "scan";
  let pending = null;      // student awaiting confirmation
  let scanTimer = null;

  document.addEventListener("DOMContentLoaded", function () {
    conductor = BF.get.conductor("CND-01");
    bus = BF.get.bus(conductor.busId);
    route = BF.get.route(bus.routeId);
    if (!BF.session.get() || BF.session.get().role !== "conductor") BF.session.set("conductor", conductor.name);

    ui.mountShell({
      role: "conductor",
      title: TITLES.scan[0],
      subtitle: TITLES.scan[1],
      items: NAV,
      mobileItems: NAV,
      onNavigate: render
    });

    render("scan");
    ui.sim.start(3000);
    BF.on("state:change", function () {
      bus = BF.get.bus(conductor.busId);
      paintCounter();
      if (current === "boarded") paintBoarded();
      if (current === "manifest") paintManifest();
    });
  });

  function render(view) {
    current = view;
    const meta = TITLES[view] || TITLES.scan;
    ui.setPageTitle(meta[0], meta[1]);
    clearTimeout(scanTimer);
    const host = $("#view");
    ({ scan: viewScan, boarded: viewBoarded, manifest: viewManifest, alerts: viewAlerts })[view](host);
    ui.hydrateIcons(host);
    ui.hydrateCounters(host);
    ui.observeReveal(host);
  }

  function waiting() {
    return BF.get.studentsOnBus(bus.id).filter(function (s) { return !s.boarded; });
  }

  /* ------------------------------------------------------------
     SCAN
     ------------------------------------------------------------ */
  function viewScan(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><p class="kicker"><span class="dot"></span>' + esc(conductor.name) + " · " + esc(conductor.id) + "</p>" +
      '<h1 class="display mt-2 text-2xl sm:text-3xl">Scan student pass</h1></div>' +
      '<span class="chip"><span class="live-dot"></span>' + esc(bus.id) + " · " + esc(route.short) + "</span></div>" +

      '<div id="counterStrip" class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"></div>' +

      '<div class="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">' +
      '<section class="card overflow-hidden" data-reveal>' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Scanner</h2>' +
      '<span class="status-badge status-running"><span class="dot"></span>Camera ready</span></div>' +
      '<div class="p-5" id="scanner"></div></section>' +

      '<div class="flex flex-col gap-4">' +
      '<section class="card" data-reveal data-reveal-delay="60">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Waiting at stops</h2>' +
      '<span class="mono-label" id="waitCount"></span></div>' +
      '<div class="max-h-[260px] overflow-y-auto p-4" id="waitList"></div></section>' +
      '<section class="card" data-reveal data-reveal-delay="120">' +
      '<div class="panel-head"><h2 class="text-sm font-semibold">Just boarded</h2>' +
      '<button class="btn-ghost btn-sm" data-go="boarded">All</button></div>' +
      '<div class="max-h-[240px] overflow-y-auto p-4" id="recentList"></div></section>' +
      "</div></div>";

    paintCounter();
    paintWaiting();
    paintRecent();
    scannerIdle();
    $$("[data-go]", host).forEach(function (b) {
      b.addEventListener("click", function () { ui.navigate(b.getAttribute("data-go"), { onNavigate: render }); });
    });
  }

  function paintCounter() {
    const host = $("#counterStrip");
    if (!host) return;
    const boarded = BF.get.studentsOnBus(bus.id).filter(function (s) { return s.boarded; }).length;
    const total = BF.get.studentsOnBus(bus.id).length;
    host.innerHTML =
      strip("Boarded", bus.occupancy + " / " + bus.capacity, "text-ok") +
      strip("Manifest", boarded + " / " + total, "text-hi") +
      strip("Scans today", String(BF.state.attendance.filter(function (a) { return a.busId === bus.id; }).length), "text-accent") +
      strip("Next stop", (ui.nextStop(bus) || {}).name || "Campus", "text-hi");
  }

  function strip(label, value, tone) {
    return '<div class="card px-4 py-3.5"><p class="mono-label">' + esc(label) + "</p>" +
      '<p class="mt-1.5 truncate font-mono text-base tabular-nums ' + tone + '">' + esc(value) + "</p></div>";
  }

  /* ---------- scanner states ---------- */
  function scannerFrame(inner, active) {
    return '<div class="relative mx-auto grid aspect-square w-full max-w-[300px] place-items-center overflow-hidden rounded-2xl border ' +
      (active ? "border-accent/50" : "border-line") + ' bg-ink">' +
      '<div class="absolute inset-0 bg-dots opacity-25"></div>' +
      '<div class="pointer-events-none absolute inset-6">' +
      ["left-0 top-0 border-l-2 border-t-2 rounded-tl-lg", "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg",
       "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg", "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg"]
        .map(function (c) { return '<span class="absolute h-9 w-9 ' + (active ? "border-accent" : "border-accent/50") + " " + c + '"></span>'; }).join("") +
      "</div>" + inner + "</div>";
  }

  function scannerIdle() {
    const host = $("#scanner");
    if (!host) return;
    const list = waiting();
    host.innerHTML =
      scannerFrame('<div class="relative text-center">' +
        '<span class="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-line bg-panel-2 text-accent">' +
        ui.icon("qr", "h-7 w-7") + "</span>" +
        '<p class="mt-4 text-sm font-medium">Ready to scan</p>' +
        '<p class="mt-1 text-xs text-mute">Hold the student pass inside the frame</p></div>') +
      '<div class="mt-5 space-y-3">' +
      '<label class="field-label" for="scanPick">Simulate a pass</label>' +
      '<select class="input-field" id="scanPick" aria-label="Choose a student pass to simulate">' +
      (list.length
        ? list.slice(0, 25).map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + " · " + esc(s.stop) + "</option>"; }).join("")
        : '<option value="">Everyone on this bus has boarded</option>') +
      "</select>" +
      '<button class="btn-primary btn-block btn-lg" data-scan' + (list.length ? "" : " disabled") + ">" +
      '<i data-icon="scan" data-icon-class="h-4 w-4"></i>Scan student pass</button>' +
      '<button class="btn-ghost btn-block btn-sm" data-manual>Enter student ID manually</button>' +
      "</div>";
    ui.hydrateIcons(host);
    const scanBtn = $("[data-scan]", host);
    if (scanBtn) scanBtn.addEventListener("click", function () {
      const id = $("#scanPick", host).value;
      if (id) scannerScanning(BF.get.student(id));
    });
    $("[data-manual]", host).addEventListener("click", manualEntry);
  }

  function scannerScanning(student) {
    const host = $("#scanner");
    host.innerHTML =
      scannerFrame('<div class="relative h-36 w-36 opacity-90">' + BF.QR.svg(BF.QR.payload(student), { color: "#22d3ee" }) + "</div>" +
        '<div class="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-accent shadow-[0_0_18px_2px_rgba(34,211,238,.85)]" style="animation: scanline 1.3s var(--ease-out-soft) infinite"></div>', true) +
      '<div class="mt-5 space-y-2.5">' +
      '<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Reading pass…</p>' +
      '<div class="skeleton h-3 w-40"></div><div class="skeleton h-3 w-56"></div></div>';
    scanTimer = setTimeout(function () { scannerVerified(student); }, ui.reducedMotion() ? 180 : 1300);
  }

  function scannerVerified(student) {
    pending = student;
    const host = $("#scanner");
    const expired = student.pass !== "active";
    const wrongBus = student.busId !== bus.id;
    const ok = !expired && !wrongBus;

    host.innerHTML =
      '<div class="rounded-2xl border p-5 ' + (ok ? "border-ok/35 bg-ok/[0.06]" : "border-bad/35 bg-bad/[0.06]") +
      '" style="animation: scale-in .32s var(--ease-premium) both" role="status">' +
      '<div class="flex items-center gap-3">' +
      '<span class="grid h-11 w-11 place-items-center rounded-full border ' +
      (ok ? "border-ok/40 bg-ok/15 text-ok" : "border-bad/40 bg-bad/15 text-bad") + '">' +
      ui.icon(ok ? "check" : "close", "h-5 w-5", 2.4) + "</span>" +
      "<div>" +
      '<p class="font-mono text-[10px] uppercase tracking-[0.22em] ' + (ok ? "text-ok" : "text-bad") + '">' +
      (ok ? "Student verified" : expired ? "Pass expired" : "Wrong bus") + "</p>" +
      '<p class="text-lg font-semibold tracking-[-0.01em]">' + esc(student.name) + "</p></div></div>" +

      '<dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">' +
      field("Student ID", student.id) + field("Bus", student.busId) +
      field("Boarding stop", student.stop) + field("Time", ui.clockNow()) +
      field("Route", (BF.get.route(student.routeId) || {}).short || "—") + field("Pass validity", student.validity) +
      "</dl>" +
      (ok ? "" : '<p class="mt-4 rounded-lg border border-bad/25 bg-bad/[0.06] p-3 text-xs leading-relaxed text-bad">' +
        (expired ? "This pass expired on 30 Jun 2026. Ask the student to renew at the transport desk."
                 : "This student is mapped to " + esc(student.busId) + ". Boarding here needs control-center approval.") + "</p>") +
      "</div>" +

      '<div class="mt-4 grid grid-cols-2 gap-2.5">' +
      '<button class="btn-secondary" data-cancel>Cancel</button>' +
      '<button class="' + (ok ? "btn-primary" : "btn-danger") + '" data-mark>' +
      '<i data-icon="userCheck" data-icon-class="h-4 w-4"></i>' + (ok ? "Mark attendance" : "Override") + "</button></div>";

    ui.hydrateIcons(host);
    $("[data-cancel]", host).addEventListener("click", function () { pending = null; scannerIdle(); });
    $("[data-mark]", host).addEventListener("click", function () { markAttendance(student); });
  }

  function field(label, value) {
    return '<div><dt class="mono-label">' + esc(label) + "</dt>" +
      '<dd class="mt-1 font-mono text-sm text-hi">' + esc(value) + "</dd></div>";
  }

  function markAttendance(student) {
    const result = BF.actions.markAttendance(student.id, { stop: student.stop, method: "QR" });
    if (result && result.duplicate) {
      ui.toast({ title: "Already scanned", msg: student.name + " boarded earlier on this trip.", type: "warning" });
      scannerIdle();
      return;
    }
    bus = BF.get.bus(conductor.busId);
    conductor.scansToday += 1;
    ui.toast({
      title: "Attendance marked",
      msg: student.name + " · " + student.stop + " · " + result.record.time,
      type: "success",
      icon: "userCheck"
    });
    scannerSuccess(student, result.record);
    paintCounter();
    paintWaiting();
    paintRecent();
  }

  function scannerSuccess(student, record) {
    const host = $("#scanner");
    host.innerHTML =
      '<div class="rounded-2xl border border-line bg-panel-2/50 p-6 text-center" style="animation: scale-in .3s var(--ease-premium) both">' +
      '<span class="mx-auto grid h-14 w-14 place-items-center rounded-full border border-ok/40 bg-ok/15 text-ok">' +
      ui.icon("checkCircle", "h-7 w-7") + "</span>" +
      '<p class="mt-4 text-sm font-medium">' + esc(student.name) + " boarded</p>" +
      '<p class="mono-label mt-1">' + esc(record.id) + " · " + esc(record.time) + "</p>" +
      '<p class="mt-6 font-mono text-4xl font-semibold tabular-nums">' + bus.occupancy +
      '<span class="text-xl text-mute">/' + bus.capacity + "</span></p>" +
      '<p class="mono-label mt-1">Students onboard</p>' +
      '<div class="mt-5 space-y-1.5 rounded-xl border border-line bg-ink/60 p-3 text-left">' +
      propagate("Attendance record created") +
      propagate("Occupancy updated on driver console") +
      propagate("Parent notified · " + student.parent) +
      propagate("Admin dashboard refreshed") +
      "</div>" +
      '<button class="btn-primary btn-block mt-5" data-again><i data-icon="scan" data-icon-class="h-4 w-4"></i>Scan next pass</button>' +
      "</div>";
    ui.hydrateIcons(host);
    $("[data-again]", host).addEventListener("click", scannerIdle);
  }

  function propagate(text) {
    return '<p class="flex items-center gap-2 text-[11px] text-mid">' +
      '<span class="text-ok">' + ui.icon("check", "h-3.5 w-3.5", 2.4) + "</span>" + esc(text) + "</p>";
  }

  function manualEntry() {
    ui.modal({
      kicker: "Fallback", title: "Manual boarding entry",
      subtitle: "Use this when a pass cannot be scanned.",
      size: "sm",
      body: '<label class="field-label" for="manualId">Student ID</label>' +
        '<input class="input-field font-mono" id="manualId" placeholder="GEHU2026-0117" data-autofocus />' +
        '<p class="mt-3 text-xs text-mute">Manual entries are flagged in the attendance report for review.</p>',
      footer: '<button class="btn-secondary" data-close>Cancel</button><button class="btn-primary" data-ok>Record boarding</button>',
      onMount: function (dialog) {
        $("[data-ok]", dialog).addEventListener("click", function () {
          const id = $("#manualId", dialog).value.trim();
          const student = BF.get.student(id);
          if (!student) {
            ui.toast({ title: "Student not found", msg: "Check the ID — e.g. GEHU2026-0117.", type: "warning" });
            return;
          }
          ui.closeModal();
          const res = BF.actions.markAttendance(student.id, { stop: student.stop, method: "Manual" });
          if (res && res.duplicate) {
            ui.toast({ title: "Already boarded", msg: student.name, type: "warning" });
            return;
          }
          bus = BF.get.bus(conductor.busId);
          ui.toast({ title: "Manual entry recorded", msg: student.name + " · flagged for review", type: "success" });
          paintCounter(); paintWaiting(); paintRecent();
          scannerSuccess(student, res.record);
        });
      }
    });
  }

  /* ---------- side lists ---------- */
  function paintWaiting() {
    const host = $("#waitList");
    if (!host) return;
    const all = waiting();
    const list = all.slice(0, 8);
    const count = $("#waitCount");
    if (count) count.textContent = all.length + " pending";
    host.innerHTML = list.length
      ? '<ul class="space-y-2">' + list.map(function (s) {
          return '<li><button class="flex w-full items-center gap-3 rounded-xl border border-line bg-panel-2/40 p-3 text-left transition-colors duration-200 hover:border-line-2 hover:bg-panel-3" data-quick-scan="' + s.id + '">' +
            ui.avatar(s.avatar) +
            '<span class="min-w-0 flex-1"><span class="block truncate text-sm">' + esc(s.name) + "</span>" +
            '<span class="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-mute">' + esc(s.stop) + "</span></span>" +
            '<span class="text-faint">' + ui.icon("scan", "h-4 w-4") + "</span></button></li>";
        }).join("") + "</ul>" +
        (all.length > list.length ? '<p class="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">+ ' + (all.length - list.length) + " more waiting</p>" : "")
      : C.empty({ icon: "checkCircle", title: "Everyone is onboard", message: "All students mapped to this bus have been scanned." });
    ui.hydrateIcons(host);
    $$("[data-quick-scan]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        scannerScanning(BF.get.student(b.getAttribute("data-quick-scan")));
        $("#scanner").scrollIntoView({ behavior: ui.reducedMotion() ? "auto" : "smooth", block: "center" });
      });
    });
  }

  function paintRecent() {
    const host = $("#recentList");
    if (!host) return;
    const rows = BF.state.attendance.filter(function (a) { return a.busId === bus.id; }).slice(0, 5);
    host.innerHTML = rows.length
      ? '<ul class="space-y-2">' + rows.map(function (a) {
          const s = BF.get.student(a.studentId) || { name: a.studentId, avatar: "??" };
          return '<li class="flex items-center gap-3 rounded-xl border border-line bg-panel-2/40 p-3">' +
            ui.avatar(s.avatar, "text-ok") +
            '<span class="min-w-0 flex-1"><span class="block truncate text-sm">' + esc(s.name) + "</span>" +
            '<span class="block font-mono text-[10px] uppercase tracking-[0.12em] text-mute">' + esc(a.stop) + " · " + esc(a.method) + "</span></span>" +
            '<span class="font-mono text-[11px] text-mid">' + esc(a.time) + "</span></li>";
        }).join("") + "</ul>"
      : C.empty({ icon: "qr", title: "No scans yet", message: "The first boarding of this trip will appear here." });
    ui.hydrateIcons(host);
  }

  /* ------------------------------------------------------------
     BOARDED / MANIFEST / ALERTS
     ------------------------------------------------------------ */
  function viewBoarded(host) {
    host.innerHTML =
      '<div class="flex flex-wrap items-end justify-between gap-3">' +
      '<div><h1 class="display text-2xl sm:text-3xl">Boarded</h1>' +
      '<p class="section-sub">Attendance recorded on ' + esc(bus.id) + " today</p></div>" +
      '<button class="btn-secondary btn-sm" data-reset><i data-icon="refresh" data-icon-class="h-3.5 w-3.5"></i>Reset demo</button></div>' +
      '<div class="mt-5" id="boardedList"></div>';
    paintBoarded();
    $("[data-reset]", host).addEventListener("click", function () {
      ui.confirm({
        title: "Reset demo attendance?",
        message: "Restores the seeded boarding list so you can run the scan demo again.",
        confirmLabel: "Reset",
        onConfirm: function () {
          BF.actions.resetAttendanceDemo();
          bus = BF.get.bus(conductor.busId);
          paintBoarded();
          ui.toast({ title: "Demo reset", type: "success", icon: "refresh" });
        }
      });
    });
  }

  function paintBoarded() {
    const host = $("#boardedList");
    if (!host) return;
    const rows = BF.state.attendance.filter(function (a) { return a.busId === bus.id; });
    host.innerHTML = rows.length
      ? '<div class="card overflow-hidden"><div class="table-container rounded-none border-0"><table>' +
        "<thead><tr><th>Record</th><th>Student</th><th>Stop</th><th>Time</th><th>Method</th><th>Status</th></tr></thead><tbody>" +
        rows.map(function (a) {
          const s = BF.get.student(a.studentId) || { name: a.studentId, avatar: "??" };
          return '<tr><td class="cell-mono text-mute">' + esc(a.id) + "</td>" +
            '<td><div class="flex items-center gap-3">' + ui.avatar(s.avatar, "text-ok") +
            '<div><p class="cell-strong">' + esc(s.name) + '</p><p class="text-xs text-mute">' + esc(a.studentId) + "</p></div></div></td>" +
            "<td>" + esc(a.stop) + "</td><td class=\"cell-mono\">" + esc(a.time) + "</td>" +
            '<td><span class="chip font-mono text-[10px]">' + esc(a.method) + "</span></td>" +
            "<td>" + ui.badge("present") + "</td></tr>";
        }).join("") + "</tbody></table></div></div>"
      : C.empty({ icon: "userCheck", title: "No boardings yet", message: "Scan a pass to start today's manifest.", action: "Open scanner" });
    ui.hydrateIcons(host);
    const act = $("[data-empty-action]", host);
    if (act) act.addEventListener("click", function () { ui.navigate("scan", { onNavigate: render }); });
  }

  function viewManifest(host) {
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Manifest</h1>' +
      '<p class="section-sub">Students mapped to ' + esc(bus.id) + " · " + esc(route.name) + "</p>" +
      '<div class="mt-5" id="manifestList"></div>';
    paintManifest();
  }

  function paintManifest() {
    const host = $("#manifestList");
    if (!host) return;
    const all = BF.get.studentsOnBus(bus.id);
    const students = all.slice(0, 24);
    host.innerHTML = all.length
      ? '<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">' + students.map(function (s, i) {
          return '<article class="card card-pad" data-reveal data-reveal-delay="' + (i * 40) + '">' +
            '<div class="flex items-start justify-between gap-3">' +
            '<div class="flex items-center gap-3">' + ui.avatar(s.avatar, s.boarded ? "text-ok" : "text-mute") +
            '<div><p class="text-sm font-medium">' + esc(s.name) + "</p>" +
            '<p class="mono-label mt-0.5">' + esc(s.id) + "</p></div></div>" +
            (s.boarded ? ui.badge("running", "boarded") : ui.badge("idle", "waiting")) + "</div>" +
            '<div class="mt-4 flex items-center justify-between text-xs text-mute">' +
            "<span>" + esc(s.stop) + "</span>" + ui.badge(s.pass === "active" ? "approved" : "expired", s.pass) + "</div></article>";
        }).join("") + "</div>" +
        (all.length > students.length ? '<p class="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Showing ' + students.length + " of " + all.length + " students on the manifest</p>" : "")
      : C.empty({ icon: "users", title: "Empty manifest", message: "No students are mapped to this bus yet." });
    ui.hydrateIcons(host);
    ui.observeReveal(host);
  }

  function viewAlerts(host) {
    const items = BF.get.notificationsFor("conductor");
    host.innerHTML =
      '<h1 class="display text-2xl sm:text-3xl">Alerts</h1>' +
      '<p class="section-sub">Messages from the control center and driver</p>' +
      '<div class="mt-5 grid gap-2.5">' +
      (items.length ? items.map(C.notificationRow).join("")
        : C.empty({ icon: "bell", title: "No alerts", message: "Dispatch messages will appear here." })) + "</div>";
    ui.hydrateIcons(host);
  }
})(window);
