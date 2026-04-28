import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from "../../../../secrets";

const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
const headers = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

// --- HANDLE PUT REQUEST (Update Event) ---
export async function PUT(request, context) {
    try {
        // 1. Next.js 15: You MUST await context.params to get the ID from the folder name
        const params = await context.params;
        const id = params.id;

        // 2. Parse the incoming JSON body
        const body = await request.json();

        // 3. Forward the request to the actual ERPNext server
        const erpResponse = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Event/${id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(body)
        });

        const data = await erpResponse.json();

        // 4. Handle ERPNext errors
        if (!erpResponse.ok) {
            console.error("ERP Error:", data);
            return NextResponse.json(data, { status: erpResponse.status });
        }

        // 5. Send success back to React
        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("Next.js Proxy Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

// --- HANDLE POST REQUEST (Create Event) ---
export async function POST(request) {
    try {
        // 1. Parse the incoming JSON body
        const body = await request.json();

        // 2. Forward the request to ERPNext (Note: No ID needed for creation)
        const erpResponse = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Event`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        const data = await erpResponse.json();

        // 3. Handle ERPNext errors
        if (!erpResponse.ok) {
            console.error("ERP Error:", data);
            return NextResponse.json(data, { status: erpResponse.status });
        }

        // 4. Send success back to React
        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("Next.js Proxy Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}