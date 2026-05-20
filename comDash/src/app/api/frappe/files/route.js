import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const doctype = searchParams.get('doctype');
    const docname = searchParams.get('docname');

    try {
        const url = `${CITYQ_ERPNEXT_URL}/api/resource/File?fields=["name","file_name","file_url","creation"]&filters=[["attached_to_doctype","=","${doctype}"],["attached_to_name","=","${docname}"]]`;
        
        const res = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` 
            }
        });
        
        const data = await res.json();

        // 🚀 THE FIX FOR BROKEN IMAGES: Prepend the ERPNext server domain!
        if (data.data) {
            data.data = data.data.map(file => {
                if (file.file_url && !file.file_url.startsWith('http')) {
                    file.file_url = `${CITYQ_ERPNEXT_URL}${file.file_url}`;
                }
                return file;
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { erp_ids, file_url } = await request.json();
        
        if (!erp_ids || !file_url) throw new Error("Missing IDs or URL");

        // 🚀 Hunt down and destroy the file attached to EACH ToDo
        for (const id of erp_ids) {
            // 1. Search ERPNext for the exact File Document ID matching this ToDo and URL
            const searchUrl = `${CITYQ_ERPNEXT_URL}/api/resource/File?fields=["name"]&filters=[["attached_to_name","=","${id}"],["file_url","=","${file_url}"]]`;
            
            const searchRes = await fetch(searchUrl, {
                headers: { 'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` }
            });
            const searchData = await searchRes.json();

            // 2. If it found the File document, issue the DELETE command
            if (searchData.data && searchData.data.length > 0) {
                const fileRecordId = searchData.data[0].name;
                
                await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/File/${fileRecordId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` }
                });
            }
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("File Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}