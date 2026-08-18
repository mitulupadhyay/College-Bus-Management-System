/* ============================================================
   BusFlow · js/login.js
   Mock authentication gateway — picks a role, stores a session
   and routes into the matching dashboard.
   ============================================================ */
(function (global) {
  "use strict";

  const BF = global.BusFlow;
  const ui = BF.ui;
  const $ = ui.$, $$ = ui.$$;

  const ROLE_META = {
    student: { icon: "graduation", email: "mitul.upadhyay@gehu.ac.in" },
    parent: { icon: "users", email: "rajesh.upadhyay@gmail.com" },
    driver: { icon: "steering", email: "rakesh.bisht@busflow.in" },
    conductor: { icon: "qr", email: "anil.karki@busflow.in" },
    admin: { icon: "grid", email: "transport.admin@gehu.ac.in" }
  };
  const ORDER = ["student", "parent", "driver", "conductor", "admin"];

  let role = "student";

  document.addEventListener("DOMContentLoaded", function () {
    ["brandLogo", "brandLogoMobile"].forEach(function (id) {
      const n = document.getElementById(id);
      if (n) n.innerHTML = ui.logoMark("h-8 w-8");
    });

    renderRoles();
    renderQuickLinks();

    const map = document.getElementById("loginMap");
    if (map) BF.FleetMap.create(map, { labels: false, interactive: false, showEta: true });
    ui.sim.start(3000);

    $("#togglePw").addEventListener("click", function () {
      const input = $("#password");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      this.setAttribute("aria-label", show ? "Hide password" : "Show password");
      this.innerHTML = ui.icon(show ? "lock" : "eye", "h-4 w-4");
    });

    $("#loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      signIn(role);
    });

    ui.hydrateIcons(document.body);
    ui.hydrateCounters(document.body);
  });

  function renderRoles() {
    const host = document.getElementById("roleSelect");
    host.innerHTML = ORDER.map(function (key) {
      const meta = BF.roles[key];
      return '<button type="button" class="group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 ' +
        'data-[on=true]:border-accent/50 data-[on=true]:bg-accent/[0.07] border-line bg-panel-2/50 hover:border-line-2" ' +
        'role="radio" aria-checked="' + (key === role) + '" data-role="' + key + '" data-on="' + (key === role) + '">' +
        '<span class="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/[0.03]" style="color:' + meta.accent + '">' +
        ui.icon(ROLE_META[key].icon, "h-4 w-4") + "</span>" +
        '<span class="text-xs font-medium text-hi">' + ui.esc(meta.label) + "</span></button>";
    }).join("");

    $$("[data-role]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        role = btn.getAttribute("data-role");
        $$("[data-role]", host).forEach(function (b) {
          const on = b === btn;
          b.setAttribute("data-on", String(on));
          b.setAttribute("aria-checked", String(on));
        });
        $("#email").value = ROLE_META[role].email;
        $("#submitBtn span").textContent = "Sign in as " + BF.roles[role].label;
      });
    });
  }

  function renderQuickLinks() {
    const host = document.getElementById("quickLinks");
    host.innerHTML = ORDER.map(function (key) {
      const meta = BF.roles[key];
      return '<button type="button" class="flex items-center gap-3 rounded-xl border border-line bg-panel/60 px-4 py-3 text-left transition-all duration-200 hover:border-line-2 hover:bg-panel-2" data-quick="' + key + '">' +
        '<span class="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/[0.03]" style="color:' + meta.accent + '">' +
        ui.icon(ROLE_META[key].icon, "h-4 w-4") + "</span>" +
        '<span class="min-w-0 flex-1"><span class="block text-sm font-medium text-hi">' + ui.esc(meta.label) + " dashboard</span>" +
        '<span class="block truncate text-xs text-mute">' + ui.esc(meta.desc) + "</span></span>" +
        ui.icon("chevronRight", "h-4 w-4 text-faint") + "</button>";
    }).join("");

    $$("[data-quick]", host).forEach(function (btn) {
      btn.addEventListener("click", function () { signIn(btn.getAttribute("data-quick")); });
    });
  }

  function signIn(key) {
    const btn = $("#submitBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span><span>Authenticating…</span>';
    BF.session.set(key);
    ui.toast({ title: "Signed in as " + BF.roles[key].label, msg: "Loading " + BF.roles[key].page.split("/").pop(), type: "success" });
    setTimeout(function () { global.location.href = BF.roles[key].page; }, ui.reducedMotion() ? 60 : 620);
  }
})(window);
