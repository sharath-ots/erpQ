'use client';
import { useMemo, useState, useEffect, useCallback } from 'react';
// 🚀 ADDED: useSearchParams to read the URL
import { useSearchParams } from 'next/navigation'; 
import { Box, Chip, Stack, Typography, Button, TextField, MenuItem, Menu, Avatar, IconButton, Select, Pagination, ToggleButton, ToggleButtonGroup, Tooltip, Checkbox, Card, InputAdornment } from '@mui/material';
import { DataGrid, GRID_CHECKBOX_SELECTION_COL_DEF, gridClasses } from '@mui/x-data-grid';
import IconifyIcon from '../../src/components/base/IconifyIcon';
import { fetchOpportunityListAdmin } from '../../data/crm/opportunity/OpportunityData';
import OpportunityDetailPanels from '../../components/opportunity/OpportunityDetailsPanel';
import { useOpportunity } from '../../src/contexts/OpportunityContext';

const defaultPageSize = 15;
const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) hash = string.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#';
    for (let i = 0; i < 3; i += 1) color += `00${((hash >> (i * 8)) & 0xff).toString(16)}`.slice(-2);
    return color;
};
const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
};
const OPPORTUNITY_STATUSES = ['All', 'Open', 'Replied', 'Quotation', 'Converted', 'Lost', 'Closed', 'Interested'];
const SORT_OPTIONS = ['Last Updated On', 'Created On', 'Title', 'Status', 'Organization', 'Amount', 'Probability'];

