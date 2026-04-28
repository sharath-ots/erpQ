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
                doctype: "User",
                filters: { enabled: 1, user_type: "System User" },
                fields: ["name", "full_name", "user_image"], // 'name' is the email address in Frappe
                limit_page_length: 100
            })
        });

        // Best practice: Catch Frappe server errors before trying to parse JSON
        if (!response.ok) {
            throw new Error(`ERPNext responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Return the data using NextResponse
        return NextResponse.json(data.message || [], { status: 200 });

    } catch (error) {
        console.error("Users API Error:", error.message);

        // Return the error using NextResponse
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}