"""storage.py - JSON File Storage Module for DueLine."""
import os
import json

DATA_FILENAME = "data.json"

def get_data_file_path():
    """Returns the absolute path to data.json (supports /tmp on Vercel)."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_path = os.path.join(base_dir, DATA_FILENAME)
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_path = os.path.join("/tmp", DATA_FILENAME)
        if not os.path.exists(tmp_path):
            try:
                if os.path.exists(root_path):
                    with open(root_path, "r", encoding="utf-8") as s, open(tmp_path, "w", encoding="utf-8") as d:
                        d.write(s.read())
                else:
                    with open(tmp_path, "w", encoding="utf-8") as d:
                        json.dump(get_default_data(), d, indent=4)
            except OSError:
                pass
        return tmp_path
    return root_path

def get_default_data():
    """Returns an empty initial database structure."""
    return {"projects": [], "tasks": []}

def load_data(file_path=None):
    """Loads and returns data from the JSON file."""
    path = file_path or get_data_file_path()
    if not os.path.exists(path):
        return get_default_data()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("projects"), list) and isinstance(data.get("tasks"), list):
            return data
    except (json.JSONDecodeError, OSError):
        pass
    return get_default_data()

def save_data(data, file_path=None):
    """Saves data dictionary to the JSON file with 4-space indentation."""
    path = file_path or get_data_file_path()
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        return True
    except (OSError, TypeError):
        if os.name != "nt" and os.path.exists("/tmp"):
            try:
                with open(os.path.join("/tmp", DATA_FILENAME), "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4)
                return True
            except (OSError, TypeError):
                pass
        return False
