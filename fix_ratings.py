import psycopg2, json, sys
sys.stdout.reconfigure(encoding='utf-8')

# Load CSV data for rating restoration
with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_articles.json', 'r', encoding='utf-8') as f:
    csv_data = json.load(f)

# Build lookup by normalized URL
csv_lookup = {}
for a in csv_data:
    base = a['url'].split('?')[0].rstrip('/')
    csv_lookup[base] = a

conn = psycopg2.connect(host='shortline.proxy.rlwy.net', port=25665, dbname='railway', user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require')
cur = conn.cursor()

# Find all articles missing ratings
cur.execute("SELECT id, url, title FROM articles WHERE rating IS NULL ORDER BY id")
unrated = cur.fetchall()
print(f"Articles missing ratings: {len(unrated)}")

updated = 0
for article_id, url, title in unrated:
    base_url = url.split('?')[0].rstrip('/')
    csv_match = csv_lookup.get(base_url)
    
    if csv_match and csv_match.get('rating'):
        rating = csv_match['rating']
        rated_date = csv_match.get('date', '')
        rationale = csv_match.get('rationale', '')
        
        # Parse date
        if rated_date:
            try:
                from datetime import datetime
                if '/' in rated_date:
                    dt = datetime.strptime(rated_date, '%m/%d/%Y')
                else:
                    dt = datetime.strptime(rated_date, '%Y-%m-%d')
                rated_date = dt.strftime('%Y-%m-%d')
            except:
                pass
        
        cur.execute(
            "UPDATE articles SET rating = %s, rated_date = %s, rationale = %s WHERE id = %s",
            (rating, rated_date if rated_date else None, rationale or None, article_id)
        )
        updated += 1
        print(f"  Updated id={article_id}: {title[:50]} → {rating}")

print(f"\n=== Updated {updated} articles with ratings ===")

# Final verify
cur.execute("SELECT COUNT(*) FROM articles")
total = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM articles WHERE rating IS NOT NULL")
with_rating = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM articles WHERE rated_date IS NOT NULL")
with_date = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM articles WHERE content_length > 0")
with_content = cur.fetchone()[0]

print(f"\nFinal stats:")
print(f"  Total: {total}")
print(f"  With rating: {with_rating}")
print(f"  With date: {with_date}")  
print(f"  With content: {with_content}")
print(f"  Missing ratings: {total - with_rating}")

conn.commit()
conn.close()