import Axios from "axios";

export async function loginAPI(email, password) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const response = await Axios.post(
      `${apiUrl}/Auth/login`,
      { email: email, password: password },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 12000,
      }
    );

    return {
      success: response.data?.success ?? true,
      message: response.data?.message || "Sign in successful.",
      token: response.data?.token || response.data?.jwt || response.data?.accessToken,
      role: response.data?.data?.roleName || response.data?.roleName || response.data?.data?.role || response.data?.role || null,
      roleName: response.data?.data?.roleName || response.data?.roleName || null,
      data: response.data?.data || response.data || null,
    };
  } catch (error) {
    console.error("Error during login:", error);

    let errorMsg = "Unable to connect to authentication server. Please check your network or try again later.";
    if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      errorMsg = "Invalid work email or password. Please verify your credentials.";
    } else if (error.code === "ECONNABORTED") {
      errorMsg = "Connection timed out while contacting authentication server. Please try again.";
    } else if (error.message && error.message !== "Network Error") {
      errorMsg = error.message;
    }

    return {
      success: false,
      message: errorMsg,
      token: null,
      role: null,
    };
  }
}
