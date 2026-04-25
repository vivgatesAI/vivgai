import json, httpx, sys, time

sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_articles.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

print(f'Total articles to import: {len(articles)}')

BATCH_SIZE = 10
total_imported = 0
total_skipped = 0
total_errors = 0

for i in range(0, len(articles), BATCH_SIZE):
    batch = articles[i:i + BATCH_SIZE]
    print(f'\nBatch {i // BATCH_SIZE + 1}/{(len(articles) + BATCH_SIZE - 1) // BATCH_SIZE} ({len(batch)} articles)...')
    
    try:
        r = httpx.post('https://vivgai.up.railway.app/api/import', 
                       json={'articles': batch}, timeout=300)
        data = r.json()
        total_imported += data.get('imported', 0)
        total_skipped += data.get('skipped', 0)
        total_errors += data.get('errors', 0)
        print(f'  imported: {data.get("imported", 0)}, skipped: {data.get("skipped", 0)}, errors: {data.get("errors", 0)}')
        
        for res in data.get('results', []):
            if res['status'] == 'error':
                print(f'  ERROR: {res["url"][:60]}')
    except Exception as e:
        print(f'  Batch failed: {e}')
        total_errors += len(batch)
    
    # Rate limit between batches
    time.sleep(3)

print(f'\n=== DONE ===')
print(f'Imported: {total_imported}')
print(f'Skipped: {total_skipped}')
print(f'Errors: {total_errors}')