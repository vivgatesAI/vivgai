import psycopg2, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = psycopg2.connect(host='shortline.proxy.rlwy.net', port=25665, dbname='railway', user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require')
cur = conn.cursor()

# Normalize the weird rating
cur.execute("UPDATE articles SET rating = 'Optional' WHERE rating = 'Optional, Essential for Bioscience'")
print(f'Normalized weird rating: {cur.rowcount} rows')

# Check date range
cur.execute("SELECT MIN(rated_date), MAX(rated_date) FROM articles WHERE rated_date IS NOT NULL")
row = cur.fetchone()
print(f'Date range: {row[0]} to {row[1]}')

# Count by month
cur.execute("""
  SELECT TO_CHAR(rated_date, 'YYYY-MM') as month, COUNT(*) 
  FROM articles WHERE rated_date IS NOT NULL 
  GROUP BY month ORDER BY month
""")
print('\nArticles by month:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

# Count metadata-only articles (no content)
cur.execute("SELECT COUNT(*) FROM articles WHERE content_length = 0")
print(f'\nMetadata-only (no content scraped): {cur.fetchone()[0]}')

# Count with content
cur.execute("SELECT COUNT(*) FROM articles WHERE content_length > 0")
print(f'With full content: {cur.fetchone()[0]}')

conn.commit()
conn.close()