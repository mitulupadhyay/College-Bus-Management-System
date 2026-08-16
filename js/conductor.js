/* ==========================================================================
   conductor.js — Conductor dashboard logic
   ========================================================================== */

const CONDUCTOR_NAV = [
  { items: [
    { key: "home", label: "QR Scanner", icon: "fa-house", href: "#home" },
  ]},
];

let cndFilter = "all";

function renderConductorList() {
  const list = document.getElementById("conductorStudentList");
  if (!list) return;
  const students = window.__BUS_DB__.students.filter((s) => s.bus === "BUS-007" && (cndFilter === "all" || s.status === cndFilter));
  list.innerHTML = students.map((s) => `
    <div class="flex items-center gap-3 border border-slate-100 rounded-lg p-2.5">
      <div class="avatar">${s.name.split(" ").map(w => w[0]).join("")}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-800 truncate">${s.name}</p>
        <p class="text-xs text-slate-400">${s.stop}</p>
      </div>
      ${renderStatusBadge(s.status)}
    </div>
  `).join("");

  const count = window.__BUS_DB__.students.filter((s) => s.bus === "BUS-007" && s.status === "Boarded").length;
  document.getElementById("conductorCount").textContent = count;
  document.getElementById("conductorProgress").style.width = `${(count / 45) * 100}%`;
}

function simulateScan() {
  const pending = window.__BUS_DB__.students.filter((s) => s.bus === "BUS-007" && s.status === "Not Boarded");
  showModal(`
    <div class="p-6 text-center">
      <div class="w-40 h-40 mx-auto rounded-2xl bg-navy-900 flex items-center justify-center mb-5 relative overflow-hidden">
        <i class="fa-solid fa-qrcode text-white/30 text-6xl"></i>
        <div class="absolute inset-x-0 h-0.5 bg-accent-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.8)]" style="animation: scan-line 1.4s ease-in-out infinite;"></div>
      </div>
      <p class="text-sm text-slate-500">Scanning pass...</p>
    </div>
    <style>@keyframes scan-line { 0%,100% { top: 8%; } 50% { top: 88%; } }</style>
  `);

  setTimeout(() => {
    const student = pending.length > 0 ? pending[0] : window.__BUS_DB__.students.find((s) => s.bus === "BUS-007");
    showModal(`
      <div class="p-6 text-center">
        <div class="w-14 h-14 rounded-2xl bg-success-50 text-success-500 flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 class="font-bold text-lg text-slate-900 mb-1">Student Verified</h3>
        <p class="font-medium text-slate-700">${student.name}</p>
        <p class="text-xs font-mono text-slate-400 mb-4">ID: ${student.id}</p>
        <div class="grid grid-cols-2 gap-3 text-sm mb-6 text-left">
          <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-400">Bus</p><p class="font-mono font-medium text-slate-800">${student.bus}</p></div>
          <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-400">Stop</p><p class="font-medium text-slate-800">${student.stop}</p></div>
          <div class="bg-slate-50 rounded-lg p-3 col-span-2"><p class="text-xs text-slate-400">Time</p><p class="font-medium text-slate-800">07:52 AM</p></div>
        </div>
        <button id="markAttendanceBtn" class="btn-primary w-full">Mark Attendance</button>
      </div>
    `);
    document.getElementById("markAttendanceBtn").addEventListener("click", () => {
      student.status = "Boarded";
      student.boardTime = "07:52 AM";
      hideModal();
      showToast(`✓ ${student.name}'s attendance marked`, "success");
      pushNotification("✓", `${student.name} boarded ${student.bus}`);
      renderConductorList();
    });
  }, 1400);
}

function conductorRouter() {
  const main = document.getElementById("mainContent");
  main.innerHTML = "";
  main.appendChild(document.getElementById("tpl-home").content.cloneNode(true));
  setActiveNav("home");
  renderConductorList();

  document.getElementById("scanBtn").addEventListener("click", simulateScan);
  document.querySelectorAll(".cnd-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      cndFilter = btn.dataset.filter;
      document.querySelectorAll(".cnd-filter-btn").forEach((b) => b.classList.remove("bg-accent-600", "text-white"));
      document.querySelectorAll(".cnd-filter-btn").forEach((b) => b.classList.add("bg-slate-100", "text-slate-500"));
      btn.classList.remove("bg-slate-100", "text-slate-500");
      btn.classList.add("bg-accent-600", "text-white");
      renderConductorList();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell({ role: "conductor", navItems: CONDUCTOR_NAV, activeKey: "home", pageTitle: "QR Scanner", userName: "Amit Kumar" });
  initSidebar(); initDropdowns(); renderNotificationPanel(); initGlobalSearch(); initLogout();
  conductorRouter();
});
