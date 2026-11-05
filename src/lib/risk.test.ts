
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseDeadline,
  calculateTaskRisk,
  determineTaskStatus,
  getRiskExplanation,
  type RiskStatus,
} from "./risk.ts";

/**
 * Format a Date object to YYYY-MM-DD in UTC
 */
function toUTCISODate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

describe("DueLine Risk Engine (TypeScript Port of legacy_flask/risk.py)", () => {
  // =========================================================================
  // SUITE 1: 100% Python Fixture Parity Verification
  // =========================================================================
  describe("Suite 1: Shared Python Fixture Parity (84 Cases from legacy_flask/risk.py)", () => {
    const fixturesPath = path.resolve(
      process.cwd(),
      "src/lib/fixtures_parity.json"
    );
    const fixturesRaw = fs.readFileSync(fixturesPath, "utf-8");
    const fixtures = JSON.parse(fixturesRaw);

    it("should load exactly 84 fixtures from Python risk engine generation", () => {
      assert.strictEqual(
        fixtures.length,
        84,
        "Expected exactly 84 test fixtures"
      );
    });

    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      if (f.type === "parse_deadline") {
        it(`Fixture #${i + 1} [parse_deadline]: input=${JSON.stringify(f.input)} -> ${f.expected_str}`, () => {
          const res = parseDeadline(f.input);
          const formatted = toUTCISODate(res);
          assert.strictEqual(
            formatted,
            f.expected_str,
            `parseDeadline(${JSON.stringify(f.input)}) produced ${formatted}, expected ${f.expected_str}`
          );
        });
      } else if (f.type === "calculate_task_risk") {
        it(`Fixture #${i + 1} [calculate_task_risk]: est=${f.estimated_hours}, avail=${f.available_hours} -> ${f.expected}`, () => {
          const res = calculateTaskRisk(f.estimated_hours, f.available_hours);
          assert.strictEqual(
            res,
            f.expected,
            `calculateTaskRisk(${f.estimated_hours}, ${f.available_hours}) produced ${res}, expected ${f.expected}`
          );
        });
      } else if (f.type === "determine_task_status") {
        it(`Fixture #${i + 1} [determine_task_status]: completed=${f.is_completed}, dl=${f.deadline_str}, est=${f.estimated_hours}, avail=${f.available_hours}, cur=${f.current_date} -> ${f.expected}`, () => {
          const res = determineTaskStatus(
            f.is_completed,
            f.deadline_str,
            f.estimated_hours,
            f.available_hours,
            f.current_date
          );
          assert.strictEqual(
            res,
            f.expected,
            `determineTaskStatus produced ${res}, expected ${f.expected}`
          );
        });
      } else if (f.type === "get_risk_explanation") {
        it(`Fixture #${i + 1} [get_risk_explanation]: status=${f.status} -> ${f.expected}`, () => {
          const res = getRiskExplanation(f.status);
          assert.strictEqual(
            res,
            f.expected,
            `getRiskExplanation(${f.status}) produced "${res}", expected "${f.expected}"`
          );
        });
      }
    }
  });

  // =========================================================================
  // SUITE 2: Strict Calendar and Date Validation
  // =========================================================================
  describe("Suite 2: Strict Calendar and Date Bounds Validation", () => {
    describe("Leap Year Rules", () => {
      it("accepts Feb 29 on leap year divisible by 4 (2024, 2028)", () => {
        const d2024 = parseDeadline("2024-02-29");
        assert.ok(d2024);
        assert.strictEqual(toUTCISODate(d2024), "2024-02-29");

        const d2028 = parseDeadline("2028-02-29");
        assert.ok(d2028);
        assert.strictEqual(toUTCISODate(d2028), "2028-02-29");
      });

      it("accepts Feb 29 on century leap year divisible by 400 (2000, 2400)", () => {
        const d2000 = parseDeadline("2000-02-29");
        assert.ok(d2000);
        assert.strictEqual(toUTCISODate(d2000), "2000-02-29");

        const d2400 = parseDeadline("2400-02-29");
        assert.ok(d2400);
        assert.strictEqual(toUTCISODate(d2400), "2400-02-29");
      });

      it("rejects Feb 29 on century years divisible by 100 but not 400 (1900, 2100)", () => {
        assert.strictEqual(parseDeadline("1900-02-29"), null);
        assert.strictEqual(parseDeadline("2100-02-29"), null);
      });

      it("rejects Feb 29 on standard non-leap years (2025, 2026, 2027)", () => {
        assert.strictEqual(parseDeadline("2025-02-29"), null);
        assert.strictEqual(parseDeadline("2026-02-29"), null);
        assert.strictEqual(parseDeadline("2027-02-29"), null);
      });
    });

    describe("Calendar Days per Month Bounds", () => {
      it("rejects day 31 in 30-day months (Apr, Jun, Sep, Nov)", () => {
        assert.strictEqual(parseDeadline("2026-04-31"), null);
        assert.strictEqual(parseDeadline("2026-06-31"), null);
        assert.strictEqual(parseDeadline("2026-09-31"), null);
        assert.strictEqual(parseDeadline("2026-11-31"), null);
      });

      it("accepts day 30 in 30-day months", () => {
        assert.strictEqual(toUTCISODate(parseDeadline("2026-04-30")), "2026-04-30");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-06-30")), "2026-06-30");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-09-30")), "2026-09-30");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-11-30")), "2026-11-30");
      });

      it("accepts day 31 in 31-day months (Jan, Mar, May, Jul, Aug, Oct, Dec)", () => {
        assert.strictEqual(toUTCISODate(parseDeadline("2026-01-31")), "2026-01-31");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-03-31")), "2026-03-31");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-05-31")), "2026-05-31");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-07-31")), "2026-07-31");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-08-31")), "2026-08-31");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-10-31")), "2026-10-31");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-12-31")), "2026-12-31");
      });

      it("rejects day 32 or greater in any month", () => {
        assert.strictEqual(parseDeadline("2026-01-32"), null);
        assert.strictEqual(parseDeadline("2026-12-32"), null);
        assert.strictEqual(parseDeadline("2026-07-99"), null);
      });

      it("rejects day 0 in any month", () => {
        assert.strictEqual(parseDeadline("2026-01-00"), null);
        assert.strictEqual(parseDeadline("2026-06-00"), null);
      });

      it("rejects month 0 or month > 12", () => {
        assert.strictEqual(parseDeadline("2026-00-15"), null);
        assert.strictEqual(parseDeadline("2026-13-01"), null);
        assert.strictEqual(parseDeadline("2026-99-01"), null);
      });
    });

    describe("Malformed and Invalid Format Inputs", () => {
      it("rejects alternative delimiters and date formats", () => {
        assert.strictEqual(parseDeadline("2026/11/04"), null);
        assert.strictEqual(parseDeadline("11-04-2026"), null);
        assert.strictEqual(parseDeadline("04-11-2026"), null);
        assert.strictEqual(parseDeadline("2026.11.04"), null);
      });

      it("accepts single digit months and days like Python strptime %Y-%m-%d", () => {
        assert.strictEqual(toUTCISODate(parseDeadline("2026-1-4")), "2026-01-04");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-01-4")), "2026-01-04");
        assert.strictEqual(toUTCISODate(parseDeadline("2026-1-04")), "2026-01-04");
      });

      it("rejects timestamps and ISO-8601 strings with time components", () => {
        assert.strictEqual(parseDeadline("2026-11-04T00:00:00Z"), null);
        assert.strictEqual(parseDeadline("2026-11-04 12:00:00"), null);
      });

      it("rejects non-string and empty inputs", () => {
        assert.strictEqual(parseDeadline(""), null);
        assert.strictEqual(parseDeadline("   "), null);
        assert.strictEqual(parseDeadline(null), null);
        assert.strictEqual(parseDeadline(undefined), null);
        assert.strictEqual(parseDeadline(12345), null);
        assert.strictEqual(parseDeadline(true), null);
        assert.strictEqual(parseDeadline({}), null);
        assert.strictEqual(parseDeadline([]), null);
      });
    });
  });

  // =========================================================================
  // SUITE 3: Precedence Hierarchy & Edge Cases
  // =========================================================================
  describe("Suite 3: Precedence Hierarchy Enforcement", () => {
    it("Rule 1 (COMPLETED) has highest precedence over all other conditions", () => {
      // Completed takes priority over overdue
      assert.strictEqual(
        determineTaskStatus(true, "2020-01-01", 10, 0, "2026-11-04"),
        "COMPLETED"
      );
      // Completed takes priority over invalid date
      assert.strictEqual(
        determineTaskStatus(true, "not-a-date", 10, 5, "2026-11-04"),
        "COMPLETED"
      );
      // Completed takes priority over negative hours
      assert.strictEqual(
        determineTaskStatus(true, "2026-11-10", -5, -2, "2026-11-04"),
        "COMPLETED"
      );
      // Completed takes priority over null deadline
      assert.strictEqual(
        determineTaskStatus(true, null, 10, 20, "2026-11-04"),
        "COMPLETED"
      );
    });

    it("Rule 2 (INVALID date) has precedence over overdue and workload", () => {
      // Invalid date returns INVALID even with negative hours or zero hours
      assert.strictEqual(
        determineTaskStatus(false, "invalid-date", 0, 0, "2026-11-04"),
        "INVALID"
      );
      assert.strictEqual(
        determineTaskStatus(false, "", 10, 20, "2026-11-04"),
        "INVALID"
      );
      assert.strictEqual(
        determineTaskStatus(false, null, 10, 20, "2026-11-04"),
        "INVALID"
      );
    });

    it("Rule 3 (OVERDUE) has precedence over workload calculations", () => {
      // Past deadline returns OVERDUE even if estimated hours is 0
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-01", 0, 100, "2026-11-04"),
        "OVERDUE"
      );
      // Past deadline returns OVERDUE even if available hours is abundant
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-03", 5, 50, "2026-11-04"),
        "OVERDUE"
      );
    });

    it("Rule 4 (Workload): calculates HIGH, MEDIUM, LOW or INVALID", () => {
      // Negative hours
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-10", -1, 10, "2026-11-04"),
        "INVALID"
      );
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-10", 10, -5, "2026-11-04"),
        "INVALID"
      );

      // Estimated = 0 -> LOW
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-10", 0, 0, "2026-11-04"),
        "LOW"
      );

      // Available < Estimated -> HIGH
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-10", 10, 5, "2026-11-04"),
        "HIGH"
      );

      // Available < 1.2 * Estimated -> MEDIUM
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-10", 10, 11, "2026-11-04"),
        "MEDIUM"
      );

      // Available >= 1.2 * Estimated -> LOW
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-10", 10, 15, "2026-11-04"),
        "LOW"
      );
    });
  });

  // =========================================================================
  // SUITE 4: Boundary & Numerical Precision (Threshold 1.2)
  // =========================================================================
  describe("Suite 4: Exact Workload Boundaries & Floating-Point Precision", () => {
    it("exact 1.0 threshold: avail === est is MEDIUM", () => {
      // 10 estimated, 10 available -> MEDIUM (fits, but buffer is 0% < 20%)
      assert.strictEqual(calculateTaskRisk(10, 10), "MEDIUM");
    });

    it("just below 1.0 threshold: avail < est is HIGH", () => {
      assert.strictEqual(calculateTaskRisk(10, 9.999), "HIGH");
    });

    it("exact 1.2 threshold: avail === 1.2 * est is LOW", () => {
      // 10 estimated, 12 available -> 12 >= 1.2 * 10 is LOW
      assert.strictEqual(calculateTaskRisk(10, 12.0), "LOW");
      assert.strictEqual(calculateTaskRisk(5, 6.0), "LOW");
      assert.strictEqual(calculateTaskRisk(100, 120.0), "LOW");
    });

    it("just below 1.2 threshold: avail < 1.2 * est is MEDIUM", () => {
      assert.strictEqual(calculateTaskRisk(10, 11.999), "MEDIUM");
      assert.strictEqual(calculateTaskRisk(5, 5.999), "MEDIUM");
      assert.strictEqual(calculateTaskRisk(100, 119.999), "MEDIUM");
    });

    it("handles string representations of numbers gracefully", () => {
      assert.strictEqual(calculateTaskRisk("10", "12"), "LOW");
      assert.strictEqual(calculateTaskRisk("10", "11"), "MEDIUM");
      assert.strictEqual(calculateTaskRisk("10", "8"), "HIGH");
      assert.strictEqual(calculateTaskRisk("0", "0"), "LOW");
    });

    it("rejects non-numeric strings, empty strings, and booleans", () => {
      assert.strictEqual(calculateTaskRisk("abc", 10), "INVALID");
      assert.strictEqual(calculateTaskRisk(10, "xyz"), "INVALID");
      assert.strictEqual(calculateTaskRisk("", 10), "INVALID");
      assert.strictEqual(calculateTaskRisk(10, ""), "INVALID");
      assert.strictEqual(calculateTaskRisk(true, 10), "INVALID");
      assert.strictEqual(calculateTaskRisk(10, false), "INVALID");
      assert.strictEqual(calculateTaskRisk(null, 10), "INVALID");
      assert.strictEqual(calculateTaskRisk(10, undefined), "INVALID");
    });
  });

  // =========================================================================
  // SUITE 5: Same-Day Deadline & Working Days Fallback (8.0 Hours/Day)
  // =========================================================================
  describe("Suite 5: Fallback Working Hours Calculation (8 hrs/day)", () => {
    it("same-day deadline (today == deadline): 0 days remaining -> 0.0 fallback hours", () => {
      // If estimated > 0 and avail falls back to 0 -> HIGH
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-04", 5, null, "2026-11-04"),
        "HIGH"
      );
      // If estimated == 0 and avail falls back to 0 -> LOW
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-04", 0, null, "2026-11-04"),
        "LOW"
      );
    });

    it("1 day remaining: 8.0 fallback hours", () => {
      // 1 day * 8 hrs = 8 hrs available
      // 5 estimated, 8 available -> 8 >= 1.2 * 5 (6.0) -> LOW
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-05", 5, null, "2026-11-04"),
        "LOW"
      );
      // 7 estimated, 8 available -> 8 < 1.2 * 7 (8.4) -> MEDIUM
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-05", 7, null, "2026-11-04"),
        "MEDIUM"
      );
      // 10 estimated, 8 available -> 8 < 10 -> HIGH
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-05", 10, null, "2026-11-04"),
        "HIGH"
      );
    });

    it("5 days remaining: 40.0 fallback hours", () => {
      // 5 days * 8 hrs = 40 hrs available
      // 30 estimated, 40 available -> 40 >= 36 -> LOW
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-09", 30, null, "2026-11-04"),
        "LOW"
      );
      // 35 estimated, 40 available -> 40 < 42 -> MEDIUM
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-09", 35, null, "2026-11-04"),
        "MEDIUM"
      );
      // 45 estimated, 40 available -> 40 < 45 -> HIGH
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-09", 45, null, "2026-11-04"),
        "HIGH"
      );
    });

    it("explicit availableHours overrides fallback calculation", () => {
      // 1 day remaining would default to 8 hrs, but explicit 20 hrs makes it LOW
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-05", 10, 20, "2026-11-04"),
        "LOW"
      );
      // 5 days remaining would default to 40 hrs, but explicit 2 hrs makes it HIGH
      assert.strictEqual(
        determineTaskStatus(false, "2026-11-09", 10, 2, "2026-11-04"),
        "HIGH"
      );
    });
  });

  // =========================================================================
  // SUITE 6: Human-Readable Explanations
  // =========================================================================
  describe("Suite 6: Status Explanations", () => {
    const statuses: RiskStatus[] = [
      "COMPLETED",
      "OVERDUE",
      "HIGH",
      "MEDIUM",
      "LOW",
      "INVALID",
    ];

    it("returns meaningful non-empty explanations for all valid statuses", () => {
      for (const s of statuses) {
        const text = getRiskExplanation(s);
        assert.ok(text.length > 10, `Explanation for ${s} was too short`);
        assert.doesNotMatch(text, /unavailable/i);
      }
    });

    it("returns graceful fallback for invalid or empty statuses", () => {
      assert.strictEqual(
        getRiskExplanation("NON_EXISTENT"),
        "Status explanation unavailable."
      );
      assert.strictEqual(
        getRiskExplanation(""),
        "Status explanation unavailable."
      );
    });
  });
});
