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

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        // 2. Fetch from 'Comment' table
        const fetchComments = fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', // Frappe get_list expects POST
            headers,
            body: JSON.stringify({
                doctype: "Comment",
                filters: { reference_doctype: "Lead", reference_name: lead_id },
                fields: ["name", "content", "creation", "comment_type", "owner", "comment_by"],
                limit_page_length: 100
            })
        }).then(async r => {
            if (!r.ok) throw new Error(`Comments Fetch Failed: ${r.status}`);
            return r.json();
        });

        // 3. Fetch from 'Version' table
        const fetchVersions = fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                doctype: "Version",
                filters: { ref_doctype: "Lead", docname: lead_id },
                fields: ["name", "creation", "owner"],
                limit_page_length: 100
            })
        }).then(async r => {
            if (!r.ok) throw new Error(`Versions Fetch Failed: ${r.status}`);
            return r.json();
        });

        const [commentsData, versionsData] = await Promise.all([fetchComments, fetchVersions]);

        // 4. Normalize Notes & Assignments
        const rawComments = commentsData.message || [];
        const normalizedComments = rawComments.map(c => ({
            id: c.name,
            type: 'comment',
            author: c.comment_by || c.owner || 'System',
            content: c.content, // This holds the comment text OR assignment details
            commentType: c.comment_type, // 'Comment', 'Assigned', 'Info', etc.
            timestamp: c.creation
        }));

        // 5. Normalize Edits
        const rawVersions = versionsData.message || [];
        const normalizedVersions = rawVersions.map(v => ({
            id: v.name,
            type: 'edit',
            author: v.owner,
            content: "Edited the record",
            timestamp: v.creation
        }));

        // 6. Merge everything and sort descending (newest at top)
        const timeline = [...normalizedComments, ...normalizedVersions].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // 7. Return success using NextResponse
        return NextResponse.json(timeline, { status: 200 });

    } catch (error) {
        console.error("API Error fetching activity:", error.message);

        // Return internal server error
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}