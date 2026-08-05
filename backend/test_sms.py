import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')
django.setup()

c = Client()
response = c.post('/send-sms/', {'phone': '0742765445', 'message': 'Test'}, content_type='application/json')
print(response.status_code)
print(response.content.decode('utf-8'))
