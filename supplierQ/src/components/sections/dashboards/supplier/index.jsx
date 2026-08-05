"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme, alpha } from "@mui/material/styles";
import Grid from "@mui/material/Grid"; // MUI v6 standard
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

// Icons
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";

// ECharts - Standard Imports
import ReactEcharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { fetchSupplierMetrics } from "../../../../services/supplierMetrics.js";

// Initialize ECharts
echarts.use([TooltipComponent, GridComponent, LegendComponent, TitleComponent, LineChart, BarChart, PieChart, CanvasRenderer]);

// --- Helpers & Formats ---

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(amount || 0);
};

const formatDate = (dateStr, short = false) => {
  if (!dateStr || dateStr === 'Start' || dateStr === 'Prev' || dateStr === 'Now') return dateStr;
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr; // Failsafe against React crashes
  return new Intl.DateTimeFormat('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: short ? undefined : 'numeric' 
  }).format(dateObj);
};

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
      default: return "info"; 
  }
};

// --- Aurora Sub-Components (Seamless / No Borders internally) ---

const SectionHeader = ({ title, subTitle, actionComponent }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5} sx={{ letterSpacing: '-0.02em' }}>{title}</Typography>
      {subTitle && <Typography variant="body2" color="text.secondary">{subTitle}</Typography>}
    </Box>
    {actionComponent && <Box>{actionComponent}</Box>}
  </Box>
);

