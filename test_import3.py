import httpx, json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_new_articles.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

# Test with just 1 article
batch = [articles[0]]
print(f'Testing with: {batch[0]["title"][:50]}')
print(f'URL: {batch[0]["url"][:80]}')

try:
    r = httpx.post('https://vivgai.up.railway.app/api/import', json={'articles': batch}, timeout=120)
    print(f'Status: {r.status_code}')
    print(f'Response: {r.text[:500]}')
except Exception as e:
    print(f'Error: {e}')