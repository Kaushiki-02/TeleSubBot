import os
import re
from pathlib import Path

# --- Configuration ---
# Set the base directory for your test files.
# If your script is in the backend root and test files are in 'backend/test', use 'test'.
# If your script is in the backend root and test files are in 'test', use 'test'.
TEST_BASE_DIR = Path("test")

# --- Conversion Logic ---

def convert_cjs_to_esm(cjs_content, file_path):
    """
    Converts CommonJS content to ES Module syntax.
    This is a simplified conversion and might need adjustments for complex cases.
    """
    esm_content = cjs_content

    # 1. Replace standard 'require' for libraries with 'import'
    # Handles: const module = require('module'); -> import module from 'module';
    # Handles: const { exp } = require('module'); -> import { exp } from 'module';
    esm_content = re.sub(
        r"const\s+(\w+)\s+=\s+require\(['\"]([^'\"]+)['\"]\);",
        r"import \1 from '\2';",
        esm_content
    )
    esm_content = re.sub(
        r"const\s+\{\s*([^}]+)\s*\}\s+=\s+require\(['\"]([^'\"]+)['\"]\);",
        r"import { \1 } from '\2';",
        esm_content
    )

    # 2. Replace relative 'require' with 'import' and add .js extension for local files
    # Assumes local imports are within your project structure (../src/ or ./ or ../ etc.)
    # This regex is tricky; it tries to match paths starting with . or ..
    # It adds .js extension. Mongoose models/utils/services are assumed to be .js
    # Helpers are assumed to be .mjs (will be renamed)
    esm_content = re.sub(
        r"require\(['\"](\.\.?\/[^'\"]+)['\"]\);",
        lambda m: f"import from '{m.group(1)}.js';", # Basic import, figure out what to import later
        esm_content
    )
     # More specific for named imports from local files
    esm_content = re.sub(
        r"const\s+\{\s*([^}]+)\s*\}\s+=\s+require\(['\"](\.\.?\/[^'\"]+)['\"]\);",
        lambda m: f"import {{ {m.group(1)} }} from '{m.group(2)}.js';",
        esm_content
    )

    # 3. Handle specific imports for helpers (assuming they will be .mjs)
    # Replace require('./helpers') with import { ... } from './helpers.mjs'
    esm_content = re.sub(
         r"const\s+\{\s*([^}]+)\s*\}\s+=\s+require\(['\"](\.\/helpers)['\"]\);",
         r"import { \1 } from '\2.mjs';",
         esm_content
     )

    # 4. Replace module.exports with export
    # Handle: module.exports = { ... }; -> export { ... };
    esm_content = re.sub(
        r"module\.exports\s*=\s*\{([^}]+)\};",
        r"export {\1};",
        esm_content
    )
    # Handle: module.exports = singleExport; -> export default singleExport;
    # This is hard to do reliably. Let's remove common single exports and assume named where possible.
    # If a file used module.exports = ClassName, you'd need manual correction to `export default ClassName;`

    # Remove common module.exports = ... patterns we don't want as default exports in ESM test files
    esm_content = re.sub(r"^module\.exports = [^;]+;?$", "", esm_content, flags=re.MULTILINE)


    # 5. Special handling for Mocha global hooks in setup.js
    if file_path.name == 'setup.js': # We will check original name before changing suffix
        print(f"Applying special setup.js conversion for {file_path.name}")
        # global.before -> export const mochaGlobalSetup
        esm_content = esm_content.replace('global.before(', 'export const mochaGlobalSetup = async function(')
        # global.after -> export const mochaGlobalTeardown
        esm_content = esm_content.replace('global.after(', 'export const mochaGlobalTeardown = async function(')


    # Basic cleanup - remove empty lines left from replacements
    esm_content = re.sub(r'\n\s*\n', '\n\n', esm_content)


    # Final check: ensure local imports have .js extension (basic catch-all)
    # This is a fallback and might need tuning
    esm_content = re.sub(
        r"from\s+['\"](\.\.?\/[^'\"]+)['\"];",
        r"from '\1.js';",
        esm_content
    )
     # Ensure helpers import from .mjs
    esm_content = esm_content.replace("from './helpers.js';", "from './helpers.mjs';")


    return esm_content.strip() + '\n' # Add a newline at the end


# --- Main Script Logic ---

print(f"Starting ESM conversion for files in '{TEST_BASE_DIR}'...")

if not TEST_BASE_DIR.exists() or not TEST_BASE_DIR.is_dir():
    print(f"[ERROR] Test directory '{TEST_BASE_DIR}' not found.")
    exit(1)

js_files = list(TEST_BASE_DIR.rglob('*.js'))

if not js_files:
    print(f"No .js files found in '{TEST_BASE_DIR}' to convert.")
    exit(0)

print(f"Found {len(js_files)} .js files.")
print("Processing...")

processed_count = 0
errors = []

for js_file_path in js_files:
    try:
        # Read original content
        original_content = js_file_path.read_text(encoding='utf-8')

        # Convert content
        esm_content = convert_cjs_to_esm(original_content, js_file_path)

        # Determine new file path with .mjs extension
        mjs_file_path = js_file_path.with_suffix('.mjs')

        # Write new content to .mjs file
        mjs_file_path.write_text(esm_content, encoding='utf-8')

        # Delete original .js file
        js_file_path.unlink()

        print(f"Converted '{js_file_path.relative_to(TEST_BASE_DIR)}' to '{mjs_file_path.relative_to(TEST_BASE_DIR)}'")
        processed_count += 1

    except Exception as e:
        print(f"[ERROR] Failed to process '{js_file_path.relative_to(TEST_BASE_DIR)}': {e}")
        errors.append(js_file_path)

print("\nConversion process finished.")
print(f"Successfully converted {processed_count} files.")
if errors:
    print(f"Failed to convert {len(errors)} files:")
    for err_file in errors:
        print(f"- {err_file.relative_to(TEST_BASE_DIR)}")

print("\nRemember to:")
print("1. Ensure your package.json test script targets .mjs files (e.g., 'mocha test/**/*.test.mjs').")
print("2. Double-check generated .mjs files for correctness, especially complex imports/exports.")
print("3. Implement necessary mocks for external services.")
print("4. Run 'npm install' if you added new dependencies.")
print("5. Run your tests using 'npm test'.")