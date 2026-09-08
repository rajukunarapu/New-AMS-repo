import Axios from 'axios';

export async function updateTicketsAPI(ticketNumber, employeeName, priorityName, statusName, note) {
  try {
    const response = await Axios.post(
      `${import.meta.env.VITE_API_URL}/Ticket/UpdateTicketDetails`,
      {
        ticketId: ticketNumber,
        employeeName: employeeName,
        priorityName: priorityName,
        statusName: statusName,
        description: note,
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
      message: response.data?.message || 'Ticket updated successfully.',
      ...response.data,
    };
  } catch (error) {
    console.error('Error during updating Ticket:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'An error occurred during update. Please try again.',
    };
  }
}