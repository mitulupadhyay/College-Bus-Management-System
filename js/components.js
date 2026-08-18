/* ============================================================
   BusFlow · js/components.js
   Shared render helpers — every page composes these instead of
   duplicating markup. All functions return HTML strings; icons
   are hydrated by BusFlow.ui.hydrateIcons().
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const esc = ui.esc;
  const C = {};

  /* ---------- KPI tile ---------- */
  C.kpi = function (o) {
    return '<article class="stat-card flex flex-col" data-reveal>' +
      '<div class="flex items-start justify-between gap-3">' +
      '<p class="stat-label min-h-[2.4em] max-w-[10rem] leading-[1.35]">' + esc(o.label) + "</p>" +
      '<span class="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/[0.03] ' + (o.tone || "text-accent") + '">' +
      ui.icon(o.icon, "h-4 w-4") + "</span></div>" +
      '<p class="stat-value mt-4" data-count="' + o.value + '"' +
      (o.decimals ? ' data-decimals="' + o.decimals + '"' : "") +
      (o.suffix ? ' data-suffix="' + o.suffix + '"' : "") +
      (o.pad ? ' data-pad="' + o.pad + '"' : "") + ">0</p>" +
      (o.hint
        ? '<p class="mt-auto flex items-start gap-1.5 pt-3 text-xs leading-snug ' + (o.hintTone || "text-mute") + '">' +
          (o.hintIcon ? ui.icon(o.hintIcon, "h-3.5 w-3.5 shrink-0 translate-y-px") : "") + esc(o.hint) + "</p>"
        : "") +
      "</article>";
  };

  /* ---------- Bus status card ---------- */
  C.busCard = function (bus, opts) {
    const o = opts || {};
    const route = BF.get.route(bus.routeId);
    const driver = BF.get.driverOf(bus.id);
    const next = ui.nextStop(bus);
    const eta = bus.status === "arrived" ? "ARRIVED" : (bus.etaMin != null ? bus.etaMin + " MIN" : "—");
    return '<article class="card card-hover overflow-hidden' + (o.selected ? " border-accent/40" : "") + '" data-bus-card="' + bus.id + '">' +
      '<div class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">' +
      '<div class="flex items-center gap-2.5">' +
      '<span class="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/[0.03]" style="color:' + route.color + '">' +
      ui.icon("bus", "h-4 w-4") + "</span>" +
      '<div><p class="font-mono text-sm font-medium text-hi">' + esc(bus.id) + "</p>" +
      '<p class="mono-label">' + esc(route.short) + "</p></div></div>" +
      ui.badge(bus.status) + "</div>" +
      '<div class="grid grid-cols-2 gap-px bg-line">' +
      '<div class="bg-panel px-4 py-3"><p class="mono-label">ETA</p>' +
      '<p class="mt-1 font-mono text-lg tabular-nums ' + (bus.status === "delayed" ? "text-warn" : "text-hi") + '">' + esc(eta) + "</p></div>" +
      '<div class="bg-panel px-4 py-3"><p class="mono-label">Occupancy</p>' +
      '<p class="mt-1 font-mono text-lg tabular-nums text-hi">' + bus.occupancy + "<span class=\"text-mute\">/" + bus.capacity + "</span></p></div>" +
      "</div>" +
      '<div class="space-y-2.5 px-4 py-3.5">' +
      '<div class="flex items-center justify-between gap-3 text-xs"><span class="text-mute">Next stop</span>' +
      '<span class="truncate text-mid">' + esc(next ? next.name : "—") + "</span></div>" +
      (o.showDriver !== false
        ? '<div class="flex items-center justify-between gap-3 text-xs"><span class="text-mute">Driver</span>' +
          '<span class="truncate text-mid">' + esc(driver ? driver.name : "Unassigned") + "</span></div>"
        : "") +
      '<div class="pt-1">' + ui.occupancyBar(bus.occupancy, bus.capacity) + "</div>" +
      "</div></article>";
  };

  /* ---------- Route stop timeline ---------- */
  C.routeTimeline = function (route, bus, opts) {
    const o = opts || {};
    const progress = bus ? bus.progress : (o.progress || 0);
    return '<ol class="timeline">' + route.stops.map(function (stop, i) {
      const done = stop.t < progress - 0.02;
      const isCurrent = !done && (i === 0 || route.stops[i - 1].t <= progress);
      const state = done ? "done" : isCurrent ? "current" : "upcoming";
      const nodeCls = done ? "tl-node tl-done" : isCurrent ? "tl-node tl-current" : "tl-node";
      return '<li class="tl-item" data-stop-state="' + state + '">' +
        '<span class="' + nodeCls + '">' +
        (done ? ui.icon("check", "h-3 w-3", 2.4) : isCurrent ? '<span class="h-2 w-2 rounded-full bg-current"></span>' : "") +
        "</span>" +
        '<div class="min-w-0 flex-1 pt-0.5">' +
        '<div class="flex flex-wrap items-center justify-between gap-2">' +
        '<p class="text-sm font-medium ' + (done ? "text-mid" : isCurrent ? "text-hi" : "text-mute") + '">' + esc(stop.name) + "</p>" +
        '<p class="font-mono text-[11px] ' + (isCurrent ? "text-accent" : "text-faint") + '">' + esc(stop.time) + "</p></div>" +
        '<p class="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ' +
        (done ? "text-ok/70" : isCurrent ? "text-accent" : "text-faint") + '">' +
        (done ? "Completed" : isCurrent ? "Current" : "Upcoming") +
        (o.showDistance ? " · " + (route.distanceKm * stop.t).toFixed(1) + " km" : "") +
        "</p></div></li>";
    }).join("") + "</ol>";
  };

  /* ---------- Digital bus pass ---------- */
  C.passCard = function (student, opts) {
    const o = opts || {};
    const route = BF.get.route(student.routeId);
    const qr = BF.QR.svg(BF.QR.payload(student), { cells: 25, color: "#06070a", className: "h-full w-full" });
    const expired = student.pass !== "active";
    return '<div class="relative overflow-hidden rounded-[1.4rem] border border-line-2 bg-gradient-to-br from-panel-2 to-ink p-px shadow-[var(--shadow-pop)]" data-pass>' +
      '<div class="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-accent/15 blur-3xl"></div>' +
      '<div class="relative rounded-[1.35rem] bg-ink/85 p-5 sm:p-6">' +

      '<div class="flex items-start justify-between gap-4">' +
      "<div>" +
      '<div class="flex items-center gap-2">' + ui.logoMark("h-7 w-7") +
      '<p class="text-sm font-semibold tracking-[-0.01em]">BusFlow</p></div>' +
      '<p class="mono-label mt-2">College Transport Pass</p></div>' +
      '<span class="status-badge ' + (expired ? "status-alert" : "status-running") + '"><span class="dot"></span>' +
      (expired ? "Expired" : "Active") + "</span></div>" +

      '<div class="mt-6 flex items-start gap-5">' +
      '<div class="min-w-0 flex-1">' +
      '<p class="truncate text-xl font-semibold tracking-[-0.02em]">' + esc(student.name) + "</p>" +
      '<p class="mt-1 text-xs text-mute">' + esc(student.dept) + " · " + esc(student.year) + "</p>" +
      '<dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5">' +
      passField("Student ID", student.id) +
      passField("Bus", student.busId) +
      passField("Route", route ? route.short : "—") +
      passField("Valid", student.validity) +
      "</dl></div>" +
      '<div class="shrink-0">' +
      '<div class="grid h-28 w-28 place-items-center rounded-xl bg-white p-2 sm:h-32 sm:w-32">' + qr + "</div>" +
      '<p class="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-faint">Scan at boarding</p>' +
      "</div></div>" +

      '<div class="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">' +
      '<div><p class="mono-label">Boarding stop</p>' +
      '<p class="mt-1 text-sm text-mid">' + esc(student.stop) + "</p></div>" +
      (o.actions === false ? "" :
        '<div class="flex gap-2">' +
        '<button class="btn-secondary btn-sm" data-pass-share><i data-icon="qr" data-icon-class="h-3.5 w-3.5"></i>Show</button>' +
        '<button class="btn-primary btn-sm" data-pass-download><i data-icon="download" data-icon-class="h-3.5 w-3.5"></i>Download</button></div>') +
      "</div></div></div>";
  };

  function passField(label, value) {
    return '<div><dt class="mono-label">' + esc(label) + "</dt>" +
      '<dd class="mt-1 font-mono text-sm text-hi">' + esc(value) + "</dd></div>";
  }

  /* ---------- Notification row ---------- */
  C.notificationRow = function (n) {
    const tone = ui.noteTone(n.type);
    return '<div class="flex items-start gap-3 rounded-xl border border-line bg-panel/60 p-3.5' +
      (n.read ? " opacity-70" : "") + '">' +
      '<span class="toast-icon ' + tone.cls + '">' + ui.icon(tone.icon, "h-4 w-4") + "</span>" +
      '<div class="min-w-0 flex-1">' +
      '<div class="flex items-start justify-between gap-3">' +
      '<p class="text-sm font-medium text-hi">' + esc(n.title) + "</p>" +
      (n.read ? "" : '<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"></span>') + "</div>" +
      '<p class="mt-1 text-xs leading-relaxed text-mute">' + esc(n.body) + "</p>" +
      '<p class="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">' + esc(n.time) + "</p>" +
      "</div></div>";
  };

  /* ---------- Empty / loading states ---------- */
  C.empty = function (o) {
    return '<div class="empty-state">' +
      '<span class="empty-icon">' + ui.icon(o.icon || "info", "h-5 w-5") + "</span>" +
      '<p class="text-sm font-medium text-hi">' + esc(o.title) + "</p>" +
      (o.message ? '<p class="max-w-[34ch] text-xs leading-relaxed text-mute">' + esc(o.message) + "</p>" : "") +
      (o.action ? '<button class="btn-secondary btn-sm mt-1" data-empty-action>' + esc(o.action) + "</button>" : "") +
      "</div>";
  };

  C.skeletonRows = function (rows, cols) {
    let out = "";
    for (let r = 0; r < (rows || 5); r++) {
      out += '<div class="flex items-center gap-4 border-b border-line px-4 py-3.5">';
      for (let c = 0; c < (cols || 4); c++) {
        out += '<div class="skeleton h-3.5" style="width:' + [22, 30, 18, 14, 12][c % 5] + '%"></div>';
      }
      out += "</div>";
    }
    return '<div class="overflow-hidden rounded-xl border border-line bg-panel/40" aria-hidden="true">' + out + "</div>";
  };

  C.skeletonCards = function (n) {
    let out = "";
    for (let i = 0; i < (n || 4); i++) {
      out += '<div class="card p-5"><div class="skeleton h-3 w-20"></div>' +
        '<div class="skeleton mt-4 h-7 w-24"></div><div class="skeleton mt-4 h-2.5 w-full"></div></div>';
    }
    return out;
  };

  /* ---------- Section header ---------- */
  C.sectionHead = function (title, sub, right) {
    return '<div class="flex flex-wrap items-end justify-between gap-4">' +
      '<div><h2 class="section-title">' + esc(title) + "</h2>" +
      (sub ? '<p class="section-sub">' + esc(sub) + "</p>" : "") + "</div>" +
      (right ? '<div class="flex flex-wrap items-center gap-2">' + right + "</div>" : "") + "</div>";
  };

  /* ---------- Mini bar chart (attendance reports) ---------- */
  C.barChart = function (data, opts) {
    const o = opts || {};
    const max = Math.max.apply(null, data.map(function (d) { return d.total; }));
    return '<div class="flex items-end gap-2.5" style="height:' + (o.height || 150) + 'px">' +
      data.map(function (d) {
        const pct = Math.round((d.present / d.total) * 100);
        const h = Math.round((d.present / max) * 100);
        return '<div class="group flex flex-1 flex-col items-center justify-end gap-2" title="' + esc(d.day) + ": " + pct + '%">' +
          '<span class="font-mono text-[10px] text-mute opacity-0 transition-opacity duration-200 group-hover:opacity-100">' + pct + "%</span>" +
          '<div class="relative w-full overflow-hidden rounded-md bg-white/[0.04]" style="height:' + h + '%">' +
          '<div class="absolute inset-0 rounded-md bg-gradient-to-t from-accent/25 to-accent/70 transition-opacity duration-300 group-hover:opacity-90"></div></div>' +
          '<span class="mono-label">' + esc(d.day) + "</span></div>";
      }).join("") + "</div>";
  };

  /* ---------- Donut (occupancy / on-time) ---------- */
  C.donut = function (percent, label, tone) {
    const r = 42, circ = 2 * Math.PI * r;
    const off = circ * (1 - percent / 100);
    return '<div class="relative grid place-items-center">' +
      '<svg viewBox="0 0 100 100" class="h-32 w-32 -rotate-90">' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="8"/>' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + (tone || "#22d3ee") + '" stroke-width="8" stroke-linecap="round" ' +
      'stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" style="transition:stroke-dashoffset 1s var(--ease-premium)"/></svg>' +
      '<div class="absolute text-center"><p class="font-mono text-xl font-semibold tabular-nums">' + percent + "%</p>" +
      '<p class="mono-label mt-0.5">' + esc(label) + "</p></div></div>";
  };

  BF.components = C;
})(window);
