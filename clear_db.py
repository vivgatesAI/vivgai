import psycopg2

conn = psycopg2.connect(
    host='shortline.proxy.rlwy.net', port=25665, dbname='railway',
    user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require'
)
conn.autocommit = True
cur = conn.cursor()
cur.execute("DELETE FROM chunks")
cur.execute("DELETE FROM articles")
cur.execute("DELETE FROM scrape_logs")
print('Cleared all data')
conn.close()