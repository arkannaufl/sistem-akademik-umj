import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faBookOpen,
  faCog,
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api/axios";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "../icons";

type MataKuliah = {
  kode: string;
  nama: string;
  semester: number;
  periode: string;
  jenis: "Blok" | "Non Blok";
  kurikulum: number;
  tanggalMulai: string;
  tanggalAkhir: string;
  blok: number | null;
  durasiMinggu: number | null;
  tanggal_mulai?: string;
  tanggal_akhir?: string;
  durasi_minggu?: number | null;
  keahlian_required?: string[];
};

type PBL = {
  id?: number;
  mata_kuliah_kode: string;
  modul_ke: string;
  nama_modul: string;
  created_at?: string;
  updated_at?: string;
};

interface Dosen {
  id: number;
  nid: string;
  name: string;
  keahlian: string[] | string;
}

interface AssignedDosen {
  [pblId: number]: Dosen[];
}

// Utility untuk menjalankan promise dalam batch
async function runInBatches<T>(tasks: (() => Promise<T>)[], batchSize: number = 10): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize).map(fn => fn());
    const settled = await Promise.allSettled(batch);
    settled.forEach((res) => {
      if (res.status === 'fulfilled') results.push(res.value);
      // Jika ingin handle error, bisa tambahkan di sini
    });
  }
  return results;
}

// Utility untuk membagi array ke N bagian hampir sama besar
function chunkArray<T>(arr: T[], chunkCount: number): T[][] {
  const result: T[][] = [];
  const chunkSize = Math.floor(arr.length / chunkCount);
  let remainder = arr.length % chunkCount;
  let start = 0;
  for (let i = 0; i < chunkCount; i++) {
    let end = start + chunkSize + (remainder > 0 ? 1 : 0);
    result.push(arr.slice(start, end));
    start = end;
    if (remainder > 0) remainder--;
  }
  return result;
}

