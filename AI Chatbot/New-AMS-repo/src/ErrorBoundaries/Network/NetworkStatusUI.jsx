import React, { useState } from "react";
import { Box, Typography, Button, CircularProgress, Chip } from "@mui/material";
import WifiOff from "@mui/icons-material/WifiOff";
import Refresh from "@mui/icons-material/Refresh";
import Home from "@mui/icons-material/Home";
import SignalCellularConnectedNoInternet0Bar from "@mui/icons-material/SignalCellularConnectedNoInternet0Bar";
import { NeovaticMark } from "../../Components/Common/NeovaticLogo";

const NetworkStatusUI = () => {
  const [retrying, setRetrying] = useState(false);
  const [statusText, setStatusText] = useState("Offline · Waiting for connection");

  const handleRetry = () => {
    setRetrying(true);
    setStatusText("Testing connectivity...");

    setTimeout(() => {
      if (navigator.onLine) {
        setStatusText("Connected! Reloading...");
        window.location.reload();
      } else {
        setRetrying(false);
        setStatusText("Still offline. Please check your network.");
      }
    }, 1200);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "radial-gradient(circle at 50% 30%, #f1f5f9 0%, #e2e8f0 100%)",
        px: 3,
        py: 4,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Box
        sx={{
          textAlign: "center",
          maxWidth: "480px",
          width: "100%",
          p: { xs: 3.5, sm: 4.5 },
          borderRadius: "16px",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          animation: "fadeInUp 0.3s ease-out",
          "@keyframes fadeInUp": {
            from: { opacity: 0, transform: "translateY(12px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {/* Header brand */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 3 }}>
          <NeovaticMark size={28} />
          <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
            Neo AI Service Desk
          </Typography>
        </Box>

        {/* Animated Wi-Fi Icon Badge with Pulse Ring */}
        <Box sx={{ position: "relative", display: "inline-flex", justifyContent: "center", alignItems: "center", mb: 2.5 }}>
          <Box
            sx={{
              position: "absolute",
              width: "88px",
              height: "88px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              animation: "pulseRing 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
              "@keyframes pulseRing": {
                "0%": { transform: "scale(0.85)", opacity: 0.8 },
                "50%": { transform: "scale(1.2)", opacity: 0.3 },
                "100%": { transform: "scale(0.85)", opacity: 0.8 },
              },
            }}
          />
          <Box
            sx={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <WifiOff sx={{ fontSize: 34, color: "#dc2626" }} />
          </Box>
        </Box>

        {/* Status Pill */}
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<SignalCellularConnectedNoInternet0Bar style={{ fontSize: 15, color: "#991b1b" }} />}
            label={statusText}
            size="small"
            sx={{
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              fontWeight: 600,
              fontSize: "11.5px",
              border: "1px solid #fecaca",
            }}
          />
        </Box>

        {/* Headline */}
        <Typography
          sx={{
            fontSize: { xs: "20px", sm: "22px" },
            fontWeight: 700,
            color: "#0f172a",
            mb: 1,
            lineHeight: 1.3,
          }}
        >
          No Internet Connection
        </Typography>

        {/* Subtext */}
        <Typography
          sx={{
            fontSize: "13px",
            color: "#64748b",
            lineHeight: 1.6,
            mb: 3.5,
            px: { xs: 1, sm: 2 },
          }}
        >
          We couldn't connect to the network. Please check your Wi-Fi or data connection and retry.
        </Typography>

        {/* Actions Row */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            disabled={retrying}
            onClick={handleRetry}
            startIcon={
              retrying ? <CircularProgress size={16} color="inherit" /> : <Refresh sx={{ fontSize: 18 }} />
            }
            sx={{
              backgroundColor: "#33557a",
              color: "#ffffff",
              py: 1.2,
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "13.5px",
              boxShadow: "0 2px 6px rgba(51, 85, 122, 0.25)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: "#264562",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(51, 85, 122, 0.35)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            }}
          >
            {retrying ? "Testing connection..." : "Retry Connection"}
          </Button>

          <Button
            variant="outlined"
            size="medium"
            onClick={() => (window.location.href = "/")}
            startIcon={<Home sx={{ fontSize: 18 }} />}
            sx={{
              color: "#475569",
              borderColor: "#cbd5e1",
              py: 1,
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "12.5px",
              "&:hover": {
                borderColor: "#94a3b8",
                backgroundColor: "#f8fafc",
                color: "#0f172a",
              },
            }}
          >
            Go to Home
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NetworkStatusUI;