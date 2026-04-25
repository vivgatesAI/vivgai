import json, httpx, sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_articles.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

# Test with just 5 articles first
test_batch = articles[:5]
print(f'Testing with {len(test_batch)} articles...')

for a in test_batch:
    print(f'  {a["date"]} | {a["rating"]} | {a["title"][:50]} | {a["url"][:60]}')

try:
    r = httpx.post('https://vivgai.up.railway.app/api/import', 
                   json={'articles': test_batch}, timeout=600)
    print(f'\nStatus: {r.status_code}')
    data = r.json()
    print(f'Imported: {data.get("imported", 0)}')
    print(f'Skipped: {data.get("skipped", 0)}')
    print(f'Errors: {data.get("errors", 0)}')
    for res in data.get('results', []):
        print(f'  {res["status"]}: {res["url"][:60]}')
except Exception as e:
    print(f'Error: {e}')