export default function PBLGenerate() {
  const { blokId } = useParams();
  const navigate = useNavigate();
  const [pblData, setPblData] = useState<{ [kode: string]: PBL[] }>({});
  const [blokMataKuliah, setBlokMataKuliah] = useState<MataKuliah[]>([]);
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const [assignedDosen, setAssignedDosen] = useState<AssignedDosen>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSemesterJenis, setActiveSemesterJenis] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [unassignedPBLList, setUnassignedPBLList] = useState<{ mk: MataKuliah; pbl: PBL }[]>([]);

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

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch data in parallel
        const [pblRes, dosenRes, activeSemesterRes] = await Promise.all([
          api.get("/pbls/all"),
          api.get("/users?role=dosen"),
          api.get("/tahun-ajaran/active"),
        ]);

        // Process PBL data
        const data = pblRes.data || {};
        const blokListMapped: MataKuliah[] = Array.from(
          Object.values(data) as { mata_kuliah: MataKuliah }[]
        ).map((item) => item.mata_kuliah);
        const pblMap: Record<string, PBL[]> = {};
        Array.from(Object.entries(data) as [string, { pbls: PBL[] }][]).forEach(
          ([kode, item]) => {
            pblMap[kode] = item.pbls || [];
          }
        );

        // Filter by blok if blokId is provided
        let filteredBlokMataKuliah = blokListMapped;
        if (blokId) {
          filteredBlokMataKuliah = blokListMapped.filter(
            (mk: MataKuliah) => String(mk.blok) === String(blokId)
          );
        }

        setBlokMataKuliah(filteredBlokMataKuliah);
        setPblData(pblMap);
        setDosenList(dosenRes.data || []);

        // Set active semester
        const semester = activeSemesterRes.data?.semesters?.[0];
        if (semester && semester.jenis) {
          setActiveSemesterJenis(semester.jenis);
        }

        // Fetch assigned dosen for filtered PBLs
        const allPbls = Object.values(pblMap).flat();
        const pblIds = allPbls.map((pbl) => pbl.id).filter(Boolean);
        if (pblIds.length > 0) {
          const assignedRes = await api.post("/pbls/assigned-dosen-batch", { pbl_ids: pblIds });
          setAssignedDosen(assignedRes.data || {});
        }
      } catch (err) {
        setError("Gagal memuat data PBL/dosen");
        setBlokMataKuliah([]);
        setPblData({});
        setDosenList([]);
        setAssignedDosen({});
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [blokId]);

  // Filter mata kuliah by active semester
  const filteredMataKuliah = activeSemesterJenis
    ? blokMataKuliah.filter(
        (mk: MataKuliah) =>
          mk.periode &&
          mk.periode.trim().toLowerCase() === activeSemesterJenis.trim().toLowerCase()
      )
    : blokMataKuliah;

  // Group by semester
  const groupedBySemester = filteredMataKuliah.reduce(
    (acc: Record<number, MataKuliah[]>, mk: MataKuliah) => {
      if (!acc[mk.semester]) acc[mk.semester] = [];
      acc[mk.semester].push(mk);
      return acc;
    },
    {}
  );

  const sortedSemesters = Object.keys(groupedBySemester)
    .map(Number)
    .sort((a, b) => a - b);

  // Calculate statistics
  const totalPBL = filteredMataKuliah.reduce(
    (acc, mk) => acc + (pblData[mk.kode]?.length || 0),
    0
  );

  const pblStats = (() => {
    let belum = 0, sudah = 0;
    filteredMataKuliah.forEach((mk) => {
      (pblData[mk.kode] || []).forEach((pbl) => {
        const assigned = assignedDosen[pbl.id!] || [];
        if (assigned.length > 0) sudah++;
        else belum++;
      });
    });
    return { belum, sudah };
  })();

  // Filter dosen (exclude standby)
  const dosenWithKeahlian = dosenList.map(d => ({
    ...d,
    keahlianArr: Array.isArray(d.keahlian) ? d.keahlian : (d.keahlian || '').split(',').map((k) => k.trim()),
  }));

  const regularDosenList = dosenWithKeahlian.filter(d => 
    !d.keahlianArr.map(k => k.toLowerCase()).includes('standby')
  );

  const standbyDosenList = dosenWithKeahlian.filter(d => 
    d.keahlianArr.map(k => k.toLowerCase()).includes('standby')
  );

  // Generate dosen assignments per semester
  const handleGenerateDosen = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    // Validasi: pastikan semua mata kuliah sudah diisi keahlian_required
    const mataKuliahTanpaKeahlian: MataKuliah[] = [];
    filteredMataKuliah.forEach((mk) => {
      if (!mk.keahlian_required || mk.keahlian_required.length === 0) {
        mataKuliahTanpaKeahlian.push(mk);
      }
    });
    if (mataKuliahTanpaKeahlian.length > 0) {
      setError(
        `Terdapat ${mataKuliahTanpaKeahlian.length} mata kuliah yang belum diisi keahlian yang diperlukan. Silakan lengkapi keahlian_required pada semua mata kuliah sebelum generate dosen.`
      );
      setIsGenerating(false);
      return;
    }

    try {
      // Group PBLs by semester
      const pblBySemester: { [semester: number]: { mk: MataKuliah; pbl: PBL }[] } = {};
      filteredMataKuliah.forEach(mk => {
        const pblList = pblData[mk.kode] || [];
        pblList.forEach(pbl => {
          if (!pblBySemester[mk.semester]) {
            pblBySemester[mk.semester] = [];
          }
          pblBySemester[mk.semester].push({ mk, pbl });
        });
      });

      const semesterKeys = Object.keys(pblBySemester).map(Number).sort((a, b) => a - b);
      const assignments: { pbl_id: number, dosen_id: number }[] = [];
      const unassignedPBLs: { mk: MataKuliah; pbl: PBL }[] = [];

      semesterKeys.forEach((semester) => {
        const semesterPbls = pblBySemester[semester];
        if (!semesterPbls || semesterPbls.length === 0) return;
        // Ambil dosen regular yang tersedia untuk semester ini
        let semesterDosen = regularDosenList.filter(Boolean);
        // Shuffle agar pembagian lebih acak
        semesterDosen = semesterDosen.sort(() => Math.random() - 0.5);
        // Track dosen yang sudah diassign ke PBL mana saja
        const dosenAssignedToPBL: { [pblId: number]: number[] } = {};
        const dosenUsed: Set<number> = new Set();
        // Loop dosen, assign ke PBL yang match keahlian, lanjut ke PBL berikutnya dst sampai dosen habis
        let dosenIdx = 0;
        let pblIdx = 0;
        let loopCount = 0;
        const maxLoop = semesterDosen.length * semesterPbls.length * 2; // prevent infinite
        while (dosenUsed.size < semesterDosen.length && loopCount < maxLoop) {
          const dosen = semesterDosen[dosenIdx % semesterDosen.length];
          const pblObj = semesterPbls[pblIdx % semesterPbls.length];
          const pbl = pblObj.pbl;
          const mk = pblObj.mk;
          const keahlianArr = Array.isArray(dosen.keahlian) ? dosen.keahlian : (dosen.keahlian || '').split(',').map(k => k.trim());
          const match = (mk.keahlian_required || []).some((k) => keahlianArr.includes(k));
          // Cek apakah dosen sudah diassign ke PBL ini
          if (match) {
            if (!dosenAssignedToPBL[pbl.id!]) dosenAssignedToPBL[pbl.id!] = [];
            if (!dosenAssignedToPBL[pbl.id!].includes(dosen.id)) {
              assignments.push({ pbl_id: pbl.id!, dosen_id: dosen.id });
              dosenAssignedToPBL[pbl.id!].push(dosen.id);
              dosenUsed.add(dosen.id);
            }
          }
          dosenIdx++;
          pblIdx++;
          loopCount++;
        }
        // Cek PBL yang tidak dapat dosen sama sekali
        semesterPbls.forEach(({ mk, pbl }) => {
          const assigned = dosenAssignedToPBL[pbl.id!] || [];
          if (assigned.length === 0) {
            unassignedPBLs.push({ mk, pbl });
          }
        });
      });
      // Kirim batch assign
      if (assignments.length > 0) {
        await api.post('/pbls/assign-dosen-batch', { assignments });
      }
      // Refresh assigned dosen data
      const allPbls = Object.values(pblData).flat();
      const pblIds = allPbls.map((pbl) => pbl.id).filter(Boolean);
      if (pblIds.length > 0) {
        const assignedRes = await api.post("/pbls/assigned-dosen-batch", { pbl_ids: pblIds });
        setAssignedDosen(assignedRes.data || {});
      }
      setSuccess('Generate dosen berhasil! Semua dosen telah dibagi ke PBL secara merata sesuai keahlian.');
      if (unassignedPBLs.length > 0) {
        setWarning(`Ada ${unassignedPBLs.length} PBL yang tidak dapat diisi dosen karena tidak ada dosen dengan keahlian yang cocok.`);
        setUnassignedPBLList(unassignedPBLs);
      } else {
        setWarning(null);
        setUnassignedPBLList([]);
      }
      setTimeout(() => {
        navigate(`/pbl/blok/${blokId}`);
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal generate dosen');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetDosen = async () => {
    setResetLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Reset assignment untuk semua PBL di semester aktif
      const pblIds: number[] = filteredMataKuliah.flatMap((mk) =>
        (pblData[mk.kode] || []).map((pbl) => pbl.id!).filter(Boolean)
      );
      if (pblIds.length > 0) {
        await api.post('/pbls/reset-dosen-batch', { pbl_ids: pblIds });
      }
      // Refresh assigned dosen data
      const allPbls = Object.values(pblData).flat();
      const allPblIds = allPbls.map((pbl) => pbl.id).filter(Boolean);
      if (allPblIds.length > 0) {
        const assignedRes = await api.post("/pbls/assigned-dosen-batch", { pbl_ids: allPblIds });
        setAssignedDosen(assignedRes.data || {});
      }
      setSuccess('Reset assignment dosen berhasil! Semua dosen pada PBL di semester aktif telah direset.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal reset assignment dosen');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        
        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="flex-1">
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (blokId && filteredMataKuliah.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        <svg
          width="64"
          height="64"
          fill="none"
          viewBox="0 0 24 24"
          className="mb-4 text-gray-300 dark:text-gray-600"
        >
          <path
            fill="currentColor"
            d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
          Tidak ada mata kuliah blok {blokId} untuk semester aktif.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/pbl')}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-all duration-300 ease-out hover:scale-105 transform mb-4"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Kembali
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-2">
          Generate Dosen PBL - Blok {blokId}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate penugasan dosen untuk modul PBL berdasarkan keahlian yang diperlukan
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faBookOpen} className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalPBL}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Modul PBL
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faCheckCircle} className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {pblStats.sudah}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Sudah Ditugaskan
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {pblStats.belum}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Belum Ditugaskan
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {regularDosenList.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Dosen Tersedia
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-200 dark:bg-yellow-900/40 flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {standbyDosenList.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Dosen Standby
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-100 border text-green-700 p-3 rounded-lg mb-6"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-100 border text-red-700 p-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-yellow-100 border text-yellow-700 p-3 rounded-lg mb-6"
          >
            <div className="font-semibold mb-2">Warning:</div>
            <div>{warning}</div>
            <ul className="mt-2 list-disc list-inside text-sm">
              {unassignedPBLList.map(({ mk, pbl }) => (
                <li key={pbl.id}>
                  {mk.kode} - Modul {pbl.modul_ke} ({pbl.nama_modul})
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate & Reset Button */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              Generate Dosen
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Klik tombol di bawah untuk menggenerate penugasan dosen secara otomatis
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleGenerateDosen}
              disabled={isGenerating || pblStats.belum === 0}
              className={`px-6 py-3 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition flex items-center gap-2 shadow-theme-xs ${
                isGenerating || pblStats.belum === 0 ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Menggenerate...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                  Generate Dosen
                </>
              )}
            </button>
            <button
              onClick={handleResetDosen}
              disabled={resetLoading}
              className={`px-6 py-3 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-theme-xs ${
                resetLoading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {resetLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Mereset...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                  Reset Dosen
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PBL Modules by Semester (2 kolom) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              Modul PBL per Semester ({filteredMataKuliah.length} mata kuliah)
            </h3>
            {sortedSemesters.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FontAwesomeIcon icon={faBookOpen} className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Belum ada mata kuliah blok
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tidak ada mata kuliah blok untuk semester aktif.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedSemesters.map(semester => {
                  const semesterPBLs = filteredMataKuliah.filter(mk => mk.semester === semester);
                  return (
                    <div key={semester} className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                      {/* Semester Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{semester}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            Semester {semester}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {semesterPBLs.length} mata kuliah blok
                          </p>
                        </div>
                      </div>
                      {/* PBL Cards */}
                      <div className="space-y-4">
                        {semesterPBLs.map((mk) => {
                          const pblList = pblData[mk.kode] || [];
                          return pblList.length === 0 ? null : pblList.map((pbl, pblIdx) => {
                            const assigned = assignedDosen[pbl.id!] || [];
                            const statusBadge = assigned.length > 0
                              ? <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">Sudah Ditugaskan</span>
                              : <span className="text-xs px-3 py-1 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">Belum Ditugaskan</span>;
                            return (
                              <div
                                key={pbl.id}
                                className="p-3 sm:p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 hover:shadow-md transition-all duration-300"
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 dark:text-white/90 text-lg">
                                          {mk.kode} - {mk.nama}
                                        </h4>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                          Modul {pbl.modul_ke} - {pbl.nama_modul}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      {(mk.keahlian_required || []).map((keahlian: string, idx: number) => (
                                        <span key={idx} className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-medium">
                                          {keahlian}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {statusBadge}
                                  </div>
                                </div>
                                {/* Assigned Dosen */}
                                {assigned.length > 0 && (
                                  <div className="mt-4 p-3 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700 rounded-lg">
                                    <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                                      Dosen yang Ditugaskan:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {assigned.map((dosen) => (
                                        <div key={dosen.id} className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/40 rounded-full">
                                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">
                                              {dosen.name.charAt(0)}
                                            </span>
                                          </div>
                                          <span className="text-xs text-green-700 dark:text-green-200 font-medium">
                                            {dosen.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Dosen Section (1 kolom) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            {/* Dosen Information */}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              Dosen Tersedia ({regularDosenList.length + standbyDosenList.length})
            </h3>
            {/* Dosen Reguler */}
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dosen Reguler ({regularDosenList.length})</h4>
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto hide-scroll">
              {regularDosenList.length > 0 ? regularDosenList.map((dosen) => (
                <div key={dosen.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{dosen.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-white/90 text-sm">{dosen.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">NID: {dosen.nid}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dosen.keahlianArr.map((k, idx) => (
                      <span key={idx} className={`text-xs px-2 py-1 rounded-full ${k.toLowerCase() === 'standby' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold' : 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'}`}>{k}</span>
                    ))}
                  </div>
                </div>
              )) : <div className="text-xs text-gray-400">Tidak ada dosen reguler</div>}
            </div>
            {/* Dosen Standby */}
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dosen Standby ({standbyDosenList.length})</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto hide-scroll">
              {standbyDosenList.length > 0 ? standbyDosenList.map((dosen) => (
                <div key={dosen.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{dosen.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-white/90 text-sm">{dosen.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">NID: {dosen.nid}</div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold rounded-full ml-2">Standby</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dosen.keahlianArr.map((k, idx) => (
                      <span key={idx} className={`text-xs px-2 py-1 rounded-full ${k.toLowerCase() === 'standby' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold' : 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'}`}>{k}</span>
                    ))}
                  </div>
                </div>
              )) : <div className="text-xs text-gray-400">Tidak ada dosen standby</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 