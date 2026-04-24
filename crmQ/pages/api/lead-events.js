import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../secrets';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { lead_id } = req.query;
    if (!lead_id) return res.status(400).json({ error: 'lead_id is required' });

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        // 1. Fetch a list of all Events in the system (Limit to 200 to keep it fast)
        const eventRes = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', headers,
            body: JSON.stringify({
                doctype: "Event",
                fields: ["name"],
                limit_page_length: 200,
                order_by: "starts_on desc"
            })
        });

        const eventData = await eventRes.json();
        const allEventIds = (eventData.message || []).map(e => e.name);

        if (allEventIds.length === 0) return res.status(200).json([]);

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

        // 3. YOUR PROVEN LOGIC: Filter them by checking the 'links' table OR the raw JSON string
        const linkedEvents = fullEvents.filter(e => {
            if (!e) return false;

            // Checks Frappe's child table
            const hasLink = e.links?.some(l => l.link_name === lead_id);
            // Checks dynamic reference fields as a fallback
            const hasString = JSON.stringify(e).includes(lead_id);

            return hasLink || hasString;
        });
        return res.status(200).json(linkedEvents);

    } catch (error) {
        console.error("Critical API Error fetching events:", error);
        return res.status(500).json({ error: error.message });
    }
}