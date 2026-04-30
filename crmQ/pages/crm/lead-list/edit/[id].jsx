import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Paper, Typography, CircularProgress, Button, TextField, Grid, MenuItem, FormControl, InputLabel, Select, CssBaseline } from '@mui/material';

import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import MainLayout from '../../../../src/layouts/main-layout';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';

export default function EditLeadPage({ id }) {
    const router = useRouter();
    //const { id } = router.query;

    const [leadData, setLeadData] = useState({
        salutation: '', first_name: '', middle_name: '', last_name: '', gender: '', job_title: '',
        email_id: '', alternate_email_1: '', alternate_email_2: '', mobile_no: '', whatsapp_no: '', phone: '', phone_ext: '', website: '',
        company_name: '', no_of_employees: '', annual_revenue: '', industry: '', territory: '', market_segment: '',
        city: '', state: '', country: '',
        source: '', request_type: '', type: '', campaign_name: '',
        status: '', lead_stage: '', potential_volume: '', conversion_potential: '', urgency: '', service_location: '', qualified_by: '', qualified_on: '', lead_owner: '',
        message: '', language: '', email_consent: 0, blog_subscriber: 0, disabled: 0
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const requestOptions = [
        { value: 'Product Availability & Delivery Time', label: 'Product Availability' },
        { value: 'Quotation Request', label: 'Quotation Request' },
        { value: 'Technical Information', label: 'Technical Information' },
        { value: 'Service Request', label: 'Service Request' },
        { value: 'Maintenance Support', label: 'Maintenance Support' },
        { value: 'Legal Enquiry', label: 'Legal Enquiry' },
        { value: 'Compliance / Documentation', label: 'Compliance / Documentation' },
        { value: 'Media Enquiry', label: 'Media Enquiry' },
        { value: 'References & Case Studies', label: 'References & Case Studies' },
        { value: 'Press / News', label: 'Press / News' }
    ];

    const typeOptions = [
        { value: 'e-commerce & parcel', label: 'E-commerce & Parcel' },
        { value: 'food & grocery delivery', label: 'Food & Grocery Delivery' },
        { value: 'delivery services', label: 'Delivery Services' },
        { value: 'companies', label: 'Companies' },
        { value: 'Resellers', label: 'Resellers' },
        { value: 'inner-logistics', label: 'Inner-Logistics' },
        { value: 'tourism', label: 'Tourism' },
        { value: 'hotels & event areas', label: 'Hotels & Event Areas' },
        { value: 'people transport', label: 'People Transport' },
        { value: 'urban sharing platforms', label: 'Urban Sharing Platforms' },
        { value: 'rental', label: 'Rental' },
        { value: 'job-bike for companies', label: 'Job-Bike for Companies' },
        { value: 'Reha device', label: 'Reha Device' },
        { value: 'urban logistics', label: 'Urban Logistics' },
        { value: 'public transport', label: 'Public Transport' },
        { value: 'municipal fleets', label: 'Municipal Fleets' },
        { value: 'elderly homes', label: 'Elderly Homes' },
        { value: 'seniors & assisted people', label: 'Seniors & Assisted People' },
        { value: 'commuter & family', label: 'Commuter & Family' },
        { value: 'younster', label: 'Youngster' },
        { value: 'assocciations', label: 'Associations' },
        { value: 'disability riders', label: 'Disability Riders' },
        { value: 'investors', label: 'Investors' },
        { value: 'media', label: 'Media' },
        { value: 'service & maintenance', label: 'Service & Maintenance' },
        { value: 'supplier', label: 'Supplier' },
        { value: 'others', label: 'Others' }
    ];

    // 🚀 EXPERT FIX: Added the new Lead Source options array
    const sourceOptions = [
        { value: 'startup Stuttgart', label: 'Startup Stuttgart' },
        { value: 'intergastra-Stuttgart-02-2026', label: 'Intergastra-Stuttgart-02-2026' },
        { value: 'Website', label: 'Website' },
        { value: 'Walk In', label: 'Walk In' },
        { value: 'Campaign', label: 'Campaign' },
        { value: "Customer's Vendor", label: "Customer's Vendor" },
        { value: 'Mass Mailing', label: 'Mass Mailing' },
        { value: 'Supplier Reference', label: 'Supplier Reference' },
        { value: 'Exhibition', label: 'Exhibition' },
        { value: 'Cold Calling', label: 'Cold Calling' },
        { value: 'Advertisement', label: 'Advertisement' },
        { value: 'Reference', label: 'Reference' },
        { value: 'Existing Customer', label: 'Existing Customer' }
    ];

    const statusOptions = [
        { value: 'New', label: 'New' },
        { value: 'Lead', label: 'Lead' },
        { value: 'Open', label: 'Open' },
        { value: 'Replied', label: 'Replied' },
        { value: 'Opportunity', label: 'Opportunity' },
        { value: 'Hold', label: 'Hold' },
        { value: 'Quotation', label: 'Quotation' },
        { value: 'Lost Quotation', label: 'Lost Quotation' },
        { value: 'Interested', label: 'Interested' },
        { value: 'Converted', label: 'Converted' },
        { value: 'Do Not Contact', label: 'Do Not Contact' },
        { value: 'Completed', label: 'Completed' }
    ];

    const stageOptions = [
        { value: 'Welcome', label: 'Welcome' }, { value: 'Data Gathering', label: 'Data Gathering' },
        { value: 'Requirements and Clarifications', label: 'Requirements' }, { value: 'Demo', label: 'Demo' }
    ];

    const volumeOptions = [
        { value: '1 vehicle', label: '1 vehicle' }, { value: '2-5 vehicle', label: '2-5 vehicle' },
        { value: '6-10 vehicle', label: '6-10 vehicle' }, { value: '25+ vehicle', label: '25+ vehicle' }
    ];

    const urgencyOptions = [
        { value: 'Immediate', label: 'Immediate' }, { value: 'In 1 month', label: 'In 1 month' },
        { value: 'In 3 months', label: 'In 3 months' }, { value: 'In 6 months', label: 'In 6 months' },
        { value: 'In 1 year', label: 'In 1 year' }
    ];

    const conversionOptions = [
        { value: '0 - 25 %', label: '0 - 25 %' }, { value: '26 - 50%', label: '26 - 50%' },
        { value: '51 - 75%', label: '51 - 75%' }, { value: '76 - 100%', label: '76 - 100%' }
    ];

    const marketSegmentOptions = [
        { value: 'B2C', label: 'B2C' },
        { value: 'B2B2B', label: 'B2B2B' },
        { value: 'B2G', label: 'B2G' },
        { value: 'B2B', label: 'B2B' }
    ];

    const industryOptions = [
        { value: 'Tafel', label: 'Tafel' },
        { value: 'Gebäudedienste', label: 'Gebäudedienste' },
        { value: 'Gartenbau', label: 'Gartenbau' },
        { value: 'Fahrradhändler', label: 'Fahrradhändler' },
        { value: 'Privat', label: 'Privat' },
        { value: 'Tourismus', label: 'Tourismus' },
        { value: 'Gastro', label: 'Gastro' },
        { value: 'Metzgerei', label: 'Metzgerei' },
        { value: 'Ots', label: 'Ots' },
        { value: 'Keine', label: 'Keine' },
        { value: 'last mile', label: 'Last Mile' },
        { value: 'Foto', label: 'Foto' },
        { value: 'Information Technology', label: 'Information Technology' },
        { value: 'state', label: 'State' },
        { value: 'testa', label: 'Testa' },
        { value: 'Venture Capital', label: 'Venture Capital' },
        { value: 'Transportation', label: 'Transportation' },
        { value: 'Television', label: 'Television' },
        { value: 'Telecommunications', label: 'Telecommunications' },
        { value: 'Technology', label: 'Technology' },
        { value: 'Sports', label: 'Sports' },
        { value: 'Software', label: 'Software' },
        { value: 'Soap & Detergent', label: 'Soap & Detergent' },
        { value: 'Service', label: 'Service' },
        { value: 'Securities & Commodity Exchanges', label: 'Securities & Commodity Exchanges' },
        { value: 'Retail & Wholesale', label: 'Retail & Wholesale' },
        { value: 'Real Estate', label: 'Real Estate' },
        { value: 'Publishing', label: 'Publishing' },
        { value: 'Private Equity', label: 'Private Equity' },
        { value: 'Pharmaceuticals', label: 'Pharmaceuticals' },
        { value: 'Pension Funds', label: 'Pension Funds' },
        { value: 'Online Auctions', label: 'Online Auctions' },
        { value: 'Newspaper Publishers', label: 'Newspaper Publishers' },
        { value: 'Music', label: 'Music' },
        { value: 'Motion Picture & Video', label: 'Motion Picture & Video' },
        { value: 'Manufacturing', label: 'Manufacturing' },
        { value: 'Legal', label: 'Legal' },
        { value: 'Investment Banking', label: 'Investment Banking' },
        { value: 'Internet Publishing', label: 'Internet Publishing' },
        { value: 'Health Care', label: 'Health Care' },
        { value: 'Grocery', label: 'Grocery' },
        { value: 'Food, Beverage & Tobacco', label: 'Food, Beverage & Tobacco' },
        { value: 'Financial Services', label: 'Financial Services' },
        { value: 'Executive Search', label: 'Executive Search' },
        { value: 'Entertainment & Leisure', label: 'Entertainment & Leisure' },
        { value: 'Energy', label: 'Energy' },
        { value: 'Electronics', label: 'Electronics' },
        { value: 'Education', label: 'Education' },
        { value: 'Department Stores', label: 'Department Stores' },
        { value: 'Defense', label: 'Defense' },
        { value: 'Cosmetics', label: 'Cosmetics' },
        { value: 'Consumer Products', label: 'Consumer Products' },
        { value: 'Consulting', label: 'Consulting' },
        { value: 'Computer', label: 'Computer' },
        { value: 'Chemical', label: 'Chemical' },
        { value: 'Brokerage', label: 'Brokerage' },
        { value: 'Broadcasting', label: 'Broadcasting' },
        { value: 'Biotechnology', label: 'Biotechnology' },
        { value: 'Banking', label: 'Banking' },
        { value: 'Automotive', label: 'Automotive' },
        { value: 'Apparel & Accessories', label: 'Apparel & Accessories' },
        { value: 'Airline', label: 'Airline' },
        { value: 'Agriculture', label: 'Agriculture' },
        { value: 'Aerospace', label: 'Aerospace' },
        { value: 'Advertising', label: 'Advertising' },
        { value: 'Accounting', label: 'Accounting' }
    ];

    const CustomSelect = ({ children, ...props }) => (
        <TextField
            select
            fullWidth
            style={{ width: '100%', minWidth: '100%' }}
            InputProps={{ style: { width: '100%' } }}
            SelectProps={{ style: { width: '100%' } }}
            {...props}
        >
            <MenuItem value=""><em>None</em></MenuItem>
            {children}
        </TextField>
    );

    useEffect(() => {
        if (!id) return;

        const fetchLead = async () => {
            try {
                const response = await fetch('/api/lead');
                const allLeads = await response.json();
                const currentLead = allLeads.find(l => l.name === id);

                if (currentLead) {
                    setLeadData(prev => ({ ...prev, ...currentLead }));
                }
            } catch (error) {
                console.error("Failed to fetch lead:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLead();
    }, [id]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const response = await fetch(`/api/lead/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
            });

            if (response.ok) {
                router.push(`/m/crmq/view-lead/${id}`);
            } else {
                alert("Failed to update lead.");
            }
        } catch (error) {
            console.error("Save Error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLeadData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <Box sx={{ p: 10, textAlign: 'center' }}><CircularProgress /></Box>;

    return (
        // <SettingsProvider>
        //     <ThemeProvider >
        //         <CssBaseline />
        //         <MainLayout>
        <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Paper sx={{ p: { xs: 3, md: 5 }, maxWidth: 1200, mx: 'auto', display: 'block' }}>

                <form onSubmit={handleSave}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 5, pb: 2, borderBottom: '1px solid #eaeaea' }}>
                        <Box>
                            <Typography variant="h4" fontWeight={600} gutterBottom>Edit Lead</Typography>
                            <Typography variant="subtitle1" color="text.secondary">{id}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="large"
                                onClick={() => router.push(`/m/crmq/view-lead/${id}`)}
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

                        {/* PERSONAL INFORMATION */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Personal Information
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Salutation" name="salutation" value={leadData.salutation || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value="Mr">Mr</MenuItem>
                                        <MenuItem value="Mrs">Mrs</MenuItem>
                                        <MenuItem value="Prof">Prof</MenuItem>
                                        <MenuItem value="Master">Master</MenuItem>
                                        <MenuItem value="Dr">Dr</MenuItem>
                                        <MenuItem value="Miss">Miss</MenuItem>
                                        <MenuItem value="Mx">Mx</MenuItem>
                                        <MenuItem value="Ms">Ms</MenuItem>
                                        <MenuItem value="Madam">Madam</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="First Name" name="first_name" value={leadData.first_name || ''} onChange={handleChange} fullWidth required /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Middle Name" name="middle_name" value={leadData.middle_name || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Last Name" name="last_name" value={leadData.last_name || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Gender" name="gender" value={leadData.gender || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value="Male">Male</MenuItem>
                                        <MenuItem value="Female">Female</MenuItem>
                                        <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Job Title" name="job_title" value={leadData.job_title || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* CONTACT DETAILS */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Contact Details
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Primary Email" type="email" name="email_id" value={leadData.email_id || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Alternate Email 1" type="email" name="alternate_email_1" value={leadData.alternate_email_1 || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Alternate Email 2" type="email" name="alternate_email_2" value={leadData.alternate_email_2 || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Mobile No." name="mobile_no" value={leadData.mobile_no || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="WhatsApp" name="whatsapp_no" value={leadData.whatsapp_no || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Phone" name="phone" value={leadData.phone || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Phone Ext." name="phone_ext" value={leadData.phone_ext || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Website URL" type="url" name="website" value={leadData.website || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* ORGANIZATION DETAILS */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Organization Details
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Organization Name" name="company_name" value={leadData.company_name || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Employees" name="no_of_employees" value={leadData.no_of_employees || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value="1-10">1-10</MenuItem>
                                        <MenuItem value="11-50">11-50</MenuItem>
                                        <MenuItem value="51-200">51-200</MenuItem>
                                        <MenuItem value="201-500">201-500</MenuItem>
                                        <MenuItem value="501-1000">501-1000</MenuItem>
                                        <MenuItem value="1000+">1000+</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Annual Revenue" type="number" name="annual_revenue" value={leadData.annual_revenue || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Industry" name="industry" value={leadData.industry || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {industryOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Territory" name="territory" value={leadData.territory || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Market Segment" name="market_segment" value={leadData.market_segment || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {marketSegmentOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* ADDRESS DETAILS */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Address Details
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}><TextField label="City" name="city" value={leadData.city || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="State/Province" name="state" value={leadData.state || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Country" name="country" value={leadData.country || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* CLASSIFICATION */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Classification
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Source" name="source" value={leadData.source || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {sourceOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Request Type" name="request_type" value={leadData.request_type || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {requestOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Lead Type" name="type" value={leadData.type || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {typeOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Campaign Name" name="campaign_name" value={leadData.campaign_name || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* QUALIFICATION & STATUS */}
                        <Box sx={{ mb: 6 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Qualification & Status
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Status" name="status" value={leadData.status || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {statusOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Lead Stage" name="lead_stage" value={leadData.lead_stage || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {stageOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Urgency" name="urgency" value={leadData.urgency || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {urgencyOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Potential Volume" name="potential_volume" value={leadData.potential_volume || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {volumeOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Conversion Potential" name="conversion_potential" value={leadData.conversion_potential || ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {conversionOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Service Location" name="service_location" value={leadData.service_location || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Qualified By" name="qualified_by" value={leadData.qualified_by || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Qualified On" type="date" name="qualified_on" value={leadData.qualified_on || ''} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Lead Owner" name="lead_owner" value={leadData.lead_owner || ''} onChange={handleChange} fullWidth /></Grid>
                            </Grid>
                        </Box>

                        {/* ADDITIONAL INFO */}
                        <Box>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
                                Additional Information
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}><TextField label="Print Language" name="language" value={leadData.language || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Email Consent" name="email_consent" value={leadData.email_consent !== undefined ? leadData.email_consent : ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value={1}>Yes</MenuItem>
                                        <MenuItem value={0}>No</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select label="Blog Subscriber" name="blog_subscriber" value={leadData.blog_subscriber !== undefined ? leadData.blog_subscriber : ''} onChange={handleChange} fullWidth>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value={1}>Yes</MenuItem>
                                        <MenuItem value={0}>No</MenuItem>
                                    </TextField>
                                </Grid>
                                {/* The Message field is the only one set to md=12 so it spans the whole bottom row */}
                                <Grid item xs={12}><TextField label="Message" name="message" value={leadData.message || ''} onChange={handleChange} fullWidth multiline rows={3} /></Grid>
                            </Grid>
                        </Box>

                    </Box>
                </form>

            </Paper>
        </Box>
        //         </MainLayout>
        //     </ThemeProvider>
        // </SettingsProvider>
    );
}