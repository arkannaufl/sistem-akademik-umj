import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faClock,
  faCheck,
  faTimes,
  faBookOpen,
  faBell,
  faGraduationCap,
  faFlask,
  faCalendarAlt,
  faFileAlt,
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle,
  faInfoCircle,
  faUsers,
  faChevronDown,
  faChevronUp,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router";
import api from "../utils/api";

interface JadwalItem {
  id: number;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  durasi: number;
  materi: string;
  pengampu: string;
  topik?: string;
  lokasi?: string;
  ruangan?: string;
  status_konfirmasi: "belum_konfirmasi" | "bisa" | "tidak_bisa";
  created_at: string;
}

interface JadwalPBL extends JadwalItem {
  mata_kuliah_kode: string;
  mata_kuliah_nama: string;
  modul_ke: string;
  nama_modul: string;
  tipe_pbl: string;
  kelompok: string;
  x50: number;
}

interface JadwalJurnal extends JadwalItem {
  kelompok: string;
  topik: string;
  file_jurnal: string;
}

interface JadwalKuliahBesar extends JadwalItem {
  topik: string;
}

interface JadwalPraktikum extends JadwalItem {
  kelas: string;
  topik: string;
}

interface JadwalAgendaKhusus extends JadwalItem {
  agenda: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_read: boolean;
  created_at: string;
  jadwal_type?: string;
  jadwal_id?: number;
  data?: {
    blok?: number;
    semester?: string;
    tipe_peran?: string;
    mata_kuliah_kode?: string;
    mata_kuliah_nama?: string;
    moduls?: Array<{
      modul_ke: string;
      nama_modul: string;
      pbl_id: number;
    }>;
    total_kelompok?: number;
    periode?: string;
    durasi?: string;
  };
}

interface PBLAssignment {
  pbl_id: number;
  modul_ke: string;
  nama_modul: string;
  tipe_peran: string;
  peran_display: string;
  waktu: string;
  durasi_modul: string;
}

interface BlokAssignment {
  blok: number;
  semester: number;
  semester_type: 'ganjil' | 'genap';
  mata_kuliah: {
    kode: string;
    nama: string;
    periode: string;
    durasi: string;
  };
  pbl_assignments: PBLAssignment[];
  total_pbl: number;
  status: string;
  semester_display?: string; // For displaying semester range
}

// Skeleton Loading Components
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-300 dark:bg-gray-600"></div>
        <div>
          <div className="h-5 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
      <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
    </div>
    <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
    <div className="flex items-center gap-2 text-sm">
      <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
      <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
    </div>
  </div>
);

