import React, { useEffect, useState } from "react";
import NetworkStatusUI from "./NetworkStatusUI";

const NetworkStatusComponent = ({ children }) => {

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Event listeners to detect online/offline status  
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Adding event listeners for online and offline events
    // This will update the isOnline state based on the network status
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) return <NetworkStatusUI />;

  return children;
};

export default NetworkStatusComponent;