import React from 'react'
import { Box, LinearProgress } from '@mui/material'

const PageLoading = () => {
  return (
    <Box sx={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px",
    }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 120"
          width="60"
          height="60"
          style={{ filter: "drop-shadow(0 2px 8px rgba(16, 185, 129, 0.25))" }}
        >
          <defs>
            <linearGradient id="loadRingTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="loadRingRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="60%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <linearGradient id="loadRingLeft" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
            <radialGradient id="loadNodeGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#091424" />
            </radialGradient>
          </defs>
          <g transform="translate(60, 60)">
            <circle cx="0" cy="-20" r="28" fill="none" stroke="url(#loadRingTop)" strokeWidth="8.5" strokeLinecap="round" opacity="0.95" />
            <circle cx="-17.32" cy="10" r="28" fill="none" stroke="url(#loadRingLeft)" strokeWidth="8.5" strokeLinecap="round" opacity="0.95" />
            <circle cx="17.32" cy="10" r="28" fill="none" stroke="url(#loadRingRight)" strokeWidth="8.5" strokeLinecap="round" opacity="0.95" />
            <line x1="0" y1="0" x2="0" y2="-20" stroke="#091424" strokeWidth="5" strokeLinecap="round" />
            <line x1="0" y1="0" x2="-17.32" y2="10" stroke="#091424" strokeWidth="5" strokeLinecap="round" />
            <line x1="0" y1="0" x2="17.32" y2="10" stroke="#091424" strokeWidth="5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="6" fill="url(#loadNodeGrad)" />
            <circle cx="0" cy="-20" r="5.5" fill="url(#loadNodeGrad)" />
            <circle cx="-17.32" cy="10" r="5.5" fill="url(#loadNodeGrad)" />
            <circle cx="17.32" cy="10" r="5.5" fill="url(#loadNodeGrad)" />
          </g>
        </svg>
        <LinearProgress sx={{ borderRadius: 10, width: "140px", height: "4px" }} color="success" />
    </Box>
  )
}

export default PageLoading