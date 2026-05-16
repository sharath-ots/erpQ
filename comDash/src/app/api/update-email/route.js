import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export async function POST(req) {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        const { id, field, value } = await req.json();

        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.set_value`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                doctype: "Communication",
                name: id,
                fieldname: field,
                value: value // 1 for checked, 0 for unchecked
            })
        });

        if (!response.ok) throw new Error("Failed to update ERPNext");

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Update Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}