import httpx, json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_new_articles.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

batch = articles[:2]
print(f'Testing with {len(batch)} articles...')
for a in batch:
    print(f'  {a["title"][:50]} | {a["url"][:60]}')

r = httpx.post('https://vivgai.up.railway.app/api/import', json={'articles': batch}, timeout=300)
print(f'Status: {r.status_code}')
d = r.json()
print(f'Imported: {d.get("imported")}, Skipped: {d.get("skipped")}, Errors: {d.get("errors")}')
for res in d.get('results', []):
    print(f'  {res["status"]}: {res["url"][:70]}')