/* ==========================================================================
   admin.js — Admin dashboard: routing between sections, rendering, actions
   ========================================================================== */

const ADMIN_NAV = [
  { section: "Overview", items: [
    { key: "dashboard", label: "Dashboard", icon: "fa-gauge-high", href: "#dashboard" },
  ]},
  { section: "People", items: [
    { key: "students", label: "Students", icon: "fa-user-graduate", href: "#students" },
    { key: "drivers", label: "Drivers", icon: "fa-id-card", href: "#drivers" },
    { key: "conductors", label: "Conductors", icon: "fa-ticket", href: "#conductors" },
  ]},
  { section: "Operations", items: [
    { key: "fleet", label: "Buses", icon: "fa-bus", href: "#fleet" },
    { key: "routes", label: "Routes", icon: "fa-route", href: "#routes" },
    { key: "tracking", label: "Live Tracking", icon: "fa-location-crosshairs", href: "#dashboard" },
    { key: "attendance", label: "Attendance", icon: "fa-clipboard-check", href: "#attendance" },
  ]},
  { section: "Requests", items: [
    { key: "leaves", label: "Leave Requests", icon: "fa-calendar-minus", href: "#leaves" },
    { key: "complaints", label: "Complaints", icon: "fa-comment-dots", href: "#complaints" },
    { key: "notifications", label: "Notifications", icon: "fa-bell", href: "#notifications" },
  ]},
  { section: "System", items: [
    { key: "reports", label: "Reports", icon: "fa-chart-column", href: "#reports" },
    { key: "settings", label: "Settings", icon: "fa-gear", href: "#settings" },
  ]},
];

const PAGE_TITLES = {
  dashboard: "Dashboard", students: "Students", drivers: "Drivers", conductors: "Conductors",
  fleet: "Fleet Management", routes: "Route Management", attendance: "Attendance", leaves: "Leave Requests",
  complaints: "Complaints", notifications: "Notifications", reports: "Reports", settings: "Settings",
};

let liveTicker = null;

function renderOpsCenter() {
  const db = window.__BUS_DB__;
  const active = db.buses.filter((b) => b.status !== "Offline").length;
  document.getElementById("opsActiveCount") && (document.getElementById("opsActiveCount").textContent = active);
  const boarded = db.students.filter((s) => s.status === "Boarded").length;
  document.getElementById("opsBoardedCount") && (document.getElementById("opsBoardedCount").textContent = boarded);
  const bar = document.getElementById("opsBoardedBar");
  if (bar) bar.style.width = `${Math.round((boarded / db.students.length) * 100)}%`;

  const eff = document.getElementById("opsEfficiencyChart");
  if (eff) {
    const days = [
      { d: "Mon", actual: 34, est: 40 }, { d: "Tue", actual: 38, est: 40 },
      { d: "Wed", actual: 30, est: 40 }, { d: "Thu", actual: 42, est: 40 },
    ];
    const max = 45;
    eff.innerHTML = days.map((d) => `
      <div class="flex-1 flex flex-col items-center gap-1">
        <div class="w-full flex items-end gap-0.5 h-24">
          <div class="flex-1 bg-accent-500 rounded-t" style="height:${(d.actual / max) * 100}%"></div>
          <div class="flex-1 bg-accent-200 rounded-t" style="height:${(d.est / max) * 100}%"></div>
        </div>
        <span class="text-[10px] text-slate-400">${d.d}</span>
      </div>
    `).join("");
  }
}

