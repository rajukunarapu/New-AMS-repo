import Axios from 'axios';

export async function getDeliveryWorkflowAPI(ticketId) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_API_URL}/Ticket/GetTicketSteps/${ticketId}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + localStorage.getItem('token'),
            }
        });

        return {
            success: response.data?.success !== undefined ? response.data.success : true,
            data: response.data
        };

    } catch (error) {
        console.log("Error during fetching Delivery Workflow:", error);
        return {
            success: false,
            data: null
        };
    }
}

export const getDeliveryWorkflow = getDeliveryWorkflowAPI;