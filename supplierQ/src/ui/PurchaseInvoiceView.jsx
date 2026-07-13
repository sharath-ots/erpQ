"use client";

import { useCallback, useEffect, useState } from "react";
import Chip from '@mui/material/Chip';
import { EnhancedTable } from "../components/sections/table/table_skeleton";
import { fetchPurchaseInvoices } from "../services/supplierMetrics.js";

const PAGE_SIZE = 100; // Fetch enough so MUI pagination handles it locally

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
            return "neutral"; // Fallback for Aurora
    }
};

// Define the structure of your table columns for Purchase Invoices
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
        numeric: true, // Right-aligns the currency column
        disablePadding: false, 
        label: 'Grand Total',
        // Preserve your USD currency formatting
        render: (value) => value != null 
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
            : "—"
    }
];

export function PurchaseInvoiceView({ apiBase, getAccessToken }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

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

    return (
        <EnhancedTable 
            title="My Purchase Invoices"
            headCells={piHeadCells} 
            rows={rows} 
            uniqueKey="name" // Invoices use "name" as the primary ID
            defaultSort="posting_date"
        />
    );
}