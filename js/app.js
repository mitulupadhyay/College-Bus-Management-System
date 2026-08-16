/* ==========================================================================
   app.js — shared utilities used across every dashboard page
   ========================================================================== */

/* ---------------- Sidebar (desktop collapse + mobile drawer) ---------------- */
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const openBtn = document.getElementById("openSidebarBtn");
  const closeBtn = document.getElementById("closeSidebarBtn");
  const collapseBtn = document.getElementById("collapseSidebarBtn");

  const openDrawer = () => {
    sidebar?.classList.remove("-translate-x-full");
    overlay?.classList.remove("hidden");
  };
  const closeDrawer = () => {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  };

  openBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  // Desktop collapse (icon-only) toggle
  collapseBtn?.addEventListener("click", () => {
    document.getElementById("appShell")?.classList.toggle("sidebar-collapsed");
    sidebar?.classList.toggle("lg:w-[76px]");
    sidebar?.classList.toggle("lg:w-64");
    document.querySelectorAll(".sidebar-label").forEach((el) => el.classList.toggle("lg:hidden"));
  });

  // Close drawer automatically when a link is tapped on mobile
  sidebar?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeDrawer));
}

/* ---------------- Generic dropdown (profile / notifications) ---------------- */
function initDropdowns() {
  const triggers = document.querySelectorAll("[data-dropdown-trigger]");
  triggers.forEach((trigger) => {
    const targetId = trigger.getAttribute("data-dropdown-trigger");
    const panel = document.getElementById(targetId);
    if (!panel) return;
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !panel.classList.contains("hidden");
      document.querySelectorAll("[data-dropdown-panel]").forEach((p) => p.classList.add("hidden"));
      panel.classList.toggle("hidden", isOpen);
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll("[data-dropdown-panel]").forEach((p) => p.classList.add("hidden"));
  });
  document.querySelectorAll("[data-dropdown-panel]").forEach((p) => p.addEventListener("click", (e) => e.stopPropagation()));
}

/* ---------------- Toast notifications ---------------- */
function ensureToastContainer() {
  let c = document.getElementById("toastContainer");
  if (!c) {
    c = document.createElement("div");
    c.id = "toastContainer";
    c.className = "fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none";
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = "success") {
  const container = ensureToastContainer();
  const colors = {
    success: { icon: "fa-circle-check", cls: "text-success-600" },
    warning: { icon: "fa-triangle-exclamation", cls: "text-warning-600" },
    danger: { icon: "fa-circle-exclamation", cls: "text-danger-600" },
    info: { icon: "fa-circle-info", cls: "text-accent-600" },
  };
  const c = colors[type] || colors.success;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <i class="fa-solid ${c.icon} ${c.cls} mt-0.5"></i>
    <p class="text-sm text-slate-700 flex-1">${message}</p>
    <button class="text-slate-300 hover:text-slate-500 text-sm" aria-label="Dismiss">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  toast.querySelector("button").addEventListener("click", () => removeToast(toast));
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), 4500);
}

function removeToast(toast) {
  if (!toast.isConnected) return;
  toast.classList.add("toast-out");
  setTimeout(() => toast.remove(), 200);
}

