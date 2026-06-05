// Simulation page: embed external quantum simulators on the right.
// - Quirk (open source, no frame restrictions) → embedded via iframe.
// - IBM Composer (X-Frame-Options: DENY, needs login) → open in new tab.
const TOOLS = {
  quirk: {
    name: "Quirk — 量子線路模擬器",
    url: "https://algassert.com/quirk",
    embed: true,
    desc: "由 Craig Gidney 開發的開源量子線路模擬器（Apache 2.0 授權）。拖拉量子閘到線路上，即可即時看到每個 qubit 的 Bloch 球、機率分佈與振幅變化。非常適合研究 Bloch 球如何隨各種閘旋轉。",
    source: "https://github.com/Strilanc/Quirk",
    note: "外部開源工具，內容版權屬原作者所有。",
  },
  ibm: {
    name: "IBM Quantum Composer",
    url: "https://quantum.cloud.ibm.com/composer",
    embed: false,
    desc: "IBM 官方的視覺化量子線路編輯器，可把線路送到真實的 IBM 量子電腦或模擬器上執行（需登入 IBM 帳號）。",
    note: "IBM 基於安全考量禁止其頁面被嵌入（X-Frame-Options: DENY），因此只能在新分頁開啟。",
  },
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const tool = TOOLS[new URLSearchParams(location.search).get("tool")] || TOOLS.quirk;
const root = document.getElementById("sim-root");
document.title = tool.name + " — Quantum Hub";

const sourceLink = tool.source
  ? ` · <a href="${esc(tool.source)}" target="_blank" rel="noopener">原始碼</a>`
  : "";

const header =
  `<div class="sim-header">` +
  `<div class="sim-title">🧪 ${esc(tool.name)}</div>` +
  `<a class="btn sim-open" href="${esc(tool.url)}" target="_blank" rel="noopener">在新分頁開啟 ↗</a>` +
  `</div>` +
  `<p class="sim-desc">${esc(tool.desc)}</p>` +
  `<p class="sim-note">ℹ️ ${esc(tool.note)}${sourceLink}</p>`;

if (tool.embed) {
  root.innerHTML = header +
    `<div class="sim-frame-wrap">` +
    `<iframe class="sim-frame" src="${esc(tool.url)}" title="${esc(tool.name)}" ` +
    `loading="lazy" referrerpolicy="no-referrer"></iframe>` +
    `<div class="sim-fallback" id="sim-fallback" style="display:none">` +
    `此工具無法在頁面內嵌入，請點上方「在新分頁開啟」。</div>` +
    `</div>`;

  // If the iframe is blocked (some networks/headers), offer the fallback.
  const frame = root.querySelector(".sim-frame");
  let loaded = false;
  frame.addEventListener("load", () => { loaded = true; });
  setTimeout(() => {
    if (!loaded) document.getElementById("sim-fallback").style.display = "block";
  }, 6000);
} else {
  root.innerHTML = header +
    `<div class="sim-card">` +
    `<p>此工具需登入且禁止嵌入，請在新分頁開啟操作：</p>` +
    `<a class="btn sim-open-big" href="${esc(tool.url)}" target="_blank" rel="noopener">開啟 ${esc(tool.name)} ↗</a>` +
    `</div>`;
}
