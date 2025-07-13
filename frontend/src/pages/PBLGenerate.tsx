import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faBookOpen,
  faCog,
  faCheckCircle,
  faExclamationTriangle,
  faEye,
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

// Tambahkan tipe untuk kelompok kecil
interface KelompokKecil {
  id: number;
  nama_kelompok: string;
  jumlah_anggota: number;
  semester?: string | number;
}

// Tambahkan tipe untuk mahasiswa
interface Mahasiswa {
  nama: string;
  nim: string;
  angkatan: string;
  ipk: number;
}

interface Dosen {
  id: number;
  nid: string;
  name: string;
  keahlian: string[] | string;
  peran_utama?: string;
  peran_kurikulum?: string[] | string;
  matkul_ketua_nama?: string;
  matkul_ketua_semester?: number;
  matkul_anggota_nama?: string;
  matkul_anggota_semester?: number;
  matkul_ketua_id?: string;
  matkul_anggota_id?: string;
  peran_kurikulum_mengajar?: string;
  matchReason?: string;
}

interface AssignedDosen {
  [pblId: number]: Dosen[];
}

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
  const [unassignedPBLList, setUnassignedPBLList] = useState<{ mk: MataKuliah; pbl: PBL; reason: string }[]>([]);
  
  // New state for statistics
  const [kelompokKecilCount, setKelompokKecilCount] = useState<number>(0);
  const [totalKelompokKecilAllSemester, setTotalKelompokKecilAllSemester] = useState<number>(0);
  const [keahlianCount, setKeahlianCount] = useState<number>(0);
  const [peranKetuaCount, setPeranKetuaCount] = useState<number>(0);
  const [peranAnggotaCount, setPeranAnggotaCount] = useState<number>(0);
  const [dosenMengajarCount, setDosenMengajarCount] = useState<number>(0);

  // State untuk kelompok kecil - optimasi
  const [kelompokKecilData, setKelompokKecilData] = useState<{
    [semester: string]: {
      mapping: { [kode: string]: string[] };
      details: KelompokKecil[];
    };
  }>({});
  
  // OPTIMIZATION: Add caching for kelompok kecil data
  const [kelompokKecilCache, setKelompokKecilCache] = useState<{
    [semester: string]: {
      mapping: { [kode: string]: string[] };
      details: KelompokKecil[];
    };
  }>({});
  
  // OPTIMIZATION: Add debouncing for fetch operations
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  
  // Debounced fetch function to prevent multiple rapid API calls
  const debouncedFetch = useCallback((fetchFunction: () => Promise<void>, delay: number = 300) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(async () => {
      if (!isFetching) {
        setIsFetching(true);
        try {
          await fetchFunction();
        } finally {
          setIsFetching(false);
        }
      }
    }, delay);
  }, [isFetching]);

  const [showMahasiswaModal, setShowMahasiswaModal] = useState<{
    kelompok: KelompokKecil;
    mahasiswa: Mahasiswa[];
  } | null>(null);
  const [pageMahasiswaModal, setPageMahasiswaModal] = useState(1);

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

  // OPTIMIZATION: Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch data in parallel
        const [pblRes, dosenRes, activeSemesterRes, kelompokKecilRes] = await Promise.all([
          api.get("/pbls/all"),
          api.get("/users?role=dosen"),
          api.get("/tahun-ajaran/active"),
          api.get("/kelompok-kecil"),
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

        // Calculate statistics
        calculateStatistics(filteredBlokMataKuliah, dosenRes.data || [], kelompokKecilRes.data || [], semester?.jenis);
        
        // Calculate total kelompok kecil from all active semesters
        const allKelompokKecil = kelompokKecilRes.data || [];
        const uniqueAllKelompok = new Set(
          allKelompokKecil.map((kk: any) => `${kk.semester}__${kk.nama_kelompok}`)
        );
        setTotalKelompokKecilAllSemester(uniqueAllKelompok.size);

        // Fetch kelompok kecil data for all semesters in one go
        await fetchKelompokKecilData(filteredBlokMataKuliah, semester?.jenis);
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

  // Optimized function to fetch kelompok kecil data for all semesters
  const fetchKelompokKecilData = useCallback(async (mataKuliahList: MataKuliah[], activeSemester: string | null) => {
    if (!mataKuliahList.length) return;

    try {
      // Get unique semesters
      const semesters = Array.from(new Set(mataKuliahList.map(mk => mk.semester)));
      // Build semester_map: { semester: [kode, kode, ...] }
      const semesterMap: Record<string, string[]> = {};
      semesters.forEach(semester => {
        const kodeList = mataKuliahList.filter(mk => mk.semester === semester).map(mk => mk.kode);
        if (kodeList.length > 0) semesterMap[String(semester)] = kodeList;
      });
      if (Object.keys(semesterMap).length === 0) return;

      // Fetch all mapping in one request
      const mappingRes = await api.post('/mata-kuliah/pbl-kelompok-kecil/batch-multi-semester', { semester_map: semesterMap });
      // Fetch all kelompok kecil details in one batch call
      const kelompokKecilBatchRes = await api.post('/kelompok-kecil/batch-by-semester', { semesters: Object.keys(semesterMap) });

      // Build newKelompokKecilData
      const newKelompokKecilData: { [semester: string]: { mapping: { [kode: string]: string[] }; details: KelompokKecil[] } } = {};
      Object.keys(semesterMap).forEach(semesterKey => {
        newKelompokKecilData[semesterKey] = {
          mapping: mappingRes.data[semesterKey] || {},
          details: kelompokKecilBatchRes.data[semesterKey] || []
        };
      });
      setKelompokKecilData(newKelompokKecilData);
      setKelompokKecilCache(newKelompokKecilData); // Update cache
    } catch (error) {
      console.error('Failed to fetch kelompok kecil data:', error);
    }
  }, []);

  // Recalculate statistics when active semester changes
  useEffect(() => {
    if (blokMataKuliah.length > 0 && dosenList.length > 0 && activeSemesterJenis) {
      // OPTIMIZATION: Use cached data if available, otherwise fetch
      const hasCachedData = Object.keys(kelompokKecilCache).length > 0;
      
      if (hasCachedData) {
        // Use cached data for statistics calculation
        const allKelompokKecil = Object.values(kelompokKecilCache).flatMap(semesterData => 
          semesterData.details
        );
        calculateStatistics(blokMataKuliah, dosenList, allKelompokKecil, activeSemesterJenis);
      } else {
        // OPTIMIZATION: Use debounced fetch to prevent multiple rapid calls
        debouncedFetch(async () => {
          try {
            const kelompokKecilRes = await api.get("/kelompok-kecil");
            calculateStatistics(blokMataKuliah, dosenList, kelompokKecilRes.data || [], activeSemesterJenis);
          } catch {
            calculateStatistics(blokMataKuliah, dosenList, [], activeSemesterJenis);
          }
        }, 200);
      }
      
      // Re-fetch kelompok kecil data when active semester changes (only if not cached)
      if (!hasCachedData) {
        debouncedFetch(() => fetchKelompokKecilData(blokMataKuliah, activeSemesterJenis), 300);
      }
    }
  }, [activeSemesterJenis, blokMataKuliah, dosenList, kelompokKecilCache, debouncedFetch, fetchKelompokKecilData]);

  // Function to handle lihat mahasiswa
  const handleLihatMahasiswa = async (kelompok: KelompokKecil) => {
    try {
      // OPTIMIZATION: Check if we have cached data first
      const semesterRes = await api.get("/tahun-ajaran/active");
      const semester = semesterRes.data?.semesters?.[0]?.jenis;

      if (!semester) {
        alert("Tidak ada semester aktif");
        return;
      }

      // OPTIMIZATION: Try to get mahasiswa from cache first
      const semesterKey = String(kelompok.semester);
      const cachedData = kelompokKecilCache[semesterKey];
      
      if (cachedData) {
        // Find mahasiswa in cached data
        const mahasiswaInKelompok = cachedData.details.filter(
          (detail: any) => detail.nama_kelompok === kelompok.nama_kelompok
        );
        
        if (mahasiswaInKelompok.length > 0) {
          // Convert to mahasiswa format
          const mahasiswa = mahasiswaInKelompok.map((detail: any) => ({
            nama: detail.mahasiswa?.name || '',
            nim: detail.mahasiswa?.nim || '',
            angkatan: detail.mahasiswa?.angkatan || '',
            ipk: detail.mahasiswa?.ipk || 0,
          }));
          
          setShowMahasiswaModal({ kelompok, mahasiswa });
          setPageMahasiswaModal(1);
          return;
        }
      }

      // Fallback: Fetch mahasiswa dari kelompok kecil jika tidak ada di cache
      const mahasiswaRes = await api.get(
        `/kelompok-kecil/${kelompok.id}/mahasiswa`
      );
      const mahasiswa = mahasiswaRes.data || [];

      setShowMahasiswaModal({ kelompok, mahasiswa });
      setPageMahasiswaModal(1); // Reset pagination
    } catch (error) {
      alert("Gagal memuat data mahasiswa");
    }
  };

  // Function to calculate statistics
  const calculateStatistics = (mataKuliahList: MataKuliah[], dosenList: Dosen[], kelompokKecilList: any[], activeSemester: string | null) => {
    // Filter mata kuliah by active semester
    const filteredMataKuliah = activeSemester
      ? mataKuliahList.filter(
          (mk: MataKuliah) =>
            mk.periode &&
            mk.periode.trim().toLowerCase() === activeSemester.trim().toLowerCase()
        )
      : mataKuliahList;

    // Calculate kelompok kecil count (unique nama_kelompok for active semester)
    const kelompokKecilForSemester = kelompokKecilList.filter((kk: any) => 
      kk.semester === activeSemester
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

  // Filter mata kuliah by active semester
  const filteredMataKuliah = useMemo(() => {
    return activeSemesterJenis
      ? blokMataKuliah.filter(
          (mk: MataKuliah) =>
            mk.periode &&
            mk.periode.trim().toLowerCase() === activeSemesterJenis.trim().toLowerCase()
        )
      : blokMataKuliah;
  }, [blokMataKuliah, activeSemesterJenis]);

  // Group by semester
  const groupedBySemester = useMemo(() => {
    return filteredMataKuliah.reduce(
      (acc: Record<number, MataKuliah[]>, mk: MataKuliah) => {
        if (!acc[mk.semester]) acc[mk.semester] = [];
        acc[mk.semester].push(mk);
        return acc;
      },
      {}
    );
  }, [filteredMataKuliah]);

  const sortedSemesters = Object.keys(groupedBySemester)
    .map(Number)
    .sort((a, b) => a - b);

  // Calculate statistics
  const totalPBL = useMemo(() => {
    return filteredMataKuliah.reduce(
      (acc, mk) => acc + (pblData[mk.kode]?.length || 0),
      0
    );
  }, [filteredMataKuliah, pblData]);

  const pblStats = useMemo(() => {
    let belum = 0, sudah = 0;
    filteredMataKuliah.forEach((mk) => {
      (pblData[mk.kode] || []).forEach((pbl) => {
        const assigned = assignedDosen[pbl.id!] || [];
        if (assigned.length > 0) sudah++;
        else belum++;
      });
    });
    return { belum, sudah };
  }, [filteredMataKuliah, pblData, assignedDosen]);

  // Filter dosen (exclude standby)
  const dosenWithKeahlian = useMemo(() => {
    return dosenList.map(d => ({
      ...d,
      keahlianArr: Array.isArray(d.keahlian) ? d.keahlian : (d.keahlian || '').split(',').map((k) => k.trim()),
    }));
  }, [dosenList]);

  // Dosen regular: tidak memiliki keahlian "standby"
  const regularDosenList = useMemo(() => {
    return dosenWithKeahlian.filter(d => 
      !d.keahlianArr.some(k => k.toLowerCase().includes('standby'))
    );
  }, [dosenWithKeahlian]);

  // Dosen standby: memiliki keahlian "standby"
  const standbyDosenList = useMemo(() => {
    return dosenWithKeahlian.filter(d => 
      d.keahlianArr.some(k => k.toLowerCase().includes('standby'))
    );
  }, [dosenWithKeahlian]);

  // Generate dosen assignments per semester
  const handleGenerateDosen = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    setWarning(null);

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

    // Validasi: pastikan semua semester memiliki kelompok kecil
    const semesterTanpaKelompokKecil: number[] = [];
    sortedSemesters.forEach((semester) => {
      const semesterKey = String(semester);
      const semesterData = kelompokKecilData[semesterKey];
      if (!semesterData || !semesterData.details || semesterData.details.length === 0) {
        semesterTanpaKelompokKecil.push(semester);
      }
    });
    
    if (semesterTanpaKelompokKecil.length > 0) {
      setError(
        `Terdapat ${semesterTanpaKelompokKecil.length} semester yang belum memiliki kelompok kecil: Semester ${semesterTanpaKelompokKecil.join(', ')}. Silakan buat kelompok kecil terlebih dahulu sebelum generate dosen.`
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
      const unassignedPBLs: { mk: MataKuliah; pbl: PBL; reason: string }[] = [];
      const assignedPBLs: { mk: MataKuliah; pbl: PBL; dosen: Dosen[] }[] = [];

      // Process each semester
      semesterKeys.forEach((semester) => {
        const semesterPbls = pblBySemester[semester];
        if (!semesterPbls || semesterPbls.length === 0) return;

        // Get available dosen for this semester (exclude standby)
        const availableDosen = regularDosenList.filter(d => {
          // Exclude dosen with standby keahlian
          const dosenKeahlian = Array.isArray(d.keahlian) ? d.keahlian : (d.keahlian || '').split(',').map(k => k.trim());
          return !dosenKeahlian.some(k => k.toLowerCase().includes('standby'));
        });

        // Process each PBL in the semester
        semesterPbls.forEach(({ mk, pbl }) => {
          const matchingDosen: Dosen[] = [];

          // Find dosen with perfect match based on peran_utama and keahlian
          availableDosen.forEach(dosen => {
            let isPerfectMatch = false;
            let matchReason = '';

            // Check keahlian match - more flexible matching
            const dosenKeahlian = Array.isArray(dosen.keahlian) ? dosen.keahlian : (dosen.keahlian || '').split(',').map(k => k.trim());
            const requiredKeahlian = mk.keahlian_required || [];
            
            // More flexible keahlian matching
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
              return; // Skip if keahlian doesn't match
            }

            // Check peran_utama match - more flexible matching
            if (dosen.peran_utama === 'ketua') {
              if (dosen.matkul_ketua_nama && dosen.matkul_ketua_semester) {
                // More flexible matching for ketua
                const matkulName = dosen.matkul_ketua_nama.toLowerCase();
                const mkName = mk.nama.toLowerCase();
                const mkKode = mk.kode.toLowerCase();
                
                // Check if this dosen is ketua for this specific mata kuliah and semester
                if ((matkulName.includes(mkName) || mkName.includes(matkulName) ||
                     matkulName.includes(mkKode) || mkKode.includes(matkulName) ||
                     mkName.split(' ').some(word => matkulName.includes(word)) ||
                     matkulName.split(' ').some(word => mkName.includes(word))) &&
                    dosen.matkul_ketua_semester === mk.semester) {
                  isPerfectMatch = true;
                  matchReason = `Ketua untuk ${mk.nama} Semester ${mk.semester}`;
                }
              }
            } else if (dosen.peran_utama === 'anggota') {
              if (dosen.matkul_anggota_nama && dosen.matkul_anggota_semester) {
                // More flexible matching for anggota
                const matkulName = dosen.matkul_anggota_nama.toLowerCase();
                const mkName = mk.nama.toLowerCase();
                const mkKode = mk.kode.toLowerCase();
                
                // Check if this dosen is anggota for this specific mata kuliah and semester
                if ((matkulName.includes(mkName) || mkName.includes(matkulName) ||
                     matkulName.includes(mkKode) || mkKode.includes(matkulName) ||
                     mkName.split(' ').some(word => matkulName.includes(word)) ||
                     matkulName.split(' ').some(word => mkName.includes(word))) &&
                    dosen.matkul_anggota_semester === mk.semester) {
                  isPerfectMatch = true;
                  matchReason = `Anggota untuk ${mk.nama} Semester ${mk.semester}`;
                }
              }
            } else if (dosen.peran_utama === 'dosen_mengajar') {
              if (dosen.peran_kurikulum_mengajar) {
                // More flexible matching for dosen mengajar
                const peranKurikulum = dosen.peran_kurikulum_mengajar.toLowerCase();
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

            if (isPerfectMatch) {
              matchingDosen.push({
                ...dosen,
                matchReason
              });
            }
          });

          // If we have perfect matches, assign them
          if (matchingDosen.length > 0) {
            matchingDosen.forEach(dosen => {
              assignments.push({ pbl_id: pbl.id!, dosen_id: dosen.id });
            });
            assignedPBLs.push({ mk, pbl, dosen: matchingDosen });
          } else {
            // No perfect match found - provide more detailed reason
            const availableDosenForKeahlian = availableDosen.filter(dosen => {
              const dosenKeahlian = Array.isArray(dosen.keahlian) ? dosen.keahlian : (dosen.keahlian || '').split(',').map(k => k.trim());
              const requiredKeahlian = mk.keahlian_required || [];
              return requiredKeahlian.some(req => 
                dosenKeahlian.some(dosenKeahlian => {
                  const reqLower = req.toLowerCase();
                  const dosenKeahlianLower = dosenKeahlian.toLowerCase();
                  return dosenKeahlianLower.includes(reqLower) || 
                         reqLower.includes(dosenKeahlianLower) ||
                         reqLower.split(' ').some(word => dosenKeahlianLower.includes(word)) ||
                         dosenKeahlianLower.split(' ').some(word => reqLower.includes(word));
                })
              );
            });

            let reason = `Tidak ada dosen dengan peran yang sesuai untuk ${mk.nama} (${mk.kode}) - Keahlian: ${(mk.keahlian_required || []).join(', ')}`;
            
            if (availableDosenForKeahlian.length > 0) {
              const dosenWithKeahlian = availableDosenForKeahlian.map(d => d.name).join(', ');
              reason += `. Dosen dengan keahlian sesuai: ${dosenWithKeahlian}, tetapi peran tidak sesuai.`;
            } else {
              reason += `. Tidak ada dosen dengan keahlian yang sesuai.`;
            }
            
            unassignedPBLs.push({ mk, pbl, reason });
          }
        });
      });

      // Send batch assignments
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

      // Set success and warning messages
      if (assignedPBLs.length > 0) {
        const totalAssigned = assignedPBLs.length;
        const totalDosen = new Set(assignedPBLs.flatMap(item => item.dosen.map(d => d.id))).size;
        setSuccess(`Generate dosen berhasil! ${totalAssigned} modul berhasil di-assign dengan ${totalDosen} dosen.`);
        
        // Trigger event untuk update reporting data secara real-time
        window.dispatchEvent(new CustomEvent('pbl-assignment-updated', {
          detail: { timestamp: Date.now() }
        }));
      } else {
        setSuccess('Generate dosen selesai, namun tidak ada modul yang dapat di-assign karena tidak ada perfect match.');
      }

      if (unassignedPBLs.length > 0) {
        setWarning(`Ada ${unassignedPBLs.length} modul yang tidak dapat di-assign karena tidak ada perfect match.`);
        setUnassignedPBLList(unassignedPBLs);
      } else {
        setWarning(null);
        setUnassignedPBLList([]);
      }



      // Don't redirect, stay on current page
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
      
      // Trigger event untuk update reporting data secara real-time
      window.dispatchEvent(new CustomEvent('pbl-assignment-updated', {
        detail: { timestamp: Date.now() }
      }));
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
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
              {unassignedPBLList.map(({ mk, pbl, reason }) => (
                <li key={pbl.id} className="mb-2">
                  <div className="font-medium">{mk.kode} - Modul {pbl.modul_ke} ({pbl.nama_modul})</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 ml-4 mt-1">
                    {reason}
                  </div>
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
        {/* Warning untuk semester tanpa kelompok kecil - pindah ke bawah tombol dan full width */}
        {(() => {
          const semesterTanpaKelompokKecil: number[] = [];
          sortedSemesters.forEach((semester) => {
            const semesterKey = String(semester);
            const semesterData = kelompokKecilData[semesterKey];
            if (!semesterData || !semesterData.details || semesterData.details.length === 0) {
              semesterTanpaKelompokKecil.push(semester);
            }
          });
          
          if (semesterTanpaKelompokKecil.length > 0) {
            return (
              <div className="w-full mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-500 dark:border-red-700 rounded-lg flex items-center gap-3">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 text-red-500" />
                <div>
                  <div className="font-semibold text-red-700 dark:text-red-300 mb-1">
                    Semester yang belum memiliki kelompok kecil:
                  </div>
                  <div className="text-red-600 dark:text-red-400">
                    Semester {semesterTanpaKelompokKecil.join(', ')}
                  </div>
                  <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                    Silakan buat kelompok kecil terlebih dahulu sebelum generate dosen.
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}
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
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            Semester {semester}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {semesterPBLs.length} mata kuliah blok
                          </p>
                          {/* Info Dosen dan Kelompok */}
                          <div className="flex gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faUsers} className="w-3 h-3 text-blue-500" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {(() => {
                                  // Ambil semua dosen yang ditugaskan ke PBL di semester ini
                                  const assignedDosenSet = new Set<number>();
                                  semesterPBLs.forEach(mk => {
                                    (pblData[mk.kode] || []).forEach(pbl => {
                                      (assignedDosen[pbl.id!] || []).forEach(dosen => {
                                        assignedDosenSet.add(dosen.id);
                                      });
                                    });
                                  });
                                  return `${assignedDosenSet.size} dosen`;
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faUsers} className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {(() => {
                                  const semesterKey = String(semester);
                                  const semesterData = kelompokKecilData[semesterKey];
                                  if (!semesterData) return '0 kelompok';
                                  // Hitung kelompok unik untuk semester ini berdasarkan details
                                  const uniqueKelompok = new Set(
                                    (semesterData.details || []).map(kk => kk.nama_kelompok)
                                  );
                                  return `${uniqueKelompok.size} kelompok`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Warning badge untuk semester tanpa kelompok kecil */}
                        {(() => {
                          const semesterKey = String(semester);
                          const semesterData = kelompokKecilData[semesterKey];
                          if (!semesterData || !semesterData.details || semesterData.details.length === 0) {
                            return (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 text-red-500" />
                                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                                  Belum ada kelompok kecil
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {/* Kelompok Kecil Badges */}
                        <div className="flex flex-wrap gap-2 items-center">
                          {(() => {
                            const semesterKey = String(semester);
                            const semesterData = kelompokKecilData[semesterKey];
                            if (!semesterData) return null;

                            // Gabungkan semua nama kelompok unik dari mapping
                            const allKelompok = Array.from(
                              new Set(
                                Object.values(semesterData.mapping).flat()
                              )
                            );

                            // Ambil detail kelompok unik dari details
                            const kelompokDetails = allKelompok
                              .map(nama => semesterData.details.find(kk => kk.nama_kelompok === nama))
                              .filter((kelompok): kelompok is KelompokKecil => Boolean(kelompok));

                            return kelompokDetails.map((kelompok) => (
                              <div key={kelompok.id} className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                  Kelompok {kelompok.nama_kelompok}
                                </span>
                                <button
                                  onClick={() => handleLihatMahasiswa(kelompok)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title={`Lihat mahasiswa Kelompok ${kelompok.nama_kelompok}`}
                                >
                                  <FontAwesomeIcon icon={faEye} className="w-3 h-3" />
                                </button>
                              </div>
                            ));
                          })()}
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
                                      {assigned.map((dosen) => {
                                        let badgeBg = "bg-green-100 dark:bg-green-900/40";
                                        let circleBg = "bg-green-500";
                                        let textColor = "text-green-700 dark:text-green-200";
                                        let initial = "D";
                                        if (dosen.peran_utama === "ketua") {
                                          badgeBg = "bg-blue-100 dark:bg-blue-900/40";
                                          circleBg = "bg-blue-500";
                                          textColor = "text-blue-700 dark:text-blue-200";
                                          initial = "K";
                                        } else if (dosen.peran_utama === "anggota") {
                                          badgeBg = "bg-green-100 dark:bg-green-900/40";
                                          circleBg = "bg-green-500";
                                          textColor = "text-green-700 dark:text-green-200";
                                          initial = "A";
                                        } else if (dosen.peran_utama === "dosen_mengajar") {
                                          badgeBg = "bg-purple-100 dark:bg-purple-900/40";
                                          circleBg = "bg-purple-500";
                                          textColor = "text-purple-700 dark:text-purple-200";
                                          initial = "M";
                                        }
                                        return (
                                          <div key={dosen.id} className={`flex items-center gap-2 px-3 py-1 rounded-full ${badgeBg}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${circleBg}`}>
                                              <span className="text-white text-xs font-bold">
                                                {dosen.peran_utama === "ketua" ? "K" : dosen.peran_utama === "anggota" ? "A" : dosen.peran_utama === "dosen_mengajar" ? "M" : "D"}
                                              </span>
                                            </div>
                                            <span className={`text-xs font-medium ${textColor}`}>
                                              {dosen.name}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })}
                      </div>
                      
                      {/* Detail Info Dosen per Semester */}
                      <div className="mt-6">
                        <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Detail Dosen Semester {semester}:</div>
                        <div className="flex flex-wrap gap-4">
                          {(() => {
                            // Hitung unique dosen per peran yang benar-benar ditugaskan ke seluruh PBL di semester ini
                            const dosenPeran = { ketua: new Set<number>(), anggota: new Set<number>(), mengajar: new Set<number>() };
                            semesterPBLs.forEach(mk => {
                              (pblData[mk.kode] || []).forEach(pbl => {
                                (assignedDosen[pbl.id!] || []).forEach(dosen => {
                                  if (dosen.peran_utama === 'ketua') dosenPeran.ketua.add(dosen.id);
                                  else if (dosen.peran_utama === 'anggota') dosenPeran.anggota.add(dosen.id);
                                  else if (dosen.peran_utama === 'dosen_mengajar') dosenPeran.mengajar.add(dosen.id);
                                });
                              });
                            });
                            return (
                              <>
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg min-w-[120px]">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="text-blue-700 dark:text-blue-200 font-medium text-sm">Ketua</span>
                                  <span className="text-blue-700 dark:text-blue-200 font-medium text-sm">{dosenPeran.ketua.size}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg min-w-[120px]">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-green-700 dark:text-green-200 font-medium text-sm">Anggota</span>
                                  <span className="text-green-700 dark:text-green-200 font-medium text-sm">{dosenPeran.anggota.size}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 rounded-lg min-w-[120px]">
                                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                  <span className="text-purple-700 dark:text-purple-200 font-medium text-sm">Mengajar</span>
                                  <span className="text-purple-700 dark:text-purple-200 font-medium text-sm">{dosenPeran.mengajar.size}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
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
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dosen Reguler ({regularDosenList.length})
                </h4>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto hide-scroll">
              {regularDosenList.length > 0 ? regularDosenList.map((dosen) => (
                  <div key={dosen.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl  hover:shadow-md transition-all duration-200">
                    {/* Header dengan Avatar dan Info Dasar */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center ">
                      <span className="text-white text-sm font-bold">{dosen.name.charAt(0)}</span>
                    </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 dark:text-white/90 text-sm mb-1">{dosen.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">NID: {dosen.nid}</div>
                    </div>
                  </div>

                    {/* Peran Utama Badge - Lebih Menonjol */}
                    <div className="mb-3">
                      {dosen.peran_utama === 'ketua' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                          Ketua
                        </span>
                      )}
                      {dosen.peran_utama === 'anggota' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs">
                          Anggota
                        </span>
                      )}
                      {dosen.peran_utama === 'dosen_mengajar' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                          Dosen Mengajar
                        </span>
                      )}
                      {dosen.peran_utama === 'standby' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs">
                          Standby
                        </span>
                      )}
                    </div>

                    {/* Info Section dengan Layout yang Lebih Jelas */}
                    <div className="space-y-3">
                      {/* Peran dalam Kurikulum */}
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-brand-500"></div>
                          Peran dalam Kurikulum
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(dosen.peran_kurikulum) && dosen.peran_kurikulum.length > 0 ? (
                            dosen.peran_kurikulum.map((k: string, idx: number) => (
                              <span key={idx} className="text-xs px-2 py-1 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium">{k}</span>
                            ))
                          ) : typeof dosen.peran_kurikulum === 'string' && dosen.peran_kurikulum.trim() !== '' ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium">{dosen.peran_kurikulum}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Tidak ada peran kurikulum</span>
                          )}
                        </div>
                      </div>

                      {/* Mata Kuliah/Peran Kurikulum */}
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                          Mata Kuliah / Peran Kurikulum
                        </div>
                        <div className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                          {dosen.peran_utama === 'ketua' && dosen.matkul_ketua_nama && dosen.matkul_ketua_semester ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                              {dosen.matkul_ketua_nama} (Semester {dosen.matkul_ketua_semester})
                            </span>
                          ) : dosen.peran_utama === 'anggota' && dosen.matkul_anggota_nama && dosen.matkul_anggota_semester ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                              {dosen.matkul_anggota_nama} (Semester {dosen.matkul_anggota_semester})
                            </span>
                          ) : dosen.peran_utama === 'dosen_mengajar' && dosen.peran_kurikulum_mengajar ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                              {dosen.peran_kurikulum_mengajar}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Tidak ada mata kuliah terkait</span>
                          )}
                        </div>
                      </div>

                      {/* Keahlian Section */}
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-orange-500"></div>
                          Keahlian
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dosen.keahlianArr?.map((k, idx) => (
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
            <div className="space-y-3 max-h-80 overflow-y-auto hide-scroll">
              {standbyDosenList.length > 0 ? standbyDosenList.map((dosen) => (
                  <div key={dosen.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl  hover:shadow-md transition-all duration-200">
                    {/* Header dengan Avatar dan Info Dasar */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center ">
                      <span className="text-white text-sm font-bold">{dosen.name.charAt(0)}</span>
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
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowMahasiswaModal(null)}
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
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">
                          Nama Mahasiswa
                        </th>
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">
                          NIM
                        </th>
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">
                          Angkatan
                        </th>
                        <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">
                          IPK
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const pageSize = 5;
                        const total = showMahasiswaModal.mahasiswa.length;
                        const totalPages = Math.ceil(total / pageSize);
                        const paginated = showMahasiswaModal.mahasiswa.slice(
                          (pageMahasiswaModal - 1) * pageSize,
                          pageMahasiswaModal * pageSize
                        );
                        return paginated.length > 0 ? (
                          paginated.map((mhs, idx) => (
                            <tr
                              key={mhs.nim}
                              className={
                                idx % 2 === 1
                                  ? "bg-gray-50 dark:bg-white/[0.02]"
                                  : ""
                              }
                            >
                              <td className="px-6 py-4 text-gray-800 dark:text-white/90">
                                {mhs.nama}
                              </td>
                              <td className="px-6 py-4 text-gray-800 dark:text-white/90">
                                {mhs.nim}
                              </td>
                              <td className="px-6 py-4 text-gray-800 dark:text-white/90">
                                {mhs.angkatan}
                              </td>
                              <td className="px-6 py-4 text-gray-800 dark:text-white/90">
                                {mhs.ipk}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-8 text-gray-400 dark:text-gray-300"
                            >
                              Tidak ada mahasiswa.
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                {/* Pagination bawah ala MataKuliah.tsx */}
                {showMahasiswaModal.mahasiswa.length > 5 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Menampilkan{" "}
                      {Math.min(5, showMahasiswaModal.mahasiswa.length)} dari{" "}
                      {showMahasiswaModal.mahasiswa.length} mahasiswa
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setPageMahasiswaModal((p) => Math.max(1, p - 1))
                        }
                        disabled={pageMahasiswaModal === 1}
                        className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                      >
                        Prev
                      </button>
                      {Array.from(
                        {
                          length: Math.ceil(
                            showMahasiswaModal.mahasiswa.length / 5
                          ),
                        },
                        (_, i) => (
                          <button
                            key={i}
                            onClick={() => setPageMahasiswaModal(i + 1)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 ${
                              pageMahasiswaModal === i + 1
                                ? "bg-brand-500 text-white"
                                : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            } transition`}
                          >
                            {i + 1}
                          </button>
                        )
                      )}
                      <button
                        onClick={() =>
                          setPageMahasiswaModal((p) =>
                            Math.min(
                              Math.ceil(
                                showMahasiswaModal.mahasiswa.length / 5
                              ),
                              p + 1
                            )
                          )
                        }
                        disabled={
                          pageMahasiswaModal ===
                          Math.ceil(showMahasiswaModal.mahasiswa.length / 5)
                        }
                        className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                      >
                        Next
                      </button>
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
    </div>
  );
} 