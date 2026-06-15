import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { emailThread, instructions, senderEmail, recipientEmail } = body;

    // 🚀 FIX: Allow either an email thread OR manual instructions
    if (!emailThread && !instructions) {
      return NextResponse.json({ error: 'Email thread or instructions are required' }, { status: 400 });
    }

    // Deep Clean (Only if a thread exists)
    let cleanText = emailThread || '';
    if (cleanText) {
      cleanText = cleanText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      cleanText = cleanText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      cleanText = cleanText.replace(/&[a-z]+;/gi, ' ');
      cleanText = cleanText.replace(/<[^>]+>/g, '');
      cleanText = cleanText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    }

    const userDirective = instructions 
      ? `Follow this instruction: "${instructions}"` 
      : `Write a logical, polite, and brief reply to the email thread.`;

    // 🚀 NEW PROMPT: Adapts to whether it's a reply or a brand new email
    const prompt = `Draft a direct, human-sounding professional email.

    <rules>
    1. NO AI CHATTER. DO NOT write "Here is your draft", "Sure!", or "I am writing to...".
    2. Start the very first line with "Hi [Name]," or "Dear [Name],".
    3. Be concise, professional, and get straight to the point.
    4. End the email with "Best regards," followed by "${senderEmail || 'CityQ'}".
    5. Output ONLY the raw email text.
    </rules>

    <instructions>
    ${userDirective}
    </instructions>

    ${cleanText ? `<email_thread>\n${cleanText}\n</email_thread>` : ''}

    DRAFT:
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
          num_predict: 300, 
          num_thread: 2, 
          temperature: 0.1 
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status: ${response.status}`);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Drafting API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email draft' }, 
      { status: 500 }
    );
  }
}