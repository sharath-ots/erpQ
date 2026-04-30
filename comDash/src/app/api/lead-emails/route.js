import { NextResponse } from 'next/server';
// Ensure this path aligns with your App Router structure
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export async function GET(request) {
    // 1. App Router: Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');

    if (!lead_id) {
        return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
    const headers = {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        // 2. Add an .ok check to the initial lead fetch
        const leadRes = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Lead/${lead_id}`, { headers });
        if (!leadRes.ok) {
            throw new Error(`Failed to fetch Lead details. Status: ${leadRes.status}`);
        }

        const leadJson = await leadRes.json();
        const leadData = leadJson.data || {};

        const senderEmailsList = [
            leadData.email_id,
            leadData.alternate_email_1,
            leadData.alternate_email_2
        ].filter(Boolean);

        const commFields = [
            "name", "subject", "content", "sender", "creation",
            "sent_or_received", "recipients", "cc", "delivery_status"
        ];

        // 3. Add .ok checks inside the Promise chains to prevent silent failures
        const fetchLinked = fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doctype: "Communication",
                filters: {
                    reference_doctype: "Lead",
                    reference_name: lead_id,
                    communication_medium: "Email",
                    communication_type: "Communication"
                },
                fields: commFields,
                limit_page_length: 100,
                order_by: "creation desc"
            })
        }).then(async r => {
            if (!r.ok) throw new Error(`Linked Comm Fetch Failed: ${r.status}`);
            return r.json();
        });

        // 🚀 FIX 1: Search for the lead's email in Sender, Recipients, OR CC
        const senderFetchPromises = senderEmailsList.map(email => {
            return fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    doctype: "Communication",
                    filters: {
                        communication_medium: "Email"
                    },
                    // or_filters allows us to catch emails sent TO the lead
                    or_filters: [
                        ["Communication", "sender", "like", `%${email}%`],
                        ["Communication", "recipients", "like", `%${email}%`],
                        ["Communication", "cc", "like", `%${email}%`]
                    ],
                    fields: commFields,
                    limit_page_length: 100,
                    order_by: "creation desc"
                })
            }).then(async r => {
                if (!r.ok) throw new Error(`Sender Comm Fetch Failed: ${r.status}`);
                return r.json();
            });
        });

        const allResults = await Promise.all([fetchLinked, ...senderFetchPromises]);
        const mergedMap = new Map();

        allResults.forEach(data => {
            const emails = data.message || [];
            emails.forEach(email => {
                mergedMap.set(email.name, email);
            });
        });

        const rawEmails = Array.from(mergedMap.values()).sort((a, b) => {
            return new Date(b.creation) - new Date(a.creation);
        });

        // 🚀 FIX 2: THE MASTER MAPPER
        const mappedEmails = rawEmails.map(email => {
            const cleanDescription = (email.content || '').replace(/<[^>]+>/g, '').substring(0, 120) + '...';

            const senderName = email.sender ? email.sender.split('@')[0] : 'Unknown';

            return {
                id: email.name,
                user: {
                    name: senderName,
                    email: email.sender,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`
                },
                sender_email: email.sender,
                subject: email.subject || '(No Subject)',
                description: cleanDescription,
                details: email.content,
                time: email.creation,
                starred: false,
                important: email.sent_or_received === 'Received',
                readAt: email.sent_or_received === 'Sent' ? new Date().toISOString() : null,
                snoozedTill: null,

                // 🚀 Force ALL interactions into the 'inbox' view so it acts as a unified timeline
                folder: 'inbox',

                // Keep the label distinct so you can visually style "Sent" vs "Received" differently if you want
                label: email.sent_or_received === 'Sent' ? 'sent' : 'inbox',
                attachments: []
            };
        });

        return NextResponse.json(mappedEmails, { status: 200 });

    } catch (error) {
        console.error("API Error fetching emails:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
