import psycopg2, sys
sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect(
    host='shortline.proxy.rlwy.net', port=25665, dbname='railway',
    user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require'
)
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM articles')
count = cur.fetchone()[0]
print(f'Total articles: {count}')
cur.execute('SELECT COUNT(*) FROM chunks')
print(f'Total chunks: {cur.fetchone()[0]}')
cur.execute("SELECT id, title, source FROM articles ORDER BY id")
for row in cur.fetchall():
    print(f'  [{row[0]}] {row[1][:60]} | {row[2]}')
conn.close()