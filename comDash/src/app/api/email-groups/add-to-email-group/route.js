import { NextResponse } from 'next/server';
// Ensure this path aligns with your current alias or relative path structure
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function POST(request) {
    try {
        // 1. Read the body using App Router syntax
        const body = await request.json();
        const { email_group, emails } = body;

        // 2. Validation
        if (!email_group || !emails || !emails.length) {
            return NextResponse.json(
                { error: 'Missing group or emails' },
                { status: 400 }
            );
        }

        const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

        // 3. Fire off creations in parallel for blazing speed
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

        // 4. Return success using NextResponse
        return NextResponse.json(
            { success: true, message: `Added ${emails.length} leads` },
            { status: 200 }
        );

    } catch (error) {
        console.error("Failed to insert email group members:", error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}