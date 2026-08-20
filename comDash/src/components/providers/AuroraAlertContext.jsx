"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert, AlertTitle, Stack } from "@mui/material";
import IconifyIcon from "../../ui/components/base/IconifyIcon";

const AuroraAlertContext = createContext(null);

// Helper to map severity to your specific Iconify icons
const getAlertIcon = (severity) => {
  switch (severity) {
    case "success": return "material-symbols:check-circle-rounded";
    case "error": return "material-symbols:error-rounded";
    case "warning": return "material-symbols:warning-rounded";
    case "info":
    default: return "material-symbols:info-rounded";
  }
};

export function AuroraAlertProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    message: "",
    severity: "info",
    title: "",
  });

  const showAlert = useCallback((message, severity = "info", title = "") => {
    setAlertConfig({
      message,
      severity,
      title: title || severity.charAt(0).toUpperCase() + severity.slice(1), // Auto-capitalize title if empty
    });
    setOpen(true);
  }, []);

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <AuroraAlertContext.Provider value={{ showAlert }}>
      {children}
      
      {/* MUI Snackbar will slide your sweet Aurora alert in from the top or bottom */}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }} // adjust position as needed
      >
        <Stack sx={{ gap: 2, minWidth: 300 }}>
          <Alert
            onClose={handleClose}
            severity={alertConfig.severity}
            icon={
              <IconifyIcon 
                icon={getAlertIcon(alertConfig.severity)} 
                sx={{ fontSize: 24 }} 
              />
            }
            sx={{ boxShadow: 3 }} // Added slight shadow for the pop-up effect
          >
            <AlertTitle sx={{ fontWeight: 600 }}>{alertConfig.title}</AlertTitle>
            <span dangerouslySetInnerHTML={{ __html: alertConfig.message }} />
          </Alert>
        </Stack>
      </Snackbar>
    </AuroraAlertContext.Provider>
  );
}

// Custom hook to use the alert anywhere
export function useAuroraAlert() {
  const context = useContext(AuroraAlertContext);
  if (!context) {
    throw new Error("useAuroraAlert must be used within an AuroraAlertProvider");
  }
  return context;
}