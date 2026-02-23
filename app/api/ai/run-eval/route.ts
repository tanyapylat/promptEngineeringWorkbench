import { generateText, Output } from "ai";
import { z } from "zod";
import { RUN_EVAL_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const { evalDefinition, input, expectedOutput, actualOutput } =
    await req.json();

  if (!evalDefinition || !actualOutput) {
    return Response.json(
      { error: "evalDefinition and actualOutput are required" },
      { status: 400 },
    );
  }

  const prompt = [
    `## Evaluation: ${evalDefinition.name}`,
    `Score mode: ${evalDefinition.scoreMode === "pass_fail" ? "Pass (1) or Fail (0)" : "Scale 1-5"}`,
    `\n### Judge Instructions\n${evalDefinition.judgeInstruction}`,
    `\n### Input\n${typeof input === "string" ? input : JSON.stringify(input, null, 2)}`,
    expectedOutput ? `\n### Expected Output\n${expectedOutput}` : "",
    `\n### Actual Output\n${actualOutput}`,
  ].join("\n");

  try {
    const { output } = await generateText({
      model: getModel(apiKey),
    system: RUN_EVAL_SYSTEM,
    prompt,
    output: Output.object({
      schema: z.object({
        score: z.number(),
        reason: z.string(),
      }),
    }),
    });

    return Response.json({
      score: output?.score ?? 0,
      reason: output?.reason ?? "No evaluation result",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Evaluation failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
