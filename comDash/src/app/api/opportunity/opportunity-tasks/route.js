import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const opportunity_id = searchParams.get('opportunity_id');

    if (!opportunity_id) {
        return NextResponse.json({ error: "Opportunity ID is required" }, { status: 400 });
    }

    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

    try {
        // 🚀 Change reference_type to Opportunity
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/ToDo?filters=[["reference_type","=","Opportunity"],["reference_name","=","${opportunity_id}"]]&fields=["*"]`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch tasks");
        }

        return NextResponse.json(data.data || [], { status: 200 });

    } catch (error) {
        console.error("Fetch Tasks Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}