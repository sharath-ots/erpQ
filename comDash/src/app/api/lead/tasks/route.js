import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

// --- GET: Fetch tasks for this specific lead ---
export async function GET(request) {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    // 1. App Router: Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
        return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    try {
        const params = new URLSearchParams({
            doctype: 'ToDo',
            fields: '["*"]',
            filters: JSON.stringify({
                reference_type: 'Lead',
                reference_name: leadId
            }),
            order_by: 'creation desc'
        });

        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list?${params}`, {
            headers: { 'Authorization': authHeader }
        });

        if (!response.ok) {
            throw new Error(`ERPNext responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data.message || [], { status: 200 });
    } catch (e) {
        console.error("GET Tasks Error:", e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// --- POST: Create a new task in ERPNext ---
export async function POST(request) {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    // 1. App Router: Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
        return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    try {
        // 2. Parse the incoming JSON body
        const body = await request.json();

        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/ToDo`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...body, // Spread the parsed body
                reference_type: 'Lead',
                reference_name: leadId,
                doctype: 'ToDo'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("ERPNext Create Task Failed:", result);
            return NextResponse.json(result, { status: response.status });
        }

        return NextResponse.json(result.data, { status: 200 });
    } catch (e) {
        console.error("POST Tasks Error:", e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}