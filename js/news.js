// News page: load pre-generated data/news.json (built by GitHub Actions).
const listEl = document.getElementById("news-list");
const statusEl = document.getElementById("news-status");

function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString("zh-Hant", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function render(data) {
  const items = data.items || [];
  if (!items.length) {
    statusEl.textContent = "目前沒有新聞。";
    return;
  }
  const generated = data.generated_ts ? fmtDate(data.generated_ts) : "";
  statusEl.textContent =
    `共 ${items.length} 則` + (generated ? ` · 更新於 ${generated}` : "");
  listEl.innerHTML = items
    .map(
      (n) => `
    <a class="news-item" href="${esc(n.link)}" target="_blank" rel="noopener">
      <div class="news-item-top">
        <span class="news-source">${esc(n.source)}</span>
        <span class="news-date">${fmtDate(n.published_ts)}</span>
      </div>
      <h3 class="news-title">${esc(n.title)}</h3>
      <p class="news-summary">${esc(n.summary || "")}</p>
    </a>`
    )
    .join("");
}

fetch("data/news.json?t=" + Date.now())
  .then((r) => {
    if (!r.ok) throw new Error("no news.json");
    return r.json();
  })
  .then(render)
  .catch(() => {
    statusEl.innerHTML =
      "尚未產生新聞資料。<br>新聞由 GitHub Actions 自動抓取 RSS 並更新 " +
      "<code>data/news.json</code>。<br>請在 GitHub 倉庫的 Actions 頁面手動執行一次 " +
      "<b>Update Quantum News</b> workflow，或等待排程自動執行。";
  });
