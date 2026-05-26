export const fetchOpportunityListAdmin = async () => {

    try {

        // 🚀 Change endpoint if needed
        const response = await fetch('/api/opportunity');

        if (!response.ok) {
            throw new Error('Failed to fetch opportunities');
        }

        const data = await response.json();

        // 🚀 Your API already returns enriched array directly
        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error(
            'Failed to fetch opportunities:',
            error
        );

        return [];
    }
};

// ======================================================
// OPTIONAL HELPERS
// ======================================================

// 🚀 CREATE OPPORTUNITY
export const createOpportunity = async (payload) => {

    try {

        const response = await fetch('/api/opportunity', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data?.message ||
                'Failed to create opportunity'
            );
        }

        return data;

    } catch (error) {

        console.error(
            'Create Opportunity Error:',
            error
        );

        throw error;
    }
};

// 🚀 UPDATE OPPORTUNITY
export const updateOpportunity = async (payload) => {

    try {

        const response = await fetch('/api/opportunity', {

            method: 'PUT',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data?.message ||
                'Failed to update opportunity'
            );
        }

        return data;

    } catch (error) {

        console.error(
            'Update Opportunity Error:',
            error
        );

        throw error;
    }
};

// 🚀 DELETE OPPORTUNITY
export const deleteOpportunity = async (name) => {

    try {

        const response = await fetch(
            `/api/opportunity?name=${encodeURIComponent(name)}`,
            {
                method: 'DELETE'
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data?.message ||
                'Failed to delete opportunity'
            );
        }

        return data;

    } catch (error) {

        console.error(
            'Delete Opportunity Error:',
            error
        );

        throw error;
    }
};