function renderKPIs() {
  const db = window.__BUS_DB__;
  const totalStudents = db.students.length + 214; // padded for realism
  const activeBuses = db.buses.filter((b) => b.status !== "Offline").length;
  const running = db.buses.filter((b) => b.status === "Running").length;
  const boarded = db.students.filter((s) => s.status === "Boarded").length;
  const pendingLeaves = db.leaveRequests.filter((l) => l.status === "Pending").length;
  const alerts = 1;

  const kpis = [
    { label: "Total Students", value: totalStudents, icon: "fa-user-graduate", color: "bg-accent-50 text-accent-600", trend: "+4.2%", up: true },
    { label: "Active Buses", value: `${activeBuses}/${db.buses.length}`, icon: "fa-bus", color: "bg-emerald-50 text-emerald-600", trend: "stable", up: true },
    { label: "Buses Running", value: running, icon: "fa-location-dot", color: "bg-indigo-50 text-indigo-600", trend: "+1", up: true },
    { label: "Today's Attendance", value: `${Math.round((boarded / db.students.length) * 100)}%`, icon: "fa-clipboard-check", color: "bg-amber-50 text-amber-600", trend: "+3.1%", up: true },
    { label: "Pending Leaves", value: pendingLeaves, icon: "fa-calendar-minus", color: "bg-rose-50 text-rose-600", trend: "-2", up: false },
    { label: "Active Alerts", value: alerts, icon: "fa-triangle-exclamation", color: "bg-red-50 text-red-600", trend: "1 new", up: false },
  ];

  document.getElementById("kpiGrid").innerHTML = kpis.map((k) => `
    <div class="kpi-card">
      <div class="flex items-start justify-between">
        <div class="kpi-icon ${k.color}"><i class="fa-solid ${k.icon}"></i></div>
        <span class="${k.up ? "trend-up" : "trend-down"}"><i class="fa-solid ${k.up ? "fa-arrow-up" : "fa-arrow-down"} text-[9px]"></i>${k.trend}</span>
      </div>
      <div>
        <p class="kpi-value">${k.value}</p>
        <p class="kpi-label">${k.label}</p>
      </div>
    </div>
  `).join("");
}

function renderMapMarkers(filter = "All") {
  const db = window.__BUS_DB__;
  const container = document.getElementById("mapMarkers");
  if (!container) return;
  const buses = filter === "All" ? db.buses : db.buses.filter((b) => b.status === filter);
  container.innerHTML = buses.map((b) => `
    <div class="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-[3500ms] ease-linear group" style="left:${b.lat}%; top:${b.lng}%;">
      <div class="relative flex items-center justify-center">
        <span class="pulse-dot ${statusDotColor(b.status)} w-3 h-3 opacity-60"></span>
        <div class="absolute w-7 h-7 rounded-full ${statusDotColor(b.status)} flex items-center justify-center shadow-lg ring-2 ring-white">
          <i class="fa-solid fa-bus text-white text-[10px]"></i>
        </div>
      </div>
      <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 top-9 bg-navy-900 text-white text-[10px] font-mono px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10">
        ${b.id} · ${b.status}
      </div>
    </div>
  `).join("");
}

function renderFleetFilters(active = "All") {
  const filters = ["All", "Running", "Delayed", "Arrived", "Offline"];
  const container = document.getElementById("fleetFilters");
  if (!container) return;
  container.innerHTML = filters.map((f) => `
    <button data-filter="${f}" class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${f === active ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}">${f}</button>
  `).join("");
  container.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      renderFleetFilters(btn.dataset.filter);
      renderLiveFleetList(btn.dataset.filter);
      renderMapMarkers(btn.dataset.filter);
    });
  });
}

