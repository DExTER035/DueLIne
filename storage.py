"""
storage.py - JSON File Storage Module for DueLine

This module provides simple, beginner-friendly functions to read and write
application data (projects and tasks) to a local JSON file (data.json).

Note for Viva:
We use Python's built-in 'os' and 'json' modules.
- 'os.path' ensures we locate data.json relative to this script, preventing
  path errors regardless of which directory the command line starts in.
- 'json.load()' and 'json.dump()' handle serialization and deserialization.
- Specific exceptions (json.JSONDecodeError, OSError, TypeError) are caught
  to handle file and data parsing issues without hiding unexpected programming bugs.
"""

import os
import json

# Default file name for data persistence
DATA_FILENAME = "data.json"


def get_data_file_path():
    """
    Returns the file path for data persistence.
    When running in a serverless environment like Vercel (where the project directory
    is read-only), data is stored in /tmp/data.json, initialized from the bundled data.json.
    In local development, data.json in the project root is used directly.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_data_path = os.path.join(base_dir, DATA_FILENAME)

    # Serverless runtime detection (Vercel, AWS Lambda)
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_data_path = os.path.join("/tmp", DATA_FILENAME)
        if not os.path.exists(tmp_data_path):
            try:
                if os.path.exists(root_data_path):
                    with open(root_data_path, "r", encoding="utf-8") as src, open(tmp_data_path, "w", encoding="utf-8") as dst:
                        dst.write(src.read())
                else:
                    with open(tmp_data_path, "w", encoding="utf-8") as dst:
                        json.dump(get_default_data(), dst, indent=4)
            except OSError:
                pass
        return tmp_data_path

    return root_data_path


def get_default_data():
    """
    Returns the initial empty structure for DueLine data.
    """
    return {
        "projects": [],
        "tasks": []
    }


def is_valid_data_structure(data):
    """
    Validates that the provided data is a dictionary containing
    both 'projects' and 'tasks' as lists.
    """
    if not isinstance(data, dict):
        return False
    if not isinstance(data.get("projects"), list):
        return False
    if not isinstance(data.get("tasks"), list):
        return False
    return True


def load_data(file_path=None):
    """
    Loads project and task data from data.json.

    Behavior:
    1. If data.json does not exist: returns {"projects": [], "tasks": []}.
    2. If data.json is valid: returns the parsed dictionary.
    3. If data.json is empty, corrupted, or has an invalid structure:
       safely returns {"projects": [], "tasks": []} without crashing.
    """
    if file_path is None:
        file_path = get_data_file_path()

    # If the file does not exist yet, return empty default data
    if not os.path.exists(file_path):
        return get_default_data()

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Ensure the loaded JSON matches the expected structure
        if is_valid_data_structure(data):
            return data
        else:
            return get_default_data()

    except (json.JSONDecodeError, OSError):
        # Handles empty/corrupt JSON files or OS-level file read errors
        # without catching broad programming bugs (e.g. NameError, SyntaxError)
        return get_default_data()


def save_data(data, file_path=None):
    """
    Saves the data dictionary to data.json.

    Requirements:
    - Data must be a dictionary with both 'projects' and 'tasks' lists.
    - Saves formatted JSON with indentation (4 spaces) for readability.
    - Returns True if saving succeeded, or False if validation or writing failed.
    """
    if file_path is None:
        file_path = get_data_file_path()

    # Validate data structure before saving
    if not is_valid_data_structure(data):
        return False

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        return True
    except (OSError, TypeError):
        # Fallback to /tmp in case of read-only root filesystems (e.g., serverless environments)
        if os.name != "nt" and file_path != os.path.join("/tmp", DATA_FILENAME) and os.path.exists("/tmp"):
            try:
                fallback_path = os.path.join("/tmp", DATA_FILENAME)
                with open(fallback_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4)
                return True
            except (OSError, TypeError):
                return False
        return False
