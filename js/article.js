// Wiki article page: read ?id=, render rich body blocks + related links.
// Block types: h (heading), p (paragraph, inline $math$), math (display eq),
//              svg (inline SVG figure), img (image), bloch (interactive sphere).
const aid = qs("id");
const root = document.getElementById("article-root");

// Display-math blocks are collected and rendered via katex.render() (not innerHTML),
// so LaTeX "&" column separators aren't mangled by the HTML parser.
let mathQueue = [];

function renderBlock(b, i) {
  switch (b.type) {
    case "h":
      return `<h2>${esc(b.text)}</h2>`;
    case "p":
      // escape HTML but keep $...$ for inline KaTeX auto-render
      return `<p>${esc(b.text).replace(/\n/g, "<br>")}</p>`;
    case "math": {
      const id = `math-${i}`;
      mathQueue.push({ id, tex: b.tex });
      return `<div class="math-block" id="${id}"></div>`;
    }
    case "svg":
      return `<figure class="fig">${b.svg}` +
             (b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : "") + `</figure>`;
    case "img":
      return `<figure class="fig">` +
             `<img src="${esc(b.src)}" alt="${esc(b.caption||"")}" loading="lazy" ` +
             `onerror="this.style.display='none';this.nextElementSibling.style.display='block'">` +
             `<div class="img-missing" style="display:none">圖片尚未上傳：<code>${esc(b.src)}</code></div>` +
             (b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : "") + `</figure>`;
    case "bloch":
      return `<figure class="fig">` +
             `<div class="bloch-widget" data-gates="${esc(b.gates||"X,Y,Z,H,S,T")}" data-state="${esc(b.state||"0")}" data-size="${esc(b.size||300)}"></div>` +
             (b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : "") + `</figure>`;
    default:
      return "";
  }
}

function whenKatex(cb) {
  let tries = 0;
  (function go() {
    if (window.katex && window.renderMathInElement) cb();
    else if (tries++ < 50) setTimeout(go, 100);
  })();
}

fetch("data/wiki.json")
  .then((r) => r.json())
  .then((wiki) => {
    const a = wiki.articles.find((x) => x.id === aid);
    if (!a) { root.innerHTML = '<p class="empty-msg">找不到這篇條目</p>'; return; }
    document.title = a.title + " — Wiki";

    mathQueue = [];
    const body = (a.body || []).map(renderBlock).join("");

    const relArticles = wiki.articles.filter((x) => (a.related || []).includes(x.id));
    const related = relArticles.length
      ? `<div class="related"><h3>相關條目</h3><div class="related-links">` +
        relArticles.map((r) =>
          `<a href="article.html?id=${encodeURIComponent(r.id)}" class="tag tag-link">${esc(r.title)}</a>`
        ).join("") + `</div></div>`
      : "";

    root.innerHTML =
      `<h1>${esc(a.title)}</h1>` +
      `<p class="wiki-summary">${esc(a.summary)}</p>` + body + related;

    // Bloch widgets (no KaTeX needed)
    if (window.Bloch) window.Bloch.initAll();

    // Math: display blocks via katex.render, inline $...$ via auto-render
    whenKatex(() => {
      mathQueue.forEach(({ id, tex }) => {
        const el = document.getElementById(id);
        if (el) {
          try { window.katex.render(tex, el, { displayMode: true, throwOnError: false }); }
          catch (e) { el.textContent = tex; }
        }
      });
      window.renderMathInElement(root, {
        delimiters: [{ left: "$", right: "$", display: false }],
        throwOnError: false,
      });
    });
  })
  .catch(() => { root.innerHTML = '<p class="empty-msg">資料載入失敗</p>'; });
