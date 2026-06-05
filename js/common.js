// Shared layout: build a collapsible left sidebar + right content area.
// Works on GitHub Pages from any base path (relative URLs only).
(function () {
  const page = document.body.dataset.page || "";

  const links = [
    { href: "index.html",      key: "home",      icon: "🏠", label: "首頁" },
    { href: "companies.html",  key: "companies", icon: "🏢", label: "公司" },
    { href: "news.html",       key: "news",      icon: "📰", label: "新聞" },
    { href: "wiki.html",       key: "wiki",      icon: "📖", label: "Wiki" },
    { href: "simulation.html", key: "sim",       icon: "🧪", label: "Simulation" },
  ];

  // Simulator tools (Simulation section sub-menu).
  const SIM_TOOLS = [
    { id: "builtin", name: "內建模擬器（Qiskit → Bloch）" },
    { id: "quirk",   name: "Quirk（外部連結）" },
    { id: "ibm",     name: "IBM Composer（外部連結）" },
  ];

  // The existing page content lives in <main class="container">.
  const container = document.querySelector(".container");

  // ── Sidebar ──
  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.innerHTML =
    `<a href="index.html" class="brand">⚛ <span class="brand-text">Quantum Hub</span></a>` +
    `<nav class="side-nav">` +
    links
      .map((l) => {
        const linkHTML =
          `<a href="${l.href}" class="side-link ${l.key === page ? "on" : ""}" title="${l.label}">` +
          `<span class="side-icon">${l.icon}</span>` +
          `<span class="side-label">${l.label}</span></a>`;
        // Wiki gets a sub-menu placeholder (filled in async below)
        if (l.key === "wiki") {
          return linkHTML + `<div class="side-sub" id="wiki-submenu"></div>`;
        }
        // Simulation sub-menu (only shown when in the sim section)
        if (l.key === "sim") {
          let sub = "";
          if (page === "sim") {
            const cur = new URLSearchParams(location.search).get("tool") || "builtin";
            sub = `<div class="side-sub">` +
              SIM_TOOLS.map((t) =>
                `<a href="simulation.html?tool=${t.id}" class="sub-topic ${t.id === cur ? "on" : ""}">${t.name}</a>`
              ).join("") + `</div>`;
          }
          return linkHTML + sub;
        }
        return linkHTML;
      })
      .join("") +
    `</nav>`;

  // ── Topbar (holds the collapse toggle) ──
  const topbar = document.createElement("header");
  topbar.className = "topbar";
  topbar.innerHTML =
    `<button class="side-toggle" id="sideToggle" aria-label="切換側邊欄">☰</button>` +
    `<span class="topbar-title">⚛ Quantum Hub</span>`;

  // ── Footer ──
  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML =
    `<span>Quantum Computing Hub · 資料僅供研究參考，可能與最新狀況有出入</span>`;

  // ── Main wrapper (topbar + content + footer) ──
  const mainWrap = document.createElement("div");
  mainWrap.className = "main-wrap";
  mainWrap.appendChild(topbar);
  if (container) mainWrap.appendChild(container);   // move existing content in
  mainWrap.appendChild(footer);

  // ── Backdrop (mobile overlay) ──
  const backdrop = document.createElement("div");
  backdrop.className = "side-backdrop";

  document.body.appendChild(sidebar);
  document.body.appendChild(mainWrap);
  document.body.appendChild(backdrop);

  // ── Collapse toggle ──
  const KEY = "qhub-sidebar-collapsed";
  function isMobile() {
    return window.matchMedia("(max-width: 820px)").matches;
  }
  // Restore desktop preference
  if (localStorage.getItem(KEY) === "1" && !isMobile()) {
    document.body.classList.add("sidebar-collapsed");
  }
  function toggle() {
    if (isMobile()) {
      document.body.classList.toggle("sidebar-open");
    } else {
      document.body.classList.toggle("sidebar-collapsed");
      localStorage.setItem(
        KEY,
        document.body.classList.contains("sidebar-collapsed") ? "1" : "0"
      );
    }
  }
  document.getElementById("sideToggle").addEventListener("click", toggle);
  backdrop.addEventListener("click", () =>
    document.body.classList.remove("sidebar-open")
  );

  // ── Wiki sub-menu (categories → topics) ──
  // Only shown when inside the Wiki section (wiki.html / article.html),
  // so it doesn't duplicate / clutter the other pages.
  const currentArticle = new URLSearchParams(location.search).get("id");
  const SUBKEY = "qhub-wiki-open";
  if (page === "wiki")
  fetch("data/wiki.json")
    .then((r) => r.json())
    .then((wiki) => {
      const box = document.getElementById("wiki-submenu");
      if (!box) return;
      // which category should start expanded: the one containing the current article
      let openCat = localStorage.getItem(SUBKEY) || "";
      if (currentArticle) {
        const found = wiki.categories.find((c) => c.articles.includes(currentArticle));
        if (found) openCat = found.id;
      }
      box.innerHTML = wiki.categories
        .map((cat) => {
          const items = cat.articles
            .map((aid) => {
              const art = wiki.articles.find((a) => a.id === aid);
              if (!art) return "";
              const on = aid === currentArticle ? "on" : "";
              return `<a href="article.html?id=${encodeURIComponent(aid)}" class="sub-topic ${on}">${art.title}</a>`;
            })
            .join("");
          const isOpen = cat.id === openCat;
          return (
            `<div class="sub-cat ${isOpen ? "open" : ""}" data-cat="${cat.id}">` +
            `<button class="sub-cat-head">${cat.title}</button>` +
            `<div class="sub-cat-body">${items}</div>` +
            `</div>`
          );
        })
        .join("");

      box.querySelectorAll(".sub-cat-head").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const cat = btn.parentElement;
          const wasOpen = cat.classList.contains("open");
          box.querySelectorAll(".sub-cat").forEach((c) => c.classList.remove("open"));
          if (!wasOpen) {
            cat.classList.add("open");
            localStorage.setItem(SUBKEY, cat.dataset.cat);
          } else {
            localStorage.setItem(SUBKEY, "");
          }
        });
      });
    })
    .catch(() => {});
})();

// ── Shared helpers ──
function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
