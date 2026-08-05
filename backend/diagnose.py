import os
import sys
import traceback

print("=== STARTING DIAGNOSTICS ===")

try:
    # 1. Setup Django Environment
    sys.path.append(os.getcwd())
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pos_backend.settings")
    import django
    django.setup()
    print("[OK] Django environment loaded")
    
    # 2. Check Database Connection
    from django.db import connection
    connection.ensure_connection()
    print(f"[OK] Database Connected! Using engine: {connection.settings_dict['ENGINE']}")
    
    # 3. Check if Tables Exist (this causes 500 if missing)
    from store.models import StoreUser
    count = StoreUser.objects.count()
    print(f"[OK] StoreUser table exists. Total users: {count}")
    
    # 4. Check Requests module
    import requests
    print("[OK] Requests module is installed and working")
    
    print("\n=== ALL CHECKS PASSED ===")

except Exception as e:
    print("\n!!! ERROR FOUND !!!")
    print("Please send a screenshot of this error:")
    traceback.print_exc()
