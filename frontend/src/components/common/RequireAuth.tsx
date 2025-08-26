import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import api from "../../utils/api";
import { useSession } from "../../context/SessionContext";

export default function RequireAuth() {
  const token = localStorage.getItem("token");
  const { setSessionExpired } = useSession();

  useEffect(() => {
    // Verify token validity on component mount
    const verifyToken = async () => {
      try {
        await api.get("/me");
      } catch (error) {
        // If token is invalid (e.g., user deleted), clear storage and dispatch event to show modal
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event('sessionExpired'));
      }
    };

    if (token) {
      verifyToken();
    }
    // If there's no token, the return statement below will handle the redirect
    // No need to dispatch sessionExpired here, as it's a direct redirect for unauthenticated users
  }, [token, setSessionExpired]); // Add setSessionExpired to dependency array

  // If no token exists, immediately redirect to login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If token exists, render the protected content
  return <Outlet />;
} 
