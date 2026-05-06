import { NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'No authorization code found' });

  try {
    // Automatically trade the code for tokens
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: 'http://localhost:4000/api/zoho/callback',
        code: code,
      }
    });

    // Automatically save the tokens to a file so you never have to login again
    const tokenPath = path.join(process.cwd(), 'zoho-tokens.json');
    fs.writeFileSync(tokenPath, JSON.stringify(response.data, null, 2));

    console.log('✅ Tokens successfully saved to zoho-tokens.json!');

    // Redirect to your UI
    return NextResponse.redirect('http://localhost:4000/apps/file-manager2');
  } catch (err) {
    console.error('Token Error:', err.response?.data || err.message);
    return NextResponse.json({ error: 'Failed to generate tokens' }, { status: 500 });
  }
}