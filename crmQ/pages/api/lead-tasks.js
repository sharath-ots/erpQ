import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../secrets';

export default async function handler(req, res) {
    const { lead_id } = req.query;
    if (!lead_id) return res.status(400).json({ error: "Lead ID is required" });

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/ToDo?filters=[["reference_type","=","Lead"],["reference_name","=","${lead_id}"]]&fields=["*"]`, {
            method: 'GET',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch tasks");

        return res.status(200).json(data.data || []);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}