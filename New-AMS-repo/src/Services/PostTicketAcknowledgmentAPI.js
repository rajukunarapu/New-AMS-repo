import Axios from 'axios';

export async function postTicketAcknowledgementAPI(
    ticketId,
    documentType,
    customerAck,
    endSLA,
    workingdays,
    responsibleBy,
    status,
    attachment,
    hours,
    TicketStepStatus = "Pending",
    extraFields = {}
) {
    try {
        const formData = new FormData();
        formData.append("TicketId", ticketId || "");
        formData.append("DocumentType", documentType || "");
        if (customerAck !== undefined && customerAck !== null && customerAck !== "") {
            formData.append("CustomerAcknowledgedOn", customerAck);
        }
        formData.append("EndDateSLA", endSLA || "");
        if (workingdays !== "" && workingdays !== null && workingdays !== undefined) {
            formData.append("WorkingDays", workingdays);
        }
        formData.append("ResponsibleBy", responsibleBy || "");
        if (status !== "" && status !== null && status !== undefined) {
            formData.append("Status", status);
        }
        if (hours !== "" && hours !== null && hours !== undefined) {
            formData.append("Approvedhours", hours);
        }
        formData.append("TicketStepstatus", TicketStepStatus || "Pending");

        // Extra / Step specific fields
        if (extraFields) {
            if (extraFields.remarks !== undefined && extraFields.remarks !== null && !formData.has("Remarks")) {
                formData.append("Remarks", String(extraFields.remarks));
            }
            if (extraFields.Remarks !== undefined && extraFields.Remarks !== null && !formData.has("Remarks")) {
                formData.append("Remarks", String(extraFields.Remarks));
            }
            if (extraFields.ticketStatus !== undefined && extraFields.ticketStatus !== null && !formData.has("TicketStatus")) {
                formData.append("TicketStatus", String(extraFields.ticketStatus));
            }
            if (extraFields.TicketStatus !== undefined && extraFields.TicketStatus !== null && !formData.has("TicketStatus")) {
                formData.append("TicketStatus", String(extraFields.TicketStatus));
            }
            if (extraFields.estimatedTechnicalHours !== undefined && extraFields.estimatedTechnicalHours !== null && !formData.has("EstimatedTechnicalHours")) {
                formData.append("EstimatedTechnicalHours", String(extraFields.estimatedTechnicalHours));
            }
            if (extraFields.estimatedFunctionalHours !== undefined && extraFields.estimatedFunctionalHours !== null && !formData.has("EstimatedFunctionalHours")) {
                formData.append("EstimatedFunctionalHours", String(extraFields.estimatedFunctionalHours));
            }
            if (extraFields.estimatedTotalHours !== undefined && extraFields.estimatedTotalHours !== null && !formData.has("EstimatedTotalHours")) {
                formData.append("EstimatedTotalHours", String(extraFields.estimatedTotalHours));
            }
            if (extraFields.documentStatus !== undefined && extraFields.documentStatus !== null && !formData.has("DocumentStatus")) {
                formData.append("DocumentStatus", String(extraFields.documentStatus));
            }
            if (extraFields.EstimatedTechnicalHours !== undefined && extraFields.EstimatedTechnicalHours !== null && !formData.has("EstimatedTechnicalHours")) {
                formData.append("EstimatedTechnicalHours", String(extraFields.EstimatedTechnicalHours));
            }
            if (extraFields.EstimatedFunctionalHours !== undefined && extraFields.EstimatedFunctionalHours !== null && !formData.has("EstimatedFunctionalHours")) {
                formData.append("EstimatedFunctionalHours", String(extraFields.EstimatedFunctionalHours));
            }
            if (extraFields.EstimatedTotalHours !== undefined && extraFields.EstimatedTotalHours !== null && !formData.has("EstimatedTotalHours")) {
                formData.append("EstimatedTotalHours", String(extraFields.EstimatedTotalHours));
            }
            if (extraFields.DocumentStatus !== undefined && extraFields.DocumentStatus !== null && !formData.has("DocumentStatus")) {
                formData.append("DocumentStatus", String(extraFields.DocumentStatus));
            }
        }

        // Append file if present (attachment should be a File/Blob object from <input type="file" />)
        if (attachment) {
            formData.append("AcknowledgementAttachment", attachment);
        }

        const response = await Axios.post(
            `${import.meta.env.VITE_API_URL}/Ticket/SaveTicketAcknowledgement`,
            formData,
            {
                headers: {
                    // Do NOT manually set 'Content-Type': 'multipart/form-data'. 
                    // Axios will set it automatically along with the required boundary.
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                }
            }
        );

        return {
            success: response.data.success !== undefined ? response.data.success : true,
            message: response.data.message || "Ticket acknowledgement saved successfully.",
            data: response.data
        };

    } catch (error) {
        console.log("Error during ticket acknowledgment:", error);
        return {
            success: false,
            message: error.response?.data?.message || "An error occurred during ticket acknowledgment. Please try again."
        };
    }
}

export const postTicketAcknowledgement = postTicketAcknowledgementAPI;