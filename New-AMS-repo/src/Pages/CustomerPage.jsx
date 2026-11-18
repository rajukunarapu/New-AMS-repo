import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Styles/CustomerPage.css";
import "../Styles/ConsultantPage.css";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import TopBar from "../Layouts/TopBar";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";
import { getCustomerTickets } from "../Services/GetCustomerTicketsAPI";
import { getDeliveryWorkflowAPI } from "../Services/GetDeliveryWorkflowAPI";
import { postCustomerApprovedHours } from "../Services/PostCustomerApprovedHours";
import { postCustomerBRDApproval } from "../Services/PostBRDApprovalAction";
import {
  CircularProgress,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import Notification from "../Features/ModuleLeadComponents/Notification";

const navItemsList = [
  { id: "portal", label: "Customer Portal" },
  { id: "notifications", label: "Notifications" },
  { id: "neoai", label: "NeoAI" },
];

const STEPS = [
  { key: "ticketAck", label: "Ticket Ack", docType: "Ticket ACK" },
  { key: "brd", label: "BRD", docType: "BRD" },
  { key: "bud", label: "BUD", docType: "BUD" },
];

const parseDateTimestamp = (dateStr) => {
  if (!dateStr) return 0;
  if (dateStr instanceof Date) return dateStr.getTime();
  const s = String(dateStr).trim();

  // 1. Check if DD-MM-YYYY or MM/DD/YYYY with optional time and AM/PM
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10);
    let p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : null;

    if (ampm) {
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      // In format like "10/1/2026 11:49:04 AM" with slashes and AM/PM: p1 is Month, p2 is Day
      if (s.includes("/")) {
        return new Date(year, p1 - 1, p2, hour, min, sec).getTime();
      }
    }

    // If p1 > 12, p1 is day and p2 is month (e.g. 30-09-2026)
    if (p1 > 12) {
      return new Date(year, p2 - 1, p1, hour, min, sec).getTime();
    }
    // If p2 > 12, p2 is day and p1 is month
    if (p2 > 12) {
      return new Date(year, p1 - 1, p2, hour, min, sec).getTime();
    }
    // If hyphenated like "30-09-2026", standard format is DD-MM-YYYY
    if (s.includes("-")) {
      return new Date(year, p2 - 1, p1, hour, min, sec).getTime();
    }
    // Slashed format with no AM/PM: try native or default MM/DD/YYYY
    const nativeTs = Date.parse(s);
    if (!isNaN(nativeTs)) return nativeTs;
    return new Date(year, p1 - 1, p2, hour, min, sec).getTime();
  }

  // 2. Handle YYYY-MM-DD or YYYY/MM/DD with optional time
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    let hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const ampm = ymdMatch[7] ? ymdMatch[7].toUpperCase() : null;
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return new Date(year, month, day, hour, min, sec).getTime();
  }

  const nativeParsed = Date.parse(s);
  if (!isNaN(nativeParsed)) return nativeParsed;

  return 0;
};

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return "";
  const ts = parseDateTimestamp(dateVal);
  if (!ts) return String(dateVal);
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const getLatestStepRecord = (stepsArray, docType) => {
  if (!Array.isArray(stepsArray) || stepsArray.length === 0 || !docType) return null;
  const targetDt = docType.trim().toLowerCase();
  const matching = stepsArray.filter((s) => {
    if (!s || !s.documentType) return false;
    const sDt = String(s.documentType).trim().toLowerCase();
    if (targetDt === "ticket ack" || targetDt === "tck ack") {
      return sDt === "ticket ack" || sDt === "tck ack" || sDt.includes("ticket ack");
    }
    return sDt === targetDt;
  });
  if (matching.length === 0) return null;
  if (matching.length === 1) return matching[0];
  matching.sort((a, b) => {
    const timeA = parseDateTimestamp(a.startDate);
    const timeB = parseDateTimestamp(b.startDate);
    return timeB - timeA;
  });
  return matching[0];
};

const isDocCompleted = (stepsArray, docType) => {
  if (!Array.isArray(stepsArray) || stepsArray.length === 0 || !docType) return false;
  const targetDt = docType.trim().toLowerCase();
  return stepsArray.some((s) => {
    if (!s || !s.documentType) return false;
    const sDt = String(s.documentType).trim().toLowerCase();
    if (targetDt === "ticket ack" || targetDt === "tck ack") {
      return sDt === "ticket ack" || sDt === "tck ack" || sDt.includes("ticket ack");
    }
    return sDt === targetDt;
  });
};

const hasAssignedConsultant = (t) => {
  if (!t) return false;
  const consultant = t.responsibleBy || t.name || t.assignedConsultant || t.assignedTo || "";
  return String(consultant).trim().length > 0;
};

// ── BRD Document Format & MIME Helpers for Customer Portal ──
const MIME_BY_EXT = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tiff: "image/tiff",
  tif: "image/tiff",
  avif: "image/avif",

  // PDF
  pdf: "application/pdf",

  // Word Documents
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  dot: "application/msword",
  dotx: "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  rtf: "application/rtf",

  // Excel Spreadsheets
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  csv: "text/csv",
  tsv: "text/tab-separated-values",

  // PowerPoint Presentations
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pps: "application/vnd.ms-powerpoint",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",

  // Text & Code
  txt: "text/plain",
  log: "text/plain",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  md: "text/markdown",

  // Archives
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
};

const getExtensionForMime = (mime) => {
  if (!mime) return "bin";
  const m = String(mime).toLowerCase();
  for (const [ext, val] of Object.entries(MIME_BY_EXT)) {
    if (val.toLowerCase() === m) return ext;
  }
  if (m.includes("pdf")) return "pdf";
  if (m.includes("wordprocessingml") || m.includes("docx")) return "docx";
  if (m.includes("msword")) return "doc";
  if (m.includes("spreadsheetml") || m.includes("xlsx")) return "xlsx";
  if (m.includes("ms-excel")) return "xls";
  if (m.includes("presentationml") || m.includes("pptx")) return "pptx";
  if (m.includes("ms-powerpoint")) return "ppt";
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("plain")) return "txt";
  if (m.includes("csv")) return "csv";
  if (m.includes("zip")) return "zip";
  return "bin";
};

