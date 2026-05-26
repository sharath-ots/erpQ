import { Typography, Link, Chip } from '@mui/material';
import CopyableText from '@/shared-ui/components/sections/crm/common/CopyableText';

export const mapOpportunityToGroupedInfo = (opp) => {
    if (!opp) return null;

    // Helper to render N/A nicely
    const renderValue = (val) => val ? <Typography variant="body2">{val}</Typography> : <Typography variant="body2" color="text.secondary">N/A</Typography>;

    return {
        targetParty: [
            { label: 'Opportunity From', value: renderValue(opp.opportunity_from) },
            { label: 'Party Name', value: renderValue(opp.party_name) },
            { label: 'Contact Person', value: renderValue(opp.contact_person) },
            { label: 'Job Title', value: renderValue(opp.job_title) },
        ],
        contactDetails: [
            {
                label: 'Contact Email',
                value: opp.contact_email ? <CopyableText text={opp.contact_email} link href={`mailto:${opp.contact_email}`} /> : renderValue(null)
            },
            {
                label: 'Contact Mobile',
                value: opp.contact_mobile ? <CopyableText text={opp.contact_mobile} link href={`tel:${opp.contact_mobile}`} /> : renderValue(null)
            },
            {
                label: 'WhatsApp',
                value: opp.whatsapp ? <CopyableText text={opp.whatsapp} link href={`https://wa.me/${opp.whatsapp.replace(/[^0-9]/g, '')}`} /> : renderValue(null)
            },
            { label: 'Phone', value: renderValue(opp.phone) },
            { label: 'Phone Ext.', value: renderValue(opp.phone_ext) },
        ],
        organizationDetails: [
            {
                label: 'Company (Internal)',
                value: opp.company ? <Typography variant="body2" fontWeight={600}>{opp.company}</Typography> : renderValue(null)
            },
            { label: 'Customer Group', value: renderValue(opp.customer_group) },
            { label: 'Industry', value: renderValue(opp.industry) },
            { label: 'Employees', value: renderValue(opp.no_of_employees) },
            { label: 'Annual Revenue', value: renderValue(opp.annual_revenue) },
            {
                label: 'Website',
                value: opp.website ? <Link href={opp.website} target="_blank">{opp.website}</Link> : renderValue(null)
            },
        ],
        marketLocation: [
            { label: 'Territory', value: renderValue(opp.territory) },
            { label: 'Market Segment', value: renderValue(opp.market_segment) },
            { label: 'City', value: renderValue(opp.city) },
            { label: 'State/Province', value: renderValue(opp.state) },
            { label: 'Country', value: renderValue(opp.country) },
        ],
        opportunityDetails: [
            { label: 'Status', value: <Chip label={opp.status || 'Open'} variant="outlined" size="small" color={opp.status === 'Converted' ? 'success' : opp.status === 'Lost' ? 'error' : 'default'} /> },
            { label: 'Naming Series', value: renderValue(opp.naming_series) },
            { label: 'Opportunity Date', value: renderValue(opp.transaction_date) },
            { label: 'Opportunity Type', value: renderValue(opp.opportunity_type) },
            { label: 'Sales Stage', value: renderValue(opp.sales_stage) },
            { label: 'Probability', value: opp.probability ? renderValue(`${opp.probability}%`) : renderValue(null) },
            { label: 'Expected Closing', value: renderValue(opp.expected_closing) },
        ],
        valueCurrency: [
            { label: 'Currency', value: renderValue(opp.currency) },
            { label: 'Opportunity Amount', value: renderValue(opp.opportunity_amount) },
            { label: 'Exchange Rate', value: renderValue(opp.conversion_rate) },
        ],
        marketingOwnership: [
            { label: 'Source', value: renderValue(opp.source) },
            { label: 'Campaign Name', value: renderValue(opp.campaign) },
            { label: 'Opportunity Owner', value: <Chip label={opp.opportunity_owner || 'Unassigned'} variant="soft" color="primary" size="small" /> },
            { label: 'Language', value: renderValue(opp.language) },
        ]
    };
};