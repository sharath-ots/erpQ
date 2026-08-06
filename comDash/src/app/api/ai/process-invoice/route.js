import { NextResponse } from 'next/server';
import { VersaqERPNextApiKey, VersaqERPNextApiSecret, VersaqERPNextUrl } from '../../../../secrets';

// SAFEMODE: Removed the pdf-parse import to see if it stops the server crash

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file'); 
        const poName = formData.get('po_name');
        
        if (!file || !poName) {
            return NextResponse.json({ error: 'File and PO Name required' }, { status: 400 });
        }

        console.log(`✅ Safe Mode: Received file: ${file.name}, PO: ${poName}`);

        // ==========================================
        // 1. SAFE MODE MOCK TEXT (Bypassing pdf-parse)
        // If the crash goes away, we know pdf-parse is breaking your Next.js server.
        const extractedText = `
            INVOICE # INV-99201
            Date: 2026-07-15
            Item: Framed Server Rack - Qty 2 - Rate 4500
        `; 
        console.log("✅ Using Mock Text for Testing.");

        // ==========================================
        // 2. OLLAMA AI EXTRACTION
        console.log("3. CALLING OLLAMA");
        const systemPrompt = `You are an AI data extractor. Extract the invoice details from the text into this exact JSON structure:
        { "bill_no": "String", "bill_date": "YYYY-MM-DD", "items": [ { "item_name": "String", "qty": Number, "rate": Number } ] }`;

        const targetUrl = process.env.OLLAMA_INTERNAL_URL || 'http://erpq-ollama:11434'; 
        
        let ollamaRes;
        try {
            ollamaRes = await fetch(`${targetUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:1b', 
                    system: systemPrompt,
                    prompt: `Extract data from this invoice: \n\n${extractedText}`,
                    format: 'json', 
                    stream: false
                })
            });
        } catch (e) {
            return NextResponse.json({ error: `Failed to connect to AI Engine at ${targetUrl}. Is Ollama running?` }, { status: 500 });
        }

        if (!ollamaRes.ok) {
            return NextResponse.json({ error: `Ollama failed with status: ${ollamaRes.status}` }, { status: 500 });
        }
        
        const ollamaData = await ollamaRes.json();
        const aiInvoiceData = JSON.parse(ollamaData.response);

        if (!aiInvoiceData.items || !Array.isArray(aiInvoiceData.items) || aiInvoiceData.items.length === 0) {
            return NextResponse.json({ error: "The AI could not find any items on this invoice." }, { status: 400 });
        }

        // ==========================================
        // 3. FETCH ORIGINAL PO
        console.log("4. FETCHING PO DETAILS FROM ERPNEXT");
        const poRes = await fetch(`${VersaqERPNextUrl}/api/resource/Purchase Order/${poName}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${VersaqERPNextApiKey}:${VersaqERPNextApiSecret}`
            }
        });

        if (!poRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch PO details from ERPNext.' }, { status: 502 });
        }
        
        const poData = (await poRes.json()).data;
        const matchedItems = [];
        const unmatchedItems = [];

        // ==========================================
        // 4. MAP AND VALIDATE ITEMS
        for (const aiItem of aiInvoiceData.items) {
            const aiNameStr = (aiItem.item_name || "").toLowerCase().trim();
            
            const match = poData.items.find(poItem => {
                const poNameStr = (poItem.item_name || "").toLowerCase();
                const poCodeStr = (poItem.item_code || "").toLowerCase();
                
                return poNameStr.includes(aiNameStr) || 
                       aiNameStr.includes(poNameStr) || 
                       poCodeStr.includes(aiNameStr);
            });

            if (match) {
                if (aiItem.qty > match.qty) {
                    return NextResponse.json({ error: `Invoice quantity for "${aiItem.item_name}" (${aiItem.qty}) exceeds the original PO quantity (${match.qty}).` }, { status: 400 });
                }

                matchedItems.push({
                    item_code: match.item_code,
                    qty: aiItem.qty, 
                    rate: aiItem.rate,
                    purchase_order: poData.name, 
                    po_detail: match.name
                });
            } else {
                unmatchedItems.push(aiItem.item_name);
            }
        }

        if (unmatchedItems.length > 0) {
            return NextResponse.json({ error: `Items mismatch! The uploaded invoice contains items not found in this PO: [ ${unmatchedItems.join(', ')} ]. Please upload the correct invoice.` }, { status: 400 });
        }
        
        // ==========================================
        // 5. CREATE PURCHASE INVOICE
        console.log("5. CREATING INVOICE IN ERPNEXT");
        const today = new Date().toISOString().split('T')[0];
        
        const draftInvoice = {
            doctype: "Purchase Invoice",
            supplier: poData.supplier,
            company: poData.company,
            currency: poData.currency,
            bill_no: aiInvoiceData.bill_no || `AI-${Date.now()}`,
            bill_date: aiInvoiceData.bill_date || today,
            posting_date: today,
            items: matchedItems 
        };

        if (poData.taxes_and_charges) {
            draftInvoice.taxes_and_charges = poData.taxes_and_charges;
        }

        const createRes = await fetch(`${VersaqERPNextUrl}/api/resource/Purchase Invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${VersaqERPNextApiKey}:${VersaqERPNextApiSecret}`
            },
            body: JSON.stringify(draftInvoice)
        });

        if (!createRes.ok) {
            let errText = await createRes.text();
            try {
                const errObj = JSON.parse(errText);
                if (errObj.exc_type) errText = errObj.exc_type;
            } catch(e) {}
            return NextResponse.json({ error: `ERPNext Save Failed: ${errText}` }, { status: 502 });
        }

        const savedInvoice = (await createRes.json()).data;
        console.log(`✅ Invoice Created: ${savedInvoice.name}`);

        // ==========================================
        // 6. UPLOAD PHYSICAL FILE
        console.log("6. UPLOADING FILE TO ERPNEXT");
        const erpFormData = new FormData();
        erpFormData.append('file', file, file.name);
        erpFormData.append('doctype', 'Purchase Invoice');
        erpFormData.append('docname', savedInvoice.name);
        erpFormData.append('is_private', '1'); 

        const uploadRes = await fetch(`${VersaqERPNextUrl}/api/method/upload_file`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${VersaqERPNextApiKey}:${VersaqERPNextApiSecret}`
            },
            body: erpFormData
        });

        if (!uploadRes.ok) {
            console.warn(`⚠️ Invoice created, but file attachment failed.`);
        } else {
            console.log("✅ File attached successfully!");
        }

        return NextResponse.json({ success: true, invoice: savedInvoice });

    } catch (error) {
        console.error('CRITICAL API Error:', error);
        return NextResponse.json({ error: "An unexpected server error occurred. Please check the backend logs." }, { status: 500 });
    }
}