import { NextResponse } from 'next/server';
// 🚀 Adjust this import path based on your folder structure
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets'; 

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const partyType = searchParams.get('type'); // "Lead", "Customer", or "Prospect"

    // 1. Validate the requested type
    if (!partyType || !['Lead', 'Customer', 'Prospect'].includes(partyType)) {
        return NextResponse.json({ error: 'Valid party type is required' }, { status: 400 });
    }

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json'
    };

    try {
        // 2. Select the safe fields to fetch based on the Doctype
        // (ERPNext throws an error if you request a field that doesn't exist on that specific Doctype)
        let fields = ["name"];
        if (partyType === 'Lead') {
            fields = ["name", "lead_name", "company_name"];
        } else if (partyType === 'Customer') {
            fields = ["name", "customer_name", "customer_group"];
        } else if (partyType === 'Prospect') {
            fields = ["name", "company_name"];
        }

        // 3. Fetch the list from ERPNext
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doctype: partyType,
                fields: fields,
                limit_page_length: 1000,
                order_by: "creation desc"
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${partyType} from ERPNext`);
        }

        const data = await response.json();
        
        // 4. Return the data to the frontend
        return NextResponse.json(data.message || [], { status: 200 });

    } catch (error) {
        console.error(`Error fetching ${partyType}:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}