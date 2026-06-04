// Company detail page: read ?id=, render full info.
const cid = qs("id");
const root = document.getElementById("detail");

fetch("data/companies.json")
  .then((r) => r.json())
  .then((d) => {
    const c = d.companies.find((x) => x.id === cid);
    if (!c) {
      root.innerHTML = '<p class="empty-msg">找不到這間公司</p>';
      return;
    }
    document.title = c.name + " — Quantum Hub";

    const badge = c.public
      ? `<span class="badge badge-public big">${esc(c.exchange)}: ${esc(c.ticker)}</span>`
      : `<span class="badge badge-private big">未上市</span>`;

    root.innerHTML = `
      <div class="detail-header">
        <div class="dh-title">
          <span class="dh-flag">${c.flag || ""}</span>
          <h1>${esc(c.name)}</h1>
        </div>
        ${badge}
      </div>

      <div class="detail-meta">
        <div class="meta-item"><span class="meta-k">國家</span><span class="meta-v">${c.flag || ""} ${esc(c.country)}</span></div>
        <div class="meta-item"><span class="meta-k">技術路線</span><span class="meta-v">${esc(c.technology)}</span></div>
        <div class="meta-item"><span class="meta-k">成立年份</span><span class="meta-v">${esc(c.founded)}</span></div>
        <div class="meta-item"><span class="meta-k">官網</span><span class="meta-v"><a href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a></span></div>
      </div>

      <div class="detail-tags">
        ${(c.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
      </div>

      <section class="panel">
        <h2>公司介紹</h2>
        <p class="detail-desc">${esc(c.description)}</p>
      </section>

      <div class="detail-cols">
        <section class="panel">
          <h2>🔬 量子晶片 / 系統</h2>
          <ul class="chip-list">
            ${(c.chips || []).map((x) => `<li>${esc(x)}</li>`).join("")}
          </ul>
        </section>
        <section class="panel">
          <h2>📅 重要里程碑</h2>
          <ul class="timeline">
            ${(c.milestones || []).map((x) => `<li>${esc(x)}</li>`).join("")}
          </ul>
        </section>
      </div>`;
  })
  .catch(() => {
    root.innerHTML = '<p class="empty-msg">資料載入失敗</p>';
  });
