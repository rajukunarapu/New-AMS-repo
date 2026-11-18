import Axios from 'axios';

export async function postCustomerBRDApproval(ticketNumber, documentType, customerActionValue) {
  try {
    const response = await Axios.post(
      `${import.meta.env.VITE_API_URL}/Ticket/UpdateTicketCustomerAction`,
      {
        ticketId: ticketNumber,
        documentType: documentType,
        userId : Number(localStorage.getItem('userId')),
        customerAction: customerActionValue
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
      message: response.data?.message || 'Customer Action updated successfully.',
      ...response.data,
    };
  } catch (error) {
    console.error('Error during updating Customer Action:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'An error occurred during update. Please try again.',
    };
  }
}
