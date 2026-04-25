import psycopg2, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = psycopg2.connect(host='shortline.proxy.rlwy.net', port=25665, dbname='railway', user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM articles")
print(f'Total articles: {cur.fetchone()[0]}')
cur.execute("SELECT COUNT(*) FROM articles WHERE rating IS NOT NULL")
print(f'With rating: {cur.fetchone()[0]}')
cur.execute("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL")
print(f'Chunks with embeddings: {cur.fetchone()[0]}')
cur.execute("SELECT rating, COUNT(*) FROM articles WHERE rating IS NOT NULL GROUP BY rating ORDER BY rating")
print('\nRating distribution:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')
cur.execute("SELECT rated_date, COUNT(*) FROM articles WHERE rated_date IS NOT NULL GROUP BY rated_date ORDER BY rated_date DESC LIMIT 10")
print('\nMost recent rated dates:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]} articles')
cur.execute("SELECT source, COUNT(*) FROM articles GROUP BY source ORDER BY COUNT(*) DESC LIMIT 15")
print('\nTop sources:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')
conn.close()