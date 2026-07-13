"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme, alpha } from "@mui/material/styles";
import Grid from "@mui/material/Grid"; // or Grid2 depending on your setup
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";

// Icons
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PaymentsIcon from "@mui/icons-material/Payments";

import useNumberFormat from "../../../../hooks/useNumberFormat.js";
import { fetchSupplierMetrics } from "../../../../services/supplierMetrics.js";
import { fallbackKpis } from "../../../../data/supplier/dashboard.js";

// --- Helpers & Mappings ---

// Hardcoded INR formatter for strict Indian Rupees enforcement
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(amount || 0);
};

const getKpiConfig = (index, theme) => {
  const configs = [
    { icon: <AssessmentIcon />, color: theme.palette.primary.main },
    { icon: <ReceiptLongIcon />, color: theme.palette.secondary.main },
    { icon: <LocalShippingIcon />, color: theme.palette.warning.main },
    { icon: <AccountBalanceWalletIcon />, color: theme.palette.success.main },
  ];
  return configs[index % configs.length];
};

// --- Sub-components ---

function KpiCard({ label, value, index }) {
  const theme = useTheme();
  const { numberFormat } = useNumberFormat();
  const display = value == null ? "\u2014" : numberFormat(value);
  const { icon, color } = getKpiConfig(index, theme);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          sx={{ fontWeight: 600, letterSpacing: 0.5 }}
        >
          {label}
        </Typography>
        <Box 
          sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: alpha(color, 0.1), 
            color: color,
            display: 'flex' 
          }}
        >
          {icon}
        </Box>
      </Box>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {display}
        </Typography>
      </Stack>
    </Paper>
  );
}

function ActivityChart({ purchaseOrders = [] }) {
  const theme = useTheme();
  const chartData = [...purchaseOrders].reverse();
  const maxTotal = Math.max(...chartData.map(po => po.grand_total || 0), 1); 
  
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Order Volume (INR)</Typography>
          <Typography variant="body2" color="text.secondary">Financial breakdown of recent purchase orders</Typography>
        </Box>
      </Box>
      
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, minHeight: 200 }}>
        {chartData.length === 0 ? (
           <Typography variant="body2" color="text.secondary" sx={{ margin: 'auto' }}>
             No recent activity to display.
           </Typography>
        ) : (
          chartData.map((po) => {
            const heightPct = Math.max(((po.grand_total || 0) / maxTotal) * 100, 2);
            return (
              <Tooltip title={`${po.name} — ${formatINR(po.grand_total)}`} key={po.name}>
                <Box
                  sx={{
                    width: '100%',
                    height: `${heightPct}%`,
                    bgcolor: alpha(theme.palette.primary.main, 0.4),
                    borderRadius: '4px 4px 0 0',
                    transition: 'background-color 0.2s, height 0.5s ease-out',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: theme.palette.primary.main,
                    }
                  }}
                />
              </Tooltip>
            );
          })
        )}
      </Box>
    </Paper>
  );
}

function PerformanceMetrics({ metrics }) {
  const theme = useTheme();
  const data = {
    onTimeDelivery: metrics?.onTimeDelivery ?? 94,
    qualityAcceptance: metrics?.qualityAcceptance ?? 98,
    rfqResponseRate: metrics?.rfqResponseRate ?? 85,
  };

  const MetricRow = ({ label, value, color }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} color={color}>{value}%</Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={value} 
        sx={{ 
          height: 8, 
          borderRadius: 4, 
          bgcolor: alpha(theme.palette[color].main, 0.1),
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            bgcolor: theme.palette[color].main
          }
        }} 
      />
    </Box>
  );

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, display: 'flex' }}>
          <EmojiEventsIcon />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>Supplier Rating</Typography>
          <Typography variant="body2" color="text.secondary">Your current performance metrics</Typography>
        </Box>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <MetricRow label="On-Time Delivery" value={data.onTimeDelivery} color="primary" />
        <MetricRow label="Quality Acceptance" value={data.qualityAcceptance} color="success" />
        <MetricRow label="RFQ Response Rate" value={data.rfqResponseRate} color="warning" />
      </Box>
    </Paper>
  );
}

