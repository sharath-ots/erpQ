import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../secrets';

export default async function handler(req, res) {
    const { lead_id } = req.query;

    if (!lead_id) {
        return res.status(400).json({ error: 'lead_id is required' });
    }

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
    };

    // 🚀 GET: Fetch all notes (Comments) for this Lead
    if (req.method === 'GET') {
        try {
            const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
                method: 'POST', // get_list is technically a POST in Frappe v14/v15 when sending body data
                headers,
                body: JSON.stringify({
                    doctype: "Comment",
                    filters: {
                        reference_doctype: "Lead",
                        reference_name: lead_id,
                        comment_type: "Comment" // Ensures we only get user notes, not system logs
                    },
                    fields: ["name", "content", "creation", "owner"],
                    order_by: "creation desc", // Newest first
                    limit_page_length: 100
                })
            });
            const data = await response.json();

            if (data.exc) throw new Error(data.exc);

            return res.status(200).json(data.message || []);
        } catch (error) {
            console.error("Fetch Notes Error:", error);
            return res.status(500).json({ error: error.message });
        }
    }

    // 🚀 POST: Create a new note (Comment)
    if (req.method === 'POST') {
        try {
            const { content, reference_doctype, reference_name } = req.body;

            const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.insert`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    doc: {
                        doctype: "Comment",
                        comment_type: "Comment",
                        reference_doctype: reference_doctype || "Lead",
                        reference_name: reference_name || lead_id,
                        content: content
                    }
                })
            });

            const data = await response.json();

            if (data.exc) throw new Error(data.exc);

            return res.status(200).json(data.message || {});
        } catch (error) {
            console.error("Save Note Error:", error);
            return res.status(500).json({ error: error.message });
        }
    }

    // Fallback for unsupported methods
    return res.status(405).json({ error: 'Method not allowed' });
}