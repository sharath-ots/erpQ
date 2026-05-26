import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Paper, Typography, CircularProgress, Button, TextField, Grid, MenuItem } from '@mui/material';

// 🚀 IMPORT THE CUSTOM HOOK
import { useERPDropdown } from '../../../../src/hooks/useERPDropdown';

export default function EditOpportunityPage({ id }) {
    const router = useRouter();

    const [oppData, setOppData] = useState({
        opportunity_from: '', party_name: '', contact_person: '', job_title: '',

        contact_email: '', contact_mobile: '', whatsapp: '', phone: '', phone_ext: '',

        company: '', customer_group: '', industry: '', no_of_employees: '', annual_revenue: '', website: '',

        territory: '', market_segment: '', city: '', state: '', country: '',

        naming_series: '', transaction_date: '', opportunity_type: '', status: '',

        sales_stage: '', probability: '', expected_closing: '', currency: '', opportunity_amount: '', conversion_rate: '',

        source: '', campaign: '', opportunity_owner: '', language: ''
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 🚀 USE THE CUSTOM HOOK FOR DYNAMIC DROPDOWNS
    const { options: opportunityTypeOptions } = useERPDropdown('Opportunity Type');
    const { options: salesStageOptions } = useERPDropdown('Sales Stage');
    const { options: sourceOptions } = useERPDropdown('Lead Source');
    const { options: industryOptions } = useERPDropdown('Industry Type');
    const { options: marketSegmentOptions } = useERPDropdown('Market Segment');
    const { options: currencyOptions } = useERPDropdown('Currency');

    // Hardcoded options for logic/system-locked fields
    const opportunityFromOptions = [
        { value: 'Customer', label: 'Customer' },
        { value: 'Lead', label: 'Lead' },
        { value: 'Prospect', label: 'Prospect' }
    ];

    const statusOptions = [
        { value: 'Open', label: 'Open' },
        { value: 'Quotation', label: 'Quotation' },
        { value: 'Converted', label: 'Converted' },
        { value: 'Lost', label: 'Lost' },
        { value: 'Replied', label: 'Replied' },
        { value: 'Closed', label: 'Closed' }
    ];

    const employeeOptions = [
        { value: '1-10', label: '1-10' },
        { value: '11-50', label: '11-50' },
        { value: '51-200', label: '51-200' },
        { value: '201-500', label: '201-500' },
        { value: '501-1000', label: '501-1000' },
        { value: '1000+', label: '1000+' }
    ];

    useEffect(() => {
        if (!id) return;

        const fetchOpportunity = async () => {
            try {
                const response = await fetch('/api/opportunity'); 
                const allOpps = await response.json();
                const currentOpp = allOpps.find(o => o.name === id);

                if (currentOpp) {
                    setOppData(prev => ({ ...prev, ...currentOpp }));
                }
            } catch (error) {
                console.error("Failed to fetch opportunity:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOpportunity();
    }, [id]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        // Helper function to safely send null instead of empty strings to ERPNext
        const cleanVal = (val) => (val === "" || val === undefined ? null : val);

        const erpPayload = {
            name: id, // 🚀 CRITICAL: Passing the ID in the body for the API route

            // Step 1: Contact
            opportunity_from: cleanVal(oppData.opportunity_from),
            party_name: cleanVal(oppData.party_name),
            contact_person: cleanVal(oppData.contact_person),
            job_title: cleanVal(oppData.job_title),
            contact_email: cleanVal(oppData.contact_email),
            contact_mobile: cleanVal(oppData.contact_mobile),
            phone: cleanVal(oppData.phone),
            whatsapp: cleanVal(oppData.whatsapp),
            phone_ext: cleanVal(oppData.phone_ext),

            // Step 2: Organization
            company: cleanVal(oppData.company) || "CityQ", 
            customer_group: cleanVal(oppData.customer_group),
            territory: cleanVal(oppData.territory),
            industry: cleanVal(oppData.industry),
            market_segment: cleanVal(oppData.market_segment),
            no_of_employees: cleanVal(oppData.no_of_employees),
            annual_revenue: Number(oppData.annual_revenue) || 0,
            website: cleanVal(oppData.website),
            city: cleanVal(oppData.city),
            state: cleanVal(oppData.state),
            country: cleanVal(oppData.country),

            // Step 3: Opportunity Details
            naming_series: cleanVal(oppData.naming_series) || 'CRM-OPP-.YYYY.-',
            
            // 🚀 CRITICAL: Fix Date Formatting for ERPNext
            transaction_date: oppData.transaction_date ? oppData.transaction_date.split('T')[0] : null,
            expected_closing: oppData.expected_closing ? oppData.expected_closing.split('T')[0] : null,
            
            opportunity_type: cleanVal(oppData.opportunity_type),
            status: cleanVal(oppData.status) || 'Open',
            sales_stage: cleanVal(oppData.sales_stage),
            probability: Number(oppData.probability) || 0,
            currency: cleanVal(oppData.currency),
            opportunity_amount: Number(oppData.opportunity_amount) || 0,
            conversion_rate: Number(oppData.conversion_rate) || 1,
            source: cleanVal(oppData.source),
            campaign: cleanVal(oppData.campaign),
            opportunity_owner: cleanVal(oppData.opportunity_owner),
            language: cleanVal(oppData.language),
        };

        try {
            // 🚀 CRITICAL FIX: Removed `/${id}`. Your API route handles PUT at `/api/opportunity` using the `name` from the body payload.
            const response = await fetch('/api/opportunity', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(erpPayload)
            });

            // 🚀 SAFELY PARSE JSON to prevent "Unexpected token '<'" crash on 404/500 HTML pages
            const text = await response.text();
            let result = {};
            try { result = JSON.parse(text); } catch (err) {}

            if (!response.ok) {
                let errorMessage = 'Failed to update opportunity in ERPNext';
                
                if (result.exc_type) {
                    errorMessage = `ERP Error (${result.exc_type}): Please verify that text entered in Link fields exactly match existing records.`;
                } else if (result._server_messages) {
                    try {
                        const messages = JSON.parse(result._server_messages);
                        const parsedMsg = JSON.parse(messages[0]);
                        errorMessage = parsedMsg.message || errorMessage;
                    } catch (e) {
                        errorMessage = "Validation Error. Check console for details.";
                    }
                } else if (result.message) {
                    errorMessage = result.message;
                } else if (result.error) {
                    errorMessage = result.error;
                }
                
                throw new Error(errorMessage);
            }

            alert('Opportunity updated successfully!');
            router.push(`/m/crmq/view-opportunity/${id}`);
        } catch (error) {
            console.error("Save Error:", error);
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setOppData(prev => ({ ...prev, [name]: value }));
    };

    // Helper for safe DatePicker strings 
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const safeDate = value ? value.split('T')[0] : '';
        setOppData(prev => ({ ...prev, [name]: safeDate }));
    }


    if (loading) return <Box sx={{ p: 10, textAlign: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Paper sx={{ p: { xs: 3, md: 5 }, maxWidth: 1200, mx: 'auto', display: 'block' }}>

                <form onSubmit={handleSave}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 5, pb: 2, borderBottom: '1px solid #eaeaea' }}>
                        <Box>
                            <Typography variant="h4" fontWeight={600} gutterBottom>Edit Opportunity</Typography>
                            <Typography variant="subtitle1" color="text.secondary">{id}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="large"
                                onClick={() => router.push(`/m/crmq/view-opportunity/${id}`)}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="large"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Box>
                    </Box>

                    {/* --- FORM BODY --- */}
                    <Box sx={{ display: 'block' }}>

                        {/* TARGET PARTY & PRIMARY CONTACT */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Target Party & Primary Contact
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <TextField select label="Opportunity From" name="opportunity_from" value={oppData.opportunity_from || ''} onChange={handleChange} fullWidth required>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {opportunityFromOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Party Name" name="party_name" value={oppData.party_name || ''} onChange={handleChange} fullWidth required /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Contact Person" name="contact_person" value={oppData.contact_person || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Job Title" name="job_title" value={oppData.job_title || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* CONTACT DETAILS */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Contact Details
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Contact Email" type="email" name="contact_email" value={oppData.contact_email || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Contact Mobile" name="contact_mobile" value={oppData.contact_mobile || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Phone" name="phone" value={oppData.phone || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="WhatsApp" name="whatsapp" value={oppData.whatsapp || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Phone Ext." name="phone_ext" value={oppData.phone_ext || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* ORGANIZATION DETAILS */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Organization Details
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Company (Internal)" name="company" value={oppData.company || ''} onChange={handleChange} fullWidth required /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Customer Group" name="customer_group" value={oppData.customer_group || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    {/* 🚀 Dynamic Industry Options */}
                                    <TextField select label="Industry" name="industry" value={oppData.industry || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {industryOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <TextField select label="Employees" name="no_of_employees" value={oppData.no_of_employees || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {employeeOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Annual Revenue" type="number" name="annual_revenue" value={oppData.annual_revenue || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Website URL" type="url" name="website" value={oppData.website || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* MARKET & LOCATION */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Market & Location
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Territory" name="territory" value={oppData.territory || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    {/* 🚀 Dynamic Market Segment Options */}
                                    <TextField select label="Market Segment" name="market_segment" value={oppData.market_segment || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {marketSegmentOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="City" name="city" value={oppData.city || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="State/Province" name="state" value={oppData.state || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Country" name="country" value={oppData.country || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* OPPORTUNITY DETAILS */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Opportunity Details & Sales Cycle
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Naming Series" name="naming_series" value={oppData.naming_series || 'CRM-OPP-.YYYY.-'} onChange={handleChange} fullWidth required /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Opportunity Date" type="date" name="transaction_date" value={oppData.transaction_date || ''} onChange={handleDateChange} fullWidth required InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <TextField select label="Status" name="status" value={oppData.status || ''} onChange={handleChange} fullWidth required>
                                        {statusOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    {/* 🚀 Dynamic Opportunity Type Options */}
                                    <TextField select label="Opportunity Type" name="opportunity_type" value={oppData.opportunity_type || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {opportunityTypeOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    {/* 🚀 Dynamic Sales Stage Options */}
                                    <TextField select label="Sales Stage" name="sales_stage" value={oppData.sales_stage || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {salesStageOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Probability (%)" type="number" name="probability" value={oppData.probability || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Expected Closing Date" type="date" name="expected_closing" value={oppData.expected_closing || ''} onChange={handleDateChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                            </Grid>
                        </Box>

                        {/* VALUE & CURRENCY */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Value & Currency
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    {/* 🚀 Dynamic Currency Options */}
                                    <TextField select label="Currency" name="currency" value={oppData.currency || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {currencyOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Opportunity Amount" type="number" name="opportunity_amount" value={oppData.opportunity_amount || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Exchange Rate" type="number" name="conversion_rate" value={oppData.conversion_rate || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* MARKETING & OWNERSHIP */}
                        <Box>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Marketing & Ownership
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    {/* 🚀 Dynamic Source Options */}
                                    <TextField select label="Source" name="source" value={oppData.source || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {sourceOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Campaign Name" name="campaign" value={oppData.campaign || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Opportunity Owner" name="opportunity_owner" value={oppData.opportunity_owner || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField label="Language" name="language" value={oppData.language || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                    </Box>
                </form>

            </Paper>
        </Box>
    );
}