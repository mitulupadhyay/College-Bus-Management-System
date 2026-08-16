/* ==========================================================================
   parent.js — Parent dashboard logic
   ========================================================================== */

const PARENT_NAV = [
  { items: [
    { key: "overview", label: "Overview", icon: "fa-house", href: "#overview" },
    { key: "tracking", label: "Child Tracking", icon: "fa-location-crosshairs", href: "#overview" },
    { key: "notifications", label: "Notifications", icon: "fa-bell", href: "#overview" },
  ]},
];

function renderJourneyTracker() {
  const el = document.getElementById("journeyTracker");
  if (!el) return;
  const steps = window.__BUS_DB__.parentChild.journey;
  el.innerHTML = steps.map((s, i) => `
    <div class="flex items-start gap-3">
      <div class="flex flex-col items-center">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs ${s.done ? "bg-success-500 text-white" : "bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300"}">
          ${s.done ? '<i class="fa-solid fa-check"></i>' : ""}
        </div>
        ${i < steps.length - 1 ? `<div class="w-0.5 flex-1 ${s.done ? "bg-success-400" : "bg-slate-200"}" style="min-height:32px"></div>` : ""}
      </div>
      <div class="pb-6 -mt-0.5">
        <p class="text-sm font-medium ${s.done ? "text-slate-800" : "text-slate-400"}">${s.label}</p>
        ${s.time ? `<p class="text-xs text-slate-400 mt-0.5">${s.time}</p>` : `<p class="text-xs text-slate-300 mt-0.5">Pending</p>`}
      </div>
    </div>
  `).join("");
}

function renderParentEvents() {
  const el = document.getElementById("parentEventsList");
  if (!el) return;
  el.innerHTML = window.__BUS_DB__.parentChild.events.map((e) => `
    <div class="flex gap-3">
      <div class="w-16 shrink-0 text-xs font-mono text-slate-400 pt-0.5">${e.time}</div>
      <div class="w-2 h-2 rounded-full bg-accent-500 mt-1.5 shrink-0"></div>
      <p class="text-sm text-slate-700 flex-1">${e.text}</p>
    </div>
  `).join("");
}

function parentRouter() {
  const main = document.getElementById("mainContent");
  main.innerHTML = "";
  main.appendChild(document.getElementById("tpl-overview").content.cloneNode(true));
  setActiveNav("overview");
  renderJourneyTracker();
  renderParentEvents();
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell({ role: "parent", navItems: PARENT_NAV, activeKey: "overview", pageTitle: "Overview", userName: "Suresh Prasad" });
  initSidebar(); initDropdowns(); renderNotificationPanel(); initGlobalSearch(); initLogout();
  parentRouter();
  window.addEventListener("hashchange", parentRouter);
});
