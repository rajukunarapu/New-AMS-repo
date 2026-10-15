import Axios from 'axios';

export async function getCustomerTickets() {
  try {
    const response = await Axios.post(
      `${import.meta.env.VITE_API_URL}/Ticket/GetCustomerTickets`,
      {
        emailid : localStorage.getItem('userEmail')
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }
    );

    return {
      success: response.data?.success ?? true,
      message: response.data?.message || 'Customer Tickets retrieved successfully.',
      totalTickets: response.data?.totalTickets ?? 0,
      tickets: response.data?.tickets || [],
    };
  } catch (error) {
    console.error('Error during retrieving Customer Tickets:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'An error occurred during retrieval. Please try again.',
      totalTickets: 0,
      tickets: [],
    };
  }
}
