import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
    const headers = {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        const commFields = [
            "name", "subject", "content", "sender", "creation", "modified",
            "sent_or_received", "recipients", "cc", "delivery_status", "custom_starred", "custom_important"
        ];
        let allRawEmails = [];
        let limit_start = 0;
        const limit_page_length = 500;
        let keepFetching = true;

        while (keepFetching) {
            const fetchBatch = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
                method: 'POST',
                headers,
                cache: 'no-store',
                body: JSON.stringify({
                    doctype: "Communication",
                    filters: { docstatus: ["in", [0, 1, 2]] },
                    fields: commFields,
                    limit_page_length: limit_page_length,
                    limit_start: limit_start,
                    order_by: "modified desc"
                })
            });

            if (!fetchBatch.ok) throw new Error(`Batch Fetch Failed`);
            const data = await fetchBatch.json();
            const records = data.message || [];
            allRawEmails = allRawEmails.concat(records);

            if (records.length < limit_page_length) keepFetching = false;
            else limit_start += limit_page_length;
        }

        const mappedEmails = allRawEmails.map(email => {
            const cleanDescription = (email.content || '').replace(/<[^>]+>/g, '').substring(0, 120) + '...';
            const senderName = email.sender ? email.sender.split('@')[0] : 'Unknown';

            const serverTimezoneOffset = "+02:00";

            const rawTime = email.modified || email.creation || new Date().toISOString();
            const safeTime = rawTime.split('.')[0].replace(' ', 'T') + serverTimezoneOffset;

            let fixedHtmlContent = email.content || '';
            fixedHtmlContent = fixedHtmlContent.replace(
                /(src|href)="(\/[^"]+)"/g,
                `$1="${CITYQ_ERPNEXT_URL}$2"`
            );

            return {
                id: email.name,
                user: {
                    name: senderName,
                    email: email.sender,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`
                },
                to: email.recipients || 'Unknown',
                cc: email.cc || '',
                sender_email: email.sender,
                subject: email.subject || '(No Subject)',
                description: cleanDescription,
                details: fixedHtmlContent,

                time: safeTime,
                readAt: safeTime,
                snoozedTill: null,
                folder: 'inbox',
                label: 'inbox',
                attachments: [],
                starred: email.custom_starred === 1,
                important: email.custom_important === 1,
            };
        });

        return NextResponse.json(mappedEmails, { status: 200 });

    } catch (error) {
        console.error("API Error fetching emails:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}