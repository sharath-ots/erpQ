"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { 
    Chip, Button, Drawer, Box, Typography, IconButton, Divider, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Icon as IconifyIcon } from '@iconify/react';
import CloseIcon from '@mui/icons-material/Close';
import { EnhancedTable } from "../components/sections/table/table_skeleton";
import { fetchSupplierPurchaseOrders, fetchSupplierPurchaseOrdersDetail } from "../services/supplierMetrics.js";

// Styled component for the file upload input
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

const PAGE_SIZE = 100;

// Strictly format in INR
const formatINR = (value) => value != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value) : "—";

const formatAddress = (address, details) => {
    const fullAddress = details && details !== "—" ? details : (address || "—");
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
    
    // ==========================================
    // MISSING STATE ADDED HERE
    // ==========================================
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("po_name", selectedPo.name);
            formData.append("supplier", selectedPo.supplier);

            const response = await fetch('/api/ai/process-invoice', {
                method: 'POST',
                body: formData,
            });

            // 🐛 FIX: Capture the exact error message from the backend
            if (!response.ok) {
                let errorMsg = "Unknown Server Error";
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server returned status: ${response.status}`;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            alert(`Successfully created Purchase Invoice: ${data.invoice.name}`);
            
            load();
            setDrawerOpen(false);
        } catch (error) {
            console.error("Upload error:", error);
            // This alert will now tell us EXACTLY what is breaking in the backend!
            alert(`Upload Failed: \n\n${error.message}`); 
        } finally {
            setIsUploading(false);
            event.target.value = null;
        }
    };

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
        setSelectedPo(row); 
        
        try {
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
                loading={loading}
            />

            <Drawer 
                anchor="right" 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                sx={{
                    // Aggressive width override matching RFQ and SQ
                    '& .MuiDrawer-paper': { 
                        width: '55vw', 
                        minWidth: '600px', 
                        maxWidth: '1200px'
                    }
                }}
            >
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
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, mb: 2 }}>
                            
                            {/* METADATA: Row 1 (Forced 3-column perfect alignment) */}
                            <Box sx={{ display: 'flex', gap: 4, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Supplier</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedPo.supplier || "—"}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Order Confirmation No</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedPo.order_confirmation_no || "—"}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Date</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedPo.transaction_date || "—"}</Typography>
                                </Box>
                            </Box>

                            {/* METADATA: Row 2 (Forced 3-column perfect alignment) */}
                            <Box sx={{ display: 'flex', gap: 4, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Required By</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{selectedPo.schedule_date || "—"}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Tax Withholding (TDS)</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{renderBoolean(selectedPo.apply_tds)}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Is Subcontracted</Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>{renderBoolean(selectedPo.is_subcontracted)}</Typography>
                                </Box>
                            </Box>
                            
                            <Divider sx={{ mb: 3 }} />

                            {/* ADDRESSES: Side-by-Side with ERPNext fallbacks */}
                            <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' }, mb: 3 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block" mb={1}>
                                        Supplier Billing Address
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                                        {/* Added fallback to company_address */}
                                        {(selectedPo.billing_address || selectedPo.company_address) && (selectedPo.billing_address || selectedPo.company_address) !== "—" && (
                                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                {selectedPo.billing_address || selectedPo.company_address}
                                            </span>
                                        )}
                                        <span style={{ color: 'text.secondary' }}>
                                            {formatAddress(
                                                selectedPo.billing_address || selectedPo.company_address, 
                                                selectedPo.billing_address_display || selectedPo.company_address_display || selectedPo.address_display
                                            )}
                                        </span>
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block" mb={1}>
                                        Shipping Address
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                                        {selectedPo.shipping_address && selectedPo.shipping_address !== "—" && (
                                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                {selectedPo.shipping_address}
                                            </span>
                                        )}
                                        <span style={{ color: 'text.secondary' }}>
                                            {formatAddress(selectedPo.shipping_address, selectedPo.shipping_address_display)}
                                        </span>
                                    </Typography>
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
                                                            <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>
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
                            </Box>

                            {/* TAXES, DISCOUNTS & TOTALS */}
                            {!drawerLoading && (
                                <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' }, p: 3, bgcolor: 'action.hover', borderRadius: 2, mb: 3 }}>
                                    
                                    {/* Column 1: Taxes & Terms */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Taxes and Charges</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Tax Category</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.tax_category || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Incoterm</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.incoterm || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Named Place</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.named_place || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Total Taxes (INR)</Typography>
                                        <Typography variant="body2" fontWeight={700}>{formatINR(selectedPo.total_taxes_and_charges)}</Typography>
                                    </Box>

                                    {/* Column 2: Discounts */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Additional Discount</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Apply Discount On</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.apply_discount_on || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Discount Percentage</Typography>
                                        <Typography variant="body2" mb={1}>{selectedPo.additional_discount_percentage ? `${selectedPo.additional_discount_percentage}%` : "0%"}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">Discount Amount (INR)</Typography>
                                        <Typography variant="body2" fontWeight={700}>{formatINR(selectedPo.discount_amount)}</Typography>
                                    </Box>

                                    {/* Column 3: Totals */}
                                    <Box sx={{ flex: 1.5 }}>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Totals</Typography>
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
                                        
                                        <Divider sx={{ my: 1.5 }} />
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography variant="body1" fontWeight={700}>Rounded Total</Typography>
                                            <Typography variant="body1" fontWeight={700}>{formatINR(selectedPo.rounded_total)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                                            <Typography variant="h6" fontWeight={700} color="primary.main">{formatINR(selectedPo.grand_total)}</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" fontStyle="italic" sx={{ lineHeight: 1.2, display: 'block' }}>
                                            {selectedPo.in_words || "—"}
                                        </Typography>
                                    </Box>
                                </Box>
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
                            
                        </Box> 

                        {/* ================= FOOTER / ACTIONS ================= */}
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                            <Button
                                component="label"
                                role={undefined}
                                variant="contained"
                                disabled={isUploading}
                                tabIndex={-1}
                                startIcon={
                                    isUploading ? <CircularProgress size={20} color="inherit" /> : <IconifyIcon icon="material-symbols:cloud-upload" sx={{ fontSize: 20 }} />
                                }
                            >
                                {isUploading ? "Processing AI..." : "Upload file"}
                                <VisuallyHiddenInput 
                                    type="file" 
                                    accept="application/pdf,image/*"
                                    onChange={handleFileUpload} 
                                />
                            </Button>
                        </Box>

                    </Box>
                )}
            </Drawer>
        </Box>
    );
}