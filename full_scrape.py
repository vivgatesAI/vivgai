import httpx, sys
sys.stdout.reconfigure(encoding='utf-8')

r = httpx.post('https://vivgai-production.up.railway.app/api/scrape', timeout=300)
print(f'Status: {r.status_code}')
d = r.json()
print(f'Total: {d.get("total")}, New: {d.get("new")}, Skipped: {d.get("skipped")}, Errors: {d.get("errors")}')
for x in d.get('results', []):
    print(f'  {x["status"]}: {x["url"][:70]}')