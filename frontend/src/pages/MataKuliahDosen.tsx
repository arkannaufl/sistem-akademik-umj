import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faCalendar,
  faClock,
  faUser,
  faEye,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../context/SessionContext";
import { useNavigate } from "react-router";
import api from "../utils/api";

interface MataKuliah {
  id: number;
  kode: string;
  nama: string;
  semester: number;
  periode: string;
  jenis: "Blok" | "Non Blok";
  kurikulum: number;
  tanggal_mulai?: string;
  tanggal_akhir?: string;
  durasi_minggu?: number | null;
  keahlian_required?: string[];
  blok?: number | null;
}

export default function MataKuliahDosen() {
  const navigate = useNavigate();
  const [mataKuliahList, setMataKuliahList] = useState<MataKuliah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJenis, setFilterJenis] = useState<string>("semua");
  const [filterSemester, setFilterSemester] = useState<string>("semua");

  // Check if user is dosen
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id) {
      navigate("/signin");
      return;
    }

    if (user.role !== "dosen") {
      navigate("/");
      return;
    }
  }, [navigate]);

  useEffect(() => {
    fetchMataKuliah();
  }, []);

  const fetchMataKuliah = async () => {
    try {
      setLoading(true);
      const response = await api.get("/mata-kuliah");
      setMataKuliahList(response.data);
    } catch (error: any) {
      setError(error?.response?.data?.message || "Gagal memuat data mata kuliah");
    } finally {
      setLoading(false);
    }
  };

  const filteredMataKuliah = mataKuliahList.filter((mk) => {
    const matchesSearch = mk.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mk.kode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJenis = filterJenis === "semua" || mk.jenis === filterJenis;
    const matchesSemester = filterSemester === "semua" || mk.semester.toString() === filterSemester;
    
    return matchesSearch && matchesJenis && matchesSemester;
  });

  const getJenisBadge = (jenis: string) => {
    if (jenis === "Blok") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          Blok
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
          Non Blok
        </span>
      );
    }
  };

  const getSemesterBadge = (semester: number) => {
    const colors = [
      "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
      "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
      "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
      "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
      "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300",
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300",
    ];
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[semester - 1] || colors[0]}`}>
        Semester {semester}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          
          {/* Filters Skeleton */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
          
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  </div>
                </div>
                
                {/* Card Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5"></div>
                  </div>
                </div>
                
                {/* Card Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Daftar Mata Kuliah
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Lihat informasi mata kuliah yang tersedia
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari mata kuliah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="semua">Semua Jenis</option>
            <option value="Blok">Blok</option>
            <option value="Non Blok">Non Blok</option>
          </select>
          
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="semua">Semua Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
              <option key={semester} value={semester.toString()}>
                Semester {semester}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mata Kuliah Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMataKuliah.map((mk) => (
          <div
            key={mk.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {mk.nama}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {mk.kode}
                  </p>
                </div>
                <div className="flex gap-2">
                  {getJenisBadge(mk.jenis)}
                  {getSemesterBadge(mk.semester)}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />
                  <span>Periode: {mk.periode}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                  <span>Durasi: {mk.durasi_minggu || 0} minggu</span>
                </div>

                {mk.blok && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4" />
                    <span>Blok: {mk.blok}</span>
                  </div>
                )}

                {mk.keahlian_required && mk.keahlian_required.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Keahlian yang Dibutuhkan:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {mk.keahlian_required.map((keahlian, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                        >
                          {keahlian}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    if (mk.jenis === "Blok") {
                      navigate(`/mata-kuliah/blok/${mk.kode}`);
                    } else {
                      navigate(`/mata-kuliah/non-blok-csr/${mk.kode}`);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                  Lihat Detail
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMataKuliah.length === 0 && !loading && (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faBookOpen} className="text-gray-400 text-6xl mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Tidak ada mata kuliah ditemukan
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Coba ubah filter pencarian Anda
          </p>
        </div>
      )}
    </div>
  );
} 
