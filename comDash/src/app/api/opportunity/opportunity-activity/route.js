import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const opportunity_id = searchParams.get('opportunity_id');
    if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 });

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        const fetchComments = fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ doctype: "Comment", filters: { reference_doctype: "Opportunity", reference_name: opportunity_id }, fields: ["name", "content", "creation", "comment_type", "owner", "comment_by"], limit_page_length: 100 })
        }).then(async r => { if (!r.ok) throw new Error(`Comments Fetch Failed: ${r.status}`); return r.json(); });

        const fetchVersions = fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ doctype: "Version", filters: { ref_doctype: "Opportunity", docname: opportunity_id }, fields: ["name", "creation", "owner"], limit_page_length: 100 })
        }).then(async r => { if (!r.ok) throw new Error(`Versions Fetch Failed: ${r.status}`); return r.json(); });

        const [commentsData, versionsData] = await Promise.all([fetchComments, fetchVersions]);

        const rawComments = commentsData.message || [];
        const normalizedComments = rawComments.map(c => ({ id: c.name, type: 'comment', author: c.comment_by || c.owner || 'System', content: c.content, commentType: c.comment_type, timestamp: c.creation }));

        const rawVersions = versionsData.message || [];
        const normalizedVersions = rawVersions.map(v => ({ id: v.name, type: 'edit', author: v.owner, content: "Edited the record", timestamp: v.creation }));

        const timeline = [...normalizedComments, ...normalizedVersions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return NextResponse.json(timeline, { status: 200 });

    } catch (error) {
        console.error("API Error fetching activity:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}