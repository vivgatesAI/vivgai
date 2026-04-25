import csv, json, sys

articles = []
with open(r'C:\Users\vivek\.openclaw\media\inbound\articles_extracted---3a32a336-1817-4849-90f3-08174bd57ec6.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        url = row.get('url', '').strip()
        if not url:
            continue
        # Clean up escaped backslashes in URLs
        url = url.replace('\\', '')
        # Remove trailing backslashes
        url = url.rstrip('\\').rstrip('/')
        
        date_str = row.get('date', '').strip()
        rating = row.get('rating', '').strip()
        title = row.get('title', '').strip()
        rationale = row.get('rationale', '').strip()
        
        # Skip x.com / twitter URLs (they block scraping)
        if 'twitter.com' in url or 'x.com' in url:
            continue
        
        # Normalize date format
        try:
            from datetime import datetime
            if '/' in date_str:
                dt = datetime.strptime(date_str, '%m/%d/%Y')
            else:
                dt = datetime.strptime(date_str, '%Y-%m-%d')
            iso_date = dt.isoformat()[:10]
        except:
            iso_date = date_str
        
        articles.append({
            'date': iso_date,
            'rating': rating,
            'title': title,
            'url': url,
            'rationale': rationale,
        })

print(f"Total articles in CSV: {len(articles)}")
print(f"Unique URLs: {len(set(a['url'] for a in articles))}")
print(f"Rating distribution:")
from collections import Counter
ratings = Counter(a['rating'] for a in articles)
for r, c in sorted(ratings.items()):
    print(f"  {r}: {c}")

# Deduplicate by URL (keep first occurrence which has earliest date)
seen = set()
unique = []
for a in articles:
    base_url = a['url'].split('?')[0].rstrip('/')
    if base_url not in seen:
        seen.add(base_url)
        unique.append(a)

print(f"\nAfter dedup: {len(unique)} articles")

# Save for import
with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_articles.json', 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)
print(f"Saved to csv_articles.json")