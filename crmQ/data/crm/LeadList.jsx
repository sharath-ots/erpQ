import { useMemo, useState, useEffect, useCallback } from 'react';
import {
    Box, Chip, Stack, Typography, Button, TextField,
    MenuItem, Menu, Avatar, IconButton, Select, InputAdornment,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, CircularProgress,
    ToggleButton, ToggleButtonGroup, Tooltip, Checkbox, Pagination, Card
} from '@mui/material';
import { DataGrid, GRID_CHECKBOX_SELECTION_COL_DEF, gridClasses } from '@mui/x-data-grid';
import { useSearchParams } from 'next/navigation';

import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import { fetchLeadListAdmin } from '../../data/crm/lead';
import AdvancedFilterPopover from '../../components/common/AdvancedFilterPopover';
import { applyFrappeFilters } from '../../src/helpers/filterUtils';
import { useLead } from '../../src/contexts/LeadContext';
import LeadDetailPanels from '../../components/ActivityTab/LeadDetailPanels';

const defaultPageSize = 15;

const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

const getInitials = (name) => {
    if (!name) return 'L';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const LEAD_STATUSES = ['All', 'Lead', 'Open', 'Replied', 'Opportunity', 'Hold', 'Quotation', 'Lost Quotation', 'Interested', 'Converted', 'Do Not Contact', 'Completed'];
const SORT_OPTIONS = ['Last Updated On', 'Title', 'ID', 'Created On', 'Most Used', 'Lead Owner', 'Email', 'Organization Name', 'Status', 'Lead Stage'];

const LeadsTable = ({ onLeadClick }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOrgTerm, setSearchOrgTerm] = useState('');
    const [activeStatus, setActiveStatus] = useState('All');
    const [sortAnchor, setSortAnchor] = useState(null);
    const [activeSort, setActiveSort] = useState('Last Updated On');
    const searchParams = useSearchParams();

    const [viewMode, setViewMode] = useState('grid');
    const [listZoom, setListZoom] = useState(0);

    const [paginationModel, setPaginationModel] = useState({ pageSize: defaultPageSize, page: 0 });
    const [selectedLeadIds, setSelectedLeadIds] = useState([]);

    const { selectedDetailLeadId, setSelectedDetailLeadId, activeDetailTab, setLeadCounts } = useLead();

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [emailGroups, setEmailGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [isFetchingGroups, setIsFetchingGroups] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const [advancedFilters, setAdvancedFilters] = useState([]);

    const getLeads = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchLeadListAdmin();
            const safeData = Array.isArray(data) ? data : [];

            const formattedData = safeData.map((item, index) => {
                // 🚀 FIX: Strip out the time, leaving only YYYY-MM-DD
                const cleanCreation = item.creation ? String(item.creation).split(' ')[0].split('T')[0] : null;
                const cleanModified = item.modified ? String(item.modified).split(' ')[0].split('T')[0] : null;

                return {
                    ...item,
                    id: String(item.id || item.name || `fallback-id-${index}`),
                    realId: item.name || item.id,
                    displayName: item.lead_name || item.name || 'Unknown',
                    company: item.company || item.company_name || 'N/A',
                    creation: cleanCreation,
                    modified: cleanModified, // 🚀 Added clean modified date
                    source: item.source || ''
                };
            });
            setRows(formattedData);

            setLeadCounts({
                all: formattedData.length,
                new: applyFrappeFilters(formattedData, [{ field: 'status', operator: '=', value: 'New' }]).length,
                urgent: applyFrappeFilters(formattedData, [[{ field: 'urgency', operator: 'in', value: 'Immediate, In 1 month' }, { field: 'custom_unreplied_email', operator: '=', value: '1' }]]).length,
                hot: applyFrappeFilters(formattedData, [[{ field: 'potential_volume', operator: 'in', value: '11-25 vehicle, 25+ vehicle' }, { field: 'conversion_potential', operator: 'in', value: '51 - 75%, 76 - 100%' }]]).length,
                archived: applyFrappeFilters(formattedData, [{ field: 'status', operator: 'in', value: 'Lost Quotation, Do Not Contact, Completed, Hold' }]).length
            });
        } catch (error) {
            console.error("Failed to fetch leads:", error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [setLeadCounts]);

    useEffect(() => { getLeads(); }, [getLeads]);

    useEffect(() => {
        if (isGroupModalOpen && emailGroups.length === 0) {
            const fetchGroups = async () => {
                setIsFetchingGroups(true);
                try {
                    const res = await fetch('/api/email-groups');
                    const data = await res.json();
                    setEmailGroups(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error("Failed to fetch email groups", error);
                } finally {
                    setIsFetchingGroups(false);
                }
            };
            fetchGroups();
        }
    }, [isGroupModalOpen, emailGroups.length]);

    const navigateTo = (path) => {
        if (typeof window === 'undefined') return;
        window.location.assign(path);
    };

    useEffect(() => {
        const filtersQuery = searchParams?.get('filters');
        if (filtersQuery) {
            try {
                const incomingFilters = JSON.parse(filtersQuery);
                setAdvancedFilters(incomingFilters);
                if (typeof window !== 'undefined') {
                    const basePath = window.location.pathname.startsWith('/m/crmq') ? '/m/crmq/list/Lead' : '/crm/lead-list';
                    window.history.replaceState(null, '', basePath);
                }
            } catch (error) {
                console.error("Failed to parse URL filters:", error);
            }
        }
    }, [searchParams]);

    const handleAddToGroup = async () => {
        let safeIds = Array.isArray(selectedLeadIds) ? selectedLeadIds : Array.from(selectedLeadIds || []);
        if (!selectedGroup || safeIds.length === 0) return;

        setIsSubmitting(true);
        try {
            const emailsToSubmit = rows.filter(row => safeIds.includes(row.id)).map(row => row.email_id || row.email).filter(Boolean);

            if (emailsToSubmit.length === 0) { alert("The selected leads do not have email addresses."); setIsSubmitting(false); return; }

            const res = await fetch('/api/add-to-email-group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email_group: selectedGroup, emails: emailsToSubmit }) });

            if (res.ok) { alert("Successfully added leads to Email Group!"); setIsGroupModalOpen(false); setSelectedGroup(''); setSelectedLeadIds([]); }
            else { alert("Failed to add some leads. Check console."); }
        } catch (error) { console.error("Submission error", error); } finally { setIsSubmitting(false); }
    };

    const dynamicFilterFields = useMemo(() => {
        if (!rows || rows.length === 0) return [];
        const fakeReactFields = ['id', 'realId', 'displayName', 'company', 'avatar'];
        const keys = Object.keys(rows[0]).filter(key => !fakeReactFields.includes(key));

        let fields = keys.map(key => {
            // Clean up names
            let label = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            if (key === 'creation') label = 'Created On';
            if (key === 'modified') label = 'Last Updated On';
            if (key === 'name') label = 'Lead ID';
            if (key === 'owner') label = 'Created By';
            if (key === 'lead_name') label = 'Lead Name';
            if (key === 'company_name') label = 'Organization';
            if (key === 'email_id') label = 'Email';
            // 🚀 Ensure beautiful label for Source
            if (key === 'source') label = 'Lead Source';

            let fieldDef = { label, value: key };

            // Apply specific dropdown options
            if (key === 'conversion_potential') {
                fieldDef.options = ['0 - 25 %', '26 - 50%', '51 - 75%', '76 - 100%'];
            }
            if (key === 'potential_volume') {
                fieldDef.options = ['1 vehicle', '2-5 vehicle', '6-10 vehicle', '11-25 vehicle', '25+ vehicle'];
            }
            // 🚀 Extract actual sources dynamically from all your leads
            if (key === 'source') {
                const uniqueSources = Array.from(new Set(rows.map(r => r.source).filter(Boolean)));
                fieldDef.options = uniqueSources.length > 0 ? uniqueSources.sort() : ['Direct'];
            }

            return fieldDef;
        });

        // Ensure critical fields always show up even if data is totally empty
        const ensureFieldExists = (val, lab) => {
            if (!fields.find(f => f.value === val)) fields.push({ label: lab, value: val });
        };
        ensureFieldExists('creation', 'Created On');
        ensureFieldExists('modified', 'Last Updated On');
        ensureFieldExists('name', 'Lead ID');
        ensureFieldExists('status', 'Status');
        ensureFieldExists('lead_owner', 'Lead Owner');

        return fields.sort((a, b) => a.label.localeCompare(b.label));
    }, [rows]);

    const filteredRows = useMemo(() => {
        let result = rows.filter((row) => {
            const matchesName = row.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || row.id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesOrg = row.company?.toLowerCase().includes(searchOrgTerm.toLowerCase());
            const matchesStatus = activeStatus === 'All' || row.status === activeStatus;
            return matchesName && matchesOrg && matchesStatus;
        });
        result = applyFrappeFilters(result, advancedFilters);
        return [...result].sort((a, b) => {
            switch (activeSort) {
                case 'Title': return (a.displayName || '').localeCompare(b.displayName || '');
                case 'ID': return (a.id || '').localeCompare(b.id || '');
                case 'Status': return (a.status || '').localeCompare(b.status || '');
                case 'Organization Name': return (a.company || '').localeCompare(b.company || '');
                case 'Lead Owner': return (a.owner || '').localeCompare(b.owner || '');
                case 'Email': return (a.email_id || a.email || '').localeCompare(b.email_id || b.email || '');
                case 'Lead Stage': return (a.lead_stage || '').localeCompare(b.lead_stage || '');
                case 'Last Updated On': return new Date(b.modified || 0) - new Date(a.modified || 0);
                case 'Created On': return new Date(b.creation || 0) - new Date(a.creation || 0);
                case 'Most Used': return (b.idx || 0) - (a.idx || 0);
                default: return 0;
            }
        });
    }, [rows, searchTerm, searchOrgTerm, activeStatus, activeSort, advancedFilters]);

    const columns = useMemo(() => [
        { ...GRID_CHECKBOX_SELECTION_COL_DEF, width: 64 },
        { field: 'displayName', headerName: 'Name', minWidth: 350, flex: 1, renderCell: (params) => { const name = params.row.displayName || params.row.name || 'Unknown'; const color = stringToColor(name); return (<Stack spacing={1.5} direction="row" sx={{ alignItems: 'center', height: '100%' }}><Avatar variant="rounded" sx={{ width: 40, height: 40, fontSize: '0.85rem', fontWeight: 700, bgcolor: color, color: '#fff', borderRadius: 1.5 }}>{getInitials(name)}</Avatar><Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}>{name}</Typography></Stack>); } },
        { field: 'status', headerName: 'Status', minWidth: 120, renderCell: (params) => (<Chip variant="outlined" color="success" label={params.row.status || 'Open'} size="small" sx={{ fontWeight: 700, fontSize: '0.75rem' }} />) },
        { field: 'company', headerName: 'Organization', minWidth: 200, renderCell: (params) => <Typography variant="body2" sx={{ color: 'text.secondary' }}>{params.row.company || 'N/A'}</Typography> }
    ], []);

    return (
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ width: '100%', maxWidth: '100vw', height: '100%', overflow: 'hidden', bgcolor: 'background.default', boxSizing: 'border-box' }}>

            {/* --- LEFT PANEL: LIST --- */}
            <Box sx={{
                // 🚀 RESPONSIVE FIX: This completely hides the List view on Mobile if a detail is selected
                display: selectedDetailLeadId ? { xs: 'none', md: 'flex' } : 'flex',
                flex: selectedDetailLeadId ? { xs: '1 1 auto', md: '0 0 350px' } : 1,
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                p: { xs: 2, sm: 3 },
                bgcolor: 'background.default',
                borderRight: { md: selectedDetailLeadId ? 1 : 0 },
                borderColor: 'divider',
                height: '100%',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                boxSizing: 'border-box'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexShrink: 0, flexWrap: 'wrap', gap: 1, maxWidth: '100%' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Lead list</Typography>
                    {!selectedDetailLeadId && (
                        <Button variant="contained" color="primary" onClick={() => navigateTo('/m/crmq/add-lead')} sx={{ borderRadius: 2, px: { xs: 2, sm: 3 }, py: { xs: 1, sm: 1.2 }, fontWeight: 700, textTransform: 'none', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Add lead</Button>
                    )}
                </Stack>

                <Stack direction="column" spacing={1.5} sx={{ mb: 1.5, flexShrink: 0, maxWidth: '100%' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ width: '100%', maxWidth: '100%' }}>
                        <TextField placeholder="Search lead name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start" /> }} sx={{ flexGrow: 1, width: '100%', minWidth: { sm: 150 }, '& .MuiOutlinedInput-root': { bgcolor: 'action.hover', borderRadius: 2, height: 40, '& fieldset': { border: 'none' } } }} />
                        {selectedDetailLeadId && (
                            <Tooltip title="Advanced Filters">
                                <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)} sx={{ bgcolor: advancedFilters.length > 0 ? 'action.selected' : 'action.hover', color: advancedFilters.length > 0 ? 'primary.main' : 'text.secondary', borderRadius: 2, width: 40, height: 40, alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
                                    <IconifyIcon icon="material-symbols:filter-list-rounded" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {!selectedDetailLeadId && (
                            <TextField placeholder="Search organization name" value={searchOrgTerm} onChange={(e) => setSearchOrgTerm(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start" /> }} sx={{ flexGrow: 1, width: '100%', minWidth: { sm: 150 }, '& .MuiOutlinedInput-root': { bgcolor: 'action.hover', borderRadius: 2, height: 40, '& fieldset': { border: 'none' } } }} />
                        )}
                    </Stack>

                    {!selectedDetailLeadId && (
                        <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1, width: '100%' }}>
                            <ToggleButtonGroup value={viewMode} exclusive onChange={(_e, newMode) => { if (newMode !== null) setViewMode(newMode); }} size="small" sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1 } }}>
                                <Tooltip title="Table View"><ToggleButton value="table"><IconifyIcon icon="material-symbols:table-rows-rounded" /></ToggleButton></Tooltip>
                                <Tooltip title="Compact List"><ToggleButton value="compact"><IconifyIcon icon="material-symbols:view-list-rounded" /></ToggleButton></Tooltip>
                                <Tooltip title="Grid View"><ToggleButton value="grid"><IconifyIcon icon="material-symbols:grid-view-rounded" /></ToggleButton></Tooltip>
                            </ToggleButtonGroup>
                            <Select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)} displayEmpty size="small" renderValue={(selected) => <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{selected === 'All' || !selected ? 'Status' : selected}</Typography>} sx={{ minWidth: 100, flexGrow: { xs: 1, sm: 0 }, '& fieldset': { border: 'none' }, '& .MuiSelect-select': { py: 0 } }}>
                                {LEAD_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                            </Select>
                            <Button onClick={(e) => setSortAnchor(e.currentTarget)} startIcon={<IconifyIcon icon="material-symbols:sort" />} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }}>{activeSort}</Button>
                            <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)} PaperProps={{ sx: { width: 220, borderRadius: 2, mt: 1, boxShadow: 4 } }}>
                                {SORT_OPTIONS.map((option) => <MenuItem key={option} selected={option === activeSort} onClick={() => { setActiveSort(option); setSortAnchor(null); }} sx={{ fontSize: '0.875rem', py: 1 }}>{option}</MenuItem>)}
                            </Menu>
                            <Button onClick={(e) => setFilterAnchorEl(e.currentTarget)} startIcon={<IconifyIcon icon="material-symbols:filter-list-rounded" />} sx={{ color: advancedFilters.length > 0 ? 'primary.main' : 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', bgcolor: advancedFilters.length > 0 ? 'action.selected' : 'transparent' }}>Filters {advancedFilters.length > 0 ? `(${advancedFilters.length})` : ''}</Button>
                        </Stack>
                    )}
                </Stack>
                <AdvancedFilterPopover anchorEl={filterAnchorEl} onClose={() => setFilterAnchorEl(null)} filters={advancedFilters} setFilters={setAdvancedFilters} fields={dynamicFilterFields} rows={rows} />

                {viewMode === 'compact' && !selectedDetailLeadId && (
                    <Stack direction="row" alignItems="center" sx={{ mb: 2, justifyContent: 'flex-end', flexShrink: 0, maxWidth: '100%' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>List Zoom:</Typography>
                        <Select value={listZoom} onChange={(e) => setListZoom(e.target.value)} size="small" sx={{ height: 32, fontSize: '0.8rem', '& fieldset': { borderColor: 'divider' } }}>
                            <MenuItem value={0}>Standard (0x)</MenuItem>
                            <MenuItem value={-10}>Dense (-10x)</MenuItem>
                            <MenuItem value={-20}>Compact (-20x)</MenuItem>
                            <MenuItem value={-30}>Ultra (-30x)</MenuItem>
                        </Select>
                    </Stack>
                )}

                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%' }}>
                    {(viewMode === 'table' && !selectedDetailLeadId) && (
                        <Box sx={{ flex: 1, minHeight: 400, width: '100%', maxWidth: '100%', overflowX: 'auto', minWidth: 0 }}>
                            <DataGrid
                                rows={filteredRows} loading={loading} columns={columns} checkboxSelection rowHeight={70} getRowId={(row) => row.id} pagination paginationModel={paginationModel} onPaginationModelChange={setPaginationModel} pageSizeOptions={[10, 15, 25, 50]}
                                onRowSelectionModelChange={(newSelection) => { if (Array.isArray(newSelection)) setSelectedLeadIds(newSelection); else if (newSelection && newSelection.selectionModel) setSelectedLeadIds(newSelection.selectionModel); else setSelectedLeadIds(newSelection ? [newSelection] : []); }}
                                disableRowSelectionOnClick onRowClick={(params) => setSelectedDetailLeadId(params.id)} getRowClassName={(params) => params.id === selectedDetailLeadId ? 'active-lead-row' : ''}
                                sx={{ height: '100%', minWidth: 600, border: 'none', cursor: 'pointer', [`& .${gridClasses.columnHeaders}`]: { bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }, [`& .${gridClasses.row}`]: { borderBottom: 1, borderColor: 'divider', transition: 'all 0.2s', '&:hover': { bgcolor: 'action.hover' } }, '& .active-lead-row': { bgcolor: 'action.selected !important', position: 'relative', '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', bgcolor: 'primary.main', zIndex: 1 } } }}
                            />
                        </Box>
                    )}

                    {(viewMode !== 'table' || selectedDetailLeadId) && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%', maxWidth: '100%', minWidth: 0 }}>
                            <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 300, pr: { xs: 0, sm: 1 }, width: '100%', maxWidth: '100%', minWidth: 0 }}>
                                {viewMode === 'compact' || selectedDetailLeadId ? (
                                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden', width: '100%' }}>
                                        {filteredRows.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize).map((lead) => {
                                            const name = lead.displayName || lead.name || 'Unknown'; const color = stringToColor(name); const isSelected = lead.id === selectedDetailLeadId; const isChecked = selectedLeadIds.includes(lead.id);
                                            let py = 1.5; let avSize = 36; let titleSize = '0.875rem'; let subSize = '0.75rem';
                                            if (listZoom === -10 || selectedDetailLeadId) { py = 1; avSize = 32; titleSize = '0.8rem'; subSize = '0.7rem'; } if (listZoom === -20) { py = 0.5; avSize = 28; titleSize = '0.75rem'; subSize = '0.65rem'; } if (listZoom === -30) { py = 0.25; avSize = 24; titleSize = '0.7rem'; subSize = '0.6rem'; }

                                            return (
                                                <Stack key={lead.id} direction="row" alignItems="center" onClick={() => setSelectedDetailLeadId(lead.id)} sx={{ py: py, px: { xs: 1, sm: 2 }, borderBottom: 1, borderColor: 'divider', cursor: 'pointer', bgcolor: isSelected ? 'action.selected' : 'transparent', transition: 'background-color 0.1s', width: '100%', boxSizing: 'border-box', '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' } }}>
                                                    {!selectedDetailLeadId && <Checkbox size="small" checked={isChecked} onClick={(e) => e.stopPropagation()} onChange={(e) => { if (e.target.checked) setSelectedLeadIds(prev => [...prev, lead.id]); else setSelectedLeadIds(prev => prev.filter(id => id !== lead.id)); }} sx={{ p: 0, mr: { xs: 1, sm: 1.5 } }} />}
                                                    <Avatar variant="rounded" sx={{ width: avSize, height: avSize, mr: { xs: 1.5, sm: 2 }, fontSize: subSize, fontWeight: 700, bgcolor: color, borderRadius: 1.5, flexShrink: 0 }}>{getInitials(name)}</Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                        <Typography sx={{ fontSize: titleSize, fontWeight: 700, color: 'text.primary' }} noWrap>{name}</Typography>
                                                        <Typography sx={{ fontSize: subSize, color: 'text.secondary' }} noWrap>{lead.company || 'No Company'}</Typography>
                                                    </Box>
                                                    {!selectedDetailLeadId && (
                                                        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-end', sm: 'center' }} spacing={{ xs: 0.5, sm: 3 }} sx={{ flexShrink: 0, ml: 1 }}>
                                                            <Chip variant="outlined" color="success" label={lead.status || 'Open'} size="small" sx={{ height: listZoom <= -20 ? 18 : 22, fontSize: subSize, fontWeight: 700 }} />
                                                            <Typography sx={{ fontSize: subSize, color: 'text.disabled', width: { xs: 'auto', sm: 90 }, textAlign: 'right', fontWeight: 600 }}>{lead.id.substring(0, 8)}...</Typography>
                                                        </Stack>
                                                    )}
                                                </Stack>
                                            );
                                        })}
                                        {filteredRows.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No leads found.</Typography></Box>}
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: { xs: 2, sm: 3 } }}>
                                        {filteredRows.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize).map((lead) => {
                                            const name = lead.displayName || lead.name || 'Unknown'; const color = stringToColor(name); const isChecked = selectedLeadIds.includes(lead.id);

                                            return (
                                                <Card key={lead.id} variant="outlined" onClick={() => setSelectedDetailLeadId(lead.id)} sx={{ cursor: 'pointer', borderRadius: 3, transition: 'all 0.2s', borderColor: isChecked ? 'primary.main' : 'divider', bgcolor: isChecked ? 'action.selected' : 'background.paper', display: 'flex', flexDirection: 'column', height: '100%', p: 2.5, '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', borderColor: 'primary.light' } }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                                        <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: color, fontSize: '1.1rem', fontWeight: 700, borderRadius: 2 }}>{getInitials(name)}</Avatar>
                                                        <Checkbox size="small" checked={isChecked} onClick={(e) => e.stopPropagation()} onChange={(e) => { if (e.target.checked) setSelectedLeadIds(prev => [...prev, lead.id]); else setSelectedLeadIds(prev => prev.filter(id => id !== lead.id)); }} sx={{ p: 0, color: 'text.disabled', '&.Mui-checked': { color: 'primary.main' } }} />
                                                    </Stack>
                                                    <Box sx={{ mb: 3, flexGrow: 1, minWidth: 0 }}>
                                                        <Typography variant="h6" fontWeight={700} color="text.primary" noWrap sx={{ fontSize: '1.05rem', mb: 0.5 }}>{name}</Typography>
                                                        <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>{lead.company || 'No Company'}</Typography>
                                                    </Box>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto' }}>
                                                        <Chip variant="outlined" color="success" label={lead.status || 'Open'} size="small" sx={{ fontWeight: 700, px: 0.5, height: 24, fontSize: '0.75rem' }} />
                                                    </Stack>
                                                </Card>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>

                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent={{ xs: 'center', sm: 'space-between' }} alignItems="center" sx={{ mt: 2, p: 1.5, gap: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider', flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
                                {!selectedDetailLeadId && <Typography variant="body2" color="text.secondary" fontWeight={500} textAlign="center">Showing {(paginationModel.page * paginationModel.pageSize) + 1} to {Math.min((paginationModel.page + 1) * paginationModel.pageSize, filteredRows.length)} of {filteredRows.length} entries</Typography>}
                                <Pagination count={Math.ceil(filteredRows.length / paginationModel.pageSize) || 1} page={paginationModel.page + 1} onChange={(e, val) => setPaginationModel(prev => ({ ...prev, page: val - 1 }))} color="primary" shape="rounded" size={selectedDetailLeadId ? "small" : "medium"} siblingCount={selectedDetailLeadId ? 0 : 1} />
                            </Stack>
                        </Box>
                    )}
                </Box>

                <Dialog open={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>Select Email Group</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Adding {selectedLeadIds.length} selected lead(s) to a campaign group.</Typography>
                        {isFetchingGroups ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box> : (
                            <FormControl fullWidth><InputLabel>Email Group</InputLabel><Select value={selectedGroup} label="Email Group" onChange={(e) => setSelectedGroup(e.target.value)}>{emailGroups.map((group) => <MenuItem key={group.name} value={group.name}>{group.title || group.name}</MenuItem>)}</Select></FormControl>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}><Button onClick={() => setIsGroupModalOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button><Button onClick={handleAddToGroup} variant="contained" color="primary" disabled={!selectedGroup || isSubmitting} sx={{ fontWeight: 700 }}>{isSubmitting ? 'Adding...' : 'Add Leads'}</Button></DialogActions>
                </Dialog>
            </Box>

            {/* --- RIGHT PANEL: DETAILS --- */}
            {selectedDetailLeadId && (
                <Box sx={{
                    // 🚀 RESPONSIVE FIX: Makes the detail pane act as a full-screen view on mobile
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: { xs: '100%', md: 0 },
                    p: { xs: 1.5, sm: 2, md: 4 },
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    height: '100%',
                    boxSizing: 'border-box',
                    borderLeft: { xs: 0, md: 1 },
                    borderColor: 'divider',
                    width: '100%',
                    maxWidth: '100%',
                    overflowX: 'hidden'
                }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: { xs: 2, sm: 4 }, pb: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 2, maxWidth: '100%' }}>
                        <Box sx={{ pr: 2, minWidth: 0, flex: 1, width: '100%' }}>
                            <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ wordBreak: 'break-word', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>{rows.find(r => r.id === selectedDetailLeadId)?.displayName || selectedDetailLeadId}</Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ wordBreak: 'break-word' }}>{selectedDetailLeadId}</Typography>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
                            <Box>
                                <Button variant="outlined" size="small" startIcon={<IconifyIcon icon="material-symbols:edit-outline" />} onClick={() => navigateTo(`/m/crmq/edit-lead/${selectedDetailLeadId}`)} sx={{ fontWeight: 600, borderRadius: 1.5, mr: 1 }}>Edit</Button>
                                <Button variant="contained" size="small" color="primary" onClick={() => { if (onLeadClick) onLeadClick(selectedDetailLeadId); else navigateTo(`/m/crmq/view-lead/${selectedDetailLeadId}`); }} sx={{ fontWeight: 600, borderRadius: 1.5, boxShadow: 'none' }}>View Full Details</Button>
                            </Box>

                            {/* 🚀 RESPONSIVE FIX: This close button now effectively acts as a 'Back' button on mobile since the list vanishes */}
                            <IconButton onClick={() => setSelectedDetailLeadId(null)} sx={{ bgcolor: 'action.hover' }}>
                                <IconifyIcon icon="material-symbols:close" />
                            </IconButton>
                        </Stack>
                    </Stack>
                    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', flexGrow: 1 }}>
                        <LeadDetailPanels leadId={selectedDetailLeadId} activeTab={activeDetailTab} />
                    </Box>
                </Box>
            )}
        </Stack>
    );
};

export default LeadsTable;