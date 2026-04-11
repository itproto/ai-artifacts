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
				inner === ""
					? []
					: inner.split(",").map((s) => {
							const entry = s.trim();
							if (entry.startsWith('"') && entry.endsWith('"')) {
								return entry.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
							}
							return entry.replace(/^["']|["']$/g, "");
						});
		} else {
			// Strip inline YAML comments from unquoted values
			let value = raw;
			if (!value.startsWith('"') && !value.startsWith("'")) {
				value = value.startsWith("#") ? "" : value.replace(/\s+#\s.*$/, "");
			}
			if (value.startsWith('"') && value.endsWith('"')) {
				result[key] = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
			} else {
				result[key] = value.replace(/^["']|["']$/g, "");
			}
		}
	}
	return result;
}

function yamlValue(v: string): string {
	if (/[\r\n]/.test(v)) {
		throw new Error("Frontmatter values containing newlines are not supported");
	}
	if (v === "") return v;
	if (/[:#,&*?|<>=!%@`'"\\[\]{}]/.test(v) || /^\s|\s$/.test(v)) {
		return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	}
	return v;
}

export function serializeFrontmatterValue(value: string | string[]): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => yamlValue(entry)).join(", ")}]`;
	}
	return yamlValue(value);
}

export function replaceFrontmatterFields(
	content: string,
	updates: Record<string, string | string[]>,
): string {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match || match.index == null) {
		throw new Error("No frontmatter found");
	}

	const lineEnding = match[0].includes("\r\n") ? "\r\n" : "\n";
	let frontmatter = match[1];
	for (const [key, value] of Object.entries(updates)) {
		const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const linePattern = new RegExp(`^(${escapedKey}:[ \\t]*).*$`, "m");
		if (!linePattern.test(frontmatter)) {
			throw new Error(`Missing frontmatter field: ${key}`);
		}
		frontmatter = frontmatter.replace(linePattern, (_match, prefix: string) => {
			return `${prefix}${serializeFrontmatterValue(value)}`;
		});
	}

	const updatedBlock = `---${lineEnding}${frontmatter}${lineEnding}---`;
	return (
		content.slice(0, match.index) + updatedBlock + content.slice(match.index + match[0].length)
	);
}
