import { NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'No authorization code found' });

  try {
    // 1. Exchange the code (Strictly .eu domain)
    const response = await axios.post('https://accounts.zoho.eu/oauth/v2/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: 'http://localhost:14100/oauth/zoho/callback',
        code: code,
      }
    });

    // 2. Save the master token
    const tokenPath = path.join(process.cwd(), 'zoho-tokens.json');
    fs.writeFileSync(tokenPath, JSON.stringify(response.data, null, 2));

    console.log('✅ Master Token successfully saved to zoho-tokens.json!');

    // 3. Drop the user onto the frontend UI
    return NextResponse.redirect('http://localhost:13001/m/docq/register');

  } catch (err) {
    console.error('Token Error:', err.response?.data || err.message);
    return NextResponse.json({ error: 'Failed to generate tokens' }, { status: 500 });
  }
}