import { generateText, Output } from "ai";
import { z } from "zod";
import { LABEL_RESULTS_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const { labelPrompt, results } = await req.json();

  if (
    !labelPrompt ||
    !results ||
    !Array.isArray(results) ||
    results.length === 0
  ) {
    return Response.json(
      { error: "labelPrompt and a non-empty results array are required" },
      { status: 400 },
    );
  }

  const prompt = [
    "## Labeling Instruction",
    labelPrompt,
    "\n## Results to Label",
    JSON.stringify(
      results.map(
        (r: {
          id: string;
          input: unknown;
          output: string;
          evalScores: unknown[];
        }) => ({
          resultId: r.id,
          input: r.input,
          output: r.output,
          evalScores: r.evalScores,
        }),
      ),
      null,
      2,
    ),
  ].join("\n");

  const { output } = await generateText({
    model: getModel(apiKey),
    system: LABEL_RESULTS_SYSTEM,
    prompt,
    output: Output.object({
      schema: z.object({
        labeledResults: z.array(
          z.object({
            resultId: z.string(),
            labels: z.array(z.string()),
          }),
        ),
      }),
    }),
  });

  return Response.json({ labeledResults: output?.labeledResults ?? [] });
}