// 1. Aurora Greeting Component (Left Column)
function AuroraGreeting({ kpis, router }) {
  const theme = useTheme();
  
  const stats = [
    { icon: <AssessmentIcon />, subtitle: 'Open RFQs', value: kpis?.openRfqs || 0, path: '/m/supplierq/rfqs' },
    { icon: <ReceiptLongIcon />, subtitle: 'Pending Quotes', value: kpis?.pendingQuotations || 0, path: '/m/supplierq/supplier-quotation' },
    { icon: <LocalShippingIcon />, subtitle: 'Open Orders', value: kpis?.openPurchaseOrders || 0, path: '/m/supplierq/purchase-order' },
    { icon: <AccountBalanceWalletIcon />, subtitle: 'Invoices', value: kpis?.pendingInvoices || 0, path: '/m/supplierq/purchase-invoice' },
  ];

  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }).format(new Date());

  return (
    <Stack
      direction="column"
      divider={<Divider flexItem />}
      sx={{
        gap: 4,
        p: { xs: 3, md: 5 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center', 
      }}
    >
      <Stack direction="column" spacing={1}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: 'text.secondary', 
            fontWeight: 600, 
            textTransform: 'uppercase' 
          }}
        >
          {today}
        </Typography>
        
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            letterSpacing: '-0.02em' 
          }}
        >
          Portal unlocked. Proceed with awesomeness.
        </Typography>
      </Stack>

      <Box>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={500} mb={3}>
          Your live business metrics.
        </Typography>
        <Stack direction="column" sx={{ gap: 2 }}>
          {stats.map(({ icon, subtitle, value, path }) => (
            <Stack
              key={subtitle}
              onClick={() => router.push(path)}
              direction="row"
              sx={{
                gap: 2.5,
                alignItems: 'center',
                p: 2,
                mx: -2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': { bgcolor: 'action.hover', transform: 'translateX(6px)' }
              }}
            >
              <Avatar sx={{ width: 48, height: 48, color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1), flexShrink: 0 }}>
                {icon}
              </Avatar>
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>{subtitle}</Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

// 2. Aurora Mini-Stat Card
function AuroraStatCard({ title, subtitle, amount, percentage, chartType = 'line', data = [], color = "primary", router }) {
  const theme = useTheme();
  const paletteColor = theme.palette[color].main;
  const isPositive = percentage >= 0;

  // Add dummy start point so lines draw upward nicely if there's only 1 real point
  let chartData = [...data].reverse();
  if (chartData.length === 1) chartData = [{ transaction_date: 'Start', grand_total: 0 }, ...chartData];
  if (chartData.length === 0) chartData = [{ transaction_date: 'Start', grand_total: 0 }, { transaction_date: 'Now', grand_total: 0 }];

  const dates = chartData.map((d, i) => formatDate(d.transaction_date, true) || `Day ${i}`);
  const values = chartData.map(d => d.grand_total || 0);

  const getOptions = useMemo(() => ({
    tooltip: { trigger: 'axis', confine: true },
    xAxis: { type: 'category', data: dates, show: false, boundaryGap: chartType === 'bar' },
    yAxis: { show: false, type: 'value', boundaryGap: false, min: 'dataMin' },
    series: [{
      data: values,
      type: chartType,
      smooth: false,
      showSymbol: false,
      symbol: 'circle',
      barMaxWidth: 12, 
      itemStyle: { 
        color: paletteColor,
        borderRadius: chartType === 'bar' ? [4, 4, 0, 0] : 0 
      },
      lineStyle: { width: 3, color: paletteColor },
      areaStyle: chartType === 'line' ? {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: alpha(paletteColor, 0.3) },
          { offset: 1, color: alpha(paletteColor, 0) }
        ])
      } : undefined
    }],
    grid: { left: 5, right: 5, top: 10, bottom: 5 },
  }), [chartType, dates, values, paletteColor]);

  return (
    <Box 
      onClick={() => router.push("/m/supplierq/purchase-order")}
      sx={{ 
        p: { xs: 3, md: 4 }, 
        flex: 1, 
        height: 1, 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'action.hover' } 
      }}
    >
      <SectionHeader title={title} subTitle={subtitle} actionComponent={<IconButton size="small"><MoreVertIcon /></IconButton>} />
      <Stack direction="row" sx={{ flexGrow: 1, justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
        
        <Box sx={{ pb: 0.5, flex: 1, minWidth: 0 }}>
          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 1, letterSpacing: '-0.02em' }} noWrap>
            {formatINR(amount)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`${isPositive ? '+' : ''}${percentage}%`} 
              size="small" 
              color={isPositive ? 'success' : 'error'} 
              variant="soft" 
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }} 
            />
            <Typography variant="caption" color="text.secondary" noWrap>vs last period</Typography>
          </Box>
        </Box>

        <Box sx={{ width: 120, height: 70, flexShrink: 0, position: 'relative' }}>
          <ReactEcharts echarts={echarts} option={getOptions} style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }} />
        </Box>

      </Stack>
    </Box>
  );
}

