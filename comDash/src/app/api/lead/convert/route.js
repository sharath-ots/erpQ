import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function POST(request) {
    const { lead_id } = await request.json();

    if (!lead_id) {
        return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json'
    };

    try {
        // ERPNext has a built-in mapper function to convert Lead to Opportunity
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/erpnext.crm.doctype.lead.lead.make_opportunity`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ source_name: lead_id })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to map Lead to Opportunity');
        }

        const mappedData = await response.json();
        const mappedOpportunity = mappedData.message;

        // The mapped data is just the raw JSON structure, it hasn't been SAVED as an Opportunity yet.
        // We must save it.
        const saveResponse = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Opportunity`, {
            method: 'POST',
            headers,
            body: JSON.stringify(mappedOpportunity)
        });

        if (!saveResponse.ok) {
            const errData = await saveResponse.json();
            throw new Error(errData.message || 'Failed to save the new Opportunity');
        }

        const newOpportunity = await saveResponse.json();
        
        return NextResponse.json({ success: true, new_opportunity_id: newOpportunity.data.name }, { status: 200 });

    } catch (error) {
        console.error("Conversion API Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}