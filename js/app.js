/* ============================================================
   BusFlow · js/app.js
   Shared application shell + UI kit used by every page.

   Contents
     1. helpers            6. modal
     2. icon registry      7. notification drawer
     3. motion utilities   8. app shell (sidebar / topbar / mobile nav)
     4. number counters    9. command palette (instant search)
     5. toasts            10. live simulation engine
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = {};

  /* ------------------------------------------------------------
     1. HELPERS
     ------------------------------------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function el(tag, attrs, html) {
    const node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    if (html != null) node.innerHTML = html;
    return node;
  }

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function clockNow() {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return pad(h) + ":" + pad(d.getMinutes()) + " " + ampm;
  }

  /** "07:42 AM" → minutes since midnight (used for sorting records). */
  function timeToMinutes(t) {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(t || "").trim());
    if (!m) return -1;
    let h = parseInt(m[1], 10) % 12;
    if (m[3] && m[3].toUpperCase() === "PM") h += 12;
    return h * 60 + parseInt(m[2], 10);
  }

  function statusClass(status) {
    return ({
      running: "status-running",
      delayed: "status-delayed",
      arrived: "status-arrived",
      idle: "status-idle",
      maintenance: "status-idle",
      active: "status-running",
      present: "status-running",
      approved: "status-running",
      pending: "status-pending",
      rejected: "status-alert",
      open: "status-alert",
      "in-review": "status-delayed",
      resolved: "status-running",
      expired: "status-alert"
    })[status] || "status-idle";
  }

  function badge(status, label) {
    return '<span class="status-badge ' + statusClass(status) + '"><span class="dot"></span>' +
      esc(label || status) + "</span>";
  }

  function occupancyBar(occ, cap) {
    const pct = Math.round((occ / cap) * 100);
    const tone = pct > 92 ? "bg-bad" : pct > 78 ? "bg-warn" : "bg-accent";
    return '<div class="flex items-center gap-2.5">' +
      '<div class="h-1.5 w-20 overflow-hidden rounded-full bg-white/8">' +
      '<div class="h-full rounded-full ' + tone + ' transition-[width] duration-700" style="width:' + pct + '%"></div>' +
      "</div>" +
      '<span class="font-mono text-xs text-mid tabular-nums">' + occ + "/" + cap + "</span></div>";
  }

  function avatar(initials, tone) {
    return '<span class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-panel-3 font-mono text-[11px] ' +
      (tone || "text-accent") + '">' + esc(initials) + "</span>";
  }

  /* ------------------------------------------------------------
     2. ICON REGISTRY  (24×24, stroke based — no icon-font needed)
     ------------------------------------------------------------ */
  const ICONS = {
    bus: '<rect x="3" y="4" width="18" height="12.5" rx="2.5"/><path d="M3 10.5h18"/><path d="M7 16.5v2.2M17 16.5v2.2"/><circle cx="7.5" cy="19.2" r="1.4"/><circle cx="16.5" cy="19.2" r="1.4"/><path d="M8 7.2h3M13 7.2h3"/>',
    route: '<circle cx="6" cy="19" r="2.6"/><circle cx="18" cy="5" r="2.6"/><path d="M9 19h6.2a3.4 3.4 0 0 0 0-6.8H8.6a3.4 3.4 0 0 1 0-6.8H15"/>',
    pin: '<path d="M20 10.4c0 5.6-8 11.6-8 11.6s-8-6-8-11.6a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10.2" r="2.8"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M12 3v3M21 12h-3M12 21v-3M3 12h3"/>',
    users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.5 5.4a3.4 3.4 0 0 1 0 6.6"/><path d="M18 20a6 6 0 0 0-2.2-4.6"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    userCheck: '<circle cx="10" cy="8" r="3.8"/><path d="M3 20.5a7.5 7.5 0 0 1 12.4-5.7"/><path d="m16.5 18.4 1.9 1.9 3.6-3.9"/>',
    steering: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 15v6M9.4 11.2 3.4 9.6M14.6 11.2l6-1.6"/>',
    qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h3v3h-3zM20.5 14v3M17.5 20.5h3M14 20.5h.01"/>',
    scan: '<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><path d="M4 12h16"/>',
    bell: '<path d="M6.2 9.4a5.8 5.8 0 0 1 11.6 0c0 6.3 2.4 7.6 2.4 7.6H3.8s2.4-1.3 2.4-7.6"/><path d="M10.2 20.2a2.1 2.1 0 0 0 3.6 0"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.4"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/>',
    alert: '<path d="M10.3 4.1 2.6 17.4A1.9 1.9 0 0 0 4.2 20.3h15.6a1.9 1.9 0 0 0 1.6-2.9L13.7 4.1a1.9 1.9 0 0 0-3.4 0Z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/>',
    siren: '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M4.5 21h15"/><path d="M12 2.5v2M4.6 6.2 6 7.3M19.4 6.2 18 7.3"/>',
    message: '<path d="M20.5 14.5a2.4 2.4 0 0 1-2.4 2.4H8.2L3.5 21V5.9a2.4 2.4 0 0 1 2.4-2.4h12.2a2.4 2.4 0 0 1 2.4 2.4Z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    report: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/>',
    settings: '<path d="M20 7h-8.5M7 7H4M20 17h-3M12.5 17H4"/><circle cx="9.4" cy="7" r="2.4"/><circle cx="14.8" cy="17" r="2.4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    chevronRight: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    chevronDown: '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
    chevronLeft: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 6.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>',
    gauge: '<path d="M3.6 18.5a9.5 9.5 0 1 1 16.8 0"/><path d="m12 13.6 3.6-3.8"/><circle cx="12" cy="14.4" r="1.3" fill="currentColor" stroke="none"/>',
    shield: '<path d="M12 21.5s7.6-3.6 7.6-9.4V5.6L12 2.7 4.4 5.6v6.5c0 5.8 7.6 9.4 7.6 9.4Z"/><path d="m9.2 11.8 2 2 3.6-3.9"/>',
    logout: '<path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 16.5 4.5-4.5L16 7.5"/><path d="M20.5 12H9.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12.5 20.5H21"/><path d="M16.2 3.7a2 2 0 0 1 2.8 2.8L8.4 17.1l-4 1.2 1.2-4Z"/>',
    trash: '<path d="M3.5 6.5h17"/><path d="M8.5 6.5V4.8a1.4 1.4 0 0 1 1.4-1.4h4.2a1.4 1.4 0 0 1 1.4 1.4v1.7"/><path d="M18.5 6.5 17.7 19a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6.5"/><path d="M10.5 10.5v6M13.5 10.5v6"/>',
    eye: '<path d="M2.5 12S6.2 5.5 12 5.5 21.5 12 21.5 12 17.8 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 3.5v11.5"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4.5 20.5h15"/>',
    phone: '<path d="M6.2 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z"/>',
    navigation: '<path d="m3.5 11 17-8-8 17-1.9-7.1Z"/>',
    activity: '<path d="M21.5 12h-4l-3 8.5-5-17-3 8.5h-4"/>',
    arrowRight: '<path d="M4.5 12h15"/><path d="m13 5.5 6.5 6.5-6.5 6.5"/>',
    arrowUpRight: '<path d="M7.5 16.5 16.5 7.5"/><path d="M9 7.5h7.5V15"/>',
    play: '<path d="M7 4.8 19 12 7 19.2Z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    home: '<path d="m3.5 10.5 8.5-7 8.5 7V19a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path d="M9.5 21v-6.5h5V21"/>',
    layers: '<path d="m12 3 9 4.8-9 4.8-9-4.8Z"/><path d="m3 12.5 9 4.8 9-4.8"/>',
    zap: '<path d="m13.2 2.5-9 12h6.6l-1 7 9-12h-6.6Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="m3.6 6.5 8.4 6 8.4-6"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.4"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>',
    sparkles: '<path d="m12 3 1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8Z"/><path d="m18.5 15.5.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z"/>',
    building: '<path d="M3.5 21h17"/><path d="M6 21V5.4A1.9 1.9 0 0 1 7.9 3.5h8.2A1.9 1.9 0 0 1 18 5.4V21"/><path d="M9.5 7.5h1.5M13 7.5h1.5M9.5 11.5h1.5M13 11.5h1.5M9.5 15.5h5V21h-5Z"/>',
    graduation: '<path d="m12 3.5 9.5 4.4L12 12.3 2.5 7.9Z"/><path d="M6.5 10.3v4.9c0 1.7 2.5 3.1 5.5 3.1s5.5-1.4 5.5-3.1v-4.9"/>',
    trending: '<path d="m21.5 7-8.4 8.4-4.2-4.2L2.5 17"/><path d="M15.5 7h6v6"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 4v5h-5"/>',
    filter: '<path d="M3.5 5.5h17l-6.6 7.7V19l-3.8 2v-7.8Z"/>',
    sort: '<path d="M4 7h11M4 12h8M4 17h5"/><path d="m17 9.5 3-3 3 3M20 6.5V17"/>',
    wifi: '<path d="M2.5 9.2a15 15 0 0 1 19 0"/><path d="M5.8 12.8a10 10 0 0 1 12.4 0"/><path d="M9.2 16.3a5 5 0 0 1 5.6 0"/><path d="M12 20h.01"/>',
    fuel: '<path d="M4.5 21V5.4A1.9 1.9 0 0 1 6.4 3.5h5.2A1.9 1.9 0 0 1 13.5 5.4V21"/><path d="M3 21h12"/><path d="M13.5 10.5h2.6a2 2 0 0 1 2 2V17a1.7 1.7 0 0 0 3.4 0V9.6l-2.6-2.6"/><path d="M6.5 8.5h5"/>',
    id: '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.2 16.4a3.7 3.7 0 0 1 6.6 0M14.5 10h4.5M14.5 13.5h3"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21"/>',
    doc: '<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z"/><path d="M13.5 3.5V9H19"/>',
    star: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8Z"/>',
    moon: '<path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a8.6 8.6 0 1 0 10.7 10.7Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8 2.5 2.5-2 2 1.8 1.8-2.4 2.4-1.8-1.8-2 2"/>'
  };

  ui.icon = function (name, cls, strokeWidth) {
    const d = ICONS[name] || ICONS.info;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (strokeWidth || 1.6) +
      '" stroke-linecap="round" stroke-linejoin="round" class="' + (cls || "h-5 w-5") +
      '" aria-hidden="true">' + d + "</svg>";
  };

  /** Replaces every <i data-icon="bus"> in a subtree with an inline SVG. */
  ui.hydrateIcons = function (root) {
    $$("[data-icon]", root || document).forEach(function (node) {
      const name = node.getAttribute("data-icon");
      const cls = node.getAttribute("data-icon-class") || node.className || "h-5 w-5";
      node.outerHTML = ui.icon(name, cls, node.getAttribute("data-icon-stroke"));
    });
  };

  /* ------------------------------------------------------------
     3. MOTION
     ------------------------------------------------------------ */
  const reduced = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener: function () {} };

  ui.reducedMotion = function () { return reduced.matches; };

  /** [data-reveal] elements fade up once they enter the viewport. */
  ui.observeReveal = function (root) {
    const items = $$("[data-reveal]", root || document).filter(function (n) { return !n.__revealed; });
    if (!items.length) return;
    if (ui.reducedMotion() || !("IntersectionObserver" in global)) {
      items.forEach(function (n) { n.__revealed = true; n.style.opacity = 1; n.style.transform = "none"; });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        node.__revealed = true;
        const delay = parseInt(node.getAttribute("data-reveal-delay") || "0", 10);
        setTimeout(function () {
          node.style.opacity = 1;
          node.style.transform = "none";
        }, delay);
        io.unobserve(node);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (n) {
      n.style.opacity = 0;
      n.style.transform = "translateY(18px)";
      n.style.transition = "opacity .7s var(--ease-premium), transform .7s var(--ease-premium)";
      io.observe(n);
    });
  };

  /* ------------------------------------------------------------
     4. NUMBER COUNTERS
     ------------------------------------------------------------ */
  ui.countTo = function (node, target, opts) {
    const o = opts || {};
    const decimals = o.decimals || 0;
    const prefix = o.prefix || "";
    const suffix = o.suffix || "";
    const padTo = o.pad || 0;
    const dur = ui.reducedMotion() ? 0 : (o.duration || 1100);
    const from = o.from != null ? o.from : 0;
    const start = performance.now();

    function fmt(v) {
      let s = decimals ? v.toFixed(decimals) : String(Math.round(v));
      if (padTo) s = s.padStart(padTo, "0");
      else if (!decimals && Math.abs(v) >= 1000) s = Math.round(v).toLocaleString("en-IN");
      return prefix + s + suffix;
    }
    if (!dur) { node.textContent = fmt(target); return; }

    (function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (target - from) * eased);
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  };

  /** Animate every [data-count] once it scrolls into view. */
  ui.hydrateCounters = function (root) {
    const nodes = $$("[data-count]", root || document).filter(function (n) { return !n.__counted; });
    const run = function (n) {
      n.__counted = true;
      ui.countTo(n, parseFloat(n.getAttribute("data-count")), {
        decimals: parseInt(n.getAttribute("data-decimals") || "0", 10),
        suffix: n.getAttribute("data-suffix") || "",
        prefix: n.getAttribute("data-prefix") || "",
        pad: parseInt(n.getAttribute("data-pad") || "0", 10),
        duration: parseInt(n.getAttribute("data-duration") || "1100", 10)
      });
    };
    if (!("IntersectionObserver" in global)) { nodes.forEach(run); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  };

  /* ------------------------------------------------------------
     5. TOASTS
     ------------------------------------------------------------ */
  function toastStack() {
    let stack = $("#toastStack");
    if (!stack) {
      stack = el("div", { id: "toastStack", class: "toast-stack", role: "status", "aria-live": "polite" });
      document.body.appendChild(stack);
    }
    return stack;
  }

  const TOAST_TONE = {
    success: { icon: "checkCircle", cls: "text-ok" },
    info: { icon: "info", cls: "text-accent" },
    warning: { icon: "alert", cls: "text-warn" },
    danger: { icon: "siren", cls: "text-bad" },
    boarding: { icon: "userCheck", cls: "text-ok" },
    bus: { icon: "bus", cls: "text-accent" }
  };

  ui.toast = function (opts) {
    const o = typeof opts === "string" ? { title: opts } : (opts || {});
    const tone = TOAST_TONE[o.type] || TOAST_TONE.info;
    const node = el("div", { class: "toast", role: "alert" },
      '<span class="toast-icon ' + tone.cls + '">' + ui.icon(o.icon || tone.icon, "h-4 w-4") + "</span>" +
      '<div class="min-w-0 flex-1">' +
      '<p class="toast-title">' + esc(o.title || "") + "</p>" +
      (o.msg ? '<p class="toast-msg">' + esc(o.msg) + "</p>" : "") +
      "</div>" +
      '<button class="btn-icon h-7 w-7 border-transparent bg-transparent" aria-label="Dismiss notification">' +
      ui.icon("close", "h-3.5 w-3.5") + "</button>");

    const stack = toastStack();
    stack.appendChild(node);
    const kill = function () {
      node.style.transition = "opacity .25s ease, transform .35s var(--ease-premium)";
      node.style.opacity = 0;
      node.style.transform = "translateX(16px)";
      setTimeout(function () { node.remove(); }, 260);
    };
    $("button", node).addEventListener("click", kill);
    setTimeout(kill, o.duration || 4200);
    while (stack.children.length > 4) stack.firstElementChild.remove();
    return node;
  };

  /* ------------------------------------------------------------
     6. MODAL
     ------------------------------------------------------------ */
  let openModal = null;

  ui.modal = function (opts) {
    const o = opts || {};
    ui.closeModal();

    const backdrop = el("div", { class: "modal-backdrop", role: "presentation" });
    const dialog = el("div", {
      class: "modal " + (o.size === "lg" ? "max-w-3xl" : o.size === "sm" ? "max-w-md" : "max-w-lg"),
      role: "dialog",
      "aria-modal": "true",
      "aria-label": o.title || "Dialog"
    },
      '<div class="modal-head">' +
      "<div>" +
      (o.kicker ? '<p class="kicker mb-2">' + esc(o.kicker) + "</p>" : "") +
      '<h2 class="text-base font-semibold text-hi">' + esc(o.title || "") + "</h2>" +
      (o.subtitle ? '<p class="mt-1 text-sm text-mute">' + esc(o.subtitle) + "</p>" : "") +
      "</div>" +
      '<button class="btn-icon" data-close aria-label="Close dialog">' + ui.icon("close", "h-4 w-4") + "</button>" +
      "</div>" +
      '<div class="modal-body">' + (o.body || "") + "</div>" +
      (o.footer ? '<div class="modal-foot">' + o.footer + "</div>" : ""));

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    ui.hydrateIcons(dialog);

    const previous = document.activeElement;
    const focusables = function () {
      return $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', dialog)
        .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
    };
    setTimeout(function () {
      const f = $("[data-autofocus]", dialog) || focusables()[0];
      if (f) f.focus();
    }, 40);

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); ui.closeModal(); }
      if (e.key === "Tab") {
        const list = focusables();
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    backdrop.addEventListener("mousedown", function (e) { if (e.target === backdrop) ui.closeModal(); });
    $$("[data-close]", dialog).forEach(function (b) { b.addEventListener("click", function () { ui.closeModal(); }); });

    openModal = {
      root: backdrop, dialog: dialog,
      destroy: function () {
        document.removeEventListener("keydown", onKey);
        backdrop.style.transition = "opacity .18s ease";
        backdrop.style.opacity = 0;
        setTimeout(function () { backdrop.remove(); }, 170);
        document.body.style.overflow = "";
        if (previous && previous.focus) previous.focus();
      }
    };
    if (typeof o.onMount === "function") o.onMount(dialog);
    return openModal;
  };

  ui.closeModal = function () {
    if (openModal) { openModal.destroy(); openModal = null; }
  };

  /** Confirmation dialog helper. */
  ui.confirm = function (opts) {
    const o = opts || {};
    ui.modal({
      title: o.title || "Are you sure?",
      subtitle: o.subtitle,
      size: "sm",
      body: '<p class="text-sm leading-relaxed text-mid">' + esc(o.message || "") + "</p>",
      footer: '<button class="btn-secondary" data-close>Cancel</button>' +
        '<button class="' + (o.danger ? "btn-danger" : "btn-primary") + '" data-confirm>' + esc(o.confirmLabel || "Confirm") + "</button>",
      onMount: function (dialog) {
        $("[data-confirm]", dialog).addEventListener("click", function () {
          ui.closeModal();
          if (typeof o.onConfirm === "function") o.onConfirm();
        });
      }
    });
  };

  /* ------------------------------------------------------------
     7. NOTIFICATION DRAWER
     ------------------------------------------------------------ */
  const NOTE_TONE = {
    boarding: { icon: "userCheck", cls: "text-ok" },
    delay: { icon: "clock", cls: "text-warn" },
    arrival: { icon: "pin", cls: "text-accent" },
    leave: { icon: "calendar", cls: "text-violet" },
    sos: { icon: "siren", cls: "text-bad" },
    complaint: { icon: "message", cls: "text-warn" },
    fleet: { icon: "bus", cls: "text-accent" },
    info: { icon: "info", cls: "text-accent" }
  };

  ui.noteTone = function (type) { return NOTE_TONE[type] || NOTE_TONE.info; };

  function notificationItem(n) {
    const tone = ui.noteTone(n.type);
    return '<li><button class="group flex w-full gap-3 border-b border-line px-5 py-4 text-left transition-colors duration-200 hover:bg-white/[0.03]" data-note="' + n.id + '">' +
      '<span class="toast-icon ' + tone.cls + '">' + ui.icon(tone.icon, "h-4 w-4") + "</span>" +
      '<span class="min-w-0 flex-1">' +
      '<span class="flex items-start justify-between gap-3">' +
      '<span class="text-sm font-medium ' + (n.read ? "text-mid" : "text-hi") + '">' + esc(n.title) + "</span>" +
      (n.read ? "" : '<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"></span>') +
      "</span>" +
      '<span class="mt-1 block text-xs leading-relaxed text-mute">' + esc(n.body) + "</span>" +
      '<span class="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">' + esc(n.time) + "</span>" +
      "</span></button></li>";
  }

  let drawerEl = null;

  ui.openNotifications = function (audience) {
    if (drawerEl) return ui.closeNotifications();
    const list = BF.get.notificationsFor(audience);
    const overlay = el("div", { class: "fixed inset-0 z-[94] bg-black/60 backdrop-blur-sm", style: "animation: fade-in .3s var(--ease-premium)" });
    const drawer = el("aside", { class: "drawer", role: "dialog", "aria-modal": "true", "aria-label": "Notifications" },
      '<header class="flex items-center justify-between gap-3 border-b border-line px-5 py-4">' +
      "<div>" +
      '<h2 class="text-sm font-semibold text-hi">Notifications</h2>' +
      '<p class="mono-label mt-1">Event queue · FIFO</p>' +
      "</div>" +
      '<div class="flex items-center gap-2">' +
      '<button class="btn-ghost btn-sm" data-readall>Mark all read</button>' +
      '<button class="btn-icon" data-close aria-label="Close notifications">' + ui.icon("close", "h-4 w-4") + "</button>" +
      "</div></header>" +
      '<div class="flex-1 overflow-y-auto" data-list>' +
      (list.length
        ? '<ul class="divide-y divide-line">' + list.map(notificationItem).join("") + "</ul>"
        : '<div class="p-6"><div class="empty-state"><span class="empty-icon">' + ui.icon("bell", "h-5 w-5") +
          '</span><p class="text-sm font-medium text-hi">You\'re all caught up</p>' +
          '<p class="max-w-[22ch] text-xs text-mute">New boarding, delay and arrival events will appear here.</p></div></div>') +
      "</div>" +
      '<footer class="border-t border-line px-5 py-3">' +
      '<p class="mono-label">Queue length · ' + list.length + " events</p></footer>");

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    ui.hydrateIcons(drawer);
    drawerEl = { overlay: overlay, drawer: drawer };

    function close() { ui.closeNotifications(); }
    overlay.addEventListener("click", close);
    $("[data-close]", drawer).addEventListener("click", close);
    $("[data-readall]", drawer).addEventListener("click", function () {
      BF.actions.markAllRead(audience);
      close();
      ui.toast({ title: "All notifications marked read", type: "success" });
    });
    $$("[data-note]", drawer).forEach(function (b) {
      b.addEventListener("click", function () {
        BF.actions.markNotificationRead(b.getAttribute("data-note"));
        b.classList.add("opacity-70");
        const dot = $(".bg-accent", b);
        if (dot) dot.remove();
        ui.refreshBadges();
      });
    });
    document.addEventListener("keydown", escClose);
    function escClose(e) { if (e.key === "Escape") close(); }
    drawerEl.escClose = escClose;
    setTimeout(function () { $("[data-close]", drawer).focus(); }, 60);
  };

  ui.closeNotifications = function () {
    if (!drawerEl) return;
    document.removeEventListener("keydown", drawerEl.escClose);
    drawerEl.drawer.style.transition = "transform .3s var(--ease-premium), opacity .25s ease";
    drawerEl.drawer.style.transform = "translateX(24px)";
    drawerEl.drawer.style.opacity = 0;
    drawerEl.overlay.style.opacity = 0;
    const d = drawerEl;
    setTimeout(function () { d.drawer.remove(); d.overlay.remove(); }, 260);
    drawerEl = null;
    ui.refreshBadges();
  };

  ui.refreshBadges = function () {
    const audience = document.body.getAttribute("data-role") || undefined;
    const count = BF.get.unread(audience);
    $$("[data-unread]").forEach(function (n) {
      n.textContent = count > 9 ? "9+" : String(count);
      n.hidden = count === 0;
    });
  };

  /* ------------------------------------------------------------
     8. APP SHELL
     ------------------------------------------------------------ */
  const SHELL_HOME = { admin: "admin", student: "student", parent: "parent", driver: "driver", conductor: "conductor" };

  ui.mountShell = function (config) {
    const role = config.role;
    document.body.setAttribute("data-role", role);
    const session = BF.session.get() || BF.session.set(role);
    const items = config.items || [];
    const roleMeta = BF.roles[role];

    /* ---- sidebar ---- */
    const sidebar = $("#sidebar");
    if (sidebar) {
      sidebar.innerHTML =
        '<div class="flex h-16 items-center gap-2.5 border-b border-line px-5">' +
        '<a class="flex items-center gap-2.5" href="../index.html" aria-label="BusFlow home">' +
        logoMark("h-8 w-8") +
        '<span class="text-[15px] font-semibold tracking-[-0.02em] text-hi">BusFlow</span>' +
        "</a>" +
        '<span class="ml-auto rounded-md border border-line bg-white/[0.03] px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mute">' +
        esc(roleMeta ? roleMeta.label.slice(0, 5) : role) + "</span>" +
        "</div>" +
        '<nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">' +
        '<p class="mono-label px-3 pb-2">Operations</p>' +
        '<ul class="space-y-0.5">' +
        items.map(function (it, i) {
          return '<li><button class="sidebar-item w-full" data-view="' + it.id + '"' +
            (i === 0 ? ' aria-current="page"' : "") + ">" +
            ui.icon(it.icon, "h-4.5 w-4.5") + "<span>" + esc(it.label) + "</span>" +
            (it.badge ? '<span class="ml-auto rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-mid" data-nav-badge="' + it.id + '">' + esc(it.badge) + "</span>" : "") +
            "</button></li>";
        }).join("") +
        "</ul></nav>" +
        '<div class="border-t border-line p-3">' +
        '<div class="rounded-xl border border-line bg-panel-2/60 p-3">' +
        '<p class="mono-label">System</p>' +
        '<div class="mt-2 flex items-center gap-2 text-xs text-mid">' +
        '<span class="live-dot"></span><span>C++ engine · connected</span></div>' +
        '<p class="mt-1.5 font-mono text-[10px] text-faint">sim v1.0 · mock adapter</p>' +
        "</div>" +
        '<button class="sidebar-item mt-2 w-full text-mute hover:text-bad" data-logout>' +
        ui.icon("logout", "h-4.5 w-4.5") + "<span>Sign out</span></button>" +
        "</div>";
    }

    /* ---- topbar ---- */
    const topbar = $("#topbar");
    if (topbar) {
      topbar.innerHTML =
        (sidebar
          ? '<button class="btn-icon lg:hidden" data-toggle-sidebar aria-label="Open navigation" aria-expanded="false">' +
            ui.icon("menu", "h-4.5 w-4.5") + "</button>"
          : '<a class="flex items-center gap-2.5" href="../index.html" aria-label="BusFlow home">' +
            logoMark("h-8 w-8") + '<span class="text-[15px] font-semibold tracking-[-0.02em]">BusFlow</span></a>') +
        '<div class="hidden min-w-0 flex-col md:flex">' +
        '<h1 class="truncate text-sm font-semibold text-hi" data-page-title>' + esc(config.title || "Dashboard") + "</h1>" +
        '<p class="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-mute" data-page-sub>' +
        esc(config.subtitle || "") + "</p></div>" +
        '<div class="ml-auto flex items-center gap-2 sm:gap-2.5">' +
        '<button class="hidden items-center gap-2 rounded-lg border border-line bg-panel-2/70 px-3 py-2 text-xs text-mute transition-colors duration-200 hover:border-line-2 hover:text-mid sm:flex" data-open-search>' +
        ui.icon("search", "h-3.5 w-3.5") + '<span>Search…</span><span class="kbd ml-3">Ctrl K</span></button>' +
        '<button class="btn-icon sm:hidden" data-open-search aria-label="Search">' + ui.icon("search", "h-4 w-4") + "</button>" +
        '<button class="btn-icon" data-demo-flow aria-label="Presentation flow" title="Presentation flow">' +
        ui.icon("sparkles", "h-4 w-4") + "</button>" +
        '<button class="btn-icon relative" data-open-notes aria-label="Notifications">' +
        ui.icon("bell", "h-4 w-4") +
        '<span class="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-[#04141a]" data-unread hidden>0</span>' +
        "</button>" +
        '<div class="mx-1 hidden h-6 w-px bg-line sm:block"></div>' +
        '<button class="flex items-center gap-2.5 rounded-lg border border-transparent px-1.5 py-1 transition-colors duration-200 hover:border-line hover:bg-white/[0.03]" data-profile aria-haspopup="menu" aria-expanded="false">' +
        avatar(initials(session.name), "text-accent") +
        '<span class="hidden text-left leading-tight sm:block">' +
        '<span class="block text-xs font-medium text-hi">' + esc(session.name) + "</span>" +
        '<span class="block font-mono text-[10px] uppercase tracking-[0.14em] text-mute">' + esc(roleMeta ? roleMeta.label : role) + "</span>" +
        "</span>" + ui.icon("chevronDown", "hidden h-3.5 w-3.5 text-mute sm:block") + "</button></div>";
    }

    /* ---- horizontal section nav (app-style dashboards) ---- */
    const tabbar = $("#tabbar");
    if (tabbar) {
      tabbar.innerHTML = items.map(function (it, i) {
        return '<button class="nav-item" data-view="' + it.id + '"' +
          (i === 0 ? ' aria-current="page"' : "") + ">" +
          ui.icon(it.icon, "h-4 w-4") + "<span>" + esc(it.label) + "</span></button>";
      }).join("");
    }

    /* ---- mobile bottom nav (purpose-built for the app roles) ---- */
    const bottom = $("#mobileNav");
    if (bottom && config.mobileItems) {
      bottom.innerHTML = config.mobileItems.map(function (it, i) {
        const tone = it.id === "sos" ? "text-bad/80 data-[active=true]:text-bad" : "text-mute data-[active=true]:text-accent";
        return '<button class="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors duration-200 ' + tone + '" data-view="' + it.id +
          '" data-active="' + (i === 0) + '">' + ui.icon(it.icon, "h-5 w-5") +
          '<span class="font-mono text-[9px] uppercase tracking-[0.12em]">' + esc(it.label) + "</span></button>";
      }).join("");
    }

    ui.hydrateIcons(document.body);
    ui.refreshBadges();
    wireShell(config);
    return { session: session };
  };

  function initials(name) {
    return String(name || "?").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
  }

  function logoMark(cls) {
    return '<span class="relative grid ' + (cls || "h-9 w-9") + ' shrink-0 place-items-center overflow-hidden rounded-[10px] border border-accent/30 bg-gradient-to-br from-accent/25 to-accent-2/10">' +
      '<svg viewBox="0 0 24 24" class="h-4/6 w-4/6 text-accent" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      ICONS.bus + "</svg></span>";
  }
  ui.logoMark = logoMark;

  function wireShell(config) {
    const role = config.role;
    const sidebar = $("#sidebar");
    const scrim = $("#sidebarScrim");

    function setSidebar(open) {
      if (!sidebar) return;
      sidebar.classList.toggle("-translate-x-full", !open);
      if (scrim) scrim.hidden = !open;
      const btn = $("[data-toggle-sidebar]");
      if (btn) btn.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open && global.innerWidth < 1024 ? "hidden" : "";
    }
    ui.setSidebar = setSidebar;

    const toggle = $("[data-toggle-sidebar]");
    if (toggle) toggle.addEventListener("click", function () {
      setSidebar(sidebar.classList.contains("-translate-x-full"));
    });
    if (scrim) scrim.addEventListener("click", function () { setSidebar(false); });

    $$("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const view = btn.getAttribute("data-view");
        ui.navigate(view, config);
        if (global.innerWidth < 1024) setSidebar(false);
      });
    });

    const notesBtn = $$("[data-open-notes]");
    notesBtn.forEach(function (b) {
      b.addEventListener("click", function () { ui.openNotifications(role); });
    });

    $$("[data-open-search]").forEach(function (b) {
      b.addEventListener("click", function () { ui.openPalette(); });
    });

    $$("[data-demo-flow]").forEach(function (b) {
      b.addEventListener("click", function () { ui.demoFlow(); });
    });

    const profile = $("[data-profile]");
    if (profile) profile.addEventListener("click", function () { ui.profileMenu(profile, role); });

    $$("[data-logout]").forEach(function (b) {
      b.addEventListener("click", function () {
        BF.session.clear();
        location.href = "../login.html";
      });
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.openPalette();
      }
    });

    BF.on("state:change", function () { ui.refreshBadges(); });
    BF.on("notification", function (payload) {
      ui.refreshBadges();
      if (payload.silent) return;
      const tone = ui.noteTone(payload.item.type);
      ui.toast({ title: payload.item.title, msg: payload.item.body, icon: tone.icon, type: payload.item.type === "sos" ? "danger" : "info" });
    });
  }

  /** Switches the active view inside a dashboard page. */
  ui.navigate = function (view, config) {
    $$("[data-view]").forEach(function (b) {
      const active = b.getAttribute("data-view") === view;
      if (b.classList.contains("sidebar-item")) {
        if (active) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      } else {
        b.setAttribute("data-active", String(active));
      }
    });
    const handler = config && config.onNavigate;
    if (typeof handler === "function") handler(view);
    const main = $("#view");
    if (main && !ui.reducedMotion()) {
      main.style.animation = "none";
      void main.offsetWidth;
      main.style.animation = "fade-up .45s var(--ease-premium) both";
    }
    if (main) main.scrollTop = 0;
    global.scrollTo({ top: 0, behavior: ui.reducedMotion() ? "auto" : "smooth" });
  };

  ui.setPageTitle = function (title, sub) {
    const t = $("[data-page-title]"), s = $("[data-page-sub]");
    if (t) t.textContent = title;
    if (s) s.textContent = sub || "";
    document.title = "BusFlow · " + title;
  };

  ui.profileMenu = function (anchor, role) {
    if ($("#profileMenu")) { $("#profileMenu").remove(); anchor.setAttribute("aria-expanded", "false"); return; }
    const session = BF.session.get() || {};
    const menu = el("div", {
      id: "profileMenu",
      class: "absolute right-4 top-14 z-[80] w-60 overflow-hidden rounded-xl border border-line-2 bg-panel shadow-[var(--shadow-pop)]",
      role: "menu",
      style: "animation: scale-in .22s var(--ease-premium) both; transform-origin: top right"
    },
      '<div class="border-b border-line px-4 py-3">' +
      '<p class="text-sm font-medium text-hi">' + esc(session.name || "Guest") + "</p>" +
      '<p class="mono-label mt-1">' + esc((BF.roles[role] || {}).label || role) + " · Session active</p></div>" +
      '<div class="p-1.5">' +
      Object.keys(BF.roles).filter(function (r) { return r !== role; }).map(function (r) {
        return '<a class="sidebar-item" href="' + (role ? "../" : "") + BF.roles[r].page + '">' +
          ui.icon("arrowUpRight", "h-4 w-4") + "<span>Switch to " + esc(BF.roles[r].label) + "</span></a>";
      }).join("") +
      "</div>" +
      '<div class="border-t border-line p-1.5">' +
      '<button class="sidebar-item w-full text-mute hover:text-bad" data-logout>' + ui.icon("logout", "h-4 w-4") + "<span>Sign out</span></button></div>");
    anchor.setAttribute("aria-expanded", "true");
    document.body.appendChild(menu);
    ui.hydrateIcons(menu);
    $("[data-logout]", menu).addEventListener("click", function () {
      BF.session.clear();
      location.href = "../login.html";
    });
    setTimeout(function () {
      document.addEventListener("click", function close(e) {
        if (menu.contains(e.target) || anchor.contains(e.target)) return;
        menu.remove();
        anchor.setAttribute("aria-expanded", "false");
        document.removeEventListener("click", close);
      });
    }, 0);
  };

  /* ------------------------------------------------------------
     9. COMMAND PALETTE — "instant lookup" (hash map + prefix scan)
     ------------------------------------------------------------ */
  function paletteIndex() {
    const s = BF.state;
    const inPages = location.pathname.indexOf("/pages/") > -1;
    const prefix = inPages ? "" : "pages/";
    const rows = [];
    s.students.forEach(function (st) {
      rows.push({ kind: "Student", icon: "user", title: st.name, meta: st.id + " · " + st.busId + " · " + st.stop, key: st.name + " " + st.id + " " + st.dept });
    });
    s.buses.forEach(function (b) {
      rows.push({ kind: "Bus", icon: "bus", title: b.id, meta: b.reg + " · " + b.status + " · " + b.occupancy + "/" + b.capacity, key: b.id + " " + b.reg });
    });
    s.routes.forEach(function (r) {
      rows.push({ kind: "Route", icon: "route", title: r.name, meta: r.id + " · " + r.stops.length + " stops · " + r.distanceKm + " km", key: r.name + " " + r.id });
    });
    s.drivers.forEach(function (d) {
      rows.push({ kind: "Driver", icon: "steering", title: d.name, meta: d.id + " · " + d.busId, key: d.name + " " + d.id });
    });
    Object.keys(BF.roles).forEach(function (r) {
      rows.push({ kind: "Go to", icon: "arrowUpRight", title: BF.roles[r].label + " dashboard", meta: BF.roles[r].page, key: r + " " + BF.roles[r].label, href: prefix + BF.roles[r].page });
    });
    if (inPages) rows.push({ kind: "Go to", icon: "home", title: "Landing page", meta: "index.html", key: "home landing", href: "../index.html" });
    return rows;
  }

  ui.openPalette = function () {
    if ($("#palette")) return;
    const rows = paletteIndex();
    const wrap = el("div", { id: "palette", class: "fixed inset-0 z-[96] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm", style: "animation: fade-in .2s ease both" });
    const box = el("div", { class: "w-full max-w-xl overflow-hidden rounded-2xl border border-line-2 bg-panel shadow-[var(--shadow-pop)]", role: "dialog", "aria-modal": "true", "aria-label": "Search BusFlow", style: "animation: scale-in .24s var(--ease-premium) both" },
      '<div class="flex items-center gap-3 border-b border-line px-4">' +
      ui.icon("search", "h-4 w-4 text-mute") +
      '<input id="paletteInput" class="w-full bg-transparent py-4 text-sm text-hi outline-none placeholder:text-faint" placeholder="Search students, buses, routes, drivers…" aria-label="Search" autocomplete="off">' +
      '<span class="kbd">ESC</span></div>' +
      '<div class="max-h-[52vh] overflow-y-auto p-2" id="paletteResults"></div>' +
      '<div class="flex items-center justify-between border-t border-line px-4 py-2.5">' +
      '<p class="mono-label">Indexed lookup · O(1) hash map</p>' +
      '<p class="mono-label">' + rows.length + " records</p></div>");
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    ui.hydrateIcons(box);

    const input = $("#paletteInput", box);
    const results = $("#paletteResults", box);
    let active = 0;

    function render(q) {
      const query = q.trim().toLowerCase();
      const list = (query
        ? rows.filter(function (r) { return r.key.toLowerCase().indexOf(query) > -1; })
        : rows.slice(0, 8)).slice(0, 24);
      if (!list.length) {
        results.innerHTML = '<div class="empty-state m-2 border-0"><span class="empty-icon">' + ui.icon("search", "h-5 w-5") +
          '</span><p class="text-sm font-medium text-hi">No matches for “' + esc(q) + '”</p>' +
          '<p class="text-xs text-mute">Try a bus ID like BUS-07, or a student name.</p></div>';
        ui.hydrateIcons(results);
        return [];
      }
      results.innerHTML = list.map(function (r, i) {
        return '<button class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 data-[active=true]:bg-white/[0.06]" data-i="' + i + '" data-active="' + (i === active) + '">' +
          '<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-mute">' + ui.icon(r.icon, "h-4 w-4") + "</span>" +
          '<span class="min-w-0 flex-1"><span class="block truncate text-sm text-hi">' + esc(r.title) + "</span>" +
          '<span class="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-mute">' + esc(r.meta) + "</span></span>" +
          '<span class="mono-label">' + esc(r.kind) + "</span></button>";
      }).join("");
      ui.hydrateIcons(results);
      $$("button", results).forEach(function (b, i) {
        b.addEventListener("click", function () { choose(list[i]); });
      });
      return list;
    }

    function choose(item) {
      if (!item) return;
      close();
      if (item.href) { location.href = item.href; return; }
      ui.toast({ title: item.title, msg: item.kind + " · " + item.meta, type: "info" });
    }

    let current = render("");
    input.addEventListener("input", function () { active = 0; current = render(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = Math.max(0, Math.min(current.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
        $$("button", results).forEach(function (b, i) { b.setAttribute("data-active", String(i === active)); });
        const node = $$("button", results)[active];
        if (node) node.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(current[active]);
      } else if (e.key === "Escape") {
        close();
      }
    });
    wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) close(); });
    function close() { wrap.remove(); }
    setTimeout(function () { input.focus(); }, 30);
  };

  /* ------------------------------------------------------------
     9b. PRESENTATION FLOW
     A one-screen script for the live demo, with jump links.
     ------------------------------------------------------------ */
  const FLOW = [
    { step: "01", title: "Sign in", body: "Pick a role on the login screen — the session is shared across pages.", href: "login.html", icon: "lock" },
    { step: "02", title: "Student dashboard", body: "Show BUS-07, the live ETA and the next stop.", href: "pages/student.html", icon: "graduation" },
    { step: "03", title: "Live tracking", body: "Follow the bus moving along Route A with stop-by-stop progress.", href: "pages/student.html", icon: "radar" },
    { step: "04", title: "Digital pass", body: "Open the QR bus pass — this is what the conductor scans.", href: "pages/student.html", icon: "id" },
    { step: "05", title: "Conductor scans", body: "Scan Mitul's pass and mark attendance.", href: "pages/conductor.html", icon: "scan" },
    { step: "06", title: "Parent notified", body: "The boarding alert and journey timeline update instantly.", href: "pages/parent.html", icon: "users" },
    { step: "07", title: "Driver console", body: "Occupancy rises; broadcast a delay or arrival status.", href: "pages/driver.html", icon: "steering" },
    { step: "08", title: "Admin sees it all", body: "Attendance, KPIs and the control center reflect the same event.", href: "pages/admin.html", icon: "cpu" }
  ];

  ui.demoFlow = function () {
    const inPages = location.pathname.indexOf("/pages/") > -1;
    const prefix = inPages ? "../" : "";
    ui.modal({
      kicker: "Presentation mode",
      title: "The BusFlow demo flow",
      subtitle: "Eight steps that tell the whole story — every step shares one state.",
      size: "lg",
      body: '<ol class="grid gap-2.5 sm:grid-cols-2">' + FLOW.map(function (f) {
        return '<li><a class="group flex h-full gap-3 rounded-xl border border-line bg-panel-2/40 p-3.5 transition-all duration-200 hover:border-line-2 hover:bg-panel-3" href="' +
          prefix + f.href + '">' +
          '<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-accent">' +
          ui.icon(f.icon, "h-4 w-4") + "</span>" +
          '<span class="min-w-0"><span class="mono-label">Step ' + f.step + "</span>" +
          '<span class="mt-1 block text-sm font-medium text-hi">' + esc(f.title) + "</span>" +
          '<span class="mt-1 block text-xs leading-relaxed text-mute">' + esc(f.body) + "</span></span></a></li>";
      }).join("") + "</ol>" +
      '<p class="mt-4 flex items-center gap-2 rounded-lg border border-line bg-panel-2/50 p-3 text-xs text-mute">' +
      ui.icon("info", "h-4 w-4 shrink-0 text-accent") +
      "Tip: press Ctrl K anywhere for instant lookup, and reset the demo from Admin → Settings before you present.</p>",
      footer: '<button class="btn-secondary" data-close>Close</button>' +
        '<a class="btn-primary" href="' + prefix + 'pages/conductor.html">Jump to the QR scan' + ui.icon("arrowRight", "h-4 w-4") + "</a>"
    });
  };

  /* ------------------------------------------------------------
     10. LIVE SIMULATION ENGINE
     Mimics the telemetry stream the C++ backend will publish.
     ------------------------------------------------------------ */
  const sim = {
    timer: null,
    tick: 0,
    running: false,
    start: function (intervalMs) {
      if (sim.running) return;
      sim.running = true;
      sim.timer = setInterval(sim.step, intervalMs || 2600);
    },
    stop: function () {
      clearInterval(sim.timer);
      sim.running = false;
    },
    toggle: function () { sim.running ? sim.stop() : sim.start(); return sim.running; },
    step: function () {
      sim.tick += 1;
      const state = BF.state;
      state.buses.forEach(function (bus) {
        if (bus.status === "maintenance" || bus.status === "arrived") return;
        const pace = bus.status === "delayed" ? 0.006 : 0.014;
        bus.progress = Math.min(1, bus.progress + pace * (0.75 + Math.random() * 0.6));
        bus.speed = Math.max(0, Math.round((bus.status === "delayed" ? 18 : 34) + (Math.random() * 10 - 5)));
        const route = BF.get.route(bus.routeId);
        const totalEta = route ? route.etaMin : 40;
        bus.etaMin = Math.min(45, Math.max(0, Math.round(totalEta * (1 - bus.progress) * (bus.status === "delayed" ? 1.35 : 1))));
        if (bus.progress >= 1) {
          bus.status = "arrived";
          bus.etaMin = 0;
          bus.speed = 0;
          BF.actions.notify({
            type: "arrival",
            title: bus.id + " reached college",
            body: (route ? route.short : "Route") + " completed · " + bus.occupancy + "/" + bus.capacity + " students onboard.",
            audience: ["admin", "parent", "student", "driver", "conductor"]
          });
        }
      });
      /* An occasional, controlled event keeps the demo alive without chaos. */
      if (sim.tick % 9 === 0) {
        const candidates = state.buses.filter(function (b) { return b.status === "running"; });
        const bus = candidates[Math.floor(Math.random() * candidates.length)];
        if (bus) {
          bus.status = "delayed";
          BF.actions.notify({
            type: "delay",
            title: bus.id + " delayed by " + (5 + Math.floor(Math.random() * 8)) + " minutes",
            body: "Traffic reported near " + nearestStopName(bus) + ".",
            audience: ["admin", "parent", "student", "driver"]
          });
        }
      }
      if (sim.tick % 14 === 0) {
        const delayed = state.buses.filter(function (b) { return b.status === "delayed"; });
        if (delayed.length) delayed[0].status = "running";
      }
      BF.emit("sim:tick", { tick: sim.tick });
      BF.emit("state:change", { reason: "sim" });
    }
  };

  function nearestStopName(bus) {
    const route = BF.get.route(bus.routeId);
    if (!route) return "campus";
    const stop = route.stops.reduce(function (best, s) {
      return Math.abs(s.t - bus.progress) < Math.abs(best.t - bus.progress) ? s : best;
    }, route.stops[0]);
    return stop.name;
  }
  ui.nearestStopName = nearestStopName;

  /** Next upcoming stop for a bus (used by driver / student / parent views). */
  ui.nextStop = function (bus) {
    const route = BF.get.route(bus.routeId);
    if (!route) return null;
    return route.stops.find(function (s) { return s.t > bus.progress + 0.001; }) || route.stops[route.stops.length - 1];
  };

  /* ------------------------------------------------------------
     EXPORTS
     ------------------------------------------------------------ */
  ui.$ = $;
  ui.$$ = $$;
  ui.el = el;
  ui.esc = esc;
  ui.badge = badge;
  ui.statusClass = statusClass;
  ui.occupancyBar = occupancyBar;
  ui.avatar = avatar;
  ui.initials = initials;
  ui.clockNow = clockNow;
  ui.timeToMinutes = timeToMinutes;
  ui.sim = sim;
  ui.home = SHELL_HOME;

  BF.ui = ui;

  /* Global boot: hydrate icons, counters and reveals on every page. */
  document.addEventListener("DOMContentLoaded", function () {
    ui.hydrateIcons(document.body);
    ui.hydrateCounters(document.body);
    ui.observeReveal(document.body);
    /* Live clock chips — re-queried each tick so late-rendered panels stay in sync */
    const paintClocks = function () {
      $$("[data-clock]").forEach(function (c) { c.textContent = clockNow(); });
    };
    paintClocks();
    setInterval(paintClocks, 10000);
    BF.on("state:change", paintClocks);
  });
})(window);
