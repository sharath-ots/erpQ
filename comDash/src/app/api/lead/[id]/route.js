import { NextResponse } from 'next/server';
// Ensure this path aligns with your App Router structure 
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function PUT(request, context) {
    try {
        // 1. Next.js 15: You MUST await context.params to get the ID from the folder name
        const params = await context.params;
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
        }

        const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

        // 2. Parse the incoming JSON body
        const body = await request.json();

        const updateUrl = `${CITYQ_ERPNEXT_URL}/api/resource/Lead/${id}`;

        // 3. Forward the request to ERPNext
        const updateRes = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            // Pass the updated fields from the frontend directly to ERPNext
            body: JSON.stringify(body)
        });

        const result = await updateRes.json();

        // 4. Handle ERPNext errors
        if (!updateRes.ok) {
            console.error("ERPNext Update Failed:", result);
            return NextResponse.json(result, { status: updateRes.status });
        }

        // 5. Send success back to React
        return NextResponse.json(result.data, { status: 200 });

    } catch (error) {
        console.error("API PUT Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}