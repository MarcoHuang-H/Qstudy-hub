// Home dashboard: load companies.json, compute stats.
fetch("data/companies.json")
  .then((r) => r.json())
  .then((d) => {
    const companies = d.companies;
    const byTech = {};
    let pub = 0;
    const countries = new Set();
    companies.forEach((c) => {
      byTech[c.technology] = (byTech[c.technology] || 0) + 1;
      if (c.public) pub++;
      countries.add(c.country);
    });
    const techSorted = Object.entries(byTech).sort((a, b) => b[1] - a[1]);

    document.getElementById("stat-total").textContent = companies.length;
    document.getElementById("stat-public").textContent = pub;
    document.getElementById("stat-countries").textContent = countries.size;
    document.getElementById("stat-tech").textContent = techSorted.length;

    const total = companies.length;
    const bars = techSorted
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
    document.getElementById("tech-bars").innerHTML = bars;
  })
  .catch(() => {
    document.getElementById("tech-bars").innerHTML =
      '<p class="empty-msg">資料載入失敗</p>';
  });
