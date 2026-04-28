import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from "../../../secrets";

export async function POST(request) {
    const headers = {
        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        // 1. App Router requires you to explicitly parse the incoming JSON stream
        const body = await request.json();

        // 2. Forward the request to ERPNext
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Event`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body) // Send the parsed body
        });

        const data = await response.json();

        // 3. Handle ERPNext HTTP errors (e.g., 400 Bad Request, 403 Forbidden)
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        // 4. Send success back to the frontend
        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("Event API POST Error:", error.message);

        // Return internal server error
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}