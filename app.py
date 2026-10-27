"""app.py - Main Flask Application Controller for DueLine."""
import os, uuid, math
from flask import Flask, render_template, request, redirect, url_for, flash
import storage, risk

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "templates"), static_folder=os.path.join(BASE_DIR, "static"))
app.secret_key = os.environ.get("SECRET_KEY", "dueline-college-lab-project-secret-key")

def get_safe_data():
    data = storage.load_data()
    if not isinstance(data, dict):
        data = storage.get_default_data()
    data["projects"] = data.get("projects") if isinstance(data.get("projects"), list) else []
    data["tasks"] = data.get("tasks") if isinstance(data.get("tasks"), list) else []
    return data

def validate_hours(value_str):
    try:
        val = float(value_str)
        if math.isfinite(val) and val >= 0:
            return True, val
    except (ValueError, TypeError):
        pass
    return False, None

def calculate_project_progress(projects, tasks):
    valid_tasks = [t for t in tasks if isinstance(t, dict)]
    result = []
    for p in projects:
        if not isinstance(p, dict):
            continue
        pid = p.get("id")
        if not isinstance(pid, str) or not pid.strip():
            continue
        pid = pid.strip()
        copy = dict(p)
        copy["id"] = pid
        n, d, dl = copy.get("name"), copy.get("description"), copy.get("deadline")
        copy["name"] = n.strip() if isinstance(n, str) and n.strip() else "Unnamed Project"
        copy["description"] = d.strip() if isinstance(d, str) else ""
        copy["deadline"] = dl.strip() if isinstance(dl, str) and dl.strip() else "No deadline"
        p_tasks = [t for t in valid_tasks if isinstance(t.get("project_id"), str) and t.get("project_id").strip() == pid]
        total = len(p_tasks)
        completed = sum(1 for t in p_tasks if t.get("completed") is True)
        copy["total_tasks"] = total
        copy["completed_tasks"] = completed
        copy["progress"] = round((completed / total) * 100.0, 1) if total > 0 else 0.0
        result.append(copy)
    return result

def enrich_tasks(tasks, projects):
    project_map = {p["id"].strip(): (p.get("name") or "Unnamed Project").strip() for p in projects if isinstance(p, dict) and isinstance(p.get("id"), str) and p["id"].strip()}
    enriched = []
    for t in tasks:
        if not isinstance(t, dict):
            continue
        copy = dict(t)
        tid, n, g, d = copy.get("id"), copy.get("name"), copy.get("goal"), copy.get("deadline")
        copy["id"] = tid.strip() if isinstance(tid, str) and tid.strip() else "unknown-id"
        copy["name"] = n.strip() if isinstance(n, str) and n.strip() else "Unnamed Task"
        copy["goal"] = g.strip() if isinstance(g, str) else ""
        valid_d = isinstance(d, str) and risk.parse_deadline(d.strip()) is not None
        d_str = d.strip() if valid_d else ""
        copy["deadline"] = d_str if valid_d else (d.strip() if isinstance(d, str) and d.strip() else "No deadline")
        est, avail = copy.get("estimated_hours", 0), copy.get("available_hours", 0)
        is_comp = copy.get("completed") is True
        copy["completed"] = is_comp
        status = risk.determine_task_status(is_comp, d_str, est, avail)
        copy["status"] = status
        copy["risk_explanation"] = risk.get_risk_explanation(status)
        raw_pid = copy.get("project_id")
        clean_pid = raw_pid.strip() if isinstance(raw_pid, str) and raw_pid.strip() else ""
        copy["project_id"] = clean_pid
        copy["project_name"] = project_map.get(clean_pid, "Unknown Project")
        enriched.append(copy)
    return enriched

@app.route("/")
def dashboard():
    data = get_safe_data()
    projects = calculate_project_progress(data["projects"], data["tasks"])
    enriched = enrich_tasks(data["tasks"], data["projects"])
    completed = sum(1 for t in enriched if t.get("completed") is True)
    stats = {"total_projects": len(projects), "total_tasks": len(enriched), "completed_tasks": completed, "pending_tasks": len(enriched) - completed}
    upcoming = [t for t in enriched if t.get("completed") is not True]
    upcoming.sort(key=lambda t: t.get("deadline") if isinstance(t.get("deadline"), str) and risk.parse_deadline(t.get("deadline")) else "9999-99-99")
    return render_template("dashboard.html", stats=stats, projects=projects, upcoming_tasks=upcoming)

