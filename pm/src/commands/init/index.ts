import { output } from "../../cli/output.ts";
import { GlobalOptsSchema } from "../../schemas/options.ts";
import { ScaffoldService } from "../../services/scaffold.ts";

export async function run(rawOpts: Record<string, unknown>): Promise<void> {
	const opts = GlobalOptsSchema.parse(rawOpts);
	const result = await ScaffoldService.init(opts);
	output(result, opts);
}
