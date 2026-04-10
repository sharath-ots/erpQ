"use client";

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
import { kpis, recentOrders, topSuppliers } from "../../../../data/pur/dashboard.js";
import useNumberFormat from "../../../../hooks/useNumberFormat.js";
import SectionHeader from "../../../common/SectionHeader.jsx";

const statusColor = (status) => {
  switch (status) {
    case "To Receive": return "warning";
    case "To Bill": return "info";
    case "Completed": return "success";
    case "Draft": return "default";
    default: return "default";
  }
};

function KpiCard({ kpi }) {
  const { numberFormat, currencyFormat } = useNumberFormat();
  const formatted = kpi.isCurrency
    ? currencyFormat(kpi.value, { maximumFractionDigits: 0 })
    : numberFormat(kpi.value);
  const isPositive = kpi.change.percentage >= 0;

  return (
    <Paper component={Stack} direction="column" sx={{ p: { xs: 3, md: 5 }, pt: { xs: 2, md: 4 }, height: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        {formatted}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
        {kpi.label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: "auto", alignItems: "center" }}>
        <Chip
          size="small"
          color={isPositive ? "success" : "error"}
          label={`${isPositive ? "+" : ""}${kpi.change.percentage}%`}
        />
        <Typography variant="caption" color="text.secondary">
          {`Since ${kpi.change.since}`}
        </Typography>
      </Stack>
    </Paper>
  );
}

const PUR = () => {
  const { currencyFormat } = useNumberFormat();

  return (
    <Grid container spacing={3}>
      {kpis.map((kpi) => (
        <Grid size={{ xs: 12, sm: 6, xl: 3 }} key={kpi.key}>
          <KpiCard kpi={kpi} />
        </Grid>
      ))}

      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          <SectionHeader title="Recent Purchase Orders" subTitle="Latest purchasing activity" sx={{ mb: 3 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.id}</Typography>
                    </TableCell>
                    <TableCell>{order.supplier}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {currencyFormat(order.amount, { maximumFractionDigits: 0 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={statusColor(order.status)} label={order.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{order.date}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, height: 1 }}>
          <SectionHeader title="Top Suppliers" subTitle="By purchase value" sx={{ mb: 3 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Supplier</TableCell>
                  <TableCell align="center">Orders</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topSuppliers.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.name}</Typography>
                    </TableCell>
                    <TableCell align="center">{s.orders}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {currencyFormat(s.value, { maximumFractionDigits: 0 })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default PUR;
