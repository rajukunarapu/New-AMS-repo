import Axios from 'axios';

export async function postCustomerApprovedHours(ticketNumber, documentType, customerApprovedHours) {
  try {
    const response = await Axios.post(
      `${import.meta.env.VITE_API_URL}/Ticket/CustomerApprovedHours`,
      {
        ticketId: ticketNumber,
        documentType: documentType,
        customerApprovedHours: customerApprovedHours,
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
      message: response.data?.message || 'Customer Approved Hours updated successfully.',
      ...response.data,
    };
  } catch (error) {
    console.error('Error during updating Customer Approved Hours:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'An error occurred during update. Please try again.',
    };
  }
}
