"""
risk.py - Rule-Based Deadline Risk Prediction Module for DueLine

This module provides simple, beginner-friendly functions to estimate task risk
and determine task status based on working hours and deadlines.

Note for Viva:
This is a deterministic, rule-based heuristic model (not machine learning).
It compares estimated work hours against available working hours with a 20% safety buffer.
"""

from datetime import datetime, date
import math

# Standard date format used across DueLine
DATE_FORMAT = "%Y-%m-%d"


def parse_deadline(deadline_str):
    """
    Safely converts a deadline string in 'YYYY-MM-DD' format into a date object.
    Returns None if the string is empty, invalid, or cannot be parsed.
    """
    if not deadline_str or not isinstance(deadline_str, str):
        return None
    try:
        return datetime.strptime(deadline_str.strip(), DATE_FORMAT).date()
    except ValueError:
        return None


def is_task_completed(is_completed):
    """
    Helper function to safely evaluate whether a task is completed.
    Handles boolean True/False as well as common string representations.
    """
    if isinstance(is_completed, bool):
        return is_completed
    if isinstance(is_completed, str):
        return is_completed.strip().lower() in ("true", "yes", "1", "completed")
    return bool(is_completed)


def is_deadline_passed(deadline_str, current_date=None):
    """
    Checks if the given deadline has strictly passed relative to current_date.
    If current_date is not provided, today's date is used.
    Returns False if the deadline string is missing or invalid.
    """
    deadline_date = parse_deadline(deadline_str)
    if deadline_date is None:
        return False

    today = current_date if current_date is not None else date.today()
    return deadline_date < today


def calculate_task_risk(estimated_hours, available_hours):
    """
    Calculates rule-based task risk based on estimated work hours and available working hours.

    Rules:
    - HIGH:   Available hours < Estimated work hours
    - MEDIUM: Estimated work hours <= Available hours < Estimated work hours * 1.2
    - LOW:    Available hours >= Estimated work hours * 1.2

    Returns:
    - 'HIGH', 'MEDIUM', 'LOW', or 'INVALID' (if values are negative, non-numeric, NaN, or infinite).
    """
    # 1. Validate numeric conversion
    try:
        est = float(estimated_hours)
        avail = float(available_hours)
    except (ValueError, TypeError):
        return "INVALID"

    # 2. Reject NaN and positive/negative infinity using math.isfinite()
    if not (math.isfinite(est) and math.isfinite(avail)):
        return "INVALID"

    # 3. Validate that hour values are non-negative
    if est < 0 or avail < 0:
        return "INVALID"

    # 4. If zero estimated work hours are required, risk is LOW
    if est == 0:
        return "LOW"

    # 5. Rule-based evaluation
    if avail < est:
        return "HIGH"
    elif avail < (est * 1.2):
        return "MEDIUM"
    else:
        return "LOW"


def calculate_available_hours(deadline_str, hours_per_day=8.0, current_date=None):
    """
    Estimates available working hours based on remaining days until the deadline.
    Assumes standard working hours per day (default 8 hours/day).
    Safely rejects negative, non-numeric, NaN, or infinite hours_per_day by returning 0.0.
    Returns 0.0 if the deadline is invalid, missing, or has already passed.
    """
    # Validate hours_per_day
    try:
        hpd = float(hours_per_day)
    except (ValueError, TypeError):
        return 0.0

    if not math.isfinite(hpd) or hpd < 0:
        return 0.0

    deadline_date = parse_deadline(deadline_str)
    if deadline_date is None:
        return 0.0

    today = current_date if current_date is not None else date.today()
    remaining_days = (deadline_date - today).days

    if remaining_days <= 0:
        return 0.0

    return float(remaining_days * hpd)


def determine_task_status(is_completed, deadline_str, estimated_hours, available_hours=None, current_date=None):
    """
    Determines the displayed task status following precedence rules:
    1. COMPLETED: If the task is completed (highest precedence).
    2. INVALID:   If the task is not completed and deadline is missing or invalid.
    3. OVERDUE:   If the deadline has passed and the task is not completed.
    4. Normal risk level: HIGH, MEDIUM, LOW, or INVALID (based on hour values).
    """
    # 1. Check completion precedence
    if is_task_completed(is_completed):
        return "COMPLETED"

    # 2. Reject missing or invalid deadline for incomplete tasks
    deadline_date = parse_deadline(deadline_str)
    if deadline_date is None:
        return "INVALID"

    # 3. Check overdue precedence
    today = current_date if current_date is not None else date.today()
    if deadline_date < today:
        return "OVERDUE"

    # If available_hours is not provided, estimate it from the deadline
    if available_hours is None:
        available_hours = calculate_available_hours(deadline_str, current_date=current_date)

    # 4. Return the calculated risk level
    return calculate_task_risk(estimated_hours, available_hours)


# Alias for flexible naming
get_task_status = determine_task_status


def get_risk_explanation(status):
    """
    Provides a short, beginner-friendly explanation for each status and risk level.
    """
    explanations = {
        "COMPLETED": "Task is completed. No remaining work or risk.",
        "OVERDUE": "Deadline has passed and the task is incomplete. Immediate attention required.",
        "HIGH": "High risk: Available working hours are less than estimated hours needed.",
        "MEDIUM": "Medium risk: Available hours cover the work, but with less than a 20% time buffer.",
        "LOW": "Low risk: Sufficient time available with at least a 20% working-time buffer.",
        "INVALID": "Invalid input: Requires a valid deadline (YYYY-MM-DD) and non-negative, finite numbers for working hours.",
    }
    return explanations.get(status, "Status explanation unavailable.")
