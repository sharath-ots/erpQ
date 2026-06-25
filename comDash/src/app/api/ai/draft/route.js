import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { emailThread, instructions, senderEmail, recipientEmail } = body;

    if (!emailThread && !instructions) {
      return NextResponse.json({ error: 'Email thread or instructions are required' }, { status: 400 });
    }

    let cleanText = emailThread || '';
    if (cleanText) {
      cleanText = cleanText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      cleanText = cleanText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      cleanText = cleanText.replace(/&[a-z]+;/gi, ' ');
      cleanText = cleanText.replace(/<[^>]+>/g, '');
      cleanText = cleanText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    }

    const recName = recipientEmail ? recipientEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : 'Customer';
    const sendName = senderEmail || 'CityQ';

    const systemPrompt = "You are a professional email assistant. Output ONLY the email text. Do not explain, do not refuse, and do not add conversational filler.";

    const prompt = `Write a professional email expanding on these notes. You must write full sentences, do not just copy the notes.

    Notes to expand: "${instructions}"

    ${cleanText ? `Previous Email Thread:\n${cleanText}\n` : ''}

    Output the email in this exact format:
    Hi ${recName},

    [Write the expanded email body here]

    Best regards,
    ${sendName}
    `;

    const targetUrl = process.env.OLLAMA_INTERNAL_URL || 'http://erpq-ollama:11434';
    
    const response = await fetch(`${targetUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:1b',
        system: systemPrompt, 
        prompt: prompt,
        stream: true, 
        keep_alive: '24h',
        options: {
          num_ctx: 4096, 
          num_predict: 300, 
          num_thread: 2, 
          temperature: 0.5
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