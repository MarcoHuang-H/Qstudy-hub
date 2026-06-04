// Shared layout: inject navbar + footer, mark active link.
// Works on GitHub Pages from any base path (uses relative URLs).
(function () {
  const page = document.body.dataset.page || "";

  const links = [
    { href: "index.html",     key: "home",      label: "首頁" },
    { href: "companies.html", key: "companies", label: "公司" },
    { href: "news.html",      key: "news",      label: "新聞" },
    { href: "wiki.html",      key: "wiki",      label: "Wiki" },
  ];

  const nav = document.createElement("nav");
  nav.className = "navbar";
  nav.innerHTML =
    `<a href="index.html" class="brand">⚛&nbsp;Quantum&nbsp;Hub</a>` +
    `<div class="nav-links">` +
    links
      .map(
        (l) =>
          `<a href="${l.href}" class="${l.key === page ? "on" : ""}">${l.label}</a>`
      )
      .join("") +
    `</div>`;
  document.body.prepend(nav);

  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML =
    `<span>Quantum Computing Hub · 資料僅供研究參考，可能與最新狀況有出入</span>`;
  document.body.appendChild(footer);
})();

// Small helpers shared across pages
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
