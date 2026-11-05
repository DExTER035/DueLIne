/**
 * risk.ts - Deterministic Rule-Based Deadline Risk Prediction for DueLine.
 *
 * 100% Behavioral Parity Port of legacy_flask/risk.py.
 *
 * Rules and Precedence Hierarchy:
 * 1. COMPLETED: Task is already marked done (zero remaining risk).
 * 2. INVALID: Missing or invalid deadline format (requires YYYY-MM-DD).
 * 3. OVERDUE: Deadline date has passed today (relative to calendar date).
 * 4. HIGH / MEDIUM / LOW: Based on workload ratio (available_hours / estimated_hours).
 *
 * Fallback:
 * If available_hours is null or omitted, defaults to:
 *   available_hours = max(0.0, remaining_calendar_days * 8.0)
 */

export const DATE_FORMAT = "YYYY-MM-DD";

export type RiskStatus =
  | "COMPLETED"
  | "OVERDUE"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INVALID";

/**
 * Converts a 'YYYY-MM-DD' date string into a UTC midnight Date object, or null if invalid.
 * Strictly validates calendar bounds, rejecting impossible dates (e.g. Feb 29 on non-leap years, April 31).
 */
export function parseDeadline(deadlineStr: unknown): Date | null {
  if (!deadlineStr || typeof deadlineStr !== "string") {
    return null;
  }

  const trimmed = deadlineStr.trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    return null;
  }

  // Leap year calculation matching Python's calendar rules
  const isLeapYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (day < 1 || day > daysInMonth[month - 1]) {
    return null;
  }

  // Construct pure UTC date at 00:00:00Z to avoid local timezone shifts
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Compares estimated working hours against available working hours:
 * - INVALID: Negative numbers, non-numeric values, or missing inputs.
 * - LOW: Estimated hours == 0, or Available hours >= 1.2 * Estimated hours (>= 20% buffer).
 * - MEDIUM: Available hours < 1.2 * Estimated hours (work fits, but buffer < 20%).
 * - HIGH: Available hours < Estimated hours (work cannot fit).
 */
export function calculateTaskRisk(
  estimatedHours: unknown,
  availableHours: unknown
): RiskStatus {
  // Reject non-numeric, null, undefined, empty strings, and booleans
  if (
    estimatedHours === null ||
    estimatedHours === undefined ||
    availableHours === null ||
    availableHours === undefined
  ) {
    return "INVALID";
  }

  if (typeof estimatedHours === "boolean" || typeof availableHours === "boolean") {
    return "INVALID";
  }

  if (typeof estimatedHours === "string" && estimatedHours.trim() === "") {
    return "INVALID";
  }

  if (typeof availableHours === "string" && availableHours.trim() === "") {
    return "INVALID";
  }

  const est = Number(estimatedHours);
  const avail = Number(availableHours);

  if (!Number.isFinite(est) || !Number.isFinite(avail)) {
    return "INVALID";
  }

  if (est < 0 || avail < 0) {
    return "INVALID";
  }

  if (est === 0) {
    return "LOW";
  }

  if (avail < est) {
    return "HIGH";
  }

  if (avail < est * 1.2) {
    return "MEDIUM";
  }

  return "LOW";
}

/**
 * Evaluates task status in strict sequential rule order:
 * 1. COMPLETED: Task is already marked done.
 * 2. INVALID: Missing or invalid deadline format.
 * 3. OVERDUE: Target deadline has passed today's calendar date.
 * 4. HIGH / MEDIUM / LOW: Evaluated by calculateTaskRisk.
 *
 * @param isCompleted Whether the task is finished
 * @param deadlineStr Target deadline string ('YYYY-MM-DD')
 * @param estimatedHours Estimated working hours needed
 * @param availableHours Optional available working hours (defaults to days * 8.0)
 * @param currentDate Optional reference date (Date or 'YYYY-MM-DD') for deterministic testing
 */
export function determineTaskStatus(
  isCompleted: boolean,
  deadlineStr: unknown,
  estimatedHours: unknown,
  availableHours?: unknown,
  currentDate?: Date | string | null
): RiskStatus {
  if (isCompleted) {
    return "COMPLETED";
  }

  const deadlineDate = parseDeadline(deadlineStr);
  if (deadlineDate === null) {
    return "INVALID";
  }

  // Normalize today to UTC midnight to match Python's calendar-date comparison
  let today: Date;
  if (currentDate instanceof Date) {
    today = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
      )
    );
  } else if (typeof currentDate === "string") {
    const parsed = parseDeadline(currentDate);
    if (parsed) {
      today = parsed;
    } else {
      const now = new Date();
      today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }
  } else {
    const now = new Date();
    today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  if (deadlineDate.getTime() < today.getTime()) {
    return "OVERDUE";
  }

  let effAvail: unknown = availableHours;
  if (effAvail === undefined || effAvail === null) {
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.max(
      0,
      Math.floor(diffTime / (1000 * 60 * 60 * 24))
    );
    effAvail = diffDays * 8.0;
  }

  return calculateTaskRisk(estimatedHours, effAvail);
}

/**
 * Returns a human-readable explanation for the given risk or status code.
 */
export function getRiskExplanation(status: string): string {
  const explanations: Record<string, string> = {
    COMPLETED: "Task is completed. No remaining work or risk.",
    OVERDUE:
      "Deadline has passed and the task is incomplete. Immediate attention required.",
    HIGH: "High risk: Available working hours are less than estimated hours needed.",
    MEDIUM:
      "Medium risk: Available hours cover the work, but with less than a 20% time buffer.",
    LOW: "Low risk: Sufficient time available with at least a 20% working-time buffer.",
    INVALID:
      "Invalid input: Requires a valid deadline (YYYY-MM-DD) and non-negative numbers.",
  };

  return explanations[status] ?? "Status explanation unavailable.";
}
