import React from "react";
import { Navigate } from "react-router";
import DosenAccessDenied from "./DosenAccessDenied";

interface RequireDosenRoleProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RequireDosenRole({ 
  children, 
  allowedRoles 
}: RequireDosenRoleProps) {
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const user = getUser();
  
  if (!user.id) {
    return <Navigate to="/signin" replace />;
  }

  // Cek apakah user memiliki role yang diizinkan
  if (!allowedRoles.includes(user.role)) {
    // Jika user adalah dosen dan mencoba mengakses halaman yang tidak diizinkan
    if (user.role === "dosen") {
      return <DosenAccessDenied />;
    }
    // Jika user bukan dosen dan tidak memiliki akses
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
