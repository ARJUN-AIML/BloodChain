import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection

def check_connection():
    print("====================================================")
    print("NEON POSTGRESQL CONNECTIVITY TEST")
    print("====================================================")
    print(f"Database Engine: {connection.vendor}")
    with connection.cursor() as cursor:
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"PostgreSQL Version: {version}")
    print("STATUS: CONNECTED TO NEON POSTGRESQL SUCCESSFULLY\n")

if __name__ == '__main__':
    check_connection()
