import { generateText, Output } from "ai";
import { z } from "zod";
import { GENERATE_EVALS_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const { spec } = await req.json();

  if (!spec) {
    return Response.json({ error: "spec is required" }, { status: 400 });
  }

  try {
    const { output } = await generateText({
      model: getModel(apiKey),
      system: GENERATE_EVALS_SYSTEM,
      prompt: `Generate evaluation definitions for this spec:\n${JSON.stringify(spec, null, 2)}`,
      output: Output.object({
        schema: z.object({
          evals: z.array(
            z.object({
              name: z.string(),
              description: z.string(),
              scoreMode: z.enum(["pass_fail", "scale_1_5"]),
              judgeInstruction: z.string(),
            }),
          ),
        }),
      }),
    });

    return Response.json({ evals: output?.evals ?? [] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate evals";
    return Response.json({ error: message }, { status: 400 });
  }
}
