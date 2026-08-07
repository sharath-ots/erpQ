import { NextResponse } from 'next/server';
import { VersaqERPNextUrl, VersaqERPNextApiKey, VersaqERPNextApiSecret } from '../../../../secrets';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    // 1. Graceful fallback if ENV variables are missing (prevents 500 error)
    if (!VersaqERPNextUrl || !VersaqERPNextApiKey || !VersaqERPNextApiSecret) {
        console.warn("Missing ERPNext credentials. Defaulting to empty roles.");
        return NextResponse.json({ roles: [] }, { status: 200 });
    }

    if (!email) {
        return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    const headers = {
        'Authorization': `token ${VersaqERPNextApiKey}:${VersaqERPNextApiSecret}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(`${VersaqERPNextUrl}/api/resource/User/${email}`, {
            method: 'GET',
            headers,
        });

        // 2. Graceful fallback if user is not found or ERPNext throws an error
        if (!response.ok) {
            console.warn(`ERPNext user fetch failed (${response.status}). Defaulting to empty roles.`);
            return NextResponse.json({ roles: [] }, { status: 200 });
        }

        const data = await response.json();

        let roles = [];
        if (data?.data?.roles) {
            roles = data.data.roles.map(r => r.role);
        }

        return NextResponse.json({ roles }, { status: 200 });

    } catch (error) {
        console.error("Roles API Error:", error.message);
        // 3. Graceful fallback on network failure
        return NextResponse.json({ roles: [] }, { status: 200 });
    }
}