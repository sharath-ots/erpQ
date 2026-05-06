"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Alert, 
  Stack, 
  Paper,
  InputAdornment,
  IconButton
} from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export default function Login() {
  const router = useRouter();
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Calls the ERPNext connection we built in nextAuthOptions
    const result = await signIn("credentials", {
      redirect: false,
      usr,
      pwd,
    });

    if (result?.error) {
      setError("Invalid credentials. Please verify your ERPNext username and password.");
      setLoading(false);
    } else {
      router.push("/"); 
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper elevation={4} sx={{ width: "100%", maxWidth: 450, p: { xs: 4, md: 5 }, borderRadius: 3 }}>
        
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="700" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to continue to your ERPNext Dashboard
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Email or Username"
              variant="outlined"
              fullWidth
              value={usr}
              onChange={(e) => setUsr(e.target.value)}
              required
              autoComplete="username"
            />
            
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              size="large" 
              disabled={loading}
              fullWidth
              sx={{ py: 1.5, mt: 2, fontSize: '1.05rem', fontWeight: '600', textTransform: 'none', borderRadius: 2 }}
            >
              {loading ? "Authenticating with ERPNext..." : "Login"}
            </Button>
          </Stack>
        </Box>

      </Paper>
    </Box>
  );
}