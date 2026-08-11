import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirectUri = 'http://localhost:14100/oauth/zoho/callback';
  
  // ONLY WorkDrive scopes. We completely removed the profile and search scopes.
  const scopes = "WorkDrive.files.ALL,WorkDrive.files.sharing.ALL,WorkDrive.workspace.ALL,WorkDrive.team.ALL";
  
  // URL pointing strictly to .eu
  const url = `https://accounts.zoho.eu/oauth/v2/auth?response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&access_type=offline&prompt=consent`;
  
  return NextResponse.redirect(url);
}