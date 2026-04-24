import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doctype: "User",
                filters: { enabled: 1, user_type: "System User" },
                fields: ["name", "full_name", "user_image"], // 'name' is the email address in Frappe
                limit_page_length: 100
            })
        });
        const data = await response.json();
        return res.status(200).json(data.message || []);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}