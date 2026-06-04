// Wiki article page: read ?id=, render body blocks + related links.
const aid = qs("id");
const root = document.getElementById("article-root");

fetch("data/wiki.json")
  .then((r) => r.json())
  .then((wiki) => {
    const a = wiki.articles.find((x) => x.id === aid);
    if (!a) {
      root.innerHTML = '<p class="empty-msg">找不到這篇條目</p>';
      return;
    }
    document.title = a.title + " — Wiki";

    const body = (a.body || [])
      .map((b) =>
        b.type === "h"
          ? `<h2>${esc(b.text)}</h2>`
          : `<p>${esc(b.text).replace(/\n/g, "<br>")}</p>`
      )
      .join("");

    const relArticles = wiki.articles.filter((x) =>
      (a.related || []).includes(x.id)
    );
    const related = relArticles.length
      ? `<div class="related">
           <h3>相關條目</h3>
           <div class="related-links">
             ${relArticles
               .map(
                 (r) =>
                   `<a href="article.html?id=${encodeURIComponent(r.id)}" class="tag tag-link">${esc(r.title)}</a>`
               )
               .join("")}
           </div>
         </div>`
      : "";

    root.innerHTML = `
      <h1>${esc(a.title)}</h1>
      <p class="wiki-summary">${esc(a.summary)}</p>
      ${body}
      ${related}`;
  })
  .catch(() => {
    root.innerHTML = '<p class="empty-msg">資料載入失敗</p>';
  });
