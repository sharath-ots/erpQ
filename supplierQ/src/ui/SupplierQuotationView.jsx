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
    Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { EnhancedTable } from "../components/sections/table/table_skeleton";
import { fetchSupplierQuotations, fetchSupplierQuotationDetail } from "../services/supplierMetrics.js";

const PAGE_SIZE = 100; 

// Formatter for INR currency (e.g., ₹ 1,63,800.00)
const formatINR = (value) => {
    if (value == null) return "—";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
};

// Formatter for addresses with <br> tags
const formatAddress = (address, details) => {
    const fullAddress = details || address || "—";
    if (fullAddress === "—") return fullAddress;
    
    return fullAddress.split(/<br\s*\/?>/i).map((line, i) => (
        <span key={i}>
            {line}
            <br />
        </span>
    ));
};

// Semantic status colors
const getStatusColor = (status) => {
    const normalized = status?.toLowerCase();
    switch (normalized) {
        case "submitted": return "success";
        case "open": return "primary";
        case "draft": return "warning";
        case "cancelled": return "error";
        default: return "neutral"; 
    }
};

export function SupplierQuotationView({ apiBase, getAccessToken }) {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    const sqHeadCells = [
        { id: 'name', numeric: false, disablePadding: false, label: 'Quotation Number' },
        { 
            id: 'status', 
            numeric: false, 
            disablePadding: false, 
            label: 'Status',
            render: (value) => (
                <Chip 
                    label={value ?? "UNKNOWN"} 
                    color={getStatusColor(value)} 
                    variant="filled"
                    size="small" 
                    sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }}
                />
            )
        },
        { id: 'transaction_date', numeric: false, disablePadding: false, label: 'Date' },
        { 
            id: 'grand_total', 
            numeric: true, 
            disablePadding: false, 
            label: 'Grand Total (INR)',
            render: (value) => formatINR(value)
        }
    ];

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchSupplierQuotations({ apiBase, getAccessToken, limit: PAGE_SIZE, offset: 0 });
            setRows(res.data ?? []);
        } catch (e) {
            console.error("Failed to load Quotations", e);
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
        setSelectedQuotation(row); 
        
        try {
            // This will now hit the new backend route you added above
            const detailRes = await fetchSupplierQuotationDetail(row.name, { apiBase, getAccessToken });
            setSelectedQuotation(detailRes.data || row);
        } catch (error) {
            console.error("Failed to fetch Quotation details", error);
        } finally {
            setDrawerLoading(false);
        }
    };

    return (
        <Box>
            <EnhancedTable 
                title="My Quotations"
                headCells={sqHeadCells} 
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
                    sx: { width: { xs: '100%', md: '70vw' } } // 70% width
                }}
            >
                {selectedQuotation && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
                        
                        {/* ================= FIXED HEADER ================= */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5" fontWeight={700}>
                                    {selectedQuotation.name || selectedQuotation.quotation_number}
                                </Typography>
                                <Chip 
                                    label={selectedQuotation.status ?? "UNKNOWN"} 
                                    color={getStatusColor(selectedQuotation.status)} 
                                    size="small" 
                                    sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }}
                                />
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                        
                        <Divider sx={{ mb: 2, flexShrink: 0 }} />

                        {/* ================= SCROLLABLE BODY ================= */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                            
                            {/* Basic Metadata */}
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                        Supplier
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {selectedQuotation.supplier || "—"}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                        Date
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {selectedQuotation.transaction_date || "—"}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                        Valid Till
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {selectedQuotation.valid_till || "—"}
                                    </Typography>
                                </Grid>
                            </Grid>

                            <Divider sx={{ mb: 3 }} />

                            {/* Addresses */}
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block">
                                        Company Billing Address
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                                        {selectedQuotation.billing_address || "—"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                        {formatAddress(selectedQuotation.billing_address, selectedQuotation.billing_address_display)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block">
                                        Shipping Address
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                                        {selectedQuotation.shipping_address || "—"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                        {formatAddress(selectedQuotation.shipping_address, selectedQuotation.shipping_address_display)}
                                    </Typography>
                                </Grid>
                            </Grid>

                            <Divider sx={{ mb: 3 }} />

                            {/* Quotation Items Table */}
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                                    Items
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
                                                    <TableCell>No.</TableCell>
                                                    <TableCell>Item Code</TableCell>
                                                    <TableCell align="right">Quantity</TableCell>
                                                    <TableCell>UOM</TableCell>
                                                    <TableCell align="right">Rate (INR)</TableCell>
                                                    <TableCell align="right">Amount (INR)</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedQuotation.items?.length > 0 ? (
                                                    selectedQuotation.items.map((item, index) => (
                                                        <TableRow key={index} hover>
                                                            <TableCell>{item.idx || index + 1}</TableCell>
                                                            <TableCell sx={{ fontWeight: 500 }}>{item.item_code}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty}</TableCell>
                                                            <TableCell>
                                                                <Chip label={item.uom} size="small" variant="outlined" />
                                                            </TableCell>
                                                            <TableCell align="right">{formatINR(item.rate)}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                                {formatINR(item.amount)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                            No items found for this Quotation.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>

                            {/* Taxes, Terms & Totals */}
                            {!drawerLoading && (
                                <Grid container spacing={3} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                    
                                    {/* Taxes and Charges */}
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1}>Taxes and Charges</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Tax Category</Typography>
                                        <Typography variant="body2">{selectedQuotation.tax_category || "—"}</Typography>
                                    </Grid>

                                    {/* Incoterms */}
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1}>Shipping Terms</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Incoterm</Typography>
                                        <Typography variant="body2" mb={1}>{selectedQuotation.incoterm || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Named Place</Typography>
                                        <Typography variant="body2">{selectedQuotation.named_place || "—"}</Typography>
                                    </Grid>

                                    {/* Totals */}
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1}>Totals</Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Total Quantity</Typography>
                                            <Typography variant="body2" fontWeight={700}>{selectedQuotation.total_qty ?? "—"}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Total Net Weight</Typography>
                                            <Typography variant="body2" fontWeight={700}>{selectedQuotation.total_net_weight ?? "—"}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary">Total (INR)</Typography>
                                            <Typography variant="body2" fontWeight={700}>{formatINR(selectedQuotation.total)}</Typography>
                                        </Box>
                                        <Divider sx={{ my: 1 }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                                            <Typography variant="h6" fontWeight={700} color="primary.main">
                                                {formatINR(selectedQuotation.grand_total)}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                </Grid>
                            )}
                        </Box> {/* End Scrollable Body */}

                        {/* ================= FIXED FOOTER ================= */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, mt: 1, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                            <Button 
                                variant="outlined" 
                                color="primary" 
                                size="large"
                                onClick={() => router.push(`/m/supplierq/quotation/edit?id=${selectedQuotation.name}`)}
                            >
                                Edit Quotation
                            </Button>
                        </Box>

                    </Box>
                )}
            </Drawer>
        </Box>
    );
}