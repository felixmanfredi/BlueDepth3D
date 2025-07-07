import json

def load_json(json_path):

    with open(json_path, 'r') as f:
        params=json.load(f)

    return params