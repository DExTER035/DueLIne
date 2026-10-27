"""
app.py - Main Flask Application Controller for DueLine

Title: A Web-Based Project and Task Management System with Rule-Based Deadline Risk Prediction
Technology: Python, Flask, HTML/CSS, JSON Storage

Note for Viva:
- Implements the Controller in MVC architecture.
- Uses storage.py for data persistence (reading/writing to data.json).
- Uses risk.py for rule-based deadline risk prediction and status evaluation.
- Uses POST-Redirect-GET pattern to prevent duplicate form submissions on page refresh.
- Robustly handles malformed and incomplete data without crashing or silently deleting records.
"""

import os
import uuid
import math
from flask import Flask, render_template, request, redirect, url_for, flash

import storage
import risk

# Base directory for reliable template and static file resolution in serverless environments
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Initialize Flask application
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)
# Secret key required for Flask session management and flash messages
app.secret_key = "dueline-college-lab-project-secret-key"


def get_safe_data():
    """
    Safely loads data from storage and guarantees a dictionary with
    'projects' and 'tasks' lists, even if the stored data is malformed.
    """
    data = storage.load_data()
    if not isinstance(data, dict):
        data = storage.get_default_data()

    if not isinstance(data.get("projects"), list):
        data["projects"] = []

    if not isinstance(data.get("tasks"), list):
        data["tasks"] = []

    return data


def validate_hours(value_str):
    """
    Validates that an hour string can be converted to a non-negative, finite float.
    Rejects negative numbers, non-numeric strings, NaN, and infinity.
    Returns (True, float_value) on success, or (False, None) if invalid.
    """
    try:
        val = float(value_str)
    except (ValueError, TypeError):
        return False, None

    if not math.isfinite(val) or val < 0:
        return False, None

    return True, val


def calculate_project_progress(projects, tasks):
    """
    Calculates progress percentage for each project based on completed tasks.
    Formula: (completed_tasks / total_tasks) * 100
    If a project has no tasks, progress is 0.0%.
    Accepts only non-empty string IDs for projects; ignores numbers, lists, or dicts as IDs.
    Provides sensible fallbacks for missing project fields.
    Counts a task as completed ONLY when task.get('completed') is strictly True.
    """
    projects_with_progress = []
    valid_tasks = [t for t in tasks if isinstance(t, dict)]

    for project in projects:
        if not isinstance(project, dict):
            continue

        raw_p_id = project.get("id")
        # Accept only non-empty string IDs; do not coerce numbers/lists into strings
        if not isinstance(raw_p_id, str) or not raw_p_id.strip():
            continue

        p_id = raw_p_id.strip()
        p_copy = dict(project)
        p_copy["id"] = p_id

        name_val = p_copy.get("name")
        p_copy["name"] = name_val.strip() if isinstance(name_val, str) and name_val.strip() else "Unnamed Project"

        desc_val = p_copy.get("description")
        p_copy["description"] = desc_val.strip() if isinstance(desc_val, str) else ""

        deadline_val = p_copy.get("deadline")
        p_copy["deadline"] = deadline_val.strip() if isinstance(deadline_val, str) and deadline_val.strip() else "No deadline"

        # Find all tasks belonging to this project (strict string project_id matching)
        p_tasks = [
            t for t in valid_tasks
            if isinstance(t.get("project_id"), str) and t.get("project_id").strip() == p_id
        ]
        total_p_tasks = len(p_tasks)
        # Count only when completed is strictly boolean True
        completed_p_tasks = sum(1 for t in p_tasks if t.get("completed") is True)

        p_copy["total_tasks"] = total_p_tasks
        p_copy["completed_tasks"] = completed_p_tasks

        if total_p_tasks == 0:
            p_copy["progress"] = 0.0
        else:
            p_copy["progress"] = round((completed_p_tasks / total_p_tasks) * 100.0, 1)

        projects_with_progress.append(p_copy)

    return projects_with_progress


