import { marketAgent } from '@/agent/market-agent';
import { createAgentUIStreamResponse } from 'ai';

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: marketAgent,
    uiMessages: messages,
  });
}