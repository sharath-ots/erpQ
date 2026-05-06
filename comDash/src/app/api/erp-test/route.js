import { NextResponse } from 'next/server';
import { fetchERP } from 'lib/erpBackend';

export async function GET() {
  try {
    // 1. Get the logged-in user's email (Uses 'user' keys automatically!)
    const authData = await fetchERP('/api/method/frappe.auth.get_logged_user');
    
    if (!authData.message) {
      return NextResponse.json({ error: "Could not authenticate" });
    }
    const userEmail = authData.message;

    // 2. Fetch the full User document using that email
    const userData = await fetchERP(`/api/resource/User/${userEmail}`);

    return NextResponse.json(userData);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}