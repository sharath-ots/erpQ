import { NextResponse } from 'next/server';
// Make sure this path aligns with your App Router structure
// (e.g., '@/secrets' or the correct relative path like '../../../../src/secrets')
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', // Frappe get_list expects POST, even though this route is a GET
            headers,
            body: JSON.stringify({
                doctype: "Lead",
                fields: ["email_id", "lead_name"],
                limit_page_length: 100
            })
        });

        // Always check if the fetch actually succeeded before parsing JSON
        if (!response.ok) {
            throw new Error(`ERPNext responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Filter out leads without emails
        const leads = (data.message || []).filter(l => l.email_id);

        // Return the filtered leads using NextResponse
        return NextResponse.json(leads, { status: 200 });

    } catch (error) {
        console.error("Lead Emails API Error:", error.message);

        // Return the error using NextResponse
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}