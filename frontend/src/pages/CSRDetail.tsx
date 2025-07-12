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
        const dosenList: User[] = res.data;
        setRegularDosen(
          dosenList.filter(
            (d) => !d.keahlian.map((k) => k.toLowerCase()).includes("standby")
          )
        );
        setStandbyDosen(
          dosenList.filter((d) =>
            d.keahlian.map((k) => k.toLowerCase()).includes("standby")
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

  // Add save handler
  const handleSaveAssignment = async () => {
    // Simulate save to backend
    try {
      // Example: send { csrId, assignedDosen } to backend
      // await api.post(`/csr/${csrId}/assignments`, { assignments: assignedDosen });
      console.log("Saving assignments:", assignedDosen);
      setSuccess("Penugasan dosen berhasil disimpan!");
    } catch {
      setError("Gagal menyimpan penugasan dosen!");
    }
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
      <div className="if (is_array($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = $matkul->peran_dalam_kurikulum;
} elseif (is_string($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = json_decode($matkul->peran_dalam_kurikulum, true) ?? [];
} else {
    $peranKurikulumList = [];
} mx-auto py-8 px-2 md:px-0">
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
    <div className="if (is_array($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = $matkul->peran_dalam_kurikulum;
} elseif (is_string($matkul->peran_dalam_kurikulum)) {
    $peranKurikulumList = json_decode($matkul->peran_dalam_kurikulum, true) ?? [];
} else {
    $peranKurikulumList = [];
} mx-auto py-8 px-2 md:px-0">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Keahlian Table (Left) */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 relative overflow-visible">
          {/* Section Title and Description */}
          <h2 className="text-2xl font-extrabold mb-1 text-brand-700 flex items-center gap-2">
            <FontAwesomeIcon
              icon={faBookOpen}
              className="w-6 h-6 text-brand-500"
            />
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
                placeholder="Tambah ke..."
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium placeholder-gray-400 dark:placeholder-gray-500 placeholder:font-semibold px-6 py-3 shadow-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-full transition-all duration-150 h-[52px] align-middle text-gray-800 dark:text-white"
              />
            </div>
            <button
              onClick={handleAddKeahlian}
              className="flex items-center justify-center gap-2 bg-brand-500 text-white px-6 py-2 rounded-lg font-semibold text-base shadow-md hover:bg-brand-600 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-400"
              style={{ minWidth: "130px" }}
            >
              <FontAwesomeIcon icon="plus" className="w-4 h-4" />
              Tambah
            </button>
            <button
              onClick={handleSaveAssignment}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold text-base shadow-md hover:bg-green-700 hover:scale-105 transition-all duration-150 ml-0 md:ml-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              style={{ minWidth: "180px" }}
            >
              <FontAwesomeIcon icon="check" className="w-4 h-4" />
              Simpan Penugasan
            </button>
          </div>
          <ul className="space-y-5">
            {keahlianList.map((k) => (
              <li
                key={k}
                className="flex flex-col gap-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex-1 font-semibold text-brand-700 text-base">
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
                    assignedDosen[k].map((d) => (
                      <span
                        key={d.id}
                        className="flex items-center bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-200 px-3 py-1 rounded-full text-xs font-medium mr-2 mb-2 shadow-sm hover:bg-brand-200 dark:hover:bg-brand-800 transition"
                      >
                        {d.name} ({d.nid})
                        <button
                          onClick={() => handleRemoveAssigned(k, d.id)}
                          className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))
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
        {/* Dosen List (Right) */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-lg font-semibold mb-4 text-brand-700 dark:text-brand-300">
            Dosen Tersedia
          </h2>
          {/* Search input for dosen/keahlian */}
          <input
            type="text"
            value={searchDosen}
            onChange={(e) => setSearchDosen(e.target.value)}
            placeholder="Cari dosen atau keahlian..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-brand-500 focus:border-brand-500 mb-6 bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <div className="mb-8">
            {filteredRegularDosen.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto hide-scroll mb-6">
                {filteredRegularDosen.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-4 min-w-0 w-full cursor-move hover:shadow-lg hover:border-brand-500 dark:hover:border-brand-400 transition-all duration-200 flex flex-col gap-2 sm:flex-row sm:items-center"
                    draggable
                    onDragStart={() => setDraggedDosen(d)}
                    onDragEnd={() => setDraggedDosen(null)}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-brand-500">
                      <span className="text-white text-xl font-bold">
                        {d.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 mt-2 sm:mt-0 sm:ml-4">
                      <div className="font-bold text-base text-gray-800 dark:text-white truncate flex items-center gap-2">
                        {d.name}
                        {/* Assignment count badge */}
                        <span className="bg-brand-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {dosenAssignmentCount[d.id] || 0}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">
                        NID: {d.nid}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {d.keahlian.map((k, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-200"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 dark:text-gray-500 text-sm">
                Tidak ada dosen tersedia
              </div>
            )}
          </div>
          {/* Standby Dosen Section */}
          {filteredStandbyDosen.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
                Dosen Standby ({filteredStandbyDosen.length})
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto hide-scroll">
                {filteredStandbyDosen.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white dark:bg-gray-900 border border-yellow-300 dark:border-yellow-600 rounded-xl shadow p-4 min-w-0 w-full cursor-move hover:shadow-lg hover:border-yellow-400 dark:hover:border-yellow-300 transition-all duration-200 flex flex-col gap-2 sm:flex-row sm:items-center"
                    draggable
                    onDragStart={() => setDraggedDosen(d)}
                    onDragEnd={() => setDraggedDosen(null)}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-yellow-400">
                      <span className="text-white text-xl font-bold">
                        {d.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 mt-2 sm:mt-0 sm:ml-4">
                      <div className="font-bold text-base text-yellow-800 dark:text-yellow-200 truncate flex items-center gap-2">
                        {d.name}
                        {/* Assignment count badge */}
                        <span className="bg-yellow-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {dosenAssignmentCount[d.id] || 0}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">
                        NID: {d.nid}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {d.keahlian.map((k, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-3 py-1 rounded-full ${
                              k.toLowerCase() === "standby"
                                ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold"
                                : "bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-200"
                            }`}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSRDetail;