def enrich_tasks(tasks, projects):
    """
    Enriches each task dictionary with:
    1. Recalculated displayed status via risk.py (never blindly trust old saved status).
    2. Beginner-friendly risk explanation.
    3. Associated project name (handles missing projects safely).
    Validates deadline strictly: passes '' to risk function if deadline is missing,
    non-string, or invalid, ensuring the task receives INVALID status.
    Uses strict non-empty string matching for project IDs.
    """
    # Create lookup map for project names from valid string project IDs
    project_map = {}
    for p in projects:
        if isinstance(p, dict):
            pid = p.get("id")
            if isinstance(pid, str) and pid.strip():
                name_val = p.get("name")
                project_map[pid.strip()] = name_val.strip() if isinstance(name_val, str) and name_val.strip() else "Unnamed Project"

    enriched = []
    for task in tasks:
        if not isinstance(task, dict):
            continue

        t_copy = dict(task)

        # Fallback for display fields
        raw_id = t_copy.get("id")
        t_copy["id"] = raw_id.strip() if isinstance(raw_id, str) and raw_id.strip() else "unknown-id"

        name_val = t_copy.get("name")
        t_copy["name"] = name_val.strip() if isinstance(name_val, str) and name_val.strip() else "Unnamed Task"

        goal_val = t_copy.get("goal")
        t_copy["goal"] = goal_val.strip() if isinstance(goal_val, str) else ""

        # Deadline validation: valid ONLY if it is a string accepted by risk.parse_deadline
        deadline_val = t_copy.get("deadline")
        if isinstance(deadline_val, str) and risk.parse_deadline(deadline_val.strip()) is not None:
            deadline_str = deadline_val.strip()
            t_copy["deadline"] = deadline_str
        else:
            # Pass empty string to risk function so it evaluates to INVALID status
            deadline_str = ""
            # Sensible display fallback
            if isinstance(deadline_val, str) and deadline_val.strip():
                t_copy["deadline"] = deadline_val.strip()
            else:
                t_copy["deadline"] = "No deadline"

        # Safe numeric hours handling
        est_hours = t_copy.get("estimated_hours", 0)
        avail_hours = t_copy.get("available_hours", 0)

        # Evaluated as completed only when strictly True
        is_completed = (t_copy.get("completed") is True)
        t_copy["completed"] = is_completed

        # Recalculate status dynamically using current date and risk rules
        status = risk.determine_task_status(
            is_completed=is_completed,
            deadline_str=deadline_str,
            estimated_hours=est_hours,
            available_hours=avail_hours
        )
        t_copy["status"] = status
        t_copy["risk_explanation"] = risk.get_risk_explanation(status)

        # Strict string-based project ID matching
        raw_pid = t_copy.get("project_id")
        if isinstance(raw_pid, str) and raw_pid.strip():
            clean_pid = raw_pid.strip()
            t_copy["project_id"] = clean_pid
            t_copy["project_name"] = project_map.get(clean_pid, "Unknown Project")
        else:
            t_copy["project_id"] = ""
            t_copy["project_name"] = "Unknown Project"

        enriched.append(t_copy)

    return enriched


# -------------------------------------------------------------------------
# Application Routes
# -------------------------------------------------------------------------

@app.route("/")
def dashboard():
    """
    Dashboard route: Displays summary metrics, project progress, and upcoming tasks.
    Ensures total_projects matches the projects actually displayed after filtering.
    """
    data = get_safe_data()

    # Calculate projects with progress (filters out invalid/ID-less projects)
    projects_with_progress = calculate_project_progress(data["projects"], data["tasks"])
    enriched_tasks = enrich_tasks(data["tasks"], data["projects"])

    # Keep dashboard statistics completely consistent with displayed projects and tasks
    total_projects = len(projects_with_progress)
    total_tasks = len(enriched_tasks)
    completed_tasks = sum(1 for t in enriched_tasks if t.get("completed") is True)
    pending_tasks = total_tasks - completed_tasks

    stats = {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks
    }

    # Filter upcoming incomplete tasks (where completed is NOT True)
    upcoming_tasks = [t for t in enriched_tasks if t.get("completed") is not True]

    # Sort safely by deadline (handling missing/non-string deadlines gracefully)
    def deadline_sort_key(t):
        d = t.get("deadline")
        if isinstance(d, str) and risk.parse_deadline(d) is not None:
            return d
        return "9999-99-99"

    upcoming_tasks.sort(key=deadline_sort_key)

    return render_template(
        "dashboard.html",
        stats=stats,
        projects=projects_with_progress,
        upcoming_tasks=upcoming_tasks
    )


@app.route("/projects", methods=["GET", "POST"])
def projects():
    """
    Projects route:
    - GET: Lists all projects with their task progress.
    - POST: Validates and adds a new project, then redirects.
    """
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        deadline = request.form.get("deadline", "").strip()

        # Validation: Required name
        if not name:
            flash("Project name is required.", "danger")
            return redirect(url_for("projects"))

        # Validation: Required valid deadline
        if not deadline or risk.parse_deadline(deadline) is None:
            flash("A valid deadline in YYYY-MM-DD format is required.", "danger")
            return redirect(url_for("projects"))

        # Create new project record with non-empty string UUID
        new_project = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "description": description,
            "deadline": deadline
        }

        # Load existing data safely, append, and save
        data = get_safe_data()
        data["projects"].append(new_project)

        if storage.save_data(data):
            flash(f"Project '{name}' created successfully!", "success")
        else:
            flash("Failed to save project. Please check file permissions.", "danger")

        return redirect(url_for("projects"))

    # GET request: Load and calculate progress
    data = get_safe_data()
    projects_with_progress = calculate_project_progress(
        data["projects"],
        data["tasks"]
    )
    return render_template("projects.html", projects=projects_with_progress)


