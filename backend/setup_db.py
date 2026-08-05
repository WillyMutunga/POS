import os
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pos_backend.settings")
import django
django.setup()

# Run Migrations
from django.core.management import call_command
print("Running Migrations...")
call_command('migrate', interactive=False)
print("Migrations complete!")

# Create Superuser
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'Admin123!')
    print("SUCCESS: Created superuser (admin / Admin123!)")
else:
    print("Superuser already exists.")
