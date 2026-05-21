import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET() {
    const headers = { 
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json' 
    };

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doctype: "DocType",
                // 🚀 LOOSENED FILTERS: Removed 'custom: 0'
                // Most standard DocTypes are not marked as 'custom'
                filters: { 
                    istable: 0, 
                    issingle: 0 
                }, 
                fields: ["name"],
                limit_page_length: 500, // Important for DocTypes
                order_by: "name asc"
            })
        });

        const data = await response.json();
        // Pack it safely
        const result = data.message || data;
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}