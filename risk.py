"""risk.py - Deterministic Rule-Based Deadline Risk Prediction for DueLine."""
from datetime import datetime, date

DATE_FORMAT = "%Y-%m-%d"

def parse_deadline(deadline_str):
    """Converts a 'YYYY-MM-DD' date string into a date object, or None if invalid."""
    if not deadline_str or not isinstance(deadline_str, str):
        return None
    try:
        return datetime.strptime(deadline_str.strip(), DATE_FORMAT).date()
    except ValueError:
        return None

def calculate_task_risk(estimated_hours, available_hours):
    """
    Compares estimated working hours against available working hours:
    - HIGH: Available hours < Estimated hours (work cannot fit).
    - MEDIUM: Available hours < 1.2 * Estimated hours (less than 20% safety margin).
    - LOW: Available hours >= 1.2 * Estimated hours (safe buffer).
    """
    try:
        est = float(estimated_hours)
        avail = float(available_hours)
    except (ValueError, TypeError):
        return "INVALID"

    if est < 0 or avail < 0:
        return "INVALID"
    if est == 0:
        return "LOW"
    if avail < est:
        return "HIGH"
    if avail < (est * 1.2):
        return "MEDIUM"
    return "LOW"

def determine_task_status(is_completed, deadline_str, estimated_hours, available_hours=None, current_date=None):
    """
    Evaluates task status in sequential rule order:
    1. COMPLETED: Task is already marked done.
    2. INVALID: Missing or invalid deadline format.
    3. OVERDUE: Deadline date has passed today.
    4. HIGH / MEDIUM / LOW: Based on workload ratio.
    """
    if is_completed:
        return "COMPLETED"

    deadline_date = parse_deadline(deadline_str)
    if deadline_date is None:
        return "INVALID"

    today = current_date or date.today()
    if deadline_date < today:
        return "OVERDUE"

    if available_hours is None:
        days = (deadline_date - today).days
        available_hours = max(0.0, float(days * 8.0))

    return calculate_task_risk(estimated_hours, available_hours)

def get_risk_explanation(status):
    """Returns a simple human-readable reason for the risk status."""
    explanations = {
        "COMPLETED": "Task is completed. No remaining work or risk.",
        "OVERDUE": "Deadline has passed and the task is incomplete. Immediate attention required.",
        "HIGH": "High risk: Available working hours are less than estimated hours needed.",
        "MEDIUM": "Medium risk: Available hours cover the work, but with less than a 20% time buffer.",
        "LOW": "Low risk: Sufficient time available with at least a 20% working-time buffer.",
        "INVALID": "Invalid input: Requires a valid deadline (YYYY-MM-DD) and non-negative numbers.",
    }
    return explanations.get(status, "Status explanation unavailable.")
