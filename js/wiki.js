// Wiki index page: render categories + article cards.
fetch("data/wiki.json")
  .then((r) => r.json())
  .then((wiki) => {
    const root = document.getElementById("wiki-root");
    root.innerHTML = wiki.categories
      .map((cat) => {
        const cards = wiki.articles
          .filter((a) => a.category === cat.id)
          .map(
            (a) => `
          <a href="article.html?id=${encodeURIComponent(a.id)}" class="wiki-card">
            <h3>${esc(a.title)}</h3>
            <p>${esc(a.summary)}</p>
          </a>`
          )
          .join("");
        return `
        <section class="panel">
          <h2>${esc(cat.title)}</h2>
          <div class="wiki-grid">${cards}</div>
        </section>`;
      })
      .join("");
  })
  .catch(() => {
    document.getElementById("wiki-root").innerHTML =
      '<p class="empty-msg">Wiki 資料載入失敗</p>';
  });
