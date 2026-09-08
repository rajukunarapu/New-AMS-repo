import Axios from 'axios';

export async function getStatusesAPI() {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_API_URL}/Ticket/GetStatuses`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + localStorage.getItem('token'),
            }
        })

        return {
            data : response.data
        }

    } catch (error) {
        console.log("Error during fetching statuses:", error)
        return {
            data : null
        }
    }
}