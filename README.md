# DueLine

> **Stay ahead of every deadline.**

**Official Title:** A Web-Based Project and Task Management System with Rule-Based Deadline Risk Prediction  
**Project Category:** Python Programming Lab Mini-Project  
**Technology:** Python, Flask, HTML5, Vanilla CSS, JSON Storage  

---

## 1. Project Overview

**DueLine** is a clean, student-friendly web application designed to help users organize their academic and personal projects. It tracks projects, individual tasks, target deadlines, estimated work hours, and available working hours to provide clear foresight into upcoming workloads.

By comparing the estimated time required for a task against the working hours available before its deadline, DueLine automatically evaluates deadline feasibility using deterministic, rule-based heuristics to help students avoid last-minute rushes and submit work on schedule.

---

## 2. Problem Statement & Objectives

### Problem Statement
Students and lab participants frequently manage multiple coursework assignments, lab reports, and team projects with overlapping deadlines. Conventional to-do applications simply list dates without considering workload feasibility—whether the user actually has enough working hours left before the deadline to complete the work. This lack of insight leads to inaccurate scheduling, task bottlenecks, and overdue submissions.

### Objectives
- **Centralized Management:** Provide an intuitive dashboard to organize related tasks under dedicated project workspaces.
- **Workload Feasibility Analysis:** Compare estimated work hours against available working hours to determine realistic completion probability.
- **Rule-Based Risk Classification:** Provide clear, explainable deadline risk indicators (`HIGH`, `MEDIUM`, `LOW`, `OVERDUE`, `COMPLETED`, `INVALID`) without opaque black-box models.
- **Progress Tracking:** Dynamically calculate and visualize project completion percentages based on finished tasks.
- **Zero-Config Local Persistence:** Store all records reliably in a local JSON file without external database configuration.

---

## 3. Implemented Features

- **Project Management (`/projects`):**
  - Create projects with a name, description, and target deadline.
  - View project cards displaying target dates, task counts, and dynamic progress bars.
  - Safe validation: Requires non-empty project names and valid `YYYY-MM-DD` deadlines.

- **Task Management (`/tasks`):**
  - Create tasks assigned to valid existing projects with an optional goal, deadline, estimated work hours, and available working hours.
  - Prevent adding tasks until at least one valid project exists.
  - View all tasks in a structured, sortable data table showing project tags, deadlines, hours, and status badges.
  - Mark tasks complete with a single click, immediately updating the status and project progress.
  - Delete individual tasks safely with browser confirmation dialogs.

- **Dashboard Overview (`/`):**
  - Four compact summary cards: **Total Projects**, **Total Tasks**, **Completed Tasks**, and **Pending Tasks**.
  - **Upcoming Tasks Table:** Lists active, incomplete tasks prioritized by approaching deadlines with visible status badges and risk explanations.
  - Quick-action button to navigate directly to task creation.

- **About & Methodology (`/about`):**
  - Explains the system architecture, mathematical formulas, evaluation precedence, and rule criteria.

- **Responsive, Mobile-First User Interface:**
  - Desktop layout with a sticky left sidebar navigation.
  - Mobile layout with a compact top brand header and a fixed bottom navigation bar.
  - Accessible keyboard focus rings (`:focus-visible`) across all buttons and inputs.
  - Contained horizontal table scrolling on small screens to prevent page-level overflow.

---

## 4. Rule-Based Deadline Risk Classification

Task status and risk are computed deterministically by `risk.py`. The system applies a strict order of precedence:

### Evaluation Precedence
1. **COMPLETED:** Highest precedence. If a task is marked complete (`completed is True`), it immediately receives the `COMPLETED` status. Finished tasks carry zero remaining risk.
2. **INVALID:** If an incomplete task has a missing, non-string, or unparseable deadline date, it is assigned the `INVALID` status.
3. **OVERDUE:** If the deadline has already passed relative to today's date and the task is incomplete, it is marked `OVERDUE` before normal workload risk is assessed.
4. **Workload Risk Levels:** Active tasks with valid upcoming deadlines are evaluated by comparing available working hours to estimated work hours:

| Status Badge | Rule Criteria | Explanation |
| :--- | :--- | :--- |
| **COMPLETED** | `completed is True` | Task is finished. Highest precedence; zero remaining risk. |
| **OVERDUE** | `deadline < today` (incomplete) | Target deadline has passed. Immediate attention required. |
| **HIGH** | `available_hours < estimated_hours` | Available hours are insufficient to finish estimated work. High risk of missing deadline. |
| **MEDIUM** | `estimated_hours <= available_hours < 1.2 * estimated_hours` | Available hours cover the work, but safety buffer is under 20%. Tight schedule. |
| **LOW** | `available_hours >= 1.2 * estimated_hours` | Sufficient hours available with at least a 20% safety margin for unexpected delays. |
| **INVALID** | Negative numbers, NaN, infinity, or unparseable date | Input values are invalid, negative, non-numeric, or malformed. |

