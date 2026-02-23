import { generateText } from "ai";
import { GENERATE_PROMPT_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const { spec } = await req.json();

  if (!spec) {
    return Response.json({ error: "spec is required" }, { status: 400 });
  }

  const { text } = await generateText({
    model: getModel(apiKey),
    system: GENERATE_PROMPT_SYSTEM,
    prompt: `Generate a production-ready system prompt for this spec:\n${JSON.stringify(spec, null, 2)}`,
  });

  return Response.json({ prompt: text });
}
