import os
import urllib.request
import urllib.error
import json
import ssl
from pathlib import Path

def get_casamoko_env():
    env_vars = {}
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip('"' + "'")
                    
    api_key = env_vars.get("CASAMOKO_API_KEY") or os.getenv("CASAMOKO_API_KEY")
    api_url = env_vars.get("CASAMOKO_API_URL") or os.getenv("CASAMOKO_API_URL", "https://casamoko.co.ke/api/v1/sms/send")
    default_sender = env_vars.get("CASAMOKO_DEFAULT_SENDER") or os.getenv("CASAMOKO_DEFAULT_SENDER", "CASAMOKO")
    
    return api_key, api_url, default_sender, str(env_path), env_path.exists()

def send_sms(phone: str, message: str, sender_id: str = None) -> dict:
    """
    Dispatches SMS via Casamoko REST API using dynamic .env parsing
    """
    api_key, api_url, default_sender, env_path_str, env_exists = get_casamoko_env()
    
    if sender_id is None:
        sender_id = default_sender
        
    if not api_key or api_key == 'YOUR_API_KEY_HERE':
        return {
            "status": "ERROR", 
            "message": f"API Key is missing. Looked in {env_path_str} (Exists: {env_exists})"
        }
        
    payload = {
        "phone": phone,
        "message": message,
        "sender_id": sender_id
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    req = urllib.request.Request(
        api_url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers=headers, 
        method='POST'
    )
    
    context = ssl._create_unverified_context()
    
    try:
        with urllib.request.urlopen(req, context=context) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            return json.loads(error_body)
        except json.JSONDecodeError:
            return {"status": "ERROR", "message": f"HTTP Error {e.code}: {e.reason}"}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

