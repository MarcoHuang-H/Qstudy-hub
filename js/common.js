// Shared layout: build a collapsible left sidebar + right content area.
// Works on GitHub Pages from any base path (relative URLs only).
(function () {
  const page = document.body.dataset.page || "";

  const links = [
    { href: "index.html",     key: "home",      icon: "🏠", label: "首頁" },
    { href: "companies.html", key: "companies", icon: "🏢", label: "公司" },
    { href: "news.html",      key: "news",      icon: "📰", label: "新聞" },
    { href: "wiki.html",      key: "wiki",      icon: "📖", label: "Wiki" },
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
      .map(
        (l) =>
          `<a href="${l.href}" class="side-link ${l.key === page ? "on" : ""}" title="${l.label}">` +
          `<span class="side-icon">${l.icon}</span>` +
          `<span class="side-label">${l.label}</span></a>`
      )
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
