/* ==========================================================================
   student.js — Student dashboard logic
   ========================================================================== */

const STUDENT_NAV = [
  { items: [
    { key: "overview", label: "Overview", icon: "fa-house", href: "#overview" },
    { key: "mybus", label: "My Bus", icon: "fa-bus", href: "#overview" },
    { key: "tracking", label: "Live Tracking", icon: "fa-location-crosshairs", href: "#overview" },
    { key: "pass", label: "My Pass", icon: "fa-qrcode", href: "#pass" },
    { key: "attendance", label: "Attendance", icon: "fa-clipboard-check", href: "#overview" },
    { key: "leave", label: "Leave Request", icon: "fa-calendar-minus", href: "#leave" },
    { key: "complaints", label: "Complaints", icon: "fa-comment-dots", href: "#complaints" },
  ]},
  { section: "Safety", items: [
    { key: "sos", label: "Emergency SOS", icon: "fa-triangle-exclamation", href: "#sos" },
  ]},
];

const STUDENT_TITLES = { overview: "Overview", pass: "My Pass", leave: "Leave Request", complaints: "Complaints", sos: "Emergency SOS" };

function renderQRGrid() {
  const grid = document.getElementById("qrCodeGrid");
  if (!grid) return;
  let cells = "";
  for (let i = 0; i < 64; i++) {
    const dark = Math.random() > 0.52;
    cells += `<div class="${dark ? "bg-slate-900" : "bg-white"} rounded-[1px]"></div>`;
  }
  grid.innerHTML = cells;
}

function renderStudentAttWeek() {
  const el = document.getElementById("studentAttWeek");
  if (!el) return;
  const days = [
    { d: "Mon", ok: true }, { d: "Tue", ok: true }, { d: "Wed", ok: false },
    { d: "Thu", ok: true }, { d: "Fri", ok: true }, { d: "Sat", ok: true }, { d: "Today", ok: true },
  ];
  el.innerHTML = days.map((d) => `
    <div class="flex-1 flex flex-col items-center gap-1.5">
      <div class="w-full rounded-md ${d.ok ? "bg-success-400" : "bg-slate-200"}" style="height:${d.ok ? 64 : 24}px"></div>
      <span class="text-[10px] text-slate-400">${d.d}</span>
    </div>
  `).join("");
}

let leaveHistory = [
  { type: "Morning", date: "2026-08-18", reason: "Doctor appointment", status: "Pending" },
  { type: "Full Day", date: "2026-08-10", reason: "Family function", status: "Approved" },
];

function renderLeaveHistory() {
  const el = document.getElementById("leaveHistoryList");
  if (!el) return;
  if (leaveHistory.length === 0) {
    el.innerHTML = emptyState("No Leave Requests", "You don't have any leave requests yet.");
    return;
  }
  el.innerHTML = leaveHistory.map((l) => `
    <div class="flex items-center justify-between border border-slate-100 rounded-lg p-3">
      <div>
        <p class="text-sm font-medium text-slate-800">${l.type}</p>
        <p class="text-xs text-slate-400 mt-0.5">${l.date} · ${l.reason}</p>
      </div>
      ${renderStatusBadge(l.status)}
    </div>
  `).join("");
}

function emptyState(title, sub) {
  return `
    <div class="flex flex-col items-center justify-center text-center py-10">
      <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-lg mb-3">
        <i class="fa-regular fa-folder-open"></i>
      </div>
      <p class="text-sm font-medium text-slate-700">${title}</p>
      <p class="text-xs text-slate-400 mt-1 max-w-[220px]">${sub}</p>
    </div>
  `;
}

let studentComplaints = [
  { subject: "Bus arrived 15 min late on Tuesday", status: "Pending", date: "2026-08-12" },
];

function renderStudentComplaints() {
  const el = document.getElementById("studentComplaintsList");
  if (!el) return;
  if (studentComplaints.length === 0) {
    el.innerHTML = `<div class="card card-pad">${emptyState("No Complaints", "You haven't reported any issues.")}</div>`;
    return;
  }
  el.innerHTML = studentComplaints.map((c) => `
    <div class="card card-pad flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-slate-800">${c.subject}</p>
        <p class="text-xs text-slate-400 mt-0.5">${c.date}</p>
      </div>
      ${renderStatusBadge(c.status)}
    </div>
  `).join("");
}

