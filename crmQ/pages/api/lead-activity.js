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
        // 1. Fetch from 'Comment' table (Gets your "Testing" notes, Assignments, and System Info)
        const fetchComments = fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', headers,
            body: JSON.stringify({
                doctype: "Comment",
                filters: { reference_doctype: "Lead", reference_name: lead_id },
                fields: ["name", "content", "creation", "comment_type", "owner", "comment_by"],
                limit_page_length: 100
            })
        }).then(r => r.json());

        // 2. Fetch from 'Version' table (Gets your "You last edited this" audit trails)
        const fetchVersions = fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', headers,
            body: JSON.stringify({
                doctype: "Version",
                filters: { ref_doctype: "Lead", docname: lead_id },
                fields: ["name", "creation", "owner"],
                limit_page_length: 100
            })
        }).then(r => r.json());

        const [commentsData, versionsData] = await Promise.all([fetchComments, fetchVersions]);

        // 3. Normalize Notes & Assignments
        const rawComments = commentsData.message || [];
        const normalizedComments = rawComments.map(c => ({
            id: c.name,
            type: 'comment',
            author: c.comment_by || c.owner || 'System',
            content: c.content, // This holds the comment text OR assignment details
            commentType: c.comment_type, // 'Comment', 'Assigned', 'Info', etc.
            timestamp: c.creation
        }));

        // 4. Normalize Edits
        const rawVersions = versionsData.message || [];
        const normalizedVersions = rawVersions.map(v => ({
            id: v.name,
            type: 'edit',
            author: v.owner,
            content: "Edited the record",
            timestamp: v.creation
        }));

        // 5. Merge everything and sort descending (newest at top)
        const timeline = [...normalizedComments, ...normalizedVersions].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        return res.status(200).json(timeline);

    } catch (error) {
        console.error("API Error fetching activity:", error);
        return res.status(500).json({ error: error.message });
    }
}