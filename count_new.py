import json, psycopg2, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_articles.json', 'r', encoding='utf-8') as f:
    csv_articles = json.load(f)

conn = psycopg2.connect(host='shortline.proxy.rlwy.net', port=25665, dbname='railway', user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require')
cur = conn.cursor()
cur.execute("SELECT url FROM articles")
existing_urls = set(row[0].rstrip('/') for row in cur.fetchall())
conn.close()

csv_urls = set(a['url'].rstrip('/') for a in csv_articles)
new_urls = csv_urls - existing_urls
print(f'CSV articles: {len(csv_articles)}')
print(f'Already in DB: {len(csv_urls & existing_urls)}')
print(f'New to import: {len(new_urls)}')

# Save the new ones for import
new_articles = [a for a in csv_articles if a['url'].rstrip('/') in new_urls]
with open(r'C:\Users\vivek\.openclaw\workspace\vivgai\csv_new_articles.json', 'w', encoding='utf-8') as f:
    json.dump(new_articles, f, ensure_ascii=False, indent=2)
print(f'Saved {len(new_articles)} new articles to csv_new_articles.json')