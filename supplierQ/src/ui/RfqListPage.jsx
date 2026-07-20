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
    TextField,
    Modal,
    Backdrop,
    Fade,
    Paper,
    Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { EnhancedTable } from "../components/sections/table/table_skeleton";

// Ensure these imports match your project's directory structure
import IconifyIcon from 'components/base/IconifyIcon';
import Image from 'components/base/Image'; 

import { 
    fetchSupplierRfqs, 
    fetchSupplierRfqDetail, 
    fetchItemDetails, 
    fetchLinkedTitle,
    fetchItemImage,
    fetchPrivateImageBlob
} from "../services/supplierMetrics.js";

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

// Strict INR formatting function
const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
};

// Resolves correct path for images
const resolveImageUrl = (imagePath, apiBase) => {
  if (!imagePath) return 'https://placehold.co/150x150?text=No+Image';
  if (imagePath.startsWith("http")) return imagePath;

  let host = 'https://dashboard.versaq.eu';
  try {
    host = new URL(apiBase || host).origin;
  } catch (e) {
    if (typeof window !== 'undefined') {
      host = window.location.origin;
    }
  }

  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${host}${path}`;
};
  
// Helper component for clean modal rows
const DetailRow = ({ label, value }) => (
    <Stack direction="row" justifyContent="space-between" py={1.5} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={600} textAlign="right" sx={{ maxWidth: '60%', wordBreak: 'break-word' }}>
            {value !== undefined && value !== null && value !== '' ? value : '—'}
        </Typography>
    </Stack>
);

export function RfqListPage({ apiBase, getAccessToken }) {
    const router = useRouter(); 
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedRfq, setSelectedRfq] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Item Modal State
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [itemDetails, setItemDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

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

    // Handle Requested Item Click to open Item Modal
    const handleItemClick = async (itemCode) => {
        setItemModalOpen(true);
        setDetailsLoading(true);
        setItemDetails(null); // Reset before fetching new item
        
        try {
            const data = await fetchItemDetails(itemCode, { apiBase, getAccessToken });
            
            if (data) {
                // Fetch Human-Readable Titles for Link Fields
                const [systemName, subSystemName, typeOfItemName, variantOfName] = await Promise.all([
                    data.system ? fetchLinkedTitle("System", data.system, { apiBase, getAccessToken }) : null,
                    data.sub_system ? fetchLinkedTitle("Sub System", data.sub_system, { apiBase, getAccessToken }) : null,
                    data.type_of_item ? fetchLinkedTitle("Type of Item", data.type_of_item, { apiBase, getAccessToken }) : null,
                    data.variant_of ? fetchLinkedTitle("Item", data.variant_of, { apiBase, getAccessToken }) : null, // Added Variant Of
                ]);

                // Handle Image Resolution
                let imagePath = data.image;
                if (!imagePath) {
                    imagePath = await fetchItemImage(itemCode, { apiBase, getAccessToken });
                }

                let finalImageSrc = resolveImageUrl(imagePath, apiBase);

                // Fetch Private Blob if required
                if (imagePath && imagePath.includes('/private/files/')) {
                    const secureBlobUrl = await fetchPrivateImageBlob(imagePath, { apiBase, getAccessToken });
                    if (secureBlobUrl) {
                        finalImageSrc = secureBlobUrl;
                    }
                }

                setItemDetails({
                    ...data,
                    image: finalImageSrc, // Inject resolved image URL
                    system: systemName || data.system,
                    sub_system: subSystemName || data.sub_system,
                    type_of_item: typeOfItemName || data.type_of_item,
                    variant_of: variantOfName || data.variant_of // Inject Variant title
                });
            }
        } catch (error) {
            console.error("Failed to load item details", error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleCloseItemModal = () => setItemModalOpen(false);

    return (
        <Box>
            <EnhancedTable 
                title="Requests for Quotation"
                headCells={rfqHeadCells} 
                rows={rows} 
                uniqueKey="name" 
                defaultSort="transaction_date"
                onRowClick={handleRowClick} 
                loading={loading}
            />

            {/* SIDE LAYOUT / DRAWER */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{
                    '& .MuiDrawer-paper': { 
                        width: '40vw', 
                        minWidth: '600px', 
                        maxWidth: '1200px'
                    }
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

                        {/* Scrollable Body wrapper */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, mb: 2 }}>
                            
                            {/* Drawer Metadata: Dates */}
                            <Box sx={{ display: 'flex', gap: 6, mb: 3, flexDirection: 'row' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                        Issued Date
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
                                        {selectedRfq.transaction_date || "—"}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                                        Required By
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
                                        {selectedRfq.schedule_date || "—"}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {/* Requested Items Table */}
                            <Box sx={{ mb: 4 }}>
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
                                                    <TableCell>Item Name</TableCell>
                                                    <TableCell align="right">Quantity</TableCell>
                                                    <TableCell align="right">Price (INR)</TableCell>
                                                    <TableCell>Unit</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedRfq.items?.length > 0 ? (
                                                    selectedRfq.items.map((item, index) => (
                                                        <TableRow 
                                                            key={index} 
                                                            hover 
                                                            onClick={() => handleItemClick(item.item_code)}
                                                            sx={{ cursor: 'pointer' }}
                                                        >
                                                            <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>
                                                                {item.item_code}
                                                            </TableCell>
                                                            <TableCell>{item.item_name || item.description || "—"}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                                {formatINR(item.default_item_price) ?? formatINR(item.rate) ?? formatINR(item.price) ?? "—"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip label={item.uom} size="small" variant="outlined" />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
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

                            {/* Side-by-Side Grid Layout for Address & Message */}
                            <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
                                
                                {/* Left Side: Billing Address */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block" mb={1}>
                                        Supplier Address
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
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

                                {/* Right Side: Message for Supplier */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" display="block" mb={1}>
                                        Message for Supplier
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        maxRows={6}
                                        value={selectedRfq.message_for_supplier || ""}
                                        placeholder="No message provided."
                                        InputProps={{ readOnly: true }}
                                        sx={{ bgcolor: 'action.hover' }}
                                    />
                                </Box>
                            </Box>
                            
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

            {/* ITEM DETAILS MODAL */}
            <Modal
                aria-labelledby="transition-modal-title"
                aria-describedby="transition-modal-description"
                open={itemModalOpen}
                onClose={handleCloseItemModal}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{
                    backdrop: { timeout: 500 },
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    zIndex: 1400 // Ensure modal stays above drawer (Drawer is usually 1200 or 1300)
                }}
            >
                <Fade in={itemModalOpen} mountOnEnter unmountOnExit>
                    <Paper
                        sx={{
                            width: { xs: '100%', sm: 500, md: 600 },
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            borderRadius: 4,
                            p: 4,
                            outline: 'none',
                            position: 'relative'
                        }}
                    >
                        <IconButton 
                            onClick={handleCloseItemModal} 
                            sx={{ position: 'absolute', top: 16, right: 16 }}
                        >
                            <IconifyIcon icon="material-symbols:close" sx={{ fontSize: 24 }} />
                        </IconButton>

                        <Typography id="transition-modal-title" variant="h5" component="h2" fontWeight={700} mb={3}>
                            Item Details
                        </Typography>

                        {detailsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                                <CircularProgress />
                            </Box>
                        ) : itemDetails ? (
                            <Stack direction="column">
                                <Box sx={{ display: 'flex', gap: 3, mb: 4, alignItems: 'center' }}>
                                    <Box sx={{ position: 'relative', width: 100, height: 100, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        <Image src={itemDetails.image} alt={itemDetails.item_name} fill sx={{ objectFit: 'contain' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>{itemDetails.item_code}</Typography>
                                        <Typography variant="body2" color="text.secondary">{itemDetails.item_name}</Typography>
                                    </Box>
                                </Box>

                                <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                                    Classification
                                </Typography>
                                <Box mb={3}>
                                    <DetailRow label="Item Group" value={itemDetails.item_group} />
                                    <DetailRow label="Variant Of" value={itemDetails.variant_of} />
                                    <DetailRow label="System" value={itemDetails.system} />
                                    <DetailRow label="Sub System" value={itemDetails.sub_system} />
                                    <DetailRow label="Type of Item" value={itemDetails.type_of_item} />
                                </Box>

                                {/* <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                                    Inventory & Settings
                                </Typography>
                                <Box mb={3}>
                                    <DetailRow label="Default Unit of Measure" value={itemDetails.stock_uom} />
                                    <DetailRow label="Valuation Rate" value={formatINR(itemDetails.valuation_rate)} />
                                    <DetailRow label="Disabled" value={itemDetails.disabled === 1 ? 'Yes' : 'No'} />
                                    <DetailRow label="Allow Alternative Item" value={itemDetails.allow_alternative_item === 1 ? 'Yes' : 'No'} />
                                    <DetailRow label="Maintain Stock" value={itemDetails.is_stock_item === 1 ? 'Yes' : 'No'} />
                                    <DetailRow label="Has Variants" value={itemDetails.has_variants === 1 ? 'Yes' : 'No'} />
                                    <DetailRow label="Is Fixed Asset" value={itemDetails.is_fixed_asset === 1 ? 'Yes' : 'No'} />
                                </Box>

                                <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                                    Allowances
                                </Typography>
                                <Box mb={3}>
                                    <DetailRow label="Over Delivery/Receipt Allowance (%)" value={`${itemDetails.over_delivery_receipt_allowance || 0}%`} />
                                    <DetailRow label="Over Billing Allowance (%)" value={`${itemDetails.over_billing_allowance || 0}%`} />
                                </Box> */}

                                {itemDetails.description && (
                                    <>
                                        <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                                            Description
                                        </Typography>
                                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                            <Typography variant="body2" dangerouslySetInnerHTML={{ __html: itemDetails.description }} />
                                        </Paper>
                                    </>
                                )}
                            </Stack>
                        ) : (
                            <Typography color="error">Failed to load item details.</Typography>
                        )}
                    </Paper>
                </Fade>
            </Modal>
        </Box>
    );
}