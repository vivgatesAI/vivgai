import json, httpx, sys, time

sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_new_articles.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

print(f'Articles to import: {len(articles)}')

BATCH_SIZE = 5
total_imported = 0
total_skipped = 0
total_errors = 0

for i in range(0, len(articles), BATCH_SIZE):
    batch = articles[i:i + BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1
    total_batches = (len(articles) + BATCH_SIZE - 1) // BATCH_SIZE
    
    try:
        r = httpx.post('https://vivgai.up.railway.app/api/import', 
                       json={'articles': batch}, timeout=600)
        if r.status_code != 200:
            print(f'Batch {batch_num}: HTTP {r.status_code} - {r.text[:200]}')
            total_errors += len(batch)
            time.sleep(5)
            continue
            
        data = r.json()
        imported = data.get('imported', 0)
        skipped = data.get('skipped', 0)
        errors = data.get('errors', 0)
        total_imported += imported
        total_skipped += skipped
        total_errors += errors
        
        if imported > 0 or errors > 0:
            print(f'Batch {batch_num}/{total_batches}: +{imported} imported, {skipped} skipped, {errors} errors | Total: {total_imported} imp, {total_errors} err')
        
        for res in data.get('results', []):
            if res['status'] == 'error':
                print(f'  ERR: {res["url"][:70]}')
                time.sleep(1)
    except Exception as e:
        print(f'Batch {batch_num} FAILED: {e}')
        total_errors += len(batch)
        time.sleep(10)
    
    # Brief pause between batches
    time.sleep(2)

print(f'\n=== FINAL ===')
print(f'Imported: {total_imported}')
print(f'Skipped: {total_skipped}')  
print(f'Errors: {total_errors}')
print(f'Processed: {total_imported + total_skipped + total_errors}/{len(articles)}')