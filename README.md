# ⚛ Quantum Computing Hub

全球量子運算公司資料庫 + 即時新聞 + 技術 Wiki 的**純靜態網站**，
部署在 **GitHub Pages**，可用任何裝置（電腦 / 手機）透過網址瀏覽。

🔗 **線上網址**：https://marcohuang-h.github.io/Qstudy-hub/

> 不需要後端伺服器、不需要 Java、不需要付費。

## 功能

| 頁面 | 說明 |
|------|------|
| **首頁** `index.html` | 技術路線分布總覽 |
| **公司** `companies.html` | 29 間全球量子公司，可依技術 / 國家 / 上市狀態即時篩選搜尋 |
| **公司詳情** `company.html?id=…` | 公司介紹、量子晶片、里程碑、上市代號、官網 |
| **新聞** `news.html` | 量子 RSS 新聞（由 GitHub Actions 定時更新 `data/news.json`） |
| **Wiki** `wiki.html` | 15 篇量子技術百科：基礎概念 + 9 條硬體技術路線 |

版型為**左側可收合側邊欄 + 右側內容**，左上 ☰ 可收合側邊欄；手機上側邊欄為抽屜式。

## 架構

```
純靜態前端（HTML + CSS + 原生 JS）
   │  fetch
   ├─ data/companies.json   ← 公司資料（手動維護）
   ├─ data/wiki.json        ← Wiki 文章（手動維護）
   └─ data/news.json        ← 新聞（GitHub Actions 自動產生）
                                   ↑
                          .github/workflows/news.yml
                          每 6 小時跑 scripts/fetch_news.py 抓 RSS
```

**為什麼不用後端？** 公司與 Wiki 是靜態資料，直接放 JSON。
唯一需要即時抓取的新聞，改由 GitHub Actions 定時跑、把結果 commit 進 repo，
網頁直接讀檔。零伺服器、零費用、新聞仍會自動更新。

## 本機預覽（不需安裝任何套件）

```bash
cd quantum
python3 -m http.server 8000
```

開瀏覽器 **http://localhost:8000**（WSL 可用 `explorer.exe http://localhost:8000`）。

> 請用 http server 開啟，不要直接雙擊 HTML —— 頁面用 `fetch()` 讀 JSON，`file://` 會被瀏覽器擋。

## 部署到 GitHub Pages

1. 推送程式碼到 GitHub repo。
2. **Settings → Pages → Source 選「Deploy from a branch」→ Branch `main` / `(root)` → Save**。
3. 1–2 分鐘後網站上線於 `https://<帳號>.github.io/<repo>/`。
4. 啟用新聞：**Actions → Update Quantum News → Run workflow**（跑第一次；之後每 6 小時自動）。
   - 若 Action 無法 push：Settings → Actions → General → Workflow permissions → 選「Read and write permissions」。

## 維護資料

- **新增公司**：編輯 `data/companies.json`（schema 見現有項目）。
- **新增 Wiki**：編輯 `data/wiki.json` 的 `articles`，`body` 用 `{"type":"h"|"p","text":"…"}`；記得在對應 `category` 的 `articles` 也加 id。
- **調整新聞來源**：編輯 `data/feeds.json`。

推送後 GitHub Pages 會自動重新部署。

## 測試

```bash
python3 test_data.py              # 資料完整性驗證（不需套件）
pip install feedparser
python3 scripts/fetch_news.py     # 手動產生一次 data/news.json
```

## 專案結構

```
quantum/
├── index.html  companies.html  company.html
├── news.html   wiki.html       article.html
├── css/style.css
├── js/  common.js index.js companies.js company.js wiki.js article.js news.js
├── data/  companies.json  wiki.json  feeds.json  news.json(自動產生)
├── scripts/fetch_news.py
├── .github/workflows/news.yml
├── test_data.py
└── requirements.txt   # 只給 fetch_news.py 用
```

## 後續規劃

- [ ] 量子程式模擬頁：網頁上寫 PyQuil 風格程式跑 Bell state / Deutsch 演算法（純前端 JS，仍可放 GitHub Pages）

## 備註

公司資料整理自公開資訊（截至 2025 年），量子產業變化快速，部分晶片規格、
上市狀態、qubit 數可能與最新狀況有出入，僅供研究參考。
