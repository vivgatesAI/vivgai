import psycopg2, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = psycopg2.connect(host='shortline.proxy.rlwy.net', port=25665, dbname='railway', user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require')
cur = conn.cursor()

# Step 1: Find duplicate URLs (with and without trailing slash)
print("=== Finding duplicates ===")
cur.execute("""
  SELECT 
    REPLACE(url, '/', '') as normalized_url,
    COUNT(*) as cnt,
    array_agg(id ORDER BY id) as ids
  FROM articles
  GROUP BY REPLACE(url, '/', '')
  HAVING COUNT(*) > 1
  ORDER BY cnt DESC
""")
duplicates = cur.fetchall()
print(f"Found {len(duplicates)} groups of duplicates")

deleted = 0
for norm_url, cnt, ids in duplicates:
    # For each group, keep the one with the most data (longest content or has rating)
    cur.execute("""
      SELECT id, url, title, content_length, rating, rated_date 
      FROM articles 
      WHERE id = ANY(%s)
      ORDER BY content_length DESC, rating DESC NULLS LAST, id DESC
    """, (ids,))
    rows = cur.fetchall()
    keep_id = rows[0][0]
    remove_ids = [r[0] for r in rows[1:]]
    
    # Delete chunks first (foreign key)
    for rid in remove_ids:
        cur.execute("DELETE FROM chunks WHERE article_id = %s", (rid,))
    
    # Delete the duplicate article
    cur.execute("DELETE FROM articles WHERE id = ANY(%s)", (remove_ids,))
    deleted += len(remove_ids)
    print(f"  Kept id={keep_id}, removed {len(remove_ids)} duplicates: {remove_ids}")

print(f"\n=== Deleted {deleted} duplicate articles ===")

# Step 2: Verify totals
cur.execute("SELECT COUNT(*) FROM articles")
total = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM articles WHERE content_length > 0")
with_content = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM articles WHERE rating IS NOT NULL")
with_rating = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM articles WHERE rated_date IS NOT NULL")
with_date = cur.fetchone()[0]

print(f"\nFinal count: {total} articles")
print(f"  With content: {with_content}")
print(f"  With rating: {with_rating}")
print(f"  With date: {with_date}")
print(f"  Metadata-only: {total - with_content}")

conn.commit()
conn.close()