const OpportunityTable = ({ onOpportunityClick }) => {
    const { selectedDetailOpportunityId, setSelectedDetailOpportunityId, setOpportunityCounts, activeDetailTab } = useOpportunity();
    
    // 🚀 NEW: Hook into the URL parameters
    const searchParams = useSearchParams();
    const filtersParam = searchParams.get('filters');

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOrgTerm, setSearchOrgTerm] = useState('');
    const [activeStatus, setActiveStatus] = useState('All');
    const [sortAnchor, setSortAnchor] = useState(null);
    const [activeSort, setActiveSort] = useState('Last Updated On');
    const [viewMode, setViewMode] = useState('grid');
    const [listZoom, setListZoom] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ pageSize: defaultPageSize, page: 0 });
    const [selectedOpportunityIds, setSelectedOpportunityIds] = useState([]);

    const getOpportunities = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchOpportunityListAdmin();
            const safeData = Array.isArray(data) ? data : [];
            const formattedData = safeData.map((item, index) => ({
                ...item,
                id: String(item.name || `opp-${index}`),
                realId: item.name,
                displayName: item.title || item.customer_name || item.party_name || item.name || 'Unknown Opportunity',
                company: item.company || 'N/A',
                creation: item.creation ? String(item.creation).split(' ')[0].split('T')[0] : null,
                modified: item.modified ? String(item.modified).split(' ')[0].split('T')[0] : null
            }));
            setRows(formattedData);

            setOpportunityCounts({
                all: formattedData.length,
                new: formattedData.filter(r => r.status === 'Open').length,
                highProb: formattedData.filter(r => Number(r.probability) >= 75).length,
                highValue: formattedData.filter(r => Number(r.opportunity_amount) >= 50000).length,
                archived: formattedData.filter(r => ['Lost', 'Completed', 'Hold', 'Closed'].includes(r.status)).length
            });
        } catch (error) { 
            console.error('Failed to fetch opportunities:', error); 
            setRows([]); 
        } finally { 
            setLoading(false); 
        }
    }, [setOpportunityCounts]);

    useEffect(() => { getOpportunities(); }, [getOpportunities]);

    const filteredRows = useMemo(() => {
        let result = rows.filter((row) => {
            const matchesName = row.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || row.id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesOrg = row.company?.toLowerCase().includes(searchOrgTerm.toLowerCase());
            const matchesStatusDropdown = activeStatus === 'All' || row.status === activeStatus;

            // 🚀 NEW: Check the URL filters to match the Sidebar clicks perfectly
            let matchesSidebar = true;
            if (filtersParam) {
                if (filtersParam.includes('"value":"Open"')) {
                    matchesSidebar = row.status === 'Open';
                } else if (filtersParam.includes('"field":"probability"')) {
                    matchesSidebar = Number(row.probability) >= 75;
                } else if (filtersParam.includes('"field":"opportunity_amount"')) {
                    matchesSidebar = Number(row.opportunity_amount) >= 50000;
                } else if (filtersParam.includes('Lost') || filtersParam.includes('Completed')) {
                    matchesSidebar = ['Lost', 'Completed', 'Hold', 'Closed'].includes(row.status);
                }
            }

            return matchesName && matchesOrg && matchesStatusDropdown && matchesSidebar;
        });

        return [...result].sort((a, b) => {
            switch (activeSort) {
                case 'Title': return (a.displayName || '').localeCompare(b.displayName || '');
                case 'Status': return (a.status || '').localeCompare(b.status || '');
                case 'Organization': return (a.company || '').localeCompare(b.company || '');
                case 'Amount': return ((b.opportunity_amount || 0) - (a.opportunity_amount || 0));
                case 'Probability': return ((b.probability || 0) - (a.probability || 0));
                case 'Created On': return new Date(b.creation || 0) - new Date(a.creation || 0);
                case 'Last Updated On': return new Date(b.modified || 0) - new Date(a.modified || 0);
                default: return 0;
            }
        });
    }, [rows, searchTerm, searchOrgTerm, activeStatus, activeSort, filtersParam]); // 🚀 Added filtersParam dependency

    const columns = useMemo(() => [
        { ...GRID_CHECKBOX_SELECTION_COL_DEF, width: 64 },
        { field: 'displayName', headerName: 'Opportunity', minWidth: 350, flex: 1, renderCell: (params) => {
            const name = params.row.displayName || 'Unknown';
            return (
                <Stack spacing={1.5} direction="row" sx={{ alignItems: 'center', height: '100%' }}>
                    <Avatar variant="rounded" sx={{ width: 40, height: 40, fontSize: '0.85rem', fontWeight: 700, bgcolor: stringToColor(name), color: '#fff', borderRadius: 1.5 }}>{getInitials(name)}</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{name}</Typography>
                </Stack>
            );
        }},
        { field: 'status', headerName: 'Status', minWidth: 120, renderCell: (params) => (
            <Chip variant="outlined" color="success" label={params.row.status || 'Open'} size="small" sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
        )},
        { field: 'company', headerName: 'Organization', minWidth: 200, renderCell: (params) => (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{params.row.company || 'N/A'}</Typography>
        )}
    ], []);

    const navigateTo = (path) => { if (typeof window === 'undefined') return; window.location.assign(path); };

    return (
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ width: '100%', maxWidth: '100vw', height: '100%', overflow: 'hidden', bgcolor: 'background.default' }}>
            <Box sx={{ display: selectedDetailOpportunityId ? { xs: 'none', md: 'flex' } : 'flex', flex: selectedDetailOpportunityId ? { xs: '1 1 auto', md: '0 0 350px' } : 1, flexDirection: 'column', p: { xs: 2, sm: 3 }, height: '100%', width: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Opportunity list</Typography>
                    {!selectedDetailOpportunityId && (
                        <Button variant="contained" onClick={() => navigateTo('/m/crmq/add-opportunity')} sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>Add opportunity</Button>
                    )}
                </Stack>
                <Stack direction="column" spacing={1.5} sx={{ mb: 1.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField placeholder="Search opportunity name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} fullWidth InputProps={{ startAdornment: (<InputAdornment position="start"><IconifyIcon icon="material-symbols:search-rounded" /></InputAdornment>) }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover', borderRadius: 2, height: 40, '& fieldset': { border: 'none' } } }} />
                        {!selectedDetailOpportunityId && (
                            <TextField placeholder="Search organization name" value={searchOrgTerm} onChange={(e) => setSearchOrgTerm(e.target.value)} fullWidth InputProps={{ startAdornment: (<InputAdornment position="start"><IconifyIcon icon="material-symbols:business-rounded" /></InputAdornment>) }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover', borderRadius: 2, height: 40, '& fieldset': { border: 'none' } } }} />
                        )}
                    </Stack>
                    {!selectedDetailOpportunityId && (
                        <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                            <ToggleButtonGroup value={viewMode} exclusive onChange={(_e, newMode) => { if (newMode !== null) setViewMode(newMode); }} size="small">
                                <Tooltip title="Table View"><ToggleButton value="table"><IconifyIcon icon="material-symbols:table-rows-rounded" /></ToggleButton></Tooltip>
                                <Tooltip title="Compact View"><ToggleButton value="compact"><IconifyIcon icon="material-symbols:view-list-rounded" /></ToggleButton></Tooltip>
                                <Tooltip title="Image View"><ToggleButton value="grid"><IconifyIcon icon="material-symbols:grid-view-rounded" /></ToggleButton></Tooltip>
                            </ToggleButtonGroup>
                            <Select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)} size="small" sx={{ minWidth: 120, '& fieldset': { border: 'none' } }}>
                                {OPPORTUNITY_STATUSES.map((status) => (<MenuItem key={status} value={status}>{status}</MenuItem>))}
                            </Select>
                            <Button onClick={(e) => setSortAnchor(e.currentTarget)} startIcon={<IconifyIcon icon="material-symbols:sort" />} sx={{ textTransform: 'none', fontWeight: 600 }}>{activeSort}</Button>
                            <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
                                {SORT_OPTIONS.map((option) => (<MenuItem key={option} selected={option === activeSort} onClick={() => { setActiveSort(option); setSortAnchor(null); }}>{option}</MenuItem>))}
                            </Menu>
                        </Stack>
                    )}
                </Stack>
                {viewMode === 'compact' && !selectedDetailOpportunityId && (
                    <Stack direction="row" alignItems="center" sx={{ mb: 2, justifyContent: 'flex-end' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>List Zoom:</Typography>
                        <Select value={listZoom} onChange={(e) => setListZoom(e.target.value)} size="small" sx={{ height: 32, fontSize: '0.8rem' }}>
                            <MenuItem value={0}>Standard</MenuItem><MenuItem value={-10}>Dense</MenuItem><MenuItem value={-20}>Compact</MenuItem><MenuItem value={-30}>Ultra</MenuItem>
                        </Select>
                    </Stack>
                )}
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {(viewMode === 'table' && !selectedDetailOpportunityId) && (
                        <Box sx={{ flex: 1, minHeight: 400 }}>
                            <DataGrid rows={filteredRows} loading={loading} columns={columns} checkboxSelection rowHeight={70} getRowId={(row) => row.id} pagination paginationModel={paginationModel} onPaginationModelChange={setPaginationModel} pageSizeOptions={[10, 15, 25, 50]} onRowSelectionModelChange={(newSelection) => { setSelectedOpportunityIds(Array.isArray(newSelection) ? newSelection : []); }} disableRowSelectionOnClick onRowClick={(params) => setSelectedDetailOpportunityId(params.id)} sx={{ border: 'none', [`& .${gridClasses.row}`]: { cursor: 'pointer' }, [`& .${gridClasses.columnHeaders}`]: { borderBottom: 0 }, [`& .${gridClasses.cell}`]: { borderBottom: 0 } }} />
                        </Box>
                    )}
                    {(viewMode !== 'table' || selectedDetailOpportunityId) && (
                        <Box sx={{ flex: 1, overflowY: 'auto' }}>
                            {viewMode === 'compact' || selectedDetailOpportunityId ? (
                                <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
                                    {filteredRows.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize).map((opportunity) => {
                                        const name = opportunity.displayName || 'Unknown';
                                        const isSelected = opportunity.id === selectedDetailOpportunityId;
                                        let py = 1.5; let avSize = 36;
                                        if (listZoom === -10) { py = 1; avSize = 32; } else if (listZoom === -20) { py = 0.5; avSize = 28; } else if (listZoom === -30) { py = 0.25; avSize = 24; }
                                        return (
                                            <Stack key={opportunity.id} direction="row" alignItems="center" onClick={() => setSelectedDetailOpportunityId(opportunity.id)} sx={{ py, px: 2, cursor: 'pointer', bgcolor: isSelected ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
                                                <Checkbox size="small" />
                                                <Avatar variant="rounded" sx={{ width: avSize, height: avSize, mr: 2, bgcolor: stringToColor(name), fontWeight: 700 }}>{getInitials(name)}</Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography fontWeight={700} noWrap>{name}</Typography>
                                                    <Typography variant="caption" color="text.secondary" noWrap>{opportunity.company}</Typography>
                                                </Box>
                                                <Chip variant="outlined" color="success" label={opportunity.status || 'Open'} size="small" />
                                            </Stack>
                                        );
                                    })}
                                </Box>
                            ) : (
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,260px),1fr))', gap: 3 }}>
                                    {filteredRows.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize).map((opportunity) => {
                                        const name = opportunity.displayName || 'Unknown';
                                        return (
                                            <Card key={opportunity.id} variant="outlined" onClick={() => setSelectedDetailOpportunityId(opportunity.id)} sx={{ cursor: 'pointer', borderRadius: 3, border: 0, boxShadow: 1, p: 2.5, transition: 'all 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                                    <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: stringToColor(name), fontWeight: 700, borderRadius: 2 }}>{getInitials(name)}</Avatar>
                                                    <Checkbox size="small" />
                                                </Stack>
                                                <Box sx={{ mb: 3 }}>
                                                    <Typography variant="h6" fontWeight={700} noWrap>{name}</Typography>
                                                    <Typography variant="body2" color="text.secondary" noWrap>{opportunity.company || 'No Company'}</Typography>
                                                </Box>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Chip variant="outlined" color="success" label={opportunity.status || 'Open'} size="small" />
                                                </Stack>
                                            </Card>
                                        );
                                    })}
                                </Box>
                            )}
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                <Typography variant="body2" color="text.secondary">Showing {(paginationModel.page * paginationModel.pageSize) + 1} to {Math.min((paginationModel.page + 1) * paginationModel.pageSize, filteredRows.length)} of {filteredRows.length}</Typography>
                                <Pagination count={Math.ceil(filteredRows.length / paginationModel.pageSize) || 1} page={paginationModel.page + 1} onChange={(e, val) => setPaginationModel(prev => ({ ...prev, page: val - 1 }))} color="primary" shape="rounded" />
                            </Stack>
                        </Box>
                    )}
                </Box>
            </Box>

            {selectedDetailOpportunityId && (
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: { xs: 2, md: 4 }, overflowY: 'auto', bgcolor: 'background.paper' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 4, pb: 2 }}>
                        <Box>
                            <Typography variant="h5" fontWeight={800}>{rows.find(r => r.id === selectedDetailOpportunityId)?.displayName || selectedDetailOpportunityId}</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedDetailOpportunityId}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" onClick={() => navigateTo(`/m/crmq/edit-opportunity/${selectedDetailOpportunityId}`)}>Edit</Button>
                            <Button variant="contained" onClick={() => { if (onOpportunityClick) onOpportunityClick(selectedDetailOpportunityId); else navigateTo(`/m/crmq/view-opportunity/${selectedDetailOpportunityId}`); }}>View Full Details</Button>
                            <IconButton onClick={() => setSelectedDetailOpportunityId(null)}><IconifyIcon icon="material-symbols:close" /></IconButton>
                        </Stack>
                    </Stack>
                    <OpportunityDetailPanels opportunityId={selectedDetailOpportunityId} activeTab={activeDetailTab} />
                </Box>
            )}
        </Stack>
    );
};
export default OpportunityTable;