function FinancialPipeline({ financials }) {
  const theme = useTheme();
  const data = {
    totalBilled: financials?.totalBilled ?? 1250000,
    paid: financials?.paid ?? 850000,
    pending: financials?.pending ?? 400000,
  };

  const paidPct = (data.paid / data.totalBilled) * 100;
  const pendingPct = (data.pending / data.totalBilled) * 100;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main, display: 'flex' }}>
          <PaymentsIcon />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>Payment Pipeline</Typography>
          <Typography variant="body2" color="text.secondary">Overview of your billing and payments</Typography>
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Total Billed YTD</Typography>
          <Typography variant="h5" fontWeight={700}>{formatINR(data.totalBilled)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Pending Clearance</Typography>
          <Typography variant="h5" fontWeight={700} color="warning.main">{formatINR(data.pending)}</Typography>
        </Box>
      </Stack>

      <Box sx={{ position: 'relative', width: '100%', height: 24, borderRadius: 12, overflow: 'hidden', display: 'flex', bgcolor: theme.palette.action.hover }}>
        <Tooltip title={`Paid: ${formatINR(data.paid)}`}>
          <Box sx={{ width: `${paidPct}%`, bgcolor: theme.palette.success.main, transition: 'width 0.5s' }} />
        </Tooltip>
        <Tooltip title={`Pending: ${formatINR(data.pending)}`}>
          <Box sx={{ width: `${pendingPct}%`, bgcolor: theme.palette.warning.main, transition: 'width 0.5s' }} />
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" fontWeight={600} color="success.main">Paid ({paidPct.toFixed(0)}%)</Typography>
        <Typography variant="caption" fontWeight={600} color="warning.main">Pending ({pendingPct.toFixed(0)}%)</Typography>
      </Box>
    </Paper>
  );
}

function DashboardSkeleton() {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 4 }} />
        </Grid>
      ))}
      <Grid size={{ xs: 12, md: 8 }}>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 4 }} />
      </Grid>
    </Grid>
  );
}

// --- Main Component ---

export default function SupplierDashboard({ apiBase, getAccessToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [recentPos, setRecentPos] = useState([]);
  const [scopeHint, setScopeHint] = useState(null);
  
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [financials, setFinancials] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSupplierMetrics({ apiBase, getAccessToken });
        if (!cancelled) {
          setKpis(data.kpis ?? {});
          setRecentPos(data.recentPurchaseOrders ?? []);
          setPerformanceMetrics(data.performanceMetrics ?? null);
          setFinancials(data.financials ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setKpis({});
          setRecentPos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, getAccessToken]);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          My Dashboard
        </Typography>
        <DashboardSkeleton />
      </Box>
    );
  }

  const kpiItems = fallbackKpis.map((k) => ({
    ...k,
    value: kpis?.[k.key] ?? null,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        My Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Alerts */}
        {(scopeHint || error) && (
          <Grid size={{ xs: 12 }}>
            <Stack spacing={2}>
              {scopeHint && <Alert severity="info" sx={{ borderRadius: 3 }}>{scopeHint}</Alert>}
              {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
            </Stack>
          </Grid>
        )}

        {/* KPI Cards Row */}
        {kpiItems.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.key}>
            <KpiCard label={kpi.label} value={kpi.value} index={index} />
          </Grid>
        ))}

        {/* Middle Row: Order Volume & Supplier Performance */}
        <Grid container item spacing={3} size={{ xs: 12 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <ActivityChart purchaseOrders={recentPos} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <PerformanceMetrics metrics={performanceMetrics} />
          </Grid>
        </Grid>

        {/* Bottom Row: Financial Pipeline */}
        <Grid size={{ xs: 12 }}>
          <FinancialPipeline financials={financials} />
        </Grid>
      </Grid>
    </Box>
  );
}