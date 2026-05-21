import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const docname = searchParams.get('docname');

    if (!docname) return NextResponse.json({ error: "Missing docname" }, { status: 400 });

    try {
        const headers = { 'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` };

        // 1. Safely encode URL parameters for all 3 tables
        const vParams = new URLSearchParams();
        vParams.append("fields", JSON.stringify(["name", "creation", "data"]));
        vParams.append("filters", JSON.stringify([["ref_doctype", "=", "ToDo"], ["docname", "=", docname]]));
        vParams.append("limit_page_length", "500");

        const cParams = new URLSearchParams();
        cParams.append("fields", JSON.stringify(["name", "creation", "content", "subject", "comment_type"]));
        cParams.append("filters", JSON.stringify([["reference_doctype", "=", "ToDo"], ["reference_name", "=", docname]]));
        cParams.append("limit_page_length", "500");

        const fParams = new URLSearchParams();
        fParams.append("fields", JSON.stringify(["name", "creation", "file_name"]));
        fParams.append("filters", JSON.stringify([["attached_to_doctype", "=", "ToDo"], ["attached_to_name", "=", docname]]));
        fParams.append("limit_page_length", "500");

        // 2. Fetch all databases simultaneously
        const [versionRes, commRes, fileRes, todoRes] = await Promise.all([
            fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Version?${vParams.toString()}`, { headers }),
            fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Communication?${cParams.toString()}`, { headers }),
            fetch(`${CITYQ_ERPNEXT_URL}/api/resource/File?${fParams.toString()}`, { headers }),
            fetch(`${CITYQ_ERPNEXT_URL}/api/resource/ToDo/${docname}?fields=["creation"]`, { headers })
        ]);

        const versions = await versionRes.json();
        const comms = await commRes.json();
        const files = await fileRes.json();
        const todo = await todoRes.json();

        const allLogs = [];

        // --- UNPACK 1: VERSIONS (Field Changes) ---
        if (versions.data) {
            versions.data.forEach(v => {
                const changeData = JSON.parse(v.data || '{}');
                if (changeData.changed) {
                    changeData.changed.forEach(([field, oldV, newV]) => {
                        allLogs.push({
                            id: `${v.name}-${field}`,
                            icon: 'material-symbols:edit-outline',
                            title: `Changed ${field.toLowerCase()} from ${oldV || 'Empty'} to ${newV || 'Empty'}`,
                            creation: v.creation
                        });
                    });
                }
            });
        }

        // --- UNPACK 2: COMMUNICATIONS (Removals & Comments) ---
        if (comms.data) {
            comms.data.forEach(c => {
                const text = c.content || c.subject || "";
                const cleanText = text.replace(/<[^>]*>?/gm, '').trim(); // Erase hidden HTML links!
                
                let icon = 'material-symbols:chat-outline';
                if (c.comment_type === 'Attachment Removed' || cleanText.toLowerCase().includes('removed attachment')) {
                    icon = 'material-symbols:delete-outline';
                } else if (c.comment_type === 'Attachment' || cleanText.toLowerCase().includes('attached')) {
                    icon = 'material-symbols:attach-file';
                }

                if (c.comment_type !== 'Created' && cleanText) {
                    allLogs.push({ id: c.name, icon, title: cleanText, creation: c.creation });
                }
            });
        }

        // --- UNPACK 3: FILES (Active Attachments Fallback) ---
        if (files.data) {
            files.data.forEach(f => {
                // Ensure we don't duplicate logs if Communication already caught it
                const alreadyLogged = allLogs.some(log => log.title.includes(f.file_name) && log.icon === 'material-symbols:attach-file');
                if (!alreadyLogged) {
                    allLogs.push({
                        id: f.name,
                        icon: 'material-symbols:attach-file',
                        title: `You attached ${f.file_name}`,
                        creation: f.creation
                    });
                }
            });
        }

        // --- UNPACK 4: "CREATED" LOG ---
        if (todo.data && todo.data.creation) {
            allLogs.push({
                id: `created-${docname}`,
                icon: 'material-symbols:add-circle-outline',
                title: 'You created this task',
                creation: todo.data.creation
            });
        }

        // Sort everything by newest first!
        allLogs.sort((a, b) => new Date(b.creation) - new Date(a.creation));

        return NextResponse.json({ data: allLogs });
    } catch (error) {
        console.error("Activity API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}