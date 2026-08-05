import sys
import subprocess

print("=== STARTING DOWNGRADE ===")

print("1. Uninstalling current Django version...")
subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "django"])

print("2. Installing Django 4.2.14 (PostgreSQL 13 compatible)...")
subprocess.run([sys.executable, "-m", "pip", "install", "django==4.2.14"])

print("=== DOWNGRADE COMPLETE ===")
print("Please run diagnose.py again!")
