/* ==========================================================================
   driver.js — Driver dashboard logic (kept simple for in-motion use)
   ========================================================================== */

const DRIVER_NAV = [
  { items: [
    { key: "home", label: "Trip Control", icon: "fa-house", href: "#home" },
  ]},
];

let driverStatus = "Running";
let tripActive = false;

function renderDriverStatusButtons() {
  const statuses = ["Running", "Delayed", "Arrived"];
  const el = document.getElementById("driverStatusButtons");
  if (!el) return;
  el.innerHTML = statuses.map((s) => `
    <button data-status="${s}" class="driver-status-btn py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${s === driverStatus ? statusActiveClass(s) : "bg-white text-slate-500 border-slate-200"}">${s}</button>
  `).join("");
  el.querySelectorAll(".driver-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      driverStatus = btn.dataset.status;
      const bus = window.__BUS_DB__.buses.find((b) => b.id === "BUS-007");
      bus.status = driverStatus;
      showToast(`Status updated to ${driverStatus}`, "info");
      renderDriverStatusButtons();
    });
  });
}
function statusActiveClass(s) {
  if (s === "Running") return "bg-success-500 text-white border-success-500";
  if (s === "Delayed") return "bg-warning-500 text-white border-warning-500";
  return "bg-accent-600 text-white border-accent-600";
}

function renderManifest() {
  const body = document.getElementById("manifestBody");
  if (!body) return;
  const students = window.__BUS_DB__.students.filter((s) => s.bus === "BUS-007");
  body.innerHTML = students.map((s) => `
    <tr>
      <td class="font-medium text-slate-800">${s.name}</td>
      <td>${s.stop}</td>
      <td>${s.status === "Boarded" ? '<i class="fa-solid fa-circle-check text-success-500"></i>' : '<i class="fa-regular fa-circle text-slate-300"></i>'}</td>
      <td class="text-xs text-slate-500">${s.boardTime}</td>
    </tr>
  `).join("");
}

function driverRouter() {
  const main = document.getElementById("mainContent");
  main.innerHTML = "";
  main.appendChild(document.getElementById("tpl-home").content.cloneNode(true));
  setActiveNav("home");

  document.getElementById("startTripBtn").addEventListener("click", () => {
    tripActive = true;
    document.getElementById("preTripView").classList.add("hidden");
    document.getElementById("activeTripView").classList.remove("hidden");
    renderDriverStatusButtons();
    renderManifest();
    showToast("Trip started — students & admin notified", "success");
    pushNotification("🚌", "Bus #07 started its trip");
  });

  document.getElementById("endTripBtn").addEventListener("click", () => {
    tripActive = false;
    document.getElementById("preTripView").classList.remove("hidden");
    document.getElementById("activeTripView").classList.add("hidden");
    showToast("Trip ended", "info");
  });

  document.getElementById("emergencyBtn").addEventListener("click", () => {
    showModal(`
      <div class="p-6 text-center">
        <div class="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center text-xl mx-auto mb-4">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 class="font-bold text-lg text-slate-900 mb-2">Report Emergency</h3>
        <p class="text-sm text-slate-500 mb-6">This will immediately alert the transport admin and college security.</p>
        <div class="flex gap-2">
          <button class="btn-secondary flex-1" data-close-modal>Cancel</button>
          <button class="btn-danger flex-1" id="confirmEmergencyBtn">Confirm</button>
        </div>
      </div>
    `);
    document.getElementById("confirmEmergencyBtn").addEventListener("click", () => {
      hideModal();
      showToast("🚨 Emergency reported — admin notified", "danger");
      pushNotification("🚨", "Emergency reported on Bus #07");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell({ role: "driver", navItems: DRIVER_NAV, activeKey: "home", pageTitle: "Trip Control", userName: "Rahul Sharma" });
  initSidebar(); initDropdowns(); renderNotificationPanel(); initGlobalSearch(); initLogout();
  driverRouter();
});
