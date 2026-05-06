import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirectUri = 'http://localhost:4000/api/zoho/callback';
  const scope = 'WorkDrive.files.ALL,WorkDrive.workspace.ALL';
  
  // This URL asks Zoho for a permanent 'offline' access code
  const url = `https://accounts.zoho.in/oauth/v2/auth?response_type=code&client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&access_type=offline&prompt=consent`;
  
  return NextResponse.redirect(url);
}