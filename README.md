# ⚛ Quantum Computing Hub

全球量子運算公司資料庫 + 即時新聞 + 技術 Wiki 的**純靜態網站**，
可直接部署到 **GitHub Pages**，用任何裝置（電腦 / 手機）透過網址瀏覽。

> 不需要後端伺服器、不需要 Java、不需要付費。

## 功能

| 頁面 | 說明 |
|------|------|
| **首頁** `index.html` | 統計儀表板（公司數、上市數、國家數、技術分布） |
| **公司** `companies.html` | 29 間全球量子公司，可依技術 / 國家 / 上市狀態即時篩選搜尋 |
| **公司詳情** `company.html?id=…` | 公司介紹、量子晶片、里程碑、上市代號、官網 |
| **新聞** `news.html` | 量子 RSS 新聞（由 GitHub Actions 定時更新 `data/news.json`） |
| **Wiki** `wiki.html` | 15 篇量子技術百科：基礎概念 + 9 條硬體技術路線 |

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

**為什麼不用後端？** 公司與 Wiki 是靜態資料，直接放 JSON 即可。
唯一需要「即時抓取」的新聞，改由 GitHub Actions 定時跑、把結果 commit 進 repo，
網頁直接讀檔。整個系統零伺服器、零費用、新聞仍會自動更新。

---

## 本機預覽（不需安裝任何套件）

Python 內建 http server 即可，**不需要 pip / Flask**：

```bash
cd quantum
python3 -m http.server 8000
```

開瀏覽器： **http://localhost:8000**
（WSL 中可用 `explorer.exe http://localhost:8000`）

> 注意：請用 http server 開啟，不要直接雙擊 HTML 檔。
> 因為頁面用 `fetch()` 讀 JSON，`file://` 協定會被瀏覽器擋下。

---

## 部署到 GitHub Pages（手機 / 家裡都能連）

### 1. 建立 GitHub repo 並推送

```bash
cd quantum
git init
git add .
git commit -m "Quantum Computing Hub 靜態網站"
git branch -M main
git remote add origin https://github.com/<你的帳號>/quantum-hub.git
git push -u origin main
```

### 2. 開啟 GitHub Pages

在 GitHub repo 頁面：
**Settings → Pages → Build and deployment → Source 選「Deploy from a branch」
→ Branch 選 `main` / `(root)` → Save**

等 1–2 分鐘，網站就會出現在：

```
https://<你的帳號>.github.io/quantum-hub/
```

這個網址在任何地方（家裡電腦、手機 4G/5G）都能開。

### 3. 啟用新聞自動更新

新聞由 GitHub Actions 產生。首次部署後：

1. 進 repo 的 **Actions** 分頁
2. 若提示啟用 workflow，點 **Enable**
3. 選 **Update Quantum News** → **Run workflow**（手動跑第一次）

之後它會每 6 小時自動抓 RSS、更新 `data/news.json` 並 commit。

> 若 Actions 沒有 push 權限：Settings → Actions → General →
> Workflow permissions 選「Read and write permissions」。

---

## 維護資料

### 新增公司
編輯 `data/companies.json`（schema 見現有項目）：

```json
{
  "id": "唯一識別碼", "name": "公司名",
  "country": "國家", "flag": "🇺🇸", "founded": 2020,
  "technology": "Superconducting",
  "public": true, "ticker": "XXX", "exchange": "NASDAQ",
  "website": "https://…",
  "chips": ["晶片 A", "晶片 B"],
  "summary": "一句話介紹", "description": "詳細介紹",
  "milestones": ["2020 — …", "2023 — …"],
  "tags": ["超導", "上市"]
}
```

### 新增 Wiki 文章
編輯 `data/wiki.json` 的 `articles`。`body` 為段落陣列：
`{"type":"h","text":"小標"}`、`{"type":"p","text":"內文"}`。
記得在對應 `category` 的 `articles` 清單也加上該 id。

### 調整新聞來源
編輯 `data/feeds.json`，加入 `{"name":"…","url":"RSS URL","lang":"en"}`。

推送後（公司 / Wiki 改動）GitHub Pages 會自動重新部署。

---

## 測試

```bash
# 資料完整性驗證（不需安裝套件）
python3 test_data.py

# 手動產生一次新聞（需 feedparser）
pip install feedparser
python3 scripts/fetch_news.py     # 會寫出 data/news.json
```

## 專案結構

```
quantum/
├── index.html  companies.html  company.html
├── news.html   wiki.html       article.html
├── css/style.css
├── js/
│   ├── common.js     # 共用 nav/footer 注入 + 工具函式
│   ├── index.js      # 首頁統計
│   ├── companies.js  # 公司列表 + 篩選
│   ├── company.js    # 公司詳情
│   ├── wiki.js        article.js   # Wiki 列表 / 條目
│   └── news.js       # 讀 data/news.json
├── data/
│   ├── companies.json   wiki.json   feeds.json
│   └── news.json        # 由 Actions 自動產生（首次部署後出現）
├── scripts/fetch_news.py
├── .github/workflows/news.yml
├── test_data.py
└── requirements.txt    # 只給 fetch_news.py 用
```

## 後續規劃

- [ ] 量子程式模擬頁：在網頁上撰寫 PyQuil 風格程式，跑 Bell state / Deutsch 演算法
  （純前端 JS statevector 模擬，仍可放 GitHub Pages）
- [ ] 公司資料定期校對
- [ ] 新聞關鍵字過濾 / 中文摘要

## 備註

公司資料整理自公開資訊（截至 2025 年），量子產業變化快速，
部分晶片規格、上市狀態、qubit 數可能與最新狀況有出入，僅供研究參考。
