import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets'; 

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const doctype = searchParams.get('doctype');

    // Security: Only allow specific DocTypes to be fetched via this open endpoint
    const allowedDoctypes = [
        'Opportunity Type', 
        'Sales Stage', 
        'Lead Source', 
        'Industry Type', 
        'Market Segment', 
        'Currency'
    ];

    if (!doctype || !allowedDoctypes.includes(doctype)) {
        return NextResponse.json({ error: 'Invalid or missing doctype' }, { status: 400 });
    }

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
                fields: ["name"],
                limit_page_length: 500,
                order_by: "name asc" // Alphabetical order
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${doctype} from ERPNext`);
        }

        const data = await response.json();
        
        // Format exactly how your ControlledSelect expects it: { value, label }
        const formattedOptions = (data.message || []).map(item => ({
            value: item.name,
            label: item.name
        }));

        return NextResponse.json(formattedOptions, { status: 200 });

    } catch (error) {
        console.error(`Error fetching dropdown for ${doctype}:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}