import { NextResponse } from 'next/server';
// Note: Adjust the import path for secrets based on where it lives in the host app
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

// Moved helper function outside so it can be used by both GET and POST if needed
async function fetchFrappe(doctype, params = {}) {
    const res = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
        method: 'POST',
        headers,
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

// --- HANDLE GET REQUEST (For the Lead List) ---
export async function GET(request) {
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

        // Use NextResponse instead of res.status.json
        return NextResponse.json(enriched, { status: 200 });

    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// --- HANDLE POST REQUEST (For the Add Form) ---
export async function POST(request) {
    try {
        // 🚀 In App Router, we parse the body with request.json()
        const body = await request.json();
        const createUrl = `${CITYQ_ERPNEXT_URL}/api/resource/Lead`;

        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            // Send the exact mapped payload from the frontend
            body: JSON.stringify(body)
        });

        const result = await createRes.json();

        if (!createRes.ok) {
            console.error("ERPNext Creation Failed:", result);
            return NextResponse.json(result, { status: createRes.status });
        }

        return NextResponse.json(result.data, { status: 200 });

    } catch (error) {
        console.error("API POST Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}