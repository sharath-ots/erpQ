import { NextResponse } from 'next/server';
import { VersaqERPNextApiKey, VersaqERPNextApiSecret, VersaqERPNextUrl } from '../../../../secrets';

export async function POST(req) {
    try {
        console.log("=========================================");
        console.log("1. INVOICE PROCESSING STARTED");
        const formData = await req.formData();
        const file = formData.get('file');
        const poName = formData.get('po_name');
        
        if (!file || !poName) {
            console.log("❌ Missing file or PO Name");
            return NextResponse.json({ error: 'File and PO Name required' }, { status: 400 });
        }
        console.log(`✅ Received file: ${file.name}, PO: ${poName}`);

        // ==========================================
        console.log("2. EXTRACTING TEXT (MOCK)");
        const extractedText = `
            INVOICE # INV-99201
            Date: 2026-07-15
            Item: Framed Server Rack - Qty 2 - Rate 4500
        `; 
        console.log("✅ Text extracted");

        // ==========================================
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
            throw new Error(`Failed to connect to Ollama at ${targetUrl}. Is it running?`);
        }

        if (!ollamaRes.ok) throw new Error(`Ollama failed with status: ${ollamaRes.status}`);
        
        const ollamaData = await ollamaRes.json();
        const aiInvoiceData = JSON.parse(ollamaData.response);
        console.log("✅ Ollama successfully returned JSON:", aiInvoiceData);

        // ==========================================
        console.log("4. FETCHING PO DETAILS FROM ERPNEXT");
        // FIX: Instead of calling the buggy mapping method, we just fetch the PO data directly
        const poRes = await fetch(`${VersaqERPNextUrl}/api/resource/Purchase Order/${poName}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${VersaqERPNextApiKey}:${VersaqERPNextApiSecret}`
            }
        });

        if (!poRes.ok) throw new Error(`Failed to fetch PO details: ${await poRes.text()}`);
        
        const poData = (await poRes.json()).data;
        console.log("✅ Fetched original PO successfully.");

        // ==========================================
        console.log("5. BUILDING & SAVING MANUAL INVOICE");
        
        // Manually map the PO items into PI items to bypass ERPNext's internal bug
        const today = new Date().toISOString().split('T')[0];
        
        const draftInvoice = {
            doctype: "Purchase Invoice",
            supplier: poData.supplier,
            company: poData.company,
            currency: poData.currency,
            // AI Data injected here:
            bill_no: aiInvoiceData.bill_no || `AI-${Date.now()}`,
            bill_date: aiInvoiceData.bill_date || today,
            posting_date: today,
            // Link items back to the PO so ERPNext knows what we are billing
            items: poData.items.map(item => ({
                item_code: item.item_code,
                qty: item.qty, // You could optionally update this with aiInvoiceData.items[x].qty
                rate: item.rate,
                purchase_order: poData.name, // Crucial for linking
                po_detail: item.name         // Crucial for linking
            }))
        };

        // Carry over any tax templates
        if (poData.taxes_and_charges) {
            draftInvoice.taxes_and_charges = poData.taxes_and_charges;
        }

        // POST the completed JSON to create the invoice
        const createRes = await fetch(`${VersaqERPNextUrl}/api/resource/Purchase Invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${VersaqERPNextApiKey}:${VersaqERPNextApiSecret}`
            },
            body: JSON.stringify(draftInvoice)
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`ERPNext Save Failed: ${errText}`);
        }

        const savedInvoice = (await createRes.json()).data;
        console.log(`✅ SUCCESS! Invoice saved as: ${savedInvoice.name}`);
        console.log("=========================================");

        return NextResponse.json({ success: true, invoice: savedInvoice });

    } catch (error) {
        console.error('API Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}