@app.route("/tasks", methods=["GET", "POST"])
def tasks():
    """
    Tasks route:
    - GET: Lists all tasks with calculated risk status and project options.
    - POST: Validates and adds a new task, then redirects.
    (Completion and deletion have dedicated single POST routes below).
    """
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        project_id = request.form.get("project_id", "").strip()
        goal = request.form.get("goal", "").strip()
        deadline = request.form.get("deadline", "").strip()
        est_hours_raw = request.form.get("estimated_hours", "").strip()
        avail_hours_raw = request.form.get("available_hours", "").strip()

        # Validation: Required task name
        if not name:
            flash("Task name is required.", "danger")
            return redirect(url_for("tasks"))

        # Validation: Accept only non-empty string IDs for existing project selection
        data = get_safe_data()
        existing_project_ids = [
            p["id"].strip()
            for p in data["projects"]
            if isinstance(p, dict)
            and isinstance(p.get("id"), str)
            and p["id"].strip()
        ]
        if not project_id or project_id not in existing_project_ids:
            flash("Please select a valid existing project.", "danger")
            return redirect(url_for("tasks"))

        # Validation: Deadline format
        if not deadline or risk.parse_deadline(deadline) is None:
            flash("A valid deadline in YYYY-MM-DD format is required.", "danger")
            return redirect(url_for("tasks"))

        # Validation: Estimated work hours
        valid_est, est_hours = validate_hours(est_hours_raw)
        if not valid_est:
            flash("Estimated hours must be a valid, non-negative finite number.", "danger")
            return redirect(url_for("tasks"))

        # Validation: Available working hours
        valid_avail, avail_hours = validate_hours(avail_hours_raw)
        if not valid_avail:
            flash("Available working hours must be a valid, non-negative finite number.", "danger")
            return redirect(url_for("tasks"))

        # Calculate initial rule-based risk
        initial_status = risk.determine_task_status(
            is_completed=False,
            deadline_str=deadline,
            estimated_hours=est_hours,
            available_hours=avail_hours
        )

        # Create new task dictionary
        new_task = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "project_id": project_id,
            "goal": goal,
            "deadline": deadline,
            "estimated_hours": est_hours,
            "available_hours": avail_hours,
            "completed": False,
            "status": initial_status
        }

        data["tasks"].append(new_task)

        if storage.save_data(data):
            flash(f"Task '{name}' added successfully!", "success")
        else:
            flash("Failed to save task. Please try again.", "danger")

        return redirect(url_for("tasks"))

    # GET request: Load and enrich tasks for display
    data = get_safe_data()
    enriched_tasks = enrich_tasks(data["tasks"], data["projects"])

    # Provide only projects with valid non-empty string IDs for task creation form
    display_projects = [
        p for p in data["projects"]
        if isinstance(p, dict)
        and isinstance(p.get("id"), str)
        and p["id"].strip()
    ]

    return render_template(
        "tasks.html",
        tasks=enriched_tasks,
        projects=display_projects
    )


@app.route("/tasks/complete/<task_id>", methods=["POST"])
def complete_task(task_id):
    """
    Single dedicated POST route to mark a task as completed.
    """
    data = get_safe_data()
    if not isinstance(task_id, str) or not task_id.strip():
        flash("Task not found.", "danger")
        return redirect(url_for("tasks"))

    target_id = task_id.strip()
    task_found = False

    for t in data["tasks"]:
        if isinstance(t, dict) and isinstance(t.get("id"), str) and t["id"].strip() == target_id:
            t["completed"] = True
            t["status"] = "COMPLETED"
            task_found = True
            break

    if task_found:
        if storage.save_data(data):
            flash("Task marked as completed!", "success")
        else:
            flash("Failed to update task status.", "danger")
    else:
        flash("Task not found.", "danger")

    return redirect(url_for("tasks"))


@app.route("/tasks/delete/<task_id>", methods=["POST"])
def delete_task(task_id):
    """
    Single dedicated POST route to delete a task.
    Preserves all other records, including incomplete or malformed ones.
    """
    data = get_safe_data()
    if not isinstance(task_id, str) or not task_id.strip():
        flash("Task not found.", "danger")
        return redirect(url_for("tasks"))

    target_id = task_id.strip()
    initial_count = len(data["tasks"])

    # Filter out only the task with matching string id; preserves all other items intact
    data["tasks"] = [
        t for t in data["tasks"]
        if not (isinstance(t, dict) and isinstance(t.get("id"), str) and t["id"].strip() == target_id)
    ]

    if len(data["tasks"]) < initial_count:
        if storage.save_data(data):
            flash("Task deleted successfully!", "success")
        else:
            flash("Failed to delete task.", "danger")
    else:
        flash("Task not found.", "danger")

    return redirect(url_for("tasks"))


@app.route("/about")
def about():
    """
    About route: Displays project details and risk prediction methodology.
    """
    return render_template("about.html")


# Standard entry point to run development server in debug mode
if __name__ == "__main__":
    app.run(debug=True)
