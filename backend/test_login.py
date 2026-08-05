import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')
django.setup()

c = Client()
response = c.post('/api/users/login_pin/', {'pin': '1234'}, content_type='application/json')
print(response.status_code)
print(response.content)
