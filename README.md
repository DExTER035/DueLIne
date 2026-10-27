# DueLine — Python Programming Lab Mini-Project

> **A Pure Python Command-Line Project & Task Manager with Rule-Based Deadline Risk Prediction**

- **Course:** Python Programming Laboratory (2nd Year B.Tech)
- **Language:** Python 3 (Standard Library only — Zero external dependencies)
- **Data Persistence:** Local JSON File Storage (`data.json`)
- **Interface:** Interactive Command-Line Terminal Menu

---

## 1. Project Overview

**DueLine** is a lightweight, pure Python console application designed to help students manage academic projects, track individual tasks, and assess deadline feasibility. 

Unlike basic to-do lists that only store static dates, DueLine incorporates a **deterministic, rule-based risk prediction system**. It calculates whether a student has sufficient working hours left to complete a task before its deadline, assigning an intuitive risk rating (`LOW`, `MEDIUM`, `HIGH`, `OVERDUE`, `COMPLETED`, `INVALID`).

All data is automatically loaded from and saved to `data.json`. No web frameworks, database installations, or external packages (`pip`) are required.

---

## 2. Project Structure

The project strictly adheres to a minimal, beginner-friendly structure:

```text
DueLine/
├── app.py          # Complete application logic (menu, storage, validation, risk logic)
├── data.json       # JSON database storing projects and tasks
└── README.md       # Project documentation, function guides, and viva prep
```

> **Note:** A complete backup of the original Flask web version is preserved separately in the `backup_flask_app/` directory for reference.

---

## 3. Features & Terminal Menu

When executed, DueLine presents an interactive 8-option terminal menu:

```text
=== DueLine Menu ===
1. Add Project
2. View Projects
3. Add Task
4. View Tasks
5. Mark Task as Completed
6. Delete Task
7. View Dashboard
8. Exit
```

### Feature Details:
1. **Add Project:** Prompts for a project name, description, and target deadline (`YYYY-MM-DD`). Generates a unique 8-character ID.
2. **View Projects:** Lists all projects in a formatted table showing name, target deadline, task counts (`completed/total`), and overall completion percentage.
3. **Add Task:** Displays existing projects, lets the user select one by number, and collects task name, deadline, estimated work hours, and available working hours (with an option to auto-calculate available hours at 8 hours/day).
4. **View Tasks:** Displays all recorded tasks along with their assigned project, deadline, hours ratio, and evaluated risk status.
5. **Mark Task as Completed:** Shows active tasks and updates a chosen task's status to `COMPLETED`.
6. **Delete Task:** Safely removes an obsolete or canceled task by list index.
7. **View Dashboard:** Displays a high-level summary of total projects, total tasks, completed vs. pending tasks, per-project progress percentages, and upcoming pending tasks sorted by urgency.
8. **Exit:** Gracefully terminates the program with a parting message.

---

## 4. Rule-Based Deadline Risk Prediction

### Important Note on Methodology
> **DueLine uses a deterministic, rule-based heuristic model, NOT Machine Learning.**  
> Every classification is transparent, reproducible, and derived mathematically from user-provided dates and hours. No black-box training or neural networks are involved.

### Evaluation Precedence & Rules:

| Risk Status | Condition / Rule | Explanation |
| :--- | :--- | :--- |
| **`COMPLETED`** | `completed == True` | Highest priority. The task is finished; zero remaining risk. |
| **`INVALID`** | Malformed date or negative hours | Date could not be parsed as `YYYY-MM-DD` or numeric hours are $< 0$. |
| **`OVERDUE`** | `deadline < date.today()` (incomplete) | Target deadline has already passed and work is unfinished. |
| **`HIGH`** | `available_hours < estimated_hours` | Insufficient working hours remaining to finish the estimated workload. |
| **`MEDIUM`** | `estimated_hours <= available_hours < 1.2 * estimated_hours` | Available hours cover the work, but safety buffer is under 20%. Tight schedule. |
| **`LOW`** | `available_hours >= 1.2 * estimated_hours` | Sufficient hours available with at least a 20% safety margin. |

