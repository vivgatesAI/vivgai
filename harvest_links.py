import httpx, json, sys
sys.stdout.reconfigure(encoding='utf-8')

VENICE_API_KEY = "VENICE_INFERENCE_KEY_Xz64OoFpaEBgh4KDhJ8csMFNKdlysiZDUxwOB31RDk"

# Use Venice augment/scrape to get article links from gaiinsights
r = httpx.post(
    "https://api.venice.ai/api/v1/augment/scrape",
    headers={"Authorization": f"Bearer {VENICE_API_KEY}"},
    json={"url": "https://gaiinsights.com/articles"},
    timeout=60
)
data = r.json()
content = data.get("content", "")
# Extract URLs from the scraped content
import re
urls = re.findall(r'https?://[^\s\)"\'>]+', content)
print(f"Scraped content length: {len(content)}")
print(f"Found {len(urls)} URLs")
for url in set(urls):
    if 'article' in url.lower() or 'blog' in url.lower() or 'insight' in url.lower() or 'news' in url.lower():
        print(f"  {url}")
print("\n---First 3000 chars---")
print(content[:3000])