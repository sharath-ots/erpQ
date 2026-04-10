"use client";

import { useTheme } from "@mui/material";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import useNumberFormat from "../../../../../hooks/useNumberFormat.js";
import { safePalette } from "../../../../../lib/paletteUtils.js";
import ActivityChart from "./ActivityChart.jsx";

const getJSSColor = (status) => {
  switch (status) {
    case "satisfied": return { text: "success.main", bg: "#22c55e" };
    case "unsatisfied": return { text: "warning.main", bg: "#f97316" };
    case "upset": return { text: "error.main", bg: "#ef4444" };
    default: return { text: "primary.main", bg: "#3f8ef5" };
  }
};

const ResignationsTable = ({ tableData }) => {
  const { currencyFormat } = useNumberFormat();
  const { vars } = useTheme();
  const p = safePalette(vars?.palette);

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>JSS</TableCell>
            <TableCell align="right">Last Salary</TableCell>
            <TableCell align="right">Activity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableData.slice(0, 5).map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell>
                <Typography component={Link} href={item.profile.link} variant="body2">{item.profile.name}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{item.profile.role}</Typography>
              </TableCell>
              <TableCell>{item.reason}</TableCell>
              <TableCell>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", color: getJSSColor(item.jssResponse.status).text }}>
                  {item.jssResponse.status}
                </Typography>
                <Stack sx={{ mt: 0.5, gap: 0.25, height: 8, width: 100, bgcolor: p.chGrey[50] ?? "#f0f0f0", borderRadius: 2, overflow: "hidden", flexDirection: "row" }}>
                  {item.jssResponse.response.map((r) => (
                    <Box key={r.id} sx={{ width: `${r.value}%`, height: 1, bgcolor: getJSSColor(r.label).bg }} />
                  ))}
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                  {currencyFormat(item.lastSalary, { maximumFractionDigits: 0 })}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                  <ActivityChart data={item.activity.details} sx={{ height: "16px !important", width: 70 }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>{item.activity.average}</Typography>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResignationsTable;
