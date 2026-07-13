import { NextResponse } from 'next/server';
// Using the same imports from your previous example
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    console.log("Fetching roles for email:", email);

    if (!email) {
        return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
    };

    try {
        // 2. Fetch the specific User document from ERPNext
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/User/${email}`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: "User not found in ERPNext" }, { status: 404 });
            }
            throw new Error(`ERPNext responded with status: ${response.status}`);
        }

        const data = await response.json();

        // 3. Extract the roles child table and map it to a clean array of strings
        let roles = [];
        if (data?.data?.roles) {
            roles = data.data.roles.map(r => r.role);
        }

        // 4. Return the clean roles array to your frontend
        return NextResponse.json({ roles }, { status: 200 });

    } catch (error) {
        console.error("Roles API Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}