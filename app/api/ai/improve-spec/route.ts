import { generateText, Output } from "ai";
import { z } from "zod";
import { IMPROVE_SPEC_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const { spec, results } = await req.json();

  console.log("[improve-spec] payload:\n", JSON.stringify({ spec, results }, null, 2));

  if (!spec || !results) {
    return Response.json(
      { error: "spec and results are required" },
      { status: 400 },
    );
  }

  const prompt = [
    "## Current Spec",
    JSON.stringify(spec, null, 2),
    "\n## Run Results",
    JSON.stringify(results, null, 2),
  ].join("\n");

  try {
    const { output } = await generateText({
      model: getModel(apiKey),
    system: IMPROVE_SPEC_SYSTEM,
    prompt,
    output: Output.object({
      schema: z.object({
        task_description: z.string(),
        input_description: z.string(),
        output_description: z.string(),
        constraints: z.array(z.string()),
        examples: z.array(
          z.object({
            input: z.string(),
            output: z.string(),
          }),
        ),
        improvement_notes: z.string(),
      }),
    }),
    });

    return Response.json({ spec: output });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to improve spec";
    return Response.json({ error: message }, { status: 400 });
  }
}
