import { describe, expect, test } from "bun:test";
import { parseFrontmatter } from "./frontmatter.ts";

describe("parseFrontmatter", () => {
	test("parses string values", () => {
		const content = "---\nid: STORY-001\ntitle: My story\n---\nbody";
		expect(parseFrontmatter(content)).toMatchObject({ id: "STORY-001", title: "My story" });
	});

	test("strips surrounding quotes from string values", () => {
		const content = '---\nassignee: "@itproto"\n---';
		expect(parseFrontmatter(content)).toMatchObject({ assignee: "@itproto" });
	});

	test("parses empty array", () => {
		const content = "---\nblockedBy: []\n---";
		const result = parseFrontmatter(content);
		expect(result.blockedBy).toEqual([]);
	});

	test("parses non-empty array", () => {
		const content = "---\nblockedBy: [TASK-002, TASK-003]\n---";
		const result = parseFrontmatter(content);
		expect(result.blockedBy).toEqual(["TASK-002", "TASK-003"]);
	});

	test("parses numeric string as string", () => {
		const content = "---\npoints: 5\n---";
		expect(parseFrontmatter(content)).toMatchObject({ points: "5" });
	});

	test("returns empty object when no frontmatter", () => {
		expect(parseFrontmatter("just body text")).toEqual({});
	});

	test("handles missing value (empty after colon)", () => {
		const content = "---\nreason: \n---";
		expect(parseFrontmatter(content)).toMatchObject({ reason: "" });
	});

	test("handles CRLF line endings", () => {
		const content = "---\r\nid: STORY-001\r\ntitle: My story\r\n---\r\nbody";
		expect(parseFrontmatter(content)).toMatchObject({ id: "STORY-001", title: "My story" });
	});

	test("strips inline YAML comments from unquoted values", () => {
		const content = "---\nlayer: frontend  # frontend | backend | fullstack\n---";
		expect(parseFrontmatter(content)).toMatchObject({ layer: "frontend" });
	});

	test("treats a value that is only a comment as empty", () => {
		const content = "---\nreason:  # for closed: cancelled, deferred, duplicate, etc.\n---";
		expect(parseFrontmatter(content)).toMatchObject({ reason: "" });
	});

	test("does not strip # from quoted values", () => {
		const content = '---\ntag: "#important"\n---';
		expect(parseFrontmatter(content)).toMatchObject({ tag: "#important" });
	});
});
