
import {NextRequest} from 'next/server';
import {OpenAIStream, StreamingTextResponse} from 'ai';

export const runtime = 'edge';

// A HEAD request is sent by the frontend to check if the API key is configured.
export async function HEAD(req: NextRequest) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        return new Response('Perplexity API key not configured', { status: 400 });
    }
    return new Response(null, { status: 200 });
}


export async function POST(req: NextRequest) {
  const { messages, model, temperature, max_tokens } = await req.json();

  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return new Response('Perplexity API key not configured', { status: 400 });
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: true, 
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Perplexity API Error: ${errorText}`);
    return new Response(`Error from Perplexity API: ${errorText}`, { status: response.status });
  }
  
  // The `ai` library's OpenAIStream function can handle the Perplexity stream format.
  const stream = OpenAIStream(response);

  return new StreamingTextResponse(stream);
}
