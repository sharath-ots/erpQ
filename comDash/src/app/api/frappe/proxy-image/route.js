import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

    // Ensure we are fetching from your ERPNext server
    const targetUrl = fileUrl.startsWith('http') ? fileUrl : `${CITYQ_ERPNEXT_URL}${fileUrl}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch image");

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type');

        return new NextResponse(imageBuffer, {
            headers: { 'Content-Type': contentType }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}