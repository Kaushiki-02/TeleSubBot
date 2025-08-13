import os
import json
from pathlib import Path

with open("project_structure.json", "r") as f:
    test_project_structure = json.load(f)
    
# --- Main Execution ---
try:
    project_data = test_project_structure # Use the test structure JSON
except Exception as e: # Catch potential errors if JSON is invalid
    print(f"Error loading test structure JSON: {e}")
    exit(1)

base_dir_name = project_data.get("project_name", "test") # Default to 'test'
structure = project_data.get("structure", {})
base_dir = Path(base_dir_name)

# Create base test directory
base_dir.mkdir(parents=True, exist_ok=True)

def create_project_structure(parent_path, structure_dict):
    """
    Recursively creates directories and files based on the structure dictionary.
    """
    for name, content in structure_dict.items():
        current_path = parent_path / Path(name.replace("/", os.sep))

        if isinstance(content, dict):
            # Directory
            print(f"Creating Directory: {current_path}")
            try:
                current_path.mkdir(parents=True, exist_ok=True)
                create_project_structure(current_path, content)
            except OSError as e:
                print(f"[ERROR] Could not create directory {current_path}: {e}")
            except Exception as e:
                print(f"[ERROR] Unexpected error creating directory {current_path}: {e}")
        elif isinstance(content, str):
            # File
            print(f"Creating File:      {current_path}")
            try:
                current_path.parent.mkdir(parents=True, exist_ok=True)
                with open(current_path, 'w', encoding='utf-8') as f:
                    f.write(content.strip() + '\n') # Write stripped content + newline
            except OSError as e:
                 print(f"[ERROR] Could not write file {current_path} (OS Error): {e}")
            except IOError as e:
                print(f"[ERROR] Could not write file {current_path} (IO Error): {e}")
            except Exception as e:
                print(f"[ERROR] Unexpected error writing file {current_path}: {e}")
        else:
            print(f"[WARNING] Unexpected structure type for '{current_path}': {type(content)}")

if not structure:
    print("Error: Test project structure data is empty.")
else:
    print(f"Starting test file writing process into directory: '{base_dir_name}'")
    create_project_structure(base_dir, structure)
    print(f"\nTest file writing process completed for '{base_dir_name}'.")
    print("Please review the generated test files.")
    print("You will need to:")
    print("  - Complete the permissionsData array in test/setup.js (copy from scripts/seed.js).")
    print("  - Implement mocking for external services (WhatsApp, Telegram, Razorpay) where needed (e.g., using Sinon).")
    print("  - Flesh out remaining test files (e.g., subscriptions, analytics, faqs, settings, roles).")
    print("  - Ensure your .env.test file is configured correctly.")
    print("  - Run 'npm install --save-dev mocha chai supertest cross-env mongodb-memory-server sinon' if needed.")
    print("  - Run tests using 'npm test'.")