"""Standalone data validation (no Flask needed)."""
import json, os, sys

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

def load(n):
    with open(os.path.join(D, n), encoding="utf-8") as f:
        return json.load(f)

ok = True
def check(name, cond):
    global ok
    ok = ok and cond
    print(f"  [{'OK  ' if cond else 'FAIL'}] {name}")

# ── companies ──
companies = load("companies.json")["companies"]
check(f"companies loaded ({len(companies)})", len(companies) >= 25)

required = {"id","name","country","flag","founded","technology","public",
            "website","chips","summary","description","milestones","tags"}
for c in companies:
    missing = required - set(c.keys())
    if missing:
        check(f"{c.get('id','?')} missing {missing}", False)
check("all companies have required fields",
      all(required <= set(c.keys()) for c in companies))

ids = [c["id"] for c in companies]
check("company ids unique", len(ids) == len(set(ids)))

# public companies must have ticker+exchange
pub_ok = all(c.get("ticker") and c.get("exchange") for c in companies if c["public"])
check("public companies have ticker+exchange", pub_ok)

# ── wiki ──
wiki = load("wiki.json")
arts = wiki["articles"]
check(f"wiki articles loaded ({len(arts)})", len(arts) >= 10)

art_ids = {a["id"] for a in arts}
broken = sorted({r for a in arts for r in a.get("related", []) if r not in art_ids})
check(f"wiki related links resolve (broken: {broken})", not broken)

# every category article id exists
cat_refs = {aid for cat in wiki["categories"] for aid in cat["articles"]}
missing_cat = sorted(cat_refs - art_ids)
check(f"category article refs exist (missing: {missing_cat})", not missing_cat)

# every article has body
check("all articles have non-empty body", all(a.get("body") for a in arts))

# ── feeds ──
feeds = load("feeds.json")["feeds"]
check(f"feeds loaded ({len(feeds)})", len(feeds) >= 3)
check("all feeds have url", all(f.get("url","").startswith("http") for f in feeds))

# ── summary ──
print()
print("Tech distribution:")
techs = {}
for c in companies:
    techs[c["technology"]] = techs.get(c["technology"], 0) + 1
for t, n in sorted(techs.items(), key=lambda x: -x[1]):
    print(f"   {n:2d}  {t}")

print()
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
