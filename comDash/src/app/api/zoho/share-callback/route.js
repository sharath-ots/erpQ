import { NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'No share authorization code found' });

  try {
    // 1. Trade the second code for the SHARE tokens
    const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: 'http://localhost:4000/api/zoho/callback', // Must match exactly
        code: code,
      }
    });

    // 2. Save the SHARE tokens to a completely DIFFERENT file
    const tokenPath = path.join(process.cwd(), 'zoho-share-tokens.json');
    fs.writeFileSync(tokenPath, JSON.stringify(response.data, null, 2));

    console.log('✅ Sharing Tokens successfully saved to zoho-share-tokens.json!');

    // 3. Chain is complete! Send them to the app!
    return NextResponse.redirect('http://localhost:4000/apps/file-manager2');
  } catch (err) {
    console.error('Share Token Error:', err.response?.data || err.message);
    return NextResponse.json({ error: 'Failed to generate share tokens' }, { status: 500 });
  }
}   