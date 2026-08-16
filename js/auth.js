/* ==========================================================================
   auth.js — role selection + mock authentication for the login page
   ========================================================================== */

const ROLES = [
  { key: "admin", label: "Admin", icon: "fa-user-shield", email: "admin@college.edu", dest: "pages/admin-dashboard.html" },
  { key: "student", label: "Student", icon: "fa-user-graduate", email: "student@college.edu", dest: "pages/student-dashboard.html" },
  { key: "parent", label: "Parent", icon: "fa-people-roof", email: "parent@college.edu", dest: "pages/parent-dashboard.html" },
  { key: "driver", label: "Driver", icon: "fa-id-card", email: "driver@college.edu", dest: "pages/driver-dashboard.html" },
  { key: "conductor", label: "Conductor", icon: "fa-ticket", email: "conductor@college.edu", dest: "pages/conductor-dashboard.html" },
];

let selectedRole = ROLES[0];

function renderRoleGrid() {
  const grid = document.getElementById("roleGrid");
  grid.innerHTML = ROLES.map((r) => `
    <button type="button" data-role="${r.key}" class="role-pill ${r.key === selectedRole.key ? "is-active" : ""}">
      <i class="fa-solid ${r.icon} role-pill-icon"></i>
      <span class="role-pill-label">${r.label}</span>
    </button>
  `).join("");

  grid.querySelectorAll(".role-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRole = ROLES.find((r) => r.key === btn.dataset.role);
      document.getElementById("selectedRoleLabel").textContent = selectedRole.label;
      document.getElementById("email").value = selectedRole.email;
      renderRoleGrid();
    });
  });
}

function initPasswordToggle() {
  const btn = document.getElementById("togglePw");
  const input = document.getElementById("password");
  btn.addEventListener("click", () => {
    const isPw = input.type === "password";
    input.type = isPw ? "text" : "password";
    btn.innerHTML = `<i class="fa-regular ${isPw ? "fa-eye-slash" : "fa-eye"}"></i>`;
  });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (!password) {
      errorBox.textContent = "Please enter a password to continue.";
      errorBox.classList.remove("hidden");
      return;
    }

    // Mock auth: accept any password, but nudge if email doesn't match selected role
    const matchedRole = ROLES.find((r) => r.email === email) || selectedRole;

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in...`;

    setTimeout(() => {
      sessionStorage.setItem("bus_role", matchedRole.key);
      sessionStorage.setItem("bus_email", email);
      window.location.href = matchedRole.dest;
    }, 600);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("email").value = selectedRole.email;
  renderRoleGrid();
  initPasswordToggle();
  initLoginForm();
});
