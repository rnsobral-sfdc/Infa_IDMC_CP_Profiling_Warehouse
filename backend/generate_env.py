#!/usr/bin/env python3
"""
Generate .env file with encryption key
"""
from cryptography.fernet import Fernet
import os

# Generate a new Fernet key
key = Fernet.generate_key().decode('utf-8')

# Get the directory where this script is located (backend folder)
script_dir = os.path.dirname(os.path.abspath(__file__))
# .env should be in project root (parent of backend)
project_root = os.path.dirname(script_dir)
env_file = os.path.join(project_root, '.env')

# Create .env file with the key
env_content = f"""SECRET_KEY=your-secret-key-here-change-this-in-production
ENCRYPTION_KEY={key}
"""

with open(env_file, 'w') as f:
    f.write(env_content)

print(f"✓ .env file created successfully at: {env_file}")
print(f"✓ Encryption key generated: {key[:20]}...")
