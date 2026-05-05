import { NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const tokenPath = path.join(process.cwd(), 'zoho-tokens.json');
  
  if (!fs.existsSync(tokenPath)) {
    return NextResponse.json({ error: 'Not authenticated. Visit /api/zoho/auth' }, { status: 401 });
  }

  let tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const headers = { Authorization: `Bearer ${tokens.access_token}` };

  try {
    console.log("\n==================================================");
    console.log("📡 STEP 1: REQUESTING USER PROFILE TO GET 'MY FOLDER' ID");
    const userUrl = 'https://www.zohoapis.com/workdrive/api/v1/users/me';
    console.log("-> METHOD:  GET");
    console.log("-> URL:     " + userUrl);
    
    // 1. Get the User Profile
    const userResponse = await axios.get(userUrl, { headers });
    
    // 2. Extract the hidden "myfolder_id" from the attributes
    const myFolderId = userResponse.data.data?.attributes?.myfolder_id;
    
    if (!myFolderId) {
      throw new Error("Could not find myfolder_id in the Zoho user response.");
    }

    console.log("✅ RESULT:  My Folder ID found ->", myFolderId);
    
    console.log("\n📡 STEP 2: REQUESTING FILES INSIDE THAT FOLDER");
    const filesEndpoint = `https://www.zohoapis.com/workdrive/api/v1/files/${myFolderId}/files`;
    console.log("-> METHOD:  GET");
    console.log("-> URL:    ", filesEndpoint);

    // 3. Fetch the actual files!
    const filesResponse = await axios.get(filesEndpoint, { headers });
    
    console.log("🔥 SUCCESS! RAW ZOHO RESPONSE:");
    console.log(JSON.stringify(filesResponse.data.data, null, 2));
    console.log("==================================================\n");

    return NextResponse.json(filesResponse.data);

  } catch (error) {
    console.error("\n❌ ZOHO API ERROR DETAILS:");
    console.error("-> Status Code:", error.response?.status);
    console.error("-> Error Data:", JSON.stringify(error.response?.data, null, 2));
    console.error("-> Message:", error.message);
    console.log("==================================================\n");

    // If token expired, we print it clearly so you know to re-authenticate
    if (error.response?.status === 401) {
      return NextResponse.json({ error: 'Token expired. Please visit http://localhost:4000/api/zoho/auth to reconnect.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'API Call Failed', details: error.response?.data || error.message }, { status: 500 });
  }
}