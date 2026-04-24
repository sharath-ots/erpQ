import { Typography, Link, Chip, Stack } from '@mui/material';
import CopyableText from '@/shared-ui/components/sections/crm/common/CopyableText';

export const mapLeadToGroupedInfo = (lead) => {
    if (!lead) return null;

    // Helper to render N/A nicely
    const renderValue = (val) => val ? <Typography variant="body2">{val}</Typography> : <Typography variant="body2" color="text.secondary">N/A</Typography>;

    return {
        personalInfo: [
            { label: 'Salutation', value: renderValue(lead.salutation) },
            { label: 'First Name', value: renderValue(lead.first_name) },
            { label: 'Middle Name', value: renderValue(lead.middle_name) },
            { label: 'Last Name', value: renderValue(lead.last_name) },
            { label: 'Gender', value: renderValue(lead.gender) },
            { label: 'Job Title', value: renderValue(lead.job_title) },
        ],
        contactDetails: [
            {
                label: 'Primary Email',
                value: lead.email_id ? <CopyableText text={lead.email_id} link href={`mailto:${lead.email_id}`} /> : renderValue(null)
            },
            { label: 'Alternate Email 1', value: renderValue(lead.alternate_email_1) },
            { label: 'Alternate Email 2', value: renderValue(lead.alternate_email_2) },
            {
                label: 'Mobile No.',
                value: lead.mobile_no ? <CopyableText text={lead.mobile_no} link href={`tel:${lead.mobile_no}`} /> : renderValue(null)
            },
            {
                label: 'WhatsApp',
                value: lead.whatsapp_no ? <CopyableText text={lead.whatsapp_no} link href={`https://wa.me/${lead.whatsapp_no.replace(/[^0-9]/g, '')}`} /> : renderValue(null)
            },
            { label: 'Phone', value: renderValue(lead.phone) },
            { label: 'Phone Ext.', value: renderValue(lead.phone_ext) },
            {
                label: 'Website',
                value: lead.website ? <Link href={lead.website} target="_blank">{lead.website}</Link> : renderValue(null)
            },
        ],
        organizationDetails: [
            {
                label: 'Organization Name',
                value: lead.company_name ? <Link href={lead.website_url || '#!'} underline="hover">{lead.company_name}</Link> : renderValue(null)
            },
            { label: 'Employees', value: renderValue(lead.no_of_employees) },
            { label: 'Annual Revenue', value: renderValue(lead.annual_revenue) },
            { label: 'Industry', value: renderValue(lead.industry) },
            { label: 'Territory', value: renderValue(lead.territory) },
            { label: 'Market Segment', value: renderValue(lead.market_segment) },
        ],
        addressDetails: [
            { label: 'City', value: renderValue(lead.city) },
            { label: 'State/Province', value: renderValue(lead.state) },
            { label: 'Country', value: renderValue(lead.country) },
        ],
        classification: [
            { label: 'Source', value: renderValue(lead.source) },
            { label: 'Request Type', value: renderValue(lead.request_type) },
            { label: 'Lead Type', value: renderValue(lead.type) },
            { label: 'Campaign Name', value: renderValue(lead.campaign_name) },
        ],
        qualification: [
            { label: 'Status', value: <Chip label={lead.status || 'Open'} variant="outlined" size="small" /> },
            { label: 'Lead Stage', value: renderValue(lead.lead_stage) },
            { label: 'Potential Volume', value: renderValue(lead.potential_volume) },
            { label: 'Conversion Potential', value: renderValue(lead.conversion_potential) },
            { label: 'Urgency', value: renderValue(lead.urgency) },
            { label: 'Service Location', value: renderValue(lead.service_location) },
            { label: 'Qualified By', value: renderValue(lead.qualified_by) },
            { label: 'Qualified On', value: renderValue(lead.qualified_on) },
            { label: 'Lead Owner', value: <Chip label={lead.lead_owner || 'Unassigned'} variant="soft" color="primary" size="small" /> },
        ],
        additionalInfo: [
            { label: 'Message', value: renderValue(lead.message) },
            { label: 'Language', value: renderValue(lead.language) },
            { label: 'Email Consent', value: renderValue(lead.email_consent === 1 ? 'Yes' : 'No') },
            { label: 'Blog Subscriber', value: renderValue(lead.blog_subscriber === 1 ? 'Yes' : 'No') },
            { label: 'Disabled', value: renderValue(lead.disabled === 1 ? 'Yes' : 'No') },
        ]
    };
};