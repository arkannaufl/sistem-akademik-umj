import { useState, useEffect, useRef } from "react";
import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faBookOpen,
  faEdit,
  faUsers,
  faTimes,
  faExclamationTriangle,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api/axios";
import { useParams, useNavigate } from "react-router-dom";

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

// Tambahkan tipe untuk kelompok kecil
interface KelompokKecil {
  id: number;
  nama_kelompok: string;
  jumlah_anggota: number;
}

// Tambahkan tipe untuk mahasiswa
interface Mahasiswa {
  nama: string;
  nim: string;
  angkatan: string;
  ipk: number;
}

// Tambahkan tipe untuk dosen
interface Dosen {
  id: number;
  nid: string;
  name: string;
  keahlian: string[] | string;
  keahlianArr?: string[];
  peran_utama?: string;
  peran_kurikulum?: string[] | string;
  matkul_ketua_nama?: string;
  matkul_ketua_semester?: number;
  matkul_anggota_nama?: string;
  matkul_anggota_semester?: number;
  peran_kurikulum_mengajar?: string;
  pbl_assignment_count?: number;
  dosen_peran?: { tipe_peran: string; mata_kuliah_nama?: string; nama_mk?: string; semester: number; blok: number; peran_kurikulum: string }[];
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// Helper untuk mapping semester ke angka
function mapSemesterToNumber(semester: string | number | null): number | null {
  if (semester == null) return null;
  if (typeof semester === "number") return semester;
  if (!isNaN(Number(semester))) return Number(semester);
  if (typeof semester === "string") {
    if (semester.toLowerCase() === "ganjil") return 1;
    if (semester.toLowerCase() === "genap") return 2;
  }
  return null;
}

// Helper untuk parsing keahlian agar selalu array string rapi
function parseKeahlian(val: string[] | string | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) return arr;
    } catch {}
    return val.split(',').map(k => k.trim()).filter(k => k !== '');
  }
  return [];
}

