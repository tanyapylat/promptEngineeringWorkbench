import { createOpenAI } from "@ai-sdk/openai";

export function getModel(apiKey?: string, modelId: string = "gpt-4o") {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "No OpenAI API key provided. Please set your key in the app header.",
    );
  }
  const openai = createOpenAI({ apiKey: key });
  return openai(modelId);
}
