"use client";

import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import useNumberFormat from "../../../../hooks/useNumberFormat.js";
import SectionHeader from "../../../common/SectionHeader.jsx";
import { fetchSupplierMetrics } from "../../../../services/supplierMetrics.js";
import { fallbackKpis } from "../../../../data/supplier/dashboard.js";

function KpiCard({ label, value }) {
  const { numberFormat } = useNumberFormat();
  const display = value == null ? "\u2014" : numberFormat(value);

  return (
    <Paper component={Stack} direction="column" sx={{ p: { xs: 3, md: 4 }, height: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>{display}</Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{label}</Typography>
    </Paper>
  );
}

const statusColor = (status) => {
  switch (status) {
    case "Submitted": return "info";
    case "Cancelled": return "default";
    case "To Receive": return "warning";
    case "Completed": return "success";
    default: return "default";
  }
};

export default function SupplierDashboard({ apiBase, getAccessToken }) {
  const { currencyFormat } = useNumberFormat();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [recentRfqs, setRecentRfqs] = useState([]);
  const [recentPos, setRecentPos] = useState([]);
  const [scopeHint, setScopeHint] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSupplierMetrics({ apiBase, getAccessToken });
        if (!cancelled) {
          setKpis(data.kpis ?? {});
          setRecentRfqs(data.recentRfqs ?? []);
          setRecentPos(data.recentPurchaseOrders ?? []);
          if (data.scope?.mode === "admin") {
            setScopeHint("Admin view — all suppliers");
          } else if (data.scope?.supplier) {
            setScopeHint(`Supplier view — ${data.scope.supplier}`);
          } else {
            setScopeHint("Supplier view — link your email to a Supplier in ERPNext");
          }
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
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  const kpiItems = fallbackKpis.map((k) => ({
    ...k,
    value: kpis?.[k.key] ?? null,
  }));

  return (
    <Grid container spacing={3}>
      {scopeHint ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">{scopeHint}</Alert>
        </Grid>
      ) : null}

      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity="warning">{error}</Alert>
        </Grid>
      ) : null}

      {kpiItems.map((kpi) => (
        <Grid size={{ xs: 12, sm: 6, xl: 3 }} key={kpi.key}>
          <KpiCard label={kpi.label} value={kpi.value} />
        </Grid>
      ))}

      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <SectionHeader title="Recent RFQs" subTitle="Open requests for quotation" sx={{ mb: 3 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>RFQ</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Company</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentRfqs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">No RFQs loaded.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRfqs.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography></TableCell>
                      <TableCell>{row.transaction_date ?? "\u2014"}</TableCell>
                      <TableCell><Chip size="small" color={statusColor(row.status)} label={row.status ?? "\u2014"} /></TableCell>
                      <TableCell>{row.company ?? "\u2014"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: { xs: 3, md: 4 }, height: 1 }}>
          <SectionHeader title="Recent Purchase Orders" subTitle="Orders issued to suppliers" sx={{ mb: 3 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>PO</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentPos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">No purchase orders loaded.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentPos.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography></TableCell>
                      <TableCell>{row.supplier ?? "\u2014"}</TableCell>
                      <TableCell align="right">
                        {row.grand_total != null
                          ? currencyFormat(row.grand_total, { maximumFractionDigits: 0 })
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );
}
