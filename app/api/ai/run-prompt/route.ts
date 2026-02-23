import { generateText } from "ai";
import { RUN_PROMPT_SYSTEM } from "@/lib/prompts";
import { getModel } from "@/lib/ai";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || undefined;
  const { systemPrompt, input } = await req.json();

  if (!systemPrompt || !input) {
    return Response.json(
      { error: "systemPrompt and input are required" },
      { status: 400 },
    );
  }

  const { text } = await generateText({
    model: getModel(apiKey),
    system: `${RUN_PROMPT_SYSTEM}\n\n---\n\n${systemPrompt}`,
    prompt: typeof input === "string" ? input : JSON.stringify(input, null, 2),
  });

  return Response.json({ output: text });
}
