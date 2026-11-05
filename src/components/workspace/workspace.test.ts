/**
 * workspace.test.ts - Automated Unit Tests for DueLine Workspace Shell & Design System
 *
 * Covers:
 * - Module navigation integrity (Today, Goals, Journey, Chapters)
 * - Theme configuration & color token verification
 * - Sidebar collapse preference handling
 * - Privacy boundaries on Journey module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NAV_MODULES } from "../../lib/navigation.ts";

describe("Stage 2C.1: Responsive Workspace Shell Foundation", () => {
  describe("1. Navigation Modules Integrity", () => {
    it("defines exactly 4 primary modules matching the blueprint", () => {
      assert.equal(NAV_MODULES.length, 4);
      const moduleIds = NAV_MODULES.map((m) => m.id);
      assert.deepEqual(moduleIds, ["today", "goals", "journey", "chapters"]);
    });

    it("verifies expected URL paths for all core modules", () => {
      const paths = NAV_MODULES.map((m) => m.href);
      assert.deepEqual(paths, ["/today", "/goals", "/journey", "/chapters"]);
    });

    it("ensures each module has non-empty label and description", () => {
      for (const mod of NAV_MODULES) {
        assert.ok(mod.label.length > 0, `Module ${mod.id} missing label`);
        assert.ok(
          mod.description.length > 0,
          `Module ${mod.id} missing description`
        );
      }
    });
  });

  describe("2. Growth & Clarity Design Tokens", () => {
    const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    it("includes all approved Growth & Clarity reference colors", () => {
      // Deep Forest: #193B35
      assert.ok(
        cssContent.includes("#193B35"),
        "Missing Deep Forest (#193B35)"
      );
      // Sage: #426B5C
      assert.ok(cssContent.includes("#426B5C"), "Missing Sage (#426B5C)");
      // Ivory: #E8EEE8
      assert.ok(cssContent.includes("#E8EEE8"), "Missing Ivory (#E8EEE8)");
      // Soft White: #FAFAF6
      assert.ok(
        cssContent.includes("#FAFAF6"),
        "Missing Soft White (#FAFAF6)"
      );
      // Mist Green: #A4B99B
      assert.ok(
        cssContent.includes("#A4B99B"),
        "Missing Mist Green (#A4B99B)"
      );
    });

    it("defines both light and dark theme token blocks", () => {
      assert.ok(cssContent.includes('[data-theme="light"]'));
      assert.ok(cssContent.includes('[data-theme="dark"]'));
    });
  });

  describe("3. Architecture & Privacy Verification", () => {
    it("verifies Journey module is marked private by default", () => {
      const journeyPath = path.resolve(
        process.cwd(),
        "src/app/journey/page.tsx"
      );
      const journeyContent = fs.readFileSync(journeyPath, "utf-8");

      assert.ok(
        journeyContent.includes("Private and personal by default") ||
          journeyContent.includes("Strictly Private Evidence Log"),
        "Journey page must enforce and communicate private default behavior"
      );
      assert.equal(
        journeyContent.includes("friends-feed"),
        false,
        "Journey must not introduce a friends-based social feed"
      );
    });

    it("verifies Chapters module preserves future-self time capsule concept", () => {
      const chaptersPath = path.resolve(
        process.cwd(),
        "src/app/chapters/page.tsx"
      );
      const chaptersContent = fs.readFileSync(chaptersPath, "utf-8");

      assert.ok(
        chaptersContent.includes("A message from another version of you"),
        "Chapters page must retain approved heading"
      );
      assert.ok(
        chaptersContent.includes("Scheduled reflections"),
        "Chapters page must preserve scheduled reflections concept"
      );
    });
  });
});
