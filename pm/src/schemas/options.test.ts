import { describe, expect, test } from "bun:test";
import { GlobalOptsSchema } from "./options.ts";

describe("GlobalOptsSchema", () => {
	test("applies defaults when given empty object", () => {
		const result = GlobalOptsSchema.parse({});
		expect(result.json).toBe(false);
		expect(result.dryRun).toBe(false);
		expect(typeof result.cwd).toBe("string");
		expect(result.cwd.length).toBeGreaterThan(0);
	});

	test("parses valid options", () => {
		const result = GlobalOptsSchema.parse({
			json: true,
			dryRun: true,
			cwd: "/tmp/project",
		});
		expect(result.json).toBe(true);
		expect(result.dryRun).toBe(true);
		expect(result.cwd).toBe("/tmp/project");
	});

	test("throws ZodError on invalid types", () => {
		expect(() => GlobalOptsSchema.parse({ json: "yes" })).toThrow();
	});
});
