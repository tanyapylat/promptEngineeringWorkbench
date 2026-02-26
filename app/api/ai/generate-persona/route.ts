import { generateText } from 'ai';
import { GENERATE_PERSONA_SYSTEM } from '@/lib/prompts';
import { getModel } from '@/lib/ai';

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key') || undefined;
  const { spec } = await req.json();

  if (!spec) {
    return Response.json({ error: 'spec is required' }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: getModel(apiKey),
      system: GENERATE_PERSONA_SYSTEM,
      prompt: `Generate a synthetic expert persona for evaluating outputs produced by this spec:\n${JSON.stringify(spec, null, 2)}`,
    });
    return Response.json({ persona: text });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate persona';
    return Response.json({ error: message }, { status: 400 });
  }
}
