import psycopg2

conn = psycopg2.connect(
    host='shortline.proxy.rlwy.net', port=25665, dbname='railway',
    user='postgres', password='zPkSndmnMPjAdGkViyTolhREvHLLDJXx', sslmode='require'
)
conn.autocommit = True
cur = conn.cursor()

# Add rating and rated_date columns to articles
try:
    cur.execute("ALTER TABLE articles ADD COLUMN IF NOT EXISTS rating TEXT")
    print('✅ rating column added')
except Exception as e:
    print(f'rating: {e}')

try:
    cur.execute("ALTER TABLE articles ADD COLUMN IF NOT EXISTS rated_date DATE")
    print('✅ rated_date column added')
except Exception as e:
    print(f'rated_date: {e}')

try:
    cur.execute("ALTER TABLE articles ADD COLUMN IF NOT EXISTS rationale TEXT")
    print('✅ rationale column added')
except Exception as e:
    print(f'rationale: {e}')

# Create indexes for filtering
cur.execute("CREATE INDEX IF NOT EXISTS idx_articles_rating ON articles(rating)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_articles_rated_date ON articles(rated_date DESC)")

# Verify
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='articles' ORDER BY ordinal_position")
print(f'\nArticles columns: {[r[0] for r in cur.fetchall()]}')

conn.close()