function renderLiveFleetList(filter = "All") {
  const db = window.__BUS_DB__;
  const list = document.getElementById("liveFleetList");
  if (!list) return;
  const buses = filter === "All" ? db.buses : db.buses.filter((b) => b.status === filter);
  if (buses.length === 0) {
    list.innerHTML = `<p class="text-sm text-slate-400 text-center py-8">No buses match this filter.</p>`;
    return;
  }
  list.innerHTML = buses.map((b) => `
    <div class="border border-slate-100 rounded-xl p-3 hover:border-accent-200 hover:bg-accent-50/30 transition-colors cursor-pointer" data-bus="${b.id}">
      <div class="flex items-center justify-between mb-1.5">
        <span class="font-mono text-sm font-semibold text-slate-800">${b.id}</span>
        ${renderStatusBadge(b.status)}
      </div>
      <p class="text-xs text-slate-500 mb-2">${b.route} → College</p>
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span><i class="fa-solid fa-users mr-1"></i>${b.occupancy}/${b.capacity}</span>
        <span>${b.eta !== null ? `ETA ${b.eta} min` : "—"}</span>
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-bus]").forEach((el) => {
    el.addEventListener("click", () => openBusDetailModal(el.dataset.bus));
  });
}

function openBusDetailModal(busId) {
  const bus = window.__BUS_DB__.buses.find((b) => b.id === busId);
  if (!bus) return;
  showModal(`
    <div class="p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <p class="font-mono text-lg font-bold text-slate-900">${bus.id}</p>
          <p class="text-sm text-slate-500">${bus.registration}</p>
        </div>
        ${renderStatusBadge(bus.status)}
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm mb-5">
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-400 mb-0.5">Route</p><p class="font-medium text-slate-800">${bus.route}</p></div>
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-400 mb-0.5">ETA</p><p class="font-medium text-slate-800">${bus.eta !== null ? bus.eta + " min" : "—"}</p></div>
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-400 mb-0.5">Driver</p><p class="font-medium text-slate-800">${bus.driver}</p></div>
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-400 mb-0.5">Conductor</p><p class="font-medium text-slate-800">${bus.conductor}</p></div>
        <div class="bg-slate-50 rounded-lg p-3 col-span-2"><p class="text-xs text-slate-400 mb-0.5">Occupancy</p>
          <div class="flex items-center gap-2">
            <div class="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-accent-500" style="width:${(bus.occupancy / bus.capacity) * 100}%"></div></div>
            <span class="text-xs font-medium text-slate-600">${bus.occupancy}/${bus.capacity}</span>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary flex-1 btn-sm" data-close-modal>Close</button>
        <button class="btn-primary flex-1 btn-sm" onclick="showToast('Status update sent to driver', 'info'); hideModal();">Update Status</button>
      </div>
    </div>
  `);
}

function renderTrendChart() {
  const db = window.__BUS_DB__;
  const chart = document.getElementById("trendChart");
  if (!chart) return;
  const max = Math.max(...db.attendanceTrend);
  chart.innerHTML = db.attendanceTrend.map((v, i) => `
    <div class="mini-bar-col group">
      <span class="mini-bar-value">${v}%</span>
      <div class="mini-bar ${i === db.attendanceTrend.length - 1 ? "bg-accent-600" : "bg-accent-200"} group-hover:bg-accent-500" style="height:${(v / max) * 100}%"></div>
      <span class="mini-bar-label">${db.attendanceLabels[i]}</span>
    </div>
  `).join("");
}

function renderPendingApprovals() {
  const db = window.__BUS_DB__;
  const el = document.getElementById("pendingList");
  if (!el) return;
  const pending = db.leaveRequests.filter((l) => l.status === "Pending");
  if (pending.length === 0) {
    el.innerHTML = `<p class="text-sm text-slate-400 text-center py-6">No pending approvals.</p>`;
    return;
  }
  el.innerHTML = pending.map((l) => `
    <div class="flex items-center gap-3 border border-slate-100 rounded-lg p-2.5">
      <div class="avatar">${l.student.split(" ").map(w=>w[0]).join("")}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-800 truncate">${l.student}</p>
        <p class="text-xs text-slate-400">${l.type} · ${l.date}</p>
      </div>
      <button class="btn-icon !text-success-500 hover:!bg-success-50" data-approve="${l.id}" aria-label="Approve"><i class="fa-solid fa-check"></i></button>
      <button class="btn-icon !text-danger-500 hover:!bg-danger-50" data-reject="${l.id}" aria-label="Reject"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join("");

  el.querySelectorAll("[data-approve]").forEach((btn) => btn.addEventListener("click", () => {
    const lr = db.leaveRequests.find((l) => l.id === btn.dataset.approve);
    lr.status = "Approved";
    showToast(`Leave request for ${lr.student} approved`, "success");
    pushNotification("📋", `Leave request for ${lr.student} approved`);
    renderPendingApprovals();
    renderKPIs();
  }));
  el.querySelectorAll("[data-reject]").forEach((btn) => btn.addEventListener("click", () => {
    const lr = db.leaveRequests.find((l) => l.id === btn.dataset.reject);
    lr.status = "Rejected";
    showToast(`Leave request for ${lr.student} rejected`, "warning");
    renderPendingApprovals();
    renderKPIs();
  }));
}

function renderFleetTable() {
  const db = window.__BUS_DB__;
  const body = document.getElementById("fleetTableBody");
  if (!body) return;
  body.innerHTML = db.buses.map((b) => `
    <tr>
      <td class="font-mono font-semibold text-slate-800">${b.id}</td>
      <td class="font-mono text-xs text-slate-500">${b.registration}</td>
      <td>${b.route}</td>
      <td>${b.driver}</td>
      <td>${b.conductor}</td>
      <td>${b.capacity}</td>
      <td>
        <div class="flex items-center gap-2">
          <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-accent-500" style="width:${(b.occupancy/b.capacity)*100}%"></div></div>
          <span class="text-xs text-slate-500">${b.occupancy}/${b.capacity}</span>
        </div>
      </td>
      <td>${renderStatusBadge(b.status)}</td>
      <td class="text-right">
        <div class="flex justify-end gap-1">
          <button class="btn-icon" onclick="openBusDetailModal('${b.id}')" aria-label="View"><i class="fa-regular fa-eye"></i></button>
          <button class="btn-icon" onclick="showToast('Edit bus modal — coming in Phase 2 backend', 'info')" aria-label="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
          <button class="btn-icon !text-danger-500 hover:!bg-danger-50" onclick="showToast('Delete requires confirmation — wired to backend in Phase 2', 'warning')" aria-label="Delete"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderRoutesGrid() {
  const db = window.__BUS_DB__;
  const grid = document.getElementById("routesGrid");
  if (!grid) return;
  grid.innerHTML = db.routes.map((r) => `
    <div class="card card-pad">
      <div class="flex items-start justify-between mb-4">
        <div>
          <p class="font-semibold text-slate-800">${r.name}</p>
          <p class="text-xs font-mono text-slate-400 mt-0.5">${r.id} · ${r.bus}</p>
        </div>
        <span class="${r.status === 'Active' ? 'badge-active' : 'badge-inactive'} badge"><span class="badge-dot ${r.status === 'Active' ? 'bg-success-500' : 'bg-slate-400'}"></span>${r.status}</span>
      </div>
      <div class="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
        <span><i class="fa-solid fa-road mr-1"></i>${r.distance}</span>
        <span><i class="fa-regular fa-clock mr-1"></i>${r.eta} ETA</span>
        <span><i class="fa-solid fa-diamond-turn-right mr-1"></i>Dijkstra-optimized</span>
      </div>
      <div class="space-y-0">
        ${r.stops.map((s, i) => `
          <div class="route-timeline-item">
            <div class="route-timeline-rail">
              <div class="route-timeline-dot ${i === 0 ? 'route-timeline-dot-start' : i === r.stops.length - 1 ? 'route-timeline-dot-end' : 'route-timeline-dot-mid'}"></div>
              ${i < r.stops.length - 1 ? '<div class="route-timeline-line"></div>' : ''}
            </div>
            <div class="route-timeline-body">
              <p class="route-timeline-stop">${s}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function renderAttendancePage() {
  const db = window.__BUS_DB__;
  const boarded = db.students.filter((s) => s.status === "Boarded").length;
  const absent = db.students.length - boarded;
  const kpis = [
    { label: "Total Boarded", value: boarded, icon: "fa-user-check", color: "bg-success-50 text-success-600" },
    { label: "Absent", value: absent, icon: "fa-user-xmark", color: "bg-danger-50 text-danger-600" },
    { label: "Attendance %", value: `${Math.round((boarded / db.students.length) * 100)}%`, icon: "fa-percent", color: "bg-accent-50 text-accent-600" },
    { label: "Routes Reporting", value: db.routes.length, icon: "fa-route", color: "bg-amber-50 text-amber-600" },
  ];
  document.getElementById("attKpiGrid").innerHTML = kpis.map((k) => `
    <div class="kpi-card">
      <div class="kpi-icon ${k.color}"><i class="fa-solid ${k.icon}"></i></div>
      <div><p class="kpi-value">${k.value}</p><p class="kpi-label">${k.label}</p></div>
    </div>
  `).join("");

  document.getElementById("attendanceTableBody").innerHTML = db.students.map((s) => `
    <tr>
      <td class="font-medium text-slate-800">${s.name}</td>
      <td class="font-mono text-xs text-slate-500">${s.id}</td>
      <td class="font-mono text-xs">${s.bus}</td>
      <td>${s.boardTime}</td>
      <td>${s.date}</td>
      <td>${renderStatusBadge(s.status)}</td>
    </tr>
  `).join("");
}

function renderLeavesTable() {
  const db = window.__BUS_DB__;
  document.getElementById("leavesTableBody").innerHTML = db.leaveRequests.map((l) => `
    <tr>
      <td class="font-medium text-slate-800">${l.student}</td>
      <td>${l.type}</td>
      <td>${l.date}</td>
      <td class="text-slate-500">${l.reason}</td>
      <td>${renderStatusBadge(l.status)}</td>
      <td class="text-right">
        ${l.status === "Pending" ? `
          <div class="flex justify-end gap-1">
            <button class="btn-icon !text-success-500 hover:!bg-success-50" data-approve="${l.id}"><i class="fa-solid fa-check"></i></button>
            <button class="btn-icon !text-danger-500 hover:!bg-danger-50" data-reject="${l.id}"><i class="fa-solid fa-xmark"></i></button>
          </div>` : `<span class="text-xs text-slate-300">—</span>`}
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("#leavesTableBody [data-approve]").forEach((btn) => btn.addEventListener("click", () => {
    db.leaveRequests.find((l) => l.id === btn.dataset.approve).status = "Approved";
    showToast("Leave request approved", "success");
    renderLeavesTable();
  }));
  document.querySelectorAll("#leavesTableBody [data-reject]").forEach((btn) => btn.addEventListener("click", () => {
    db.leaveRequests.find((l) => l.id === btn.dataset.reject).status = "Rejected";
    showToast("Leave request rejected", "warning");
    renderLeavesTable();
  }));
}

function renderComplaintsTable() {
  const db = window.__BUS_DB__;
  document.getElementById("complaintsTableBody").innerHTML = db.complaints.map((c) => `
    <tr>
      <td class="font-medium text-slate-800">${c.student}</td>
      <td class="font-mono text-xs">${c.bus}</td>
      <td class="text-slate-600">${c.subject}</td>
      <td>${c.date}</td>
      <td>${renderStatusBadge(c.status === "Resolved" ? "Approved" : "Pending")}</td>
    </tr>
  `).join("");
}

/* ---------------- Router ---------------- */
function renderSection(key) {
  const main = document.getElementById("mainContent");
  const templates = {
    dashboard: "tpl-overview", fleet: "tpl-fleet", routes: "tpl-routes",
    attendance: "tpl-attendance", leaves: "tpl-leaves", complaints: "tpl-complaints",
  };
  const tplId = templates[key] || "tpl-empty-generic";
  const tpl = document.getElementById(tplId);
  main.innerHTML = "";
  main.appendChild(tpl.content.cloneNode(true));
  setActiveNav(key === "dashboard" ? "dashboard" : key);
  document.querySelector("h1")?.replaceChildren(document.createTextNode(PAGE_TITLES[key] || "Dashboard"));

  if (key === "dashboard") {
    renderOpsCenter();
    renderKPIs();
    renderFleetFilters();
    renderLiveFleetList();
    renderMapMarkers();
    renderTrendChart();
    renderPendingApprovals();
    document.getElementById("refreshBtn")?.addEventListener("click", () => {
      showToast("Fleet data refreshed", "info");
      renderKPIs(); renderLiveFleetList(); renderMapMarkers();
    });
    document.getElementById("addBusBtnTop")?.addEventListener("click", openAddBusModal);
  } else if (key === "fleet") {
    renderFleetTable();
    document.getElementById("addBusBtn")?.addEventListener("click", openAddBusModal);
  } else if (key === "routes") {
    renderRoutesGrid();
  } else if (key === "attendance") {
    renderAttendancePage();
  } else if (key === "leaves") {
    renderLeavesTable();
  } else if (key === "complaints") {
    renderComplaintsTable();
  }
}

function openAddBusModal() {
  showModal(`
    <form class="p-6" id="addBusForm">
      <h3 class="font-bold text-lg text-slate-900 mb-4">Add New Bus</h3>
      <div class="grid grid-cols-2 gap-3 mb-5">
        <div class="col-span-2"><label class="field-label">Bus ID</label><input class="input font-mono" placeholder="BUS-013" required /></div>
        <div class="col-span-2"><label class="field-label">Registration Number</label><input class="input font-mono" placeholder="UK04-AF-2210" required /></div>
        <div><label class="field-label">Capacity</label><input type="number" class="input" placeholder="45" required /></div>
        <div><label class="field-label">Route</label>
          <select class="select">
            <option>Route A</option><option>Route B</option><option>Route C</option><option>Route D</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-secondary flex-1" data-close-modal>Cancel</button>
        <button type="submit" class="btn-primary flex-1">Add Bus</button>
      </div>
    </form>
  `);
  document.getElementById("addBusForm").addEventListener("submit", (e) => {
    e.preventDefault();
    hideModal();
    showToast("Bus added successfully", "success");
  });
}

function router() {
  const key = (window.location.hash || "#dashboard").replace("#", "");
  renderSection(key);
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell({
    role: "admin",
    navItems: ADMIN_NAV,
    activeKey: "dashboard",
    pageTitle: "Dashboard",
    userName: "Admin User",
  });
  initSidebar();
  initDropdowns();
  renderNotificationPanel();
  initGlobalSearch();
  initLogout();

  router();
  window.addEventListener("hashchange", router);

  liveTicker = startLiveSimulation(() => {
    const key = (window.location.hash || "#dashboard").replace("#", "");
    if (key === "dashboard") {
      renderKPIs();
      renderLiveFleetList(document.querySelector("#fleetFilters .bg-accent-600")?.dataset.filter || "All");
      renderMapMarkers(document.querySelector("#fleetFilters .bg-accent-600")?.dataset.filter || "All");
    }
  });
});
