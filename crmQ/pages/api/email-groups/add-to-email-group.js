import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { email_group, emails } = req.body;
    if (!email_group || !emails || !emails.length) {
        return res.status(400).json({ error: 'Missing group or emails' });
    }

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        // Fire off creations in parallel for blazing speed
        const insertPromises = emails.map(email => {
            return fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Email Group Member`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email_group: email_group,
                    email: email,
                    unsubscribed: 0 // Default to subscribed
                })
            });
        });

        await Promise.all(insertPromises);

        return res.status(200).json({ success: true, message: `Added ${emails.length} leads` });
    } catch (error) {
        console.error("Failed to insert email group members:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}