const SkeletonNotification = () => (
  <div className="group relative bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-pulse">
    <div className="flex items-start gap-4">
      {/* Avatar Skeleton */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700"></div>
      </div>
      
      {/* Content Skeleton */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="h-5 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
          <div className="h-3 w-1/2 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="opacity-0">
            <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SkeletonTable = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3].map((row) => (
            <tr key={row}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((cell) => (
                <td key={cell} className="px-6 py-4">
                  <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SkeletonHeader = () => (
  <div className="mb-8 animate-pulse">
    <div className="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
    <div className="h-5 w-80 bg-gray-300 dark:bg-gray-600 rounded"></div>
  </div>
);

const SkeletonFilter = () => (
  <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
    <div className="flex gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 w-32 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
      ))}
    </div>
  </div>
);

export default function DashboardDosen() {
  const navigate = useNavigate();
  const [jadwalPBL, setJadwalPBL] = useState<JadwalPBL[]>([]);
  const [jadwalKuliahBesar] = useState<JadwalKuliahBesar[]>([]);
  const [jadwalPraktikum] = useState<JadwalPraktikum[]>([]);
  const [jadwalAgendaKhusus] = useState<JadwalAgendaKhusus[]>([]);
  const [jadwalJurnal] = useState<JadwalJurnal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSemester, setActiveSemester] = useState<'ganjil' | 'genap' | 'all'>('ganjil');
  const [expandedBlok, setExpandedBlok] = useState<number | null>(null);
  const [mataKuliahData, setMataKuliahData] = useState<{ [kode: string]: any }>({});
  const [blokAssignments, setBlokAssignments] = useState<BlokAssignment[]>([]);
  const [loadingBlok, setLoadingBlok] = useState(true);

  // Fungsi untuk mengambil data mata kuliah berdasarkan kode
  const fetchMataKuliahData = async (kode: string) => {
    if (mataKuliahData[kode]) return mataKuliahData[kode];
    
    try {
      const response = await api.get(`/mata-kuliah/${kode}`);
      const data = response.data;
      setMataKuliahData(prev => ({ ...prev, [kode]: data }));
      return data;
    } catch (error) {
      return null;
    }
  };

  // Fungsi untuk mendapatkan semester dari mata kuliah
  const getSemesterFromMataKuliah = (kode: string) => {
    return mataKuliahData[kode]?.semester || null;
  };

  // Check if user is dosen
  useEffect(() => {
    const getUser = () => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}");
      } catch {
        return {};
      }
    };

    const userData = getUser();
    
    if (!userData.id) {
      navigate("/signin");
      return;
    }

    if (userData.role !== "dosen") {
      navigate("/");
      return;
    }
  }, [navigate]);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const userData = getUser();
    if (userData?.role === "dosen") {
      fetchDashboardData();
    }
  }, []);

  // Ambil data mata kuliah untuk semua notifikasi
  useEffect(() => {
    if (notifications.length > 0) {
      notifications.forEach(notification => {
        if (notification.data?.mata_kuliah_kode) {
          fetchMataKuliahData(notification.data.mata_kuliah_kode);
        }
      });
    }
  }, [notifications]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const userData = getUser();
      
      // Fetch semua jenis jadwal untuk dosen ini
      const [jadwalResponse, notifResponse, blokResponse] = await Promise.all([
        api.get(`/jadwal-pbl/dosen/${userData?.id}`),
        api.get(`/notifications/dosen/${userData?.id}`),
        api.get(`/dosen/${userData?.id}/pbl-assignments`)
      ]);

      setJadwalPBL(jadwalResponse.data.data || []);
      setNotifications(notifResponse.data || []);
      const blokData = blokResponse.data.data || [];
      setBlokAssignments(blokData);



    } catch (error: any) {
      setError("Gagal memuat data dashboard");
    } finally {
      setLoading(false);
      setLoadingBlok(false);
    }
  };

  const handleKonfirmasi = async (jadwalId: number, status: "bisa" | "tidak_bisa", jadwalType: string) => {
    try {
      // Update status konfirmasi berdasarkan jenis jadwal
      let endpoint = '';
      switch (jadwalType) {
        case 'pbl':
          endpoint = `/jadwal-pbl/${jadwalId}/konfirmasi`;
          break;
        case 'kuliah_besar':
          endpoint = `/jadwal-kuliah-besar/${jadwalId}/konfirmasi`;
          break;
        case 'praktikum':
          endpoint = `/jadwal-praktikum/${jadwalId}/konfirmasi`;
          break;
        case 'agenda_khusus':
          endpoint = `/jadwal-agenda-khusus/${jadwalId}/konfirmasi`;
          break;
        case 'jurnal':
          endpoint = `/jadwal-jurnal/${jadwalId}/konfirmasi`;
          break;
        default:
          endpoint = `/jadwal-pbl/${jadwalId}/konfirmasi`;
      }

      await api.put(endpoint, { status });

      // Refresh data
      fetchDashboardData();
      
      // Tampilkan notifikasi sukses
      setNotifications(prev => [...prev, {
        id: Date.now(),
        title: "Konfirmasi Berhasil",
        message: `Jadwal berhasil dikonfirmasi: ${status === 'bisa' ? 'Bisa' : 'Tidak Bisa'}`,
        type: "success",
        is_read: false,
        created_at: new Date().toISOString()
      }]);

    } catch (error: any) {
      setError("Gagal mengkonfirmasi jadwal");
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error: any) {
      // Handle error silently
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete(`/notifications/dosen/${getUser()?.id}/clear-all`);
      setNotifications([]);
    } catch (error: any) {
      // Handle error silently
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      // Handle error silently
    }
  };

  const toggleBlokExpansion = (blokNumber: number) => {
    setExpandedBlok(expandedBlok === blokNumber ? null : blokNumber);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "bisa":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-700">
            <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1" />
            Bisa
          </span>
        );
      case "tidak_bisa":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-700">
            <FontAwesomeIcon icon={faTimesCircle} className="w-3 h-3 mr-1" />
            Tidak Bisa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700">
            <FontAwesomeIcon icon={faQuestionCircle} className="w-3 h-3 mr-1" />
            Belum Konfirmasi
          </span>
        );
    }
  };

  const renderJadwalTable = (
    title: string,
    icon: any,
    data: any[],
    columns: string[],
    jadwalType: string,
    emptyMessage: string
  ) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FontAwesomeIcon icon={icon} className="text-blue-500" />
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <FontAwesomeIcon icon={icon} className="text-4xl mb-2 block mx-auto" />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.tanggal}
                  </td>
                  {jadwalType === 'praktikum' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.kelas}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.waktu_mulai}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.durasi} menit
                  </td>
                  {jadwalType === 'agenda_khusus' ? (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.agenda}
                    </td>
                  ) : (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.materi}
                    </td>
                  )}
                  {jadwalType === 'pbl' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.tipe_pbl}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.x50}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.nama_modul}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.kelompok}
                      </td>
                    </>
                  )}
                  {jadwalType === 'jurnal' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.x50}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.kelompok}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.topik}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <a href={item.file_jurnal} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          Download
                        </a>
                      </td>
                    </>
                  )}
                  {jadwalType !== 'pbl' && jadwalType !== 'jurnal' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.topik}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.pengampu}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.lokasi || item.ruangan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status_konfirmasi)}
                      {item.status_konfirmasi === "belum_konfirmasi" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleKonfirmasi(item.id, "bisa", jadwalType)}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                            title="Konfirmasi Bisa"
                          >
                            <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleKonfirmasi(item.id, "tidak_bisa", jadwalType)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                            title="Konfirmasi Tidak Bisa"
                          >
                            <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        {/* Header Skeleton */}
        <SkeletonHeader />
        
        {/* Notifications Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-6 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div className="h-4 w-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonNotification key={i} />
            ))}
          </div>
        </div>

        {/* Blok Saya Section Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
          
          <SkeletonFilter />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>

        {/* Tables Skeleton */}
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonTable key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Filter blok assignments berdasarkan semester yang aktif dan deduplikasi berdasarkan blok
  const filteredBlokAssignments = blokAssignments.filter(blok => {
    if (activeSemester === 'all') return true;
    const matches = blok.semester_type === activeSemester;
    return matches;
  });

  // Tidak perlu deduplikasi karena blok yang sama bisa ada di semester yang berbeda
  const uniqueBlokAssignments = filteredBlokAssignments;

  // Group blok assignments by semester type and semester number
  const groupedBlokAssignments = uniqueBlokAssignments.reduce((acc, blok) => {
    const semesterKey = blok.semester_type;
    if (!acc[semesterKey]) {
      acc[semesterKey] = [];
    }
    
    // Check if blok with same number already exists in this semester type
    const existingBlokIndex = acc[semesterKey].findIndex(existing => existing.blok === blok.blok);
    
    if (existingBlokIndex === -1) {
      // If no existing blok with same number, add it
      acc[semesterKey].push(blok);
    } else {
      // If blok with same number exists in the same semester type, merge the PBL assignments
      const existingBlok = acc[semesterKey][existingBlokIndex];
      existingBlok.pbl_assignments = [...existingBlok.pbl_assignments, ...blok.pbl_assignments];
      existingBlok.total_pbl = existingBlok.pbl_assignments.length;
      
      // Update semester display info to show range if different
      if (existingBlok.semester !== blok.semester) {
        if (existingBlok.semester_display) {
          // If already has display, add the new semester
          const semesters = existingBlok.semester_display.split(', ');
          if (!semesters.includes(blok.semester.toString())) {
            existingBlok.semester_display = `${existingBlok.semester_display}, ${blok.semester}`;
          }
        } else {
          existingBlok.semester_display = `${existingBlok.semester}, ${blok.semester}`;
        }
      }
    }
    
    return acc;
  }, {} as { [key: string]: BlokAssignment[] });

  // Deduplikasi PBL assignments berdasarkan pbl_id setelah penggabungan blok
  Object.values(groupedBlokAssignments).forEach(semesterBloks => {
    semesterBloks.forEach(blok => {
      const uniqueAssignments = blok.pbl_assignments.reduce((acc, assignment) => {
        if (!acc.find(a => a.pbl_id === assignment.pbl_id)) {
          acc.push(assignment);
        }
        return acc;
      }, [] as PBLAssignment[]);
      blok.pbl_assignments = uniqueAssignments;
      blok.total_pbl = uniqueAssignments.length;
    });
  });

  // Sort blok assignments by blok number for each semester
  Object.keys(groupedBlokAssignments).forEach(semesterKey => {
    groupedBlokAssignments[semesterKey].sort((a, b) => a.blok - b.blok);
  });



  // Get blok color based on blok number
  const getBlokColor = (blokNumber: number) => {
    switch (blokNumber) {
      case 1: return 'bg-blue-500';
      case 2: return 'bg-green-500';
      case 3: return 'bg-purple-500';
      case 4: return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Get blok hover color
  const getBlokHoverColor = (blokNumber: number) => {
    switch (blokNumber) {
      case 1: return 'group-hover:bg-blue-600';
      case 2: return 'group-hover:bg-green-600';
      case 3: return 'group-hover:bg-purple-600';
      case 4: return 'group-hover:bg-orange-600';
      default: return 'group-hover:bg-gray-600';
    }
  };

  // Get blok text hover color
  const getBlokTextHoverColor = (blokNumber: number) => {
    switch (blokNumber) {
      case 1: return 'group-hover:text-blue-600 dark:group-hover:text-blue-400';
      case 2: return 'group-hover:text-green-600 dark:group-hover:text-green-400';
      case 3: return 'group-hover:text-purple-600 dark:group-hover:text-purple-400';
      case 4: return 'group-hover:text-orange-600 dark:group-hover:text-orange-400';
      default: return 'group-hover:text-gray-600 dark:group-hover:text-gray-400';
    }
  };

  // Get blok icon color
  const getBlokIconColor = (blokNumber: number) => {
    switch (blokNumber) {
      case 1: return 'text-blue-500';
      case 2: return 'text-green-500';
      case 3: return 'text-purple-500';
      case 4: return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  // Get blok arrow color
  const getBlokArrowColor = (blokNumber: number) => {
    switch (blokNumber) {
      case 1: return 'text-blue-500';
      case 2: return 'text-green-500';
      case 3: return 'text-purple-500';
      case 4: return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard Dosen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Selamat datang, {getUser()?.name}! Kelola jadwal dan notifikasi Anda di sini.
        </p>
      </div>

      {/* Modern Notifications Section */}
      {notifications.length > 0 ? (
        <div className="mb-8 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="relative">
                <FontAwesomeIcon icon={faBell} className="text-blue-500 text-xl" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </div>
              Notifikasi Terbaru
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({notifications.length} total)
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllNotifications}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-lg transition-colors"
              >
                Hapus Semua
              </button>
            </div>
          </div>
          
          {/* Notification Grid - Show only first 6 in a compact layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {notifications.slice(0, 6).map((notification, index) => (
              <div
                key={notification.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                  notification.is_read
                    ? "border-gray-200 dark:border-gray-700 opacity-75"
                    : "border-blue-200 dark:border-blue-700"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-3">
                  {/* Notification Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'warning' ? 'bg-yellow-500' :
                        notification.type === 'error' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        notification.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        notification.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {notification.type === 'success' ? 'Sukses' :
                         notification.type === 'warning' ? 'Peringatan' :
                         notification.type === 'error' ? 'Error' :
                         'Info'}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-full transition-colors"
                      title="Hapus notifikasi"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Notification Content */}
                  <div 
                    className="cursor-pointer"
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <h4 className={`font-medium mb-1 text-sm ${
                      notification.is_read 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {notification.data && notification.data.blok ? 
                        `🎯 Assignment PBL Baru - Blok ${notification.data.blok} Semester ${getSemesterFromMataKuliah(notification.data.mata_kuliah_kode || '') || notification.data.semester || '?'}` :
                        notification.title
                      }
                    </h4>

                    {/* Message dihapus sesuai permintaan user */}
                    
                    {/* Consolidated Notification Details */}
                    {notification.data && notification.data.blok && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400">📚</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {notification.data.mata_kuliah_nama}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400">🎯</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {notification.data.tipe_peran}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400">📊</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {notification.data.moduls?.length || 0} Modul
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400">👥</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {notification.data.total_kelompok || 0} Kelompok
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400">⏱️</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {notification.data.durasi || '8 Minggu'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Expandable Modul Details */}
                        {notification.data.moduls && notification.data.moduls.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                              📋 Lihat Detail Modul ({notification.data.moduls.length})
                            </summary>
                            <div className="mt-2 space-y-1">
                              {notification.data.moduls.map((modul, idx) => (
                                <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-600/50 rounded px-2 py-1 border border-gray-200 dark:border-gray-500">
                                  <span className="font-medium">{modul.modul_ke}:</span> {modul.nama_modul}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                    {/* Notification Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {!notification.is_read && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded-full animate-pulse">
                          Baru
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show "View More" if there are more than 6 notifications */}
          {notifications.length > 6 && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                <FontAwesomeIcon icon={faBell} className="text-gray-500" />
                <span className="text-sm font-medium">
                  Lihat {notifications.length - 6} notifikasi lainnya
                </span>
                <FontAwesomeIcon icon={faChevronDown} className="text-gray-500 w-3 h-3" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <FontAwesomeIcon icon={faBell} className="text-2xl text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Tidak Ada Notifikasi
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Anda tidak memiliki notifikasi baru saat ini. Semua jadwal sudah dikonfirmasi.
            </p>
          </div>
        </div>
      )}

      {/* Blok Saya Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
              <FontAwesomeIcon icon={faBookOpen} className="text-white text-lg" />
            </div>
            Blok Saya
              </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Live Status</span>
          </div>
        </div>

        {/* Filter Semester */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter Semester:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSemester('ganjil')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeSemester === 'ganjil'
                  ? 'bg-blue-500 text-white shadow-md scale-105'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={faGraduationCap} className="mr-2" />
              Semester Ganjil
            </button>
            <button
              onClick={() => setActiveSemester('genap')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeSemester === 'genap'
                  ? 'bg-green-500 text-white shadow-md scale-105'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={faGraduationCap} className="mr-2" />
              Semester Genap
            </button>
            <button
              onClick={() => setActiveSemester('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeSemester === 'all'
                  ? 'bg-purple-500 text-white shadow-md scale-105'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={faEye} className="mr-2" />
              Semua Semester
            </button>
          </div>
        </div>
        
        {/* Loading State for Blok */}
        {loadingBlok ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Render Blok Assignments */}
            {Object.entries(groupedBlokAssignments).map(([semesterType, bloks]) => (
              <div key={semesterType} className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-6 h-6 rounded-lg ${
                    semesterType === 'ganjil' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                      : 'bg-gradient-to-r from-green-500 to-orange-500'
                  } flex items-center justify-center`}>
                    <FontAwesomeIcon icon={faGraduationCap} className="text-white text-xs" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Semester {semesterType === 'ganjil' ? 'Ganjil' : 'Genap'}
                  </h3>
                  <div className={`flex-1 h-px ${
                    semesterType === 'ganjil'
                      ? 'bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-700 dark:to-purple-700'
                      : 'bg-gradient-to-r from-green-200 to-orange-200 dark:from-green-700 dark:to-orange-700'
                  }`}></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bloks.map((blok) => (
                    <div 
                      key={`${blok.blok}-${blok.semester_type}-${blok.semester}`}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
                      onClick={() => toggleBlokExpansion(blok.blok)}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${getBlokColor(blok.blok)} flex items-center justify-center ${getBlokHoverColor(blok.blok)} transition-colors`}>
                              <span className="text-white text-lg font-bold">{blok.blok}</span>
                            </div>
                            <div>
                              <h3 className={`text-lg font-semibold text-gray-900 dark:text-white transition-colors ${getBlokTextHoverColor(blok.blok)}`}>
                                Blok {blok.blok}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Semester {blok.semester_type === 'ganjil' ? 'Ganjil' : 'Genap'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-700">
                              ✅ Generate
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faBookOpen} className={getBlokIconColor(blok.blok)} />
                          <span>{blok.total_pbl} Modul PBL</span>
                          <FontAwesomeIcon 
                            icon={expandedBlok === blok.blok ? faChevronUp : faChevronDown} 
                            className={`ml-auto group-hover:scale-110 transition-transform ${getBlokArrowColor(blok.blok)}`} 
                          />
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <FontAwesomeIcon icon={faCalendar} className="text-blue-400" />
                            <span>{blok.mata_kuliah.periode}</span>
                            <span className="mx-2">•</span>
                            <FontAwesomeIcon icon={faClock} className="text-blue-400" />
                            <span>{blok.mata_kuliah.durasi}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Empty State */}
            {Object.keys(groupedBlokAssignments).length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FontAwesomeIcon icon={faBookOpen} className="text-4xl text-gray-400" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Belum Ada Assignment Modul PBL
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Anda belum memiliki assignment Modul PBL untuk semester yang dipilih. 
                  Assignment akan muncul setelah admin melakukan generate PBL.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" />
                  <span className="text-sm font-medium">Menunggu Assignment</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Expandable PBL Detail Section */}
        {expandedBlok && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    expandedBlok === 1 ? 'bg-blue-500' :
                    expandedBlok === 2 ? 'bg-green-500' :
                    expandedBlok === 3 ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`}>
                    <span className="text-white text-sm font-bold">{expandedBlok}</span>
                  </div>
                  🎯 Blok {expandedBlok} - Detail PBL Assignment
                </h3>
                          <button
                  onClick={() => setExpandedBlok(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors p-2 rounded-lg"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
            
            {/* PBL Detail Content */}
            <div className="p-6">
              {(() => {
                // Find the blok assignment data for the expanded blok from grouped data
                const blokData = Object.values(groupedBlokAssignments)
                  .flat()
                  .find(blok => blok.blok === expandedBlok);
                
                if (blokData) {
                  return (
                    <div className="space-y-6">
                      {/* Mata Kuliah Info */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBookOpen} className="text-white" />
                          </div>
                          Informasi Mata Kuliah
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">📚 Nama:</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{blokData.mata_kuliah.nama}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">🏷️ Kode:</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{blokData.mata_kuliah.kode}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">📅 Periode:</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{blokData.mata_kuliah.periode}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">⏱️ Durasi:</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{blokData.mata_kuliah.durasi}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">📚 Total Modul PBL:</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{blokData.total_pbl} Modul PBL</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">🎓 Semester:</span>
                            <span className="text-gray-900 dark:text-white font-semibold">
                              Semester {blokData.semester_type === 'ganjil' ? 'Ganjil' : 'Genap'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PBL Assignments */}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                            <FontAwesomeIcon icon={faGraduationCap} className="text-white" />
                          </div>
                          Modul PBL Assignments
                        </h4>
                        <div className="space-y-4">
                          {blokData.pbl_assignments.map((assignment) => (
                            <div key={assignment.pbl_id} className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-600 transition-all duration-200 group">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-semibold text-gray-900 dark:text-white text-lg">
                                  {assignment.modul_ke}: {assignment.nama_modul}
                                </h5>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  assignment.tipe_peran === 'koordinator' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                                    : assignment.tipe_peran === 'tim_blok'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-700'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700'
                                }`}>
                                  {assignment.peran_display}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faBookOpen} className="text-blue-500 w-4 h-4" />
                                  <span className="text-gray-600 dark:text-gray-400">Modul PBL:</span>
                                  <span className="text-gray-900 dark:text-white font-medium">{assignment.modul_ke}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faCalendar} className="text-green-500 w-4 h-4" />
                                  <span className="text-gray-600 dark:text-gray-400">Semester:</span>
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    Semester {blokData.semester_type === 'ganjil' ? 'Ganjil' : 'Genap'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faUsers} className="text-purple-500 w-4 h-4" />
                                  <span className="text-gray-600 dark:text-gray-400">Peran:</span>
                                  <span className="text-gray-900 dark:text-white font-medium">{assignment.tipe_peran.replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faClock} className="text-indigo-500 w-4 h-4" />
                                  <span className="text-gray-600 dark:text-gray-400">Waktu:</span>
                                  <span className="text-gray-900 dark:text-white font-medium">{assignment.waktu}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faCalendarAlt} className="text-red-500 w-4 h-4" />
                                  <span className="text-gray-600 dark:text-gray-400">Durasi:</span>
                                  <span className="text-gray-900 dark:text-white font-medium">{assignment.durasi_modul}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faGraduationCap} className="text-orange-500 w-4 h-4" />
                                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                  <span className="text-gray-900 dark:text-white font-medium">Active</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <FontAwesomeIcon icon={faBookOpen} className="text-4xl text-gray-400" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                        Blok {expandedBlok} - Tidak Ada Data
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Blok {expandedBlok} belum memiliki assignment Modul PBL yang dapat ditampilkan.
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-gray-500" />
                        <span className="text-sm font-medium">Tidak Ada Assignment Modul PBL</span>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        )}
        </div>

      {/* Jadwal Tables */}
      <div className="space-y-6">
        {/* Kuliah Besar */}
        {renderJadwalTable(
          "Kuliah Besar",
          faGraduationCap,
          jadwalKuliahBesar,
          ["NO", "HARI/TANGGAL", "PUKUL", "WAKTU", "MATERI", "PENGAMPU", "TOPIK", "LOKASI", "AKSI"],
          "kuliah_besar",
          "Tidak ada data Kuliah Besar"
        )}

        {/* Praktikum */}
        {renderJadwalTable(
          "Praktikum",
          faFlask,
          jadwalPraktikum,
          ["NO", "HARI/TANGGAL", "KELAS", "PUKUL", "WAKTU", "MATERI", "PENGAMPU", "TOPIK", "LOKASI", "AKSI"],
          "praktikum",
          "Tidak ada data Praktikum"
        )}

        {/* Agenda Khusus */}
        {renderJadwalTable(
          "Agenda Khusus",
          faCalendarAlt,
          jadwalAgendaKhusus,
          ["NO", "HARI/TANGGAL", "PUKUL", "WAKTU", "AGENDA", "RUANGAN", "AKSI"],
          "agenda_khusus",
          "Tidak ada data Agenda Khusus"
        )}

        {/* PBL */}
        {renderJadwalTable(
          "PBL",
          faBookOpen,
          jadwalPBL,
          ["NO", "HARI/TANGGAL", "TIPE PBL", "PUKUL", "X 50", "MODUL", "KELOMPOK", "PENGAMPU", "RUANGAN", "AKSI"],
          "pbl",
          "Tidak ada data PBL"
        )}

        {/* Jurnal Reading */}
        {renderJadwalTable(
          "Jurnal Reading",
          faFileAlt,
          jadwalJurnal,
          ["NO", "HARI/TANGGAL", "PUKUL", "X 50", "KELOMPOK", "TOPIK", "PENGAMPU", "FILE JURNAL", "RUANGAN", "AKSI"],
          "jurnal",
          "Tidak ada data Jurnal Reading"
        )}
      </div>
    </div>
  );
} 
