import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets'; 

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const opportunity_id = searchParams.get('opportunity_id');

    if (!opportunity_id) {
        return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 });
    }

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        const eventRes = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doctype: "Event",
                fields: ["name"],
                limit_page_length: 200,
                order_by: "starts_on desc"
            })
        });

        const eventData = await eventRes.json();
        const allEventIds = (eventData.message || []).map(e => e.name);

        if (allEventIds.length === 0) return NextResponse.json([]);

        const fullEvents = await Promise.all(
            allEventIds.map(async (id) => {
                try {
                    const r = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Event/${id}`, { headers });
                    const json = await r.json();
                    return json.data;
                } catch (e) {
                    return null;
                }
            })
        );

        // 🚀 Check if the Opportunity ID is linked in the event
        const linkedEvents = fullEvents.filter(e => {
            if (!e) return false;
            const hasLink = e.links?.some(l => l.link_name === opportunity_id);
            const hasString = JSON.stringify(e).includes(opportunity_id);
            return hasLink || hasString;
        });

        return NextResponse.json(linkedEvents, { status: 200 });

    } catch (error) {
        console.error("Critical API Error fetching events:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}