export default function PBL() {
  const { blokId } = useParams();
  const navigate = useNavigate();
  const [pblData, setPblData] = useState<{ [kode: string]: PBL[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [blokMataKuliah, setBlokMataKuliah] = useState<MataKuliah[]>([]);
  const [filterSemester, setFilterSemester] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPBL, setSelectedPBL] = useState<{
    kode: string;
    index?: number;
    pbl?: PBL;
  } | null>(null);
  const [form, setForm] = useState({ modul_ke: "", nama_modul: "" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pblToDelete, setPblToDelete] = useState<{
    kode: string;
    index: number;
    pbl: PBL;
  } | null>(null);
  const [kelompokKecilList, setKelompokKecilList] = useState<KelompokKecil[]>(
    []
  );
  const [blokKelompokBySemester, setBlokKelompokBySemester] = useState<{
    [semester: string]: { [kode: string]: string[] };
  }>({});
  const [showKelompokModal, setShowKelompokModal] = useState<string | null>(
    null
  );
  const [selectedKelompok, setSelectedKelompok] = useState<string[]>([]);
  const [searchKelompok, setSearchKelompok] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showMahasiswaModal, setShowMahasiswaModal] = useState<{
    kelompok: KelompokKecil;
    mahasiswa: Mahasiswa[];
  } | null>(null);
  const [activeSemesterJenis, setActiveSemesterJenis] = useState<string | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [pblTablePage, setPblTablePage] = useState<{ [kode: string]: number }>(
    {}
  );
  // State untuk detail kelompok kecil yang sudah dipilih
  const [kelompokKecilDetailList, setKelompokKecilDetailList] = useState<
    KelompokKecil[]
  >([]);
  // Tambahkan state untuk loading simpan kelompok
  const [isSavingKelompok, setIsSavingKelompok] = useState(false);
  // State untuk mapping kelompok kecil PBL per mata kuliah
  const [pblKelompokMapping] = useState<{
    [kode: string]: string[];
  }>({});
  const [kelompokKecilCache, setKelompokKecilCache] = useState<
    Record<string, KelompokKecil[]>
  >({});
  // Ganti state kelompokKecilList menjadi per semester
  const [kelompokKecilListBySemester, setKelompokKecilListBySemester] =
    useState<{ [semester: string]: KelompokKecil[] }>({});
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const [draggedDosen, setDraggedDosen] = useState<Dosen | null>(null);
  const [draggedFromPBLId, setDraggedFromPBLId] = useState<number | null>(null);
  const [dragOverPBLId, setDragOverPBLId] = useState<number | null>(null);
  const [isMovingDosen, setIsMovingDosen] = useState(false);
  // Tambahkan state untuk assigned dosen per PBL
  const [assignedDosen, setAssignedDosen] = useState<{
    [pblId: number]: Dosen[];
  }>({});

  // Tambahkan state untuk real-time sync dengan reporting
  const [reportingData, setReportingData] = useState<any>(null);
  const [isUpdatingReporting, setIsUpdatingReporting] = useState(false);

  const [searchDosen, setSearchDosen] = useState("");
  // Tambahkan state untuk pagination modal mahasiswa
  const [pageMahasiswaModal, setPageMahasiswaModal] = useState(1);
  // Tambahkan state untuk filter status dan statistik
  const [filterStatus, setFilterStatus] = useState("semua");
  
  // New state for statistics
  const [kelompokKecilCount, setKelompokKecilCount] = useState<number>(0);
  const [totalKelompokKecilAllSemester, setTotalKelompokKecilAllSemester] = useState<number>(0);
  const [keahlianCount, setKeahlianCount] = useState<number>(0);
  const [peranKetuaCount, setPeranKetuaCount] = useState<number>(0);
  const [peranAnggotaCount, setPeranAnggotaCount] = useState<number>(0);
  const [dosenMengajarCount, setDosenMengajarCount] = useState<number>(0);
  
  const fetchAllRef = useRef(fetchAll);

  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  // Helper untuk mendapatkan dosen yang di-assign per semester
  const getDosenBySemester = (semester: number) => {
    const semesterMataKuliah = blokMataKuliahFiltered.filter(
      (mk) => mk.semester === semester
    );
    const semesterPblIds = semesterMataKuliah.flatMap((mk) =>
      (pblData[mk.kode] || []).map((pbl) => pbl.id).filter(Boolean)
    );

    const semesterDosen = new Set<Dosen>();
    semesterPblIds.forEach((pblId) => {
      if (pblId && assignedDosen[pblId]) {
        assignedDosen[pblId].forEach((dosen: Dosen) => {
          // Pastikan keahlianArr selalu ada
          if (!dosen.keahlianArr) {
            dosen.keahlianArr = Array.isArray(dosen.keahlian)
              ? dosen.keahlian
              : (dosen.keahlian || "").split(",").map((k) => k.trim());
          }
          semesterDosen.add(dosen);
        });
      }
    });
    return Array.from(semesterDosen);
  };

  // Helper untuk mendapatkan dosen yang tersedia (tidak di-assign ke semester manapun)
  const assignedDosenIds = Object.values(assignedDosen)
    .flat()
    .map((d) => d.id);
  const dosenWithKeahlian = dosenList.map((d) => ({
    ...d,
    keahlianArr: Array.isArray(d.keahlian)
      ? d.keahlian
      : (d.keahlian || "").split(",").map((k) => k.trim()),
  }));

  // Dosen standby: memiliki keahlian "standby"
  const standbyDosenList = dosenWithKeahlian.filter(
    (d) =>
      d.keahlianArr.some((k) => k.toLowerCase().includes("standby")) &&
      (!searchDosen ||
        d.name.toLowerCase().includes(searchDosen.toLowerCase()) ||
        d.nid.toLowerCase().includes(searchDosen.toLowerCase()) ||
        d.keahlianArr.some((k) =>
          k.toLowerCase().includes(searchDosen.toLowerCase())
        ))
  );
  
  // Dosen regular: tidak memiliki keahlian "standby"
  const availableDosenList = dosenWithKeahlian.filter(
    (d) =>
      !d.keahlianArr.some((k) => k.toLowerCase().includes("standby")) &&
      (!searchDosen ||
        d.name.toLowerCase().includes(searchDosen.toLowerCase()) ||
        d.nid.toLowerCase().includes(searchDosen.toLowerCase()) ||
        d.keahlianArr.some((k) =>
          k.toLowerCase().includes(searchDosen.toLowerCase())
        ))
  );

  // Untuk expand/collapse per grup peran
const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
const [showAllPeran, setShowAllPeran] = useState<{ [key: string]: boolean }>({});
const toggleGroup = (rowKey: string) => {
  setExpandedGroups(prev => ({ ...prev, [rowKey]: !prev[rowKey] }));
};
const toggleShowAll = (rowKey: string) => {
  setShowAllPeran(prev => ({ ...prev, [rowKey]: !prev[rowKey] }));
};

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
    if (warning) {
      const timer = setTimeout(() => {
        setWarning(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      // Fetch PBLs and dosen in parallel
      const [pblRes, dosenRes, kelompokKecilRes] = await Promise.all([
        api.get("/pbls/all"),
        api.get("/users?role=dosen"),
        api.get("/kelompok-kecil"),
      ]);
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
      setBlokMataKuliah(blokListMapped);
      setPblData(pblMap);
      setDosenList(dosenRes.data || []);
      
      // Calculate statistics
      calculateStatistics(blokListMapped, dosenRes.data || [], kelompokKecilRes.data || []);
      
      // Fetch assigned dosen batch (all pblId)
      const allPbls = Object.values(pblMap).flat();
      const pblIds = allPbls.map((pbl) => pbl.id).filter(Boolean);
      if (pblIds.length > 0) {
        const assignedRes = await api.post("/pbls/assigned-dosen-batch", {
          pbl_ids: pblIds,
        });
        setAssignedDosen(assignedRes.data || {});
      } else {
        setAssignedDosen({});
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
  }

  // Function to calculate statistics
  const calculateStatistics = (mataKuliahList: MataKuliah[], dosenList: Dosen[], kelompokKecilList: any[]) => {
    // Filter mata kuliah by active semester
    const filteredMataKuliah = activeSemesterJenis
      ? mataKuliahList.filter(
          (mk: MataKuliah) =>
            mk.periode &&
            mk.periode.trim().toLowerCase() === activeSemesterJenis.trim().toLowerCase()
        )
      : mataKuliahList;

    // Calculate kelompok kecil count (unique nama_kelompok for active semester)
    const kelompokKecilForSemester = kelompokKecilList.filter((kk: any) => 
      kk.semester === activeSemesterJenis
    );
    const uniqueKelompok = new Set(kelompokKecilForSemester.map((kk: any) => kk.nama_kelompok));
    setKelompokKecilCount(uniqueKelompok.size);

    // Calculate keahlian count (unique keahlian_required from mata kuliah)
    const allKeahlian = new Set<string>();
    filteredMataKuliah.forEach((mk: MataKuliah) => {
      if (mk.keahlian_required) {
        mk.keahlian_required.forEach((keahlian: string) => allKeahlian.add(keahlian));
      }
    });
    setKeahlianCount(allKeahlian.size);

    // Calculate dosen counts by peran_utama
    const peranKetua = dosenList.filter((d: Dosen) => d.peran_utama === 'ketua');
    const peranAnggota = dosenList.filter((d: Dosen) => d.peran_utama === 'anggota');
    const dosenMengajar = dosenList.filter((d: Dosen) => d.peran_utama === 'dosen_mengajar');

    setPeranKetuaCount(peranKetua.length);
    setPeranAnggotaCount(peranAnggota.length);
    setDosenMengajarCount(dosenMengajar.length);
  };
  useEffect(() => {
    fetchAll();
  }, []);

  // Recalculate statistics when active semester changes
  useEffect(() => {
    if (blokMataKuliah.length > 0 && dosenList.length > 0) {
      // We need to fetch kelompok kecil data again since it depends on active semester
      api.get("/kelompok-kecil").then(kelompokKecilRes => {
        calculateStatistics(blokMataKuliah, dosenList, kelompokKecilRes.data || []);
      }).catch(() => {
        calculateStatistics(blokMataKuliah, dosenList, []);
      });
    }
  }, [activeSemesterJenis, blokMataKuliah, dosenList]);

  useEffect(() => {
    api.get("/kelompok-kecil").then(res => {
      const allKelompok = res.data || [];
      const uniqueAllKelompok = new Set(
        allKelompok.map((kk: any) => `${kk.semester}__${kk.nama_kelompok}`)
      );
      setTotalKelompokKecilAllSemester(uniqueAllKelompok.size);
    });
  }, []);

  useEffect(() => {
    async function fetchKelompokKecil() {
      try {
        // Fetch kelompok kecil yang tersedia untuk PBL (tidak digunakan oleh mata kuliah lain)
        const kelompokRes = await api.get("/pbl-kelompok-kecil/available");
        setKelompokKecilList(kelompokRes.data || []);
      } catch (error) {
        setKelompokKecilList([]);
      }
    }
    fetchKelompokKecil();
  }, []);

  // Refactor fetchBatchMapping dan fetchBatchKelompokDetail ke fungsi terpisah agar bisa dipanggil ulang
  const fetchBatchMapping = async (semester: number | null) => {
    if (!blokMataKuliah.length || !semester) return;
    const semesterKey = String(semester); // ensure string key
    try {
      const kodeList = blokMataKuliah.map((mk) => mk.kode);
      const res = await api.post("/mata-kuliah/pbl-kelompok-kecil/batch", {
        mata_kuliah_kode: kodeList,
        semester: semesterKey,
      });
      setBlokKelompokBySemester((prev) => ({
        ...prev,
        [semesterKey]: res.data,
      }));
    } catch {
      // do not clear previous state
    }
  };
  const fetchBatchKelompokDetail = async (semester: number | null) => {
    if (!semester) {
      setKelompokKecilDetailList([]);
      return;
    }
    const semesterKey = String(semester);
    const allNamaKelompok = blokKelompokBySemester[semesterKey]
      ? Object.values(blokKelompokBySemester[semesterKey]).flat()
      : [];
    if (!allNamaKelompok.length) {
      setKelompokKecilDetailList([]);
      return;
    }
    try {
      const res = await api.post("/kelompok-kecil/batch-detail", {
        nama_kelompok: allNamaKelompok,
        semester: semesterKey,
      });
      setKelompokKecilDetailList(res.data || []);
    } catch {
      setKelompokKecilDetailList([]);
    }
  };

  // Ganti useEffect lama agar pakai fungsi baru
  useEffect(() => {
    const semesterRaw =
      filterSemester === "semua" ? activeSemesterJenis || null : filterSemester;
    const semester = mapSemesterToNumber(semesterRaw);
    fetchBatchMapping(semester);
  }, [blokMataKuliah, filterSemester, activeSemesterJenis]);
  useEffect(() => {
    const semesterRaw =
      filterSemester === "semua" ? activeSemesterJenis || null : filterSemester;
    const semester = mapSemesterToNumber(semesterRaw);
    fetchBatchKelompokDetail(semester);
  }, [blokKelompokBySemester, filterSemester, activeSemesterJenis]);

  useEffect(() => {
    // Fetch semester aktif
    const fetchActiveSemester = async () => {
      try {
        const res = await api.get("/tahun-ajaran/active");
        const semester = res.data?.semesters?.[0];
        if (semester && semester.jenis) {
          setActiveSemesterJenis(semester.jenis);
        } else {
          setActiveSemesterJenis(null);
        }
      } catch {
        setActiveSemesterJenis(null);
      }
    };
    fetchActiveSemester();
  }, []);

  useEffect(() => {
    // Loop semua semester yang sudah ada batch mapping-nya
    Object.keys(blokKelompokBySemester).forEach((semesterKey) => {
      if (
        blokKelompokBySemester[semesterKey] &&
        Object.keys(blokKelompokBySemester[semesterKey]).length > 0 &&
        !kelompokKecilListBySemester[semesterKey]
      ) {
        // Fetch detail kelompok kecil untuk semester ini jika belum ada
        fetchKelompokKecilWithStatus(semesterKey);
      }
    });
  }, [blokKelompokBySemester]);

  // Fetch kelompok kecil untuk semester tertentu (bukan hanya semester aktif)
  const fetchKelompokKecilWithStatus = async (semester: string | number) => {
    const semesterStr = mapSemesterToNumber(semester);
    if (!semesterStr) return;
    setKelompokKecilListBySemester((prev) => ({ ...prev, [semesterStr]: [] })); // Reset sebelum fetch baru
    if (kelompokKecilCache[semesterStr]) {
      setKelompokKecilListBySemester((prev) => ({
        ...prev,
        [semesterStr]: kelompokKecilCache[semesterStr],
      }));
      return;
    }
    try {
      const res = await api.get(
        `/pbl-kelompok-kecil/list?semester=${semesterStr}`
      );
      setKelompokKecilListBySemester((prev) => ({
        ...prev,
        [semesterStr]: res.data || [],
      }));
      setKelompokKecilCache((prev) => ({
        ...prev,
        [semesterStr]: res.data || [],
      }));
    } catch {
      setKelompokKecilListBySemester((prev) => ({
        ...prev,
        [semesterStr]: [],
      }));
    }
  };

  // Saat klik tombol Pilih Kelompok
  const handleOpenKelompokModal = (blokKode: string) => {
    setShowKelompokModal(blokKode);
    // Cari semester dari blokMataKuliah
    const mk = blokMataKuliah.find((mk) => mk.kode === blokKode);
    const semesterKey = mk ? String(mk.semester) : "";
    setSelectedKelompok(blokKelompokBySemester[semesterKey]?.[blokKode] || []);
    if (mk) {
      fetchKelompokKecilWithStatus(mk.semester);
    }
  };

  // Saat simpan di modal, update database dan state
  const handleSimpanKelompok = async () => {
    if (showKelompokModal) {
      setIsSavingKelompok(true);
      try {
        const mk = blokMataKuliah.find((mk) => mk.kode === showKelompokModal);
        
        // Mapping sudah otomatis dibuat saat kelompok kecil dibuat
        // Tidak perlu manual mapping lagi
        
        setShowKelompokModal(null);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
        
        // Refresh data mapping
        const semesterKey = mk ? String(mk.semester) : "";
        await fetchBatchMapping(mk?.semester || null);
        await fetchBatchKelompokDetail(mk?.semester || null);
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data &&
          typeof error.response.data.message === "string"
        ) {
          alert(error.response.data.message);
        } else {
          alert("Gagal menyimpan mapping kelompok");
        }
      } finally {
        setIsSavingKelompok(false);
      }
    }
  };

  // Saat batal di modal
  const handleBatalKelompok = () => {
    setShowKelompokModal(null);
  };

  const handleLihatMahasiswa = async (kelompok: KelompokKecil) => {
    try {
      // Fetch mahasiswa dari kelompok kecil berdasarkan semester aktif
      const semesterRes = await api.get("/tahun-ajaran/active");
      const semester = semesterRes.data?.semesters?.[0]?.jenis;

      if (!semester) {
        alert("Tidak ada semester aktif");
        return;
      }

      // Fetch mahasiswa dari kelompok kecil
      const mahasiswaRes = await api.get(
        `/kelompok-kecil/${kelompok.id}/mahasiswa`
      );
      const mahasiswa = mahasiswaRes.data || [];

      setShowMahasiswaModal({ kelompok, mahasiswa });
    } catch (error) {
      alert("Gagal memuat data mahasiswa");
    }
  };

  // Filter for single blok if blokId param exists
  let blokMataKuliahFilteredByBlok = blokMataKuliah;
  if (blokId) {
    blokMataKuliahFilteredByBlok = blokMataKuliah.filter(
      (mk: MataKuliah) => String(mk.blok) === String(blokId)
    );
  }

  // Group blokMataKuliah by semester, filter by activeSemesterJenis
  const blokMataKuliahFiltered = activeSemesterJenis
    ? blokMataKuliahFilteredByBlok.filter(
        (mk: MataKuliah) =>
          mk.periode &&
          mk.periode.trim().toLowerCase() ===
            activeSemesterJenis.trim().toLowerCase()
      )
    : blokMataKuliahFilteredByBlok;
  const groupedBySemester = blokMataKuliahFiltered.reduce(
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

  // Semester options
  const semesterOptions = sortedSemesters;

  // Filtered semester list
  const filteredSemesters =
    filterSemester === "semua"
      ? sortedSemesters
      : sortedSemesters.filter(
          (s: number) => String(s) === String(filterSemester)
        );

  // Filtered mata kuliah by search & status
  const filterMataKuliah = (mkList: MataKuliah[]) =>
    mkList.filter((mk: MataKuliah) => {
      const matchSearch =
        mk.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mk.kode.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (filterStatus === "semua") return true;
      // Cek status penugasan seluruh PBL pada mk ini
      const pblList = pblData[mk.kode] || [];
      if (filterStatus === "belum") {
        return pblList.some(
          (pbl) => (assignedDosen[pbl.id!] || []).length === 0
        );
      }
      if (filterStatus === "sudah") {
        return pblList.some((pbl) => (assignedDosen[pbl.id!] || []).length > 0);
      }
      return true;
    });

  // After filtering and grouping, flatten all mkList from all semesters into a single array:
  const allFilteredMataKuliah = filteredSemesters.flatMap((semester: number) =>
    filterMataKuliah(groupedBySemester[semester]).map((mk: MataKuliah) => ({
      ...mk,
      semester,
    }))
  );

  // Calculate statistics for filtered blok only
  const totalPBL = allFilteredMataKuliah.reduce(
    (acc, mk) => acc + (pblData[mk.kode]?.length || 0),
    0
  );
  const pblStats = (() => {
    let belum = 0,
      sudah = 0;
    allFilteredMataKuliah.forEach((mk) => {
      (pblData[mk.kode] || []).forEach((pbl) => {
        const assigned = assignedDosen[pbl.id!] || [];
        if (assigned.length > 0) sudah++;
        else belum++;
      });
    });
    return { belum, sudah };
  })();

  // --- Pagination logic (MUST be before any return) ---
  const totalPages = Math.ceil(allFilteredMataKuliah.length / pageSize);
  const paginatedMataKuliah = allFilteredMataKuliah.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  // Open modal for edit
  const handleOpenEditModal = (kode: string, index: number, pbl: PBL) => {
    setEditMode(true);
    setSelectedPBL({ kode, index, pbl });
    setForm({ modul_ke: pbl.modul_ke, nama_modul: pbl.nama_modul });
    setShowModal(true);
  };

  // Open modal for add
  const handleOpenAddModal = (kode: string | undefined) => {
    if (!kode) return;
    const usedModulKe = pblData[kode]
      ? pblData[kode].map((p) => Number(p.modul_ke)).filter((n) => !isNaN(n))
      : [];
    const nextModulKeVal =
      usedModulKe.length > 0 ? Math.max(...usedModulKe) + 1 : 1;
    setEditMode(false);
    setSelectedPBL({ kode });
    setForm({ modul_ke: String(nextModulKeVal), nama_modul: "" });
    setShowModal(true);
  };

  // Hapus PBL
  const handleDeletePbl = (kode: string, index: number) => {
    const pbl = pblData[kode][index];
    setPblToDelete({ kode, index, pbl });
    setShowDeleteModal(true);
  };

  // Tambahkan fungsi handleEditPbl dan handleAddPbl untuk linter fix
  async function handleEditPbl() {
    if (!selectedPBL?.kode || !selectedPBL.pbl) return;
    setIsSaving(true);
    try {
      await api.put(`/pbls/${selectedPBL.pbl.id}`, {
        mata_kuliah_kode: selectedPBL.kode,
        modul_ke: form.modul_ke,
        nama_modul: form.nama_modul,
      });
      setSuccess("PBL berhasil diperbarui.");
      setShowModal(false);
      // Refresh data
      const pblRes = await api.get("/pbls/all");
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
      setBlokMataKuliah(blokListMapped);
      setPblData(pblMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal memperbarui PBL");
    } finally {
      setIsSaving(false);
    }
  }
  async function handleAddPbl() {
    if (!selectedPBL?.kode) return;
    setIsSaving(true);
    try {
      await api.post(`/mata-kuliah/${selectedPBL.kode}/pbls`, {
        modul_ke: form.modul_ke,
        nama_modul: form.nama_modul,
      });
      setSuccess("PBL berhasil ditambahkan.");
      setShowModal(false);
      // Refresh data
      const pblRes = await api.get("/pbls/all");
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
      setBlokMataKuliah(blokListMapped);
      setPblData(pblMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menambah PBL");
    } finally {
      setIsSaving(false);
    }
  }

  // Function untuk update reporting data secara real-time
  const updateReportingData = async () => {
    if (isUpdatingReporting) return; // Prevent multiple simultaneous updates
    
    setIsUpdatingReporting(true);
    try {
      // Update reporting data untuk PBL
      const reportingRes = await api.get('/reporting/dosen-pbl');
      setReportingData(reportingRes.data?.data || []);
      
      // Optional: Trigger event untuk update di halaman lain
      window.dispatchEvent(new CustomEvent('pbl-assignment-updated', {
        detail: { timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Failed to update reporting data:', error);
    } finally {
      setIsUpdatingReporting(false);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6"
            >
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

        {/* Filter Card Skeleton */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PBL Section Skeleton (2 kolom) */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>

              {/* Semester Card Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                {/* Semester Header Skeleton */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="flex flex-col gap-2">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="flex gap-2 ml-auto">
                    {/* REMOVE these skeleton loaders, or replace with real data if needed */}
                    {/* <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" /> */}
                    {/* <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" /> */}
                  </div>
                </div>

                {/* PBL Cards Skeleton */}
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1">
                              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                            <div className="h-6 w-18 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dosen Section Skeleton (1 kolom) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 animate-pulse" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1 animate-pulse" />
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (blokId && blokMataKuliahFilteredByBlok.length === 0) {
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
          Blok dengan ID {blokId} tidak ditemukan.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/pbl")}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-all duration-300 ease-out hover:scale-105 transform mb-4"
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-2">
          Problem Based Learning (PBL)
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pengelolaan modul PBL dan penugasan dosen berdasarkan keahlian
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                Sistem Penugasan Dosen
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Dosen reguler hanya bisa di-drag & drop antar modul dalam semester yang sama dan sesuai keahlian. <br />
                <span className="font-semibold">Dosen standby</span> dapat di-assign ke modul manapun tanpa batasan keahlian atau semester.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Statistik Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalKelompokKecilAllSemester}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Kelompok (Semua Semester)
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
                {keahlianCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Jumlah Keahlian
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
                {peranKetuaCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Peran Ketua
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
                {peranAnggotaCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Peran Anggota
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {dosenMengajarCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Peran Dosen Mengajar
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filterisasi dalam card ala CSR */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-theme-xs"
          >
            <option value="semua">Semua Semester</option>
            {semesterOptions.map((semester) => (
              <option key={semester} value={semester}>
                Semester {semester}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-theme-xs"
          >
            <option value="semua">Semua Status</option>
            <option value="belum">Belum Ditugaskan</option>
            <option value="sudah">Sudah Ditugaskan</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari modul PBL..."
            className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-theme-xs"
          />
        </div>
      </div>
      {/* Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-brand-100 border text-brand-700 p-3 rounded-lg mb-6"
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
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main Content: Grid 2 kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PBL Section (2 kolom) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              Modul PBL ({allFilteredMataKuliah.length})
            </h3>
            {sortedSemesters.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faBookOpen}
                    className="w-8 h-8 text-gray-400"
                  />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Belum ada mata kuliah blok
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tambahkan mata kuliah blok untuk memulai penugasan dosen.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedSemesters.map((semester) => {
                  const semesterPBLs = allFilteredMataKuliah.filter(
                    (mk: MataKuliah) => mk.semester === semester
                  );
                  // Calculate total modul in this semester (sum all modules, not just mata kuliah)
                  // Each PBL is 5x50 menit, so total = jumlah seluruh modul * 5
                  const totalModul = semesterPBLs.reduce(
                    (acc, mk) => acc + (pblData[mk.kode]?.length || 0),
                    0
                  );
                  const totalSesi = totalModul * 5;
                  return (
                    <div
                      key={semester}
                      className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      {/* Semester Header */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {semester}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-4 mb-1">
                              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                Semester {semester}
                              </h3>
                              <span className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-lg text-base">
                                <FontAwesomeIcon
                                  icon={faClock}
                                  className="w-4 h-4"
                                />
                                {totalSesi}x50 menit
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-auto">
                          </div>
                        </div>
                      </div>
                      {/* PBL Cards Grid */}
                      <div className="grid gap-4">
                        {semesterPBLs.map((mk: MataKuliah) => {
                          const pblList = pblData[mk.kode] || [];
                          return pblList.length === 0
                            ? null
                            : pblList.map((pbl, pblIdx) => {
                                const assigned = assignedDosen[pbl.id!] || [];
                                // Dosen yang cocok berdasarkan keahlian mata kuliah
                                const availableDosen = dosenList.filter((d) => {
                                  const keahlianArr = Array.isArray(d.keahlian)
                                    ? d.keahlian
                                    : (d.keahlian || "").split(",").map((k) => k.trim());
                                  return (mk.keahlian_required || []).some(
                                    (k) => keahlianArr.includes(k)
                                  );
                                });
                                // Status badge ala CSR
                                const statusBadge =
                                  assigned.length > 0 ? (
                                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 ml-auto">
                                      Sudah Ditugaskan
                                    </span>
                                  ) : (
                                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 ml-auto">
                                      Belum Ditugaskan
                                    </span>
                                  );
                                return (
                                  <div
                                    key={pbl.id}
                                    className={`p-3 sm:p-5 rounded-xl border transition-all duration-300 ${
                                      dragOverPBLId === pbl.id
                                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-lg scale-[1.02]"
                                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 hover:shadow-md"
                                    }`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      if (
                                        draggedDosen &&
                                        draggedFromPBLId !== null &&
                                        draggedFromPBLId !== pbl.id
                                      ) {
                                        setDragOverPBLId(pbl.id!);
                                      }
                                    }}
                                    onDragLeave={(e) => {
                                      e.preventDefault();
                                      setDragOverPBLId(null);
                                    }}
                                    onDrop={async (e) => {
                                      e.preventDefault();
                                      setDragOverPBLId(null);
                                      if (
                                        !draggedDosen ||
                                        draggedDosen.id == null
                                      )
                                        return;
                                      // Jika dosen sudah ada di PBL target, tolak
                                      if (
                                        (assignedDosen[pbl.id!] || []).some(
                                          (d) => d.id === draggedDosen.id
                                        )
                                      ) {
                                        setError("Dosen sudah ada di PBL ini.");
                                        return;
                                      }
                                      
                                      // Validasi keahlian berdasarkan mata kuliah - sama seperti PBLGenerate.tsx
                                      const dosenKeahlian = Array.isArray(
                                        draggedDosen.keahlian
                                      )
                                        ? draggedDosen.keahlian
                                        : (draggedDosen.keahlian || "")
                                            .split(",")
                                            .map((k) => k.trim());
                                      const requiredKeahlian = mk.keahlian_required || [];
                                      
                                      // Check if dosen is standby
                                      const isStandby = dosenKeahlian.some(k => k.toLowerCase().includes('standby'));
                                      
                                      // If dosen is standby, skip keahlian validation
                                      if (!isStandby) {
                                        // More flexible keahlian matching - sama seperti PBLGenerate.tsx
                                        const keahlianMatch = requiredKeahlian.some(req => 
                                          dosenKeahlian.some(dosenKeahlian => {
                                            const reqLower = req.toLowerCase();
                                            const dosenKeahlianLower = dosenKeahlian.toLowerCase();
                                            return dosenKeahlianLower.includes(reqLower) || 
                                                   reqLower.includes(dosenKeahlianLower) ||
                                                   reqLower.split(' ').some(word => dosenKeahlianLower.includes(word)) ||
                                                   dosenKeahlianLower.split(' ').some(word => reqLower.includes(word));
                                          })
                                        );

                                        if (!keahlianMatch) {
                                          setError("Keahlian dosen tidak sesuai dengan kebutuhan mata kuliah ini.");
                                          return;
                                        }
                                      }

                                      // Validasi peran_utama - sama seperti PBLGenerate.tsx
                                      let isPerfectMatch = false;
                                      let matchReason = '';

                                      if (draggedDosen.peran_utama === 'ketua') {
                                        if (draggedDosen.matkul_ketua_nama && draggedDosen.matkul_ketua_semester) {
                                          // More flexible matching for ketua
                                          const matkulName = draggedDosen.matkul_ketua_nama.toLowerCase();
                                          const mkName = mk.nama.toLowerCase();
                                          const mkKode = mk.kode.toLowerCase();
                                          
                                          // Check if this dosen is ketua for this specific mata kuliah and semester
                                          if ((matkulName.includes(mkName) || mkName.includes(matkulName) ||
                                               matkulName.includes(mkKode) || mkKode.includes(matkulName) ||
                                               mkName.split(' ').some(word => matkulName.includes(word)) ||
                                               matkulName.split(' ').some(word => mkName.includes(word))) &&
                                              draggedDosen.matkul_ketua_semester === mk.semester) {
                                            isPerfectMatch = true;
                                            matchReason = `Ketua untuk ${mk.nama} Semester ${mk.semester}`;
                                          }
                                        }
                                      } else if (draggedDosen.peran_utama === 'anggota') {
                                        if (draggedDosen.matkul_anggota_nama && draggedDosen.matkul_anggota_semester) {
                                          // More flexible matching for anggota
                                          const matkulName = draggedDosen.matkul_anggota_nama.toLowerCase();
                                          const mkName = mk.nama.toLowerCase();
                                          const mkKode = mk.kode.toLowerCase();
                                          
                                          // Check if this dosen is anggota for this specific mata kuliah and semester
                                          if ((matkulName.includes(mkName) || mkName.includes(matkulName) ||
                                               matkulName.includes(mkKode) || mkKode.includes(matkulName) ||
                                               mkName.split(' ').some(word => matkulName.includes(word)) ||
                                               matkulName.split(' ').some(word => mkName.includes(word))) &&
                                              draggedDosen.matkul_anggota_semester === mk.semester) {
                                            isPerfectMatch = true;
                                            matchReason = `Anggota untuk ${mk.nama} Semester ${mk.semester}`;
                                          }
                                        }
                                      } else if (draggedDosen.peran_utama === 'dosen_mengajar') {
                                        if (draggedDosen.peran_kurikulum_mengajar) {
                                          // More flexible matching for dosen mengajar
                                          const peranKurikulum = draggedDosen.peran_kurikulum_mengajar.toLowerCase();
                                          const mkName = mk.nama.toLowerCase();
                                          const mkKode = mk.kode.toLowerCase();
                                          
                                          // Check if this dosen's peran_kurikulum_mengajar matches the mata kuliah
                                          if (peranKurikulum.includes(mkName) || mkName.includes(peranKurikulum) ||
                                              peranKurikulum.includes(mkKode) || mkKode.includes(peranKurikulum) ||
                                              mkName.split(' ').some(word => peranKurikulum.includes(word)) ||
                                              peranKurikulum.split(' ').some(word => mkName.includes(word))) {
                                            isPerfectMatch = true;
                                            matchReason = `Dosen Mengajar untuk ${mk.nama}`;
                                          }
                                        }
                                      }

                                      // VALIDASI SESI: Cek apakah dosen mengajar sudah mendapat sesi penuh
                                      if (draggedDosen.peran_utama === 'dosen_mengajar') {
                                        // Hitung sesi yang sudah didapat dosen ini di semester aktif
                                        const existingAssignments = Object.entries(assignedDosen).filter(([pblId, dosenList]) => {
                                          // Cari PBL yang ada di semester yang sama
                                          const pblInSemester = Object.values(pblData).flat().find(p => 
                                            p.id === Number(pblId) && 
                                            p.mata_kuliah_kode === mk.kode
                                          );
                                          return pblInSemester && dosenList.some(d => d.id === draggedDosen.id);
                                        });
                                        
                                        const sesiYangSudahDidapat = existingAssignments.length * 5; // Setiap assignment = 5 sesi
                                        
                                        // Jika dosen mengajar sudah mendapat sesi 5x50 menit atau lebih, tolak assignment
                                        if (sesiYangSudahDidapat >= 5) {
                                          setError(`Dosen ${draggedDosen.name} sudah mendapat sesi mengajar ${sesiYangSudahDidapat}×50 menit. Dosen mengajar maksimal hanya boleh mendapat 1 assignment (5×50 menit) untuk distribusi yang adil.`);
                                          return;
                                        }
                                      }

                                      // Jika tidak ada perfect match dan bukan standby, berikan warning tapi tetap izinkan
                                      if (!isPerfectMatch && !isStandby) {
                                        const warningMsg = `Dosen ${draggedDosen.name} tidak memiliki peran yang sesuai untuk ${mk.nama} (${mk.kode}). Keahlian sesuai tetapi peran tidak cocok.`;
                                        setWarning(warningMsg);
                                        // Clear warning after 5 seconds
                                        setTimeout(() => setWarning(null), 5000);
                                      }
                                      setIsMovingDosen(true);
                                      try {
                                        // Jika draggedFromPBLId ada, unassign dulu dari PBL asal
                                        if (draggedFromPBLId) {
                                          await api.delete(
                                            `/pbls/${draggedFromPBLId}/unassign-dosen/${draggedDosen.id}`
                                          );
                                        }
                                        // Assign ke PBL target
                                        await api.post(
                                          `/pbls/${pbl.id}/assign-dosen`,
                                          { dosen_id: draggedDosen.id }
                                        );
                                        // Refresh all data to ensure real-time updates
                                        await fetchAllRef.current();
                                        setSuccess(
                                          isStandby
                                            ? `Dosen ${draggedDosen.name} (Standby) berhasil di-assign ke PBL ini.`
                                            : isPerfectMatch 
                                              ? `Dosen ${draggedDosen.name} berhasil di-assign ke PBL ini. ${matchReason}`
                                              : `Dosen ${draggedDosen.name} berhasil di-assign ke PBL ini (keahlian sesuai, peran tidak cocok).`
                                        );
                                        // Update reporting data secara real-time
                                        await updateReportingData();
                                      } catch (err) {
                                        setError("Gagal assign dosen");
                                        // If assignment fails, refresh data to revert UI changes
                                        await fetchAllRef.current();
                                      } finally {
                                        setIsMovingDosen(false);
                                        setDraggedDosen(null);
                                        setDraggedFromPBLId(null);
                                      }
                                    }}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                          <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800 dark:text-white/90 text-lg">
                                              {mk.kode} - {mk.nama}
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                              Modul {pbl.modul_ke} -{" "}
                                              {pbl.nama_modul}
                                              <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-semibold ml-2">
                                                <FontAwesomeIcon
                                                  icon={faClock}
                                                  className="w-3 h-3"
                                                />
                                                5x50 menit
                                              </span>
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                          {(mk.keahlian_required || []).map(
                                            (keahlian: string, idx: number) => (
                                              <span
                                                key={idx}
                                                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-medium"
                                              >
                                                {keahlian}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                      {/* Status badge ala CSR */}
                                      <div className="flex flex-row items-center gap-2 sm:ml-4">
                                        {statusBadge}
                                        <button
                                          onClick={() =>
                                            handleOpenEditModal(
                                              mk.kode,
                                              pblIdx,
                                              pbl
                                            )
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 bg-transparent rounded-lg transition"
                                          title="Edit PBL"
                                        >
                                          <FontAwesomeIcon
                                            icon={faEdit}
                                            className="w-4 h-4"
                                          />
                                          <span className="hidden sm:inline">
                                            Edit
                                          </span>
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeletePbl(mk.kode, pblIdx)
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 bg-transparent rounded-lg transition"
                                          title="Hapus PBL"
                                        >
                                          <FontAwesomeIcon
                                            icon={faTrash}
                                            className="w-4 h-4"
                                          />
                                          <span className="hidden sm:inline">
                                            Hapus
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                    {/* Assigned Dosen Section - NEW STYLE */}
                                    {assigned.length > 0 ? (
                                      <div className="mt-4 p-3 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700 rounded-lg">
                                        <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                                          Dosen yang Ditugaskan:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {assigned.map((dosen) => {
                                            const isStandby = Array.isArray(dosen.keahlian)
                                              ? dosen.keahlian.some((k) => k.toLowerCase().includes("standby"))
                                              : (dosen.keahlian || "").toLowerCase().includes("standby");
                                            return (
                                              <div
                                                key={dosen.id}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                                                  isStandby
                                                    ? "bg-yellow-100 dark:bg-yellow-900/40"
                                                    : "bg-green-100 dark:bg-green-900/40"
                                                }`}
                                              >
                                                <div
                                                  className={`w-6 h-6 rounded-full flex items-center justify-center relative ${
                                                    isStandby ? "bg-yellow-400" : "bg-green-500"
                                                  }`}
                                                >
                                                  <span className="text-white text-xs font-bold">
                                                    {dosen.name.charAt(0)}
                                                  </span>
                                                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-semibold rounded-full flex justify-center items-center w-4 h-4 border border-white dark:border-green-800" title="Jumlah penugasan">
                                                    {typeof dosen.pbl_assignment_count === 'number' ? dosen.pbl_assignment_count : 0}x
                                                  </span>
                                                </div>
                                                <span
                                                  className={`text-xs font-medium ${
                                                    isStandby
                                                      ? "text-yellow-800 dark:text-yellow-200"
                                                      : "text-green-700 dark:text-green-200"
                                                  }`}
                                                >
                                                  {dosen.name}
                                                </span>
                                                <button
                                                  className="ml-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition text-xs"
                                                  title="Hapus penugasan"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                      await api.delete(`/pbls/${pbl.id}/unassign-dosen/${dosen.id}`);
                                                      // Refresh all data to ensure real-time updates
                                                      await fetchAllRef.current();
                                                      setSuccess(`Dosen ${dosen.name} berhasil di-unassign.`);
                                                      // Update reporting data secara real-time
                                                      await updateReportingData();
                                                    } catch (err) {
                                                      const errorMsg = (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data && typeof err.response.data.message === 'string') ? err.response.data.message : 'Gagal unassign dosen';
                                                      setError(String(errorMsg));
                                                      // If unassignment fails, refresh data to revert UI changes
                                                      await fetchAllRef.current();
                                                    }
                                                  }}
                                                >
                                                  <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center mt-2">
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                          Seret dosen dari semester {mk.semester} ke sini
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                                          Hanya dosen dari semester yang sama yang dapat di-assign
                                        </div>
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
                                          Dosen standby dapat di-assign ke modul manapun
                                        </div>
                                        {availableDosen.length > 0 ? (
                                          <div className="text-xs text-gray-400 dark:text-gray-500">
                                            {availableDosen.length} dosen tersedia dengan keahlian yang sesuai
                                          </div>
                                        ) : (
                                          <div className="text-xs text-red-400 dark:text-red-300">
                                            Tidak ada dosen dengan keahlian yang sesuai
                                          </div>
                                        )}
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
    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
      Dosen Tersedia ({availableDosenList.length + standbyDosenList.length})
    </h3>
    {/* Dosen Reguler */}
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full bg-brand-500"></div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Dosen Reguler ({availableDosenList.length})
        </h4>
      </div>
      <div className="space-y-3 max-h-[500px] overflow-y-auto hide-scroll">
        {availableDosenList.length > 0 ? availableDosenList.map((dosen) => (
          <div
            key={dosen.id}
            className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all duration-200 cursor-move"
            draggable
            onDragStart={() => setDraggedDosen(dosen)}
            onDragEnd={() => setDraggedDosen(null)}
          >
            {/* Header dengan Avatar dan Info Dasar */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center relative">
                <span className="text-white text-sm font-bold">{dosen.name.charAt(0)}</span>
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-semibold rounded-full flex justify-center items-center w-6 h-6 border-2 border-white dark:border-gray-800" title="Jumlah penugasan">
                  {typeof dosen.pbl_assignment_count === 'number' ? dosen.pbl_assignment_count : 0}x
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white/90 text-sm mb-1">{dosen.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">NID: {dosen.nid}</div>
              </div>
            </div>
            {/* Peran Utama Badge */}
            <div className="mb-3">
              {dosen.peran_utama === 'ketua' && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs">Ketua</span>
              )}
              {dosen.peran_utama === 'anggota' && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs">Anggota</span>
              )}
              {dosen.peran_utama === 'dosen_mengajar' && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">Dosen Mengajar</span>
              )}
              {dosen.peran_utama === 'standby' && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs">Standby</span>
              )}
            </div>
            {/* Info Section dengan Layout yang Lebih Jelas */}
            <div className="space-y-3">
              {/* Mata Kuliah/Peran Kurikulum */}
                                    {/* Mata Kuliah/Peran Kurikulum */}
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
    <div className="w-1 h-1 rounded-full bg-purple-500"></div>
    Mata Kuliah / Peran Kurikulum
  </div>
            {['ketua', 'anggota', 'mengajar'].map((tipe) => {
              const peranList = Array.isArray(dosen.dosen_peran) ? dosen.dosen_peran.filter(p => p.tipe_peran === tipe) : [];
              if (peranList.length === 0) return null;
              let label = '';
              let badgeClass = '';
              if (tipe === 'ketua') { label = 'Ketua'; badgeClass = 'bg-blue-100 text-blue-700'; }
              if (tipe === 'anggota') { label = 'Anggota'; badgeClass = 'bg-green-100 text-green-700'; }
              if (tipe === 'mengajar') { label = 'Dosen Mengajar'; badgeClass = 'bg-yellow-100 text-yellow-700'; }
              const rowKey = `${dosen.id || dosen.nid}_${tipe}`;
              const isExpanded = !!expandedGroups[rowKey];
              const isShowAll = !!showAllPeran[rowKey];
              const peranToShow = isShowAll ? peranList : peranList.slice(0, 2);
              return (
                <div key={tipe} className="mb-3">
                  <button
                    type="button"
                    className={`px-2 py-1 rounded text-xs font-semibold ${badgeClass} focus:outline-none cursor-pointer flex items-center gap-1`}
                    onClick={() => toggleGroup(rowKey)}
                    title="Klik untuk buka/tutup detail"
                  >
                    {label} ({peranList.length})
                    <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="ml-1 w-3 h-3" />
                  </button>
                  {isExpanded && (
                    <ul className="ml-0 mt-2 flex flex-col gap-2">
                      {peranToShow.map((p, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2 transition"
                        >
                          <FontAwesomeIcon icon={faBookOpen} className="text-blue-400 mt-1 w-3 h-3" />
                          <div>
                            {tipe === 'mengajar' ? (
                              <div className="font-medium text-brand-400 text-sm">{p.peran_kurikulum}</div>
                            ) : (
                              <>
                                <div className="font-medium text-brand-400 text-sm">{p.mata_kuliah_nama ?? (p as any)?.nama_mk ?? ''}</div>
                                <div className="text-xs text-gray-400">
                                  Semester {p.semester} | Blok {p.blok}
                                </div>
                                <div className="text-xs text-gray-500">{p.peran_kurikulum}</div>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {(!Array.isArray(dosen.dosen_peran) || dosen.dosen_peran.length === 0) && <span>-</span>}
            </div>
            {/* Keahlian Section */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-orange-500"></div>
                          Keahlian
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {parseKeahlian(dosen.keahlian).map((k, idx) => (
                            <span key={idx} className={`text-xs px-2 py-1 rounded-full font-medium ${
                              k.toLowerCase() === 'standby' 
                                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold' 
                                : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                            }`}>
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-gray-400" />
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
          Dosen Standby ({standbyDosenList.length})
        </h4>
      </div>
      <div className="space-y-3 max-h-[500px] overflow-y-auto hide-scroll">
        {standbyDosenList.length > 0 ? standbyDosenList.map((dosen) => (
  <div
  key={dosen.id}
  className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl hover:shadow-md transition-all duration-200 cursor-move ${draggedDosen?.id === dosen.id ? "ring-2 ring-yellow-500 scale-105" : ""}`}
  draggable
  onDragStart={() => setDraggedDosen(dosen)}
  onDragEnd={() => setDraggedDosen(null)}
>
            {/* Header dengan Avatar dan Info Dasar */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center relative">
                <span className="text-white text-sm font-bold">{dosen.name.charAt(0)}</span>
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-semibold rounded-full flex justify-center items-center w-6 h-6 border-2 border-white dark:border-gray-800" title="Jumlah penugasan">
                  {typeof dosen.pbl_assignment_count === 'number' ? dosen.pbl_assignment_count : 0}x
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white/90 text-sm mb-1">{dosen.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">NID: {dosen.nid}</div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs">
                Standby
              </span>
            </div>
            {/* Tidak ada info lain untuk dosen standby */}
          </div>
        )) : (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-gray-400" />
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
}

// Fungsi untuk fetch detail kelompok kecil berdasarkan ID
async function fetchKelompokKecilDetails(
  namaKelompok: string[],
  semester?: string | number
): Promise<KelompokKecil[]> {
  if (!namaKelompok.length || !semester) return [];
  const details: KelompokKecil[] = [];
  for (const nama of namaKelompok) {
    try {
      const res = await api.get(
        `/kelompok-kecil/by-nama?nama_kelompok=${encodeURIComponent(
          nama
        )}&semester=${encodeURIComponent(semester)}`
      );
      if (res.data && Array.isArray(res.data))
        details.push(...(res.data as KelompokKecil[]));
    } catch {
      // ignore error
    }
  }
  return details;
}

// Tambahkan helper uniqueKelompokKecilListFromList
function uniqueKelompokKecilListFromList(list: KelompokKecil[]) {
  return Object.values(
    (list || []).reduce((acc: Record<string, KelompokKecil>, k) => {
      if (!acc[k.nama_kelompok]) {
        acc[k.nama_kelompok] = { ...k, jumlah_anggota: 1 };
      } else {
        acc[k.nama_kelompok].jumlah_anggota += 1;
      }
      return acc;
    }, {})
  );
}

// Helper untuk ambil semua keahlian unik dari dosenList
function getAllKeahlian(dosenList: Dosen[]): string[] {
  const allKeahlian = new Set<string>();
  dosenList.forEach((d: Dosen) => {
    const keahlianArr = Array.isArray(d.keahlian)
      ? d.keahlian
      : (d.keahlian || "").split(",").map((k: string) => k.trim());
    keahlianArr.forEach((k: string) => allKeahlian.add(k));
  });
  return Array.from(allKeahlian).sort();
}
