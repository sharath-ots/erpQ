import { NextResponse } from 'next/server';
// Ensure this path aligns with your setup (e.g., '@/secrets' or relative path)
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                doctype: "Email Group",
                fields: ["name", "title"],
                limit_page_length: 500
            })
        });

        if (!response.ok) {
            throw new Error(`ERPNext responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Return success using NextResponse
        return NextResponse.json(data.message || [], { status: 200 });

    } catch (error) {
        console.error("Email Groups API Error:", error.message);
        // Return error using NextResponse
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}