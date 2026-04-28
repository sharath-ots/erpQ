import { NextResponse } from 'next/server';
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
                doctype: "Email Template",
                fields: ["name", "subject", "response_html"], // response_html is the body
                limit_page_length: 50
            })
        });

        // Best practice: Always check if the fetch actually succeeded
        if (!response.ok) {
            throw new Error(`ERPNext responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Return the data using NextResponse
        return NextResponse.json(data.message || [], { status: 200 });

    } catch (error) {
        console.error("Email Template API Error:", error.message);

        // Return the error using NextResponse
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}