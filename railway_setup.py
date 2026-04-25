import urllib.request, json

TOKEN = '36df75e9-5eca-44d3-87ed-c9faeda98b01'
HEADERS = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}
URL = 'https://backboard.railway.app/graphql'

# Create project
mutation = '''mutation {
  projectCreate(input: {name: "VivGAI", description: "AI Article Intelligence"}) {
    id
    name
    models {
      edges {
        node {
          id
          name
          modelId
        }
      }
    }
  }
}'''

req = urllib.request.Request(URL, data=json.dumps({'query': mutation}).encode(), headers=HEADERS, method='POST')
try:
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read())
    if 'errors' in result:
        print('Errors:', json.dumps(result['errors'], indent=2))
    else:
        project = result['data']['projectCreate']
        print(f"Project: {project['name']} ({project['id']})")
        for edge in project.get('models', {}).get('edges', []):
            print(f"  Model: {edge['node']['name']} ({edge['node']['modelId']})")
except Exception as e:
    print(f'Error: {e}')