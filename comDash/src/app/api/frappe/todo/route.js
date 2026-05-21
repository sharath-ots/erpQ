import { NextResponse } from 'next/server';
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../../secrets';

export async function POST(request) {
    try {
        const body = await request.json();
        
        const headers = { 
            'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
            'Content-Type': 'application/json' 
        };

        const formattedPriority = body.priority.charAt(0).toUpperCase() + body.priority.slice(1);
        const descriptionText = body.description;

        const loggedInUser = body.assignedBy || 'Administrator'; 

        const assigneesToProcess = body.assignee && body.assignee.length > 0 ? body.assignee : [null];
        
        const createdTaskIds = [];

        for (const userEmail of assigneesToProcess) {
            const doc = {
                doctype: "ToDo",
                description: descriptionText,
                priority: formattedPriority,
                
                // 🚀 THE FIX: Map explicit dates from frontend
                date: body.dueDate || null,
                follow_up_date: body.follow_up_date || date,
                

                
                allocated_to: userEmail,
                reference_type: body.referenceType || null,
                reference_name: body.referenceName || null,
                status: "Open",
                assigned_by: loggedInUser
            };

            const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.insert`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ doc })
            });

            const data = await response.json();

            if (!response.ok || data.exc) {
                console.error(`Failed to insert ToDo for ${userEmail}:`, data.exc);
                throw new Error(`Failed to create ToDo for ${userEmail}`);
            }

            createdTaskIds.push(data.message.name); 
        }

        return NextResponse.json({ 
            success: true, 
            data: {
                primary_id: createdTaskIds[0],
                all_ids: createdTaskIds 
            }
        }, { status: 200 });

    } catch (error) {
        console.error("ToDo API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        
        const headers = { 
            'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
            'Content-Type': 'application/json' 
        };

        const erpIds = body.erp_ids || [];
        if (erpIds.length === 0) {
            return NextResponse.json({ error: "No ERPNext IDs provided to update" }, { status: 400 });
        }

        const updatePayload = {};

        if (body.description !== undefined) {
            updatePayload.description = body.description; 
        }

        if (body.priority) {
            const p = body.priority.toLowerCase();
            if (p === 'urgent' || p === 'high') updatePayload.priority = "High";
            else if (p === 'low' || p === 'optional') updatePayload.priority = "Low";
            else updatePayload.priority = "Medium";
        }

        // 🚀 THE FIX: Add the individual explicit date fields back to the payload!
        if (body.dueDate) {
            updatePayload.date = body.dueDate;
        }
        if (body.follow_up_date) {
            updatePayload.follow_up_date = body.follow_up_date;
        }

        if (body.status) updatePayload.status = body.status;

        for (const erpId of erpIds) {
            const res = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/ToDo/${erpId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updatePayload)
            });
            
            const data = await res.json();
            
            if (!res.ok || data.exc) {
                let errorMsg = `Failed to update ${erpId} in ERPNext.`;
                
                if (data._server_messages) {
                    try {
                        const parsedMsgs = JSON.parse(data._server_messages);
                        errorMsg = JSON.parse(parsedMsgs[0]).message;
                    } catch (e) {
                        errorMsg = data._server_messages;
                    }
                } else if (data.exc_type) {
                    errorMsg = data.exc_type;
                }
                
                throw new Error(errorMsg);
            }
        }

        return NextResponse.json({ success: true, message: "All associated ToDos updated" }, { status: 200 });

    } catch (error) {
        console.error("ToDo Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const headers = { 
            'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
            'Content-Type': 'application/json' 
        };

        // Fetch the ToDos from ERPNext using frappe.client.get_list
        const response = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`, {
            method: 'POST', // get_list expects a POST request in Frappe
            headers,
            body: JSON.stringify({
                doctype: "ToDo",
                // We only want Open tasks to save loading time
                filters: { status: "Open" }, 
                // Explicitly ask for all the fields our Kanban board needs
                fields: [
                    "name", 
                    "description", 
                    "priority", 
                    "date", 
                    "follow_up_date", 
                    "allocated_to", 
                    "assigned_by",
                    "reference_type", 
                    "reference_name", 
                    "status"
                ],
                limit_page_length: 500
            })
        });

        const data = await response.json();

        if (!response.ok || data.exc) {
            console.error("ERPNext Fetch Error:", data.exc);
            throw new Error("Failed to fetch ToDos from ERPNext");
        }

        // Return the array of ToDos back to the Kanban board!
        return NextResponse.json({ success: true, data: data.message || [] }, { status: 200 });

    } catch (error) {
        console.error("GET ToDo API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { erp_ids } = body;

        if (!erp_ids || !Array.isArray(erp_ids) || erp_ids.length === 0) {
            return NextResponse.json({ error: "Valid erp_ids array is required" }, { status: 400 });
        }

        // ERPNext requires deleting records individually by their specific resource URL
        for (const id of erp_ids) {
            const response = await fetch(`${process.env.CITYQ_ERPNEXT_URL}/api/resource/ToDo/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`
                }
            });

            if (!response.ok) {
                console.error(`Failed to delete ToDo: ${id}`);
                // Depending on your strictness, you can throw an error here, 
                // but usually it's best to continue trying to delete the rest if it's a batch.
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Delete API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}