"use client";

import { useCallback, useEffect, useState } from "react";
import { 
    Chip, Drawer, Box, Typography, IconButton, Divider, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Button 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Icon as IconifyIcon } from '@iconify/react';
import CloseIcon from '@mui/icons-material/Close';
import { EnhancedTable } from "../components/sections/table/table_skeleton";
import { fetchPurchaseInvoices, fetchPurchaseInvoiceDetail } from "../services/supplierMetrics.js";

const PAGE_SIZE = 100;

// Strictly format in INR to match reference
const formatINR = (value) => value != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value) : "—";

// Helper for Yes/No fields
const renderBoolean = (val) => val === 1 || val === true || val === "Yes" ? "Yes" : "No";

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

// Semantic status colors adapted for ERPNext Purchase Invoices and Aurora theme
const getStatusColor = (status) => {
    const normalized = status?.toLowerCase();
    switch (normalized) {
        case "paid": 
            return "success";
        case "partly paid": 
            return "primary";
        case "unpaid": 
            return "warning";
        case "overdue": 
        case "return":
        case "cancelled": 
            return "error";
        case "draft": 
        default: 
            return "neutral"; 
    }
};

const piHeadCells = [
    { id: 'name', numeric: false, disablePadding: false, label: 'Invoice Number' },
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
    { id: 'posting_date', numeric: false, disablePadding: false, label: 'Posting Date' },
    { 
        id: 'grand_total', 
        numeric: true,
        disablePadding: false, 
        label: 'Grand Total',
        render: (value) => formatINR(value)
    }
];

