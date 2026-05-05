import { NextResponse } from 'next/server';
import { fetchERP } from 'lib/erpBackend'; // Import the same utility!

export async function GET() {
  try {
    // We don't pass 'admin', so it defaults to 'user' keys from .env!
    const sidebarData = await fetchERP('/api/method/frappe.desk.desktop.get_workspace_sidebar_items');
    return NextResponse.json(sidebarData);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}