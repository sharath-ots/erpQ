"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { 
    Chip, Button, Drawer, Box, Typography, IconButton, Divider, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Grid 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { EnhancedTable } from "../components/sections/table/table_skeleton";
// FIXED IMPORT: Added the 's' to match your supplierMetrics.js exactly
import { fetchSupplierPurchaseOrders, fetchSupplierPurchaseOrdersDetail } from "../services/supplierMetrics.js";

const PAGE_SIZE = 100;

// Strictly format in INR
const formatINR = (value) => value != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value) : "—";

const formatAddress = (address, details) => {
    const fullAddress = details || address || "—";
    return fullAddress === "—" ? fullAddress : fullAddress.split(/<br\s*\/?>/i).map((line, i) => <span key={i}>{line}<br /></span>);
};

const getStatusColor = (status) => {
    const normalized = status?.toLowerCase();
    switch (normalized) {
        case "completed": case "to bill": case "to receive": return "success";
        case "to receive and bill": case "submitted": case "open": return "primary";
        case "draft": return "warning";
        case "cancelled": case "closed": return "error";
        default: return "neutral";
    }
};

// Helper for Yes/No fields
const renderBoolean = (val) => val === 1 || val === true || val === "Yes" ? "Yes" : "No";

export function PurchaseOrderView({ apiBase, getAccessToken }) {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedPo, setSelectedPo] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    const poHeadCells = [
        { id: 'name', numeric: false, disablePadding: false, label: 'PO Number' },
        { 
            id: 'status', 
            numeric: false, 
            disablePadding: false, 
            label: 'Status',
            render: (value) => <Chip label={value ?? "UNKNOWN"} color={getStatusColor(value)} variant="filled" size="small" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }} />
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
            const res = await fetchSupplierPurchaseOrders({ apiBase, getAccessToken, limit: PAGE_SIZE, offset: 0 });
            setRows(res.data ?? []);
        } catch (e) { console.error("Failed to load POs", e); setRows([]); }
        finally { setLoading(false); }
    }, [apiBase, getAccessToken]);

    useEffect(() => { load(); }, [load]);

    const handleRowClick = async (row) => {
        setDrawerOpen(true);
        setDrawerLoading(true);
        setSelectedPo(row); // Pre-fill with list data
        
        try {
            // FIXED API CALL: Using the correct function name
            const detailRes = await fetchSupplierPurchaseOrdersDetail(row.name, { apiBase, getAccessToken });
            setSelectedPo(detailRes.data || row);
        } catch (error) { 
            console.error("Failed to fetch PO details", error); 
        } finally { 
            setDrawerLoading(false); 
        }
    };

    return (
        <Box>
            <EnhancedTable 
                title="Purchase Orders"
                headCells={poHeadCells} 
                rows={rows} 
                uniqueKey="name" 
                defaultSort="transaction_date"
                onRowClick={handleRowClick}
            />

            {/* Exactly 50vw for half-screen drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: '50vw' } } }}>
                {selectedPo && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
                        
                        {/* ================= HEADER ================= */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5" fontWeight={700}>{selectedPo.name}</Typography>
                                <Chip label={selectedPo.status ?? "UNKNOWN"} color={getStatusColor(selectedPo.status)} size="small" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }} />
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {/* ================= SCROLLABLE BODY ================= */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                            
                            {/* Metadata Grid (Adjusted for 50vw space) */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">SUPPLIER</Typography>
                                    <Typography variant="body2">{selectedPo.supplier || "—"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">ORDER CONFIRMATION NO</Typography>
                                    <Typography variant="body2">{selectedPo.order_confirmation_no || "—"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">DATE</Typography>
                                    <Typography variant="body2">{selectedPo.transaction_date || "—"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">REQUIRED BY</Typography>
                                    <Typography variant="body2">{selectedPo.schedule_date || "—"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">TAX WITHHOLDING (TDS)</Typography>
                                    <Typography variant="body2">{renderBoolean(selectedPo.apply_tds)}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">IS SUBCONTRACTED</Typography>
                                    <Typography variant="body2">{renderBoolean(selectedPo.is_subcontracted)}</Typography>
                                </Grid>
                            </Grid>
                            
                            <Divider sx={{ mb: 3 }} />

                            {/* Addresses Grid */}
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>COMPANY BILLING ADDRESS</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>{selectedPo.billing_address || "—"}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                        {formatAddress(selectedPo.billing_address, selectedPo.billing_address_display)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>SHIPPING ADDRESS</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>{selectedPo.shipping_address || "—"}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                        {formatAddress(selectedPo.shipping_address, selectedPo.shipping_address_display)}
                                    </Typography>
                                </Grid>
                            </Grid>

                            {/* Items Table */}
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Items</Typography>
                            {drawerLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={30} /></Box>
                            ) : (
                                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                                            <TableRow>
                                                <TableCell>No.</TableCell>
                                                <TableCell>Item Code</TableCell>
                                                <TableCell>Required By</TableCell>
                                                <TableCell align="right">Qty</TableCell>
                                                <TableCell>UOM</TableCell>
                                                <TableCell align="right">Rate (INR)</TableCell>
                                                <TableCell align="right">Amount (INR)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedPo.items?.length > 0 ? (
                                                selectedPo.items.map((item, i) => (
                                                    <TableRow key={i} hover>
                                                        <TableCell>{item.idx || i + 1}</TableCell>
                                                        <TableCell sx={{ fontWeight: 500 }}>
                                                            {item.item_code}
                                                            {item.item_name && item.item_name !== item.item_code ? `: ${item.item_name}` : ""}
                                                        </TableCell>
                                                        <TableCell>{item.schedule_date || selectedPo.schedule_date || "—"}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty}</TableCell>
                                                        <TableCell><Chip label={item.uom} size="small" variant="outlined" /></TableCell>
                                                        <TableCell align="right">{formatINR(item.rate)}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatINR(item.amount)}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>No items found in this PO.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            {/* Taxes, Discounts, Totals Blocks */}
                            {!drawerLoading && (
                                <Grid container spacing={3} sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                    
                                    {/* Column 1: Taxes & Terms */}
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1}>Taxes and Charges</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Tax Category</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.tax_category || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Incoterm</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.incoterm || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Named Place</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.named_place || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Total Taxes (INR)</Typography>
                                        <Typography variant="body2" fontWeight={700}>{formatINR(selectedPo.total_taxes_and_charges)}</Typography>
                                    </Grid>

                                    {/* Column 2: Discounts */}
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1}>Additional Discount</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Apply Discount On</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.apply_discount_on || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Discount Percentage</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.additional_discount_percentage ? `${selectedPo.additional_discount_percentage}%` : "0%"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Discount Amount (INR)</Typography>
                                        <Typography variant="body2" fontWeight={700}>{formatINR(selectedPo.discount_amount)}</Typography>
                                    </Grid>

                                    {/* Column 3: Totals */}
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1}>Totals</Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Advance Paid</Typography>
                                            <Typography variant="body2">{formatINR(selectedPo.advance_paid)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Rounding</Typography>
                                            <Typography variant="body2">{formatINR(selectedPo.rounding_adjustment)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Disable Rounded Total</Typography>
                                            <Typography variant="body2">{renderBoolean(selectedPo.disable_rounded_total)}</Typography>
                                        </Box>
                                        
                                        <Divider sx={{ my: 1 }} />
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography variant="body1" fontWeight={700}>Rounded Total</Typography>
                                            <Typography variant="body1" fontWeight={700}>{formatINR(selectedPo.rounded_total)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                                            <Typography variant="subtitle1" fontWeight={700} color="primary.main">{formatINR(selectedPo.grand_total)}</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" fontStyle="italic" sx={{ lineHeight: 1.2, display: 'block' }}>
                                            {selectedPo.in_words || "—"}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            )}

                            {/* Comments Section */}
                            {!drawerLoading && selectedPo.comment && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block">
                                        Comments
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', color: 'text.secondary', bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                                        {selectedPo.comment}
                                    </Typography>
                                </Box>
                            )}
                            
                        </Box> {/* End Scrollable Body */}
                    </Box>
                )}
            </Drawer>
        </Box>
    );
}