const detectMimeFromBase64 = (b64) => {
  if (!b64 || typeof b64 !== "string") return "";
  const clean = b64.replace(/^data:[^;]+;base64,/, "").trim();
  if (clean.startsWith("/9j/")) return "image/jpeg";
  if (clean.startsWith("iVBORw0KGgo")) return "image/png";
  if (clean.startsWith("R0lGOD")) return "image/gif";
  if (clean.startsWith("UklGR")) return "image/webp";
  if (clean.startsWith("JVBERi")) return "application/pdf";
  if (clean.startsWith("PHN2Zy") || clean.startsWith("PD94bW")) return "image/svg+xml";
  if (clean.startsWith("Qk0")) return "image/bmp";
  if (clean.startsWith("UEsDB")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (clean.startsWith("0M8R4KGx")) return "application/msword";
  if (clean.startsWith("e1xydGY")) return "application/rtf";
  if (clean.startsWith("UmFyIR")) return "application/x-rar-compressed";
  return "";
};

const getBrdContentType = (url, fileName = "") => {
  if (url && typeof url === "string" && url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);/);
    if (match && match[1] && match[1] !== "application/octet-stream") return match[1];
  }
  const cleanName = (fileName || "").trim().toLowerCase();
  const dotIndex = cleanName.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = cleanName.substring(dotIndex + 1);
    if (MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  }
  if (url && typeof url === "string") {
    const detected = detectMimeFromBase64(url);
    if (detected) return detected;
  }
  return "application/octet-stream";
};

const getBrdFormatCategory = (contentType, fileName = "") => {
  const mime = (contentType || "").toLowerCase();
  const lowerName = (fileName || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif|avif)$/i.test(lowerName)) {
    return "image";
  }
  if (mime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    mime.includes("word") ||
    mime.includes("officedocument.wordprocessingml") ||
    /\.(doc|docx|dot|dotx|rtf)$/i.test(lowerName)
  ) {
    return "word";
  }
  if (
    mime.includes("excel") ||
    mime.includes("spreadsheetml") ||
    mime === "text/csv" ||
    /\.(xls|xlsx|xlsm|csv|tsv)$/i.test(lowerName)
  ) {
    return "excel";
  }
  if (
    mime.includes("powerpoint") ||
    mime.includes("presentationml") ||
    /\.(ppt|pptx|pps|ppsx)$/i.test(lowerName)
  ) {
    return "powerpoint";
  }
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    /\.(txt|log|json|xml|html|htm|css|js|md)$/i.test(lowerName)
  ) {
    return "text";
  }
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar") ||
    mime.includes("rar") ||
    /\.(zip|rar|7z|tar|gz)$/i.test(lowerName)
  ) {
    return "archive";
  }
  return "generic";
};

const getBrdFileName = (rec) => {
  let name = rec?.attachmentName;
  if (!name && rec?.attachment) {
    name = String(rec.attachment).split(/[\\/]/).pop();
  }
  if (!name) {
    const url = rec?.attachmentURL;
    const contentType = getBrdContentType(url, "");
    const ext = getExtensionForMime(contentType);
    name = `BRD_Document.${ext}`;
  }
  return name;
};

const getBrdImageUrl = (url, fileName = "") => {
  if (!url) return "";
  const s = String(url).trim();
  if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:")) {
    return s;
  }
  const mime = getBrdContentType(s, fileName);
  return `data:${mime};base64,${s}`;
};

const handleDownloadBrdDocument = (url, fileName = "BRD_Document") => {
  const dataUrl = getBrdImageUrl(url, fileName);
  if (!dataUrl) return;

  if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    return;
  }

  if (dataUrl.startsWith("data:")) {
    try {
      const parts = dataUrl.split(",");
      const byteString = atob(parts[1]);
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeString = mimeMatch ? mimeMatch[1] : getBrdContentType(dataUrl, fileName);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      return;
    } catch (err) {
      console.warn("Blob conversion fallback:", err);
    }
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getBrdCustomerAction = (rec, ticket, stepsData) => {
  const checkValue = (v) => {
    if (v === undefined || v === null) return null;
    const str = String(v).trim();
    if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
      return null;
    }
    return str;
  };

  const findInObj = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    if (obj.customerActionforBRD !== undefined && obj.customerActionforBRD !== null) {
      const v = checkValue(obj.customerActionforBRD);
      if (v) return v;
    }
    if (obj.customerActionForBRD !== undefined && obj.customerActionForBRD !== null) {
      const v = checkValue(obj.customerActionForBRD);
      if (v) return v;
    }
    if (obj.CustomerActionforBRD !== undefined && obj.CustomerActionforBRD !== null) {
      const v = checkValue(obj.CustomerActionforBRD);
      if (v) return v;
    }
    if (obj.CustomerActionForBRD !== undefined && obj.CustomerActionForBRD !== null) {
      const v = checkValue(obj.CustomerActionForBRD);
      if (v) return v;
    }
    if (obj.customerAction !== undefined && obj.customerAction !== null) {
      const v = checkValue(obj.customerAction);
      if (v) return v;
    }
    if (obj.CustomerAction !== undefined && obj.CustomerAction !== null) {
      const v = checkValue(obj.CustomerAction);
      if (v) return v;
    }
    if (obj.customerActionValue !== undefined && obj.customerActionValue !== null) {
      const v = checkValue(obj.customerActionValue);
      if (v) return v;
    }
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      if (lower === "customeractionforbrd" || lower === "customeraction") {
        const v = checkValue(obj[key]);
        if (v) return v;
      }
    }
    return null;
  };

  let val = findInObj(rec);
  if (!val && ticket) {
    val = findInObj(ticket);
  }
  if (!val && Array.isArray(stepsData)) {
    const brdStep = stepsData.find((s) => {
      const dt = String(s?.documentType || "").trim().toLowerCase();
      return dt === "brd";
    });
    if (brdStep) {
      val = findInObj(brdStep);
    }
    if (!val) {
      for (const s of stepsData) {
        val = findInObj(s);
        if (val) break;
      }
    }
  }

  return val || null;
};

const CustomerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("portal");
  const [searchText, setSearchText] = useState("");
  const [tickets, setTickets] = useState([]);
  const [totalTicketsCount, setTotalTicketsCount] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // Workflow cache per ticket: { [ticketId]: stepsArray }
  const [workflowCache, setWorkflowCache] = useState({});
  const [loadingWorkflow, setLoadingWorkflow] = useState({});
  const [expandedStep, setExpandedStep] = useState({}); // { [ticketId]: "ticketAck" | "brd" | "bud" | null }
  const [customerApprovedHours, setCustomerApprovedHours] = useState({}); // { [ticketId]: string }
  const [submittingHours, setSubmittingHours] = useState({}); // { [ticketId]: boolean }
  const [budAlert, setBudAlert] = useState({}); // { [ticketId]: { type, message } }
  const [brdAlert, setBrdAlert] = useState({}); // { [ticketId]: { type, message } }
  const [submittingBrdAction, setSubmittingBrdAction] = useState({}); // { [ticketId]: boolean }
  const [brdPreviewModal, setBrdPreviewModal] = useState({ open: false, url: "", fileName: "", ticketNo: "" });

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  useEffect(() => {
    (async function loadTickets() {
      setLoadingTickets(true);
      try {
        const res = await getCustomerTickets();
        const rawTickets = res?.tickets || res?.data?.tickets || (Array.isArray(res?.data) ? res.data : []);
        const totalCount = res?.totalTickets ?? res?.data?.totalTickets ?? (Array.isArray(rawTickets) ? rawTickets.length : 0);
        setTotalTicketsCount(totalCount);

        if (Array.isArray(rawTickets)) {
          const mappedTickets = rawTickets.map((t) => ({
            ...t,
            ticketNo: t.TicketId ?? t.ticketNo ?? "",
            TicketId: t.TicketId ?? t.ticketNo ?? "",
            description: t.DescriptionofTicket ?? t.description ?? "",
            DescriptionofTicket: t.DescriptionofTicket ?? t.description ?? "",
            ticketStatus: t.TicketStaus !== undefined && t.TicketStaus !== null ? t.TicketStaus : (t.ticketStatus ?? ""),
            TicketStaus: t.TicketStaus !== undefined && t.TicketStaus !== null ? t.TicketStaus : (t.ticketStatus ?? ""),
            TicketStatusName: t.TicketStatusName ?? "",
            clientName: t.CName ?? t.clientName ?? "",
            id: t.TxnId ?? t.TicketId ?? t.id,
          }));
          setTickets(mappedTickets);
        } else {
          setTickets([]);
        }
      } catch (err) {
        console.error("Error fetching tickets in CustomerPage:", err);
        setTickets([]);
        setTotalTicketsCount(0);
      } finally {
        setLoadingTickets(false);
      }
    })();
  }, []);

  // Filtered tickets based on search
  const filteredTickets = useMemo(() => {
    if (!searchText) return tickets;
    const lower = searchText.toLowerCase();
    return tickets.filter(
      (t) =>
        (t.TicketId && String(t.TicketId).toLowerCase().includes(lower)) ||
        (t.ticketNo && String(t.ticketNo).toLowerCase().includes(lower)) ||
        (t.DescriptionofTicket && String(t.DescriptionofTicket).toLowerCase().includes(lower)) ||
        (t.description && String(t.description).toLowerCase().includes(lower)) ||
        (t.TicketStaus && String(t.TicketStaus).toLowerCase().includes(lower)) ||
        (t.TicketStatusName && String(t.TicketStatusName).toLowerCase().includes(lower)) ||
        (t.ticketStatus && String(t.ticketStatus).toLowerCase().includes(lower)) ||
        (t.CName && String(t.CName).toLowerCase().includes(lower)) ||
        (t.clientName && String(t.clientName).toLowerCase().includes(lower)) ||
        (t.Reportedby && String(t.Reportedby).toLowerCase().includes(lower))
    );
  }, [tickets, searchText]);

  // Limit tickets by visibleCount (initial 10, expandable via "Show More")
  const visibleTickets = useMemo(() => {
    return filteredTickets.slice(0, visibleCount);
  }, [filteredTickets, visibleCount]);

  const fetchTicketWorkflow = useCallback(async (ticketId, forceRefresh = false) => {
    if (!ticketId) return;
    if (!forceRefresh && workflowCache[ticketId]) return;

    setLoadingWorkflow((prev) => ({ ...prev, [ticketId]: true }));
    try {
      const res = await getDeliveryWorkflowAPI(ticketId);
      if (res && res.data) {
        let stepsData = [];
        if (Array.isArray(res.data)) {
          stepsData = res.data;
        } else if (res.data.steps && Array.isArray(res.data.steps)) {
          stepsData = res.data.steps;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          stepsData = res.data.data;
        }
        // If the API returned customerActionforBRD at root level of res.data, forward to BRD step
        const rootAction =
          res.data.customerActionforBRD ??
          res.data.customerActionForBRD ??
          res.data.CustomerActionforBRD ??
          res.data.CustomerActionForBRD ??
          res.data.customerAction ??
          null;
        if (rootAction && Array.isArray(stepsData)) {
          stepsData = stepsData.map((s) => {
            if (String(s?.documentType || "").trim().toLowerCase() === "brd") {
              return {
                ...s,
                customerActionforBRD: s.customerActionforBRD ?? rootAction,
                customerActionForBRD: s.customerActionForBRD ?? rootAction,
              };
            }
            return s;
          });
        }
        setWorkflowCache((prev) => ({ ...prev, [ticketId]: stepsData }));
      } else {
        setWorkflowCache((prev) => ({ ...prev, [ticketId]: [] }));
      }
    } catch (err) {
      console.error("Error fetching delivery workflow for ticket:", ticketId, err);
      setWorkflowCache((prev) => ({ ...prev, [ticketId]: [] }));
    } finally {
      setLoadingWorkflow((prev) => ({ ...prev, [ticketId]: false }));
    }
  }, [workflowCache]);

  // Automatically fetch workflow for visible tickets to populate the 3-step SLA progress bar
  useEffect(() => {
    if (visibleTickets.length === 0) return;
    visibleTickets.forEach((ticket) => {
      const ticketId = ticket.TicketId || ticket.ticketNo || ticket.id;
      if (ticketId && !workflowCache[ticketId] && !loadingWorkflow[ticketId]) {
        fetchTicketWorkflow(ticketId);
      }
    });
  }, [visibleTickets, workflowCache, loadingWorkflow, fetchTicketWorkflow]);

  // Compute completed steps out of 3 (Ticket ACK, BRD, BUD)
  const getCompletedStepsCount = (ticketId) => {
    const stepsData = workflowCache[ticketId];
    if (!Array.isArray(stepsData) || stepsData.length === 0) return 0;
    let count = 0;
    if (isDocCompleted(stepsData, "Ticket ACK")) count++;
    if (isDocCompleted(stepsData, "BRD")) count++;
    if (isDocCompleted(stepsData, "BUD")) count++;
    return count;
  };

  const handleStepClick = async (ticket, stepKey) => {
    const ticketId = ticket.TicketId || ticket.ticketNo || ticket.id;
    if (!ticketId) return;

    if (expandedStep[ticketId] === stepKey) {
      // Toggle close if already open
      setExpandedStep((prev) => ({ ...prev, [ticketId]: null }));
      return;
    }

    setExpandedStep((prev) => ({ ...prev, [ticketId]: stepKey }));
    if (!workflowCache[ticketId]) {
      fetchTicketWorkflow(ticketId);
    }
  };

  const handleSaveBudHours = async (ticketId, maxTotalHours) => {
    const hoursVal = customerApprovedHours[ticketId];
    if (hoursVal === undefined || hoursVal === null || String(hoursVal).trim() === "") {
      setBudAlert((prev) => ({
        ...prev,
        [ticketId]: {
          type: "warning",
          message: "Customer Approved Hours is required. Please enter approved hours.",
        },
      }));
      return;
    }

    const numHours = Number(hoursVal);
    if (isNaN(numHours) || numHours <= 0) {
      setBudAlert((prev) => ({
        ...prev,
        [ticketId]: {
          type: "warning",
          message: "Please enter a valid positive number for Customer Approved Hours.",
        },
      }));
      return;
    }

    if (maxTotalHours !== undefined && maxTotalHours !== null && !isNaN(maxTotalHours) && maxTotalHours > 0) {
      if (numHours > maxTotalHours) {
        setBudAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "error",
            message: `Customer Approved Hours (${numHours}) cannot exceed Estimated Total Hours (${maxTotalHours} hrs).`,
          },
        }));
        return;
      }
    }

    setSubmittingHours((prev) => ({ ...prev, [ticketId]: true }));
    setBudAlert((prev) => ({ ...prev, [ticketId]: null }));

    try {
      const res = await postCustomerApprovedHours(ticketId, "BUD", numHours);
      if (res && res.success) {
        setBudAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "success",
            message: res.message || "Customer approved hours saved successfully.",
          },
        }));
        // Refresh workflow to update latest state
        await fetchTicketWorkflow(ticketId, true);
      } else {
        setBudAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "error",
            message: res?.message || "Failed to update Customer Approved Hours. Please try again.",
          },
        }));
      }
    } catch (err) {
      console.error("Error submitting Customer Approved Hours:", err);
      setBudAlert((prev) => ({
        ...prev,
        [ticketId]: {
          type: "error",
          message: "An error occurred while updating. Please try again.",
        },
      }));
    } finally {
      setSubmittingHours((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleBrdApprovalAction = async (ticket, actionValue) => {
    const ticketId = ticket.TicketId || ticket.ticketNo || ticket.id;
    const ticketNumber = ticket.ticketNo || ticket.TicketId || ticket.id;
    if (!ticketNumber) return;

    setSubmittingBrdAction((prev) => ({ ...prev, [ticketId]: true }));
    setBrdAlert((prev) => ({ ...prev, [ticketId]: null }));

    try {
      const res = await postCustomerBRDApproval(ticketNumber, "BRD", actionValue);
      if (res && res.success) {
        setBrdAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "success",
            message: res.message || "BRD action is submitted successfully.",
          },
        }));
        // Optimistically update workflow cache for instant UI feedback
        setWorkflowCache((prev) => {
          const currentSteps = prev[ticketId] || [];
          const updatedSteps = currentSteps.map((step) => {
            const dt = String(step?.documentType || "").trim().toLowerCase();
            if (dt === "brd") {
              return {
                ...step,
                customerActionforBRD: actionValue,
                customerActionForBRD: actionValue,
                customerAction: actionValue,
              };
            }
            return step;
          });
          return { ...prev, [ticketId]: updatedSteps };
        });
        // Refresh workflow to sync latest state from backend
        await fetchTicketWorkflow(ticketId, true);
      } else {
        setBrdAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "error",
            message: res?.message || `Failed to ${actionValue.toLowerCase()} BRD. Please try again.`,
          },
        }));
      }
    } catch (err) {
      console.error("Error submitting BRD customer action:", err);
      setBrdAlert((prev) => ({
        ...prev,
        [ticketId]: {
          type: "error",
          message: "An error occurred while updating. Please try again.",
        },
      }));
    } finally {
      setSubmittingBrdAction((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const currentNav = navItemsList.find((item) => item.id === activeNav) || {
    id: activeNav,
    label: "Customer Portal",
  };

  return (
    <div className="cp-container">
      {/* ── Sticky Topbar ── */}
      <TopBar
        setSearchText={setSearchText}
        searchText={searchText}
        onNotificationClick={() => setActiveNav("notifications")}
      />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="cp-body-layout">
        {/* Sidebar */}
        <aside className="cp-sidebar">
          {/* 1. PORTAL */}
          <div className="cp-nav-group">
            <div className="cp-nav-group-title">PORTAL</div>
            <button
              type="button"
              className={`cp-nav-item ${activeNav === "portal" ? "active" : ""}`}
              onClick={() => setActiveNav("portal")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span>Customer Portal</span>
            </button>

            <button
              type="button"
              className={`cp-nav-item ${activeNav === "notifications" ? "active" : ""}`}
              onClick={() => setActiveNav("notifications")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>Notifications</span>
            </button>

            <button
              type="button"
              className={`cp-nav-item ${activeNav === "neoai" ? "active" : ""}`}
              onClick={() => setActiveNav("neoai")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>NeoAI</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="cp-content">
          {activeNav === "portal" ? (
            <div className="cp-portal-main">
              {/* Breadcrumb */}
              <div className="cons-breadcrumb-row">
                <span className="cons-breadcrumb-muted">CUSTOMER</span>
                <span className="cons-breadcrumb-sep">›</span>
                <span className="cons-breadcrumb-curr">CUSTOMER PORTAL</span>
              </div>

              {/* Header */}
              <div className="cp-header-wrap">
                <h1 className="cp-page-title">Customer Portal</h1>
                <p className="cp-page-subtitle">
                  Your tickets only, enforced at the data layer. Review documents, accept timelines, run UAT and sign off.
                </p>
                {/* <div className="cp-page-meta">
                  Vantage Foods · signed in as {userName || "Customer"}
                </div> */}
              </div>

              {/* 4 Stat Cards */}
              <div className="cons-stat-grid-4" style={{ marginBottom: "20px" }}>
                {/* Card 1: OPEN IN MY TEAM */}
                <div className="cons-stat-card cons-card-emerald">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-emerald">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">OPEN IN MY TEAM</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : (totalTicketsCount || filteredTickets.length || 0)}
                    </span>
                    <span className="cons-pill-badge cons-pill-emerald">
                      Active Queue <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>SAP FICO · click to open the list</span>
                  </div>
                </div>

                {/* Card 2: AWAITING MY ALLOCATION */}
                <div className="cons-stat-card cons-card-teal">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-teal">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">AWAITING MY ALLOCATION</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : 0}
                    </span>
                    <span className="cons-pill-badge cons-pill-teal">
                      Unassigned <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>routed to my module by the agent</span>
                  </div>
                </div>

                {/* Card 3: SLA AT RISK */}
                <div className="cons-stat-card cons-card-amber">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-amber">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">SLA AT RISK</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : 0}
                    </span>
                    <span className="cons-pill-badge cons-pill-amber">
                      At Risk <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>above 75% of the resolution target</span>
                  </div>
                </div>

                {/* Card 4: WITH THE CUSTOMER */}
                <div className="cons-stat-card cons-card-purple">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-purple">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">WITH THE CUSTOMER</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : 0}
                    </span>
                    <span className="cons-pill-badge cons-pill-purple">
                      Paused <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>clock paused where the contract allows</span>
                  </div>
                </div>
              </div>

              {/* All Tickets Section Header Row with Show More at Beginning */}
              <div className="cp-tickets-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span className="cp-tickets-section-label" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    All Tickets
                  </span>
                  <span className="cp-tickets-count" style={{ fontSize: "11.5px", fontWeight: 600, color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "9999px" }}>
                    {loadingTickets
                      ? "Loading tickets..."
                      : `${Math.min(visibleCount, filteredTickets.length)} of ${totalTicketsCount || filteredTickets.length || 0} tickets`}
                  </span>
                </div>

                {!loadingTickets && visibleCount < filteredTickets.length && (
                  <button
                    type="button"
                    className="cp-show-more-btn"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    <span>Show more tickets</span>
                    <span className="cp-show-more-count">
                      ({filteredTickets.length - visibleCount} remaining)
                    </span>
                  </button>
                )}
              </div>

              {/* Ticket Cards List */}
              <div className="cp-tickets-list">
                {loadingTickets ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="cp-ticket-wrapper-card" style={{ pointerEvents: "none" }}>
                        <div className="cp-ticket-row-card">
                          <div className="cp-ticket-info-block" style={{ width: "100%" }}>
                            <div className="cp-ticket-title-line" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <Skeleton variant="rectangular" width={100} height={22} sx={{ borderRadius: "4px" }} />
                              <Skeleton variant="text" width="55%" height={22} />
                            </div>
                            <div className="cp-ticket-stage-line" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                              <Skeleton variant="text" width={80} height={18} />
                              <Skeleton variant="text" width={180} height={18} />
                            </div>
                            <div className="cp-ticket-sla-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                              <Skeleton variant="text" width={28} height={16} />
                              <Skeleton variant="rectangular" width={200} height={7} sx={{ borderRadius: "10px" }} />
                              <Skeleton variant="text" width={130} height={16} />
                            </div>
                          </div>
                          <div className="cp-ticket-actions-row">
                            <Skeleton variant="rectangular" width={85} height={32} sx={{ borderRadius: "6px" }} />
                            <Skeleton variant="rectangular" width={55} height={32} sx={{ borderRadius: "6px" }} />
                            <Skeleton variant="rectangular" width={55} height={32} sx={{ borderRadius: "6px" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : visibleTickets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b", background: "#ffffff", borderRadius: "8px" }}>
                    No tickets found.
                  </div>
                ) : (
                  <>
                    {visibleTickets.map((ticket) => {
                      const ticketId = ticket.TicketId || ticket.ticketNo || ticket.id;
                      const activeStepKey = expandedStep[ticketId];
                      const stepsData = workflowCache[ticketId] || [];
                      const isLoading = loadingWorkflow[ticketId];
                      const completedCount = getCompletedStepsCount(ticketId);

                      const brdRec = getLatestStepRecord(stepsData, "BRD");
                      const budRec = getLatestStepRecord(stepsData, "BUD");

                      const rawBrdAction =
                        brdRec?.customerActionforBRD !== undefined && brdRec?.customerActionforBRD !== null
                          ? brdRec.customerActionforBRD
                          : (brdRec?.customerActionForBRD !== undefined && brdRec?.customerActionForBRD !== null
                              ? brdRec.customerActionForBRD
                              : (brdRec?.customerAction !== undefined && brdRec?.customerAction !== null
                                  ? brdRec.customerAction
                                  : getBrdCustomerAction(brdRec, ticket, stepsData)));

                      const isBrdActionDone = Boolean(
                        rawBrdAction !== null &&
                          rawBrdAction !== undefined &&
                          String(rawBrdAction).trim() !== "" &&
                          String(rawBrdAction).trim().toLowerCase() !== "null" &&
                          String(rawBrdAction).trim().toLowerCase() !== "undefined"
                      );
                      const isBrdActionRequired = Boolean(brdRec && !isBrdActionDone);

                      const rawApprovedVal =
                        budRec?.customerApprovedHours !== undefined &&
                        budRec?.customerApprovedHours !== null &&
                        String(budRec?.customerApprovedHours).trim() !== ""
                          ? budRec.customerApprovedHours
                          : (budRec?.approvedHours !== undefined &&
                             budRec?.approvedHours !== null &&
                             String(budRec?.approvedHours).trim() !== ""
                              ? budRec.approvedHours
                              : null);

                      const isBudHoursSubmitted =
                        rawApprovedVal !== null &&
                        String(rawApprovedVal).trim() !== "" &&
                        !isNaN(Number(rawApprovedVal)) &&
                        Number(rawApprovedVal) > 0;

                      const isBudActionRequired = Boolean(budRec && !isBudHoursSubmitted);

                      return (
                        <div key={ticketId} className="cp-ticket-wrapper-card">
                          {/* Main Row Line */}
                          <div className="cp-ticket-row-card">
                            <div className="cp-ticket-info-block">
                              <div className="cp-ticket-title-line">
                                <span className="cp-ticket-id">{ticket.TicketId || ticket.ticketNo}</span>
                                <span className="cp-ticket-title">
                                  {ticket.DescriptionofTicket || ticket.description || "No description provided"}
                                </span>
                                {isBrdActionRequired && (
                                  <span className="cp-action-required-badge cp-action-badge-brd">
                                    <span className="cp-action-badge-dot" />
                                    BRD action is required
                                  </span>
                                )}
                                {isBudActionRequired && (
                                  <span className="cp-action-required-badge cp-action-badge-bud">
                                    <span className="cp-action-badge-dot" />
                                    BUD action is required
                                  </span>
                                )}
                              </div>
                              <div className="cp-ticket-stage-line">
                                <span className="cp-ticket-status">
                                  {ticket.TicketStatusName !== undefined && ticket.TicketStatusName !== null ? String(ticket.TicketStatusName) : (ticket.TicketStatusName || "")}
                                </span>
                                {" · "}
                                current stage: <span className="cp-ticket-stage">Delivery Workflow (3 Steps)</span>
                              </div>

                              {/* SLA 3-Step Progress Indicator */}
                              <div className="cp-ticket-sla-row">
                                <span className="cp-ticket-sla-title">SLA</span>
                                <div className="cp-ticket-sla-track">
                                  <div
                                    className="cp-ticket-sla-fill"
                                    style={{
                                      width: `${(completedCount / 3) * 100}%`,
                                      transition: "width 0.4s ease",
                                    }}
                                  />
                                </div>
                                <span className="cp-ticket-sla-text">
                                  {isLoading && !workflowCache[ticketId]
                                    ? "Loading steps..."
                                    : `Delivery ${completedCount} of 3 completed`}
                                </span>
                              </div>
                            </div>

                            {/* 3 Step Action Buttons: Ticket Ack, BRD, BUD */}
                            <div className="cp-ticket-actions-row">
                              {STEPS.map((step) => {
                                const isActive = activeStepKey === step.key;
                                return (
                                  <button
                                    key={step.key}
                                    type="button"
                                    className={`cp-step-btn ${isActive ? "active" : ""}`}
                                    onClick={() => handleStepClick(ticket, step.key)}
                                  >
                                    {step.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Step Details Card when a step is clicked */}
                          {activeStepKey && (
                            <div className="cp-step-detail-container">
                              {isLoading ? (
                                <div className="cp-step-detail-loading">
                                  <CircularProgress size={20} />
                                  <span>Loading {STEPS.find((s) => s.key === activeStepKey)?.label} details...</span>
                                </div>
                              ) : (
                                (() => {
                                  const stepDef = STEPS.find((s) => s.key === activeStepKey);
                                  const rec = getLatestStepRecord(stepsData, stepDef?.docType);
                                  const isBud = activeStepKey === "bud";
                                  const isTicketAck = activeStepKey === "ticketAck";
                                  const isBrd = activeStepKey === "brd";
                                  const isStepCompleted = Boolean(rec);
                                  const statusChipLabel = isStepCompleted ? "Completed" : "Pending";

                                  const startDateVal = formatDateDisplay(rec?.startDate);
                                  const endDateVal = formatDateDisplay(rec?.endDate);
                                  const consultantVal = rec?.responsibleBy || "";
                                  const stepStatusVal = rec?.stepStatus || (rec ? "Completed" : "Pending");
                                  const custAckVal = formatDateDisplay(rec?.customerAcknowledgement);

                                  const budStatusVal = rec?.stepStatus || (rec ? "Completed" : "Pending");

                                  const rawEstTech = rec?.estimatedTechnicalHours !== null && rec?.estimatedTechnicalHours !== undefined && !isNaN(Number(rec.estimatedTechnicalHours))
                                    ? Number(rec.estimatedTechnicalHours)
                                    : 0;
                                  const rawEstFunc = rec?.estimatedFunctionalHours !== null && rec?.estimatedFunctionalHours !== undefined && !isNaN(Number(rec.estimatedFunctionalHours))
                                    ? Number(rec.estimatedFunctionalHours)
                                    : 0;
                                  const rawEstTotal = rec?.estimatedTotalHours !== null && rec?.estimatedTotalHours !== undefined && !isNaN(Number(rec.estimatedTotalHours)) && Number(rec.estimatedTotalHours) > 0
                                    ? Number(rec.estimatedTotalHours)
                                    : (rawEstTech + rawEstFunc > 0 ? rawEstTech + rawEstFunc : null);

                                  const estTechHours = rec?.estimatedTechnicalHours || "";
                                  const estFuncHours = rec?.estimatedFunctionalHours || "";
                                  const estTotalHours = rawEstTotal !== null ? String(rawEstTotal) : (rec?.estimatedTotalHours || "");

                                  const rawApprovedVal =
                                    rec?.customerApprovedHours !== undefined && rec?.customerApprovedHours !== null && String(rec?.customerApprovedHours).trim() !== ""
                                      ? rec.customerApprovedHours
                                      : (rec?.approvedHours !== undefined && rec?.approvedHours !== null && String(rec?.approvedHours).trim() !== ""
                                          ? rec.approvedHours
                                          : null);

                                  // If backend sends "0.0", "0", 0, null, or empty, it should NOT be considered submitted
                                  const isHoursSubmitted =
                                    rawApprovedVal !== null &&
                                    String(rawApprovedVal).trim() !== "" &&
                                    !isNaN(Number(rawApprovedVal)) &&
                                    Number(rawApprovedVal) > 0;

                                  const approvedHoursVal = isHoursSubmitted
                                    ? String(rawApprovedVal)
                                    : (customerApprovedHours[ticketId] !== undefined
                                        ? customerApprovedHours[ticketId]
                                        : "");

                                  return (
                                    <div className="cp-step-detail-card">
                                      {/* Alert Feedback for BUD actions */}
                                      {isBud && budAlert[ticketId] && (
                                        <Alert
                                          severity={budAlert[ticketId].type}
                                          onClose={() => setBudAlert((prev) => ({ ...prev, [ticketId]: null }))}
                                          sx={{ mb: 1.5, fontSize: "12.5px" }}
                                        >
                                          {budAlert[ticketId].message}
                                        </Alert>
                                      )}

                                      {/* Alert Feedback for BRD actions */}
                                      {isBrd && brdAlert[ticketId] && (
                                        <Alert
                                          severity={brdAlert[ticketId].type}
                                          onClose={() => setBrdAlert((prev) => ({ ...prev, [ticketId]: null }))}
                                          sx={{ mb: 1.5, fontSize: "12.5px" }}
                                        >
                                          {brdAlert[ticketId].message}
                                        </Alert>
                                      )}

                                      <div className="cp-step-detail-header">
                                        <div className="cp-step-detail-title-wrap">
                                          <span className="cp-step-pill-indicator">{stepDef?.label}</span>
                                          <h4 className="cp-step-detail-title">
                                            {stepDef?.label === "Ticket Ack"
                                              ? "Ticket Acknowledgement (Ticket ACK)"
                                              : stepDef?.label === "BRD"
                                              ? "Business Requirement Document (BRD)"
                                              : "Business Understanding Document (BUD)"}
                                          </h4>
                                        </div>
                                        <span className={`cp-step-status-chip ${isStepCompleted ? "completed" : "pending"}`}>
                                          {statusChipLabel}
                                        </span>
                                      </div>

                                      {/* Fields Grid */}
                                      <div className="cp-step-fields-grid">
                                        {/* 1. Start Date */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">START DATE</label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={startDateVal}
                                          />
                                        </div>

                                        {/* 2. End Date */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">END DATE</label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={endDateVal}
                                          />
                                        </div>

                                        {/* 3. Assigned Consultant */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">ASSIGNED CONSULTANT</label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={consultantVal}
                                          />
                                        </div>

                                        {/* 4. Ticket Ack Status / Step Status */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">
                                            {stepDef?.label === "Ticket Ack"
                                              ? "TICKET ACK STATUS"
                                              : `${stepDef?.label} STATUS`}
                                          </label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={isBud ? budStatusVal : stepStatusVal}
                                          />
                                        </div>

                                        {/* 5. Customer Acknowledged On (only for Ticket Ack step) */}
                                        {isTicketAck && (
                                          <div className="cp-step-field-group">
                                            <label className="cp-step-field-lbl">CUSTOMER ACKNOWLEDGED ON</label>
                                            <input
                                              type="text"
                                              disabled
                                              className="cp-step-input-disabled"
                                              value={custAckVal}
                                            />
                                          </div>
                                        )}

                                        {/* Extra fields for BUD */}
                                        {isBud && (
                                          <>
                                            {/* 6. Estimated Technical Hours */}
                                            <div className="cp-step-field-group">
                                              <label className="cp-step-field-lbl">ESTIMATED TECHNICAL HOURS</label>
                                              <input
                                                type="text"
                                                disabled
                                                className="cp-step-input-disabled"
                                                value={estTechHours}
                                              />
                                            </div>

                                            {/* 7. Estimated Functional Hours */}
                                            <div className="cp-step-field-group">
                                              <label className="cp-step-field-lbl">ESTIMATED FUNCTIONAL HOURS</label>
                                              <input
                                                type="text"
                                                disabled
                                                className="cp-step-input-disabled"
                                                value={estFuncHours}
                                              />
                                            </div>

                                            {/* 8. Estimated Total Hours */}
                                            <div className="cp-step-field-group">
                                              <label className="cp-step-field-lbl">ESTIMATED TOTAL HOURS</label>
                                              <input
                                                type="text"
                                                disabled
                                                className="cp-step-input-disabled"
                                                value={estTotalHours}
                                              />
                                            </div>

                                            {/* 9. Customer Approved Hours */}
                                            <div className={`cp-step-field-group ${!isHoursSubmitted ? "cp-step-field-highlight" : ""}`}>
                                              <label className={`cp-step-field-lbl ${!isHoursSubmitted ? "cp-lbl-editable" : ""}`}>
                                                CUSTOMER APPROVED HOURS {!isHoursSubmitted && <span style={{ color: "#2563eb" }}>*</span>}
                                              </label>
                                              <input
                                                type={isHoursSubmitted ? "text" : "number"}
                                                disabled={isHoursSubmitted}
                                                className={isHoursSubmitted ? "cp-step-input-disabled" : "cp-step-input-editable"}
                                                placeholder={isHoursSubmitted ? "" : "Enter approved hours..."}
                                                value={approvedHoursVal}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setCustomerApprovedHours((prev) => ({
                                                    ...prev,
                                                    [ticketId]: val,
                                                  }));
                                                  const enteredNum = Number(val);
                                                  if (rawEstTotal !== null && rawEstTotal > 0 && !isNaN(enteredNum) && val !== "" && enteredNum > rawEstTotal) {
                                                    setBudAlert((prev) => ({
                                                      ...prev,
                                                      [ticketId]: {
                                                        type: "error",
                                                        message: `Customer Approved Hours (${enteredNum}) cannot exceed Estimated Total Hours (${rawEstTotal} hrs).`,
                                                      },
                                                    }));
                                                  } else if (budAlert[ticketId]?.type === "error" && budAlert[ticketId]?.message?.includes("cannot exceed")) {
                                                    setBudAlert((prev) => ({
                                                      ...prev,
                                                      [ticketId]: null,
                                                    }));
                                                  }
                                                }}
                                                min={0}
                                              />
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* Submitted Note / Alert after the fields */}
                                      {isBud && isHoursSubmitted && (
                                        <div className="cp-step-submitted-note" style={{ marginTop: "10px" }}>
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                          <span>Customer approved hours already submitted.</span>
                                        </div>
                                      )}

                                      {/* BUD Submit Button */}
                                      {isBud && !isHoursSubmitted && (
                                        <div className="cp-bud-action-row">
                                          <button
                                            type="button"
                                            className="cp-submit-hours-btn"
                                            disabled={submittingHours[ticketId]}
                                            onClick={() => handleSaveBudHours(ticketId, rawEstTotal)}
                                          >
                                            {submittingHours[ticketId] ? (
                                              <>
                                                <CircularProgress size={14} color="inherit" />
                                                <span>Submitting...</span>
                                              </>
                                            ) : (
                                              <>
                                                {/* <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="20 6 9 17 4 12" />
                                                </svg> */}
                                                <span>Submit</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}

                                      {/* show the step status of consultant action */}
                                      {!rec && (
                                        <p className="cp-step-empty-note">
                                          The consultant has not yet completed the {stepDef?.label} action.
                                        </p>
                                      )}

                                      {/* BRD Document Preview and Customer Approval / Rejection Actions */}
                                      {isBrd && rec && (
                                        <>
                                          {/* Document Card (when attachmentURL is available) or Not Found Card */}
                                          {rec.attachmentURL ? (
                                            <div className="cp-brd-doc-box">
                                              <div className="cp-brd-doc-card">
                                                <div className="cp-brd-doc-left">
                                                  {(() => {
                                                    const url = rec.attachmentURL;
                                                    const fileName = getBrdFileName(rec);
                                                    const contentType = getBrdContentType(url, fileName);
                                                    const category = getBrdFormatCategory(contentType, fileName);
                                                    const docUrl = getBrdImageUrl(url, fileName);

                                                    return (
                                                      <>
                                                        <div
                                                          className="cp-brd-doc-thumb"
                                                          onClick={() =>
                                                            setBrdPreviewModal({
                                                              open: true,
                                                              url,
                                                              fileName,
                                                              ticketNo: ticket.ticketNo || ticket.TicketId || ticket.id,
                                                            })
                                                          }
                                                          title="Click to view document"
                                                        >
                                                          {category === "image" ? (
                                                            <img
                                                              src={docUrl}
                                                              alt={fileName}
                                                            />
                                                          ) : category === "pdf" ? (
                                                            <div className="cp-brd-doc-badge-pdf">
                                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                              </svg>
                                                              <span>PDF</span>
                                                            </div>
                                                          ) : category === "word" ? (
                                                            <div className="cp-brd-doc-badge-doc">
                                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                              </svg>
                                                              <span>DOC</span>
                                                            </div>
                                                          ) : category === "excel" ? (
                                                            <div className="cp-brd-doc-badge-xls">
                                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                                <line x1="8" y1="13" x2="16" y2="13" />
                                                                <line x1="8" y1="17" x2="16" y2="17" />
                                                              </svg>
                                                              <span>XLS</span>
                                                            </div>
                                                          ) : category === "powerpoint" ? (
                                                            <div className="cp-brd-doc-badge-ppt">
                                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                              </svg>
                                                              <span>PPT</span>
                                                            </div>
                                                          ) : category === "text" ? (
                                                            <div className="cp-brd-doc-badge-txt">
                                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                              </svg>
                                                              <span>TXT</span>
                                                            </div>
                                                          ) : (
                                                            <InsertDriveFileOutlined style={{ fontSize: "24px", color: "#64748b" }} />
                                                          )}
                                                        </div>

                                                        <div className="cp-brd-doc-info">
                                                          <span
                                                            className="cp-brd-doc-name"
                                                            onClick={() =>
                                                              setBrdPreviewModal({
                                                                open: true,
                                                                url,
                                                                fileName,
                                                                ticketNo: ticket.ticketNo || ticket.TicketId || ticket.id,
                                                              })
                                                            }
                                                            title={fileName}
                                                          >
                                                            {fileName}
                                                          </span>
                                                          <span className="cp-brd-doc-meta">
                                                            {`Attachment · ${contentType}`}
                                                          </span>
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
                                                </div>

                                                <div className="cp-brd-doc-actions">
                                                  <button
                                                    type="button"
                                                    className="cp-brd-doc-btn-view"
                                                    onClick={() => {
                                                      const url = rec.attachmentURL;
                                                      const fileName = getBrdFileName(rec);
                                                      setBrdPreviewModal({
                                                        open: true,
                                                        url,
                                                        fileName,
                                                        ticketNo: ticket.ticketNo || ticket.TicketId || ticket.id,
                                                      });
                                                    }}
                                                    title="View document preview"
                                                  >
                                                    <VisibilityOutlined style={{ fontSize: "16px", color: "#475569" }} />
                                                    View
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="cp-brd-doc-btn-download"
                                                    onClick={() => {
                                                      const url = rec.attachmentURL;
                                                      const fileName = getBrdFileName(rec);
                                                      handleDownloadBrdDocument(url, fileName);
                                                    }}
                                                    title="Download document file"
                                                  >
                                                    <DownloadOutlined style={{ fontSize: "16px", color: "#ffffff" }} />
                                                    Download
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="cp-brd-not-found-card">
                                              <div className="cp-brd-not-found-icon">
                                                <InsertDriveFileOutlined fontSize="small" />
                                              </div>
                                              <div className="cp-brd-not-found-text">
                                                Screenshot file not found.
                                              </div>
                                            </div>
                                          )}

                                          {/* Customer Action Display if already triggered */}
                                          {isBrdActionDone && (
                                            <div className="cp-step-submitted-note cp-brd-submitted-note">
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                              </svg>
                                              <span>BRD action is submitted: <strong>{rec?.customerActionforBRD || rec?.customerActionForBRD || rec?.customerAction || rawBrdAction}</strong></span>
                                            </div>
                                          )}

                                          {/* BRD Action Buttons: Reject & Approve */}
                                          <div className="cp-brd-action-row">
                                            <button
                                              type="button"
                                              className="cp-brd-reject-btn"
                                              disabled={submittingBrdAction[ticketId] || isBrdActionDone}
                                              onClick={() => handleBrdApprovalAction(ticket, "Reject")}
                                            >
                                              {submittingBrdAction[ticketId] ? (
                                                <CircularProgress size={13} color="inherit" />
                                              ) : null}
                                              <span>Reject</span>
                                            </button>
                                            <button
                                              type="button"
                                              className="cp-brd-approve-btn"
                                              disabled={submittingBrdAction[ticketId] || isBrdActionDone}
                                              onClick={() => handleBrdApprovalAction(ticket, "Approve")}
                                            >
                                              {submittingBrdAction[ticketId] ? (
                                                <CircularProgress size={13} color="inherit" />
                                              ) : null}
                                              <span>Approve</span>
                                            </button>
                                          </div>
                                        </>
                                      )}


                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Bottom Footer Note */}
              <div className="cp-footer-note">
                Documents open from the ticket record. Accepting timelines, UAT results and sign-off are recorded with your identity and timestamp — the same evidence your service review reports on.
              </div>
            </div>
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage roleName="CUSTOMER" />
          ) : (
            <Notification currentNav={currentNav} roleName="CUSTOMER" />
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="Customer Portal" userEmail={emailParam} />

      {/* BRD Document Preview Modal */}
      <Dialog
        open={brdPreviewModal.open}
        onClose={() => setBrdPreviewModal((prev) => ({ ...prev, open: false }))}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: 8,
            overflow: "hidden",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <span>{brdPreviewModal.fileName || "BRD Document"}</span>
            {brdPreviewModal.ticketNo && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor: "#334155",
                  color: "#cbd5e1",
                  fontWeight: 500,
                }}
              >
                {brdPreviewModal.ticketNo}
              </span>
            )}
          </div>
          <IconButton
            onClick={() => setBrdPreviewModal((prev) => ({ ...prev, open: false }))}
            size="small"
            style={{ color: "#cbd5e1" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          style={{
            padding: "20px",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "350px",
            overflow: "auto",
          }}
        >
          {brdPreviewModal.url ? (
            (() => {
              const url = brdPreviewModal.url;
              const fileName = brdPreviewModal.fileName;
              const contentType = getBrdContentType(url, fileName);
              const category = getBrdFormatCategory(contentType, fileName);
              const docUrl = getBrdImageUrl(url, fileName);

              if (category === "image") {
                return (
                  <img
                    src={docUrl}
                    alt={fileName}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "70vh",
                      objectFit: "contain",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      backgroundColor: "#ffffff",
                    }}
                  />
                );
              }

              if (category === "pdf") {
                return (
                  <iframe
                    src={docUrl}
                    title={fileName}
                    style={{
                      width: "100%",
                      height: "72vh",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                );
              }

              if (category === "text") {
                return (
                  <iframe
                    src={docUrl}
                    title={fileName}
                    style={{
                      width: "100%",
                      height: "70vh",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                );
              }

              const formatMeta = {
                word: { name: "Microsoft Word Document", badge: "DOC / DOCX", bg: "#dbeafe", text: "#1d4ed8" },
                excel: { name: "Microsoft Excel Spreadsheet", badge: "XLS / XLSX / CSV", bg: "#dcfce7", text: "#15803d" },
                powerpoint: { name: "Microsoft PowerPoint Presentation", badge: "PPT / PPTX", bg: "#ffedd5", text: "#c2410c" },
                archive: { name: "Compressed Archive", badge: "ARCHIVE", bg: "#f3e8ff", text: "#7e22ce" },
                generic: { name: "Attached Document", badge: "DOCUMENT", bg: "#f1f5f9", text: "#475569" },
              };
              const fmt = formatMeta[category] || formatMeta.generic;

              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "36px 24px",
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                    maxWidth: "520px",
                    width: "100%",
                    textAlign: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "16px",
                      backgroundColor: fmt.bg,
                      color: fmt.text,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <InsertDriveFileOutlined style={{ fontSize: "40px" }} />
                  </div>

                  <div>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600, color: "#0f172a", wordBreak: "break-all" }}>
                      {fileName}
                    </h4>
                    <div style={{ display: "inline-block", fontSize: "11px", padding: "3px 10px", borderRadius: "12px", backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                      {fmt.name} · {contentType}
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b", lineHeight: 1.5, maxWidth: "400px" }}>
                    This document format cannot be rendered directly in browser preview. Click the button below to download and open it in your local application.
                  </p>

                  <Button
                    onClick={() => handleDownloadBrdDocument(url, fileName)}
                    variant="contained"
                    size="medium"
                    startIcon={<DownloadOutlined />}
                    style={{
                      backgroundColor: "#15803d",
                      color: "#ffffff",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      padding: "8px 24px",
                      borderRadius: "6px",
                    }}
                  >
                    Download {fileName}
                  </Button>
                </div>
              );
            })()
          ) : (
            <p style={{ color: "#64748b" }}>No document preview available.</p>
          )}
        </DialogContent>
        <DialogActions
          style={{
            padding: "10px 20px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {getBrdContentType(brdPreviewModal.url, brdPreviewModal.fileName)}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              onClick={() => handleDownloadBrdDocument(brdPreviewModal.url, brdPreviewModal.fileName)}
              variant="contained"
              size="small"
              startIcon={<DownloadOutlined />}
              style={{
                backgroundColor: "#15803d",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              Download
            </Button>
            <Button
              onClick={() => setBrdPreviewModal((prev) => ({ ...prev, open: false }))}
              variant="outlined"
              size="small"
              style={{
                borderColor: "#cbd5e1",
                color: "#475569",
                textTransform: "none",
                fontSize: "12px",
              }}
            >
              Close
            </Button>
          </div>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CustomerPage;
