// Home dashboard: load companies.json, render technology distribution chart.
fetch("data/companies.json")
  .then((r) => r.json())
  .then((d) => {
    const companies = d.companies;
    const byTech = {};
    companies.forEach((c) => {
      byTech[c.technology] = (byTech[c.technology] || 0) + 1;
    });
    const techSorted = Object.entries(byTech).sort((a, b) => b[1] - a[1]);
    const total = companies.length;

    document.getElementById("tech-bars").innerHTML = techSorted
      .map(
        ([tech, n]) => `
      <div class="tech-bar-row">
        <span class="tech-bar-label">${esc(tech)}</span>
        <div class="tech-bar-track">
          <div class="tech-bar-fill" style="width:${Math.round((n / total) * 100)}%"></div>
        </div>
        <span class="tech-bar-count">${n}</span>
      </div>`
      )
      .join("");
  })
  .catch(() => {
    document.getElementById("tech-bars").innerHTML =
      '<p class="empty-msg">資料載入失敗</p>';
  });
