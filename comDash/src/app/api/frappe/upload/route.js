import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function POST(request) {
    try {
        const incomingFormData = await request.formData();
        const file = incomingFormData.get('file');
        if (!file) throw new Error("No file was received.");
        
        // 🚀 Unpack the array of IDs
        const docnamesStr = incomingFormData.get('docnames');
        const docnames = docnamesStr ? JSON.parse(docnamesStr) : [];
        
        let lastResponseData = null;

        // 🚀 Loop through every single ID and attach the file in ERPNext!
        for (const docname of docnames) {
            const frappeFormData = new FormData();
            frappeFormData.append('file', file, file.name);
            frappeFormData.append('is_private', '1');
            frappeFormData.append('doctype', incomingFormData.get('doctype') || 'ToDo');
            frappeFormData.append('docname', docname); // Current ID in loop
            frappeFormData.append('folder', 'Home/Attachments');

            const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/upload_file`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
                    'Accept': 'application/json'
                },
                body: frappeFormData
            });

            const text = await response.text(); 
            const data = JSON.parse(text);

            if (!response.ok || data.exc) {
                console.error(`Failed to upload to ${docname}:`, data.exc);
                throw new Error(data.message || `Upload failed for ${docname}`);
            }
            lastResponseData = data;
        }

        return NextResponse.json({ success: true, file: lastResponseData.message }, { status: 200 });

    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}