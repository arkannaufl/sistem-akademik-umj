import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faBookOpen,
  faEdit,
  faUsers,
  faTimes,
  faCheckCircle,
  faExclamationTriangle,
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

export default function PBL() {
  const { blokId } = useParams();
  const navigate = useNavigate();
  const [pblData, setPblData] = useState<{ [kode: string]: PBL[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
  const [assignedDosen, setAssignedDosen] = useState<{ [pblId: number]: Dosen[] }>({});

  const [searchDosen, setSearchDosen] = useState("");
  // Tambahkan state untuk pagination modal mahasiswa
  const [pageMahasiswaModal, setPageMahasiswaModal] = useState(1);
  // Tambahkan state untuk filter status dan statistik
  const [filterStatus, setFilterStatus] = useState("semua");
  const fetchAllRef = useRef(fetchAll);

  useEffect(() => { fetchAllRef.current = fetchAll }, [fetchAll]);

  // Helper untuk mendapatkan dosen yang di-assign per semester
  const getDosenBySemester = (semester: number) => {
    const semesterMataKuliah = blokMataKuliahFiltered.filter(mk => mk.semester === semester);
    const semesterPblIds = semesterMataKuliah.flatMap(mk => 
      (pblData[mk.kode] || []).map(pbl => pbl.id).filter(Boolean)
    );
    
    const semesterDosen = new Set<Dosen>();
    semesterPblIds.forEach(pblId => {
      if (pblId && assignedDosen[pblId]) {
        assignedDosen[pblId].forEach((dosen: Dosen) => {
          // Pastikan keahlianArr selalu ada
          if (!dosen.keahlianArr) {
            dosen.keahlianArr = Array.isArray(dosen.keahlian)
              ? dosen.keahlian
              : (dosen.keahlian || '').split(',').map((k) => k.trim());
          }
          semesterDosen.add(dosen);
        });
      }
    });
    return Array.from(semesterDosen);
  };

  // Helper untuk mendapatkan dosen yang tersedia (tidak di-assign ke semester manapun)
  const assignedDosenIds = Object.values(assignedDosen).flat().map(d => d.id);
  const dosenWithKeahlian = dosenList.map(d => ({
    ...d,
    keahlianArr: Array.isArray(d.keahlian) ? d.keahlian : (d.keahlian || '').split(',').map((k) => k.trim()),
  }));
  
  const standbyDosenList = dosenWithKeahlian.filter(d => 
    d.keahlianArr.map(k => k.toLowerCase()).includes('standby') && 
    !assignedDosenIds.includes(d.id) && 
    (!searchDosen || (
      d.name.toLowerCase().includes(searchDosen.toLowerCase()) ||
      d.nid.toLowerCase().includes(searchDosen.toLowerCase()) ||
      d.keahlianArr.some((k) => k.toLowerCase().includes(searchDosen.toLowerCase()))
    ))
  );
  
  const availableDosenList = dosenWithKeahlian.filter(d => 
    !d.keahlianArr.map(k => k.toLowerCase()).includes('standby') && 
    !assignedDosenIds.includes(d.id) && 
    (!searchDosen || (
      d.name.toLowerCase().includes(searchDosen.toLowerCase()) ||
      d.nid.toLowerCase().includes(searchDosen.toLowerCase()) ||
      d.keahlianArr.some((k) => k.toLowerCase().includes(searchDosen.toLowerCase()))
    ))
  );

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

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      // Fetch PBLs and dosen in parallel
      const [pblRes, dosenRes] = await Promise.all([
        api.get("/pbls/all"),
        api.get("/users?role=dosen"),
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
      // Fetch assigned dosen batch (all pblId)
      const allPbls = Object.values(pblMap).flat();
      const pblIds = allPbls.map((pbl) => pbl.id).filter(Boolean);
      if (pblIds.length > 0) {
        const assignedRes = await api.post("/pbls/assigned-dosen-batch", { pbl_ids: pblIds });
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
  useEffect(() => { fetchAll(); }, []);

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
        await api.post(`/mata-kuliah/${showKelompokModal}/pbl-kelompok-kecil`, {
          nama_kelompok_list: selectedKelompok,
          semester: String(mk?.semester),
        });
        // Fetch mapping for this semester only and update state per semester
        const semesterKey = mk ? String(mk.semester) : "";
        const res = await api.post("/mata-kuliah/pbl-kelompok-kecil/batch", {
          mata_kuliah_kode: [showKelompokModal],
          semester: semesterKey,
        });
        setBlokKelompokBySemester((prev) => ({
          ...prev,
          [semesterKey]: {
            ...(prev[semesterKey] || {}),
            ...res.data,
          },
        }));
        // Jika ingin fetch detail kelompok kecil, pastikan fungsi fetchKelompokKecilDetails sudah didefinisikan dan diimport dengan benar
        if (typeof fetchKelompokKecilDetails === 'function') {
          const details = await fetchKelompokKecilDetails(selectedKelompok, mk?.semester);
        setKelompokKecilDetailList(details);
        }
        setShowKelompokModal(null);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
        // Tambahan: fetch ulang detail kelompok kecil agar badge update
        await fetchBatchKelompokDetail(mk ? mk.semester : null);
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
      : sortedSemesters.filter((s: number) => String(s) === String(filterSemester));

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
        return pblList.some((pbl) => (assignedDosen[pbl.id!] || []).length === 0);
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
    let belum = 0, sudah = 0;
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
      setSuccess('PBL berhasil diperbarui.');
      setShowModal(false);
      // Refresh data
      const pblRes = await api.get('/pbls/all');
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
      setError(err?.response?.data?.message || 'Gagal memperbarui PBL');
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
      setSuccess('PBL berhasil ditambahkan.');
      setShowModal(false);
      // Refresh data
      const pblRes = await api.get('/pbls/all');
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
      setError(err?.response?.data?.message || 'Gagal menambah PBL');
    } finally {
      setIsSaving(false);
    }
  }

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
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                  </div>
                </div>
                
                {/* PBL Cards Skeleton */}
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50">
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
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
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
          onClick={() => navigate('/pbl')}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-all duration-300 ease-out hover:scale-105 transform mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
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
                Dosen di-assign per semester secara merata. Drag & drop hanya bisa dilakukan antar dosen dalam semester yang sama.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Statistik Summary Card */}
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
                {dosenList.length}
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
      {/* Filterisasi dalam card ala CSR */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <select
              value={filterSemester}
            onChange={e => setFilterSemester(e.target.value)}
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
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-theme-xs"
          >
            <option value="semua">Semua Status</option>
            <option value="belum">Belum Ditugaskan</option>
            <option value="sudah">Sudah Ditugaskan</option>
            </select>
            <input
              type="text"
              value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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
                  <FontAwesomeIcon icon={faBookOpen} className="w-8 h-8 text-gray-400" />
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
                {sortedSemesters.map(semester => {
                  const semesterPBLs = allFilteredMataKuliah.filter(mk => mk.semester === semester);
              return (
                    <div key={semester} className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                      {/* Semester Header */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{semester}</span>
                  </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                              Semester {semester}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {semesterPBLs.length} mata kuliah blok
                            </p>
                      </div>
                          {/* Badge kelompok kecil di samping judul semester */}
                          <div className="flex flex-wrap items-center gap-2 ml-2">
                            {semesterPBLs.flatMap((mk) => {
                              const semesterKey = mk ? String(mk.semester) : "";
                              const kelompokList = blokKelompokBySemester[semesterKey]?.[mk.kode] || [];
                              return kelompokList.map((nama: string, idx: number) => (
                                <span key={mk.kode + '-' + idx} className="text-sm px-4 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200 rounded-full font-medium flex items-center gap-2">
                                  Kelompok {nama}
                                  <button
                                    type="button"
                                    className="ml-1 p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                                    title="Lihat Mahasiswa"
                                    onClick={e => {
                                      e.stopPropagation();
                                      // Cari detail kelompok kecil dari list by semester
                                      const semesterKey = mk ? String(mk.semester) : "";
                                      const kelompokListDetail = kelompokKecilListBySemester[semesterKey] || [];
                                      const kelompok = kelompokListDetail.find(k => k.nama_kelompok === nama);
                                      if (kelompok) handleLihatMahasiswa(kelompok);
                                    }}
                                  >
                                    <svg className="w-4 h-4 text-green-700 dark:text-green-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                          </span>
                              ));
                            })}
                      </div>
                    </div>
                        <div className="flex gap-2 ml-auto">
                      <button
                            onClick={() => handleOpenAddModal(semesterPBLs[0]?.kode)}
                            className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition flex items-center gap-2 shadow-theme-xs"
                      >
                            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                        Tambah PBL
                      </button>
                      <button
                            onClick={() => handleOpenKelompokModal(semesterPBLs[0]?.kode)}
                            className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition flex items-center gap-2 shadow-theme-xs"
                          >
                            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                            Pilih/Edit Kelompok
                      </button>
                    </div>
                      </div>
                      {/* PBL Cards Grid */}
                      <div className="grid gap-4">
                        {semesterPBLs.map((mk) => {
                          const pblList = pblData[mk.kode] || [];
                          return pblList.length === 0 ? null : pblList.map((pbl, pblIdx) => {
                            const assigned = assignedDosen[pbl.id!] || [];
                            // Dosen yang cocok berdasarkan keahlian mata kuliah
                            const availableDosen = dosenList.filter(d => {
                              const keahlianArr = Array.isArray(d.keahlian) ? d.keahlian : (d.keahlian || "").split(",").map(k => k.trim());
                              return (mk.keahlian_required || []).some(k => keahlianArr.includes(k));
                            });
                            // Status badge ala CSR
                            const statusBadge = assigned.length > 0
                              ? <span className="text-xs px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 ml-auto">Sudah Ditugaskan</span>
                              : <span className="text-xs px-3 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 ml-auto">Belum Ditugaskan</span>;
                      return (
                              <div
                                key={pbl.id}
                                className={`p-3 sm:p-5 rounded-xl border transition-all duration-300 ${dragOverPBLId === pbl.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-lg scale-[1.02]' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 hover:shadow-md'}`}
                                onDragOver={e => {
                                  e.preventDefault();
                                  if (draggedDosen && draggedFromPBLId !== null && draggedFromPBLId !== pbl.id) {
                                    setDragOverPBLId(pbl.id!);
                                  }
                                }}
                                onDragLeave={e => {
                                  e.preventDefault();
                                  setDragOverPBLId(null);
                                }}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  setDragOverPBLId(null);
                                  if (!draggedDosen || draggedDosen.id == null) return;
                                  // Jika dosen sudah ada di PBL target, tolak
                                  if ((assignedDosen[pbl.id!] || []).some(d => d.id === draggedDosen.id)) {
                                    setError('Dosen sudah ada di PBL ini.');
                                    return;
                                  }
                                  // Validasi keahlian berdasarkan mata kuliah
                                  const dosenKeahlian = Array.isArray(draggedDosen.keahlian) ? draggedDosen.keahlian : (draggedDosen.keahlian || '').split(',').map(k => k.trim());
                                  const isStandby = dosenKeahlian.map(k => k.toLowerCase()).includes('standby');
                                  const match = (mk.keahlian_required || []).some((k) => dosenKeahlian.includes(k));
                                  if (!match && !isStandby) {
                                    setError('Keahlian dosen tidak sesuai dengan kebutuhan mata kuliah ini.');
                                    return;
                                  }
                                  setIsMovingDosen(true);
                                  try {
                                    // Jika draggedFromPBLId ada, unassign dulu dari PBL asal
                                    if (draggedFromPBLId) {
                                      await api.delete(`/pbls/${draggedFromPBLId}/unassign-dosen/${draggedDosen.id}`);
                                    }
                                    // Assign ke PBL target
                                    await api.post(`/pbls/${pbl.id}/assign-dosen`, { dosen_id: draggedDosen.id });
                                    // Refresh assigned dosen untuk PBL target (dan asal jika perlu)
                                    const refreshIds = draggedFromPBLId ? [draggedFromPBLId, pbl.id] : [pbl.id];
                                    const res = await api.post('/pbls/assigned-dosen-batch', { pbl_ids: refreshIds });
                                    setAssignedDosen((prev) => {
                                      const updated = { ...prev };
                                      refreshIds.forEach(id => {
                                        const idx = Number(id);
                                        updated[idx] = res.data && res.data[idx] ? res.data[idx] : [];
                                      });
                                      return updated;
                                    });
                                    setSuccess(`Dosen ${draggedDosen.name} berhasil di-assign ke PBL ini.`);
                                  } catch (err) {
                                    setError('Gagal assign dosen');
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
                                          Modul {pbl.modul_ke} - {pbl.nama_modul}
                                        </p>
                                        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                                          Semester {mk.semester}
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
                                  {/* Status badge ala CSR */}
                                  <div className="flex flex-row items-center gap-2 sm:ml-4">
                                    {statusBadge}
                                    <button
                                      onClick={() => handleOpenEditModal(mk.kode, pblIdx, pbl)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 bg-transparent rounded-lg transition"
                                      title="Edit PBL"
                                    >
                                      <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                                      <span className="hidden sm:inline">Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeletePbl(mk.kode, pblIdx)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 bg-transparent rounded-lg transition"
                                      title="Hapus PBL"
                                    >
                                      <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                      <span className="hidden sm:inline">Hapus</span>
                                    </button>
                                  </div>
                    </div>
                                {/* Assigned Dosen Section */}
                                {assigned.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                    {assigned.map((dosen) => {
                                      // Pastikan keahlianArr selalu array string
                                      const keahlianArr = dosen.keahlianArr || (Array.isArray(dosen.keahlian) ? dosen.keahlian : (dosen.keahlian || '').split(',').map(k => k.trim()));
                                      const isStandby = keahlianArr.map(k => k.toLowerCase()).includes('standby');
                                      return (
                                        <div
                                          key={dosen.id}
                                          className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 bg-white dark:bg-gray-800/70 shadow-sm hover:shadow-md cursor-move ${draggedDosen?.id === dosen.id ? 'ring-2 ring-brand-500 scale-105' : ''}`}
                                          draggable
                                          onDragStart={() => { setDraggedDosen(dosen); setDraggedFromPBLId(pbl.id!); }}
                                          onDragEnd={() => { setDraggedDosen(null); setDraggedFromPBLId(null); }}
                                        >
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isStandby ? 'bg-yellow-400' : 'bg-brand-500' }`}>
                                            <span className="text-white text-sm font-bold">{dosen.name.charAt(0)}</span>
                                          </div>
                                          <div className="flex-1">
                                            <div className={`font-medium ${isStandby ? 'text-yellow-800 dark:text-yellow-100' : 'text-gray-800 dark:text-white/90'}`}>{dosen.name}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">NID: {dosen.nid}</div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {keahlianArr.map((k, idx) => (
                                                <span key={idx} className={`text-xs px-2 py-1 rounded-full ${k.toLowerCase() === 'standby' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold' : 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'}`}>{k}</span>
                                              ))}
                                            </div>
                                          </div>
                                          <button
                                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition"
                                            title="Hapus penugasan"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                await api.delete(`/pbls/${pbl.id}/unassign-dosen/${dosen.id}`);
                                                // Fetch assigned dosen batch hanya untuk pbl.id
                                                const res = await api.post('/pbls/assigned-dosen-batch', { pbl_ids: [pbl.id] });
                                                const pblIdNum = Number(pbl.id);
                                                if (isFinite(pblIdNum)) {
                                                  setAssignedDosen((prev) => ({ ...prev, [pblIdNum]: res.data && res.data[pblIdNum] ? res.data[pblIdNum] : [] }));
                                                }
                                                // Tambahan: refresh seluruh data agar dosen yang di-unassign langsung muncul di list tersedia/standby
                                                await fetchAllRef.current();
                                                setSuccess(`Dosen ${dosen.name} berhasil di-unassign.`);
                                              } catch (err: any) {
                                                setError(err?.response?.data?.message || "Gagal unassign dosen");
                                              }
                                            }}
                                          >
                                            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center mt-2">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                      Seret dosen dari semester {mk.semester} ke sini
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                                      Hanya dosen dari semester yang sama yang dapat di-assign
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
              Dosen Tersedia ({availableDosenList.length})
            </h3>
            {/* Dosen yang belum di-assign ke PBL (tidak termasuk standby) */}
            <div className="mb-6">
              {availableDosenList.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto hide-scroll">
                  {availableDosenList.map((dosen) => (
                    <div
                      key={dosen.id}
                      draggable
                      onDragStart={() => setDraggedDosen(dosen)}
                      onDragEnd={() => setDraggedDosen(null)}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:shadow-md hover:border-brand-500 dark:hover:border-brand-400 transition-all duration-200"
                    >
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
                        {dosen.keahlianArr?.map((k, idx) => (
                          <span key={idx} className={`text-xs px-2 py-1 rounded-full ${k.toLowerCase() === 'standby' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold' : 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'}`}>{k}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Tidak ada dosen tersedia.</div>
              )}
            </div>
            {/* Card Dosen Standby */}
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-white dark:text-white/90 mb-2">Dosen Standby ({standbyDosenList.length})</h3>
              <div className="space-y-5 max-h-[500px] overflow-y-auto hide-scroll">
                {standbyDosenList.map((dosen) => (
                  <div
                    key={dosen.id}
                    draggable
                    onDragStart={() => setDraggedDosen(dosen)}
                    onDragEnd={() => setDraggedDosen(null)}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:shadow-md hover:border-brand-500 dark:hover:border-brand-400 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {dosen.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-white/90 text-sm">{dosen.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">NID: {dosen.nid}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {dosen.keahlianArr?.map((k, idx) => (
                        <span key={idx} className={`text-xs px-2 py-1 rounded-full ${k.toLowerCase() === 'standby' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-semibold' : 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'}`}>{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {standbyDosenList.length === 0 && (
                  <div className="text-xs text-gray-400">Tidak ada dosen standby.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal, dsb... */}
      {/* Modal Tambah/Edit PBL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            ></motion.div>
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              {/* Modal Content Here */}
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                {editMode ? "Edit PBL" : "Tambah PBL"}
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (isSaving) return;
                if (editMode) {
                  handleEditPbl();
                } else {
                  handleAddPbl();
                }
              }} className="space-y-4">
                {error && (
                  <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>
                )}
                <div>
                  <label htmlFor="kodeMataKuliah" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mata Kuliah
                  </label>
                  <select
                    id="kodeMataKuliah"
                    value={selectedPBL?.kode}
                    onChange={(e) => setSelectedPBL({ ...selectedPBL!, kode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled
                  >
                    <option value="">Pilih Mata Kuliah</option>
                    {blokMataKuliah.map((mk) => (
                      <option key={mk.kode} value={mk.kode}>
                        {mk.kode} - {mk.nama}
                      </option>
                    ))}
                  </select>
                </div>
                    <div>
                  <label htmlFor="modulKe" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Modul Ke
                      </label>
                      <input
                    type="text"
                    id="modulKe"
                        value={form.modul_ke}
                    onChange={(e) => setForm({ ...form, modul_ke: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                    </div>
                    <div>
                  <label htmlFor="namaModul" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nama Modul
                      </label>
                      <input
                        type="text"
                    id="namaModul"
                        value={form.nama_modul}
                    onChange={(e) => setForm({ ...form, nama_modul: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                    className={`px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors flex items-center justify-center ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                        <svg className="w-5 h-5 mr-2 animate-spin text-white inline-block align-middle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        Menyimpan<span className="inline-block animate-pulse">...</span>
                        </>
                      ) : (
                      editMode ? "Simpan Perubahan" : "Simpan PBL"
                      )}
                    </button>
                  </div>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus PBL */}
      <AnimatePresence>
        {showDeleteModal && pblToDelete && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={() => setShowDeleteModal(false)}
            ></motion.div>
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001]"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => { setShowDeleteModal(false); setPblToDelete(null); }}
                className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <div>
                <div className="flex items-center justify-between pb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Hapus Data</h2>
                </div>
                <div>
                  <p className="mb-6 text-gray-500 dark:text-gray-400">
                    Apakah Anda yakin ingin menghapus PBL <span className="font-semibold text-gray-800 dark:text-white">{pblToDelete.pbl?.nama_modul}</span> dari mata kuliah <span className="font-semibold text-gray-800 dark:text-white">{pblToDelete.kode}</span>? Data yang dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                      onClick={() => { setShowDeleteModal(false); setPblToDelete(null); }}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Batal
                </button>
                <button
                      type="button"
                      onClick={async () => {
                        if (isSaving) return;
                        setIsSaving(true);
                        try {
                          await api.delete(`/pbls/${pblToDelete.pbl?.id}`);
                          setSuccess("PBL berhasil dihapus.");
                          setShowDeleteModal(false);
                          setPblToDelete(null);
                          // Refresh data PBL
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
                          setError(err?.response?.data?.message || "Gagal menghapus PBL");
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium shadow-theme-xs hover:bg-red-600 transition flex items-center justify-center"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                          <svg className="w-5 h-5 mr-2 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Menghapus...
                        </>
                      ) : 'Hapus'}
                </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Lihat Mahasiswa */}
      <AnimatePresence>
      {showMahasiswaModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={() => setShowMahasiswaModal(null)}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowMahasiswaModal(null)}
                className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              {/* Modal Content Here */}
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Mahasiswa Kelompok {showMahasiswaModal.kelompok.nama_kelompok}
              </h3>
              {/* Table Mahasiswa dengan pagination dan zebra row ala MataKuliah.tsx */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto hide-scroll">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Nama Mahasiswa</th>
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">NIM</th>
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Angkatan</th>
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">IPK</th>
                    </tr>
                  </thead>
                  <tbody>
                      {(() => {
                         const pageSize = 5;
                         const total = showMahasiswaModal.mahasiswa.length;
                         const totalPages = Math.ceil(total / pageSize);
                         const paginated = showMahasiswaModal.mahasiswa.slice((pageMahasiswaModal - 1) * pageSize, pageMahasiswaModal * pageSize);
                         return paginated.length > 0 ? paginated.map((mhs, idx) => (
                           <tr key={mhs.nim} className={idx % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                             <td className="px-6 py-4 text-gray-800 dark:text-white/90">{mhs.nama}</td>
                             <td className="px-6 py-4 text-gray-800 dark:text-white/90">{mhs.nim}</td>
                             <td className="px-6 py-4 text-gray-800 dark:text-white/90">{mhs.angkatan}</td>
                             <td className="px-6 py-4 text-gray-800 dark:text-white/90">{mhs.ipk}</td>
                      </tr>
                         )) : (
                           <tr><td colSpan={4} className="text-center py-8 text-gray-400 dark:text-gray-300">Tidak ada mahasiswa.</td></tr>
                         );
                       })()}
                  </tbody>
                </table>
                </div>
                {/* Pagination bawah ala MataKuliah.tsx */}
                {showMahasiswaModal.mahasiswa.length > 5 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Menampilkan {Math.min(5, showMahasiswaModal.mahasiswa.length)} dari {showMahasiswaModal.mahasiswa.length} mahasiswa
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPageMahasiswaModal(p => Math.max(1, p - 1))}
                        disabled={pageMahasiswaModal === 1}
                        className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                      >Prev</button>
                      {Array.from({ length: Math.ceil(showMahasiswaModal.mahasiswa.length / 5) }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setPageMahasiswaModal(i + 1)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 ${
                            pageMahasiswaModal === i + 1
                              ? 'bg-brand-500 text-white'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                          } transition`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setPageMahasiswaModal(p => Math.min(Math.ceil(showMahasiswaModal.mahasiswa.length / 5), p + 1))}
                        disabled={pageMahasiswaModal === Math.ceil(showMahasiswaModal.mahasiswa.length / 5)}
                        className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                      >Next</button>
                    </div>
              </div>
            )}
              </div>
              <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowMahasiswaModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Tutup
            </button>
              </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Modal Pilih/Edit Kelompok */}
      <AnimatePresence>
        {showKelompokModal && (
            <div className="fixed inset-0 z-[100000] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
                onClick={handleBatalKelompok}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
              onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={handleBatalKelompok}
                  className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              {/* Modal Content Here */}
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Pilih/Edit Kelompok untuk Mata Kuliah {showKelompokModal}
              </h3>
                  <input
                    type="text"
                    value={searchKelompok}
                    onChange={(e) => setSearchKelompok(e.target.value)}
                placeholder="Cari kelompok..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
                  />
              <div className="space-y-3 max-h-96 overflow-y-auto hide-scroll">
                  {(() => {
                  // Ambil semester dari mk yang sedang dipilih
                  const mk = blokMataKuliah.find((mk) => mk.kode === showKelompokModal);
                  const semesterKey = mk ? String(mk.semester) : "";
                  const kelompokList = kelompokKecilListBySemester[semesterKey] || [];
                  // Ambil hanya nama_kelompok unik
                  const uniqueKelompok = Array.from(new Set(kelompokList.map(k => k.nama_kelompok)));
                  // Filter by search dan urutkan secara numerik
                  const filteredList = uniqueKelompok
                    .filter(nama => nama.toLowerCase().includes(searchKelompok.toLowerCase()))
                    .sort((a, b) => {
                      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
                      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      return a.localeCompare(b);
                    });
                  if (filteredList.length === 0) {
                    return <div className="text-center text-gray-400 py-6">Tidak ada kelompok kecil tersedia.</div>;
                  }
                  return filteredList.map((nama, idx) => {
                    // Ambil jumlah anggota dari kelompokList
                    const jumlahAnggota = kelompokList.filter(k => k.nama_kelompok === nama).length;
                    const checked = selectedKelompok.includes(nama);
                    // Cek apakah kelompok ini sudah dipakai di mata kuliah lain
                    const mk = blokMataKuliah.find((mk) => mk.kode === showKelompokModal);
                    const semesterKey = mk ? String(mk.semester) : "";
                    // Cek mapping kelompok di blokKelompokBySemester[semesterKey] untuk semua kode selain showKelompokModal
                    let digunakanDiMataKuliahLain = false;
                    let kodeMkLain = null;
                    if (blokKelompokBySemester[semesterKey]) {
                      for (const kode in blokKelompokBySemester[semesterKey]) {
                        if (kode !== showKelompokModal && blokKelompokBySemester[semesterKey][kode]?.includes(nama)) {
                          digunakanDiMataKuliahLain = true;
                          kodeMkLain = kode;
                          break;
                        }
                      }
                    }
                    return (
                      <div
                        key={nama}
                        className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors mb-2 ${digunakanDiMataKuliahLain ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            onClick={() => {
                          if (digunakanDiMataKuliahLain) return;
                          setSelectedKelompok(prev => {
                            const currentSelected = [...prev];
                            if (currentSelected.includes(nama)) {
                              return currentSelected.filter(name => name !== nama);
                              } else {
                              return [...currentSelected, nama];
                            }
                          });
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold">
                            {nama.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-white/90 text-sm">Kelompok {nama}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Jumlah Anggota: {jumlahAnggota}</div>
                            {digunakanDiMataKuliahLain && (
                              <div className="text-xs text-red-500 mt-1">Digunakan di mata kuliah lain</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {digunakanDiMataKuliahLain ? (
                            <button
                              type="button"
                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              onClick={async (e) => {
                                  e.stopPropagation();
                                // Unassign kelompok dari mk lain
                                if (kodeMkLain) {
                                  await api.post(`/mata-kuliah/${kodeMkLain}/pbl-kelompok-kecil`, {
                                    nama_kelompok_list: (blokKelompokBySemester[semesterKey][kodeMkLain] || []).filter(k => k !== nama),
                                    semester: semesterKey,
                                  });
                                  // Refresh mapping
                                  const res = await api.post("/mata-kuliah/pbl-kelompok-kecil/batch", {
                                    mata_kuliah_kode: [showKelompokModal, kodeMkLain],
                                    semester: semesterKey,
                                  });
                                  setBlokKelompokBySemester((prev) => ({
                                      ...prev,
                                    [semesterKey]: {
                                      ...(prev[semesterKey] || {}),
                                      ...res.data,
                                    },
                                  }));
                                }
                              }}
                            >Keluarkan</button>
                          ) : (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="flex items-center"
                            >
                              <button
                                type="button"
                                aria-checked={checked}
                                role="checkbox"
                                tabIndex={0}
                                onClick={() => {
                                  setSelectedKelompok(prev => {
                                    const currentSelected = [...prev];
                                    if (currentSelected.includes(nama)) {
                                      return currentSelected.filter(name => name !== nama);
                                  } else {
                                      return [...currentSelected, nama];
                                    }
                                  });
                                }}
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 ${checked ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"} cursor-pointer`}
                                disabled={digunakanDiMataKuliahLain}
                              >
                                {checked && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                    <polyline points="20 7 11 17 4 10" />
                                </svg>
                              )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                        );
                      });
                  })()}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                  <button
                  type="button"
                    onClick={handleBatalKelompok}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                  type="button"
                    onClick={handleSimpanKelompok}
                  className={`px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors flex items-center justify-center min-w-[180px] ${isSavingKelompok ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={selectedKelompok.length === 0 || isSavingKelompok}
                  >
                    {isSavingKelompok ? (
                      <>
                      <svg className="w-5 h-5 mr-2 animate-spin text-white inline-block align-middle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                    "Simpan Pilihan Kelompok"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
        )}
      </AnimatePresence>
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
