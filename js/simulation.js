// Simulation page router:
//   builtin → our own Quil → Bloch animator (js/quil.js)
//   quirk / ibm → external tools, opened in a new tab (link cards)
const EXTERNAL = {
  quirk: {
    name: "Quirk — 量子線路模擬器",
    url: "https://algassert.com/quirk",
    desc: "由 Craig Gidney 開發的開源量子線路模擬器（Apache 2.0 授權）。拖拉量子閘到線路上，即可即時看到每個 qubit 的 Bloch 球、機率分佈與振幅變化。",
    source: "https://github.com/Strilanc/Quirk",
    note: "外部開源工具，內容版權屬原作者所有。",
  },
  ibm: {
    name: "IBM Quantum Composer",
    url: "https://quantum.cloud.ibm.com/composer",
    desc: "IBM 官方的視覺化量子線路編輯器，可把線路送到真實的 IBM 量子電腦或模擬器上執行（需登入 IBM 帳號）。",
    note: "IBM 基於安全考量禁止其頁面被嵌入（X-Frame-Options: DENY），故僅提供連結。",
  },
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const toolId = new URLSearchParams(location.search).get("tool") || "builtin";
const root = document.getElementById("sim-root");

if (toolId === "builtin") {
  document.title = "內建量子模擬器 — Quantum Hub";
  if (window.Quil) window.Quil.init(root);
  else root.innerHTML = '<p class="empty-msg">模擬器載入失敗（js/quil.js）</p>';
} else {
  const t = EXTERNAL[toolId] || EXTERNAL.quirk;
  document.title = t.name + " — Quantum Hub";
  const sourceLink = t.source
    ? ` · <a href="${esc(t.source)}" target="_blank" rel="noopener">原始碼</a>` : "";
  root.innerHTML =
    `<div class="sim-header"><div class="sim-title">🔗 ${esc(t.name)}</div></div>` +
    `<p class="sim-desc">${esc(t.desc)}</p>` +
    `<p class="sim-note">ℹ️ ${esc(t.note)}${sourceLink}</p>` +
    `<div class="sim-card">` +
    `<p>此為外部工具，請在新分頁開啟操作：</p>` +
    `<a class="btn sim-open-big" href="${esc(t.url)}" target="_blank" rel="noopener">開啟 ${esc(t.name)} ↗</a>` +
    `</div>`;
}
