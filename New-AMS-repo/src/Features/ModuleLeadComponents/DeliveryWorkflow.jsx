import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Alert,
  Skeleton,
  CircularProgress,
  LinearProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
} from "@mui/material";
import { postTicketAcknowledgement } from "../../Services/PostTicketAcknowledgmentAPI";
import { getDeliveryWorkflowAPI } from "../../Services/GetDeliveryWorkflowAPI";

const STEP_DOC_TYPES = {
  step1: "Ticket ACK",
  step2: "BRD",
  step3: "BUD",
  step4: "FS",
  step5: "TS",
  step6: "CONFIG",
  step7: "TEST INTERNAL",
  step8: "U. MANUAL",
  step9: "SUBMISSION",
  step10: "VA",
};

const WORKFLOW_10_STEPS = [
  { num: 1, key: "step1", name: "Ticket Acknowledgement", short: "Ticket ACK" },
  { num: 2, key: "step2", name: "BRD", short: "BRD" },
  { num: 3, key: "step3", name: "BUD", short: "BUD" },
  { num: 4, key: "step4", name: "Functional Specification", short: "FS" },
  { num: 5, key: "step5", name: "Technical Specification", short: "TS" },
  { num: 6, key: "step6", name: "Configuration", short: "CONFIG" },
  { num: 7, key: "step7", name: "Internal Testing", short: "TEST INTERNAL" },
  { num: 8, key: "step8", name: "User Manual", short: "U. MANUAL" },
  { num: 9, key: "step9", name: "Submission", short: "SUBMISSION" },
  { num: 10, key: "step10", name: "Validation & Acceptance", short: "VA" },
];

const parseDateTimestamp = (dateStr) => {
  if (!dateStr) return 0;
  if (dateStr instanceof Date) return dateStr.getTime();
  const s = String(dateStr).trim();

  // Try standard parse first
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return parsed;

  // DD-MM-YYYY or DD/MM/YYYY with optional time
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const hour = dmy[4] ? parseInt(dmy[4], 10) : 0;
    const min = dmy[5] ? parseInt(dmy[5], 10) : 0;
    const sec = dmy[6] ? parseInt(dmy[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec).getTime();
  }

  // YYYY-MM-DD or YYYY/MM/DD with optional time
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const hour = ymd[4] ? parseInt(ymd[4], 10) : 0;
    const min = ymd[5] ? parseInt(ymd[5], 10) : 0;
    const sec = ymd[6] ? parseInt(ymd[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec).getTime();
  }

  return 0;
};

const getLatestStepRecord = (stepsArray, docType) => {
  if (!Array.isArray(stepsArray) || stepsArray.length === 0 || !docType) return null;
  const matching = stepsArray.filter(
    (s) => s && s.documentType && String(s.documentType).trim().toLowerCase() === docType.trim().toLowerCase()
  );
  if (matching.length === 0) return null;
  if (matching.length === 1) return matching[0];
  matching.sort((a, b) => {
    const timeA = parseDateTimestamp(a.startDate);
    const timeB = parseDateTimestamp(b.startDate);
    return timeB - timeA;
  });
  return matching[0];
};

const muiInputSx = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    height: "36px",
    fontSize: "12px",
    fontFamily: "inherit",
    color: "inherit",
    backgroundColor: "var(--input-bg, #ffffff)",
    borderRadius: "4px",
    "& fieldset": {
      borderColor: "var(--input-border, #cbd5e1)",
      transition: "all 0.15s ease",
    },
    "&:hover fieldset": {
      borderColor: "var(--input-hover-border, #94a3b8)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#3b82f6",
      borderWidth: "1.5px",
    },
    "&.Mui-disabled": {
      backgroundColor: "var(--input-disabled-bg, #f8fafc)",
      color: "var(--text-muted, #64748b)",
      "& fieldset": {
        borderColor: "var(--input-disabled-border, #e2e8f0)",
      },
    },
  },
  "& .MuiOutlinedInput-input": {
    padding: "7px 10px",
    fontSize: "12px",
    color: "inherit",
  },
  "& input::-webkit-calendar-picker-indicator": {
    filter: "var(--calendar-filter, none)",
    cursor: "pointer",
    opacity: 1,
    display: "block",
  },
  "& .MuiInputBase-input::-webkit-calendar-picker-indicator": {
    filter: "var(--calendar-filter, none)",
    cursor: "pointer",
    opacity: 1,
    display: "block",
  },
};

const STEP_TICKET_STATUS_OPTIONS = {
  step3: ["Inprocess", "WCA : Awaiting User Input"],
  step4: ["In Proc: Functional Analysis"],
  step5: ["In Proc:  Technical Development"],
  step6: ["In Proc: Functional Design"],
  step7: ["In Proc: Functional Testing"],
  step8: ["In Proc: Functional Testing"],
  step9: [
    "WCA: UAT",
    "WCA:  Awaiting User Input",
    "WCA: Man Hours Approval",
    "WCA: Closure Confirmation",
    "WCA:  Approval for changes into PRD ",
    "WCA: On hold",
  ],
  step10: ["Closed"],
};

const renderStepTicketStatusOptions = (stepKey, currentValue) => {
  const baseOptions = STEP_TICKET_STATUS_OPTIONS[stepKey] || [];
  let options = [...baseOptions];

  if (currentValue && !options.some((opt) => opt.trim().toLowerCase() === String(currentValue).trim().toLowerCase())) {
    options = [currentValue, ...options];
  }

  return options.map((opt) => (
    <MenuItem key={opt} value={opt} title={opt}>
      {opt}
    </MenuItem>
  ));
};

const muiSelectEnabledSx = {
  width: "100%",
  minWidth: "170px",
  height: "36px",
  fontSize: "12px",
  fontFamily: "inherit",
  color: "#0f172a",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#cbd5e1 !important",
    transition: "all 0.15s ease",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "#94a3b8 !important",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#33557a !important",
    borderWidth: "1.5px",
  },
  "& .MuiSelect-select": {
    padding: "7px 34px 7px 10px !important",
    paddingRight: "34px !important",
    fontSize: "12px",
    display: "block",
    alignItems: "center",
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
  },
  "& .MuiSelect-icon": {
    color: "#64748b",
    right: "8px",
  },
};

const muiSelectSx = {
  width: "100%",
  height: "36px",
  fontSize: "12px",
  fontFamily: "inherit",
  color: "inherit",
  backgroundColor: "var(--input-bg, #ffffff)",
  borderRadius: "4px",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--input-border, #cbd5e1)",
    transition: "all 0.15s ease",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--input-hover-border, #94a3b8)",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#3b82f6",
    borderWidth: "1.5px",
  },
  "& .MuiSelect-select": {
    padding: "7px 10px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    color: "inherit",
  },
  "& .MuiSelect-icon": {
    color: "var(--text-muted, #64748b)",
  },
};

const menuProps = {
  slotProps: {
    paper: {
      sx: {
        borderRadius: "6px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        maxHeight: 260,
        "& .MuiMenuItem-root": {
          fontSize: "12px",
          minHeight: "32px",
          padding: "6px 12px",
          transition: "background-color 0.15s ease",
          "&.Mui-selected": {
            backgroundColor: "#f1f5f9",
            fontWeight: 600,
          },
          "&.Mui-selected:hover": {
            backgroundColor: "#e2e8f0",
          },
          "&:hover": {
            backgroundColor: "#f8fafc",
          },
        },
      },
    },
  },
};

