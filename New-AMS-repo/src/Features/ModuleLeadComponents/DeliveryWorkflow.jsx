import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Alert,
  Skeleton,
  CircularProgress,
  LinearProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { postTicketAcknowledgement } from "../../Services/PostTicketAcknowledgmentAPI";

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
}) => {
  const defaultConsultant =
    selectedWorkflowTicket?.name ||
    (employees && employees.length > 0 ? (employees[0].name || employees[0].employeeName) : "K. Menon");
  const defaultTicketStatus =
    selectedWorkflowTicket?.ticketStatus ||
    (statuses && statuses.length > 0 ? statuses[0].name : "Assigned");

  // Delivery Workflow local states
  const [workflowDocTab, setWorkflowDocTab] = useState("FS Document");
  const [ackCustomerDate, setAckCustomerDate] = useState("");
  const [ackWorkingDays, setAckWorkingDays] = useState(1);
  const [ackWorkingHours, setAckWorkingHours] = useState("");
  const [ackResponsibleBy, setAckResponsibleBy] = useState(defaultConsultant);
  const [ackStatus, setAckStatus] = useState(defaultTicketStatus);
  const [ackAttachment, setAckAttachment] = useState(null);
  const [ackAttachmentName, setAckAttachmentName] = useState("");
  const [ackCompleted, setAckCompleted] = useState(false);
  const ackFileInputRef = useRef(null);
  const prevTicketIdRef = useRef(null);

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
    step2: { days: 2, hours: "", startDate: "09/14/2026", responsible: defaultConsultant, status: "Closed", attachment: null, attachmentName: "" },
    step3: { days: 2, hours: "", startDate: "09/16/2026", responsible: defaultConsultant, status: "Inprocess", attachment: null, attachmentName: "" },
    step4: { days: 3, hours: "", startDate: "09/18/2026", responsible: defaultConsultant, status: "Assigned", attachment: null, attachmentName: "" },
    step5: { days: 3, hours: "", startDate: "09/23/2026", responsible: defaultConsultant, status: "Assigned", attachment: null, attachmentName: "" },
    step6: { days: 4, hours: "", startDate: "09/28/2026", responsible: defaultConsultant, status: "Assigned", attachment: null, attachmentName: "" },
    step7: { days: 5, hours: "", startDate: "10/02/2026", responsible: defaultConsultant, status: "Assigned", attachment: null, attachmentName: "" },
    step8: { days: 2, hours: "", startDate: "10/07/2026", responsible: defaultConsultant, status: "Assigned", attachment: null, attachmentName: "" },
    step9: { days: 1, hours: "", startDate: "10/09/2026", responsible: defaultConsultant, status: "Assigned", attachment: null, attachmentName: "" },
    step10: { days: 3, hours: "", startDate: "10/12/2026", responsible: defaultConsultant, status: "Assigned", attachment: null, attachmentName: "" },
  });

  const fileInputRefs = useRef({});

  const handleStepChange = (stepKey, field, value) => {
    setStepsState((prev) => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        [field]: value,
      },
    }));
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
          },
        }));
        setUploadingFiles((prev) => ({ ...prev, [stepKey]: false }));
        showStepAlert(stepKey, "info", `File attached: ${file.name}`);
      }, 500);
    }
  };

  // Auto-sync responsible consultant and status when selected workflow ticket changes
  useEffect(() => {
    if (selectedWorkflowTicket) {
      const currentTicketId = selectedWorkflowTicket.ticketNo || selectedWorkflowTicket.txnId || selectedWorkflowTicket.id;
      const isNewTicket = prevTicketIdRef.current !== currentTicketId;
      if (!isNewTicket && prevTicketIdRef.current !== null) return;
      prevTicketIdRef.current = currentTicketId;

      const defaultName =
        selectedWorkflowTicket.name ||
        (employees && employees.length > 0 ? (employees[0].name || employees[0].employeeName) : "K. Menon");
      const defaultStatus =
        selectedWorkflowTicket.ticketStatus ||
        (statuses && statuses.length > 0 ? statuses[0].name : "Assigned");

      setAckResponsibleBy(defaultName);
      setAckStatus(defaultStatus);

      setStepsState((prev) => ({
        step2: { ...prev.step2, responsible: defaultName },
        step3: { ...prev.step3, responsible: defaultName },
        step4: { ...prev.step4, responsible: defaultName },
        step5: { ...prev.step5, responsible: defaultName },
        step6: { ...prev.step6, responsible: defaultName },
        step7: { ...prev.step7, responsible: defaultName },
        step8: { ...prev.step8, responsible: defaultName },
        step9: { ...prev.step9, responsible: defaultName },
        step10: { ...prev.step10, responsible: defaultName },
      }));
    }
  }, [selectedWorkflowTicket?.ticketNo, selectedWorkflowTicket?.txnId, selectedWorkflowTicket?.name, selectedWorkflowTicket?.ticketStatus]);

  const handleAckFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFiles((prev) => ({ ...prev, step1: true }));
      setTimeout(() => {
        setAckAttachment(file);
        setAckAttachmentName(file.name);
        setUploadingFiles((prev) => ({ ...prev, step1: false }));
        showStepAlert("step1", "info", `File attached: ${file.name}`);
      }, 500);
    }
  };

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
    if (!dateStr) return "2026-09-02";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "2026-09-02";
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

    const ticketId = selectedWorkflowTicket.ticketNo || selectedWorkflowTicket.txnId || "AAB2608266";
    let customerAckFormatted = "";
    let endSlaFormatted = "";
    let workingDaysVal = 1;
    let hoursVal = "";
    let responsibleVal = "";
    let statusVal = "Assigned";
    let attachmentVal = null;

    if (stepKey === "step1") {
      const missing = [];
      if (!ackCustomerDate || !String(ackCustomerDate).trim()) {
        missing.push("Customer Acknowledged On");
      }
      if (!ackResponsibleBy || !String(ackResponsibleBy).trim()) {
        missing.push("Responsible By");
      }
      if (!ackStatus || !String(ackStatus).trim()) {
        missing.push("Status");
      }
      if (missing.length > 0) {
        setMissingFields(missing);
        showStepAlert(stepKey, "error", `Please provide all required fields: ${missing.join(", ")}.`);
        return;
      }

      const hasAckDays = ackWorkingDays && String(ackWorkingDays).trim() !== "" && Number(ackWorkingDays) > 0;
      const hasAckHours = ackWorkingHours && String(ackWorkingHours).trim() !== "" && Number(ackWorkingHours) > 0;
      if (!hasAckDays && !hasAckHours) {
        showStepAlert(stepKey, "error", "Provide Either Hours or Days.");
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
          `Customer Acknowledged On date cannot be earlier than Acknowledgement Sent On (${getFormattedCreatedDate(selectedWorkflowTicket?.createddate)}). Please select a date on or after the sent date.`
        );
        return;
      }
      setMissingFields([]);

      customerAckFormatted = formatToMMDDYYYY(ackCustomerDate);
      endSlaFormatted = getComputedEndDate(selectedWorkflowTicket?.createddate || new Date(), Number(ackWorkingDays) || 1);
      workingDaysVal = hasAckDays ? Number(ackWorkingDays) : 0;
      hoursVal = hasAckHours ? String(ackWorkingHours) : "";
      responsibleVal = ackResponsibleBy;
      statusVal = ackStatus;
      attachmentVal = ackAttachment || null;
    } else {
      const s = stepsState[stepKey] || {};
      const hasDays = s.days && String(s.days).trim() !== "" && Number(s.days) > 0;
      const hasHours = s.hours && String(s.hours).trim() !== "" && Number(s.hours) > 0;
      if (!hasDays && !hasHours) {
        showStepAlert(stepKey, "error", "Provide either Hours or Days.");
        return;
      }

      workingDaysVal = hasDays ? Number(s.days) : 0;
      hoursVal = hasHours ? String(s.hours) : "";
      responsibleVal = s.responsible || defaultConsultant;
      statusVal = s.status || "Assigned";
      customerAckFormatted = formatToMMDDYYYY(s.startDate || "09/14/2026");
      endSlaFormatted = getComputedEndDate(s.startDate || "09/14/2026", Number(s.days) || 1);
      attachmentVal = s.attachment || null;
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
        hoursVal
      );

      if (resp && resp.success) {
        showStepAlert(stepKey, "success", resp.message || `${docType} saved successfully.`);
        setCompletedSteps((prev) => ({ ...prev, [stepKey]: true }));
        if (stepKey === "step1") setAckCompleted(true);
      } else {
        const isSuccessMsg = resp?.message && (resp.message.toLowerCase().includes("success") || resp.message.toLowerCase().includes("saved"));
        showStepAlert(stepKey, isSuccessMsg ? "success" : "error", resp?.message || `Failed to record ${docType}.`);
        if (isSuccessMsg) {
          setCompletedSteps((prev) => ({ ...prev, [stepKey]: true }));
          if (stepKey === "step1") setAckCompleted(true);
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
      return statuses.map((st, idx) => ({
        id: st.id || idx,
        name: st.name || "",
      })).filter((s) => s.name);
    }
    return [
      { id: "cr", name: "Created" },
      { id: "as", name: "Assigned" },
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

  return (
    <div className="mlp-dw-container">
      <div>
        <h1 className="mlp-page-title">Delivery Workflow</h1>
        <p className="mlp-page-subtitle">
          Ten governed steps from acceptance to closure, each with a planned duration and the time actually logged against it. Consultant steps advance here; customer steps complete in the customer portal; every transition is audited.
        </p>
      </div>

      {/* ── Top Horizontal Ticket Selector (with Show More button) ── */}
      <div className="mlp-dw-tickets-bar">
        <div className="mlp-dw-tickets-left">
          <div className="mlp-dw-ticket-pills">
            {loadingTickets ? (
              <Skeleton variant="text" width={280} height={32} />
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
          </div>

          {!loadingTickets && workflowVisibleCount < filteredTickets.length && (
            <button
              type="button"
              className="mlp-dw-show-more-pill"
              onClick={() => setWorkflowVisibleCount((prev) => prev + 10)}
            >
              + Show more ({filteredTickets.length - workflowVisibleCount} remaining)
            </button>
          )}
        </div>

        <span className="mlp-dw-step-indicator">
          Step {Math.min(workflowTicketIdx + 1, workflowTickets.length || 1)} of {workflowTickets.length || 10}
        </span>
      </div>

      {/* ── 100% Full-Width Governed Steps ── */}
      <div className="mlp-dw-steps-col">
        {/* Header Card for Selected Ticket */}
        <div className="mlp-dw-header-card">
          <span className="mlp-dw-header-title">
            {selectedWorkflowTicket?.ticketNo } — {selectedWorkflowTicket?.description || "NA"}
          </span>
          {selectedWorkflowTicket && (
            <span
              className={`mlp-tc-priority ${
                getPriorityClass ? getPriorityClass(selectedWorkflowTicket.priority) : "NA"
              }`}
            >
              {formatPriorityCode
                ? formatPriorityCode(selectedWorkflowTicket.priority)
                : selectedWorkflowTicket.priority || "NA"}
            </span>
          )}
        </div>

        {/* Columns guide */}
        <div className="mlp-dw-columns-guide">
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
        </div>

        {/* Step 01: TICKET ACK */}
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">01</span>
              <span className="mlp-dw-step-name">TICKET ACK</span>
              <span className="mlp-dw-step-tag">Ticket acknowledgement to the customer</span>
              <span className="mlp-dw-step-tag">consultant</span>
            </div>
            {completedSteps.step1 || ackCompleted ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>

          <p className="mlp-dw-step-desc">
            Consultant acknowledges the ticket and commits the number of working days for delivery. The customer acknowledgement starts the plan below.
          </p>

          {/* Blue-grey Tinted Inner Box */}
          <div className="mlp-dw-ack-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <p className="mlp-dw-ack-box-text">
                Acknowledgement committing {ackWorkingDays || "-"} working days · Waiting on the customer to acknowledge
              </p>
            </div>

            <div className="mlp-dw-ack-fields-grid">
              <div className="mlp-dw-field-group">
                <label className="mlp-dw-field-lbl">
                  ACKNOWLEDGEMENT SENT ON <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                </label>
                <TextField
                  size="small"
                  variant="outlined"
                  value={getFormattedCreatedDate(selectedWorkflowTicket?.createddate)}
                  disabled
                  sx={muiInputSx}
                  title="Start date taken from API createddate (fixed)"
                />
              </div>

              <div className="mlp-dw-field-group">
                <label className="mlp-dw-field-lbl">
                  CUSTOMER ACKNOWLEDGED ON <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
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
                    "& input::-webkit-calendar-picker-indicator": {
                      cursor: "pointer",
                      filter: "var(--calendar-filter, none)",
                      opacity: 1,
                      display: "block",
                    },
                    "& .MuiInputBase-input::-webkit-calendar-picker-indicator": {
                      cursor: "pointer",
                      filter: "var(--calendar-filter, none)",
                      opacity: 1,
                      display: "block",
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

              <div className="mlp-dw-field-group">
                <label className="mlp-dw-field-lbl">ACKNOWLEDGEMENT ATTACHMENT</label>
                <input
                  type="file"
                  ref={ackFileInputRef}
                  style={{ display: "none" }}
                  onChange={handleAckFileChange}
                />
                <button
                  type="button"
                  className="mlp-dw-upload-btn"
                  disabled={uploadingFiles["step1"] || submittingSteps["step1"]}
                  onClick={() => ackFileInputRef.current && ackFileInputRef.current.click()}
                  style={{
                    opacity: (uploadingFiles["step1"] || submittingSteps["step1"]) ? 0.75 : 1,
                    cursor: (uploadingFiles["step1"] || submittingSteps["step1"]) ? "not-allowed" : "pointer",
                  }}
                  title={ackAttachmentName || "Upload Attachment"}
                >
                  {uploadingFiles["step1"] ? (
                    <>
                      <CircularProgress size={13} color="inherit" thickness={5} />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>{ackAttachmentName ? (ackAttachmentName.length > 15 ? ackAttachmentName.slice(0, 15) + "..." : ackAttachmentName) : "Upload Attachment"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="mlp-dw-ack-note">
              {ackAttachmentName
                ? `Attached file: ${ackAttachmentName}`
                : "No acknowledgement evidence attached yet. Attach the customer's reply so the committed dates are auditable."}
            </p>
          </div>

          {/* Form Row for Step 01 */}
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={ackWorkingDays}
                onChange={(e) => setAckWorkingDays(e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 1, max: 90 } }}
              />
            </div>

            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={ackWorkingHours}
                onChange={(e) => setAckWorkingHours(e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>

            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getFormattedCreatedDate(selectedWorkflowTicket?.createddate)}
                disabled
                sx={muiInputSx}
              />
            </div>

            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(selectedWorkflowTicket?.createddate || new Date(), ackWorkingDays)}
                disabled
                sx={muiInputSx}
              />
            </div>

            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth error={missingFields.includes("Responsible By")}>
                <Select
                  value={ackResponsibleBy || ""}
                  onChange={(e) => {
                    setAckResponsibleBy(e.target.value);
                    if (missingFields.includes("Responsible By")) {
                      setMissingFields((prev) => prev.filter((f) => f !== "Responsible By"));
                    }
                  }}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                  displayEmpty
                >
                  <MenuItem value="">
                    <span style={{ color: "#94a3b8" }}>Select Responsible</span>
                  </MenuItem>
                  {renderEmployeeOptions(ackResponsibleBy || defaultConsultant)}
                </Select>
              </FormControl>
            </div>

            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth error={missingFields.includes("Status")}>
                <Select
                  value={ackStatus || "Assigned"}
                  onChange={(e) => {
                    setAckStatus(e.target.value);
                    if (missingFields.includes("Status")) {
                      setMissingFields((prev) => prev.filter((f) => f !== "Status"));
                    }
                  }}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                  displayEmpty
                >
                  <MenuItem value="">
                    <span style={{ color: "#94a3b8" }}>Select Status</span>
                  </MenuItem>
                  {renderStatusOptions(ackStatus || "Assigned")}
                </Select>
              </FormControl>
            </div>
          </div>

          {/* Step 01 Action footer with Record customer acknowledgement button */}
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">
              {ackWorkingDays || 1} working days · Completed within the planned end date · responsible {ackResponsibleBy || "K. Menon"}
            </p>
            <button
              type="button"
              className="mlp-dw-primary-btn"
              onClick={() => handleSaveStep("step1", "Ticket ACK")}
              disabled={submittingSteps["step1"]}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                opacity: submittingSteps["step1"] ? 0.8 : 1,
                cursor: submittingSteps["step1"] ? "not-allowed" : "pointer",
              }}
            >
              {submittingSteps["step1"] ? (
                <>
                  <CircularProgress size={14} color="inherit" thickness={5} />
                  <span>Recording acknowledgement...</span>
                </>
              ) : completedSteps.step1 || ackCompleted ? (
                "✓ Record customer acknowledgement"
              ) : (
                "Record customer acknowledgement"
              )}
            </button>
          </div>

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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">02</span>
              <span className="mlp-dw-step-name">BRD</span>
              <span className="mlp-dw-step-tag">Business Requirement Document</span>
              <span className="mlp-dw-step-tag">consultant</span>
              <span className="mlp-dw-step-tag">BRD</span>
            </div>
            {completedSteps.step2 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Requirement captured with the customer and issued for review</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step2.days}
                onChange={(e) => handleStepChange("step2", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step2.hours ?? ""}
                onChange={(e) => handleStepChange("step2", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step2.startDate} disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step2.startDate, stepsState.step2.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step2.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step2", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step2.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step2.status || "Closed"}
                  onChange={(e) => handleStepChange("step2", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step2.status || "Closed")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step2"] || submittingSteps["step2"]}
                onClick={() => fileInputRefs.current.step2 && fileInputRefs.current.step2.click()}
                style={{
                  opacity: (uploadingFiles["step2"] || submittingSteps["step2"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step2"] || submittingSteps["step2"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step2.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step2"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step2.attachmentName
                        ? stepsState.step2.attachmentName.length > 12
                          ? stepsState.step2.attachmentName.slice(0, 12) + "..."
                          : stepsState.step2.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">
              {stepsState.step2.days} working days · Completed within the planned end date · responsible {stepsState.step2.responsible}
            </p>
            <button
              type="button"
              className="mlp-dw-primary-btn"
              onClick={() => handleSaveStep("step2", "BRD")}
              disabled={submittingSteps["step2"]}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                opacity: submittingSteps["step2"] ? 0.8 : 1,
                cursor: submittingSteps["step2"] ? "not-allowed" : "pointer",
              }}
            >
              {submittingSteps["step2"] ? (
                <>
                  <CircularProgress size={14} color="inherit" thickness={5} />
                  <span>Recording BRD...</span>
                </>
              ) : completedSteps.step2 ? (
                "✓ Record BRD"
              ) : (
                "Record BRD"
              )}
            </button>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">03</span>
              <span className="mlp-dw-step-name">BUD</span>
              <span className="mlp-dw-step-tag">Business Understanding Document</span>
              <span className="mlp-dw-step-tag">consultant</span>
              <span className="mlp-dw-step-tag">BU Document</span>
            </div>
            {completedSteps.step3 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Business Understanding confirmed against the BRD.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step3.days}
                onChange={(e) => handleStepChange("step3", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step3.hours ?? ""}
                onChange={(e) => handleStepChange("step3", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step3.startDate } disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step3.startDate, stepsState.step3.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step3.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step3", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step3.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step3.status || "Inprocess"}
                  onChange={(e) => handleStepChange("step3", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step3.status || "Inprocess")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step3"] || submittingSteps["step3"]}
                onClick={() => fileInputRefs.current.step3 && fileInputRefs.current.step3.click()}
                style={{
                  opacity: (uploadingFiles["step3"] || submittingSteps["step3"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step3"] || submittingSteps["step3"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step3.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step3"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step3.attachmentName
                        ? stepsState.step3.attachmentName.length > 12
                          ? stepsState.step3.attachmentName.slice(0, 12) + "..."
                          : stepsState.step3.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step3.days} working days · responsible by {stepsState.step3.responsible || "-"}</p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="mlp-dw-action-btn"
                disabled={activeActions["step3"]}
                onClick={() => handleTriggerAction("step3", "Business Understanding Document marked as provided.")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {activeActions["step3"] ? (
                  <>
                    <CircularProgress size={12} color="inherit" thickness={5} />
                    <span>Marking provided...</span>
                  </>
                ) : activeActions["step3_done"] ? (
                  "✓ BU Document Provided"
                ) : (
                  "Mark BU Document provided"
                )}
              </button>
              <button
                type="button"
                className="mlp-dw-primary-btn"
                onClick={() => handleSaveStep("step3", "BUD")}
                disabled={submittingSteps["step3"]}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: submittingSteps["step3"] ? 0.8 : 1,
                  cursor: submittingSteps["step3"] ? "not-allowed" : "pointer",
                }}
              >
                {submittingSteps["step3"] ? (
                  <>
                    <CircularProgress size={14} color="inherit" thickness={5} />
                    <span>Recording BUD...</span>
                  </>
                ) : completedSteps.step3 ? (
                  "✓ Record BUD"
                ) : (
                  "Record BUD"
                )}
              </button>
            </div>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">04</span>
              <span className="mlp-dw-step-name">FS</span>
              <span className="mlp-dw-step-tag">Functional Specification</span>
              <span className="mlp-dw-step-tag">consultant</span>
              <span className="mlp-dw-step-tag">Functional Specification</span>
            </div>
            {completedSteps.step4 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Functional specification prepared and attached to the ticket.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step4.days}
                onChange={(e) => handleStepChange("step4", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step4.hours ?? ""}
                onChange={(e) => handleStepChange("step4", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step4.startDate} disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step4.startDate, stepsState.step4.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step4.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step4", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step4.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step4.status || "Assigned"}
                  onChange={(e) => handleStepChange("step4", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step4.status || "Assigned")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step4"] || submittingSteps["step4"]}
                onClick={() => fileInputRefs.current.step4 && fileInputRefs.current.step4.click()}
                style={{
                  opacity: (uploadingFiles["step4"] || submittingSteps["step4"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step4"] || submittingSteps["step4"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step4.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step4"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step4.attachmentName
                        ? stepsState.step4.attachmentName.length > 12
                          ? stepsState.step4.attachmentName.slice(0, 12) + "..."
                          : stepsState.step4.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step4.days} working days · responsible by {stepsState.step4.responsible || "-"}</p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="mlp-dw-action-btn"
                disabled={activeActions["step4"]}
                onClick={() => handleTriggerAction("step4", "Functional Specification draft generated with AI.")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {activeActions["step4"] ? (
                  <>
                    <CircularProgress size={12} color="inherit" thickness={5} />
                    <span>Generating with AI...</span>
                  </>
                ) : activeActions["step4_done"] ? (
                  "✓ FS Generated"
                ) : (
                  "✦ Generate with AI"
                )}
              </button>
              <button
                type="button"
                className="mlp-dw-primary-btn"
                onClick={() => handleSaveStep("step4", "FS")}
                disabled={submittingSteps["step4"]}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: submittingSteps["step4"] ? 0.8 : 1,
                  cursor: submittingSteps["step4"] ? "not-allowed" : "pointer",
                }}
              >
                {submittingSteps["step4"] ? (
                  <>
                    <CircularProgress size={14} color="inherit" thickness={5} />
                    <span>Recording FS...</span>
                  </>
                ) : completedSteps.step4 ? (
                  "✓ Record FS"
                ) : (
                  "Record FS"
                )}
              </button>
            </div>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">05</span>
              <span className="mlp-dw-step-name">TS</span>
              <span className="mlp-dw-step-tag">Technical Specification</span>
              <span className="mlp-dw-step-tag">consultant</span>
              <span className="mlp-dw-step-tag">Technical Design</span>
            </div>
            {completedSteps.step5 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Technical specification prepared and reviewed by the module lead.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step5.days}
                onChange={(e) => handleStepChange("step5", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step5.hours ?? ""}
                onChange={(e) => handleStepChange("step5", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step5.startDate } disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step5.startDate, stepsState.step5.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step5.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step5", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step5.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step5.status || "Assigned"}
                  onChange={(e) => handleStepChange("step5", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step5.status || "Assigned")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step5"] || submittingSteps["step5"]}
                onClick={() => fileInputRefs.current.step5 && fileInputRefs.current.step5.click()}
                style={{
                  opacity: (uploadingFiles["step5"] || submittingSteps["step5"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step5"] || submittingSteps["step5"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step5.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step5"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step5.attachmentName
                        ? stepsState.step5.attachmentName.length > 12
                          ? stepsState.step5.attachmentName.slice(0, 12) + "..."
                          : stepsState.step5.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step5.days} working days · responsible by {stepsState.step5.responsible || "-"}</p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="mlp-dw-action-btn"
                disabled={activeActions["step5"]}
                onClick={() => handleTriggerAction("step5", "Technical Design draft generated with AI.")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {activeActions["step5"] ? (
                  <>
                    <CircularProgress size={12} color="inherit" thickness={5} />
                    <span>Generating with AI...</span>
                  </>
                ) : activeActions["step5_done"] ? (
                  "✓ TS Generated"
                ) : (
                  "✦ Generate with AI"
                )}
              </button>
              <button
                type="button"
                className="mlp-dw-primary-btn"
                onClick={() => handleSaveStep("step5", "TS")}
                disabled={submittingSteps["step5"]}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: submittingSteps["step5"] ? 0.8 : 1,
                  cursor: submittingSteps["step5"] ? "not-allowed" : "pointer",
                }}
              >
                {submittingSteps["step5"] ? (
                  <>
                    <CircularProgress size={14} color="inherit" thickness={5} />
                    <span>Recording TS...</span>
                  </>
                ) : completedSteps.step5 ? (
                  "✓ Record TS"
                ) : (
                  "Record TS"
                )}
              </button>
            </div>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">06</span>
              <span className="mlp-dw-step-name">CONFIG</span>
              <span className="mlp-dw-step-tag">Configuration / development</span>
              <span className="mlp-dw-step-tag">consultant</span>
            </div>
            {completedSteps.step6 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Configuration executed in DEV with AI assistance; unit tested.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step6.days}
                onChange={(e) => handleStepChange("step6", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step6.hours ?? ""}
                onChange={(e) => handleStepChange("step6", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step6.startDate } disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step6.startDate, stepsState.step6.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step6.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step6", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step6.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step6.status || "Assigned"}
                  onChange={(e) => handleStepChange("step6", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step6.status || "Assigned")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step6"] || submittingSteps["step6"]}
                onClick={() => fileInputRefs.current.step6 && fileInputRefs.current.step6.click()}
                style={{
                  opacity: (uploadingFiles["step6"] || submittingSteps["step6"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step6"] || submittingSteps["step6"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step6.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step6"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step6.attachmentName
                        ? stepsState.step6.attachmentName.length > 12
                          ? stepsState.step6.attachmentName.slice(0, 12) + "..."
                          : stepsState.step6.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step6.days} working days · responsible by {stepsState.step6.responsible || "-"}</p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="mlp-dw-action-btn"
                disabled={activeActions["step6"]}
                onClick={() => handleTriggerAction("step6", "AI configuration guidance and unit test suggestions ready.")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {activeActions["step6"] ? (
                  <>
                    <CircularProgress size={12} color="inherit" thickness={5} />
                    <span>Loading AI Guidance...</span>
                  </>
                ) : activeActions["step6_done"] ? (
                  "✓ Guidance Ready"
                ) : (
                  "✦ AI configuration help"
                )}
              </button>
              <button
                type="button"
                className="mlp-dw-primary-btn"
                onClick={() => handleSaveStep("step6", "CONFIG")}
                disabled={submittingSteps["step6"]}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: submittingSteps["step6"] ? 0.8 : 1,
                  cursor: submittingSteps["step6"] ? "not-allowed" : "pointer",
                }}
              >
                {submittingSteps["step6"] ? (
                  <>
                    <CircularProgress size={14} color="inherit" thickness={5} />
                    <span>Recording CONFIG...</span>
                  </>
                ) : completedSteps.step6 ? (
                  "✓ Record CONFIG"
                ) : (
                  "Record CONFIG"
                )}
              </button>
            </div>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">07</span>
              <span className="mlp-dw-step-name">TEST INTERNAL</span>
              <span className="mlp-dw-step-tag">Internal test cycle</span>
              <span className="mlp-dw-step-tag">consultant</span>
              <span className="mlp-dw-step-tag">Test Scripts</span>
            </div>
            {completedSteps.step7 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Internal testing executed against the test scripts before submission.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step7.days}
                onChange={(e) => handleStepChange("step7", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step7.hours ?? ""}
                onChange={(e) => handleStepChange("step7", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step7.startDate } disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step7.startDate || "10/02/2026", stepsState.step7.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step7.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step7", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step7.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step7.status || "Assigned"}
                  onChange={(e) => handleStepChange("step7", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step7.status || "Assigned")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step7"] || submittingSteps["step7"]}
                onClick={() => fileInputRefs.current.step7 && fileInputRefs.current.step7.click()}
                style={{
                  opacity: (uploadingFiles["step7"] || submittingSteps["step7"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step7"] || submittingSteps["step7"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step7.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step7"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step7.attachmentName
                        ? stepsState.step7.attachmentName.length > 12
                          ? stepsState.step7.attachmentName.slice(0, 12) + "..."
                          : stepsState.step7.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step7.days} working days · responsible by {stepsState.step7.responsible || "-"}</p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="mlp-dw-action-btn"
                disabled={activeActions["step7"]}
                onClick={() => handleTriggerAction("step7", "Test Scripts generated with AI.")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {activeActions["step7"] ? (
                  <>
                    <CircularProgress size={12} color="inherit" thickness={5} />
                    <span>Generating with AI...</span>
                  </>
                ) : activeActions["step7_done"] ? (
                  "✓ Test Scripts Ready"
                ) : (
                  "✦ Generate with AI"
                )}
              </button>
              <button
                type="button"
                className="mlp-dw-primary-btn"
                onClick={() => handleSaveStep("step7", "TEST INTERNAL")}
                disabled={submittingSteps["step7"]}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: submittingSteps["step7"] ? 0.8 : 1,
                  cursor: submittingSteps["step7"] ? "not-allowed" : "pointer",
                }}
              >
                {submittingSteps["step7"] ? (
                  <>
                    <CircularProgress size={14} color="inherit" thickness={5} />
                    <span>Recording Test...</span>
                  </>
                ) : completedSteps.step7 ? (
                  "✓ Record Test"
                ) : (
                  "Record Test"
                )}
              </button>
            </div>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">08</span>
              <span className="mlp-dw-step-name">U. MANUAL</span>
              <span className="mlp-dw-step-tag">User manual</span>
              <span className="mlp-dw-step-tag">consultant</span>
              <span className="mlp-dw-step-tag">User manual</span>
            </div>
            {completedSteps.step8 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">User manual prepared for the customer team.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step8.days}
                onChange={(e) => handleStepChange("step8", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step8.hours ?? ""}
                onChange={(e) => handleStepChange("step8", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step8.startDate } disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step8.startDate, stepsState.step8.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step8.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step8", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step8.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step8.status || "Assigned"}
                  onChange={(e) => handleStepChange("step8", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step8.status || "Assigned")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step8"] || submittingSteps["step8"]}
                onClick={() => fileInputRefs.current.step8 && fileInputRefs.current.step8.click()}
                style={{
                  opacity: (uploadingFiles["step8"] || submittingSteps["step8"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step8"] || submittingSteps["step8"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step8.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step8"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step8.attachmentName
                        ? stepsState.step8.attachmentName.length > 12
                          ? stepsState.step8.attachmentName.slice(0, 12) + "..."
                          : stepsState.step8.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step8.days} working days · responsible by {stepsState.step8.responsible || "-"}</p>
            <button
              type="button"
              className="mlp-dw-primary-btn"
              onClick={() => handleSaveStep("step8", "U. MANUAL")}
              disabled={submittingSteps["step8"]}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                opacity: submittingSteps["step8"] ? 0.8 : 1,
                cursor: submittingSteps["step8"] ? "not-allowed" : "pointer",
              }}
            >
              {submittingSteps["step8"] ? (
                <>
                  <CircularProgress size={14} color="inherit" thickness={5} />
                  <span>Recording User Manual...</span>
                </>
              ) : completedSteps.step8 ? (
                "✓ Record User Manual"
              ) : (
                "Record User Manual"
              )}
            </button>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">09</span>
              <span className="mlp-dw-step-name">SUBMISSION</span>
              <span className="mlp-dw-step-tag">Submission to the customer</span>
              <span className="mlp-dw-step-tag">consultant</span>
            </div>
            {completedSteps.step9 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Deliverables and documents submitted to the customer for validation.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step9.days}
                onChange={(e) => handleStepChange("step9", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step9.hours ?? ""}
                onChange={(e) => handleStepChange("step9", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step9.startDate } disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step9.startDate, stepsState.step9.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step9.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step9", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step9.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step9.status || "Assigned"}
                  onChange={(e) => handleStepChange("step9", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step9.status || "Assigned")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step9"] || submittingSteps["step9"]}
                onClick={() => fileInputRefs.current.step9 && fileInputRefs.current.step9.click()}
                style={{
                  opacity: (uploadingFiles["step9"] || submittingSteps["step9"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step9"] || submittingSteps["step9"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step9.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step9"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step9.attachmentName
                        ? stepsState.step9.attachmentName.length > 12
                          ? stepsState.step9.attachmentName.slice(0, 12) + "..."
                          : stepsState.step9.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step9.days} working days · responsible by {stepsState.step9.responsible || "-"}</p>
            <button
              type="button"
              className="mlp-dw-primary-btn"
              onClick={() => handleSaveStep("step9", "SUBMISSION")}
              disabled={submittingSteps["step9"]}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                opacity: submittingSteps["step9"] ? 0.8 : 1,
                cursor: submittingSteps["step9"] ? "not-allowed" : "pointer",
              }}
            >
              {submittingSteps["step9"] ? (
                <>
                  <CircularProgress size={14} color="inherit" thickness={5} />
                  <span>Recording Submission...</span>
                </>
              ) : completedSteps.step9 ? (
                "✓ Record Submission"
              ) : (
                "Record Submission"
              )}
            </button>
          </div>
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
        <div className="mlp-dw-step-card">
          <div className="mlp-dw-step-top">
            <div className="mlp-dw-step-title-row">
              <span className="mlp-dw-step-num">10</span>
              <span className="mlp-dw-step-name">VA</span>
              <span className="mlp-dw-step-tag">Validation and acceptance</span>
              <span className="mlp-dw-step-tag">customer</span>
            </div>
            {completedSteps.step10 ? (
              <span className="mlp-dw-step-badge-completed">✓ Completed</span>
            ) : (
              <span className="mlp-dw-step-badge-ontime">Pending</span>
            )}
          </div>
          <p className="mlp-dw-step-desc">Customer validates in QA and accepts. Acceptance closes the ticket.</p>
          <div className="mlp-dw-form-row">
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING DAYS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step10.days}
                onChange={(e) => handleStepChange("step10", "days", e.target.value)}
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">WORKING HOURS</label>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={stepsState.step10.hours ?? ""}
                onChange={(e) => handleStepChange("step10", "hours", e.target.value)}
                sx={muiInputSx}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                START DATE <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField size="small" variant="outlined" value={stepsState.step10.startDate } disabled sx={muiInputSx} />
            </div>
            <div className="mlp-dw-field-group">
              <label className="mlp-dw-field-lbl">
                END DATE · SLA <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <TextField
                size="small"
                variant="outlined"
                value={getComputedEndDate(stepsState.step10.startDate, stepsState.step10.days)}
                disabled
                sx={muiInputSx}
              />
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-responsible">
              <label className="mlp-dw-field-lbl">
                RESPONSIBLE BY <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step10.responsible || defaultConsultant}
                  onChange={(e) => handleStepChange("step10", "responsible", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderEmployeeOptions(stepsState.step10.responsible || defaultConsultant)}
                </Select>
              </FormControl>
            </div>
            <div className="mlp-dw-field-group mlp-dw-field-status">
              <label className="mlp-dw-field-lbl">
                STATUS <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  value={stepsState.step10.status || "Assigned"}
                  onChange={(e) => handleStepChange("step10", "status", e.target.value)}
                  sx={muiSelectSx}
                  MenuProps={menuProps}
                >
                  {renderStatusOptions(stepsState.step10.status || "Assigned")}
                </Select>
              </FormControl>
            </div>
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
                className="mlp-dw-upload-btn"
                disabled={uploadingFiles["step10"] || submittingSteps["step10"]}
                onClick={() => fileInputRefs.current.step10 && fileInputRefs.current.step10.click()}
                style={{
                  opacity: (uploadingFiles["step10"] || submittingSteps["step10"]) ? 0.75 : 1,
                  cursor: (uploadingFiles["step10"] || submittingSteps["step10"]) ? "not-allowed" : "pointer",
                }}
                title={stepsState.step10.attachmentName || "Upload Attachment"}
              >
                {uploadingFiles["step10"] ? (
                  <>
                    <CircularProgress size={13} color="inherit" thickness={5} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {stepsState.step10.attachmentName
                        ? stepsState.step10.attachmentName.length > 12
                          ? stepsState.step10.attachmentName.slice(0, 12) + "..."
                          : stepsState.step10.attachmentName
                        : "Upload File"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mlp-dw-step-footer">
            <p className="mlp-dw-step-subtext">{stepsState.step10.days} working days · responsible by {stepsState.step10.responsible }</p>
            <button
              type="button"
              className="mlp-dw-primary-btn"
              onClick={() => handleSaveStep("step10", "VA")}
              disabled={submittingSteps["step10"]}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                opacity: submittingSteps["step10"] ? 0.8 : 1,
                cursor: submittingSteps["step10"] ? "not-allowed" : "pointer",
              }}
            >
              {submittingSteps["step10"] ? (
                <>
                  <CircularProgress size={14} color="inherit" thickness={5} />
                  <span>Recording VA...</span>
                </>
              ) : completedSteps.step10 ? (
                "✓ Record Acceptance (VA)"
              ) : (
                "Record Acceptance (VA)"
              )}
            </button>
          </div>
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
      </div>

      {/* ── Bottom AI & SLA Cards Grid (Moved below 10 steps for 100% full width) ── */}
      <div className="mlp-dw-bottom-cards-grid">
        {/* Card 1: Documents attached to ticket */}
        <div className="mlp-dw-side-card">
          <div className="mlp-dw-side-header">
            <h4 className="mlp-dw-side-title">Documents attached to {selectedWorkflowTicket?.ticketNo || "-"}</h4>
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
            disabled={activeActions["docStudio"]}
            onClick={() => handleTriggerAction("docStudio", `${workflowDocTab} generated with AI and attached to drafts.`)}
          >
            {activeActions["docStudio"] ? (
              <>
                <CircularProgress size={12} color="inherit" thickness={5} />
                <span>Generating {workflowDocTab}...</span>
              </>
            ) : (
              `Generate ${workflowDocTab} with AI`
            )}
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
            disabled={activeActions["configPlan"]}
            onClick={() => handleTriggerAction("configPlan", "Configuration plan and recommendations generated.")}
          >
            {activeActions["configPlan"] ? (
              <>
                <CircularProgress size={12} color="inherit" thickness={5} />
                <span>Generating Plan...</span>
              </>
            ) : (
              "Generate configuration plan"
            )}
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
            disabled={activeActions["slaMonitor"]}
            onClick={() => handleTriggerAction("slaMonitor", "SLA monitor run completed. Stakeholders notified.")}
          >
            {activeActions["slaMonitor"] ? (
              <>
                <CircularProgress size={12} color="inherit" thickness={5} />
                <span>Running Monitor...</span>
              </>
            ) : (
              "Run SLA monitor now"
            )}
          </button>

          <p className="mlp-dw-side-desc" style={{ fontSize: "10px", marginTop: 4 }}>
            Recipients per flagged activity: customer contact, assigned consultant, module lead and the service delivery manager. Every send is written to the notification log with an idempotency key.
          </p>
        </div>

        {/* Card 5: Rules of the flow */}
        <div className="mlp-dw-side-card">
          <h4 className="mlp-dw-side-title">Rules of the flow</h4>
          <div className="mlp-dw-rules-list">
            <div>— Activity 1 is the acknowledgement: the consultant commits the number of working days and the customer acknowledges it before the plan starts.</div>
            <div>— Every activity carries working days, start date, end date (SLA), responsible consultant and a status — all set by the consultant.</div>
            <div>— Documents are attached to the ticket; providing one is an audited activity, not a status flag.</div>
            <div>— Validation and acceptance is the customer's activity; acceptance closes the ticket and emits the KB candidate and CSAT survey.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DeliveryWorkflow);