export function PurchaseInvoiceView({ apiBase, getAccessToken }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchPurchaseInvoices({ apiBase, getAccessToken, limit: PAGE_SIZE, offset: 0 });
            setRows(res.data ?? []);
        } catch (e) {
            console.error("Failed to load Purchase Invoices", e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase, getAccessToken]);

    useEffect(() => { 
        load(); 
    }, [load]);

    const handleRowClick = async (row) => {
        setDrawerOpen(true);
        setDrawerLoading(true);
        setSelectedInvoice(row); 
        
        try {
            // Make sure fetchPurchaseInvoiceDetail is exported in your services
            const detailRes = await fetchPurchaseInvoiceDetail(row.name, { apiBase, getAccessToken });
            setSelectedInvoice(detailRes.data || row);
        } catch (error) { 
            console.error("Failed to fetch Invoice details", error); 
        } finally { 
            setDrawerLoading(false); 
        }
    };

    const uploadButton = (
        <Button
            component="label"
            role={undefined}
            variant="contained"
            tabIndex={-1}
            startIcon={
                <IconifyIcon 
                    icon="material-symbols:cloud-upload" 
                    sx={{ fontSize: 20 }} 
                />
            }
        >
            Upload Invoice
            <VisuallyHiddenInput type="file" />
        </Button>
    );

    return (
        <Box>
            <EnhancedTable 
                title="My Purchase Invoices"
                headCells={piHeadCells} 
                rows={rows} 
                uniqueKey="name" 
                defaultSort="posting_date"
                onRowClick={handleRowClick}
                loading={loading}
                actionNode={uploadButton}
            />

            <Drawer 
                anchor="right" 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                sx={{
                    '& .MuiDrawer-paper': { 
                        width: '55vw', 
                        minWidth: '600px', 
                        maxWidth: '1200px'
                    }
                }}
            >
                {selectedInvoice && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
                        
                        {/* ================= HEADER ================= */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5" fontWeight={700}>{selectedInvoice.name}</Typography>
                                <Chip label={selectedInvoice.status ?? "UNKNOWN"} color={getStatusColor(selectedInvoice.status)} size="small" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }} />
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
                        </Box>
                        
                        <Divider sx={{ mb: 2 }} />

                        {/* ================= SCROLLABLE BODY ================= */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, mb: 2 }}>
                            
                            {/* METADATA: Row 1 */}
                            <Box sx={{ display: 'flex', gap: 4, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Supplier</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
                                        {selectedInvoice.supplier_name || selectedInvoice.supplier || "—"}
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Posting Date</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedInvoice.posting_date || "—"}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Due Date</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedInvoice.due_date || "—"}</Typography>
                                </Box>
                            </Box>

                            {/* METADATA: Row 2 */}
                            <Box sx={{ display: 'flex', gap: 4, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Supplier Invoice No</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedInvoice.bill_no || "—"}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Supplier Invoice Date</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedInvoice.bill_date || "—"}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Is Return (Debit Note)</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{renderBoolean(selectedInvoice.is_return)}</Typography>
                                </Box>
                            </Box>

                            {/* METADATA: Row 3 */}
                            <Box sx={{ display: 'flex', gap: 4, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Is Paid</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{renderBoolean(selectedInvoice.is_paid)}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Tax Withholding (TDS)</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{renderBoolean(selectedInvoice.apply_tds)}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Update Stock</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{renderBoolean(selectedInvoice.update_stock)}</Typography>
                                </Box>
                            </Box>
                            
                            <Divider sx={{ mb: 3 }} />

                            {/* Items Table */}
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle1" fontWeight={700} mb={2}>Items</Typography>
                                {drawerLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={30} /></Box>
                                ) : (
                                    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                                <TableRow>
                                                    <TableCell>No.</TableCell>
                                                    <TableCell>Item</TableCell>
                                                    <TableCell align="right">Accepted Qty</TableCell>
                                                    <TableCell align="right">Rate (INR)</TableCell>
                                                    <TableCell align="right">Amount (INR)</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedInvoice.items?.length > 0 ? (
                                                    selectedInvoice.items.map((item, i) => (
                                                        <TableRow key={i} hover>
                                                            <TableCell>{item.idx || i + 1}</TableCell>
                                                            <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>
                                                                {item.item_code}
                                                                {item.item_name && item.item_name !== item.item_code ? `: ${item.item_name}` : ""}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty}</TableCell>
                                                            <TableCell align="right">{formatINR(item.rate)}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatINR(item.amount)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No items found in this Invoice.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>

                            {/* TAXES, DISCOUNTS & TOTALS */}
                            {!drawerLoading && (
                                <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' }, p: 3, bgcolor: 'action.hover', borderRadius: 2, mb: 3 }}>
                                    
                                    {/* Column 1: Taxes & Terms */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Taxes and Charges</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Incoterm</Typography>
                                        <Typography variant="body2" mb={1}>{selectedInvoice.incoterm || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Named Place</Typography>
                                        <Typography variant="body2" mb={1}>{selectedInvoice.named_place || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Taxes Added / Deducted (INR)</Typography>
                                        <Typography variant="body2" mb={1}>+{formatINR(selectedInvoice.taxes_and_charges_added)} / -{formatINR(selectedInvoice.taxes_and_charges_deducted)}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Total Taxes (INR)</Typography>
                                        <Typography variant="body2" fontWeight={700}>{formatINR(selectedInvoice.total_taxes_and_charges)}</Typography>
                                    </Box>

                                    {/* Column 2: Discounts */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Additional Discount</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Apply Discount On</Typography>
                                        <Typography variant="body2" mb={1}>{selectedInvoice.apply_discount_on || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Discount Percentage</Typography>
                                        <Typography variant="body2" mb={1}>{selectedInvoice.additional_discount_percentage ? `${selectedInvoice.additional_discount_percentage}%` : "0%"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Discount Amount (INR)</Typography>
                                        <Typography variant="body2" fontWeight={700}>{formatINR(selectedInvoice.discount_amount)}</Typography>
                                    </Box>

                                    {/* Column 3: Totals */}
                                    <Box sx={{ flex: 1.5 }}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Totals</Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Total Advance</Typography>
                                            <Typography variant="body2">{formatINR(selectedInvoice.total_advance)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Rounding</Typography>
                                            <Typography variant="body2">{formatINR(selectedInvoice.rounding_adjustment)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">Outstanding Amount</Typography>
                                            <Typography variant="body2" fontWeight={700} color="error.main">{formatINR(selectedInvoice.outstanding_amount)}</Typography>
                                        </Box>
                                        
                                        <Divider sx={{ my: 1.5 }} />
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography variant="body1" fontWeight={700}>Rounded Total</Typography>
                                            <Typography variant="body1" fontWeight={700}>{formatINR(selectedInvoice.rounded_total)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                                            <Typography variant="h6" fontWeight={700} color="primary.main">{formatINR(selectedInvoice.grand_total)}</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" fontStyle="italic" sx={{ lineHeight: 1.2, display: 'block' }}>
                                            {selectedInvoice.in_words || "—"}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                        </Box> 
                    </Box>
                )}
            </Drawer>
        </Box>
    );
}