import os
import json
import fnmatch

def reverse_project_generator(root_dir):
    """
    Generates a project_config.json structure from an existing directory.

    Args:
        root_dir (str): Path to the root directory of the project.

    Returns:
        dict: A dictionary representing the project structure in JSON format,
              or None if an error occurs.
    """
    if not os.path.isdir(root_dir):
        print(f"Error: '{root_dir}' is not a valid directory.")
        return None

    gitignore_patterns = _load_gitignore_patterns(root_dir)

    project_structure = _generate_structure_recursive(root_dir, gitignore_patterns)
    file_structure = _generate_file_structure_recursive(root_dir, gitignore_patterns)

    if project_structure and file_structure:
        config_json = {
            "project_name": os.path.basename(root_dir),
            "structure": project_structure,
            "file_structure": file_structure
        }
        return config_json
    else:
        return None

def _load_gitignore_patterns(root_dir):
    gitignore_file = os.path.join(root_dir, '.gitignore')
    ignore_patterns = []

    if os.path.exists(gitignore_file):
        try:
            with open(gitignore_file, 'r') as f:
                ignore_patterns = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        except Exception as e:
            print(f"Error reading .gitignore file: {e}")

    return ignore_patterns

def _generate_structure_recursive(current_dir, gitignore_patterns):
    """
    Same as before: reads file contents.
    """
    structure_data = {}
    try:
        for item_name in os.listdir(current_dir):
            item_path = os.path.join(current_dir, item_name)

            if _should_skip(item_path, item_name, gitignore_patterns):
                continue

            if os.path.isdir(item_path):
                subdirectory_structure = _generate_structure_recursive(item_path, gitignore_patterns)
                if subdirectory_structure is not None:
                    structure_data[item_name] = subdirectory_structure
                else:
                    return None
            elif os.path.isfile(item_path):
                if _is_binary_file(item_path):
                    continue
                try:
                    with open(item_path, 'r', encoding='utf-8') as f:
                        file_content = f.read()
                    structure_data[item_name] = file_content
                except Exception as e:
                    print(f"Error reading file '{item_path}': {e}")
                    return None
    except OSError as e:
        print(f"Error listing directory '{current_dir}': {e}")
        return None

    return structure_data

def _generate_file_structure_recursive(current_dir, gitignore_patterns):
    """
    NEW: generates file structure only, no file contents.
    """
    structure_data = {}
    try:
        for item_name in os.listdir(current_dir):
            item_path = os.path.join(current_dir, item_name)

            if _should_skip(item_path, item_name, gitignore_patterns):
                continue

            if os.path.isdir(item_path):
                subdirectory_structure = _generate_file_structure_recursive(item_path, gitignore_patterns)
                if subdirectory_structure is not None:
                    structure_data[item_name] = subdirectory_structure
                else:
                    return None
            elif os.path.isfile(item_path):
                if _is_binary_file(item_path):
                    continue
                structure_data[item_name] = None  # No content, just the name
    except OSError as e:
        print(f"Error listing directory '{current_dir}': {e}")
        return None

    return structure_data

def _should_skip(item_path, item_name, gitignore_patterns):
    """
    Combines all skipping rules in one place for DRY code.
    """
    if '.git' in item_name or '.next' in item_name or 'node_modules' in item_name or 'package-lock.json' in item_name:
        return True
    if _is_ignored(item_path, gitignore_patterns):
        return True
    return False

def _is_ignored(item_path, gitignore_patterns):
    item_name = os.path.relpath(item_path, start=os.getcwd())
    for pattern in gitignore_patterns:
        if fnmatch.fnmatch(item_name, pattern) or fnmatch.fnmatch(item_name + '/', pattern):
            return True
    return False

def _is_binary_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8'):
            return False
    except UnicodeDecodeError:
        return True

if __name__ == "__main__":
    dirr = os.getcwd()
    target_directory = os.path.join(dirr, "src")

    print(target_directory)
    if not os.path.exists(target_directory) or not os.path.isdir(target_directory):
        print(f"Error: Directory '{target_directory}' not found. Please create it first or specify a valid directory.")
    else:
        config_data = reverse_project_generator(target_directory)

        if config_data:
            output_json_file = "reversed_project_config.json"
            with open(output_json_file, 'w') as f:
                json.dump(config_data, f, indent=4)
            print(f"Project configuration JSON written to '{output_json_file}'.")
        else:
            print("Project configuration generation failed.")
