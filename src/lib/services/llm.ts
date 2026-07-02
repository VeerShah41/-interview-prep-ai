import Groq from 'groq-sdk';

let _groq: Groq | null = null;

function getGroq(customApiKey?: string): Groq {
  if (customApiKey) {
    return new Groq({ apiKey: customApiKey });
  }
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return _groq;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
] as const;

export async function generateResponse(
  messages: LLMMessage[],
  modelIndex = 0,
  customApiKey?: string
): Promise<LLMResponse> {
  const model = MODELS[modelIndex] || MODELS[0];

  try {
    const completion = await getGroq(customApiKey).chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 300,
      top_p: 0.9,
    });

    const content = completion.choices[0]?.message?.content || '';
    return {
      content,
      model,
      tokensUsed: completion.usage?.total_tokens || 0,
    };
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    // Rate limit or server error - try fallback model
    if ((err.status === 429 || err.status === 503) && modelIndex < MODELS.length - 1) {
      console.warn(`Model ${model} rate limited, falling back to ${MODELS[modelIndex + 1]}`);
      return generateResponse(messages, modelIndex + 1);
    }
    throw error;
  }
}

export async function generateFeedback(
  messages: LLMMessage[],
  customApiKey?: string
): Promise<LLMResponse> {
  try {
    const completion = await getGroq(customApiKey).chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.4,
      max_tokens: 1500,
      top_p: 0.9,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return {
      content,
      model: 'llama-3.3-70b-versatile',
      tokensUsed: completion.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('Feedback generation error:', error);
    throw error;
  }
}
