# write_files_from_json.py
import json
import os
import sys
import platform # To handle path separators potentially

def create_files_from_json(json_file_path):
    """Reads a JSON file and creates the specified directory structure and files."""
    try:
        # Read with utf-8 encoding
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Successfully loaded JSON data from '{json_file_path}'.")
    except FileNotFoundError:
        print(f"❌ Error: JSON file not found at '{json_file_path}'")
        print("Ensure 'generate_project_json.py' was run successfully first.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Could not decode JSON from '{json_file_path}'. Check its format.")
        print(f"   Error details: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ An unexpected error occurred while reading the JSON file: {e}")
        sys.exit(1)

    print(f"--- Starting file creation process ---")
    files_created_count = 0
    dirs_created_count = 0
    errors_encountered = 0

    # Get the directory where this script is located (project root)
    project_root = os.path.dirname(os.path.abspath(__file__))
    print(f"Project Root Directory: {project_root}")

    # Iterate through the file paths and content from the JSON data
    for file_path_relative, content in data.items():
        # Normalize path separators for cross-platform compatibility
        # Replace backslashes with forward slashes, then split by forward slash
        path_parts = file_path_relative.replace('\\', '/').split('/')
        full_path = os.path.join(project_root, *path_parts)
        # print(f"Processing: {file_path_relative} -> {full_path}") # Debugging path construction

        try:
            # Create parent directories if they don't exist
            dir_name = os.path.dirname(full_path)
            if dir_name and not os.path.exists(dir_name):
                os.makedirs(dir_name)
                # print(f"   Created directory: {dir_name}") # Verbose logging
                dirs_created_count += 1

            # Write the file content using UTF-8 encoding
            # The content read by json.load() is already a correct Python string
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            files_created_count += 1
            # print(f"   ✅ Wrote file: {full_path}") # Verbose logging

        except OSError as e:
             print(f"❌ OSError creating directory/file '{full_path}': {e}")
             errors_encountered += 1
        except IOError as e:
            print(f"❌ IOError writing file '{full_path}': {e}")
            errors_encountered += 1
        except Exception as e:
            print(f"❌ Unexpected error processing '{file_path_relative}': {e}")
            errors_encountered += 1

    # --- Summary ---
    print("\n--- File Creation Summary ---")
    print(f"Directories created: {dirs_created_count}")
    print(f"Files written: {files_created_count}")
    if errors_encountered > 0:
         print(f"Errors encountered: {errors_encountered}")
         print("⚠️ Please review the errors above.")
    else:
        print("✨ File writing process completed successfully.")

if __name__ == "__main__":
    json_file = 'project_structure.json'  # Default filename
    # Allow specifying a different json file via command line argument
    if len(sys.argv) > 1:
        json_file = sys.argv[1]

    print(f"Attempting to read structure from: {json_file}")
    create_files_from_json(json_file)