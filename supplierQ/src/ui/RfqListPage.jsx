"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { 
    Chip, 
    Button, 
    Drawer, 
    Box, 
    Typography, 
    IconButton, 
    Divider, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    CircularProgress,
    TextField 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { EnhancedTable } from "../components/sections/table/table_skeleton";
import { fetchSupplierRfqs, fetchSupplierRfqDetail } from "../services/supplierMetrics.js";

const PAGE_SIZE = 100; 

const getThemeStatusColor = (status) => {
    const normalized = status?.toLowerCase();
    switch (normalized) {
        case "submitted":
        case "open": return "primary";
        case "draft": return "warning";
        case "completed":
        case "awarded": return "success";
        case "cancelled":
        case "rejected": return "error";
        default: return "default"; 
    }
};

export function RfqListPage({ apiBase, getAccessToken }) {
    const router = useRouter(); 
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedRfq, setSelectedRfq] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    const rfqHeadCells = [
        { id: 'name', numeric: false, disablePadding: false, label: 'RFQ Number' },
        { 
            id: 'status', 
            numeric: false, 
            disablePadding: false, 
            label: 'Status',
            render: (value) => (
                <Chip 
                    label={value ?? "UNKNOWN"} 
                    color={getThemeStatusColor(value)} 
                    variant="filled"
                    size="small" 
                    sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }}
                />
            )
        },
        { id: 'transaction_date', numeric: false, disablePadding: false, label: 'Issued Date' },
        { id: 'schedule_date', numeric: false, disablePadding: false, label: 'Required Date' },
        {
            id: 'actions',
            numeric: false,
            disablePadding: false,
            label: 'Action',
            render: (_, row) => (
                <Button 
                    variant="contained" 
                    size="small"
                    color="primary"
                    onClick={(e) => {
                        e.stopPropagation(); 
                        router.push(`/m/supplierq/quotation/new?rfq_id=${row.name}`);
                    }}
                >
                    Draft Quote
                </Button>
            )
        }
    ];

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchSupplierRfqs({ apiBase, getAccessToken, limit: PAGE_SIZE, offset: 0 });
            setRows(res.data ?? []);
        } catch (e) {
            console.error("Failed to load RFQs", e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase, getAccessToken]);

    useEffect(() => {
        load();
    }, [load]);

    // Handle Row Click to open Drawer
    const handleRowClick = async (row) => {
        setDrawerOpen(true);
        setDrawerLoading(true);
        setSelectedRfq(row); // Set initial data for immediate display
        
        try {
            // Fetch detailed line items
            const detailRes = await fetchSupplierRfqDetail(row.name, { apiBase, getAccessToken });
            setSelectedRfq(detailRes.data || row);
        } catch (error) {
            console.error("Failed to fetch RFQ details", error);
        } finally {
            setDrawerLoading(false);
        }
    };

    return (
        <Box>
            <EnhancedTable 
                title="Requests for Quotation"
                headCells={rfqHeadCells} 
                rows={rows} 
                uniqueKey="name" 
                defaultSort="transaction_date"
                onRowClick={handleRowClick} 
            />

            {/* SIDE LAYOUT / DRAWER */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: { width: { xs: '100%', md: '75vw' } }
                }}
            >
                {selectedRfq && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
                        
                        {/* Fixed Drawer Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5" fontWeight={700}>
                                    {selectedRfq.name}
                                </Typography>
                                <Chip 
                                    label={selectedRfq.status ?? "UNKNOWN"} 
                                    color={getThemeStatusColor(selectedRfq.status)} 
                                    size="small" 
                                    sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }}
                                />
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)}>
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* NEW: Scrollable Body wrapper to prevent items from being pushed off-screen */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, mb: 2 }}>
                            
                            {/* Drawer Metadata: Dates */}
                            <Box sx={{ display: 'flex', gap: 4, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                        Issued Date
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {selectedRfq.transaction_date || "—"}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                        Required By
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {selectedRfq.schedule_date || "—"}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {/* Requested Items Table */}
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                                    Requested Items
                                </Typography>
                                
                                {drawerLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                                        <CircularProgress size={30} />
                                    </Box>
                                ) : (
                                    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                                <TableRow>
                                                    <TableCell>Item Code</TableCell>
                                                    <TableCell>Description</TableCell>
                                                    <TableCell align="right">Qty</TableCell>
                                                    <TableCell>UOM</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedRfq.items?.length > 0 ? (
                                                    selectedRfq.items.map((item, index) => (
                                                        <TableRow key={index} hover>
                                                            <TableCell sx={{ fontWeight: 500 }}>{item.item_code}</TableCell>
                                                            <TableCell>{item.item_name || item.description || "—"}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty}</TableCell>
                                                            <TableCell>
                                                                <Chip label={item.uom} size="small" variant="outlined" />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                            No items found for this RFQ.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {/* Drawer Metadata: Billing Address */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                    Company Billing Address
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                    {(selectedRfq.billing_address_display || selectedRfq.billing_address || "—")
                                        .split(/<br\s*\/?>/i)
                                        .map((line, i) => (
                                            <span key={i}>
                                                {line}
                                                <br />
                                            </span>
                                        ))}
                                </Typography>
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {/* Drawer Metadata: Message for Supplier (UNCHANGED LOOK AND STYLE) */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block" mb={1}>
                                    Message for Supplier
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    maxRows={5}
                                    value={selectedRfq.message_for_supplier || ""}
                                    placeholder="No message provided."
                                    InputProps={{ readOnly: true }}
                                />
                            </Box>

                            <Divider sx={{ mb: 3 }} />
                            
                        </Box>

                        {/* Fixed Footer Action */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                size="large"
                                onClick={() => router.push(`/m/supplierq/quotation/new?rfq_id=${selectedRfq.name}`)}
                            >
                                Draft Quotation
                            </Button>
                        </Box>

                    </Box>
                )}
            </Drawer>
        </Box>
    );
}