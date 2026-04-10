import Fuse from "fuse.js";
import type { BoardItem } from "./board.ts";

const SCORE_THRESHOLD = 0.4;

export type SearchResult = {
	item: BoardItem;
	score: number;
};

export function fuzzySearch(items: BoardItem[], query: string): SearchResult[] {
	const fuse = new Fuse(items, {
		keys: ["id", "title"],
		includeScore: true,
		threshold: SCORE_THRESHOLD,
	});
	return fuse.search(query).map((r) => ({ item: r.item, score: r.score ?? 1 }));
}

export function isExactId(arg: string): boolean {
	return /^(STORY|TASK|EPIC)-\d+$/i.test(arg);
}