@app.route("/projects", methods=["GET", "POST"])
def projects():
    if request.method == "POST":
        name, desc, deadline = request.form.get("name", "").strip(), request.form.get("description", "").strip(), request.form.get("deadline", "").strip()
        if not name:
            flash("Project name is required.", "danger")
            return redirect(url_for("projects"))
        if not deadline or risk.parse_deadline(deadline) is None:
            flash("A valid deadline in YYYY-MM-DD format is required.", "danger")
            return redirect(url_for("projects"))
        data = get_safe_data()
        data["projects"].append({"id": str(uuid.uuid4())[:8], "name": name, "description": desc, "deadline": deadline})
        flash(f"Project '{name}' created successfully!" if storage.save_data(data) else "Failed to save project. Please check file permissions.", "success" if storage.save_data(data) else "danger")
        return redirect(url_for("projects"))
    data = get_safe_data()
    return render_template("projects.html", projects=calculate_project_progress(data["projects"], data["tasks"]))

@app.route("/tasks", methods=["GET", "POST"])
def tasks():
    if request.method == "POST":
        name, pid, goal, dl = request.form.get("name", "").strip(), request.form.get("project_id", "").strip(), request.form.get("goal", "").strip(), request.form.get("deadline", "").strip()
        if not name:
            flash("Task name is required.", "danger")
            return redirect(url_for("tasks"))
        data = get_safe_data()
        valid_pids = {p["id"].strip() for p in data["projects"] if isinstance(p, dict) and isinstance(p.get("id"), str) and p["id"].strip()}
        if not pid or pid not in valid_pids:
            flash("Please select a valid existing project.", "danger")
            return redirect(url_for("tasks"))
        if not dl or risk.parse_deadline(dl) is None:
            flash("A valid deadline in YYYY-MM-DD format is required.", "danger")
            return redirect(url_for("tasks"))
        ok_est, est_hours = validate_hours(request.form.get("estimated_hours", "").strip())
        if not ok_est:
            flash("Estimated hours must be a valid, non-negative finite number.", "danger")
            return redirect(url_for("tasks"))
        ok_avail, avail_hours = validate_hours(request.form.get("available_hours", "").strip())
        if not ok_avail:
            flash("Available working hours must be a valid, non-negative finite number.", "danger")
            return redirect(url_for("tasks"))
        new_task = {
            "id": str(uuid.uuid4())[:8], "name": name, "project_id": pid, "goal": goal, "deadline": dl,
            "estimated_hours": est_hours, "available_hours": avail_hours, "completed": False,
            "status": risk.determine_task_status(False, dl, est_hours, avail_hours),
        }
        data["tasks"].append(new_task)
        flash(f"Task '{name}' added successfully!" if storage.save_data(data) else "Failed to save task. Please try again.", "success" if storage.save_data(data) else "danger")
        return redirect(url_for("tasks"))
    data = get_safe_data()
    display_projects = [p for p in data["projects"] if isinstance(p, dict) and isinstance(p.get("id"), str) and p["id"].strip()]
    return render_template("tasks.html", tasks=enrich_tasks(data["tasks"], data["projects"]), projects=display_projects)

@app.route("/tasks/complete/<task_id>", methods=["POST"])
def complete_task(task_id):
    data = get_safe_data()
    target_id = task_id.strip() if isinstance(task_id, str) else ""
    found = False
    for t in data["tasks"]:
        if isinstance(t, dict) and isinstance(t.get("id"), str) and t["id"].strip() == target_id:
            t["completed"], t["status"] = True, "COMPLETED"
            found = True
            break
    if found and storage.save_data(data):
        flash("Task marked as completed!", "success")
    else:
        flash("Task not found." if not found else "Failed to update task status.", "danger")
    return redirect(url_for("tasks"))

@app.route("/tasks/delete/<task_id>", methods=["POST"])
def delete_task(task_id):
    data = get_safe_data()
    target_id = task_id.strip() if isinstance(task_id, str) else ""
    init_count = len(data["tasks"])
    data["tasks"] = [t for t in data["tasks"] if not (isinstance(t, dict) and isinstance(t.get("id"), str) and t["id"].strip() == target_id)]
    if len(data["tasks"]) < init_count and storage.save_data(data):
        flash("Task deleted successfully!", "success")
    else:
        flash("Task not found." if len(data["tasks"]) == init_count else "Failed to delete task.", "danger")
    return redirect(url_for("tasks"))

@app.route("/about")
def about():
    return render_template("about.html")

if __name__ == "__main__":
    app.run(debug=True)