---

## 5. Project Progress Calculation

Project progress is calculated dynamically in `app.py` based on completed tasks belonging to each project:

$$\text{Progress (\%)} = \left( \frac{\text{Completed Tasks}}{\text{Total Tasks}} \right) \times 100$$

- A task is counted as completed strictly when `completed is True`.
- If a project has no tasks recorded yet, its progress safely defaults to **0%**.
- Rendered progress values are clamped between **0%** and **100%** and presented via an accessible HTML5 `<progress>` element.

---

## 6. Technology Stack

- **Backend:** Python 3, Flask (lightweight WSGI web application framework)
- **Frontend:** HTML5 (semantic elements), Vanilla CSS (custom mobile-first stylesheet in `static/style.css`)
- **Data Persistence:** Local JSON file storage (`data.json`) via Python's standard `json` and `os.path` modules
- **Template Engine:** Jinja2 (server-side HTML rendering)

---

## 7. Project Folder Structure

The project directory consists strictly of the following implemented files:

```
DueLine/
├── .gitignore            # Git exclusion rules for virtual environments and cache
├── app.py                # Main Flask controller, application routes, and input validation
├── README.md             # Project documentation and setup instructions
├── requirements.txt      # Third-party Python dependencies (Flask)
├── risk.py               # Deterministic deadline risk prediction and status evaluation module
├── storage.py            # Local JSON data persistence module (reads/writes data.json)
├── static/
│   └── style.css         # Custom responsive stylesheet (warm off-white & dark teal theme)
└── templates/
    ├── about.html        # About page explaining project methodology and rules
    ├── base.html         # Base template with desktop sidebar, mobile nav, and flash messages
    ├── dashboard.html    # Dashboard view with summary statistics and upcoming tasks
    ├── projects.html     # Projects management view with project cards and progress bars
    └── tasks.html        # Tasks management view with risk table, action buttons, and form
```

> **Note:** The data persistence file `data.json` is automatically created in the root directory upon the first project or task save.

---

## 8. Setup Instructions for Windows

Follow these step-by-step instructions in PowerShell or Command Prompt:

### 1. Prerequisites
Ensure Python 3.10 or higher is installed and added to your system `PATH`. Verify with:
```powershell
python --version
```

### 2. Open Project Directory
Navigate to the root directory where the project files reside:
```powershell
cd c:\Users\insan\OneDrive\Desktop\DueLine
```

### 3. Create a Virtual Environment
Create an isolated virtual environment named `.venv`:
```powershell
python -m venv .venv
```

### 4. Activate the Virtual Environment
Activate the environment:
```powershell
.venv\Scripts\activate
```
*(If you encounter a script execution restriction in PowerShell, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first, then activate).*

### 5. Install Dependencies
Install Flask from `requirements.txt`:
```powershell
pip install -r requirements.txt
```

### 6. Run the Application
Start the Flask development server using the entry point in `app.py`:
```powershell
python app.py
```

### 7. Access in Browser
Open your web browser and navigate to:
```
thedueline.vercel.app
```

Press `Ctrl + C` in the terminal to stop the server when finished.

---

## 9. Data Storage Details & Limitations

### How Storage Works
- The application uses `storage.py` to persist data in a local JSON file named `data.json`.
- When the app starts, `storage.load_data()` safely reads and parses `data.json`. If the file does not exist, is empty, or contains malformed JSON, it returns an empty default structure (`{"projects": [], "tasks": []}`) without crashing.
- Whenever a project or task is created, marked completed, or deleted, `storage.save_data()` writes the full updated dictionary back to `data.json` formatted with a 2-space indentation.

### Limitations for Academic Lab Projects
- **Concurrency:** File-based JSON storage does not support concurrent write operations from multiple users. It is designed for single-user local lab demonstrations.
- **Full File Rewrites:** Every update rewrites the entire JSON document rather than modifying individual rows.
- **Relational Integrity:** There is no database engine to enforce foreign keys or ACID transactions. Relational integrity (e.g. matching `task.project_id` to existing projects) is handled defensively in Python application logic.

---

## 10. Academic Project Disclaimer

This project was developed for academic laboratory demonstration and viva examination:
- The deadline risk prediction model is **strictly deterministic and rule-based**.
- It uses clear mathematical ratios and safety buffers (a 20% margin) comparing estimated hours against available hours.
- It does **not** employ machine learning, neural networks, or black-box artificial intelligence models. Every output is reproducible, transparent, and directly explainable from user inputs.
