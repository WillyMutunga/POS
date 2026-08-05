import os
import sys

def application(environ, start_response):
    status = '200 OK'
    output = b'Starting database setup...\n\n'
    
    try:
        # 1. Setup Django
        sys.path.append(os.getcwd())
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pos_backend.settings")
        import django
        django.setup()
        
        # 2. Run Migrations
        from django.core.management import call_command
        from io import StringIO
        
        out = StringIO()
        call_command('migrate', interactive=False, stdout=out)
        output += b'MIGRATIONS:\n'
        output += out.getvalue().encode('utf-8')
        
        # 3. Create Superuser
        from django.contrib.auth.models import User
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'Admin123!')
            output += b'\n\nSUCCESS: Created superuser (admin / Admin123!)'
        else:
            output += b'\n\nSuperuser already exists.'
            
    except Exception as e:
        output += b'\n\nERROR:\n'
        output += str(e).encode('utf-8')

    response_headers = [('Content-type', 'text/plain')]
    start_response(status, response_headers)
    return [output]