// 3. Main Chart
function AuroraMainChart({ orders = [], router }) {
  const theme = useTheme();
  
  let chartData = [...orders].reverse();
  if (chartData.length === 1) chartData = [{ transaction_date: 'Start', grand_total: 0 }, ...chartData];

  const dates = chartData.map((d, i) => formatDate(d.transaction_date, true) || `Day ${i}`);
  const values = chartData.map(d => d.grand_total || 0);

  const getOptions = useMemo(() => ({
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: theme.palette.divider, type: 'solid' } }
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: true,
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: theme.palette.divider, type: 'dashed' } },
      axisTick: { show: false },
      axisLabel: { color: theme.palette.text.secondary, margin: 16 }
    },
    yAxis: {
      type: 'value',
      show: false,
    },
    series: [{
      name: 'Order Value',
      type: 'line',
      data: values.length ? values : [0],
      showSymbol: true,
      symbolSize: 8,
      symbol: 'circle',
      itemStyle: { color: theme.palette.primary.main },
      lineStyle: { width: 3, color: theme.palette.primary.main },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: alpha(theme.palette.primary.main, 0.4) },
          { offset: 1, color: alpha(theme.palette.primary.main, 0) }
        ])
      },
      emphasis: {
        itemStyle: {
          color: theme.palette.primary.main,
          borderColor: alpha(theme.palette.primary.main, 0.3),
          borderWidth: 10
        }
      }
    }],
    // FIX APPLIED HERE: Added containLabel: true and adjusted bottom padding
    grid: { left: 10, right: 10, top: 20, bottom: 10, containLabel: true },
  }), [dates, values, theme]);

  return (
    <Box 
      onClick={() => router.push("/m/supplierq/purchase-order")}
      sx={{ 
        p: { xs: 3, md: 4 }, 
        height: 1, 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'action.hover' } 
      }}
    >
      <Grid container spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Grid size={{ xs: 'grow', lg: 'auto' }}>
          <Typography variant="h6" fontWeight={700} mb={0.5} sx={{ letterSpacing: '-0.02em' }}>Financial Trajectory</Typography>
          <Typography variant="body2" color="text.secondary">Amount of revenue generated from recent purchase orders</Typography>
        </Grid>
        <Grid size={{ xs: 12, lg: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'primary.main' }} />
              <Typography variant="body2" color="text.secondary" fontWeight={500}>Order Value</Typography>
            </Box>
            <Chip label="Real-Time Data" color="primary" variant="soft" size="small" sx={{ fontWeight: 600 }} />
          </Box>
        </Grid>
      </Grid>
      <Box sx={{ flex: 1, minHeight: 280, position: 'relative', mt: 4 }}>
        {chartData.length > 0 ? (
          <ReactEcharts echarts={echarts} option={getOptions} style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }} />
        ) : (
          <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">No recent data available.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// 4. Market Share Equivalent (Fixed Alignment via ECharts Title)
function AuroraStatusDonut({ orders = [], router }) {
  const theme = useTheme();

  const statusCounts = useMemo(() => {
    const counts = {};
    orders.forEach(po => {
      const status = po.status || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const getOptions = useMemo(() => ({
    title: {
      text: '{val|' + orders.length + '}\n{lbl|Total POs}',
      left: 'center',
      top: 'center',
      textStyle: {
        rich: {
          val: { fontSize: 36, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 42, align: 'center' },
          lbl: { fontSize: 13, fontWeight: 500, color: theme.palette.text.secondary, align: 'center' }
        }
      }
    },
    tooltip: { trigger: 'item' },
    legend: { show: false },
    color: [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.info.main, theme.palette.grey[400]],
    series: [
      {
        name: 'Order Status',
        type: 'pie',
        padAngle: 3,
        radius: ['60%', '85%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: 'transparent' },
        label: { show: false },
        data: statusCounts.length > 0 ? statusCounts : [{ name: 'No Data', value: 1, itemStyle: { color: theme.palette.divider } }],
      }
    ],
    grid: { outerBoundsMode: 'same' },
  }), [statusCounts, theme, orders.length]);

  return (
    <Box 
      onClick={() => router.push("/m/supplierq/purchase-order")}
      sx={{ 
        p: { xs: 3, md: 4 }, 
        height: 1, 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'action.hover' } 
      }}
    >
      <SectionHeader title="Order Status" subTitle="Distribution of your recent POs" actionComponent={<IconButton size="small"><MoreVertIcon /></IconButton>} />
      <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 250 }}>
        <ReactEcharts echarts={echarts} option={getOptions} style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }} />
      </Box>
    </Box>
  );
}

// 5. Aurora Table (Recent Orders)
function AuroraRecentOrdersTable({ orders = [], router }) {
  return (
    <Box sx={{ p: { xs: 3, md: 4 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader 
        title="Recent Orders" 
        subTitle="Detailed information about your awarded POs" 
        actionComponent={<IconButton size="small"><MoreVertIcon /></IconButton>}
      />
      <TableContainer sx={{ margin: 0, padding: 0, boxShadow: 'none', flex: 1 }}>
        <Table sx={{ minWidth: 500 }}>
          <TableHead sx={{ '& th': { borderBottom: '1px solid', borderColor: 'divider', color: 'text.secondary', fontWeight: 600, py: 1.5, px: 1, bgcolor: 'action.hover' } }}>
            <TableRow>
              <TableCell>Order Number</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', border: 0 }}>No recent Purchase Orders available.</TableCell>
              </TableRow>
            ) : (
              orders.slice(0, 6).map((po) => (
                <TableRow 
                  key={po.name} 
                  hover 
                  onClick={() => router.push(`/m/supplierq/purchase-order?id=${po.name}`)}
                  sx={{ 
                    cursor: 'pointer',
                    '& td': { py: 2, px: 1, borderBottom: '1px solid', borderColor: 'divider' }, 
                    '&:last-child td': { border: 0 } 
                  }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: 'background.default', color: 'primary.main', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                        <LocalShippingIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={600} color="primary.main" noWrap>
                        {po.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
                      {formatDate(po.transaction_date)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {formatINR(po.grand_total)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={po.status ?? "UNKNOWN"} color={getThemeStatusColor(po.status)} variant="soft" size="small" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// 6. Aurora Table (Recent RFQs)
function AuroraRecentRfqsTable({ rfqs = [], router }) {
  return (
    <Box sx={{ p: { xs: 3, md: 4 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader 
        title="Recent RFQs" 
        subTitle="Latest Requests for Quotation" 
        actionComponent={<IconButton size="small"><MoreVertIcon /></IconButton>}
      />
      <TableContainer sx={{ margin: 0, padding: 0, boxShadow: 'none', flex: 1 }}>
        <Table sx={{ minWidth: 500 }}>
          <TableHead sx={{ '& th': { borderBottom: '1px solid', borderColor: 'divider', color: 'text.secondary', fontWeight: 600, py: 1.5, px: 1, bgcolor: 'action.hover' } }}>
            <TableRow>
              <TableCell>RFQ Number</TableCell>
              <TableCell>Issued Date</TableCell>
              <TableCell>Required By</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rfqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', border: 0 }}>No recent RFQs available.</TableCell>
              </TableRow>
            ) : (
              rfqs.slice(0, 6).map((rfq) => (
                <TableRow 
                  key={rfq.name} 
                  hover 
                  onClick={() => router.push(`/m/supplierq/rfq?id=${rfq.name}`)}
                  sx={{ 
                    cursor: 'pointer',
                    '& td': { py: 2, px: 1, borderBottom: '1px solid', borderColor: 'divider' }, 
                    '&:last-child td': { border: 0 } 
                  }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: 'background.default', color: 'primary.main', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                        <AssessmentIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={600} color="primary.main" noWrap>
                        {rfq.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
                      {formatDate(rfq.transaction_date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
                      {formatDate(rfq.schedule_date) || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={rfq.status ?? "UNKNOWN"} color={getThemeStatusColor(rfq.status)} variant="soft" size="small" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}


function DashboardSkeleton() {
  return (
    <Grid container spacing={0}>
      <Grid size={{ xs: 12, lg: 4, xl: 3 }}>
        <Skeleton variant="rectangular" height={800} sx={{ borderRadius: 0 }} />
      </Grid>
      <Grid size={{ xs: 12, lg: 8, xl: 9 }}>
        <Grid container spacing={0}>
          <Grid size={{ xs: 12, sm: 6 }}><Skeleton variant="rectangular" height={200} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><Skeleton variant="rectangular" height={200} /></Grid>
          <Grid size={{ xs: 12 }}><Skeleton variant="rectangular" height={350} /></Grid>
          <Grid size={{ xs: 12 }}><Skeleton variant="rectangular" height={400} /></Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

// --- Main Dashboard Entry ---

export default function SupplierDashboard({ apiBase, getAccessToken }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [kpis, setKpis] = useState(null);
  const [recentRfqs, setRecentRfqs] = useState([]);
  const [recentPos, setRecentPos] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSupplierMetrics({ apiBase, getAccessToken });
        if (!cancelled) {
          setKpis(data.kpis ?? {});
          setRecentRfqs(data.recentRfqs ?? []);
          setRecentPos(data.recentPurchaseOrders ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setKpis({});
          setRecentRfqs([]);
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
      <Box sx={{ width: '100%', height: '100%', m: 0, p: 0 }}>
        <DashboardSkeleton />
      </Box>
    );
  }

  // Calculate dynamic totals for the mini-charts
  const totalVolume = recentPos.reduce((sum, po) => sum + (po.grand_total || 0), 0);
  const avgOrderValue = recentPos.length > 0 ? totalVolume / recentPos.length : 0;

  // Real-time calculation for dynamic growth percentages based on history
  let volumeGrowth = 0; 
  let avgGrowth = 0;
  if (recentPos.length >= 2) {
    const latest = recentPos[0].grand_total || 0;
    const previous = recentPos[1].grand_total || 0;
    if (previous > 0) {
      volumeGrowth = Number((((latest - previous) / previous) * 100).toFixed(1));
    }
    if (avgOrderValue > 0) {
      avgGrowth = Number((((latest - avgOrderValue) / avgOrderValue) * 100).toFixed(1));
    }
  }

  return (
    <Box sx={{ width: '100%', height: '100%', m: 0, p: 0, bgcolor: 'background.paper' }}>
      
      {error && (
        <Alert severity="error" sx={{ borderRadius: 0, mb: 0 }}>
          {error}
        </Alert>
      )}

      {/* AURORA MASTER WRAPPER - Edge-to-edge flush layout */}
      <Paper elevation={0} sx={{ borderRadius: 0, border: 'none', overflow: 'hidden', bgcolor: 'background.paper', height: '100%' }}>
        
        {/* Zero Spacing Grid structurally broken out so Tables expand full width */}
        <Grid container spacing={0} alignItems="stretch">
          
          {/* TOP SECTION: Greeting + Charts */}
          <Grid size={{ xs: 12, lg: 4, xl: 3 }} sx={{ borderRight: { lg: '1px solid' }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <AuroraGreeting kpis={kpis} router={router} />
          </Grid>

          <Grid container size={{ xs: 12, lg: 8, xl: 9 }} spacing={0} alignItems="stretch" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
              {/* Top Row: Mini-Stats */}
              <Grid size={{ xs: 12, sm: 6 }} sx={{ borderRight: { sm: '1px solid' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                <AuroraStatCard 
                  title="Recent Volume" 
                  subtitle="Total value of latest orders" 
                  amount={totalVolume} 
                  percentage={volumeGrowth}
                  chartType="line" 
                  data={recentPos} 
                  color="primary"
                  router={router}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <AuroraStatCard 
                  title="Average Order" 
                  subtitle="Mean value per recent PO" 
                  amount={avgOrderValue} 
                  percentage={avgGrowth}
                  chartType="bar" 
                  data={recentPos} 
                  color="info"
                  router={router} 
                />
              </Grid>

              {/* Middle Row: Main Volume Chart */}
              <Grid size={{ xs: 12 }}>
                <AuroraMainChart orders={recentPos} router={router} />
              </Grid>
          </Grid>
          
          {/* BOTTOM SECTION: Tables & Status Donut */}
          <Grid size={{ xs: 12, lg: 8, xl: 9 }} sx={{ borderRight: { lg: '1px solid' }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <AuroraRecentOrdersTable orders={recentPos} router={router} />
          </Grid>
          
          <Grid size={{ xs: 12, lg: 4, xl: 3 }} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <AuroraStatusDonut orders={recentPos} router={router} />
          </Grid>

          {/* FULL WIDTH SECTION: Recent RFQs */}
          <Grid size={{ xs: 12 }}>
            <AuroraRecentRfqsTable rfqs={recentRfqs} router={router} />
          </Grid>

        </Grid>
      </Paper>
    </Box>
  );
}