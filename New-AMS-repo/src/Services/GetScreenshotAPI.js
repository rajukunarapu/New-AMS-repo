import Axios from 'axios';

export async function GetScreenshotAPI(ticketId) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_API_URL}/Ticket/GetTicketScreenshotFile/${ticketId}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + localStorage.getItem('token'),
            }
        })

        return {
            success : response.data?.success ?? true,
            ticketId : response.data?.ticketId || ticketId,
            description : response.data?.description,
            fileName : response.data?.fileName,
            contentType : response.data?.contentType,
            screenshot : response.data?.screenshot,
            message : response.data?.message || (response.data?.screenshot ? null : 'No screen shot found for this ticket')
        }

    } catch (error) {
        console.log("Error during fetching Ticket screenshot:", error)
        return {
            success : false,
            ticketId : ticketId,
            description : null,
            fileName : null,
            contentType : null,
            screenshot : null,
            message : error.response?.data?.message || 'No screen shot found for this ticket'
        }
    }
}