### Working Hours Calculation:
- **Manual Input:** If the user specifies available working hours (e.g., `10`), that value is used directly.
- **Automatic Fallback:** If the user presses `Enter` without entering hours, the system calculates available hours based on standard working days:
  $$\text{Available Hours} = \max\left(0, (\text{Deadline Date} - \text{Today's Date}) \times 8\right)$$

---

## 5. Project Progress Calculation

Project progress is dynamically evaluated using the ratio of completed tasks to total tasks linked to that project:

$$\text{Progress (\%)} = \begin{cases} \left( \dfrac{\text{Completed Tasks}}{\text{Total Tasks}} \right) \times 100, & \text{if Total Tasks} > 0 \\ 0.0\%, & \text{if Total Tasks} = 0 \end{cases}$$

All progress percentages are rounded to one decimal place.

---

## 6. How to Run the Project

DueLine requires **Python 3.10+** and relies solely on Python's built-in standard library (`json`, `os`, `uuid`, `datetime`).

### Step-by-Step:
1. Open PowerShell, Command Prompt, or terminal.
2. Navigate to the project directory:
   ```powershell
   cd c:\Users\insan\OneDrive\Desktop\DueLine
   ```
3. Run the application:
   ```powershell
   python app.py
   ```

---

## 7. Function-by-Function Code Explanation

For your college lab viva, here is an explanation of every function in `app.py`:

### 1. `load_data()`
- **Purpose:** Reads `data.json` from the disk.
- **How it works:** Checks if `data.json` exists using `os.path.exists()`. If found, parses JSON with `json.load()`. Returns a dictionary containing `"projects"` and `"tasks"` lists. If the file is missing or corrupted, gracefully returns `{"projects": [], "tasks": []}` inside a `try/except` block to prevent crashes.

### 2. `save_data(data)`
- **Purpose:** Persists current state back to disk.
- **How it works:** Opens `data.json` in write mode (`"w"`) and uses `json.dump(data, f, indent=4)` to format the file with human-readable 4-space indentation.

### 3. `parse_date(date_str)`
- **Purpose:** Validates and converts user date strings.
- **How it works:** Uses `datetime.strptime(date_str.strip(), "%Y-%m-%d").date()`. Returns a Python `date` object if valid, or `None` if the input is malformed.

### 4. `calculate_risk(completed, deadline_str, est_hours, avail_hours)`
- **Purpose:** Core heuristic engine that determines task risk.
- **How it works:** Sequentially tests conditions:
  1. If `completed` is true $\to$ `"COMPLETED"`.
  2. If date is unparseable or hours $< 0$ $\to$ `"INVALID"`.
  3. If deadline date $<$ today $\to$ `"OVERDUE"`.
  4. If available hours not provided $\to$ auto-calculates `(deadline - today).days * 8`.
  5. Compares available vs. estimated hours to return `"HIGH"`, `"MEDIUM"`, or `"LOW"`.

### 5. `get_project_stats(project, tasks)`
- **Purpose:** Helper function to calculate completion counts and percentage for any project.
- **How it works:** Filters tasks matching `project["id"]`, counts how many have `completed == True`, and returns `(done, total, percentage)`. Avoids code duplication between `view_projects` and `view_dashboard`.

### 6. `add_project(data)`
- **Purpose:** Handles project creation workflow.
- **How it works:** Asks user for name, description, and deadline. Validates inputs, creates a project dictionary with a unique ID from `uuid.uuid4().hex[:8]`, appends it to `data["projects"]`, and calls `save_data()`.

### 7. `view_projects(data)`
- **Purpose:** Displays all projects in a clean CLI table.
- **How it works:** Iterates over `data["projects"]`, invokes `get_project_stats()`, and prints aligned columns for name, deadline, task counts, and percentage.

### 8. `add_task(data)`
- **Purpose:** Handles task creation linked to an existing project.
- **How it works:** Displays numbered list of projects so the user selects by index (`1`, `2`, ...). Gathers task name, deadline, and estimated hours. Optionally reads available hours or defaults to 8h/day. Computes risk via `calculate_risk()`, stores the task, and saves to JSON.

### 9. `view_tasks(data)`
- **Purpose:** Displays all tasks in a formatted table.
- **How it works:** Creates a lookup dictionary `p_map` mapping project IDs to names. Dynamically re-evaluates risk for each task so that overdue dates update automatically as days pass.

### 10. `pick_task(data, action)`
- **Purpose:** Reusable helper to display tasks and safely capture a valid 1-based index from user input.
- **How it works:** Calls `view_tasks(data)` and prompts for task number. Uses `try/except (ValueError, IndexError)` to ensure out-of-range or non-numeric inputs do not crash the app.

### 11. `complete_task(data)`
- **Purpose:** Marks an active task as finished.
- **How it works:** Uses `pick_task(data, "complete")` to get index, sets `task["completed"] = True` and `task["status"] = "COMPLETED"`, then saves to JSON.

### 12. `delete_task(data)`
- **Purpose:** Removes a task from the system.
- **How it works:** Uses `pick_task(data, "delete")` to get index, pops the task from `data["tasks"]` with `.pop(idx)`, and saves the updated list to JSON.

### 13. `view_dashboard(data)`
- **Purpose:** Executive summary overview.
- **How it works:** Calculates total projects, total tasks, completed vs. pending tasks. Prints each project's progress bar, followed by pending tasks sorted chronologically by deadline.

### 14. `main()`
- **Purpose:** Entry point and infinite control loop.
- **How it works:** Loads data once at startup, prints the 8-option menu, reads choice string, and delegates to corresponding handler functions using a clean dictionary dispatch table `actions.get(choice)`. Breaks loop on option `"8"`.

---

## 8. Common Lab Viva Questions & Answers

### Q1: What is the main objective of this project?
> **Answer:** DueLine is a console-based task and project management system that assists students in evaluating whether upcoming deadlines are realistically achievable by comparing estimated workloads against available working hours using deterministic rules.

### Q2: Why did you use JSON for storage instead of SQL or a database?
> **Answer:** JSON is built directly into Python's standard library (`json` module). It is human-readable, requires zero external database installation or configuration, and is lightweight and portable for lab demonstration.

### Q3: How is task risk predicted? Is machine learning used?
> **Answer:** No machine learning is used. It is a strictly deterministic, rule-based heuristic system. It compares `available_hours` against `estimated_hours` using clear threshold ratios: less than 100% is HIGH risk, between 100% and 120% is MEDIUM risk, and 120% or greater (a 20% safety buffer) is LOW risk.

### Q4: How do you prevent the application from crashing on invalid user input?
> **Answer:** We use defensive programming with `try/except` blocks to catch `ValueError` and `IndexError` when parsing numbers, dates, and list selections. If an invalid value is entered, an error message is printed and the program returns safely to the menu without crashing.

### Q5: What is the significance of `if __name__ == "__main__":`?
> **Answer:** It ensures that `main()` is only executed when the file is run directly (`python app.py`), and not when the file is imported as a module into another script or test suite.

### Q6: How are tasks linked to projects?
> **Answer:** Each project has a unique ID (`id`). When a task is created, it stores `project_id` matching its parent project's ID. This mimics a relational foreign key in Python data structures.

### Q7: How is project progress calculated?
> **Answer:** It is calculated dynamically by counting completed tasks (`completed == True`) divided by total tasks assigned to that project, multiplied by 100. If a project has zero tasks, it safely displays 0.0% to avoid division-by-zero errors (`ZeroDivisionError`).

### Q8: What Python data structures are used in this program?
> **Answer:** 
> - **Dictionaries (`dict`):** To represent individual projects and tasks as key-value pairs, and for menu dispatch.
> - **Lists (`list`):** To store collections of project and task dictionaries.
> - **Tuples / Primitives:** Floats for hours, strings for names/dates, booleans for completion flags.

### Q9: Why did you create helper functions like `pick_task` and `get_project_stats`?
> **Answer:** To follow the DRY principle (Don't Repeat Yourself). `pick_task` centralizes index validation for both task completion and deletion. `get_project_stats` centralizes completion percentage calculation for both project listing and the dashboard.

### Q10: How does automatic available hours calculation work?
> **Answer:** If the user does not specify available hours, the app calculates the number of calendar days between today's date and the deadline date, multiplying by 8 working hours per day.
