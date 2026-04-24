import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';
export default async function handler(req, res) {

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
    const { id } = req.query;

    if (req.method == 'PUT') {
        try {
            const updateUrl = `${CITYQ_ERPNEXT_URL}/api/resource/Lead/${id}`;

            const updateRes = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // Pass the updated fields from the frontend directly to ERPNext
                body: JSON.stringify(req.body)
            });

            const result = await updateRes.json();

            if (!updateRes.ok) {
                console.error("ERPNext Update Failed:", result);
                return res.status(updateRes.status).json(result);
            }

            return res.status(200).json(result.data);

        } catch (error) {
            console.error("API PUT Error:", error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
