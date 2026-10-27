"""
DueLine - Pure Python Mini-Project for Programming Lab Viva
A simple command-line project and task manager with rule-based deadline risk prediction.
"""
import json, os, uuid
from datetime import datetime, date

DATA_FILE = "data.json"

def load_data():
    """Loads projects and tasks from data.json or returns default empty lists."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE) as f:
                d = json.load(f)
                return {"projects": d.get("projects", []), "tasks": d.get("tasks", [])}
        except Exception:
            pass
    return {"projects": [], "tasks": []}

def save_data(data):
    """Saves projects and tasks dictionary to data.json."""
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=4)

def parse_date(date_str):
    """Converts a YYYY-MM-DD string into a date object, or None if invalid."""
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except Exception:
        return None

def calculate_risk(completed, deadline_str, est_hours, avail_hours):
    """Predicts task risk: COMPLETED, INVALID, OVERDUE, HIGH, MEDIUM, LOW."""
    if completed:
        return "COMPLETED"
    dl = parse_date(deadline_str)
    if not dl or est_hours is None or est_hours < 0:
        return "INVALID"
    today = date.today()
    if dl < today:
        return "OVERDUE"
    if avail_hours is None:
        avail_hours = max(0.0, float((dl - today).days * 8))
    if avail_hours < 0:
        return "INVALID"
    if avail_hours < est_hours:
        return "HIGH"
    return "MEDIUM" if avail_hours < (est_hours * 1.2) else "LOW"

def get_project_stats(project, tasks):
    """Calculates completed count, total count, and progress % for a project."""
    p_tasks = [t for t in tasks if t.get("project_id") == project.get("id")]
    done = sum(1 for t in p_tasks if t.get("completed"))
    pct = round((done / len(p_tasks)) * 100, 1) if p_tasks else 0.0
    return done, len(p_tasks), pct

def add_project(data):
    """Creates a new project with name, description, and deadline."""
    name = input("\nEnter project name: ").strip()
    desc = input("Enter description: ").strip()
    dl = input("Enter deadline (YYYY-MM-DD): ").strip()
    if not name or not parse_date(dl):
        print("Error: Name cannot be empty and deadline must be YYYY-MM-DD.")
        return
    data["projects"].append({"id": uuid.uuid4().hex[:8], "name": name, "description": desc, "deadline": dl})
    save_data(data)
    print(f"Success: Project '{name}' created!")

def view_projects(data):
    """Displays all projects and calculates completion percentage."""
    if not data["projects"]:
        print("\nNo projects found.")
        return
    print(f"\n{'#':<3} {'Project Name':<20} {'Deadline':<12} {'Tasks':<10} {'Progress'}\n" + "-" * 55)
    for i, p in enumerate(data["projects"], 1):
        done, total, pct = get_project_stats(p, data["tasks"])
        print(f"{i:<3} {p['name'][:18]:<20} {p.get('deadline',''):<12} {f'{done}/{total}':<10} {pct}%")

def add_task(data):
    """Creates a task linked to an existing project."""
    if not data["projects"]:
        print("\nError: Please add at least one project first.")
        return
    print("\nProjects:")
    for i, p in enumerate(data["projects"], 1):
        print(f"  {i}. {p['name']}")
    try:
        idx = int(input("Select Project Number: ")) - 1
        project = data["projects"][idx]
        name = input("Enter task name: ").strip()
        dl = input("Enter deadline (YYYY-MM-DD): ").strip()
        if not name or not parse_date(dl):
            print("Error: Invalid task name or deadline format.")
            return
        est = float(input("Enter estimated hours: "))
        avail_in = input("Enter available hours (press Enter for auto @ 8h/day): ").strip()
        avail = float(avail_in) if avail_in else None
        if est < 0 or (avail is not None and avail < 0):
            print("Error: Hours cannot be negative.")
            return
    except (ValueError, IndexError):
        print("Error: Invalid input value.")
        return
    status = calculate_risk(False, dl, est, avail)
    effective_avail = avail if avail is not None else max(0.0, float((parse_date(dl) - date.today()).days * 8))
    data["tasks"].append({
        "id": uuid.uuid4().hex[:8], "name": name, "project_id": project["id"],
        "deadline": dl, "estimated_hours": est, "available_hours": effective_avail,
        "completed": False, "status": status
    })
    save_data(data)
    print(f"Success: Task '{name}' added with Risk Status: {status}")

def view_tasks(data):
    """Displays all tasks with project name, hours, and predicted risk."""
    if not data["tasks"]:
        print("\nNo tasks found.")
        return
    p_map = {p["id"]: p["name"] for p in data["projects"]}
    print(f"\n{'#':<3} {'Task Name':<18} {'Project':<15} {'Deadline':<12} {'Hours (Est/Avail)':<18} {'Status'}\n" + "-" * 75)
    for i, t in enumerate(data["tasks"], 1):
        status = calculate_risk(t.get("completed"), t.get("deadline"), t.get("estimated_hours"), t.get("available_hours"))
        hours = f"{t.get('estimated_hours',0)}h / {t.get('available_hours',0)}h"
        print(f"{i:<3} {t['name'][:16]:<18} {p_map.get(t['project_id'],'Unknown')[:13]:<15} {t.get('deadline',''):<12} {hours:<18} {status}")

def pick_task(data, action):
    """Helper to display tasks and safely get user selection."""
    if not data["tasks"]:
        print(f"\nNo tasks to {action}.")
        return None
    view_tasks(data)
    try:
        idx = int(input(f"\nEnter task number to {action}: ")) - 1
        if 0 <= idx < len(data["tasks"]):
            return idx
    except (ValueError, IndexError):
        pass
    print("Error: Invalid task selection.")
    return None

def complete_task(data):
    """Marks a selected task as completed."""
    idx = pick_task(data, "complete")
    if idx is not None:
        data["tasks"][idx]["completed"] = True
        data["tasks"][idx]["status"] = "COMPLETED"
        save_data(data)
        print(f"Success: Task '{data['tasks'][idx]['name']}' marked completed!")

def delete_task(data):
    """Deletes a selected task from storage."""
    idx = pick_task(data, "delete")
    if idx is not None:
        removed = data["tasks"].pop(idx)
        save_data(data)
        print(f"Success: Task '{removed['name']}' deleted!")

def view_dashboard(data):
    """Displays dashboard summary statistics, progress, and upcoming tasks."""
    projects, tasks = data["projects"], data["tasks"]
    done = sum(1 for t in tasks if t.get("completed"))
    print("\n" + "=" * 45 + "\n             DUELINE DASHBOARD\n" + "=" * 45)
    print(f" Total Projects  : {len(projects)}\n Total Tasks     : {len(tasks)}\n Completed Tasks : {done}\n Pending Tasks   : {len(tasks) - done}\n" + "-" * 45)
    print("Project Progress:")
    for p in projects:
        done_p, total_p, pct = get_project_stats(p, tasks)
        print(f"  - {p['name']}: {pct}% ({done_p}/{total_p} tasks)")
    print("-" * 45 + "\nUpcoming Pending Tasks:")
    pending = sorted([t for t in tasks if not t.get("completed")], key=lambda t: t.get("deadline", "9999-99-99"))
    for t in pending:
        risk = calculate_risk(False, t.get("deadline"), t.get("estimated_hours"), t.get("available_hours"))
        print(f"  - [{risk}] {t['name']} (Due: {t.get('deadline')})")
    if not pending:
        print("  All tasks completed! Great job.")
    print("=" * 45)

def main():
    """Main terminal loop with user menu."""
    data = load_data()
    actions = {
        "1": add_project, "2": view_projects, "3": add_task,
        "4": view_tasks, "5": complete_task, "6": delete_task, "7": view_dashboard
    }
    menu = "\n=== DueLine Menu ===\n1. Add Project\n2. View Projects\n3. Add Task\n4. View Tasks\n5. Mark Task as Completed\n6. Delete Task\n7. View Dashboard\n8. Exit"
    while True:
        print(menu)
        choice = input("Enter choice (1-8): ").strip()
        if choice == "8":
            print("\nThank you for using DueLine! Goodbye.")
            break
        action = actions.get(choice)
        if action:
            action(data)
        else:
            print("Invalid choice! Please choose a number from 1 to 8.")

if __name__ == "__main__":
    main()
