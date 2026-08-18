/* ============================================================
   BusFlow · js/fleetmap.js
   The live transport-network visualisation.

   A dependency-free SVG "control network": routes, stops, the
   campus hub and moving bus markers driven by the simulation
   engine. Re-used by the landing hero, the admin Live Fleet
   Control Center, the student tracker and the parent journey view.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const NS = "http://www.w3.org/2000/svg";
  const VIEW_W = 1000;
  const VIEW_H = 640;

  function svgEl(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function create(container, options) {
    const opts = Object.assign({
      routeIds: null,        // null = all routes
      busIds: null,          // null = all buses
      labels: true,          // show stop labels
      interactive: true,     // clickable buses
      showEta: true,
      focus: null,           // bus id to highlight
      minimal: false,        // hero mode — less chrome
      onSelect: null
    }, options || {});

    container.innerHTML = "";
    container.classList.add("relative");

    const svg = svgEl("svg", {
      viewBox: "0 0 " + VIEW_W + " " + VIEW_H,
      preserveAspectRatio: "xMidYMid meet",
      class: "h-full w-full select-none",
      role: "img",
      "aria-label": "Live campus transport network with routes, stops and moving buses"
    });

    /* ---------- defs: glow, gradients, grid ---------- */
    const defs = svgEl("defs");
    defs.innerHTML =
      '<filter id="bfGlow" x="-70%" y="-70%" width="240%" height="240%">' +
      '<feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="bfSoft" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="12"/></filter>' +
      '<radialGradient id="bfHub" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#22d3ee" stop-opacity=".55"/><stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>' +
      '<pattern id="bfGrid" width="50" height="50" patternUnits="userSpaceOnUse">' +
      '<path d="M50 0H0v50" fill="none" stroke="rgba(255,255,255,.035)" stroke-width="1"/></pattern>' +
      '<linearGradient id="bfFade" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#06070a" stop-opacity="0"/><stop offset="100%" stop-color="#06070a" stop-opacity=".85"/></linearGradient>';
    svg.appendChild(defs);

    /* ---------- terrain ---------- */
    const terrain = svgEl("g", { class: "bf-terrain" });
    terrain.appendChild(svgEl("rect", { x: 0, y: 0, width: VIEW_W, height: VIEW_H, fill: "url(#bfGrid)" }));
    /* soft contour rings suggesting hill terrain around the campus */
    [200, 300, 420].forEach(function (r, i) {
      terrain.appendChild(svgEl("circle", {
        cx: BF.state.college.x, cy: BF.state.college.y, r: r,
        fill: "none", stroke: "rgba(255,255,255,.035)", "stroke-width": 1,
        "stroke-dasharray": i === 1 ? "2 10" : "none"
      }));
    });
    svg.appendChild(terrain);

    const routeLayer = svgEl("g", { class: "bf-routes" });
    const stopLayer = svgEl("g", { class: "bf-stops" });
    const hubLayer = svgEl("g", { class: "bf-hub" });
    const busLayer = svgEl("g", { class: "bf-buses" });
    svg.appendChild(routeLayer);
    svg.appendChild(stopLayer);
    svg.appendChild(hubLayer);
    svg.appendChild(busLayer);
    container.appendChild(svg);

    const routes = BF.state.routes.filter(function (r) {
      return !opts.routeIds || opts.routeIds.indexOf(r.id) > -1;
    });

    /* ---------- routes + stops ---------- */
    const geo = {}; // routeId -> { path element, length }

    routes.forEach(function (route) {
      const base = svgEl("path", {
        d: route.path, fill: "none", stroke: route.color, "stroke-width": 2.4,
        "stroke-opacity": route.status === "maintenance" ? 0.16 : 0.3,
        "stroke-linecap": "round", "data-route": route.id
      });
      routeLayer.appendChild(base);

      const flow = svgEl("path", {
        d: route.path, fill: "none", stroke: route.color, "stroke-width": 2.4,
        "stroke-linecap": "round", "stroke-dasharray": "10 34",
        "stroke-opacity": route.status === "maintenance" ? 0 : 0.85,
        filter: "url(#bfGlow)", class: "bf-flow", "data-flow": route.id
      });
      if (!BF.ui.reducedMotion()) {
        flow.style.animation = "dash 1.8s linear infinite";
      }
      routeLayer.appendChild(flow);

      geo[route.id] = { path: base, length: base.getTotalLength ? base.getTotalLength() : 0 };

      route.stops.forEach(function (stop, i) {
        const isCampus = i === route.stops.length - 1;
        if (isCampus) return; // campus rendered once as the hub
        const p = pointAt(route.id, stop.t);
        if (!p) return;
        const g = svgEl("g", { class: "bf-stop", "data-stop": stop.id });
        g.appendChild(svgEl("circle", { cx: p.x, cy: p.y, r: 7, fill: "#0a0c10", stroke: route.color, "stroke-width": 1.6, "stroke-opacity": .75 }));
        g.appendChild(svgEl("circle", { cx: p.x, cy: p.y, r: 2.6, fill: route.color, "fill-opacity": .9 }));
        if (opts.labels) {
          const flip = p.x > VIEW_W * 0.72;
          const label = svgEl("text", {
            x: p.x + (flip ? -12 : 12), y: p.y + 4,
            "text-anchor": flip ? "end" : "start",
            fill: "rgba(255,255,255,.62)",
            "font-size": 12.5,
            "font-family": "var(--font-mono, monospace)",
            "letter-spacing": ".06em"
          });
          label.textContent = stop.name;
          g.appendChild(label);
        }
        stopLayer.appendChild(g);
      });
    });

    /* ---------- fit the frame to the visible corridors ---------- */
    if (opts.routeIds && opts.routeIds.length && svg.viewBox) {
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      routes.forEach(function (r) {
        const box = geo[r.id].path.getBBox ? geo[r.id].path.getBBox() : null;
        if (!box) return;
        minX = Math.min(minX, box.x); minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width); maxY = Math.max(maxY, box.y + box.height);
      });
      if (minX < 1e9) {
        const padX = 150, padY = 110;
        const x = Math.max(0, minX - padX), y = Math.max(0, minY - padY);
        const w = Math.min(VIEW_W - x, maxX - minX + padX * 2);
        const h = Math.min(VIEW_H - y, maxY - minY + padY * 2);
        svg.setAttribute("viewBox", [x, y, w, h].join(" "));
      }
    }

    /* ---------- campus hub ---------- */
    const hub = BF.state.college;
    hubLayer.appendChild(svgEl("circle", { cx: hub.x, cy: hub.y, r: 90, fill: "url(#bfHub)", opacity: .55 }));
    const ring = svgEl("circle", { cx: hub.x, cy: hub.y, r: 26, fill: "none", stroke: "#22d3ee", "stroke-width": 1.4, "stroke-opacity": .55 });
    hubLayer.appendChild(ring);
    if (!BF.ui.reducedMotion()) {
      [0, 1.2, 2.4].forEach(function (delay) {
        const pulse = svgEl("circle", { cx: hub.x, cy: hub.y, r: 26, fill: "none", stroke: "#22d3ee", "stroke-width": 1.2 });
        pulse.style.transformOrigin = hub.x + "px " + hub.y + "px";
        pulse.style.animation = "pulse-ring 3.6s ease-out infinite";
        pulse.style.animationDelay = delay + "s";
        hubLayer.appendChild(pulse);
      });
    }
    const hubCore = svgEl("circle", { cx: hub.x, cy: hub.y, r: 15, fill: "#08222a", stroke: "#22d3ee", "stroke-width": 2, filter: "url(#bfGlow)" });
    hubLayer.appendChild(hubCore);
    const hubIcon = svgEl("path", {
      d: "M-7 5 L0 -6 L7 5 Z", transform: "translate(" + hub.x + "," + hub.y + ")",
      fill: "none", stroke: "#7ef0ff", "stroke-width": 1.6, "stroke-linejoin": "round"
    });
    hubLayer.appendChild(hubIcon);

    const hubLabel = svgEl("text", {
      x: hub.x, y: hub.y + 46, "text-anchor": "middle",
      fill: "#e6faff", "font-size": 13, "font-family": "var(--font-mono, monospace)", "letter-spacing": ".18em"
    });
    hubLabel.textContent = "CAMPUS HUB";
    hubLayer.appendChild(hubLabel);
    if (opts.labels) {
      const hubSub = svgEl("text", {
        x: hub.x, y: hub.y + 64, "text-anchor": "middle",
        fill: "rgba(255,255,255,.42)", "font-size": 11.5, "font-family": "var(--font-mono, monospace)", "letter-spacing": ".1em"
      });
      hubSub.textContent = BF.state.college.campus.toUpperCase();
      hubLayer.appendChild(hubSub);
    }

    /* ---------- bus markers ---------- */
    const markers = {};
    const display = {}; // smoothed progress per bus

    function buses() {
      return BF.state.buses.filter(function (b) {
        if (opts.busIds && opts.busIds.indexOf(b.id) === -1) return false;
        if (!geo[b.routeId]) return false;
        return b.status !== "maintenance";
      });
    }

    function buildMarker(bus) {
      const route = BF.get.route(bus.routeId);
      const g = svgEl("g", { class: "bf-bus", "data-bus": bus.id, tabindex: opts.interactive ? 0 : null, role: opts.interactive ? "button" : null });
      if (opts.interactive) g.setAttribute("aria-label", "Bus " + bus.id + " on " + route.short);
      g.style.cursor = opts.interactive ? "pointer" : "default";

      const halo = svgEl("circle", { r: 20, fill: route.color, "fill-opacity": .14, filter: "url(#bfSoft)" });
      const ping = svgEl("circle", { r: 13, fill: "none", stroke: route.color, "stroke-width": 1.2, "stroke-opacity": .8 });
      if (!BF.ui.reducedMotion()) {
        ping.style.animation = "pulse-ring 2.6s ease-out infinite";
        ping.style.transformBox = "fill-box";
        ping.style.transformOrigin = "center";
      }
      const body = svgEl("circle", { r: 11, fill: "#0b1016", stroke: route.color, "stroke-width": 2.2, filter: "url(#bfGlow)" });
      const glyph = svgEl("path", {
        d: "M-4.6 -3.4 h9.2 v5.6 a1.2 1.2 0 0 1 -1.2 1.2 h-6.8 a1.2 1.2 0 0 1 -1.2 -1.2 z M-4.6 -0.6 h9.2 M-3 3.4 v1.3 M3 3.4 v1.3",
        fill: "none", stroke: route.color, "stroke-width": 1.1, "stroke-linecap": "round"
      });

      const chip = svgEl("g", { class: "bf-chip" });
      const chipRect = svgEl("rect", { x: 16, y: -34, rx: 6, width: 108, height: 24, fill: "rgba(9,12,17,.94)", stroke: "rgba(255,255,255,.14)" });
      const chipId = svgEl("text", { x: 26, y: -17.5, fill: "#f2f5f9", "font-size": 12, "font-family": "var(--font-mono, monospace)", "letter-spacing": ".08em" });
      chipId.textContent = bus.id;
      const chipEta = svgEl("text", { x: 116, y: -17.5, "text-anchor": "end", fill: route.color, "font-size": 12, "font-family": "var(--font-mono, monospace)" });
      chip.appendChild(chipRect); chip.appendChild(chipId); chip.appendChild(chipEta);

      g.appendChild(halo); g.appendChild(ping); g.appendChild(body); g.appendChild(glyph);
      if (opts.showEta) g.appendChild(chip);
      busLayer.appendChild(g);

      if (opts.interactive) {
        const fire = function () {
          setFocus(bus.id);
          if (typeof opts.onSelect === "function") opts.onSelect(bus);
        };
        g.addEventListener("click", fire);
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); }
        });
      }
      return {
        g: g, body: body, ping: ping, halo: halo, glyph: glyph,
        chipEta: opts.showEta ? chipEta : null,
        chipId: opts.showEta ? chipId : null,
        chipRect: opts.showEta ? chipRect : null
      };
    }

    function pointAt(routeId, t) {
      const entry = geo[routeId];
      if (!entry || !entry.path.getPointAtLength) return null;
      const len = entry.length || entry.path.getTotalLength();
      const p = entry.path.getPointAtLength(Math.max(0, Math.min(1, t)) * len);
      return { x: p.x, y: p.y };
    }

    let focused = opts.focus || null;

    function setFocus(busId) {
      focused = busId;
      Object.keys(markers).forEach(function (id) {
        const m = markers[id];
        const on = !focused || id === focused;
        m.g.style.opacity = on ? 1 : 0.32;
      });
      routes.forEach(function (r) {
        const el = routeLayer.querySelector('[data-flow="' + r.id + '"]');
        const base = routeLayer.querySelector('[data-route="' + r.id + '"]');
        const isFocusRoute = !focused || (BF.get.bus(focused) || {}).routeId === r.id;
        if (el) el.setAttribute("stroke-opacity", r.status === "maintenance" ? 0 : (isFocusRoute ? 0.9 : 0.18));
        if (base) base.setAttribute("stroke-opacity", isFocusRoute ? 0.34 : 0.12);
      });
    }

    function syncMarkers() {
      const live = buses();
      const ids = live.map(function (b) { return b.id; });
      Object.keys(markers).forEach(function (id) {
        if (ids.indexOf(id) === -1) { markers[id].g.remove(); delete markers[id]; }
      });
      live.forEach(function (bus) {
        if (!markers[bus.id]) {
          markers[bus.id] = buildMarker(bus);
          display[bus.id] = bus.progress;
        }
      });
      if (focused) setFocus(focused);
    }

    const STATUS_COLOR = { running: "#34d399", delayed: "#fbbf24", arrived: "#22d3ee", idle: "#6f7a8b" };

    function paint() {
      buses().forEach(function (bus) {
        const m = markers[bus.id];
        if (!m) return;
        const target = bus.progress;
        if (display[bus.id] == null) display[bus.id] = target;
        display[bus.id] += (target - display[bus.id]) * (BF.ui.reducedMotion() ? 1 : 0.045);
        const p = pointAt(bus.routeId, display[bus.id]);
        if (!p) return;
        m.g.setAttribute("transform", "translate(" + p.x.toFixed(2) + "," + p.y.toFixed(2) + ")");
        const tone = STATUS_COLOR[bus.status] || "#22d3ee";
        m.body.setAttribute("stroke", tone);
        m.glyph.setAttribute("stroke", tone);
        m.ping.setAttribute("stroke", tone);
        m.halo.setAttribute("fill", tone);
        if (m.chipEta) {
          m.chipEta.setAttribute("fill", tone);
          m.chipEta.textContent = bus.status === "arrived" ? "ARRIVED" : bus.etaMin + " MIN";
        }
        /* Keep chips readable: flip near the right edge, lift clear of the hub label */
        if (m.chipRect && m.chipId && m.chipEta) {
          const dx = p.x > VIEW_W - 150 ? -124 : 16;
          const dy = bus.status === "arrived" ? -66 : -34;
          m.chipRect.setAttribute("x", dx);
          m.chipRect.setAttribute("y", dy);
          m.chipId.setAttribute("x", dx + 10);
          m.chipId.setAttribute("y", dy + 16.5);
          m.chipEta.setAttribute("x", dx + 100);
          m.chipEta.setAttribute("y", dy + 16.5);
        }
      });
    }

    syncMarkers();
    paint();

    let raf = null;
    function loop() {
      paint();
      raf = requestAnimationFrame(loop);
    }
    if (!BF.ui.reducedMotion()) raf = requestAnimationFrame(loop);

    const offSim = BF.on("sim:tick", function () { syncMarkers(); if (BF.ui.reducedMotion()) paint(); });
    const offState = BF.on("state:change", function () { syncMarkers(); });

    return {
      svg: svg,
      focus: setFocus,
      refresh: function () { syncMarkers(); paint(); },
      pointAt: pointAt,
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        offSim(); offState();
        container.innerHTML = "";
      }
    };
  }

  BF.FleetMap = { create: create, VIEW_W: VIEW_W, VIEW_H: VIEW_H };
})(window);
