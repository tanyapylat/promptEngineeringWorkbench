import { generateText } from "ai";
import { GENERATE_DATASET_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

const CASES_RESPONSE_PREFIX =
  'Return only valid JSON with a single object containing a "cases" array. Each case has "input" (object) and optional "expectedOutput" (string). No markdown or explanation.\n\n';

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const {
    spec,
    count = 5,
    instructions = "",
    datasetLabels,
  } = await req.json();

  if (!spec) {
    return Response.json({ error: "spec is required" }, { status: 400 });
  }

  const labelContext =
    Array.isArray(datasetLabels) && datasetLabels.length > 0
      ? `\n\nExisting dataset labels to take into account (align or diversify with these): ${datasetLabels.join(", ")}`
      : "";

  const prompt = `${CASES_RESPONSE_PREFIX}Given this spec:\n${JSON.stringify(spec, null, 2)}\n\nGenerate ${count} diverse test cases.${labelContext}${instructions ? `\n\nAdditional instructions: ${instructions}` : ""}`;

  const { text } = await generateText({
    model: getModel(apiKey),
    system: GENERATE_DATASET_SYSTEM,
    prompt,
  });

  let cases: Array<{
    input: Record<string, unknown>;
    expectedOutput?: string | null;
  }> = [];
  try {
    const raw = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const parsed = JSON.parse(raw) as { cases?: unknown[] };
    if (Array.isArray(parsed.cases)) {
      cases = parsed.cases.map((c) => {
        const item = c as Record<string, unknown>;
        return {
          input:
            item.input &&
            typeof item.input === "object" &&
            !Array.isArray(item.input)
              ? (item.input as Record<string, unknown>)
              : {},
          expectedOutput:
            typeof item.expectedOutput === "string"
              ? item.expectedOutput
              : null,
        };
      });
    }
  } catch {
    return Response.json(
      { error: "Model did not return valid JSON" },
      { status: 502 },
    );
  }

  return Response.json({ cases });
}
