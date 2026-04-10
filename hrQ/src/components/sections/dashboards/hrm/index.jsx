"use client";

import Grid from "@mui/material/Grid";
import {
  allocation,
  attendance,
  headcounts,
  notifications,
  profile,
  resignations,
} from "../../../../data/hrm/dashboard.js";
import HRMKPI from "./HRMKPI.jsx";
import ProfileDetailCard from "./ProfileDetailCard.jsx";
import Allocation from "./allocation/Allocation.jsx";
import Attendance from "./attendance/Attendance.jsx";
import Headcount from "./headcount/Headcount.jsx";
import Leaves from "./leaves/Leaves.jsx";
import Notifications from "./notifications/Notifications.jsx";
import Profile from "./profile/Profile.jsx";
import Resignations from "./resignations/Resignations.jsx";

const HRM = () => {
  const { user, role, details, kpis, leaves } = profile;

  return (
    <Grid container>
      <Grid container size={12}>
        <Grid size={{ xs: 12, md: 6, xl: 7 }}>
          <Profile user={user} role={role} />
        </Grid>
        <Grid container size={{ xs: 12, md: 6, xl: 5 }} order={{ lg: 1, xl: 0 }}>
          {Object.entries(details).map(([key, value]) => (
            <Grid size={{ xs: 6, sm: 4, md: 6, xl: 4 }} key={key}>
              <ProfileDetailCard title={key} value={value} />
            </Grid>
          ))}
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 5 }} order={{ md: 1 }}>
          <Leaves leaves={leaves} />
        </Grid>
        <Grid container size={{ xs: 12, xl: 7, md: 6 }}>
          {kpis.map((kpi) => (
            <Grid size={6} key={kpi.value}>
              <HRMKPI kpi={kpi} />
            </Grid>
          ))}
        </Grid>
      </Grid>

      <Grid container size={{ xs: 12, xl: 7 }}>
        <Grid size={{ xs: 12, lg: 6, xl: 12 }}>
          <Attendance attendance={attendance} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6, xl: 12 }}>
          <Allocation allocation={allocation} />
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, xl: 5 }}>
        <Notifications notifications={notifications} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 5 }}>
        <Headcount headcounts={headcounts} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 7 }}>
        <Resignations resignations={resignations} />
      </Grid>
    </Grid>
  );
};

export default HRM;
