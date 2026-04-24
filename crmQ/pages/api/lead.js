import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../secrets';

export default async function handler(req, res) {

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
    const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

    async function fetchFrappe(doctype, params = {}) {
        const res = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', headers,
            body: JSON.stringify({
                doctype,
                fields: ["*"],
                limit_page_length: 5000, // Fetch a large batch to ensure "All"
                ...params
            })
        });
        const data = await res.json();
        return data.message || [];
    }

    if (req.method === 'GET') {
        try {
            // 🚀 Parallel fetch of all entities
            const [leads, allTodos, allEvents, participants] = await Promise.all([
                fetchFrappe("Lead", { order_by: "modified desc" }),
                fetchFrappe("ToDo", { filters: { status: "Open", reference_type: "Lead" } }),
                fetchFrappe("Event", { filters: { status: ["!=", "Cancelled"] } }),
                fetchFrappe("Event Participants", { filters: { reference_doctype: "Lead" } })
            ]);

            const enriched = leads.map(lead => {
                const leadId = lead.name;

                // 1. Filter Tasks for this Lead
                const leadTasks = allTodos.filter(t => t.reference_name === leadId);

                // 2. Filter Events for this Lead (Check Participants Table bridge)
                const eventIds = participants
                    .filter(p => p.reference_name === leadId || p.reference_docname === leadId)
                    .map(p => p.parent);

                const leadEvents = allEvents.filter(e => eventIds.includes(e.name));

                return {
                    ...lead,
                    task_info: leadTasks.length > 0 ? leadTasks : null,
                    event_info: leadEvents.length > 0 ? leadEvents : null
                };
            });

            return res.status(200).json(enriched);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // --- HANDLE POST REQUEST (For the Add Form) ---
    else if (req.method === 'POST') {
        try {
            const createUrl = `${CITYQ_ERPNEXT_URL}/api/resource/Lead`;

            const createRes = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // Send the exact mapped payload from the frontend
                body: JSON.stringify(req.body)
            });

            const result = await createRes.json();

            if (!createRes.ok) {
                console.error("ERPNext Creation Failed:", result);
                return res.status(createRes.status).json(result);
            }

            return res.status(200).json(result.data);

        } catch (error) {
            console.error("API POST Error:", error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}