"""
Batch import script — sends articles in chunks of 20 to the import API.
Metadata-only saves ensure rating/rationale is preserved even if scrape fails.
"""
import json, httpx, sys, time

sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_new_articles.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

print(f'Articles to import: {len(articles)}')
sys.stdout.flush()

BATCH_SIZE = 20
total_imported = 0
total_skipped = 0
total_meta = 0
total_errors = 0
start_time = time.time()

for i in range(0, len(articles), BATCH_SIZE):
    batch = articles[i:i + BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1
    total_batches = (len(articles) + BATCH_SIZE - 1) // BATCH_SIZE
    
    try:
        r = httpx.post('https://vivgai.up.railway.app/api/import', 
                       json={'articles': batch}, timeout=600)
        if r.status_code != 200:
            print(f'Batch {batch_num}: HTTP {r.status_code}')
            total_errors += len(batch)
            time.sleep(5)
            continue
            
        data = r.json()
        imp = data.get('imported', 0)
        skp = data.get('skipped', 0)
        meta = data.get('metadataOnly', 0)
        err = data.get('errors', 0)
        total_imported += imp
        total_skipped += skp
        total_meta += meta
        total_errors += err
        
        elapsed = time.time() - start_time
        rate = (total_imported + total_meta + total_skipped) / max(elapsed, 1)
        remaining = (len(articles) - i - len(batch)) / max(rate, 0.1)
        
        print(f'Batch {batch_num}/{total_batches} | +{imp} scraped +{meta} meta -{skp} dup {err}err | Total: {total_imported} scraped, {total_meta} meta, {total_errors} err | ETA: {remaining/60:.0f}m')
        sys.stdout.flush()
    except Exception as e:
        print(f'Batch {batch_num} FAILED: {e}')
        total_errors += len(batch)
        time.sleep(10)
    
    time.sleep(1)

elapsed = time.time() - start_time
print(f'\n=== FINAL ({elapsed/60:.1f} min) ===')
print(f'Full scrape: {total_imported}')
print(f'Metadata only: {total_meta}')
print(f'Duplicates: {total_skipped}')
print(f'Errors: {total_errors}')
print(f'Total processed: {total_imported + total_meta + total_skipped + total_errors}/{len(articles)}')