import { NextResponse } from 'next/server';
// Ensure this path aligns with your App Router structure
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export async function GET(request) {
    // 1. App Router: Extract query parameters directly from the request URL
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');

    if (!lead_id) {
        return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/ToDo?filters=[["reference_type","=","Lead"],["reference_name","=","${lead_id}"]]&fields=["*"]`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // 2. Handle HTTP errors from ERPNext safely
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch tasks");
        }

        // 3. Return the data array using NextResponse
        return NextResponse.json(data.data || [], { status: 200 });

    } catch (error) {
        console.error("Fetch Tasks Error:", error.message);

        // 4. Return internal server error using NextResponse
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}