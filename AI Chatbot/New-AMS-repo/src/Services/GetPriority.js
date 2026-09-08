import Axios from 'axios';

export async function getPriorityAPI() {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_API_URL}/Ticket/GetPriorities`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + localStorage.getItem('token'),
            }
        })

        return {
            data : response.data
        }

    } catch (error) {
        console.log("Error during fetching Priorities:", error)
        return {
            data : null
        }
    }
}