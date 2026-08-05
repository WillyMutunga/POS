import os
import sys

# 1. Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# 2. Tell Passenger where your Django settings are
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')

# 3. Boot up the actual Django application
from pos_backend.wsgi import application
