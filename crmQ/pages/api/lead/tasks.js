import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export default async function handler(req, res) {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
    const { leadId } = req.query;

    // --- GET: Fetch tasks for this specific lead ---
    if (req.method === 'GET') {
        try {
            const params = new URLSearchParams({
                doctype: 'ToDo',
                fields: '["*"]',
                filters: JSON.stringify({
                    reference_type: 'Lead',
                    reference_name: leadId
                }),
                order_by: 'creation desc'
            });

            const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list?${params}`, {
                headers: { 'Authorization': authHeader }
            });
            const data = await response.json();
            return res.status(200).json(data.message || []);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // --- POST: Create a new task in ERPNext ---
    if (req.method === 'POST') {
        try {
            const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/ToDo`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...req.body,
                    reference_type: 'Lead',
                    reference_name: leadId,
                    doctype: 'ToDo'
                })
            });
            const result = await response.json();
            return res.status(200).json(result.data);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}