export function parseFrontmatter(content: string): Record<string, unknown> {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const result: Record<string, unknown> = {};
	for (const line of match[1].split(/\r?\n/)) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		const raw = line.slice(colonIdx + 1).trim();

		if (raw.startsWith("[") && raw.endsWith("]")) {
			const inner = raw.slice(1, -1).trim();
			result[key] =
				inner === "" ? [] : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
		} else {
			// Strip inline YAML comments from unquoted values
			let value = raw;
			if (!value.startsWith('"') && !value.startsWith("'")) {
				value = value.startsWith("#") ? "" : value.replace(/\s+#\s.*$/, "");
			}
			result[key] = value.replace(/^["']|["']$/g, "");
		}
	}
	return result;
}
