import Axios from 'axios';

export async function postTicketAcknowledgementAPI(ticketId, documentType, customerAck, endSLA, workingdays, responsibleBy, status, attachment) {
    try {
        const formData = new FormData();
        formData.append("TicketId", ticketId);
        formData.append("DocumentType", documentType);
        formData.append("CustomerAcknowledgedOn", customerAck);
        formData.append("EndDateSLA", endSLA);
        formData.append("WorkingDays", Number(workingdays) || 1);
        formData.append("ResponsibleBy", responsibleBy);
        formData.append("Status", status);

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