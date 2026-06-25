import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { emailThread } = body;

    if (!emailThread) return NextResponse.json({ error: 'Thread required' }, { status: 400 });

    let cleanText = emailThread;
    cleanText = cleanText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleanText = cleanText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanText = cleanText.replace(/&[a-z]+;/gi, ' ');
    cleanText = cleanText.replace(/<[^>]+>/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

    const prompt = `
    Analyze the email thread below.
    Persona: Expert Technical Project Manager.
    Goal: Create a professional summary.
    
    RULES:
    1. If the thread is NOT project-related, reply ONLY with: "Insufficient information."
    2. IGNORE meeting links, forwarding headers, and signatures.
    3. Output EXACTLY 3 bullet points:
       - Status ( make this text bold ): [Progress/Milestones]
       - Requirements ( make this text bold ): [Specs/Tech details]
       - Action Items ( make this text bold ): [Who does what]

    EMAIL THREAD:
    ${cleanText}
    `;

    const targetUrl = process.env.OLLAMA_INTERNAL_URL || 'http://erpq-ollama:11434';
    
    const response = await fetch(`${targetUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:1b',
        prompt: prompt,
        stream: true, 
        keep_alive: '24h',
        options: {
          num_ctx: 4096,
          num_predict: 150,
          num_thread: 2,
          temperature: 0.1 
        }
      })
    });

    if (!response.ok) throw new Error(`Ollama status: ${response.status}`);

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}