/* ---------------- Modal system ---------------- */
function showModal(html, { size = "max-w-lg" } = {}) {
  hideModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "activeModal";
  overlay.innerHTML = `<div class="modal-panel ${size}">${html}</div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideModal();
  });
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  overlay.querySelectorAll("[data-close-modal]").forEach((btn) => btn.addEventListener("click", hideModal));
  document.addEventListener("keydown", escCloseModal);
  return overlay;
}

function escCloseModal(e) {
  if (e.key === "Escape") hideModal();
}

function hideModal() {
  const overlay = document.getElementById("activeModal");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
  document.removeEventListener("keydown", escCloseModal);
}

/* ---------------- Badge helper ---------------- */
function statusBadgeClass(status) {
  const map = {
    Running: "badge-running", Delayed: "badge-delayed", Arrived: "badge-arrived", Offline: "badge-offline",
    Active: "badge-active", Inactive: "badge-inactive", Boarded: "badge-boarded", "Not Boarded": "badge-notboarded",
    Emergency: "badge-emergency", Pending: "badge-pending", Approved: "badge-approved", Rejected: "badge-rejected",
  };
  return map[status] || "badge-offline";
}
function statusDotColor(status) {
  const map = {
    Running: "bg-success-500", Delayed: "bg-warning-500", Arrived: "bg-accent-500", Offline: "bg-slate-400",
    Active: "bg-success-500", Inactive: "bg-slate-400", Boarded: "bg-success-500", "Not Boarded": "bg-slate-400",
    Emergency: "bg-danger-500", Pending: "bg-warning-500", Approved: "bg-success-500", Rejected: "bg-danger-500",
  };
  return map[status] || "bg-slate-400";
}
function renderStatusBadge(status) {
  return `<span class="${statusBadgeClass(status)}"><span class="badge-dot ${statusDotColor(status)}"></span>${status}</span>`;
}

/* ---------------- Notification bell rendering ---------------- */
function renderNotificationPanel() {
  const panel = document.getElementById("notifPanel");
  const badge = document.getElementById("notifBadge");
  if (!panel) return;
  const db = window.__BUS_DB__;
  const unreadCount = db.notifications.filter((n) => n.unread).length;
  if (badge) {
    badge.textContent = unreadCount;
    badge.classList.toggle("hidden", unreadCount === 0);
  }
  panel.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <p class="font-semibold text-sm text-slate-800">Notifications</p>
      <button id="markAllReadBtn" class="text-xs text-accent-600 font-medium hover:underline">Mark all read</button>
    </div>
    <div class="max-h-80 overflow-y-auto divide-y divide-slate-50">
      ${db.notifications.map((n) => `
        <div class="flex gap-3 px-4 py-3 ${n.unread ? "bg-accent-50/40" : ""} hover:bg-slate-50 transition-colors">
          <span class="text-lg leading-none">${n.icon}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-slate-700 leading-snug">${n.text}</p>
            <p class="text-xs text-slate-400 mt-0.5">${n.time}</p>
          </div>
          ${n.unread ? '<span class="w-2 h-2 rounded-full bg-accent-500 mt-1.5 shrink-0"></span>' : ""}
        </div>
      `).join("")}
    </div>
  `;
  document.getElementById("markAllReadBtn")?.addEventListener("click", () => {
    db.notifications.forEach((n) => (n.unread = false));
    renderNotificationPanel();
    showToast("All notifications marked as read", "info");
  });
}

function pushNotification(icon, text) {
  const db = window.__BUS_DB__;
  db.notifications.unshift({ id: Date.now(), icon, text, time: "Just now", unread: true });
  renderNotificationPanel();
}

/* ---------------- Global search ---------------- */
function initGlobalSearch() {
  const input = document.getElementById("globalSearch");
  const results = document.getElementById("globalSearchResults");
  if (!input || !results) return;
  const db = window.__BUS_DB__;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.classList.add("hidden");
      results.innerHTML = "";
      return;
    }
    const matches = [];
    db.buses.forEach((b) => {
      if (b.id.toLowerCase().includes(q) || b.route.toLowerCase().includes(q) || b.driver.toLowerCase().includes(q)) {
        matches.push({ type: "Bus", title: b.id, subtitle: `${b.route} · Driver: ${b.driver} · ${b.status}` });
      }
    });
    db.students.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) {
        matches.push({ type: "Student", title: s.name, subtitle: `${s.id} · ${s.bus}` });
      }
    });
    db.routes.forEach((r) => {
      if (r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) {
        matches.push({ type: "Route", title: r.name, subtitle: `${r.stops.length} stops · ${r.distance}` });
      }
    });
    [...db.drivers, ...db.conductors].forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        matches.push({ type: "Staff", title: p.name, subtitle: `${p.bus} · ${p.status}` });
      }
    });

    if (matches.length === 0) {
      results.innerHTML = `<div class="px-4 py-6 text-center text-sm text-slate-400">No results for "${input.value}"</div>`;
    } else {
      results.innerHTML = matches.slice(0, 8).map((m) => `
        <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
          <span class="text-[10px] font-bold uppercase tracking-wide text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded">${m.type}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-800 truncate">${m.title}</p>
            <p class="text-xs text-slate-400 truncate">${m.subtitle}</p>
          </div>
        </div>
      `).join("");
    }
    results.classList.remove("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.add("hidden");
    }
  });
}

/* ---------------- Live simulated tracking ticker ---------------- */
function startLiveSimulation(onTick) {
  return setInterval(() => {
    const db = window.__BUS_DB__;
    db.buses.forEach((b) => {
      if (b.status === "Running" || b.status === "Delayed") {
        if (b.eta !== null && b.eta > 0) b.eta = Math.max(0, b.eta - 1);
        b.lat = Math.min(95, b.lat + (Math.random() * 3));
        if (Math.random() > 0.7 && b.occupancy < b.capacity) b.occupancy += 1;
      }
    });
    if (typeof onTick === "function") onTick(db);
  }, 4000);
}

/* ---------------- Active nav link highlighting ---------------- */
function setActiveNav(key) {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-nav") === key);
  });
  document.querySelectorAll("[data-mobile-nav]").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-mobile-nav") === key);
  });
}

/* ---------------- Logout ---------------- */
function initLogout() {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  });
}

/* ---------------- Init on every dashboard page ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initDropdowns();
  renderNotificationPanel();
  initGlobalSearch();
  initLogout();
});
