export const fetchLeadListAdmin = async () => {
    try {
        const response = await fetch('/api/lead');
        if (!response.ok) throw new Error('Failed to fetch from local API');

        const rawLeads = await response.json();

        return rawLeads.map((lead) => ({
            id: lead.name,
            name: lead.lead_name || 'No Name',
            email: lead.email_id || 'N/A',
            status: lead.status || 'Open',
            company: lead.company_name || 'N/A',
            territory: lead.territory || 'N/A',
            image: {
                src: `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.lead_name || 'L')}&background=random`
            },
            creation: lead.creation,
            modified: lead.modified,
            owner: lead.lead_owner,
            urgency: lead.urgency,
            potential_volume: lead.potential_volume,
            conversion_potential: lead.conversion_potential,
            custom_unreplied_email: lead.custom_unreplied_email,
            source: lead.source
        }));

    } catch (error) {
        console.error("Frontend Mapping Error:", error);
        return [];
    }
};