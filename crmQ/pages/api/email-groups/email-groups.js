import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doctype: "Email Group",
                fields: ["name", "title"],
                limit_page_length: 500
            })
        });

        const data = await response.json();
        return res.status(200).json(data.message || []);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}