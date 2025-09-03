// import React from "react";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faExclamationTriangle, 
  faArrowLeft, 
  faShieldAlt, 
  faGraduationCap,
  faBookOpen,
  faMap,
  faChartBar
} from "@fortawesome/free-solid-svg-icons";

export default function DosenAccessDenied() {
  const navigate = useNavigate();

  const allowedPages = [
    { name: "Dashboard", icon: faGraduationCap, path: "/dashboard" },
    { name: "Mata Kuliah Dosen", icon: faBookOpen, path: "/mata-kuliah-dosen" },
    { name: "Peta Akademik", icon: faMap, path: "/peta-akademik" },
    { name: "Peta Blok", icon: faChartBar, path: "/peta-blok" }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg mb-6">
            <FontAwesomeIcon 
              icon={faShieldAlt} 
              className="text-white text-3xl" 
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Akses Dibatasi
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
            Maaf, halaman ini tidak tersedia untuk akun dosen. 
            Berikut adalah halaman yang dapat Anda akses:
          </p>
        </div>

        {/* Allowed Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {allowedPages.map((page, index) => (
            <div
              key={index}
              onClick={() => navigate(page.path)}
              className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300">
                  <FontAwesomeIcon 
                    icon={page.icon} 
                    className="text-white text-lg" 
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {page.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Klik untuk mengakses
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <FontAwesomeIcon 
                    icon={faArrowLeft} 
                    className="text-blue-500 text-sm transform rotate-180" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            Kembali ke Dashboard
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="flex-1 sm:flex-none bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-4 px-8 rounded-xl border border-gray-300 dark:border-gray-600 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            Halaman Sebelumnya
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-blue-500 w-4 h-4" />
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Jika Anda memerlukan akses ke halaman ini, hubungi administrator
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
