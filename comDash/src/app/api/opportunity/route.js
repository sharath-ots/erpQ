import { NextResponse } from 'next/server';

import {
    ERPNEXT_API_KEY,
    ERPNEXT_API_SECRET,
    CITYQ_ERPNEXT_URL
} from '../../../secrets';

const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;

const headers = {
    Authorization: authHeader,
    'Content-Type': 'application/json'
};

// ======================================================
// COMMON FRAPPE FETCH HELPER
// ======================================================

async function fetchFrappe(doctype, params = {}) {

    const res = await fetch(
        `${CITYQ_ERPNEXT_URL}/api/method/frappe.client.get_list`,
        {
            method: 'POST',
            headers,

            body: JSON.stringify({
                doctype,
                fields: ['*'],
                limit_page_length: 5000,
                ...params
            })
        }
    );

    const data = await res.json();

    return data.message || [];
}

// ======================================================
// GET OPPORTUNITY LIST
// ======================================================

export async function GET(request) {

    try {

        // 🚀 Parallel fetch
        const [
            opportunities,
            allTodos,
            allEvents,
            participants,
            comments,
            communications
        ] = await Promise.all([

            // Opportunities
            fetchFrappe('Opportunity', {
                order_by: 'modified desc'
            }),

            // Tasks
            fetchFrappe('ToDo', {
                filters: {
                    status: 'Open',
                    reference_type: 'Opportunity'
                }
            }),

            // Events
            fetchFrappe('Event', {
                filters: {
                    status: ['!=', 'Cancelled']
                }
            }),

            // Event Participants
            fetchFrappe('Event Participants', {
                filters: {
                    reference_doctype: 'Opportunity'
                }
            }),

            // Comments
            fetchFrappe('Comment', {
                filters: {
                    reference_doctype: 'Opportunity'
                }
            }),

            // Emails / Communications
            fetchFrappe('Communication', {
                filters: {
                    reference_doctype: 'Opportunity'
                }
            })

        ]);

        // ======================================================
        // ENRICH DATA
        // ======================================================

        const enriched = opportunities.map((opportunity) => {

            const opportunityId = opportunity.name;

            // ==================================================
            // TASKS
            // ==================================================

            const opportunityTasks = allTodos.filter(
                (todo) => todo.reference_name === opportunityId
            );

            // ==================================================
            // EVENTS
            // ==================================================

            const eventIds = participants
                .filter(
                    (participant) =>
                        participant.reference_name === opportunityId ||
                        participant.reference_docname === opportunityId
                )
                .map((participant) => participant.parent);

            const opportunityEvents = allEvents.filter(
                (event) => eventIds.includes(event.name)
            );

            // ==================================================
            // COMMENTS
            // ==================================================

            const opportunityComments = comments.filter(
                (comment) => comment.reference_name === opportunityId
            );

            // ==================================================
            // COMMUNICATIONS
            // ==================================================

            const opportunityCommunications = communications.filter(
                (communication) =>
                    communication.reference_name === opportunityId
            );

            // ==================================================
            // FINAL OBJECT
            // ==================================================

            return {

                ...opportunity,

                task_info:
                    opportunityTasks.length > 0
                        ? opportunityTasks
                        : null,

                event_info:
                    opportunityEvents.length > 0
                        ? opportunityEvents
                        : null,

                comments_info:
                    opportunityComments.length > 0
                        ? opportunityComments
                        : null,

                communication_info:
                    opportunityCommunications.length > 0
                        ? opportunityCommunications
                        : null
            };
        });

        return NextResponse.json(
            enriched,
            { status: 200 }
        );

    } catch (error) {

        console.error('Opportunity GET Error:', error);

        return NextResponse.json(
            {
                error: error.message
            },
            {
                status: 500
            }
        );
    }
}

// ======================================================
// CREATE OPPORTUNITY
// ======================================================

export async function POST(request) {

    try {

        const body = await request.json();

        const createUrl =
            `${CITYQ_ERPNEXT_URL}/api/resource/Opportunity`;

        const createRes = await fetch(createUrl, {

            method: 'POST',

            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },

            body: JSON.stringify(body)
        });

        const result = await createRes.json();

        // ==================================================
        // ERPNext ERROR
        // ==================================================

        if (!createRes.ok) {

            console.error(
                'ERPNext Opportunity Creation Failed:',
                result
            );

            return NextResponse.json(
                result,
                {
                    status: createRes.status
                }
            );
        }

        // ==================================================
        // SUCCESS
        // ==================================================

        return NextResponse.json(
            result.data,
            {
                status: 200
            }
        );

    } catch (error) {

        console.error(
            'Opportunity POST Error:',
            error
        );

        return NextResponse.json(
            {
                error: 'Internal Server Error'
            },
            {
                status: 500
            }
        );
    }
}

// ======================================================
// UPDATE OPPORTUNITY
// ======================================================

export async function PUT(request) {

    try {

        const body = await request.json();

        const { name, ...updateData } = body;

        if (!name) {

            return NextResponse.json(
                {
                    error: 'Opportunity name is required'
                },
                {
                    status: 400
                }
            );
        }

        const updateUrl =
            `${CITYQ_ERPNEXT_URL}/api/resource/Opportunity/${name}`;

        const updateRes = await fetch(updateUrl, {

            method: 'PUT',

            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },

            body: JSON.stringify(updateData)
        });

        const result = await updateRes.json();

        if (!updateRes.ok) {

            console.error(
                'ERPNext Opportunity Update Failed:',
                result
            );

            return NextResponse.json(
                result,
                {
                    status: updateRes.status
                }
            );
        }

        return NextResponse.json(
            result.data,
            {
                status: 200
            }
        );

    } catch (error) {

        console.error(
            'Opportunity PUT Error:',
            error
        );

        return NextResponse.json(
            {
                error: 'Internal Server Error'
            },
            {
                status: 500
            }
        );
    }
}

// ======================================================
// DELETE OPPORTUNITY
// ======================================================

export async function DELETE(request) {

    try {

        const { searchParams } =
            new URL(request.url);

        const name =
            searchParams.get('name');

        if (!name) {

            return NextResponse.json(
                {
                    error: 'Opportunity name is required'
                },
                {
                    status: 400
                }
            );
        }

        const deleteUrl =
            `${CITYQ_ERPNEXT_URL}/api/resource/Opportunity/${name}`;

        const deleteRes = await fetch(deleteUrl, {

            method: 'DELETE',

            headers: {
                Authorization: authHeader,
                Accept: 'application/json'
            }
        });

        const result = await deleteRes.json();

        if (!deleteRes.ok) {

            console.error(
                'ERPNext Opportunity Delete Failed:',
                result
            );

            return NextResponse.json(
                result,
                {
                    status: deleteRes.status
                }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Opportunity deleted successfully'
            },
            {
                status: 200
            }
        );

    } catch (error) {

        console.error(
            'Opportunity DELETE Error:',
            error
        );

        return NextResponse.json(
            {
                error: 'Internal Server Error'
            },
            {
                status: 500
            }
        );
    }
}