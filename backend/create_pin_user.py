import os
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pos_backend.settings")
import django
django.setup()

from store.models import StoreUser

# Check if a user with PIN 1234 already exists
if StoreUser.objects.filter(pin="1234").exists():
    print("A user with PIN 1234 already exists in the database!")
else:
    # Create the new StoreUser
    StoreUser.objects.create(
        name="Admin User",
        pin="1234",
        role="admin",
        is_active=True
    )
    print("SUCCESS: Created StoreUser 'Admin User' with PIN: 1234")
