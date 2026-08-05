import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')
django.setup()

from store.urls import router
for url in router.urls:
    print(url.pattern.regex.pattern)
