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

    // 🚀 NEW: Use a System Prompt to strongly enforce behavior for small models
    const systemPrompt = `You are a strict, automated email drafting API. 
    Your ONLY purpose is to output the final email text. 
    NEVER include conversational filler (e.g., "Here is the email", "Sure,"). 
    NEVER explain your output. 
    Begin immediately with the greeting.`;

    // 🚀 NEW: Cleaned up User Prompt so it doesn't give the model phrases to parrot
    const prompt = `Instructions:
    ${userDirective}

    Rules:
    - Start immediately with the greeting (e.g., "Hi [Name],").
    - Keep it concise and professional.
    - End the email with "Best regards," followed by "${senderEmail || 'CityQ'}".
    - Output absolutely nothing but the email itself.

    ${cleanText ? `Context Thread:\n${cleanText}\n` : ''}`;

    const targetUrl = process.env.OLLAMA_INTERNAL_URL || 'http://erpq-ollama:11434';
    
    const response = await fetch(`${targetUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:1b',
        system: systemPrompt, // <-- Pass the system rules here separately
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