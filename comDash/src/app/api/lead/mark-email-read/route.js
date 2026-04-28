import { NextResponse } from 'next/server';
// Make sure this path aligns with your App Router structure
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function POST(request) {
    try {
        // 1. In App Router, you must parse the incoming Web Request stream
        const body = await request.json();
        const { email_id } = body;

        // Added a quick validation check for safety
        if (!email_id) {
            return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
        }

        const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

        // 2. Update the Communication doctype in Frappe
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Communication/${email_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ seen: 1 }) // 1 means 'Read'
        });

        if (!response.ok) {
            throw new Error(`Failed to update seen status. Status: ${response.status}`);
        }

        // 3. Return success using NextResponse
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Mark Email Read Error:", error.message);

        // Return internal server error
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}