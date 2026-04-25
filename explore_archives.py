import httpx, json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

VENICE_API_KEY = "VENICE_INFERENCE_KEY_Xz64OoFpaEBgh4KDhJ8csMFNKdlysiZDUxwOB31RDk"

# Try different archive/archive URLs
urls_to_try = [
    "https://gaiinsights.com/articles?page=2",
    "https://gaiinsights.com/news",
    "https://gaiinsights.com/newsbriefings",
    "https://gaiinsights.com/briefings",
    "https://www.gaiinsights.com/ratings",
]

for url in urls_to_try:
    try:
        r = httpx.post(
            "https://api.venice.ai/api/v1/augment/scrape",
            headers={"Authorization": f"Bearer {VENICE_API_KEY}"},
            json={"url": url},
            timeout=60
        )
        data = r.json()
        content = data.get("content", "")
        article_urls = [u for u in re.findall(r'https?://[^\s\)"\'>]+', content) 
                        if any(x in u.lower() for x in ['article', 'blog', 'news', 'briefing', 'insight']) 
                        and 'gaiinsights' not in u]
        print(f"\n{url}")
        print(f"  Content: {len(content)} chars, {len(article_urls)} article links")
        for u in article_urls[:10]:
            print(f"  - {u}")
    except Exception as e:
        print(f"\n{url} → Error: {e}")