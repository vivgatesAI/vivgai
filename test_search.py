import httpx, sys
sys.stdout.reconfigure(encoding='utf-8')

# Test semantic search
r = httpx.get('https://vivgai-production.up.railway.app/api/semantic?q=What+is+GPT-5.5&limit=3&summarize=true', timeout=60)
data = r.json()
print(f"Status: {r.status_code}")
print(f"Query: {data.get('query')}")
print(f"Results: {len(data.get('results', []))}")
for item in data.get('results', []):
    print(f"  [{item['articleId']}] {item['title'][:60]} (dist: {item['distance']:.4f})")
if data.get('summary'):
    print(f"\nAI Summary:\n{data['summary'][:500]}")