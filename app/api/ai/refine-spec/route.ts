import { generateText, Output } from "ai";
import { z } from "zod";
import { REFINE_SPEC_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const { freeformText } = await req.json();

  if (!freeformText || typeof freeformText !== "string") {
    return Response.json(
      { error: "freeformText is required" },
      { status: 400 },
    );
  }

  try {
    const { output } = await generateText({
      model: getModel(apiKey),
    system: REFINE_SPEC_SYSTEM,
    prompt: freeformText,
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
      }),
    }),
    });

    return Response.json({ spec: output });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to refine spec";
    return Response.json({ error: message }, { status: 400 });
  }
}
