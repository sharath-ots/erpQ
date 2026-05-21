import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const doctype = searchParams.get('doctype');
    
    if (!doctype) return NextResponse.json([], { status: 200 });

    // 🚀 DYNAMIC FIELD MAPPING: 
    // Frappe uses different column names for different DocTypes.
    let extraField = null;
    switch(doctype) {
        case 'Lead': extraField = 'lead_name'; break;
        case 'Customer': extraField = 'customer_name'; break;
        case 'Contact': extraField = 'first_name'; break;
        case 'Task': 
        case 'Issue': extraField = 'subject'; break;
        case 'Project': extraField = 'project_name'; break;
        case 'Employee': extraField = 'employee_name'; break;
        case 'User': extraField = 'full_name'; break;
        // Add more here if you need other specific DocTypes!
    }

    // Always fetch 'name' (the ID), and append the extra field if we know it
    const fields = ["name"];
    if (extraField) fields.push(extraField);

    const headers = { 
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json' 
    };

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doctype: doctype,
                fields: fields, 
                limit_page_length: 100
            })
        });

        const data = await response.json();
        const result = data.message || data;
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error("Names API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}