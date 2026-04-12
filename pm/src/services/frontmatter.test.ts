import { describe, expect, test } from "bun:test";
import {
	parseFrontmatter,
	replaceFrontmatterFields,
	serializeFrontmatterValue,
} from "./frontmatter.ts";

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

	test("unescapes quoted array entries with backslashes", () => {
		const value = String.raw`domain\owner`;
		const content = `---\nblockedBy: [${serializeFrontmatterValue(value)}]\n---`;

		expect(parseFrontmatter(content)).toMatchObject({
			blockedBy: [value],
		});
	});

	test("unescapes quoted array entries with double quotes", () => {
		const value = `won't fix: "duplicate"`;
		const content = `---\nblockedBy: [${serializeFrontmatterValue(value)}]\n---`;

		expect(parseFrontmatter(content)).toMatchObject({
			blockedBy: [value],
		});
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

describe("serializeFrontmatterValue", () => {
	test("formats blockedBy arrays with brackets", () => {
		expect(serializeFrontmatterValue(["TASK-001", "TASK-002"])).toBe("[TASK-001, TASK-002]");
	});

	test("rejects strings containing newlines", () => {
		expect(() => serializeFrontmatterValue("closed\nbecause duplicate")).toThrow(
			/newlines are not supported/i,
		);
	});

	test("quotes strings with YAML-significant characters", () => {
		expect(serializeFrontmatterValue("blocked: waiting #api")).toBe('"blocked: waiting #api"');
	});

	test("quotes bracket-containing strings so they stay strings", () => {
		expect(serializeFrontmatterValue("[foo]")).toBe('"[foo]"');
		expect(
			parseFrontmatter(`---\nlabel: ${serializeFrontmatterValue("[foo]")}\n---`),
		).toMatchObject({
			label: "[foo]",
		});
	});

	test("round-trips escaped double quotes back to plain quotes", () => {
		const reason = `won't fix: "duplicate"`;
		expect(
			parseFrontmatter(`---\nreason: ${serializeFrontmatterValue(reason)}\n---`),
		).toMatchObject({
			reason,
		});
	});

	test("round-trips escaped backslashes back to single backslashes", () => {
		const assignee = String.raw`domain\owner`;
		expect(
			parseFrontmatter(`---\nassignee: ${serializeFrontmatterValue(assignee)}\n---`),
		).toMatchObject({
			assignee,
		});
	});
});

describe("replaceFrontmatterFields", () => {
	test("replaces multiple existing frontmatter fields and leaves body intact", () => {
		const content =
			"---\nid: STORY-001\ntitle: Old\nstatus: backlog\nblockedBy: []\n---\n## Notes\nKeep me\n";

		expect(
			replaceFrontmatterFields(content, {
				title: "New title",
				status: "review",
				blockedBy: ["TASK-001"],
			}),
		).toBe(
			"---\nid: STORY-001\ntitle: New title\nstatus: review\nblockedBy: [TASK-001]\n---\n## Notes\nKeep me\n",
		);
	});

	test("throws when a requested field does not exist in frontmatter", () => {
		const content = "---\nid: STORY-001\ntitle: Old\n---\nBody\n";
		expect(() => replaceFrontmatterFields(content, { status: "review" })).toThrow();
	});

	test("preserves CRLF line endings when replacing fields", () => {
		const content = "---\r\nid: STORY-001\r\ntitle: Old\r\nstatus: backlog\r\n---\r\nBody\r\n";

		expect(
			replaceFrontmatterFields(content, {
				title: "New title",
				status: "review",
			}),
		).toBe("---\r\nid: STORY-001\r\ntitle: New title\r\nstatus: review\r\n---\r\nBody\r\n");
	});

	test("preserves literal $ sequences in replacement values", () => {
		const content = "---\nid: STORY-001\ntitle: Old\n---\nBody\n";

		expect(
			replaceFrontmatterFields(content, {
				title: "Fix $1 env issue",
			}),
		).toBe("---\nid: STORY-001\ntitle: Fix $1 env issue\n---\nBody\n");
	});

	test("replaces an empty field without consuming the next line", () => {
		const content = "---\nid: STORY-001\nepic: \nlayer: backend\n---\nBody\n";

		expect(
			replaceFrontmatterFields(content, {
				epic: "EPIC-002",
				layer: "frontend",
			}),
		).toBe("---\nid: STORY-001\nepic: EPIC-002\nlayer: frontend\n---\nBody\n");
	});
});
