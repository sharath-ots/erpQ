import { NextResponse } from 'next/server';
// Ensure this path aligns with your App Router structure
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function POST(request) {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        // 1. App Router requires manual parsing of the JSON body
        const body = await request.json();

        const {
            lead_id,
            from,
            recipients,
            cc,
            bcc,
            subject,
            content,
            send_me_a_copy,
            read_receipt
        } = body;

        // 🚀 We use Frappe's standard email builder endpoint
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.core.doctype.communication.email.make`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                doctype: "Lead",
                name: lead_id,
                sender: from,           // 🚀 FORCE THE SENDER HERE
                recipients: recipients,
                cc: cc || null,         // Use null if empty to prevent Frappe validation issues
                bcc: bcc || null,
                subject: subject,
                content: content,
                send_email: 1,          // 1 tells Frappe to actually send the email, 0 just creates a draft
                send_me_a_copy: send_me_a_copy,
                read_receipt: read_receipt
            })
        });

        const data = await response.json();

        // 🚀 EXPERT FIX: Extract Frappe's hidden error messages!
        if (!response.ok) {
            let errorMessage = 'Failed to send email in ERPNext';
            if (data._server_messages) {
                try {
                    const messages = JSON.parse(data._server_messages);
                    const parsedMsg = JSON.parse(messages[0]);
                    errorMessage = parsedMsg.message || errorMessage;
                } catch (e) {
                    console.error("Failed to parse frappe message", e);
                }
            } else if (data.exc_type) {
                errorMessage = `ERP Error: ${data.exc_type}`;
            } else if (data.message) {
                errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
            }

            // Throwing here drops us into the catch block below to return the 500 error
            throw new Error(errorMessage);
        }

        // 2. Return success using NextResponse
        return NextResponse.json({ success: true, data }, { status: 200 });

    } catch (error) {
        console.error("Email Send Error:", error);

        // 3. Return the error using NextResponse so the frontend popup can display it
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}