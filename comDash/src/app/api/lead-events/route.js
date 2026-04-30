import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets'; // Adjust path if needed

export async function GET(request) {
    // In the App Router, you get query params like this:
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');

    if (!lead_id) {
        return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
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

        const linkedEvents = fullEvents.filter(e => {
            if (!e) return false;
            const hasLink = e.links?.some(l => l.link_name === lead_id);
            const hasString = JSON.stringify(e).includes(lead_id);
            return hasLink || hasString;
        });

        return NextResponse.json(linkedEvents, { status: 200 });

    } catch (error) {
        console.error("Critical API Error fetching events:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}