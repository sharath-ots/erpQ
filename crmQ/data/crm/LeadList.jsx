import { useMemo, useState, useEffect, useCallback } from 'react';
import {
    Box, Chip, Stack, Typography, Button, TextField,
    MenuItem, Menu, Avatar, IconButton, Select, Breadcrumbs, Link, InputAdornment,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, CircularProgress,
    ToggleButton, ToggleButtonGroup, Tooltip, Checkbox, Pagination, Card
} from '@mui/material';
import { DataGrid, GRID_CHECKBOX_SELECTION_COL_DEF, gridClasses } from '@mui/x-data-grid';
import { useSearchParams } from 'next/navigation';

// --- ARORA COMPONENTS ---
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

const LEAD_STATUSES = [
    'All', 'Lead', 'Open', 'Replied', 'Opportunity', 'Hold',
    'Quotation', 'Lost Quotation', 'Interested', 'Converted',
    'Do Not Contact', 'Completed'
];

const SORT_OPTIONS = [
    'Last Updated On', 'Title', 'ID', 'Created On',
    'Most Used', 'Lead Owner', 'Email',
    'Organization Name', 'Status', 'Lead Stage'
];

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

    const { selectedDetailLeadId, setSelectedDetailLeadId, activeDetailTab } = useLead();

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

            const formattedData = safeData.map((item, index) => ({
                ...item,
                id: String(item.id || item.name || `fallback-id-${index}`),
                realId: item.name || item.id,
                displayName: item.lead_name || item.name || 'Unknown',
                company: item.company || item.company_name || 'N/A',
                creation: item.creation
            }));
            setRows(formattedData);
        } catch (error) {
            console.error("Failed to fetch leads:", error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

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
                    const basePath = window.location.pathname.startsWith('/m/crmq')
                        ? '/m/crmq/list/Lead'
                        : '/crm/lead-list';
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
            const emailsToSubmit = rows
                .filter(row => safeIds.includes(row.id))
                .map(row => row.email_id || row.email)
                .filter(Boolean);

            if (emailsToSubmit.length === 0) {
                alert("The selected leads do not have email addresses.");
                setIsSubmitting(false);
                return;
            }

            const res = await fetch('/api/add-to-email-group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_group: selectedGroup, emails: emailsToSubmit })
            });

            if (res.ok) {
                alert("Successfully added leads to Email Group!");
                setIsGroupModalOpen(false);
                setSelectedGroup('');
                setSelectedLeadIds([]);
            } else {
                alert("Failed to add some leads. Check console.");
            }
        } catch (error) {
            console.error("Submission error", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const dynamicFilterFields = useMemo(() => {
        if (!rows || rows.length === 0) return [];

        const fakeReactFields = ['id', 'realId', 'displayName', 'company', 'avatar'];
        const keys = Object.keys(rows[0]).filter(key => !fakeReactFields.includes(key));

        let fields = keys.map(key => {
            let label = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

            if (key === 'creation') label = 'Created On';
            if (key === 'modified') label = 'Last Updated On';
            if (key === 'name') label = 'Lead ID';
            if (key === 'owner') label = 'Created By';
            if (key === 'lead_name') label = 'Lead Name';
            if (key === 'company_name') label = 'Organization';
            if (key === 'email_id') label = 'Email';

            return { label, value: key };
        });

        const ensureFieldExists = (val, lab) => {
            if (!fields.find(f => f.value === val)) fields.push({ label: lab, value: val });
        };

        ensureFieldExists('creation', 'Created On');
        ensureFieldExists('modified', 'Last Updated On');
        ensureFieldExists('name', 'Lead ID');
        ensureFieldExists('status', 'Status');
        ensureFieldExists('email_id', 'Email');
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
        {
            field: 'displayName',
            headerName: 'Name',
            minWidth: 350,
            flex: 1,
            renderCell: (params) => {
                const name = params.row.displayName || params.row.name || 'Unknown';
                const color = stringToColor(name);
                return (
                    <Stack spacing={1.5} direction="row" sx={{ alignItems: 'center', height: '100%' }}>
                        <Avatar variant="rounded" sx={{ width: 40, height: 40, fontSize: '0.85rem', fontWeight: 700, bgcolor: color, color: '#fff', borderRadius: 1.5, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.1)`, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                            {getInitials(name)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', '&:hover': { color: '#2b6cb0', textDecoration: 'underline' } }}>
                            {name}
                        </Typography>
                    </Stack>
                );
            },
        },
        {
            field: 'status',
            headerName: 'Status',
            minWidth: 120,
            renderCell: (params) => (
                <Chip label={params.row.status || 'Open'} size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.75rem' }} />
            ),
        },
        {
            field: 'company',
            headerName: 'Organization',
            minWidth: 200,
            renderCell: (params) => <Typography variant="body2" sx={{ color: '#64748b' }}>{params.row.company || 'N/A'}</Typography>
        },
    ], []);

    return (
        <Stack direction="row" sx={{ width: 1, height: '100vh', overflow: 'hidden', bgcolor: '#f8fafc' }}>
            <Box sx={{
                width: selectedDetailLeadId ? '25%' : '100%',
                transition: 'width 0.3s ease-in-out',
                p: 4,
                bgcolor: 'white',
                borderRight: selectedDetailLeadId ? '1px solid #e2e8f0' : 'none',
                overflowY: 'auto',
                height: '100%'
            }}>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>Lead list</Typography>
                    </Box>

                    {!selectedDetailLeadId && (
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => navigateTo('/m/crmq/add-lead')}
                                sx={{ borderRadius: 2, px: 3, py: 1.2, fontWeight: 700, textTransform: 'none' }}
                            >
                                Add lead
                            </Button>
                        </Stack>
                    )}
                </Stack>

                <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                        <TextField
                            placeholder="Search lead name"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start" /> }}
                            sx={{ flexGrow: 1, minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: '#f1f5f9', borderRadius: 2, height: 44, '& fieldset': { border: 'none' } } }}
                        />

                        {selectedDetailLeadId && (
                            <Tooltip title="Advanced Filters">
                                <IconButton
                                    onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                                    sx={{
                                        bgcolor: advancedFilters.length > 0 ? 'primary.lighter' : '#f1f5f9',
                                        color: advancedFilters.length > 0 ? 'primary.main' : 'text.secondary',
                                        borderRadius: 2,
                                        width: 44,
                                        height: 44,
                                        '&:hover': { bgcolor: advancedFilters.length > 0 ? 'primary.light' : '#e2e8f0' }
                                    }}
                                >
                                    <IconifyIcon icon="material-symbols:filter-list-rounded" />
                                </IconButton>
                            </Tooltip>
                        )}

                        {!selectedDetailLeadId && (
                            <TextField
                                placeholder="Search organization name"
                                value={searchOrgTerm}
                                onChange={(e) => setSearchOrgTerm(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start" /> }}
                                sx={{ flexGrow: 1, minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: '#f1f5f9', borderRadius: 2, height: 44, '& fieldset': { border: 'none' } } }}
                            />
                        )}
                    </Stack>

                    {!selectedDetailLeadId && (
                        <Stack direction="row" spacing={2} alignItems="center">
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={(e, newMode) => { if (newMode !== null) setViewMode(newMode); }}
                                size="small"
                                sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1 } }}
                            >
                                <Tooltip title="Table View">
                                    <ToggleButton value="table"><IconifyIcon icon="material-symbols:table-rows-rounded" /></ToggleButton>
                                </Tooltip>
                                <Tooltip title="Compact List">
                                    <ToggleButton value="compact"><IconifyIcon icon="material-symbols:view-list-rounded" /></ToggleButton>
                                </Tooltip>
                                {/* 🚀 NEW: Grid View Toggle Button */}
                                <Tooltip title="Grid View">
                                    <ToggleButton value="grid"><IconifyIcon icon="material-symbols:grid-view-rounded" /></ToggleButton>
                                </Tooltip>
                            </ToggleButtonGroup>

                            <Select
                                value={activeStatus}
                                onChange={(e) => setActiveStatus(e.target.value)}
                                displayEmpty
                                size="small"
                                renderValue={(selected) => <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{selected === 'All' || !selected ? 'Status' : selected}</Typography>}
                                sx={{ minWidth: 100, '& fieldset': { border: 'none' }, '& .MuiSelect-select': { py: 0 } }}
                            >
                                {LEAD_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                            </Select>

                            <Button
                                onClick={(e) => setSortAnchor(e.currentTarget)}
                                startIcon={<IconifyIcon icon="material-symbols:sort" />}
                                sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }}
                            >
                                {activeSort}
                            </Button>

                            <Menu
                                anchorEl={sortAnchor}
                                open={Boolean(sortAnchor)}
                                onClose={() => setSortAnchor(null)}
                                PaperProps={{ sx: { width: 220, borderRadius: 2, mt: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <MenuItem key={option} selected={option === activeSort} onClick={() => { setActiveSort(option); setSortAnchor(null); }} sx={{ fontSize: '0.875rem', py: 1 }}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Menu>

                            <Button
                                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                                startIcon={<IconifyIcon icon="material-symbols:filter-list-rounded" />}
                                sx={{ color: advancedFilters.length > 0 ? 'primary.main' : 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', bgcolor: advancedFilters.length > 0 ? 'primary.lighter' : 'transparent' }}
                            >
                                Filters {advancedFilters.length > 0 ? `(${advancedFilters.length})` : ''}
                            </Button>
                        </Stack>
                    )}
                </Stack>

                <AdvancedFilterPopover
                    anchorEl={filterAnchorEl}
                    onClose={() => setFilterAnchorEl(null)}
                    filters={advancedFilters}
                    setFilters={setAdvancedFilters}
                    fields={dynamicFilterFields}
                    rows={rows}
                />

                {viewMode === 'compact' && !selectedDetailLeadId && (
                    <Stack direction="row" alignItems="center" sx={{ mb: 2, justifyContent: 'flex-end' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>List Zoom:</Typography>
                        <Select
                            value={listZoom}
                            onChange={(e) => setListZoom(e.target.value)}
                            size="small"
                            sx={{ height: 32, fontSize: '0.8rem', '& fieldset': { borderColor: '#e2e8f0' } }}
                        >
                            <MenuItem value={0}>Standard (0x)</MenuItem>
                            <MenuItem value={-10}>Dense (-10x)</MenuItem>
                            <MenuItem value={-20}>Compact (-20x)</MenuItem>
                            <MenuItem value={-30}>Ultra (-30x)</MenuItem>
                        </Select>
                    </Stack>
                )}

                {/* --- 1. TABLE VIEW --- */}
                <Box sx={{ width: '100%', display: (viewMode === 'table' && !selectedDetailLeadId) ? 'flex' : 'none', flexDirection: 'column' }}>
                    <DataGrid
                        rows={filteredRows}
                        loading={loading}
                        columns={columns}
                        checkboxSelection
                        rowHeight={70}
                        getRowId={(row) => row.id}
                        autoHeight
                        pagination
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 15, 25, 50]}
                        onRowSelectionModelChange={(newSelection) => {
                            if (Array.isArray(newSelection)) setSelectedLeadIds(newSelection);
                            else if (newSelection && newSelection.selectionModel) setSelectedLeadIds(newSelection.selectionModel);
                            else setSelectedLeadIds(newSelection ? [newSelection] : []);
                        }}
                        disableRowSelectionOnClick
                        onRowClick={(params) => setSelectedDetailLeadId(params.id)}
                        getRowClassName={(params) => params.id === selectedDetailLeadId ? 'active-lead-row' : ''}
                        sx={{
                            border: 'none',
                            cursor: 'pointer',
                            [`& .${gridClasses.columnHeaders}`]: { bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9' },
                            [`& .${gridClasses.row}`]: { borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9' } },
                            '& .active-lead-row': { bgcolor: '#eff6ff !important', position: 'relative', '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', bgcolor: '#3b82f6', zIndex: 1 } }
                        }}
                    />
                </Box>

                {/* --- WRAPPER FOR COMPACT AND GRID VIEWS --- */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, pb: 2, display: (viewMode !== 'table' || selectedDetailLeadId) ? 'flex' : 'none', flexDirection: 'column' }}>

                    {/* --- 2. COMPACT VIEW (Or Side Panel Split View) --- */}
                    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: 'white', overflow: 'hidden', display: (viewMode === 'compact' || selectedDetailLeadId) ? 'block' : 'none' }}>
                        {filteredRows.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize).map((lead) => {
                            const name = lead.displayName || lead.name || 'Unknown';
                            const color = stringToColor(name);
                            const isSelected = lead.id === selectedDetailLeadId;
                            const isChecked = selectedLeadIds.includes(lead.id);

                            let py = 1.5; let avSize = 36; let titleSize = '0.875rem'; let subSize = '0.75rem';
                            if (listZoom === -10 || selectedDetailLeadId) { py = 1; avSize = 32; titleSize = '0.8rem'; subSize = '0.7rem'; }
                            if (listZoom === -20) { py = 0.5; avSize = 28; titleSize = '0.75rem'; subSize = '0.65rem'; }
                            if (listZoom === -30) { py = 0.25; avSize = 24; titleSize = '0.7rem'; subSize = '0.6rem'; }

                            return (
                                <Stack key={lead.id} direction="row" alignItems="center" onClick={() => setSelectedDetailLeadId(lead.id)} sx={{ py: py, px: 2, borderBottom: '1px solid #f1f5f9', cursor: 'pointer', bgcolor: isSelected ? '#eff6ff' : 'transparent', transition: 'background-color 0.1s', '&:hover': { bgcolor: isSelected ? '#eff6ff' : '#f8fafc' } }}>
                                    {!selectedDetailLeadId && (
                                        <Checkbox size="small" checked={isChecked} onClick={(e) => e.stopPropagation()} onChange={(e) => { if (e.target.checked) setSelectedLeadIds(prev => [...prev, lead.id]); else setSelectedLeadIds(prev => prev.filter(id => id !== lead.id)); }} sx={{ p: 0, mr: 1.5 }} />
                                    )}
                                    <Avatar variant="rounded" sx={{ width: avSize, height: avSize, mr: 2, fontSize: subSize, fontWeight: 700, bgcolor: color, borderRadius: 1.5 }}>
                                        {getInitials(name)}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                        <Typography sx={{ fontSize: titleSize, fontWeight: 700, color: '#1e293b' }} noWrap>{name}</Typography>
                                        <Typography sx={{ fontSize: subSize, color: '#64748b' }} noWrap>{lead.company || 'No Company'}</Typography>
                                    </Box>
                                    {!selectedDetailLeadId && (
                                        <Stack direction="row" alignItems="center" spacing={3}>
                                            <Chip label={lead.status || 'Open'} size="small" sx={{ height: listZoom <= -20 ? 18 : 22, fontSize: subSize, fontWeight: 700, bgcolor: '#dcfce7', color: '#166534' }} />
                                            <Typography sx={{ fontSize: subSize, color: 'text.disabled', width: 90, textAlign: 'right', fontWeight: 600 }}>{lead.id.substring(0, 8)}...</Typography>
                                        </Stack>
                                    )}
                                </Stack>
                            );
                        })}
                        {filteredRows.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No leads found.</Typography></Box>}
                    </Box>

                    {/* --- 3. 🚀 NEW: GRID IMAGE VIEW --- */}
                    <Box sx={{
                        display: (viewMode === 'grid' && !selectedDetailLeadId) ? 'grid' : 'none',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', // Widened slightly for better text fitting
                        gap: 3
                    }}>
                        {filteredRows.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize).map((lead) => {
                            const name = lead.displayName || lead.name || 'Unknown';
                            const color = stringToColor(name);
                            const isChecked = selectedLeadIds.includes(lead.id);

                            return (
                                <Card
                                    key={lead.id}
                                    variant="outlined"
                                    onClick={() => setSelectedDetailLeadId(lead.id)}
                                    sx={{
                                        cursor: 'pointer',
                                        borderRadius: 3,
                                        transition: 'all 0.2s',
                                        borderColor: isChecked ? 'primary.main' : '#e2e8f0',
                                        bgcolor: isChecked ? '#eff6ff' : 'white',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%', // Ensures all cards in a row are the exact same height
                                        p: 2.5,
                                        '&:hover': {
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                            transform: 'translateY(-2px)',
                                            borderColor: 'primary.light'
                                        }
                                    }}
                                >
                                    {/* Top Row: Avatar & Checkbox */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                        <Avatar
                                            variant="rounded" // Modern rounded-square look
                                            sx={{
                                                width: 48, height: 48,
                                                bgcolor: color, fontSize: '1.1rem', fontWeight: 700,
                                                borderRadius: 2
                                            }}
                                        >
                                            {getInitials(name)}
                                        </Avatar>
                                        <Checkbox
                                            size="small"
                                            checked={isChecked}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedLeadIds(prev => [...prev, lead.id]);
                                                else setSelectedLeadIds(prev => prev.filter(id => id !== lead.id));
                                            }}
                                            sx={{ p: 0, color: 'text.disabled', '&.Mui-checked': { color: 'primary.main' } }}
                                        />
                                    </Stack>

                                    {/* Middle Row: Name & Company */}
                                    {/* The minWidth: 0 is the magic fix that stops the text from pushing outside the card! */}
                                    <Box sx={{ mb: 3, flexGrow: 1, minWidth: 0 }}>
                                        <Typography variant="h6" fontWeight={700} color="text.primary" noWrap sx={{ fontSize: '1.05rem', mb: 0.5 }}>
                                            {name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
                                            {lead.company || 'No Company'}
                                        </Typography>
                                    </Box>

                                    {/* Bottom Row: Status & ID */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto' }}>
                                        <Chip
                                            label={lead.status || 'Open'}
                                            size="small"
                                            sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, px: 0.5, height: 24, fontSize: '0.75rem' }}
                                        />
                                        {/* <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                            {lead.id.substring(0, 8)}
                                        </Typography> */}
                                    </Stack>
                                </Card>
                            );
                        })}
                    </Box>

                    {/* --- SHARED PAGINATION CONTROLS (Grid & Compact Modes) --- */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3, p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        {!selectedDetailLeadId && <Typography variant="body2" color="text.secondary" fontWeight={500}>Showing {(paginationModel.page * paginationModel.pageSize) + 1} to {Math.min((paginationModel.page + 1) * paginationModel.pageSize, filteredRows.length)} of {filteredRows.length} entries</Typography>}
                        <Pagination count={Math.ceil(filteredRows.length / paginationModel.pageSize) || 1} page={paginationModel.page + 1} onChange={(e, val) => setPaginationModel(prev => ({ ...prev, page: val - 1 }))} color="primary" shape="rounded" size={selectedDetailLeadId ? "small" : "medium"} siblingCount={selectedDetailLeadId ? 0 : 1} />
                    </Stack>
                </Box>

                <Dialog open={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 800 }}>Select Email Group</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Adding {selectedLeadIds.length} selected lead(s) to a campaign group.</Typography>
                        {isFetchingGroups ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box> : (
                            <FormControl fullWidth>
                                <InputLabel>Email Group</InputLabel>
                                <Select value={selectedGroup} label="Email Group" onChange={(e) => setSelectedGroup(e.target.value)}>
                                    {emailGroups.map((group) => <MenuItem key={group.name} value={group.name}>{group.title || group.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setIsGroupModalOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
                        <Button onClick={handleAddToGroup} variant="contained" color="primary" disabled={!selectedGroup || isSubmitting} sx={{ fontWeight: 700 }}>{isSubmitting ? 'Adding...' : 'Add Leads'}</Button>
                    </DialogActions>
                </Dialog>
            </Box>

            {/* 🚀 DETAILS PANE */}
            {selectedDetailLeadId && (
                <Box sx={{ width: '75%', p: { xs: 2, md: 4 }, overflowY: 'auto', height: '100%', bgcolor: '#ffffff', borderLeft: '1px solid #e2e8f0' }}>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4, pb: 2, borderBottom: '1px solid #e2e8f0' }}>
                        <Box>
                            <Typography variant="h5" fontWeight={800} color="#1e293b">
                                {rows.find(r => r.id === selectedDetailLeadId)?.displayName || selectedDetailLeadId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                {selectedDetailLeadId}
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1.5}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<IconifyIcon icon="material-symbols:edit-outline" />}
                                onClick={() => navigateTo(`/m/crmq/edit-lead/${selectedDetailLeadId}`)}
                                sx={{ fontWeight: 600, borderRadius: 1.5 }}
                            >
                                Edit
                            </Button>

                            <Button
                                variant="contained"
                                size="small"
                                color="primary"
                                onClick={() => {
                                    if (onLeadClick) onLeadClick(selectedDetailLeadId);
                                    else navigateTo(`/m/crmq/view-lead/${selectedDetailLeadId}`);
                                }}
                                sx={{ fontWeight: 600, borderRadius: 1.5, boxShadow: 'none' }}
                            >
                                View Full Details
                            </Button>

                            <IconButton onClick={() => setSelectedDetailLeadId(null)} sx={{ bgcolor: '#f1f5f9' }}>
                                <IconifyIcon icon="material-symbols:close" />
                            </IconButton>
                        </Stack>
                    </Stack>

                    <Box>
                        <LeadDetailPanels
                            leadId={selectedDetailLeadId}
                            activeTab={activeDetailTab}
                        />
                    </Box>

                </Box>
            )}
        </Stack>
    );
};

export default LeadsTable;