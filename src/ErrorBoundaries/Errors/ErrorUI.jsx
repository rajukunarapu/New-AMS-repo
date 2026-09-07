import React, { useState } from "react";
import { Box, Button, Typography, Chip, Collapse } from "@mui/material";
import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined";
import Refresh from "@mui/icons-material/Refresh";
import Home from "@mui/icons-material/Home";
import Code from "@mui/icons-material/Code";
import { NeovaticMark } from "../../Components/Common/NeovaticLogo";

const ErrorUI = ({ error }) => {
  const [showDetails, setShowDetails] = useState(false);

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

        {/* Animated Warning Shield Badge */}
        <Box sx={{ position: "relative", display: "inline-flex", justifyContent: "center", alignItems: "center", mb: 2.5 }}>
          <Box
            sx={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(217, 119, 6, 0.15)",
            }}
          >
            <ReportProblemOutlined sx={{ fontSize: 36, color: "#d97706" }} />
          </Box>
        </Box>

        {/* Error Status Pill */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label="Application Recovery"
            size="small"
            sx={{
              backgroundColor: "#fffbeb",
              color: "#b45309",
              fontWeight: 600,
              fontSize: "11.5px",
              border: "1px solid #fde68a",
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
          Something went wrong
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
          An unexpected issue interrupted this view. You can reload the page to restore your session or return to the main dashboard.
        </Typography>

        {/* Actions Row */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => window.location.reload()}
            startIcon={<Refresh sx={{ fontSize: 18 }} />}
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
            Reload Page
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
            Back to Home
          </Button>

          {error && (
            <>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowDetails(!showDetails)}
                startIcon={<Code sx={{ fontSize: 16 }} />}
                sx={{
                  color: "#64748b",
                  textTransform: "none",
                  fontSize: "11.5px",
                  mt: 0.5,
                }}
              >
                {showDetails ? "Hide technical details" : "Show technical details"}
              </Button>

              <Collapse in={showDetails}>
                <Box
                  sx={{
                    mt: 1.5,
                    p: 2,
                    borderRadius: "8px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    textAlign: "left",
                    maxHeight: "140px",
                    overflowY: "auto",
                  }}
                >
                  <Typography sx={{ fontFamily: "monospace", fontSize: "11px", color: "#e11d48", wordBreak: "break-all" }}>
                    {error?.toString() || "Unknown runtime exception"}
                  </Typography>
                </Box>
              </Collapse>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ErrorUI;