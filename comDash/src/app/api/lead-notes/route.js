import { NextResponse } from 'next/server';
// Ensure this path aligns with your App Router structure
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

// 🚀 GET: Fetch all notes (Comments) for this Lead
export async function GET(request) {
    // 1. App Router: Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');

    if (!lead_id) {
        return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', // get_list is technically a POST in Frappe v14/v15 when sending body data
            headers,
            body: JSON.stringify({
                doctype: "Comment",
                filters: {
                    reference_doctype: "Lead",
                    reference_name: lead_id,
                    comment_type: "Comment" // Ensures we only get user notes, not system logs
                },
                fields: ["name", "content", "creation", "owner"],
                order_by: "creation desc", // Newest first
                limit_page_length: 100
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch notes. Status: ${response.status}`);
        }

        const data = await response.json();

        // Handle Frappe's internal exceptions
        if (data.exc) throw new Error(data.exc);

        return NextResponse.json(data.message || [], { status: 200 });
    } catch (error) {
        console.error("Fetch Notes Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 🚀 POST: Create a new note (Comment)
export async function POST(request) {
    // 1. Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');

    if (!lead_id) {
        return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
    };

    try {
        // 2. Parse the incoming JSON body
        const body = await request.json();
        const { content, reference_doctype, reference_name } = body;

        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doc: {
                    doctype: "Comment",
                    comment_type: "Comment",
                    reference_doctype: reference_doctype || "Lead",
                    reference_name: reference_name || lead_id,
                    content: content
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save note. Status: ${response.status}`);
        }

        const data = await response.json();

        // Handle Frappe's internal exceptions
        if (data.exc) throw new Error(data.exc);

        return NextResponse.json(data.message || {}, { status: 200 });
    } catch (error) {
        console.error("Save Note Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}