"""risk.py - Deterministic Rule-Based Deadline Risk Prediction for DueLine."""
from datetime import datetime, date
import math

DATE_FORMAT = "%Y-%m-%d"

def parse_deadline(deadline_str):
    if not deadline_str or not isinstance(deadline_str, str):
        return None
    try:
        return datetime.strptime(deadline_str.strip(), DATE_FORMAT).date()
    except ValueError:
        return None

def is_task_completed(is_completed):
    if isinstance(is_completed, bool):
        return is_completed
    if isinstance(is_completed, str):
        return is_completed.strip().lower() in ("true", "yes", "1", "completed")
    return bool(is_completed)

def is_deadline_passed(deadline_str, current_date=None):
    deadline_date = parse_deadline(deadline_str)
    return False if deadline_date is None else deadline_date < (current_date or date.today())

def calculate_task_risk(estimated_hours, available_hours):
    try:
        est, avail = float(estimated_hours), float(available_hours)
    except (ValueError, TypeError):
        return "INVALID"
    if not (math.isfinite(est) and math.isfinite(avail)) or est < 0 or avail < 0:
        return "INVALID"
    if est == 0:
        return "LOW"
    return "HIGH" if avail < est else ("MEDIUM" if avail < (est * 1.2) else "LOW")

def calculate_available_hours(deadline_str, hours_per_day=8.0, current_date=None):
    try:
        hpd = float(hours_per_day)
    except (ValueError, TypeError):
        return 0.0
    if not math.isfinite(hpd) or hpd < 0:
        return 0.0
    deadline_date = parse_deadline(deadline_str)
    if deadline_date is None:
        return 0.0
    days = (deadline_date - (current_date or date.today())).days
    return float(days * hpd) if days > 0 else 0.0

def determine_task_status(is_completed, deadline_str, estimated_hours, available_hours=None, current_date=None):
    if is_task_completed(is_completed):
        return "COMPLETED"
    deadline_date = parse_deadline(deadline_str)
    if deadline_date is None:
        return "INVALID"
    if deadline_date < (current_date or date.today()):
        return "OVERDUE"
    if available_hours is None:
        available_hours = calculate_available_hours(deadline_str, current_date=current_date)
    return calculate_task_risk(estimated_hours, available_hours)

get_task_status = determine_task_status

def get_risk_explanation(status):
    explanations = {
        "COMPLETED": "Task is completed. No remaining work or risk.",
        "OVERDUE": "Deadline has passed and the task is incomplete. Immediate attention required.",
        "HIGH": "High risk: Available working hours are less than estimated hours needed.",
        "MEDIUM": "Medium risk: Available hours cover the work, but with less than a 20% time buffer.",
        "LOW": "Low risk: Sufficient time available with at least a 20% working-time buffer.",
        "INVALID": "Invalid input: Requires a valid deadline (YYYY-MM-DD) and non-negative, finite numbers for working hours.",
    }
    return explanations.get(status, "Status explanation unavailable.")