const DeliveryWorkflow = ({
  filteredTickets,
  workflowTickets,
  workflowVisibleCount,
  setWorkflowVisibleCount,
  workflowTicketIdx,
  setWorkflowTicketIdx,
  selectedWorkflowTicket,
  employees,
  statuses,
  getFormattedCreatedDate,
  getComputedEndDate,
  loadingTickets,
  formatPriorityCode,
  getPriorityClass,
  roleName,
}) => {
  const location = useLocation();
  const isModuleLead = (roleName && roleName.includes("MODULE LEAD")) || (location?.pathname || "").toLowerCase().includes("modulelead");
  const currentRoleLabel = roleName || (isModuleLead ? "MODULE LEAD" : "CONSULTANT");
  // Helper to format date for input[type="date"] (YYYY-MM-DD)
  const formatDateForInput = (val) => {
    if (!val) return "";
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.split("T")[0];
    }
    const ts = parseDateTimestamp(val);
    if (!ts) return "";
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Format date helper (MM/DD/YYYY) from ticket createddate
  const formatCreatedDate = (dateStr) => {
    if (getFormattedCreatedDate) return getFormattedCreatedDate(dateStr);
    if (!dateStr) return "00/00/0000";
    const ts = parseDateTimestamp(dateStr);
    if (!ts) return "00/00/0000";
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Format date helper (MM/DD/YYYY) for display, returning empty string if no valid date
  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return "";
    if (typeof dateVal === "string") {
      const trimmed = dateVal.trim();
      if (!trimmed) return "";
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    }
    const ts = parseDateTimestamp(dateVal);
    if (!ts) return typeof dateVal === "string" ? dateVal : "";
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Short date helper (DD Mon) like "16 Sep"
  const formatDateShort = (dateVal) => {
    if (!dateVal) return "--";
    let d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      if (typeof dateVal === "string" && dateVal.includes("/")) {
        const parts = dateVal.split("/");
        if (parts.length === 3) {
          d = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    }
    if (isNaN(d.getTime())) return String(dateVal);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    return `${day} ${month}`;
  };

  // Compute end date from start date by adding working days / working hours (skipping weekends, 8 hrs = 1 day)
  const computeEndDate = (startDateStr, workingDaysCount, workingHoursCount) => {
    if (getComputedEndDate) return getComputedEndDate(startDateStr, workingDaysCount, workingHoursCount);
    let d = new Date(startDateStr);
    if (isNaN(d.getTime())) d = new Date();
    
    let days = 1;
    const hasHours = workingHoursCount !== null && workingHoursCount !== undefined && String(workingHoursCount).trim() !== "" && Number(workingHoursCount) > 0;
    const hasDays = workingDaysCount !== null && workingDaysCount !== undefined && String(workingDaysCount).trim() !== "" && Number(workingDaysCount) > 0;

    if (hasHours) {
      days = Math.ceil(Number(workingHoursCount) / 8);
    } else if (hasDays) {
      days = parseInt(workingDaysCount, 10) || 1;
    }

    if (days < 1) days = 1;

    let current = new Date(d);
    let remainingDays = days;
    while (remainingDays > 1) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        remainingDays--;
      }
    }
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    const yyyy = current.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Helper to render footer statement: "16 Sep → 18 Sep · 3 working days · responsible K. Menon"
  const renderStepFooterSubtext = (stepDays, stepHours, stepResponsible) => {
    const startDateRaw = selectedWorkflowTicket?.createddate || new Date();
    const startDateFormatted = formatDateShort(startDateRaw);
    const endDateRaw = computeEndDate(startDateRaw, stepDays, stepHours);
    const endDateFormatted = formatDateShort(endDateRaw);

    const hasHours = stepHours !== null && stepHours !== undefined && String(stepHours).trim() !== "" && Number(stepHours) > 0;
    const hasDays = stepDays !== null && stepDays !== undefined && String(stepDays).trim() !== "" && Number(stepDays) > 0;
    
    let effectiveDays = 1;
    if (hasHours) {
      effectiveDays = Math.ceil(Number(stepHours) / 8);
    } else if (hasDays) {
      effectiveDays = Number(stepDays);
    }

    const responsibleName = stepResponsible || defaultConsultant || "NA";

    return `${startDateFormatted} → ${endDateFormatted} · ${effectiveDays} working days · responsible ${responsibleName}`;
  };

  // Helper to extract stepStatus from ticket or fallback to Pending
  const getTicketStepStatus = (ticket, stepKey) => {
    const val = ticket?.[`${stepKey}StepStatus`] || ticket?.[`${stepKey}Status`] || ticket?.stepStatus;
    if (val && ["Pending", "Completed", "Rejected"].some(s => s.toLowerCase() === String(val).toLowerCase())) {
      const match = ["Pending", "Completed", "Rejected"].find(s => s.toLowerCase() === String(val).toLowerCase());
      return match || "Pending";
    }
    return "Pending";
  };

  const defaultConsultant =
    selectedWorkflowTicket?.name ||
    selectedWorkflowTicket?.responsibleBy ||
    selectedWorkflowTicket?.ResponsibleBy ||
    (employees && employees.length > 0 ? (employees[0].name || employees[0].employeeName) : "");

  // Delivery Workflow local states
  const [workflowDocTab, setWorkflowDocTab] = useState("FS Document");
  const [ackCustomerDate, setAckCustomerDate] = useState("");
  const [ackEndDate, setAckEndDate] = useState("");
  const [ackWorkingDays, setAckWorkingDays] = useState("");
  const [ackWorkingHours, setAckWorkingHours] = useState("");
  const [ackResponsibleBy, setAckResponsibleBy] = useState(defaultConsultant);
  const [ackStatus, setAckStatus] = useState("");
  const [ackStepStatus, setAckStepStatus] = useState("Pending");
  const [ackAttachment, setAckAttachment] = useState(null);
  const [ackAttachmentName, setAckAttachmentName] = useState("");
  const [ackCompleted, setAckCompleted] = useState(false);
  const [brdExpanded, setBrdExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState({
    step1: true,
    step2: true,
    step3: true,
    step4: true,
    step5: true,
    step6: true,
    step7: true,
    step8: true,
    step9: true,
    step10: true,
  });

  const toggleStepExpand = (stepKey) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };
  const ackFileInputRef = useRef(null);
  const prevTicketIdRef = useRef(null);
  const pillsContainerRef = useRef(null);

  const handleScrollPills = (direction) => {
    if (pillsContainerRef.current) {
      pillsContainerRef.current.scrollBy({
        left: direction === "left" ? -240 : 240,
        behavior: "smooth",
      });
    }
  };

  // Tracking for records from GetDeliveryWorkflow API
  const [hasStepRecord, setHasStepRecord] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    step7: false,
    step8: false,
    step9: false,
    step10: false,
  });

  // Submitting and completed tracking for all 10 steps
  const [submittingSteps, setSubmittingSteps] = useState({});
  const [completedSteps, setCompletedSteps] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    step7: false,
    step8: false,
    step9: false,
    step10: false,
  });

  // Dedicated MUI alert states per step
  const [stepAlerts, setStepAlerts] = useState({});
  const [missingFields, setMissingFields] = useState([]);
  const [activeActions, setActiveActions] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  // Toast notification for upcoming/unimplemented features
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleFeatureNotImplemented = () => {
    setToastMessage("This feature is not implemented yet.");
    setToastOpen(true);
  };

  const showStepAlert = (stepKey, type, message) => {
    setStepAlerts((prev) => ({
      ...prev,
      [stepKey]: { open: true, type, message },
    }));
    setTimeout(() => {
      setStepAlerts((prev) => ({
        ...prev,
        [stepKey]: { ...prev[stepKey], open: false },
      }));
    }, 6000);
  };

  const handleTriggerAction = (actionKey, successMsg) => {
    setActiveActions((prev) => ({ ...prev, [actionKey]: true }));
    setTimeout(() => {
      setActiveActions((prev) => ({ ...prev, [actionKey]: false, [actionKey + "_done"]: true }));
      showStepAlert(actionKey, "success", successMsg || "Action completed successfully.");
    }, 600);
  };

  // Steps 02–10 state with initial dates, valid status names, and attachments
  const [stepsState, setStepsState] = useState({
    step2: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", attachment: null, attachmentName: "" },
    step3: {
      days: "",
      hours: "",
      responsible: defaultConsultant,
      status: "",
      ticketStatus: "",
      stepStatus: "Pending",
      endDate: "",
      attachment: null,
      attachmentName: "",
      estimatedTechnicalHours: "",
      estimatedFunctionalHours: "",
      estimatedTotalHours: "",
      customerApprovedHours: "",
      documentStatus: "No",
    },
    step4: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", attachment: null, attachmentName: "" },
    step5: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", attachment: null, attachmentName: "" },
    step6: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", attachment: null, attachmentName: "" },
    step7: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", attachment: null, attachmentName: "" },
    step8: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", attachment: null, attachmentName: "" },
    step9: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", attachment: null, attachmentName: "" },
    step10: { days: "", hours: "", responsible: defaultConsultant, status: "", ticketStatus: "", stepStatus: "Pending", endDate: "", remarks: "", attachment: null, attachmentName: "" },
  });

  const fileInputRefs = useRef({});

  const handleStepChange = (stepKey, field, value) => {
    setStepsState((prev) => {
      const currentStep = prev[stepKey] || {};
      const updated = {
        ...currentStep,
        [field]: value,
      };

      if (field === "ticketStatus") {
        updated.status = value;
      }

      if (stepKey === "step3" && (field === "estimatedTechnicalHours" || field === "estimatedFunctionalHours")) {
        const tech = field === "estimatedTechnicalHours" ? value : currentStep.estimatedTechnicalHours;
        const func = field === "estimatedFunctionalHours" ? value : currentStep.estimatedFunctionalHours;
        const total = (Number(tech) || 0) + (Number(func) || 0);
        updated.estimatedTotalHours = total > 0 ? String(total) : "";
      }

      return {
        ...prev,
        [stepKey]: updated,
      };
    });
  };

  const handleStepFileChange = (stepKey, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFiles((prev) => ({ ...prev, [stepKey]: true }));
      setTimeout(() => {
        setStepsState((prev) => ({
          ...prev,
          [stepKey]: {
            ...prev[stepKey],
            attachment: file,
            attachmentName: file.name,
            ...(stepKey === "step3" ? { documentStatus: "Yes" } : {}),
          },
        }));
        setUploadingFiles((prev) => ({ ...prev, [stepKey]: false }));
      }, 400);
    }
  };

  const handleRemoveStepFile = (stepKey) => {
    setStepsState((prev) => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        attachment: null,
        attachmentName: "",
        ...(stepKey === "step3" ? { documentStatus: "No" } : {}),
      },
    }));
    if (fileInputRefs.current[stepKey]) {
      fileInputRefs.current[stepKey].value = "";
    }
  };

  const handleAckFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFiles((prev) => ({ ...prev, step1: true }));
      setTimeout(() => {
        setAckAttachment(file);
        setAckAttachmentName(file.name);
        setUploadingFiles((prev) => ({ ...prev, step1: false }));
      }, 400);
    }
  };

  const handleRemoveAckFile = () => {
    setAckAttachment(null);
    setAckAttachmentName("");
    if (ackFileInputRef.current) {
      ackFileInputRef.current.value = "";
    }
  };

  // Dynamic array of 10 deduplicated records against the current ticket
  const [workflowStepRecords, setWorkflowStepRecords] = useState([]);

  // Fetch workflow steps data from API and map deduplicated latest records
  const fetchWorkflowData = async (ticketId, fallbackTicket) => {
    if (!ticketId) return;
    try {
      const resp = await getDeliveryWorkflowAPI(ticketId);
      const stepsData = resp?.data?.steps || (Array.isArray(resp?.data) ? resp.data : []);

      const defaultName =
        fallbackTicket?.name ||
        fallbackTicket?.responsibleBy ||
        fallbackTicket?.ResponsibleBy ||
        (employees && employees.length > 0 ? (employees[0].name || employees[0].employeeName) : "");

      const newHasRecords = {
        step1: false,
        step2: false,
        step3: false,
        step4: false,
        step5: false,
        step6: false,
        step7: false,
        step8: false,
        step9: false,
        step10: false,
      };

      const newCompleted = {
        step1: false,
        step2: false,
        step3: false,
        step4: false,
        step5: false,
        step6: false,
        step7: false,
        step8: false,
        step9: false,
        step10: false,
      };

      const tenRecords = [];

      // Map Step 1 (Ticket ACK)
      const step1Rec = getLatestStepRecord(stepsData, STEP_DOC_TYPES.step1);
      tenRecords.push(step1Rec);

      if (step1Rec) {
        newHasRecords.step1 = true;
        newCompleted.step1 = true;
        setAckCompleted(true);
        setAckCustomerDate(step1Rec.customerAcknowledgement ? formatDateForInput(step1Rec.customerAcknowledgement) : "");
        setAckEndDate(step1Rec.endDate ? formatDisplayDate(step1Rec.endDate) : "");

        const hasHours = step1Rec.workingHours !== null && step1Rec.workingHours !== undefined && String(step1Rec.workingHours).trim() !== "" && Number(step1Rec.workingHours) > 0;
        const hasDays = step1Rec.workingDays !== null && step1Rec.workingDays !== undefined && String(step1Rec.workingDays).trim() !== "" && Number(step1Rec.workingDays) > 0;

        if (hasHours) {
          setAckWorkingHours(String(step1Rec.workingHours));
          setAckWorkingDays("");
        } else if (hasDays) {
          setAckWorkingDays(String(step1Rec.workingDays));
          setAckWorkingHours("");
        } else {
          setAckWorkingDays("");
          setAckWorkingHours("");
        }

        setAckResponsibleBy(step1Rec.responsibleBy || defaultName);

        const recTicketStatus = (step1Rec.ticketStatus && step1Rec.ticketStatus.toLowerCase() !== "created" && step1Rec.ticketStatus.toLowerCase() !== "assigned")
          ? step1Rec.ticketStatus
          : "";
        setAckStatus(recTicketStatus);

        let sVal = "Completed";
        if (step1Rec.stepStatus) {
          const valid = ["Pending", "Completed", "Rejected"].find(v => v.toLowerCase() === String(step1Rec.stepStatus).toLowerCase());
          sVal = valid || "Completed";
        }
        setAckStepStatus(sVal);
        if (step1Rec.attachment) {
          setAckAttachmentName(String(step1Rec.attachment).split(/[\\/]/).pop());
        }
      } else {
        newHasRecords.step1 = false;
        newCompleted.step1 = false;
        setAckCompleted(false);
        setAckCustomerDate("");
        setAckEndDate("");
        setAckWorkingDays("");
        setAckWorkingHours("");
        setAckResponsibleBy(defaultName);
        setAckStatus("");
        setAckStepStatus("Pending");
        setAckAttachment(null);
        setAckAttachmentName("");
      }

      // Map Steps 2 - 10
      const updatedSteps = {};
      for (let i = 2; i <= 10; i++) {
        const stepKey = `step${i}`;
        const docType = STEP_DOC_TYPES[stepKey];
        const rec = getLatestStepRecord(stepsData, docType);
        tenRecords.push(rec);

        if (rec) {
          newHasRecords[stepKey] = true;
          newCompleted[stepKey] = true;

          let sStatus = "Completed";
          if (rec.stepStatus) {
            const valid = ["Pending", "Completed", "Rejected"].find(v => v.toLowerCase() === String(rec.stepStatus).toLowerCase());
            sStatus = valid || "Completed";
          }
          const recTicketStatus = (rec.ticketStatus && rec.ticketStatus.toLowerCase() !== "created" && rec.ticketStatus.toLowerCase() !== "assigned")
            ? rec.ticketStatus
            : "";

          const mappedEndDate = rec.endDate ? formatDisplayDate(rec.endDate) : "";

          if (stepKey === "step3") {
            const tech = rec.estimatedTechnicalHours !== null && rec.estimatedTechnicalHours !== undefined ? String(rec.estimatedTechnicalHours) : "";
            const func = rec.estimatedFunctionalHours !== null && rec.estimatedFunctionalHours !== undefined ? String(rec.estimatedFunctionalHours) : "";
            const total = rec.estimatedTotalHours !== null && rec.estimatedTotalHours !== undefined
              ? String(rec.estimatedTotalHours)
              : (Number(tech) + Number(func) > 0 ? String(Number(tech) + Number(func)) : "");
            const rawCustApproved = rec.customerApprovedHours !== null && rec.customerApprovedHours !== undefined
              ? rec.customerApprovedHours
              : (rec.approvedHours !== null && rec.approvedHours !== undefined ? rec.approvedHours : "");
            let custApproved = "";
            if (rawCustApproved !== null && rawCustApproved !== undefined && String(rawCustApproved).trim() !== "") {
              const parsedApproved = parseFloat(rawCustApproved);
              if (!isNaN(parsedApproved) && parsedApproved !== 0) {
                custApproved = String(rawCustApproved);
              }
            }
            
            let docStatus = "No";
            if (rec.documentStatus) {
              docStatus = String(rec.documentStatus).toLowerCase() === "yes" ? "Yes" : "No";
            } else if (rec.attachment) {
              docStatus = "Yes";
            }

            updatedSteps[stepKey] = {
              days: "",
              hours: "",
              responsible: rec.responsibleBy || defaultName,
              status: recTicketStatus,
              ticketStatus: recTicketStatus,
              stepStatus: sStatus,
              endDate: mappedEndDate,
              attachment: null,
              attachmentName: rec.attachment ? String(rec.attachment).split(/[\\/]/).pop() : "",
              estimatedTechnicalHours: tech,
              estimatedFunctionalHours: func,
              estimatedTotalHours: total,
              customerApprovedHours: custApproved,
              documentStatus: docStatus,
            };
          } else {
            // Steps 2 and Steps 4 to 10
            let mappedDays = "";
            let mappedHours = "";
            if (i === 2) {
              const hasHours = rec.workingHours !== null && rec.workingHours !== undefined && String(rec.workingHours).trim() !== "" && Number(rec.workingHours) > 0;
              const hasDays = rec.workingDays !== null && rec.workingDays !== undefined && String(rec.workingDays).trim() !== "" && Number(rec.workingDays) > 0;
              if (hasHours) mappedHours = String(rec.workingHours);
              else if (hasDays) mappedDays = String(rec.workingDays);
            }
            // For Steps 4 to 10: "Don't map any value to Working Hours from FS step to all remaining steps."

            updatedSteps[stepKey] = {
              days: mappedDays,
              hours: mappedHours,
              responsible: rec.responsibleBy || defaultName,
              status: recTicketStatus,
              ticketStatus: recTicketStatus,
              stepStatus: sStatus,
              endDate: mappedEndDate,
              remarks: rec.remarks || "",
              attachment: null,
              attachmentName: rec.attachment ? String(rec.attachment).split(/[\\/]/).pop() : "",
            };
          }
        } else {
          newHasRecords[stepKey] = false;
          newCompleted[stepKey] = false;
          if (stepKey === "step3") {
            updatedSteps[stepKey] = {
              days: "",
              hours: "",
              responsible: defaultName,
              status: "",
              ticketStatus: "",
              stepStatus: "Pending",
              endDate: "",
              remarks: "",
              attachment: null,
              attachmentName: "",
              estimatedTechnicalHours: "",
              estimatedFunctionalHours: "",
              estimatedTotalHours: "",
              customerApprovedHours: "",
              documentStatus: "No",
            };
          } else {
            updatedSteps[stepKey] = {
              days: "",
              hours: "",
              responsible: defaultName,
              status: "",
              ticketStatus: "",
              stepStatus: "Pending",
              endDate: "",
              remarks: "",
              attachment: null,
              attachmentName: "",
            };
          }
        }
      }

      setWorkflowStepRecords(tenRecords);
      setHasStepRecord(newHasRecords);
      setCompletedSteps(newCompleted);
      setStepsState(updatedSteps);
    } catch (err) {
      console.error("Error fetching delivery workflow data:", err);
    }
  };

  // Auto-sync persistent ticket fields when selected workflow ticket changes
  useEffect(() => {
    if (selectedWorkflowTicket) {
      const currentTicketId =
        selectedWorkflowTicket.ticketNo ||
        selectedWorkflowTicket.txnId ||
        selectedWorkflowTicket.id;
      const isNewTicket = prevTicketIdRef.current !== currentTicketId;
      if (!isNewTicket && prevTicketIdRef.current !== null) return;
      prevTicketIdRef.current = currentTicketId;

      fetchWorkflowData(currentTicketId, selectedWorkflowTicket);
    }
  }, [
    selectedWorkflowTicket?.ticketNo,
    selectedWorkflowTicket?.txnId,
    selectedWorkflowTicket?.name,
    selectedWorkflowTicket?.responsibleBy,
    selectedWorkflowTicket?.ResponsibleBy,
    selectedWorkflowTicket?.ticketStatus,
    selectedWorkflowTicket?.status,
    selectedWorkflowTicket?.customerAcknowledgedOn,
    selectedWorkflowTicket?.CustomerAcknowledgedOn,
    selectedWorkflowTicket?.workingDays,
    selectedWorkflowTicket?.WorkingDays,
    selectedWorkflowTicket?.approvedHours,
    selectedWorkflowTicket?.Approvedhours,
    selectedWorkflowTicket?.ApprovedHours,
    selectedWorkflowTicket?.approvedhours,
  ]);

  // Format dates to MM/DD/YYYY as expected by backend
  const formatToMMDDYYYY = (val) => {
    if (!val) {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }
    if (typeof val === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Get YYYY-MM-DD for datepicker min attribute
  const getMinAckDate = (dateStr) => {
    if (!dateStr) return "0000-00-00";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "0000-00-00";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Unified Save / Post handler for all 10 steps
  const handleSaveStep = async (stepKey, docType) => {
    if (!selectedWorkflowTicket) {
      showStepAlert(stepKey, "error", "No ticket selected.");
      return;
    }

    const ticketId = selectedWorkflowTicket.ticketNo || selectedWorkflowTicket.txnId;
    let customerAckFormatted = "";
    // End date should be when user clicks on button to perform this step, current date should go
    let endSlaFormatted = formatToMMDDYYYY(new Date());
    let workingDaysVal = "";
    let hoursVal = "";
    let responsibleVal = "";
    let statusVal = "";
    // Step status should be completed when user clicks on button
    let stepStatusVal = "Completed";
    let attachmentVal = null;
    let extraFields = {};

    if (stepKey === "step1") {
      const missing = [];
      if (!ackCustomerDate || !String(ackCustomerDate).trim()) {
        missing.push("Customer Acknowledged On");
      }
      if (missing.length > 0) {
        setMissingFields(missing);
        showStepAlert(stepKey, "error", `Please provide all required fields: ${missing.join(", ")}.`);
        return;
      }

      // Date validation: Customer Acknowledged On must be on or after Acknowledgement Sent On
      const sentDateRaw = selectedWorkflowTicket?.createddate ? new Date(selectedWorkflowTicket.createddate) : new Date();
      const customerAckDateObj = new Date(ackCustomerDate);
      
      const sentDateMidnight = new Date(sentDateRaw.getFullYear(), sentDateRaw.getMonth(), sentDateRaw.getDate()).getTime();
      const ackDateMidnight = new Date(customerAckDateObj.getFullYear(), customerAckDateObj.getMonth(), customerAckDateObj.getDate()).getTime();

      if (ackDateMidnight < sentDateMidnight) {
        setMissingFields(["Customer Acknowledged On"]);
        showStepAlert(
          stepKey,
          "error",
          `Customer Acknowledged On date cannot be earlier than Acknowledgement Sent On (${formatCreatedDate(selectedWorkflowTicket?.createddate)}). Please select a date on or after the sent date.`
        );
        return;
      }
      setMissingFields([]);

      customerAckFormatted = formatToMMDDYYYY(ackCustomerDate);
      endSlaFormatted = formatToMMDDYYYY(new Date());
      responsibleVal = ackResponsibleBy || defaultConsultant;
      statusVal = "";
      stepStatusVal = "Completed";
      attachmentVal = ackAttachment || null;
      extraFields = {};
    } else if (stepKey === "step2") {
      const s = stepsState.step2 || {};
      responsibleVal = s.responsible || defaultConsultant;
      statusVal = "";
      stepStatusVal = "Completed";
      customerAckFormatted = "";
      endSlaFormatted = formatToMMDDYYYY(new Date());
      attachmentVal = s.attachment || null;
      extraFields = {};
    } else if (stepKey === "step3") {
      const s = stepsState.step3 || {};
      const tStatus = s.ticketStatus || s.status || "";
      if (!tStatus || !String(tStatus).trim()) {
        showStepAlert(stepKey, "error", "Please select a Ticket Status.");
        return;
      }

      const tech = Number(s.estimatedTechnicalHours) || 0;
      const func = Number(s.estimatedFunctionalHours) || 0;
      const total = tech + func;
      const totalHoursStr = total > 0 ? String(total) : (s.estimatedTotalHours || "");
      const docStatusVal = (s.attachment || s.attachmentName) ? "Yes" : "No";

      responsibleVal = s.responsible || defaultConsultant;
      statusVal = "";
      stepStatusVal = "Completed";
      customerAckFormatted = "";
      endSlaFormatted = formatToMMDDYYYY(new Date());
      attachmentVal = s.attachment || null;

      extraFields = {
        EstimatedTechnicalHours: s.estimatedTechnicalHours || "",
        EstimatedFunctionalHours: s.estimatedFunctionalHours || "",
        EstimatedTotalHours: totalHoursStr,
        DocumentStatus: docStatusVal,
        TicketStatus: tStatus,
      };
    } else if (stepKey === "step10") {
      const s = stepsState.step10 || {};
      const tStatus = s.ticketStatus || s.status || "";
      if (!tStatus || !String(tStatus).trim()) {
        showStepAlert(stepKey, "error", "Please select a Ticket Status.");
        return;
      }

      responsibleVal = s.responsible || defaultConsultant;
      statusVal = "";
      stepStatusVal = "Completed";
      customerAckFormatted = "";
      endSlaFormatted = formatToMMDDYYYY(new Date());
      attachmentVal = s.attachment || null;

      extraFields = {
        Remarks: s.remarks || "",
        TicketStatus: tStatus,
      };
    } else {
      // Steps 4 to 9
      const s = stepsState[stepKey] || {};
      const tStatus = s.ticketStatus || s.status || "";
      if (!tStatus || !String(tStatus).trim()) {
        showStepAlert(stepKey, "error", "Please select a Ticket Status.");
        return;
      }

      responsibleVal = s.responsible || defaultConsultant;
      statusVal = "";
      stepStatusVal = "Completed";
      customerAckFormatted = "";
      endSlaFormatted = formatToMMDDYYYY(new Date());
      attachmentVal = s.attachment || null;
      extraFields = {
        TicketStatus: tStatus,
      };
    }

    setSubmittingSteps((prev) => ({ ...prev, [stepKey]: true }));
    try {
      const resp = await postTicketAcknowledgement(
        ticketId,
        docType,
        customerAckFormatted,
        endSlaFormatted,
        workingDaysVal,
        responsibleVal,
        statusVal,
        attachmentVal,
        hoursVal,
        stepStatusVal,
        extraFields
      );

      if (resp && resp.success) {
        showStepAlert(stepKey, "success", resp.message || `${docType} saved successfully.`);
        setCompletedSteps((prev) => ({ ...prev, [stepKey]: true }));
        setHasStepRecord((prev) => ({ ...prev, [stepKey]: true }));
        if (stepKey === "step1") {
          setAckCompleted(true);
          setAckStepStatus(stepStatusVal);
          setAckEndDate(formatDisplayDate(endSlaFormatted));
        } else {
          setStepsState((prev) => ({
            ...prev,
            [stepKey]: {
              ...prev[stepKey],
              stepStatus: stepStatusVal,
              endDate: formatDisplayDate(endSlaFormatted),
              ticketStatus: extraFields?.TicketStatus || prev[stepKey]?.ticketStatus || "",
              ...(stepKey === "step3" ? { documentStatus: extraFields.DocumentStatus } : {}),
            },
          }));
        }
        await fetchWorkflowData(ticketId, selectedWorkflowTicket);
      } else {
        const isSuccessMsg = resp?.message && (resp.message.toLowerCase().includes("success") || resp.message.toLowerCase().includes("saved"));
        showStepAlert(stepKey, isSuccessMsg ? "success" : "error", resp?.message || `Failed to record ${docType}.`);
        if (isSuccessMsg) {
          setCompletedSteps((prev) => ({ ...prev, [stepKey]: true }));
          setHasStepRecord((prev) => ({ ...prev, [stepKey]: true }));
          if (stepKey === "step1") {
            setAckCompleted(true);
            setAckStepStatus(stepStatusVal);
            setAckEndDate(formatDisplayDate(endSlaFormatted));
          } else {
            setStepsState((prev) => ({
              ...prev,
              [stepKey]: {
                ...prev[stepKey],
                stepStatus: stepStatusVal,
                endDate: formatDisplayDate(endSlaFormatted),
                ticketStatus: extraFields?.TicketStatus || prev[stepKey]?.ticketStatus || "",
                ...(stepKey === "step3" ? { documentStatus: extraFields.DocumentStatus } : {}),
              },
            }));
          }
          await fetchWorkflowData(ticketId, selectedWorkflowTicket);
        }
      }
    } catch (err) {
      console.error(`Error posting ${docType}:`, err);
      showStepAlert(stepKey, "error", `An error occurred while saving ${docType}.`);
    } finally {
      setSubmittingSteps((prev) => ({ ...prev, [stepKey]: false }));
    }
  };

  const handleSendAcknowledgement = () => handleSaveStep("step1", "Ticket ACK");

  // Helper renderer for employee dropdown options with out-of-range protection
  const employeeList = useMemo(() => {
    if (employees && employees.length > 0) {
      return employees.map((emp, idx) => ({
        id: emp.employeeId || emp.id || idx,
        name: emp.name || emp.employeeName || "",
      })).filter((e) => e.name);
    }
    return [
      { id: "km", name: "K. Menon" },
      { id: "jb", name: "Jaswanth B" },
      { id: "avb", name: "Aakash Vikas Bansode" },
      { id: "ri", name: "Rohit Iyer" },
    ];
  }, [employees]);

  const statusList = useMemo(() => {
    if (statuses && statuses.length > 0) {
      return statuses
        .map((st, idx) => ({
          id: st.id || idx,
          name: st.name || "",
        }))
        .filter((s) => s.name && s.name.toLowerCase() !== "created" && s.name.toLowerCase() !== "assigned");
    }
    return [
      { id: "ip", name: "Inprocess" },
      { id: "cl", name: "Closed" },
    ];
  }, [statuses]);

  const renderEmployeeOptions = (currentValue) => {
    let list = employeeList;
    if (currentValue && !list.some((item) => item.name === currentValue)) {
      list = [{ id: `custom-${currentValue}`, name: currentValue }, ...list];
    }

    return list.map((item) => (
      <MenuItem key={item.id} value={item.name}>
        {item.name}
      </MenuItem>
    ));
  };

  // Helper renderer for status dropdown options with out-of-range protection
  const renderStatusOptions = (currentValue) => {
    let list = statusList;
    if (currentValue && !list.some((item) => item.name === currentValue)) {
      list = [{ id: `custom-${currentValue}`, name: currentValue }, ...list];
    }

    return list.map((item) => (
      <MenuItem key={item.id} value={item.name}>
        {item.name}
      </MenuItem>
    ));
  };

  // Helper renderer for step status badge (Completed / On Time)
  const renderStepBadge = (stepKey) => {
    const isDone = Boolean(hasStepRecord[stepKey] || completedSteps[stepKey]);
    if (isDone) {
      return (
        <span className="mlp-dw-step-badge-completed">
          {/* <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg> */}
          Completed
        </span>
      );
    }
    return <span className="mlp-dw-step-badge-ontime">On Time</span>;
  };

  // Calculate completed stages and current active stage for the workflow timeline
  const completedStagesCount = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= 10; i++) {
      if (hasStepRecord[`step${i}`] || completedSteps[`step${i}`]) {
        count++;
      }
    }
    return count;
  }, [hasStepRecord, completedSteps]);

  const currentActiveStepIndex = useMemo(() => {
    for (let i = 0; i < 10; i++) {
      const stepKey = WORKFLOW_10_STEPS[i].key;
      if (!hasStepRecord[stepKey] && !completedSteps[stepKey]) {
        return i;
      }
    }
    return 9;
  }, [hasStepRecord, completedSteps]);

  const currentActiveStepObj = WORKFLOW_10_STEPS[currentActiveStepIndex] || WORKFLOW_10_STEPS[0];
  const progressPercent = Math.round((completedStagesCount / 10) * 100);
  const isCurrentStepDone = Boolean(hasStepRecord[currentActiveStepObj.key] || completedSteps[currentActiveStepObj.key]);

  return (
    <div className="mlp-dw-container">
      <div>
        <div className="cons-breadcrumb-row">
          <span className="cons-breadcrumb-muted">{currentRoleLabel}</span>
          <span className="cons-breadcrumb-sep">›</span>
          <span className="cons-breadcrumb-curr">DELIVERY WORKFLOW</span>
        </div>
        <h1 className="mlp-page-title">Delivery Workflow</h1>
        <p className="mlp-page-subtitle">
          Move through each stage with less friction. Your progress is saved automatically as you work
        </p>
      </div>

      {/* ── Top Horizontal Ticket Selector ── */}
      <div className="mlp-dw-tickets-bar">
        <button
          type="button"
          className="mlp-dw-nav-arrow"
          onClick={() => handleScrollPills("left")}
          aria-label="Scroll left"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="mlp-dw-tickets-scroll" ref={pillsContainerRef}>
          {loadingTickets ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  width={110}
                  height={36}
                  sx={{ borderRadius: "12px" }}
                />
              ))}
            </div>
          ) : workflowTickets.length === 0 ? (
            <span style={{ fontSize: "12px", color: "#64748b" }}>No tickets available</span>
          ) : (
            workflowTickets.map((t, idx) => {
              const tNo = t.ticketNo || `T-${idx + 1}`;
              const isActive = workflowTicketIdx === idx;
              return (
                <button
                  key={t.ticketNo || t.txnId || t.id || `ticket-${idx}`}
                  type="button"
                  className={`mlp-dw-ticket-pill ${isActive ? "active" : ""}`}
                  onClick={() => setWorkflowTicketIdx(idx)}
                >
                  {tNo}
                </button>
              );
            })
          )}

          {!loadingTickets && workflowVisibleCount < filteredTickets.length && (
            <button
              type="button"
              className="mlp-dw-show-more-pill"
              onClick={() => setWorkflowVisibleCount((prev) => prev + 10)}
            >
              Show more ({filteredTickets.length - workflowVisibleCount} remaining)
            </button>
          )}
        </div>

        <button
          type="button"
          className="mlp-dw-nav-arrow"
          onClick={() => handleScrollPills("right")}
          aria-label="Scroll right"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── 100% Full-Width Governed Steps ── */}
      <div className="mlp-dw-steps-col">
        {/* ── Card 1: Ticket Header & Current Stage Summary ── */}
        <div className="mlp-dw-ticket-summary-card">
          {loadingTickets ? (
            <>
              <div className="mlp-dw-tsc-top">
                <div style={{ width: "100%" }}>
                  <Skeleton variant="text" width="55%" height={28} sx={{ borderRadius: "4px" }} />
                  <Skeleton variant="text" width="28%" height={18} sx={{ marginTop: "4px", borderRadius: "4px" }} />
                </div>
                <Skeleton variant="rectangular" width={48} height={24} sx={{ borderRadius: "6px" }} />
              </div>
              <div className="mlp-dw-tsc-footer">
                <Skeleton variant="text" width="22%" height={16} sx={{ borderRadius: "4px" }} />
              </div>
            </>
          ) : (
            <>
              <div className="mlp-dw-tsc-top">
                <div>
                  <h2 className="mlp-dw-tsc-title">
                    {selectedWorkflowTicket?.ticketNo || "Ticket"} — {selectedWorkflowTicket?.description || selectedWorkflowTicket?.remarks || "No description provided"}
                  </h2>
                  <p className="mlp-dw-tsc-subtitle">
                    Current ticket · {currentActiveStepObj.name}
                  </p>
                </div>
                {selectedWorkflowTicket && (
                  <span
                    className={`mlp-tc-priority ${
                      getPriorityClass ? getPriorityClass(selectedWorkflowTicket.priority) : "p4"
                    }`}
                    style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px" }}
                  >
                    {formatPriorityCode
                      ? formatPriorityCode(selectedWorkflowTicket.priority)
                      : selectedWorkflowTicket.priority || "P4"}
                  </span>
                )}
              </div>
              <div className="mlp-dw-tsc-footer">
                Stage {currentActiveStepObj.num} of 10 · {isCurrentStepDone ? "Complete" : "In Progress"}
              </div>
            </>
          )}
        </div>

        {/* ── Card 2: Delivery Workflow Timeline Stepper ── */}
        <div className="mlp-dw-progress-card">
          {loadingTickets ? (
            <>
              <div className="mlp-dw-pc-header">
                <div>
                  <Skeleton variant="text" width={220} height={22} sx={{ borderRadius: "4px" }} />
                  <Skeleton variant="text" width={140} height={16} sx={{ marginTop: "4px", borderRadius: "4px" }} />
                </div>
                <div className="mlp-dw-pc-metrics">
                  <Skeleton variant="text" width={50} height={32} sx={{ borderRadius: "4px" }} />
                  <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: "9999px" }} />
                </div>
              </div>
              <div className="mlp-dw-stepper-track">
                {WORKFLOW_10_STEPS.map((s, idx) => (
                  <div key={s.key} className="mlp-dw-step-node-wrap">
                    {idx > 0 && <div className="mlp-dw-step-connector" />}
                    <Skeleton variant="circular" width={26} height={26} />
                    <Skeleton variant="text" width={40} height={14} sx={{ marginTop: "8px", borderRadius: "4px" }} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mlp-dw-pc-header">
                <div className="mlp-dw-pc-title-block">
                  <h3 className="mlp-dw-pc-title">
                    {selectedWorkflowTicket?.ticketNo || "Ticket"} · Delivery workflow
                  </h3>
                  <p className="mlp-dw-pc-subtitle">
                    {completedStagesCount} of 10 stages completed
                  </p>
                </div>
                <div className="mlp-dw-pc-metrics">
                  <span className="mlp-dw-pc-percent">{progressPercent}%</span>
                  <span className="mlp-dw-pc-badge">
                    {progressPercent === 100 ? "Completed" : "On track"}
                  </span>
                </div>
              </div>

              {/* 10-Step Stepper Track */}
              <div className="mlp-dw-stepper-track">
                {WORKFLOW_10_STEPS.map((step, idx) => {
                  const isDone = Boolean(hasStepRecord[step.key] || completedSteps[step.key]);
                  const isCurrent = idx === currentActiveStepIndex;
                  const stepNumFormatted = String(step.num).padStart(2, "0");
                  const labelText = idx === 0 && selectedWorkflowTicket?.ticketNo ? selectedWorkflowTicket.ticketNo : step.short;

                  return (
                    <div key={step.key} className="mlp-dw-step-node-wrap">
                      {idx > 0 && (
                        <div
                          className={`mlp-dw-step-connector ${
                            hasStepRecord[WORKFLOW_10_STEPS[idx - 1].key] || completedSteps[WORKFLOW_10_STEPS[idx - 1].key]
                              ? "completed"
                              : ""
                          }`}
                        />
                      )}
                      <div
                        className={`mlp-dw-step-circle ${
                          isDone ? "completed" : isCurrent ? "active" : "pending"
                        }`}
                      >
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          stepNumFormatted
                        )}
                      </div>
                      <span
                        className={`mlp-dw-step-lbl ${
                          isDone ? "completed" : isCurrent ? "active" : "pending"
                        }`}
                      >
                        {labelText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Columns guide */}
        {/* <div className="mlp-dw-columns-guide">
          <span>NO</span>
          <span>ACTIVITY</span>
          <span style={{ marginLeft: 30 }}>WORKING DAYS</span>
          <span>WORKING HOURS</span>
          <span>START</span>
          <span>END</span>
          <span>RESPONSIBLE BY</span>
          <span>STATUS</span>
          <span>ATTACHMENT</span>
          <span>SLA STATUS</span>
        </div> */}

        {loadingTickets ? (
          <>
            {[1, 2, 3, 4].map((idx) => (
              <div key={`step-skel-${idx}`} className="mlp-dw-step-card">
                <div className="mlp-dw-step-top">
                  <div className="mlp-dw-step-title-row">
                    <Skeleton variant="rectangular" width={28} height={24} sx={{ borderRadius: "4px" }} />
                    <Skeleton variant="text" width={130} height={22} sx={{ borderRadius: "4px" }} />
                    <Skeleton variant="rectangular" width={160} height={22} sx={{ borderRadius: "4px" }} />
                    <Skeleton variant="rectangular" width={80} height={22} sx={{ borderRadius: "4px" }} />
                  </div>
                  <Skeleton variant="rectangular" width={75} height={24} sx={{ borderRadius: "9999px" }} />
                </div>
                <Skeleton variant="text" width="70%" height={16} sx={{ borderRadius: "4px", margin: "4px 0" }} />
                <div className="mlp-dw-form-row">
                  <div className="mlp-dw-field-group">
                    <Skeleton variant="text" width={80} height={14} sx={{ borderRadius: "4px", marginBottom: "4px" }} />
                    <Skeleton variant="rectangular" width="100%" height={38} sx={{ borderRadius: "4px" }} />
                  </div>
                  <div className="mlp-dw-field-group">
                    <Skeleton variant="text" width={80} height={14} sx={{ borderRadius: "4px", marginBottom: "4px" }} />
                    <Skeleton variant="rectangular" width="100%" height={38} sx={{ borderRadius: "4px" }} />
                  </div>
                  <div className="mlp-dw-field-group">
                    <Skeleton variant="text" width={100} height={14} sx={{ borderRadius: "4px", marginBottom: "4px" }} />
                    <Skeleton variant="rectangular" width="100%" height={38} sx={{ borderRadius: "4px" }} />
                  </div>
                  <div className="mlp-dw-field-group">
                    <Skeleton variant="text" width={120} height={14} sx={{ borderRadius: "4px", marginBottom: "4px" }} />
                    <Skeleton variant="rectangular" width="100%" height={38} sx={{ borderRadius: "4px" }} />
                  </div>
                </div>
                <div className="mlp-dw-step-footer" style={{ display: "flex", justifyContent: "flex-end", paddingTop: "12px" }}>
                  <Skeleton variant="rectangular" width={130} height={36} sx={{ borderRadius: "4px" }} />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
        {/* Step 01: TICKET ACK */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">01</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">TICKET ACK</span>
                  <span className="mlp-dw-brd-tag">Acknowledge request</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step1")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Ticket Acknowledgement</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle Ticket ACK details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step1");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step1 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Confirm the request details and capture the acknowledgement needed to begin the workflow.
                </p>
              </div>
            </div>
            {renderStepBadge("step1")}
          </div>

          {expandedSteps.step1 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row mlp-dw-ack-form-grid">
                {/* 1. Acknowledgement sent on */}
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    ACKNOWLEDGEMENT SENT ON <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    title="Start date taken from API createddate (fixed)"
                  />
                </div>

                {/* 2. Customer Acknowledged On */}
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    CUSTOMER ACKNOWLEDGED ON <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    type="date"
                    size="small"
                    variant="outlined"
                    value={ackCustomerDate}
                    error={missingFields.includes("Customer Acknowledged On")}
                    onChange={(e) => {
                      setAckCustomerDate(e.target.value);
                      if (missingFields.includes("Customer Acknowledged On")) {
                        setMissingFields((prev) => prev.filter((f) => f !== "Customer Acknowledged On"));
                      }
                    }}
                    onClick={(e) => {
                      if (e.target.showPicker) {
                        try {
                          e.target.showPicker();
                        } catch (err) {}
                      }
                    }}
                    sx={{
                      ...muiInputSx,
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#ffffff !important",
                        color: "#0f172a !important",
                        borderRadius: "12px",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        "& fieldset": {
                          borderColor: "#cbd5e1 !important",
                        },
                        "&:hover fieldset": {
                          borderColor: "#94a3b8 !important",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#33557a !important",
                        },
                      },
                      "& input": {
                        color: "#0f172a !important",
                        WebkitTextFillColor: "#0f172a !important",
                      },
                      "& input::-webkit-calendar-picker-indicator": {
                        cursor: "pointer",
                        filter: "none !important",
                        opacity: "1 !important",
                        display: "block !important",
                      },
                      "& .MuiInputBase-input::-webkit-calendar-picker-indicator": {
                        cursor: "pointer",
                        filter: "none !important",
                        opacity: "1 !important",
                        display: "block !important",
                      },
                    }}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        min: getMinAckDate(selectedWorkflowTicket?.createddate),
                      },
                    }}
                  />
                </div>

                {/* 3. Acknowledgement Attachment */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ACKNOWLEDGEMENT ATTACHMENT</label>
                  <input
                    type="file"
                    ref={ackFileInputRef}
                    style={{ display: "none" }}
                    onChange={handleAckFileChange}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step1"] || submittingSteps["step1"]}
                    onClick={() => ackFileInputRef.current && ackFileInputRef.current.click()}
                    title={ackAttachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step1"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {ackAttachmentName
                            ? ackAttachmentName.length > 14
                              ? ackAttachmentName.slice(0, 14) + "..."
                              : ackAttachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4. Start Date */}
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* 5. End Date */}
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={ackEndDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* 6. Responsible By */}
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={ackResponsibleBy || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* 7. Ticket Acknowledgment Status */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET ACK STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={ackStepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 01 */}
              {ackAttachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={ackAttachmentName}>
                      {ackAttachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={handleRemoveAckFile}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step1", "Ticket ACK")}
                  disabled={submittingSteps["step1"]}
                >
                  {submittingSteps["step1"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting ticket ACK...</span>
                    </>
                  ) : (
                    "Submit Ticket ACK"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step1"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}

          {stepAlerts.step1?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step1.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step1: { ...prev.step1, open: false } }))}
                sx={{
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 500,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {stepAlerts.step1.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 02: BRD */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">02</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">BRD</span>
                  <span className="mlp-dw-brd-tag">Define requirements</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => setBrdExpanded((prev) => !prev)}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Business Requirements Document</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle BRD details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBrdExpanded((prev) => !prev);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: brdExpanded ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Capture the business requirements and align the delivery team on the expected outcome.
                </p>
              </div>
            </div>
            {renderStepBadge("step2")}
          </div>

          {brdExpanded && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                {/* 1. Start Date Field */}
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* 2. End Date Field */}
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step2.endDate || ""}
                    placeholder="Select date"
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* 3. Responsible Field */}
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step2.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* 4. Attachment Field */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step2 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step2", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step2"] || submittingSteps["step2"]}
                    onClick={() => fileInputRefs.current.step2 && fileInputRefs.current.step2.click()}
                    title={stepsState.step2.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step2"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step2.attachmentName
                            ? stepsState.step2.attachmentName.length > 14
                              ? stepsState.step2.attachmentName.slice(0, 14) + "..."
                              : stepsState.step2.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* 5. BRD Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">BRD STATUS</label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step2.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 02 */}
              {stepsState.step2.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step2.attachmentName}>
                      {stepsState.step2.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step2")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step2", "BRD")}
                  disabled={submittingSteps["step2"]}
                >
                  {submittingSteps["step2"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting BRD...</span>
                    </>
                  ) : (
                    "Submit BRD"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step2"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step2?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step2.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step2: { ...prev.step2, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step2.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 03: BUD */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">03</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">BUD</span>
                  <span className="mlp-dw-brd-tag">Estimate investment</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step3")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Budget & Effort Estimate</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle BUD details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step3");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step3 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Document the planned hours, budget, and delivery assumptions for this engagement.
                </p>
              </div>
            </div>
            {renderStepBadge("step3")}
          </div>

          {expandedSteps.step3 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">ESTD TECH.HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step3.estimatedTechnicalHours || ""}
                    onChange={(e) => handleStepChange("step3", "estimatedTechnicalHours", e.target.value)}
                    sx={{
                      ...muiInputSx,
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#ffffff !important",
                        color: "#0f172a !important",
                        borderRadius: "12px",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        "& fieldset": {
                          borderColor: "#cbd5e1 !important",
                        },
                        "&:hover fieldset": {
                          borderColor: "#94a3b8 !important",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#33557a !important",
                        },
                      },
                      "& input": {
                        color: "#0f172a !important",
                        WebkitTextFillColor: "#0f172a !important",
                      },
                    }}
                    slotProps={{ htmlInput: { min: 0, step: "any" } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">ESTD FUNC.HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step3.estimatedFunctionalHours || ""}
                    onChange={(e) => handleStepChange("step3", "estimatedFunctionalHours", e.target.value)}
                    sx={{
                      ...muiInputSx,
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#ffffff !important",
                        color: "#0f172a !important",
                        borderRadius: "12px",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        "& fieldset": {
                          borderColor: "#cbd5e1 !important",
                        },
                        "&:hover fieldset": {
                          borderColor: "#94a3b8 !important",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#33557a !important",
                        },
                      },
                      "& input": {
                        color: "#0f172a !important",
                        WebkitTextFillColor: "#0f172a !important",
                      },
                    }}
                    slotProps={{ htmlInput: { min: 0, step: "any" } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">ESTD TOTAL HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={
                      stepsState.step3.estimatedTotalHours ||
                      (Number(stepsState.step3.estimatedTechnicalHours || 0) + Number(stepsState.step3.estimatedFunctionalHours || 0) > 0
                        ? String(Number(stepsState.step3.estimatedTechnicalHours || 0) + Number(stepsState.step3.estimatedFunctionalHours || 0))
                        : "")
                    }
                    disabled
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">CUST.APPROVED HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={
                      stepsState.step3.customerApprovedHours !== null &&
                      stepsState.step3.customerApprovedHours !== undefined &&
                      String(stepsState.step3.customerApprovedHours).trim() !== "" &&
                      parseFloat(stepsState.step3.customerApprovedHours) !== 0 &&
                      !isNaN(parseFloat(stepsState.step3.customerApprovedHours))
                        ? String(stepsState.step3.customerApprovedHours)
                        : ""
                    }
                    disabled
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step3.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step3.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 03 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step3 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step3", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step3"] || submittingSteps["step3"]}
                    onClick={() => fileInputRefs.current.step3 && fileInputRefs.current.step3.click()}
                    title={stepsState.step3.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step3"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step3.attachmentName
                            ? stepsState.step3.attachmentName.length > 14
                              ? stepsState.step3.attachmentName.slice(0, 14) + "..."
                              : stepsState.step3.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Document status of BUD */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">DOCUMENT STATUS</label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={(stepsState.step3.attachment || stepsState.step3.attachmentName) ? "Yes" : (stepsState.step3.documentStatus || "No")}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* BUD Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    BUD STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step3.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step3.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step3", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step3", stepsState.step3.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 03 */}
              {stepsState.step3.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step3.attachmentName}>
                      {stepsState.step3.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step3")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step3", "BUD")}
                  disabled={submittingSteps["step3"]}
                >
                  {submittingSteps["step3"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting BUD...</span>
                    </>
                  ) : (
                    "Submit BUD"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step3"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step3?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step3.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step3: { ...prev.step3, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step3.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 04: FS */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">04</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">FS</span>
                  <span className="mlp-dw-brd-tag">Describe solution</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step4")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Functional Specification</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle FS details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step4");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step4 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Translate approved requirements into a clear, reviewable functional specification.
                </p>
              </div>
            </div>
            {renderStepBadge("step4")}
          </div>

          {expandedSteps.step4 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">TIMESHEET HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step4.hours ?? ""}
                    onChange={(e) => handleStepChange("step4", "hours", e.target.value)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step4.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step4.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 04 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step4 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step4", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step4"] || submittingSteps["step4"]}
                    onClick={() => fileInputRefs.current.step4 && fileInputRefs.current.step4.click()}
                    title={stepsState.step4.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step4"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step4.attachmentName
                            ? stepsState.step4.attachmentName.length > 14
                              ? stepsState.step4.attachmentName.slice(0, 14) + "..."
                              : stepsState.step4.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* FS Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    FS STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step4.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step4.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step4", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step4", stepsState.step4.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 04 */}
              {stepsState.step4.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step4.attachmentName}>
                      {stepsState.step4.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step4")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step4", "FS")}
                  disabled={submittingSteps["step4"]}
                >
                  {submittingSteps["step4"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting FS...</span>
                    </>
                  ) : (
                    "Submit FS"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step4"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step4?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step4.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step4: { ...prev.step4, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step4.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 05: TS */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">05</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">TS</span>
                  <span className="mlp-dw-brd-tag">Plan implementation</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step5")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Technical Specification</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle TS details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step5");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step5 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Define the technical approach, dependencies, and implementation details.
                </p>
              </div>
            </div>
            {renderStepBadge("step5")}
          </div>

          {expandedSteps.step5 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">TIMESHEET HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step5.hours ?? ""}
                    onChange={(e) => handleStepChange("step5", "hours", e.target.value)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step5.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step5.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 05 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step5 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step5", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step5"] || submittingSteps["step5"]}
                    onClick={() => fileInputRefs.current.step5 && fileInputRefs.current.step5.click()}
                    title={stepsState.step5.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step5"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step5.attachmentName
                            ? stepsState.step5.attachmentName.length > 14
                              ? stepsState.step5.attachmentName.slice(0, 14) + "..."
                              : stepsState.step5.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* TS Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    TS STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step5.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step5.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step5", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step5", stepsState.step5.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 05 */}
              {stepsState.step5.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step5.attachmentName}>
                      {stepsState.step5.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step5")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step5", "TS")}
                  disabled={submittingSteps["step5"]}
                >
                  {submittingSteps["step5"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting TS...</span>
                    </>
                  ) : (
                    "Submit TS"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step5"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step5?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step5.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step5: { ...prev.step5, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step5.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 06: CONFIG */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">06</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">CONFIG</span>
                  <span className="mlp-dw-brd-tag">Configure workspace</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step6")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Configuration</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle CONFIG details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step6");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step6 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Set up configuration values and confirm the environment is ready for delivery.
                </p>
              </div>
            </div>
            {renderStepBadge("step6")}
          </div>

          {expandedSteps.step6 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">TIMESHEET HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step6.hours ?? ""}
                    onChange={(e) => handleStepChange("step6", "hours", e.target.value)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step6.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step6.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 06 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step6 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step6", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step6"] || submittingSteps["step6"]}
                    onClick={() => fileInputRefs.current.step6 && fileInputRefs.current.step6.click()}
                    title={stepsState.step6.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step6"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step6.attachmentName
                            ? stepsState.step6.attachmentName.length > 14
                              ? stepsState.step6.attachmentName.slice(0, 14) + "..."
                              : stepsState.step6.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* CONFIG Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    CONFIG STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step6.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step6.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step6", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step6", stepsState.step6.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 06 */}
              {stepsState.step6.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step6.attachmentName}>
                      {stepsState.step6.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step6")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step6", "CONFIG")}
                  disabled={submittingSteps["step6"]}
                >
                  {submittingSteps["step6"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting CONFIG...</span>
                    </>
                  ) : (
                    "Submit CONFIG"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step6"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step6?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step6.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step6: { ...prev.step6, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step6.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 07: TEST INTERNAL */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">07</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">TEST INTERNAL</span>
                  <span className="mlp-dw-brd-tag">Validate internally</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step7")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Internal Testing</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle TEST INTERNAL details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step7");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step7 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Run the internal test pass and track any issues before customer review.
                </p>
              </div>
            </div>
            {renderStepBadge("step7")}
          </div>

          {expandedSteps.step7 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">TIMESHEET HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step7.hours ?? ""}
                    onChange={(e) => handleStepChange("step7", "hours", e.target.value)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step7.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step7.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 07 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step7 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step7", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step7"] || submittingSteps["step7"]}
                    onClick={() => fileInputRefs.current.step7 && fileInputRefs.current.step7.click()}
                    title={stepsState.step7.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step7"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step7.attachmentName
                            ? stepsState.step7.attachmentName.length > 14
                              ? stepsState.step7.attachmentName.slice(0, 14) + "..."
                              : stepsState.step7.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* TEST INTERNAL Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    TEST INTERNAL STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step7.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step7.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step7", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step7", stepsState.step7.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 07 */}
              {stepsState.step7.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step7.attachmentName}>
                      {stepsState.step7.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step7")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step7", "TEST INTERNAL")}
                  disabled={submittingSteps["step7"]}
                >
                  {submittingSteps["step7"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting Internal Testing...</span>
                    </>
                  ) : (
                    "Submit Internal Testing"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step7"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step7?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step7.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step7: { ...prev.step7, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step7.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 08: U. MANUAL */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">08</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">U. MANUAL</span>
                  <span className="mlp-dw-brd-tag">Prepare guidance</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step8")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">User Manual</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle U. MANUAL details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step8");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step8 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Prepare concise guidance to help customers use the delivered workflow.
                </p>
              </div>
            </div>
            {renderStepBadge("step8")}
          </div>

          {expandedSteps.step8 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">TIMESHEET HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step8.hours ?? ""}
                    onChange={(e) => handleStepChange("step8", "hours", e.target.value)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step8.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step8.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 08 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step8 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step8", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step8"] || submittingSteps["step8"]}
                    onClick={() => fileInputRefs.current.step8 && fileInputRefs.current.step8.click()}
                    title={stepsState.step8.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step8"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step8.attachmentName
                            ? stepsState.step8.attachmentName.length > 14
                              ? stepsState.step8.attachmentName.slice(0, 14) + "..."
                              : stepsState.step8.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* User Manual Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    U.MANUAL STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step8.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step8.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step8", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step8", stepsState.step8.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 08 */}
              {stepsState.step8.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step8.attachmentName}>
                      {stepsState.step8.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step8")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step8", "U. MANUAL")}
                  disabled={submittingSteps["step8"]}
                >
                  {submittingSteps["step8"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting User Manual...</span>
                    </>
                  ) : (
                    "Submit User Manual"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step8"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step8?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step8.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step8: { ...prev.step8, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step8.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 09: SUBMISSION */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">09</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">SUBMISSION</span>
                  <span className="mlp-dw-brd-tag">Submit to customer</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step9")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Submission</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle SUBMISSION details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step9");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step9 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Package the final materials and submit the completed work for customer review.
                </p>
              </div>
            </div>
            {renderStepBadge("step9")}
          </div>

          {expandedSteps.step9 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">TIMESHEET HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step9.hours ?? ""}
                    onChange={(e) => handleStepChange("step9", "hours", e.target.value)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step9.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step9.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 09 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step9 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step9", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step9"] || submittingSteps["step9"]}
                    onClick={() => fileInputRefs.current.step9 && fileInputRefs.current.step9.click()}
                    title={stepsState.step9.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step9"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step9.attachmentName
                            ? stepsState.step9.attachmentName.length > 14
                              ? stepsState.step9.attachmentName.slice(0, 14) + "..."
                              : stepsState.step9.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* SUBMISSION Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    SUBMISSION STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step9.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step9.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step9", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step9", stepsState.step9.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Persistent Attached Document Box for Step 09 */}
              {stepsState.step9.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step9.attachmentName}>
                      {stepsState.step9.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step9")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step9", "SUBMISSION")}
                  disabled={submittingSteps["step9"]}
                >
                  {submittingSteps["step9"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting Submission...</span>
                    </>
                  ) : (
                    "Submit Submission"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step9"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step9?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step9.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step9: { ...prev.step9, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step9.message}
              </Alert>
            </div>
          )}
        </div>

        {/* Step 10: VA */}
        <div className="mlp-dw-step-card mlp-dw-brd-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-brd-header-left">
              <span className="mlp-dw-brd-num">10</span>
              <div className="mlp-dw-brd-title-group">
                <div className="mlp-dw-brd-meta-row">
                  <span className="mlp-dw-brd-doc-code">VA</span>
                  <span className="mlp-dw-brd-tag">Close the loop</span>
                </div>
                <div
                  className="mlp-dw-brd-heading-row"
                  onClick={() => toggleStepExpand("step10")}
                  style={{ cursor: "pointer" }}
                >
                  <h3 className="mlp-dw-brd-heading">Validation & Acceptance</h3>
                  <button
                    type="button"
                    className="mlp-dw-brd-toggle-btn"
                    aria-label="Toggle VA details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpand("step10");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: expandedSteps.step10 ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
                <p className="mlp-dw-step-desc">
                  Record customer feedback, acceptance, and any final follow-up actions.
                </p>
              </div>
            </div>
            {renderStepBadge("step10")}
          </div>

          {expandedSteps.step10 && (
            <>
              <div className="mlp-dw-form-row mlp-dw-brd-form-row">
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">TIMESHEET HOURS</label>
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    value={stepsState.step10.hours ?? ""}
                    onChange={(e) => handleStepChange("step10", "hours", e.target.value)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    START DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={formatCreatedDate(selectedWorkflowTicket?.createddate)}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group">
                  <label className="mlp-dw-field-lbl">
                    END DATE <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step10.endDate || ""}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>
                <div className="mlp-dw-field-group mlp-dw-field-responsible">
                  <label className="mlp-dw-field-lbl">
                    RESPONSIBLE BY <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step10.responsible || defaultConsultant || "NA"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Attachment Field for Step 10 */}
                <div className="mlp-dw-field-group mlp-dw-field-attachment">
                  <label className="mlp-dw-field-lbl">ATTACHMENT</label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current.step10 = el)}
                    style={{ display: "none" }}
                    onChange={(e) => handleStepFileChange("step10", e)}
                  />
                  <button
                    type="button"
                    className="mlp-dw-upload-btn mlp-dw-brd-upload-btn"
                    disabled={uploadingFiles["step10"] || submittingSteps["step10"]}
                    onClick={() => fileInputRefs.current.step10 && fileInputRefs.current.step10.click()}
                    title={stepsState.step10.attachmentName || "Upload Attachment"}
                  >
                    {uploadingFiles["step10"] ? (
                      <>
                        <CircularProgress size={13} color="inherit" thickness={5} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                          {stepsState.step10.attachmentName
                            ? stepsState.step10.attachmentName.length > 14
                              ? stepsState.step10.attachmentName.slice(0, 14) + "..."
                              : stepsState.step10.attachmentName
                            : "Upload file"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* VA Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-step-status">
                  <label className="mlp-dw-field-lbl">
                    VA STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={stepsState.step10.stepStatus || "Pending"}
                    disabled
                    fullWidth
                    sx={muiInputSx}
                  />
                </div>

                {/* Ticket Status Field */}
                <div className="mlp-dw-field-group mlp-dw-field-ticket-status">
                  <label className="mlp-dw-field-lbl">
                    TICKET STATUS <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={stepsState.step10.ticketStatus || ""}
                      onChange={(e) => handleStepChange("step10", "ticketStatus", e.target.value)}
                      displayEmpty
                      sx={muiSelectEnabledSx}
                      MenuProps={menuProps}
                    >
                      <MenuItem value="" disabled sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Select Ticket Status
                      </MenuItem>
                      {renderStepTicketStatusOptions("step10", stepsState.step10.ticketStatus)}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Remarks Textarea for Step 10 */}
              <div className="mlp-td-form-field" style={{ marginTop: "14px", width: "100%" }}>
                <label className="mlp-td-form-label">Remarks (optional)</label>
                <textarea
                  className="mlp-td-textarea"
                  placeholder="Add remarks..."
                  value={stepsState.step10.remarks || ""}
                  onChange={(e) => handleStepChange("step10", "remarks", e.target.value)}
                />
              </div>

              {/* Persistent Attached Document Box for Step 10 */}
              {stepsState.step10.attachmentName && (
                <div className="mlp-dw-attached-file-box">
                  <div className="mlp-dw-attached-file-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="mlp-dw-attached-file-label">Attached Document:</span>
                    <span className="mlp-dw-attached-file-name" title={stepsState.step10.attachmentName}>
                      {stepsState.step10.attachmentName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mlp-dw-attached-file-remove"
                    onClick={() => handleRemoveStepFile("step10")}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="mlp-dw-step-footer mlp-dw-brd-footer">
                <button
                  type="button"
                  className="mlp-dw-brd-record-btn"
                  onClick={() => handleSaveStep("step10", "VA")}
                  disabled={submittingSteps["step10"]}
                >
                  {submittingSteps["step10"] ? (
                    <>
                      <CircularProgress size={14} color="inherit" thickness={5} />
                      <span>Submitting VA...</span>
                    </>
                  ) : (
                    "Submit Acceptance (VA)"
                  )}
                </button>
              </div>
            </>
          )}

          {submittingSteps["step10"] && (
            <div style={{ marginTop: "10px", width: "100%", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}
          {stepAlerts.step10?.open && (
            <div style={{ marginTop: "12px", width: "100%" }}>
              <Alert
                severity={stepAlerts.step10.type}
                onClose={() => setStepAlerts((prev) => ({ ...prev, step10: { ...prev.step10, open: false } }))}
                sx={{ borderRadius: "6px", fontSize: "12.5px", fontWeight: 500 }}
              >
                {stepAlerts.step10.message}
              </Alert>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* ── Bottom AI & SLA Cards Grid (Moved below 10 steps for 100% full width) ── */}
      <div className="mlp-dw-bottom-cards-grid">
        {loadingTickets ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={`bottom-skel-${i}`} className="mlp-dw-side-card">
                <div className="mlp-dw-side-header">
                  <Skeleton variant="text" width={180} height={20} sx={{ borderRadius: "4px" }} />
                  <Skeleton variant="rectangular" width={90} height={18} sx={{ borderRadius: "4px" }} />
                </div>
                <Skeleton variant="text" width="90%" height={16} sx={{ borderRadius: "4px", margin: "8px 0 4px" }} />
                <Skeleton variant="text" width="75%" height={16} sx={{ borderRadius: "4px" }} />
                <Skeleton variant="rectangular" width={160} height={34} sx={{ borderRadius: "4px", marginTop: "12px" }} />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Card 1: Documents attached to ticket */}
            <div className="mlp-dw-side-card">
              <div className="mlp-dw-side-header">
                <h4 className="mlp-dw-side-title">Documents attached to {selectedWorkflowTicket?.ticketNo || ""}</h4>
                <span className="mlp-dw-side-meta">reference & history</span>
              </div>
              <p className="mlp-dw-side-desc">
                Only the acknowledgement email to the customer is attached so far. Accept or edit and save an FS, Technical Design or Test Script below and it is attached to the ticket as a version.
              </p>
            </div>

            {/* Card 2: AI Document Studio */}
            <div className="mlp-dw-side-card">
              <div className="mlp-dw-side-header">
                <h4 className="mlp-dw-side-title">AI Document Studio</h4>
                <span className="mlp-dw-side-meta">drafts · human review</span>
              </div>
              <div className="mlp-dw-doc-tabs">
                {["FS Document", "Technical Design", "Test Scripts"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`mlp-dw-doc-tab ${workflowDocTab === tab ? "active" : ""}`}
                    onClick={() => setWorkflowDocTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <p className="mlp-dw-side-desc">
                Drafted from the ticket thread, the BU document and prior accepted documents on similar tickets.
              </p>
              <button
                type="button"
                className="mlp-dw-primary-btn"
                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={handleFeatureNotImplemented}
              >
                Generate {workflowDocTab} with AI
              </button>
            </div>

            {/* Card 3: AI Configuration Assist */}
            <div className="mlp-dw-side-card">
              <div className="mlp-dw-side-header">
                <h4 className="mlp-dw-side-title">AI Configuration Assist</h4>
                <span className="mlp-dw-side-meta">advisory only</span>
              </div>
              <p className="mlp-dw-side-desc">
                Grounded in the FS, Technical Design and Test Scripts on this ticket plus approved knowledge. Nothing executes — you configure, it guides.
              </p>
              <button
                type="button"
                className="mlp-dw-primary-btn"
                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={handleFeatureNotImplemented}
              >
                Generate configuration plan
              </button>
            </div>

            {/* Card 4: SLA Monitor Agent */}
            <div className="mlp-dw-side-card">
              <div className="mlp-dw-side-header">
                <h4 className="mlp-dw-side-title">SLA Monitor Agent</h4>
                <span className="mlp-dw-side-meta">run every 15 min</span>
              </div>
              <p className="mlp-dw-side-desc">
                Reads the start date, end date and status timestamp on every activity; then notifies the stakeholders when one is due, overdue or on hold. It notifies — it never changes a status.
              </p>

              <div className="mlp-dw-sla-list">
                {[
                  { title: "TICKET ACK", desc: "Completed within the planned end date" },
                  { title: "BRD", desc: "Completed within the planned end date" },
                  { title: "BUD", desc: "Completed within the planned end date" },
                  { title: "FS", desc: "Completed within the planned end date" },
                  { title: "TS", desc: "Completed within the planned end date" },
                  { title: "CONFIG", desc: "Completed within the planned end date" },
                  { title: "TEST INTERNAL", desc: "Completed within the planned end date" },
                  { title: "U. MANUAL", desc: "Completed within the planned end date" },
                  { title: "SUBMISSION", desc: "Completed within the planned end date" },
                  { title: "VA", desc: "Completed within the planned end date" },
                ].map((item) => (
                  <div className="mlp-dw-sla-item" key={item.title}>
                    <div className="mlp-dw-sla-item-left">
                      <span className="mlp-dw-sla-item-title">{item.title}</span>
                      <span className="mlp-dw-sla-item-desc">{item.desc}</span>
                    </div>
                    <span className="mlp-dw-step-badge-ontime">On time</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mlp-dw-primary-btn"
                style={{ alignSelf: "flex-start", marginTop: 4, display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={handleFeatureNotImplemented}
              >
                Run SLA monitor now
              </button>

              <p className="mlp-dw-side-desc" style={{ fontSize: "10px", marginTop: 4 }}>
                Recipients per flagged activity: customer contact, assigned consultant, module lead and the service delivery manager. Every send is written to the notification log with an idempotency key.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Feature Not Implemented Toast Notification */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="info"
          sx={{
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            backgroundColor: "#043329",
            color: "#ffffff",
            "& .MuiAlert-icon": {
              color: "#34d399",
            },
            "& .MuiAlert-action": {
              color: "#ffffff",
            },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>

        {/* Card 5: Rules of the flow */}
        {/* <div className="mlp-dw-side-card">
          <h4 className="mlp-dw-side-title">Rules of the flow</h4>
          <div className="mlp-dw-rules-list">
            <div>— Activity 1 is the acknowledgement: the consultant commits the number of working days and the customer acknowledges it before the plan starts.</div>
            <div>— Every activity carries working days, start date, end date (SLA), responsible consultant and a status — all set by the consultant.</div>
            <div>— Documents are attached to the ticket; providing one is an audited activity, not a status flag.</div>
            <div>— Validation and acceptance is the customer's activity; acceptance closes the ticket and emits the KB candidate and CSAT survey.</div>
          </div>
        </div> */}
    </div>
  );
};

export default React.memo(DeliveryWorkflow);
