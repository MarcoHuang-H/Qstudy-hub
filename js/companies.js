// Company list page: load + render grid, client-side filtering.
let ALL = [];

function cardHTML(c) {
  const badge = c.public
    ? `<span class="badge badge-public">${esc(c.exchange)}: ${esc(c.ticker)}</span>`
    : `<span class="badge badge-private">未上市</span>`;
  return `
  <a href="company.html?id=${encodeURIComponent(c.id)}"
     class="company-card"
     data-name="${esc(c.name).toLowerCase()}"
     data-tech="${esc(c.technology)}"
     data-country="${esc(c.country)}"
     data-public="${c.public ? "public" : "private"}"
     data-tags="${esc((c.tags || []).join(",")).toLowerCase()}">
    <div class="cc-head">
      <span class="cc-flag">${c.flag || ""}</span>
      <span class="cc-name">${esc(c.name)}</span>
    </div>
    <div class="cc-tech">${esc(c.technology)}</div>
    <p class="cc-summary">${esc(c.summary)}</p>
    <div class="cc-foot">
      <span class="cc-country">${esc(c.country)}</span>
      ${badge}
    </div>
  </a>`;
}

function populateFilters(companies) {
  const techs = [...new Set(companies.map((c) => c.technology))].sort();
  const countries = [...new Set(companies.map((c) => c.country))].sort();
  const fTech = document.getElementById("filter-tech");
  const fCountry = document.getElementById("filter-country");
  techs.forEach((t) => fTech.add(new Option(t, t)));
  countries.forEach((c) => fCountry.add(new Option(c, c)));
}

function apply() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const tech = document.getElementById("filter-tech").value;
  const country = document.getElementById("filter-country").value;
  const pub = document.getElementById("filter-public").value;
  let shown = 0;

  document.querySelectorAll(".company-card").forEach((card) => {
    const d = card.dataset;
    const matchQ =
      !q || d.name.includes(q) || d.tags.includes(q) ||
      d.tech.toLowerCase().includes(q);
    const show =
      matchQ &&
      (!tech || d.tech === tech) &&
      (!country || d.country === country) &&
      (!pub || d.public === pub);
    card.style.display = show ? "" : "none";
    if (show) shown++;
  });

  document.getElementById("count").textContent = shown;
  document.getElementById("empty").style.display = shown ? "none" : "";
}

fetch("data/companies.json")
  .then((r) => r.json())
  .then((d) => {
    ALL = d.companies;
    document.getElementById("grid").innerHTML = ALL.map(cardHTML).join("");
    document.getElementById("count").textContent = ALL.length;
    populateFilters(ALL);
    ["search", "filter-tech", "filter-country", "filter-public"].forEach((id) =>
      document.getElementById(id).addEventListener("input", apply)
    );
  })
  .catch(() => {
    document.getElementById("grid").innerHTML =
      '<p class="empty-msg">公司資料載入失敗</p>';
  });
