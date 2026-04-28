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
            method: 'POST', // Frappe get_list expects POST
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

        const senderFetchPromises = senderEmailsList.map(email => {
            return fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    doctype: "Communication",
                    filters: {
                        sender: ["like", `%${email}%`],
                        communication_medium: "Email"
                    },
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

        // 🚀 EXPERT FIX: THE MASTER MAPPER
        const mappedEmails = rawEmails.map(email => {
            // Clean HTML tags for the short preview snippet in the list view
            const cleanDescription = (email.content || '').replace(/<[^>]+>/g, '').substring(0, 120) + '...';

            // Extract a name from the email address if Frappe didn't provide one
            const senderName = email.sender ? email.sender.split('@')[0] : 'Unknown';

            return {
                id: email.name,                      // Frappe ID
                user: {
                    name: senderName,
                    email: email.sender,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`
                },
                sender_email: email.sender,          // Stored for your custom Reply logic
                subject: email.subject || '(No Subject)',
                description: cleanDescription,       // The plain text preview
                details: email.content,              // The raw HTML body
                time: email.creation,
                starred: false,
                important: email.sent_or_received === 'Received',
                readAt: email.sent_or_received === 'Sent' ? new Date().toISOString() : null, // Auto-read sent emails
                snoozedTill: null,

                // Route 'Sent' emails to the Sent folder, everything else to Inbox
                folder: email.sent_or_received === 'Sent' ? 'sent' : 'inbox',
                label: email.sent_or_received === 'Sent' ? 'sent' : 'inbox',
                attachments: [] // Default empty array so the UI doesn't crash checking for files
            };
        });

        // 4. Return the perfectly formatted data using NextResponse!
        return NextResponse.json(mappedEmails, { status: 200 });

    } catch (error) {
        console.error("API Error fetching emails:", error.message);

        // 5. Return error using NextResponse
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}