function renderStudentSection(key) {
  const main = document.getElementById("mainContent");
  const templates = { overview: "tpl-overview", pass: "tpl-pass", leave: "tpl-leave", complaints: "tpl-complaints", sos: "tpl-sos" };
  const tpl = document.getElementById(templates[key] || "tpl-empty-generic");
  main.innerHTML = "";
  main.appendChild(tpl.content.cloneNode(true));
  setActiveNav(key === "overview" ? "overview" : key);
  document.querySelector("h1")?.replaceChildren(document.createTextNode(STUDENT_TITLES[key] || "Overview"));

  if (key === "overview") {
    renderStudentAttWeek();
  } else if (key === "pass") {
    renderQRGrid();
  } else if (key === "leave") {
    renderLeaveHistory();
    document.getElementById("leaveDate").valueAsDate = new Date();
    document.querySelectorAll(".leave-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".leave-type-btn").forEach((b) => b.classList.remove("bg-accent-600", "text-white", "border-accent-600"));
        document.querySelectorAll(".leave-type-btn").forEach((b) => b.classList.add("bg-white", "text-slate-600", "border-slate-200"));
        btn.classList.remove("bg-white", "text-slate-600", "border-slate-200");
        btn.classList.add("bg-accent-600", "text-white", "border-accent-600");
      });
    });
    document.getElementById("leaveForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const type = document.querySelector(".leave-type-btn.bg-accent-600")?.dataset.type || "Morning";
      leaveHistory.unshift({
        type, date: document.getElementById("leaveDate").value,
        reason: document.getElementById("leaveReason").value, status: "Pending",
      });
      showToast("Leave request submitted", "success");
      e.target.reset();
      document.getElementById("leaveDate").valueAsDate = new Date();
      renderLeaveHistory();
    });
  } else if (key === "complaints") {
    renderStudentComplaints();
    document.getElementById("newComplaintBtn")?.addEventListener("click", () => {
      showModal(`
        <form class="p-6" id="complaintForm">
          <h3 class="font-bold text-lg text-slate-900 mb-4">Report an Issue</h3>
          <label class="field-label">Subject</label>
          <input id="complaintSubject" class="input mb-4" placeholder="Describe the issue" required />
          <div class="flex gap-2">
            <button type="button" class="btn-secondary flex-1" data-close-modal>Cancel</button>
            <button type="submit" class="btn-primary flex-1">Submit</button>
          </div>
        </form>
      `);
      document.getElementById("complaintForm").addEventListener("submit", (e) => {
        e.preventDefault();
        studentComplaints.unshift({ subject: document.getElementById("complaintSubject").value, status: "Pending", date: "2026-08-16" });
        hideModal();
        showToast("Complaint submitted", "success");
        renderStudentComplaints();
      });
    });
  } else if (key === "sos") {
    document.getElementById("sosBtn").addEventListener("click", () => {
      showModal(`
        <div class="p-6 text-center">
          <div class="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center text-xl mx-auto mb-4">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h3 class="font-bold text-lg text-slate-900 mb-2">Confirm Emergency Alert</h3>
          <p class="text-sm text-slate-500 mb-6">Emergency alert will be sent to: <br><span class="font-medium text-slate-700">Transport Admin, Driver, College Security</span></p>
          <div class="flex gap-2">
            <button class="btn-secondary flex-1" data-close-modal>Cancel</button>
            <button class="btn-danger flex-1" id="confirmSosBtn">Confirm SOS</button>
          </div>
        </div>
      `);
      document.getElementById("confirmSosBtn").addEventListener("click", () => {
        hideModal();
        showToast("🚨 SOS ALERT SENT — Admin has been notified", "danger");
        pushNotification("🚨", "Emergency SOS sent by Mitul Upadhyay");
      });
    });
  }
}

function studentRouter() {
  const key = (window.location.hash || "#overview").replace("#", "");
  renderStudentSection(key);
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell({ role: "student", navItems: STUDENT_NAV, activeKey: "overview", pageTitle: "Overview", userName: "Mitul Upadhyay" });
  initSidebar(); initDropdowns(); renderNotificationPanel(); initGlobalSearch(); initLogout();
  studentRouter();
  window.addEventListener("hashchange", studentRouter);

  startLiveSimulation(() => {
    const etaEl = document.getElementById("studentEta");
    if (etaEl) {
      const bus = window.__BUS_DB__.buses.find((b) => b.id === "BUS-007");
      etaEl.textContent = `${String(bus.eta).padStart(2, "0")} min`;
      const marker = document.getElementById("studentBusMarker");
      if (marker) marker.style.left = `${Math.min(90, 35 + (8 - bus.eta) * 6)}%`;
    }
  });
});
