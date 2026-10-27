"""app.py - Main Flask Application Controller for DueLine."""
import os
import uuid
from flask import Flask, render_template, request, redirect, url_for, flash
import storage
import risk

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "templates"), static_folder=os.path.join(BASE_DIR, "static"))
app.secret_key = os.environ.get("SECRET_KEY", "dueline-college-lab-secret-key")

def get_data():
    """Helper to load data and ensure projects and tasks lists exist."""
    data = storage.load_data()
    if not isinstance(data, dict):
        data = storage.get_default_data()
    data.setdefault("projects", [])
    data.setdefault("tasks", [])
    return data

def parse_positive_number(val_str):
    """Validates and converts a string to a non-negative float."""
    try:
        val = float(val_str)
        if val >= 0:
            return True, val
    except (ValueError, TypeError):
        pass
    return False, None

def get_projects_with_progress(projects, tasks):
    """Calculates completion progress percentage for each project."""
    result = []
    for p in projects:
        p_copy = dict(p)
        pid = p_copy.get("id", "")
        p_tasks = [t for t in tasks if t.get("project_id") == pid]
        total = len(p_tasks)
        completed = sum(1 for t in p_tasks if t.get("completed") is True)
        p_copy["total_tasks"] = total
        p_copy["completed_tasks"] = completed
        p_copy["progress"] = round((completed / total) * 100.0, 1) if total > 0 else 0.0
        result.append(p_copy)
    return result

def get_enriched_tasks(tasks, projects):
    """Enriches each task with project name, risk status, and explanation."""
    project_map = {p.get("id"): p.get("name", "Unnamed") for p in projects}
    enriched = []
    for t in tasks:
        t_copy = dict(t)
        dl = t_copy.get("deadline", "")
        est = t_copy.get("estimated_hours", 0)
        avail = t_copy.get("available_hours", 0)
        is_done = t_copy.get("completed") is True
        
        status = risk.determine_task_status(is_done, dl, est, avail)
        t_copy["status"] = status
        t_copy["risk_explanation"] = risk.get_risk_explanation(status)
        t_copy["project_name"] = project_map.get(t_copy.get("project_id"), "Unknown Project")
        enriched.append(t_copy)
    return enriched

@app.route("/")
def dashboard():
    """Dashboard view: shows summary statistics and upcoming deadlines."""
    data = get_data()
    projects = get_projects_with_progress(data["projects"], data["tasks"])
    tasks = get_enriched_tasks(data["tasks"], data["projects"])
    
    completed = sum(1 for t in tasks if t.get("completed") is True)
    stats = {
        "total_projects": len(projects),
        "total_tasks": len(tasks),
        "completed_tasks": completed,
        "pending_tasks": len(tasks) - completed,
    }
    
    upcoming = [t for t in tasks if not t.get("completed")]
    upcoming.sort(key=lambda t: t.get("deadline") or "9999-99-99")
    
    return render_template("dashboard.html", stats=stats, projects=projects, upcoming_tasks=upcoming)

@app.route("/projects", methods=["GET", "POST"])
def projects():
    """Projects view: displays projects and handles creating new projects."""
    data = get_data()
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        deadline = request.form.get("deadline", "").strip()

        if not name:
            flash("Project name is required.", "danger")
            return redirect(url_for("projects"))
        if not deadline or risk.parse_deadline(deadline) is None:
            flash("A valid deadline in YYYY-MM-DD format is required.", "danger")
            return redirect(url_for("projects"))

        new_project = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "description": description,
            "deadline": deadline,
        }
        data["projects"].append(new_project)
        storage.save_data(data)
        flash(f"Project '{name}' created successfully!", "success")
        return redirect(url_for("projects"))

    projects_list = get_projects_with_progress(data["projects"], data["tasks"])
    return render_template("projects.html", projects=projects_list)

@app.route("/tasks", methods=["GET", "POST"])
def tasks():
    """Tasks view: displays tasks and handles adding new tasks."""
    data = get_data()
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        project_id = request.form.get("project_id", "").strip()
        goal = request.form.get("goal", "").strip()
        deadline = request.form.get("deadline", "").strip()

        if not name:
            flash("Task name is required.", "danger")
            return redirect(url_for("tasks"))
        
        valid_pids = {p.get("id") for p in data["projects"]}
        if not project_id or project_id not in valid_pids:
            flash("Please select a valid existing project.", "danger")
            return redirect(url_for("tasks"))

        if not deadline or risk.parse_deadline(deadline) is None:
            flash("A valid deadline in YYYY-MM-DD format is required.", "danger")
            return redirect(url_for("tasks"))

        ok_est, est_hours = parse_positive_number(request.form.get("estimated_hours", ""))
        if not ok_est:
            flash("Estimated hours must be a valid non-negative number.", "danger")
            return redirect(url_for("tasks"))

        ok_avail, avail_hours = parse_positive_number(request.form.get("available_hours", ""))
        if not ok_avail:
            flash("Available working hours must be a valid non-negative number.", "danger")
            return redirect(url_for("tasks"))

        new_task = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "project_id": project_id,
            "goal": goal,
            "deadline": deadline,
            "estimated_hours": est_hours,
            "available_hours": avail_hours,
            "completed": False,
            "status": risk.determine_task_status(False, deadline, est_hours, avail_hours),
        }
        data["tasks"].append(new_task)
        storage.save_data(data)
        flash(f"Task '{name}' added successfully!", "success")
        return redirect(url_for("tasks"))

    enriched = get_enriched_tasks(data["tasks"], data["projects"])
    return render_template("tasks.html", tasks=enriched, projects=data["projects"])

@app.route("/tasks/complete/<task_id>", methods=["POST"])
def complete_task(task_id):
    """Marks a task as completed."""
    data = get_data()
    for t in data["tasks"]:
        if t.get("id") == task_id:
            t["completed"] = True
            t["status"] = "COMPLETED"
            storage.save_data(data)
            flash("Task marked as completed!", "success")
            return redirect(url_for("tasks"))
    flash("Task not found.", "danger")
    return redirect(url_for("tasks"))

@app.route("/tasks/delete/<task_id>", methods=["POST"])
def delete_task(task_id):
    """Deletes a task by ID."""
    data = get_data()
    init_len = len(data["tasks"])
    data["tasks"] = [t for t in data["tasks"] if t.get("id") != task_id]
    if len(data["tasks"]) < init_len:
        storage.save_data(data)
        flash("Task deleted successfully!", "success")
    else:
        flash("Task not found.", "danger")
    return redirect(url_for("tasks"))

if __name__ == "__main__":
    app.run(debug=True)
