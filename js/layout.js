/* ==========================================================================
   layout.js — builds the responsive app shell (sidebar, topbar, drawer)
   Must run BEFORE app.js so #sidebar / #openSidebarBtn exist when
   app.js's DOMContentLoaded handler wires up interactivity.
   ========================================================================== */

const ROLE_THEME = {
  admin: { label: "Admin", initials: "AD", color: "bg-accent-600" },
  student: { label: "Student", initials: "MU", color: "bg-emerald-600" },
  parent: { label: "Parent", initials: "SP", color: "bg-amber-600" },
  driver: { label: "Driver", initials: "RS", color: "bg-indigo-600" },
  conductor: { label: "Conductor", initials: "AK", color: "bg-rose-600" },
};

function renderShell(cfg) {
  const { role, navItems, activeKey, pageTitle, userName, basePath = "" } = cfg;
  const theme = ROLE_THEME[role] || ROLE_THEME.admin;
  const shell = document.getElementById("appShell");
  if (!shell) return;

  shell.innerHTML = `
    <!-- Mobile drawer overlay -->
    <div id="sidebarOverlay" class="fixed inset-0 bg-slate-900/50 z-40 hidden lg:hidden"></div>

    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside id="sidebar"
        class="sidebar fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 -translate-x-full lg:translate-x-0
               transition-transform duration-300 ease-out shrink-0">
        <div class="flex items-center justify-between px-5 h-16 border-b border-white/5">
          <a href="${basePath}../index.html" class="brand-mark">
            <div class="brand-mark-icon">
              <i class="fa-solid fa-bus text-white text-sm"></i>
            </div>
            <span class="brand-mark-text sidebar-label">
              <span class="brand-mark-title">CAMPUSTRANSIT</span>
              <span class="brand-mark-sub block">College Transport</span>
            </span>
          </a>
          <button id="closeSidebarBtn" class="lg:hidden text-slate-400 hover:text-white p-1" aria-label="Close menu">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          ${navItems.map((section) => `
            ${section.section ? `<p class="sidebar-section-label sidebar-label">${section.section}</p>` : ""}
            ${section.items.map((item) => `
              <a href="${item.href}" data-nav="${item.key}" class="sidebar-link ${item.key === activeKey ? "active" : ""}">
                <i class="fa-solid ${item.icon} w-4 text-center text-[13px]"></i>
                <span class="sidebar-label">${item.label}</span>
              </a>
            `).join("")}
          `).join("")}
        </nav>

        <div class="px-3 py-4 border-t border-white/5">
          <button data-logout class="sidebar-link w-full">
            <i class="fa-solid fa-right-from-bracket w-4 text-center text-[13px]"></i>
            <span class="sidebar-label">Log out</span>
          </button>
        </div>
      </aside>

      <!-- Main column -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Topbar -->
        <header class="topbar">
          <div class="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button id="openSidebarBtn" class="lg:hidden btn-icon" aria-label="Open menu">
              <i class="fa-solid fa-bars"></i>
            </button>
            <button id="collapseSidebarBtn" class="hidden lg:inline-flex btn-icon" aria-label="Toggle sidebar">
              <i class="fa-solid fa-bars"></i>
            </button>

            <h1 class="hidden sm:block font-semibold text-slate-800 text-base mr-2">${pageTitle}</h1>

            <div class="topbar-search-wrap ml-auto sm:ml-0">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input id="globalSearch" type="text" placeholder="Search buses, students, routes..." class="topbar-search" />
              <div id="globalSearchResults" class="hidden absolute mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-40 overflow-hidden max-h-80 overflow-y-auto"></div>
            </div>

            <div class="flex items-center gap-1.5 ml-auto sm:ml-2">
              <div class="relative">
                <button data-dropdown-trigger="notifPanel" class="topbar-icon-btn" aria-label="Notifications">
                  <i class="fa-regular fa-bell"></i>
                  <span id="notifBadge" class="topbar-badge hidden"></span>
                </button>
                <div id="notifPanel" data-dropdown-panel class="hidden absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl border border-slate-200 shadow-xl z-40 overflow-hidden"></div>
              </div>

              <div class="relative">
                <button data-dropdown-trigger="profilePanel" class="topbar-profile-chip">
                  <div class="w-8 h-8 rounded-full ${theme.color} text-white text-xs font-bold flex items-center justify-center">${theme.initials}</div>
                  <span class="hidden sm:block text-sm font-medium text-slate-700">${userName}</span>
                  <i class="hidden sm:block fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                </button>
                <div id="profilePanel" data-dropdown-panel class="hidden absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-40 overflow-hidden">
                  <div class="px-4 py-3 border-b border-slate-100">
                    <p class="text-sm font-semibold text-slate-800">${userName}</p>
                    <p class="text-xs text-slate-400">${theme.label} · Role verified</p>
                  </div>
                  <a href="#" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><i class="fa-regular fa-user w-4"></i>My Profile</a>
                  <a href="#" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><i class="fa-regular fa-circle-question w-4"></i>Help & Support</a>
                  <button data-logout class="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 border-t border-slate-100"><i class="fa-solid fa-right-from-bracket w-4"></i>Log out</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main id="mainContent" class="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 pb-20 lg:pb-6">
          <!-- injected per-page -->
        </main>
      </div>
    </div>
  `;
}
