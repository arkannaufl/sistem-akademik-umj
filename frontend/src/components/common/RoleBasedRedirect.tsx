import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";

export default function RoleBasedRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Prevent infinite redirects
    if (hasRedirected) {
      return;
    }

    const getUser = () => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}");
      } catch {
        return {};
      }
    };

    const user = getUser();

    if (!user.id) {
      setHasRedirected(true);
      navigate("/signin");
      return;
    }

    // Only redirect if we're on the root path
    if (location.pathname === "/") {
      // Redirect based on role
      if (user.role === "dosen") {
        setHasRedirected(true);
        navigate("/dashboard-dosen");
      } else if (user.role === "super_admin") {
        setHasRedirected(true);
        navigate("/tahun-ajaran");
      } else {
        setHasRedirected(true);
        navigate("/signin");
      }
    }
  }, [navigate, location.pathname, hasRedirected]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Memuat...</p>
      </div>
    </div>
  );
} 