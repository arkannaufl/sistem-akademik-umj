import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faUsers,
  faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";

interface CSR {
  id: number;
  mata_kuliah_kode: string;
  nomor_csr: string;
  nama: string;
  keahlian_required: string[];
  tanggal_mulai?: string;
  tanggal_akhir?: string;
  status: string;
  dosen?: User[];
  semester?: number;
  blok?: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  name: string;
  nid: string;
  nidn: string;
  email: string;
  keahlian: string[];
  role: string;
}

const CSRDetail: React.FC = () => {
  const { csrId } = useParams<{ csrId: string }>();
  const navigate = useNavigate();
  const [csr, setCsr] = useState<CSR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keahlianList, setKeahlianList] = useState<string[]>([]);
  const [newKeahlian, setNewKeahlian] = useState("");
  const [assignedDosen, setAssignedDosen] = useState<Record<string, User[]>>(
    {}
  );
  const [draggedDosen, setDraggedDosen] = useState<User | null>(null);
  const [dragOverKeahlian, setDragOverKeahlian] = useState<string | null>(null);

  // After dosenByKeahlian is set, compute standby dosen from all available dosen
  const [standbyDosen, setStandbyDosen] = useState<User[]>([]);
  const [regularDosen, setRegularDosen] = useState<User[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  // Add state for searchDosen
  const [searchDosen, setSearchDosen] = useState("");

  useEffect(() => {
    fetchCSR();
  }, [csrId]);

  useEffect(() => {
    if (csr) {
      // For now, just set all to empty array
      const map: Record<string, User[]> = {};
      keahlianList.forEach((k) => {
        map[k] = [];
      });
      setAssignedDosen(map);
    }
  }, [csr, keahlianList]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Only keep the useEffect that fetches all dosen and sets regularDosen and standbyDosen as arrays
  useEffect(() => {
    const fetchAllDosen = async () => {
      try {
        const res = await api.get("/users?role=dosen");
        // Parse keahlian, kompetensi, peran_kurikulum if they are string
        const dosenList: User[] = res.data.map((d: any) => ({
          ...d,
          keahlian:
            typeof d.keahlian === "string"
              ? JSON.parse(d.keahlian)
              : d.keahlian,
          kompetensi:
            typeof d.kompetensi === "string"
              ? JSON.parse(d.kompetensi)
              : d.kompetensi,
          peran_kurikulum:
            typeof d.peran_kurikulum === "string"
              ? JSON.parse(d.peran_kurikulum)
              : d.peran_kurikulum,
        }));
        setRegularDosen(
          dosenList.filter(
            (d) =>
              Array.isArray(d.keahlian) &&
              !d.keahlian
                .map((k: string) => k.toLowerCase())
                .includes("standby")
          )
        );
        setStandbyDosen(
          dosenList.filter(
            (d) =>
              Array.isArray(d.keahlian) &&
              d.keahlian.map((k: string) => k.toLowerCase()).includes("standby")
          )
        );
      } catch {
        setRegularDosen([]);
        setStandbyDosen([]);
      }
    };
    fetchAllDosen();
  }, []);

  const fetchCSR = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/csr/${csrId}`);
      setCsr(res.data.data);
      setKeahlianList(res.data.data.keahlian_required || []);
      // Fetch dosen for each keahlian
      const keahlianArr = res.data.data.keahlian_required || [];
      const dosenMap: Record<string, User[]> = {};
      for (const k of keahlianArr) {
        const dosenRes = await api.get(
          `/users?role=dosen&keahlian=${encodeURIComponent(k)}`
        );
        dosenMap[k] = dosenRes.data;
      }
      // setDosenByKeahlian(dosenMap); // This line is removed
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } })
          .response === "object"
      ) {
        setError(
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message || "Gagal memuat data CSR"
        );
      } else {
        setError("Gagal memuat data CSR");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDropDosen = (keahlian: string) => {
    if (!draggedDosen) return;
    setAssignedDosen((prev) => {
      const already = prev[keahlian]?.some((d) => d.id === draggedDosen.id);
      if (already) return prev;
      return { ...prev, [keahlian]: [...(prev[keahlian] || []), draggedDosen] };
    });
    setDraggedDosen(null);
    setDragOverKeahlian(null);
  };

  const handleRemoveAssigned = (keahlian: string, dosenId: number) => {
    setAssignedDosen((prev) => ({
      ...prev,
      [keahlian]: prev[keahlian].filter((d) => d.id !== dosenId),
    }));
  };

  const handleAddKeahlian = async () => {
    if (!newKeahlian.trim()) return;
    const updated = [...keahlianList, newKeahlian.trim()];
    setKeahlianList(updated);
    setAssignedDosen((prev) => ({ ...prev, [newKeahlian.trim()]: [] }));
    setNewKeahlian("");
    // TODO: Save to backend
  };

  const handleRemoveKeahlian = async (k: string) => {
    const updated = keahlianList.filter((x) => x !== k);
    setKeahlianList(updated);
    setAssignedDosen((prev) => {
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
    // TODO: Save to backend
  };

  // TODO: handle edit keahlian, assign dosen per slot, drag-and-drop, save changes

  // Filtered dosen logic (mirroring CSR.tsx)
  const filteredRegularDosen = regularDosen.filter((d) => {
    const q = searchDosen.toLowerCase();
    const matchNama = d.name.toLowerCase().includes(q);
    const matchNid = d.nid.toLowerCase().includes(q);
    const matchKeahlian = d.keahlian.some((k) => k.toLowerCase().includes(q));
    if (searchDosen && !(matchNama || matchNid || matchKeahlian)) return false;
    return true;
  });
  const filteredStandbyDosen = standbyDosen.filter((d) => {
    const q = searchDosen.toLowerCase();
    const matchNama = d.name.toLowerCase().includes(q);
    const matchNid = d.nid.toLowerCase().includes(q);
    const matchKeahlian = d.keahlian.some((k) => k.toLowerCase().includes(q));
    if (searchDosen && !(matchNama || matchNid || matchKeahlian)) return false;
    return true;
  });

  // Calculate dosen assignment counts across all keahlian
  const dosenAssignmentCount: Record<number, number> = {};
  Object.values(assignedDosen).forEach((arr) => {
    arr.forEach((d) => {
      dosenAssignmentCount[d.id] = (dosenAssignmentCount[d.id] || 0) + 1;
    });
  });

  if (loading)
    return (
      <div
        className="if (is_array($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = $matkul->peran_dalam_kurikulum;
} elseif (is_string($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = json_decode($matkul->peran_dalam_kurikulum, true) ?? [];
} else {
    $peranKurikulumList = [];
} mx-auto py-8 px-2 md:px-0"
      >
        {/* Skeleton Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Skeleton Keahlian Table (Left) */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 relative overflow-visible animate-pulse">
            {/* Header & Description */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6 mt-2" />
            {/* Input + Buttons Row */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch mb-6">
              <div className="h-[52px] bg-gray-100 dark:bg-gray-800 rounded-xl flex-1" />
              <div className="h-[52px] w-[130px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-[52px] w-[180px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
            {/* Keahlian List Skeleton */}
            <ul className="space-y-5">
              {Array.from({ length: 2 }).map((_, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded ml-auto" />
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="border-2 border-dashed rounded-lg p-3 min-h-[60px] bg-white dark:bg-gray-900" />
                </li>
              ))}
            </ul>
          </div>
          {/* Skeleton Dosen List (Right) */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-8 animate-pulse">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded mb-6" />
            <div className="space-y-3 max-h-80 overflow-y-auto hide-scroll mb-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-4 min-w-0 w-full flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 min-w-0 mt-2 sm:mt-0 sm:ml-4">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                    <div className="flex flex-wrap gap-2 mt-1">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  if (!csr) return <div className="p-8">CSR not found</div>;

  // --- SUMMARY CARD LOGIC ---
  // 1. Total kategori
  const totalKategori = keahlianList.length;
  // 2. Total dosen masuk kategori (unique across all categories)
  const dosenMasukKategoriSet = new Set<number>();
  Object.values(assignedDosen).forEach((arr) =>
    arr.forEach((d) => dosenMasukKategoriSet.add(d.id))
  );
  const totalDosenMasukKategori = dosenMasukKategoriSet.size;
  // 3. Dosen tersedia (not assigned to any category)
  const assignedIds = Array.from(dosenMasukKategoriSet);
  const dosenTersedia = [...regularDosen, ...standbyDosen].filter(
    (d) => !assignedIds.includes(d.id)
  );
  const totalDosenTersedia = dosenTersedia.length;

  return (
    <div
      className="if (is_array($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = $matkul->peran_dalam_kurikulum;
} elseif (is_string($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = json_decode($matkul->peran_dalam_kurikulum, true) ?? [];
} else {
    $peranKurikulumList = [];
} mx-auto py-8 px-2 md:px-0"
    >
      {/* Back Button at the very top */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-all duration-300 ease-out hover:scale-105 transform mb-6"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Kembali
      </button>

      {/* Main Header and Kode Info */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
          Detail CSR:{" "}
          <span className="text-brand-600 dark:text-brand-400">{csr.nama}</span>
          <span className="text-base font-normal text-gray-500 dark:text-gray-300 ml-2">
            ({csr.nomor_csr})
          </span>
        </h1>
        <div className="text-gray-500 dark:text-gray-300 text-sm">
          Kode MK:{" "}
          <span className="font-semibold text-gray-700 dark:text-white">
            {csr.mata_kuliah_kode}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <FontAwesomeIcon
                icon={faBookOpen}
                className="w-6 h-6 text-blue-500"
              />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalKategori}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Kategori
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <FontAwesomeIcon
                icon={faUsers}
                className="w-6 h-6 text-green-500"
              />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalDosenMasukKategori}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Dosen Masuk Kategori
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <FontAwesomeIcon
                icon={faGraduationCap}
                className="w-6 h-6 text-yellow-500"
              />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalDosenTersedia}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Dosen Tersedia
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Notification ala PBL-detail */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-brand-100 dark:bg-brand-900/20 border text-brand-700 dark:text-brand-200 p-3 rounded-lg mb-6"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-100 dark:bg-red-900/20 border text-red-700 dark:text-red-200 p-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Keahlian Table (Left) */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 relative overflow-visible">
            {/* Section Title and Description */}
            <h2 className="text-xl font-semibold mb-1 text-brand-700 dark:text-brand-300 flex items-center gap-2">
              Keahlian Dibutuhkan
            </h2>
            <p className="text-gray-500 dark:text-gray-300 text-sm mb-6">
              Tambahkan kategori keahlian yang diperlukan untuk penugasan dosen.
            </p>
            {/* Input + Buttons Row */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch mb-6">
              <div className="relative flex-1">
                {/* Removed search icon inside input */}
                <input
                  type="text"
                  value={newKeahlian}
                  onChange={(e) => setNewKeahlian(e.target.value)}
                  placeholder="Tambah keahlian..."
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium placeholder-gray-400 dark:placeholder-gray-500 placeholder:font-medium px-4 py-2 shadow-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-full transition-all duration-150 h-[52px] align-middle text-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={handleAddKeahlian}
                className="flex items-center justify-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-md hover:bg-brand-600 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-400"
                style={{ minWidth: "130px" }}
              >
                Tambah
              </button>
            </div>
            <ul className="space-y-5">
              {keahlianList.map((k) => (
                <li
                  key={k}
                  className="flex flex-col gap-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex-1 font-semibold text-brand-700 dark:text-brand-300 text-base">
                      {k}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-300">
                      {assignedDosen[k]?.length || 0} dosen
                    </span>
                    <button
                      onClick={() => handleRemoveKeahlian(k)}
                      className="text-red-500 dark:text-red-400 text-xs ml-2 hover:underline"
                    >
                      Hapus Kategori
                    </button>
                  </div>
                  {/* Slot for assigned dosen with drop area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 min-h-[60px] flex flex-wrap items-center gap-2 transition-all duration-150 ${
                      dragOverKeahlian === k
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    } hover:border-brand-400`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverKeahlian(k);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragOverKeahlian(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropDosen(k);
                    }}
                  >
                    {assignedDosen[k] && assignedDosen[k].length > 0 ? (
                      assignedDosen[k].map((d) => {
                        // --- Badge style logic ala PBL-detail.tsx ---
                        const isStandby = Array.isArray(d.keahlian)
                          ? d.keahlian.some(
                              (k) => k.toLowerCase() === "standby"
                            )
                          : false;
                        let badgeBg = "bg-green-100 dark:bg-green-900/40";
                        let circleBg = "bg-green-500";
                        let textColor = "text-green-700 dark:text-green-200";
                        let initial = "D";
                        if (d.role === "ketua") {
                          badgeBg = "bg-blue-100 dark:bg-blue-900/40";
                          circleBg = "bg-blue-500";
                          textColor = "text-blue-700 dark:text-blue-200";
                          initial = "K";
                        } else if (d.role === "anggota") {
                          badgeBg = "bg-green-100 dark:bg-green-900/40";
                          circleBg = "bg-green-500";
                          textColor = "text-green-700 dark:text-green-200";
                          initial = "A";
                        } else if (d.role === "dosen_mengajar") {
                          badgeBg = "bg-purple-100 dark:bg-purple-900/40";
                          circleBg = "bg-purple-500";
                          textColor = "text-purple-700 dark:text-purple-200";
                          initial = "M";
                        }
                        if (isStandby) {
                          badgeBg = "bg-yellow-100 dark:bg-yellow-900/40";
                          circleBg = "bg-yellow-400";
                          textColor = "text-yellow-800 dark:text-yellow-200";
                          initial = "S";
                        }
                        return (
                          <div
                            key={d.id}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full ${badgeBg} mb-2 mr-2`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${circleBg}`}
                            >
                              <span className="text-white text-xs font-bold">
                                {initial}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-medium ${textColor}`}
                            >
                              {d.name} ({d.nid})
                              {isStandby && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 text-[10px] font-semibold">
                                  Dosen Standby
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => handleRemoveAssigned(k, d.id)}
                              className="ml-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition text-xs"
                              title="Hapus penugasan"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">
                        Seret dosen ke sini untuk menugaskan
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Dosen List (Right) */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-8">
            <h2 className="text-lg font-semibold mb-4 text-brand-700 dark:text-brand-300">
              Dosen Tersedia (
              {filteredRegularDosen.length + filteredStandbyDosen.length})
            </h2>
            {/* Search input for dosen/keahlian */}
            <input
              type="text"
              value={searchDosen}
              onChange={(e) => setSearchDosen(e.target.value)}
              placeholder="Cari dosen atau keahlian..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-brand-500 focus:border-brand-500 mb-6 bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {/* Dosen Reguler */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dosen Reguler ({filteredRegularDosen.length})
                </h4>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto hide-scroll">
                {filteredRegularDosen.length > 0 ? (
                  filteredRegularDosen.map((dosen) => (
                    <div
                      key={dosen.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all duration-200 cursor-move"
                      draggable
                      onDragStart={() => setDraggedDosen(dosen)}
                      onDragEnd={() => setDraggedDosen(null)}
                    >
                      {/* Header dengan Avatar dan Info Dasar */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {dosen.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 dark:text-white/90 text-sm mb-1">
                            {dosen.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            NID: {dosen.nid}
                          </div>
                        </div>
                      </div>
                      {/* Only Keahlian Section */}
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-orange-500"></div>
                          Keahlian
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dosen.keahlian.map((k, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                k.toLowerCase() === "standby"
                                  ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold"
                                  : "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                              }`}
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <FontAwesomeIcon
                        icon={faUsers}
                        className="w-6 h-6 text-gray-400"
                      />
                    </div>
                    <div className="text-sm">Tidak ada dosen reguler</div>
                  </div>
                )}
              </div>
            </div>
            {/* Dosen Standby */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dosen Standby ({filteredStandbyDosen.length})
                </h4>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto hide-scroll">
                {filteredStandbyDosen.length > 0 ? (
                  filteredStandbyDosen.map((dosen) => (
                    <div
                      key={dosen.id}
                      className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl hover:shadow-md transition-all duration-200 cursor-move ${
                        draggedDosen?.id === dosen.id
                          ? "ring-2 ring-yellow-500 scale-105"
                          : ""
                      }`}
                      draggable
                      onDragStart={() => setDraggedDosen(dosen)}
                      onDragEnd={() => setDraggedDosen(null)}
                    >
                      {/* Header dengan Avatar dan Info Dasar */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center ">
                          <span className="text-white text-sm font-bold">
                            {dosen.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 dark:text-white/90 text-sm mb-1">
                            {dosen.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            NID: {dosen.nid}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs">
                          Standby
                        </span>
                      </div>
                      {/* Tidak ada info lain untuk dosen standby */}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <FontAwesomeIcon
                        icon={faUsers}
                        className="w-6 h-6 text-gray-400"
                      />
                    </div>
                    <div className="text-sm">Tidak ada dosen standby</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSRDetail;
