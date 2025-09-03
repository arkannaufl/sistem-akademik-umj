import { useMemo, useState, memo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

type MataKuliah = {
  kode: string;
  nama: string;
  semester: number;
  jenis: "Blok" | "Non Blok";
  tanggalMulai: string;
  tanggalAkhir: string;
  tanggal_mulai?: string;
  tanggal_akhir?: string;
  blok?: number; 
  tipe_non_block?: 'CSR' | 'Non-CSR';
};

type CSR = {
  id: number;
  mata_kuliah_kode: string;
  nomor_csr: string;
  nama: string;
  keahlian?: string;
  tanggal_mulai: string;
  tanggal_akhir: string;
};

type Kegiatan = {
  id: number;
  nama: string;
  tanggal_mulai: string;
  tanggal_akhir: string;
  warna: string;
};

type Holiday = {
  holiday_date: string;
  holiday_name: string;
  is_national_holiday: boolean;
};

interface PetaAkademikProps {
  data: MataKuliah[];
  holidays: Holiday[];
  kegiatan: Kegiatan[];
  onKegiatanAdded: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
}

const tailwindColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

const blokColors = [
  'bg-blue-500',    // Blok 1
  'bg-yellow-400',  // Blok 2
  'bg-pink-400',    // Blok 3
  'bg-green-400',   // Blok 4
];

const csrColors = [
  'bg-emerald-600', // CSR 1
  'bg-teal-600',    // CSR 2
  'bg-cyan-600',    // CSR 3
  'bg-sky-600',     // CSR 4
];

const nonBlokColor = 'bg-gray-500';

const availableKegiatanColors = [
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Violet', value: 'bg-violet-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Amber', value: 'bg-amber-600' },
  { name: 'Lime', value: 'bg-lime-600' },
  { name: 'Emerald', value: 'bg-emerald-600' },
  { name: 'Sky', value: 'bg-sky-600' },
  { name: 'Fuchsia', value: 'bg-fuchsia-600' },
  { name: 'Rose', value: 'bg-rose-600' },
  { name: 'Stone', value: 'bg-stone-500' },
  { name: 'Zinc', value: 'bg-zinc-500' },
  { name: 'Yellow', value: 'bg-yellow-600' },
  { name: 'Pink', value: 'bg-pink-600' },
  { name: 'Green', value: 'bg-green-700' },
  { name: 'Blue', value: 'bg-blue-700' },
  { name: 'Cyan Dark', value: 'bg-cyan-700' },
  { name: 'Indigo Dark', value: 'bg-indigo-700' },
  { name: 'Violet Dark', value: 'bg-violet-700' },
  { name: 'Purple Dark', value: 'bg-purple-700' },
  { name: 'Fuchsia Dark', value: 'bg-fuchsia-700' },
  { name: 'Rose Dark', value: 'bg-rose-700' },
  { name: 'Stone Dark', value: 'bg-stone-700' },
  { name: 'Zinc Dark', value: 'bg-zinc-700' },
];

const kegiatanColorHighlightMap: Record<string, string> = {
  'bg-orange-500': 'bg-orange-500/20',
  'bg-teal-500': 'bg-teal-500/20',
  'bg-cyan-500': 'bg-cyan-500/20',
  'bg-indigo-500': 'bg-indigo-500/20',
  'bg-violet-500': 'bg-violet-500/20',
  'bg-purple-500': 'bg-purple-500/20',
  'bg-amber-600': 'bg-amber-600/20',
  'bg-lime-600': 'bg-lime-600/20',
  'bg-emerald-600': 'bg-emerald-600/20',
  'bg-sky-600': 'bg-sky-600/20',
  'bg-fuchsia-600': 'bg-fuchsia-600/20',
  'bg-rose-600': 'bg-rose-600/20',
  'bg-stone-500': 'bg-stone-500/20',
  'bg-zinc-500': 'bg-zinc-500/20',
  'bg-yellow-600': 'bg-yellow-600/20',
  'bg-pink-600': 'bg-pink-600/20',
  'bg-green-700': 'bg-green-700/20',
  'bg-blue-700': 'bg-blue-700/20',
  'bg-cyan-700': 'bg-cyan-700/20',
  'bg-indigo-700': 'bg-indigo-700/20',
  'bg-violet-700': 'bg-violet-700/20',
  'bg-purple-700': 'bg-purple-700/20',
  'bg-fuchsia-700': 'bg-fuchsia-700/20',
  'bg-rose-700': 'bg-rose-700/20',
  'bg-stone-700': 'bg-stone-700/20',
  'bg-zinc-700': 'bg-zinc-700/20',
};

// Helper to get day difference
const dayDiff = (d1: Date, d2: Date) => {
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper to calculate weeks
const getWeeksCount = (startDate: Date, endDate: Date) => {
  const days = dayDiff(startDate, endDate) + 1;
  return Math.ceil(days / 7);
};

// Helper to format course display text for the bar
const formatCourseBarText = (course: MataKuliah | any) => {
  if (course.jenis === 'Blok' && course.blok) {
    return `Blok ${course.blok}: ${course.nama}`;
  }
  if (course.jenis === 'CSR' && course.csr_number && course.parent_course) {
    // Gunakan nama CSR (course.nama) jika ada, jika tidak beri keterangan
    const namaCsr = course.nama && course.nama.trim() !== "" ? course.nama : "(Belum diisi nama CSR)";
    return `CSR ${course.parent_course.semester}.${course.csr_number}: ${namaCsr}`;
  }
  if (course.jenis === 'Non Blok') {
    return `Non Blok : ${course.nama}`;
  }
  return course.nama;
};

// Helper to format course tooltip
const formatCourseTooltip = (course: MataKuliah | any) => {
  const startDate = new Date(course.tanggalMulai || course.tanggal_mulai || '');
  const endDate = new Date(course.tanggalAkhir || course.tanggal_akhir || '');
  const weeks = getWeeksCount(startDate, endDate);

  const startStr = startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const endStr = endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let courseName = course.nama;
  let courseType = course.jenis;
  let nomorCsr = '';
  
  if (course.jenis === 'CSR' && course.parent_course) {
    courseName = course.parent_course.nama;
    courseType = `CSR ${course.parent_course.semester}.${course.csr_number}`;
    nomorCsr = course.nomor_csr ? `Nomor CSR: ${course.nomor_csr}` : '';
  }

  const details = [
    `Mata Kuliah: ${courseName} (${course.kode})`,
    `Semester: ${course.semester}`,
    `Jenis: ${courseType}${course.jenis === 'Blok' && course.blok ? ` (Blok ${course.blok})` : ''}`,
    nomorCsr,
    `Jadwal: ${startStr} - ${endStr}`,
    `Durasi: ${weeks} minggu`
  ].filter(Boolean);
  
  return details.join('\n');
};

interface AddKegiatanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKegiatanAdded: () => void;
  availableColors?: { name: string; value: string }[];
  kegiatan: Kegiatan[];
}

const AddKegiatanModal = ({ isOpen, onClose, onKegiatanAdded, availableColors = [], kegiatan }: AddKegiatanModalProps) => {
  const [nama, setNama] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalAkhir, setTanggalAkhir] = useState('');
  const [warna, setWarna] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  useEffect(() => {
    if (tanggalMulai && tanggalAkhir && new Date(tanggalAkhir) < new Date(tanggalMulai)) {
      setDateError("Tanggal akhir tidak boleh lebih awal dari tanggal mulai.");
    } else {
      setDateError(null);
    }
  }, [tanggalMulai, tanggalAkhir]);

  useEffect(() => {
    setOverlapError(null);
    if (tanggalMulai && tanggalAkhir && kegiatan.length > 0) {
      const newStart = new Date(tanggalMulai);
      const newEnd = new Date(tanggalAkhir);

      const isOverlapping = kegiatan.some(k => {
        const existingStart = new Date(k.tanggal_mulai);
        const existingEnd = new Date(k.tanggal_akhir);
        return newStart <= existingEnd && existingStart <= newEnd;
      });

      if (isOverlapping) {
        setOverlapError("Tanggal kegiatan tidak boleh bentrok dengan kegiatan yang sudah ada.");
      }
    }
  }, [tanggalMulai, tanggalAkhir, kegiatan]);

  useEffect(() => {
    if (isOpen) {
      setNama('');
      setTanggalMulai('');
      setTanggalAkhir('');
      setWarna(availableColors.length > 0 ? availableColors[0].value : '');
      setError(null);
      setDateError(null);
      setOverlapError(null);
    }
  }, [isOpen, availableColors]);

  const isFormValid = nama && tanggalMulai && tanggalAkhir && warna;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || dateError || overlapError) {
      setError(dateError || overlapError || "Silakan periksa kembali isian Anda.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/kegiatan', {
        nama,
        tanggal_mulai: tanggalMulai,
        tanggal_akhir: tanggalAkhir,
        warna,
      });
      
      onKegiatanAdded();
      onClose();
      // Reset form
      setNama('');
      setTanggalMulai('');
      setTanggalAkhir('');
      setWarna(availableColors.length > 0 ? availableColors[0].value : '');
    } catch (err) {
      setError('Gagal menambahkan kegiatan. Silakan coba lagi.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-xl mx-auto bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor"/>
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Tambah Kegiatan Baru</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama Kegiatan</label>
                  <input type="text" id="nama" value={nama} onChange={e => setNama(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tanggalMulai" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal Mulai</label>
                    <input type="date" id="tanggalMulai" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"/>
                  </div>
                  <div>
                    <label htmlFor="tanggalAkhir" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal Akhir</label>
                    <input type="date" id="tanggalAkhir" value={tanggalAkhir} onChange={e => setTanggalAkhir(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"/>
                  </div>
                </div>
                {(dateError || overlapError) && (
                  <div className="text-sm text-red-500 bg-red-100 p-2 rounded-md">
                    {dateError || overlapError}
                  </div>
                )}
                <div>
                  <label htmlFor="warna" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Highlight Warna</label>
                  <div className="mt-2 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
                    {availableColors.map(color => (
                      <button key={color.value} type="button" onClick={() => setWarna(color.value)} className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${color.value} ${warna === color.value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-brand-500' : ''}`} title={color.name}></button>
                    ))}
                  </div>
                </div>
              </div>
              {error && <p className="mt-4 text-sm text-red-500 bg-red-100 rounded-md p-2">{error}</p>}
              <div className="flex justify-end gap-3 pt-8">
                <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">Batal</button>
                <button type="submit" disabled={!isFormValid || !!dateError || !!overlapError || isSubmitting} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition ${!isFormValid || !!dateError || !!overlapError || isSubmitting ? 'bg-brand-500/50 text-white cursor-not-allowed' : 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600'}`}>
                  {isSubmitting ? (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      Menyimpan...
                    </>
                  ) : 'Simpan'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const generateLayout = (courses: (MataKuliah | any)[]) => {
  const coursesBySemester = new Map<number, (MataKuliah | any)[]>();
  courses.forEach(course => {
    if (!coursesBySemester.has(course.semester)) {
      coursesBySemester.set(course.semester, []);
    }
    coursesBySemester.get(course.semester)?.push(course);
  });

  const semesterLayouts = new Map<number, { lanes: (MataKuliah | any)[][] }>();
  coursesBySemester.forEach((semesterCourses, semester) => {
    // Separate courses by type: Blok, Non Blok, CSR
    const blokCourses = semesterCourses.filter(c => c.jenis === 'Blok');
    const nonBlokCourses = semesterCourses.filter(c => c.jenis === 'Non Blok');
    const csrCourses = semesterCourses.filter(c => c.jenis === 'CSR');

    const allLanes: (MataKuliah | any)[][] = [];

    // Process Blok courses
    if (blokCourses.length > 0) {
      const sortedBlokCourses = [...blokCourses].sort((a, b) => {
        const aStart = new Date(a.tanggalMulai || a.tanggal_mulai || '');
        const bStart = new Date(b.tanggalMulai || b.tanggal_mulai || '');
        return aStart.getTime() - bStart.getTime();
      });

      const blokLanes: { courses: (MataKuliah | any)[], lastEndDate: Date }[] = [];
      sortedBlokCourses.forEach(course => {
        const courseStart = new Date(course.tanggalMulai || course.tanggal_mulai || '');
        const courseEnd = new Date(course.tanggalAkhir || course.tanggal_akhir || '');
        
        let placed = false;
        for (let i = 0; i < blokLanes.length; i++) {
          if (courseStart > blokLanes[i].lastEndDate) {
            blokLanes[i].courses.push(course);
            blokLanes[i].lastEndDate = courseEnd;
            placed = true;
            break;
          }
        }
        
        if (!placed) {
          blokLanes.push({ courses: [course], lastEndDate: courseEnd });
        }
      });

      allLanes.push(...blokLanes.map(l => l.courses));
    }

    // Process Non Blok courses
    if (nonBlokCourses.length > 0) {
      const sortedNonBlokCourses = [...nonBlokCourses].sort((a, b) => {
        const aStart = new Date(a.tanggalMulai || a.tanggal_mulai || '');
        const bStart = new Date(b.tanggalMulai || b.tanggal_mulai || '');
        return aStart.getTime() - bStart.getTime();
      });

      const nonBlokLanes: { courses: (MataKuliah | any)[], lastEndDate: Date }[] = [];
      sortedNonBlokCourses.forEach(course => {
        const courseStart = new Date(course.tanggalMulai || course.tanggal_mulai || '');
        const courseEnd = new Date(course.tanggalAkhir || course.tanggal_akhir || '');
        
        let placed = false;
        for (let i = 0; i < nonBlokLanes.length; i++) {
          if (courseStart > nonBlokLanes[i].lastEndDate) {
            nonBlokLanes[i].courses.push(course);
            nonBlokLanes[i].lastEndDate = courseEnd;
            placed = true;
            break;
          }
        }
        
        if (!placed) {
          nonBlokLanes.push({ courses: [course], lastEndDate: courseEnd });
        }
      });

      allLanes.push(...nonBlokLanes.map(l => l.courses));
    }

    // Process CSR courses
    if (csrCourses.length > 0) {
      const sortedCsrCourses = [...csrCourses].sort((a, b) => {
        const aStart = new Date(a.tanggalMulai || a.tanggal_mulai || '');
        const bStart = new Date(b.tanggalMulai || b.tanggal_mulai || '');
        return aStart.getTime() - bStart.getTime();
      });

      const csrLanes: { courses: (MataKuliah | any)[], lastEndDate: Date }[] = [];
      sortedCsrCourses.forEach(course => {
        const courseStart = new Date(course.tanggalMulai || course.tanggal_mulai || '');
        const courseEnd = new Date(course.tanggalAkhir || course.tanggal_akhir || '');
        
        let placed = false;
        for (let i = 0; i < csrLanes.length; i++) {
          if (courseStart > csrLanes[i].lastEndDate) {
            csrLanes[i].courses.push(course);
            csrLanes[i].lastEndDate = courseEnd;
            placed = true;
            break;
          }
        }
        
        if (!placed) {
          csrLanes.push({ courses: [course], lastEndDate: courseEnd });
        }
      });

      allLanes.push(...csrLanes.map(l => l.courses));
    }

    semesterLayouts.set(semester, { lanes: allLanes });
  });

  return new Map([...semesterLayouts.entries()].sort((a, b) => a[0] - b[0]));
};

interface CalendarTableProps {
  semesterLayouts: Map<number, { lanes: (MataKuliah | any)[][] }>;
  colorMap: Map<string, string>;
  holidayMap: Map<string, Holiday>;
  kegiatanMap: Map<string, Kegiatan>;
}

const CalendarTable = memo(({ semesterLayouts, colorMap, holidayMap, kegiatanMap }: CalendarTableProps) => {
    // Calculate the overall date range for this table
    const allCourses = Array.from(semesterLayouts.values()).flatMap(layout => layout.lanes.flat());
    
    if (allCourses.length === 0) {
      return <div className="text-center py-4 text-gray-500">Tidak ada mata kuliah untuk ditampilkan</div>;
    }

    // Find min and max dates
    let minDate: Date = new Date(allCourses[0].tanggalMulai || allCourses[0].tanggal_mulai || '');
    let maxDate: Date = new Date(allCourses[0].tanggalAkhir || allCourses[0].tanggal_akhir || '');
    
    allCourses.forEach(course => {
      const start = new Date(course.tanggalMulai || course.tanggal_mulai || '');
      const end = new Date(course.tanggalAkhir || course.tanggal_akhir || '');
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    const totalDays = dayDiff(minDate, maxDate) + 1;
    const dates = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      return d;
    });

    // Group by month for header
    const months = dates.reduce((acc, date) => {
      const month = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      if (!acc[month]) acc[month] = 0;
      acc[month]++;
      return acc;
    }, {} as Record<string, number>);

    const DAY_WIDTH = 40;
    const LANE_HEIGHT = 50; // Increased height to accommodate longer text

    const getHoliday = (date: Date): Holiday | undefined => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      return holidayMap.get(dateString);
    };

  const getKegiatan = (date: Date): Kegiatan | undefined => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return kegiatanMap.get(dateString);
  };
    
    return (
      <div className="overflow-x-auto no-scrollbar border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div style={{ minWidth: `calc(12rem + ${totalDays * DAY_WIDTH}px)` }}>
          {/* Header with months */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 z-20">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <div className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 font-semibold text-sm flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                Semester
              </div>
              {Object.entries(months).map(([name, days]) => (
                <div
                  key={name}
                  style={{ width: `${days * DAY_WIDTH}px` }}
                  className="shrink-0 text-sm font-bold text-center border-r border-gray-200 dark:border-gray-700 py-2 flex items-center justify-center bg-gray-50 dark:bg-gray-800 overflow-hidden whitespace-nowrap text-ellipsis"
                  title={name}
                >
                  {name}
                </div>
              ))}
            </div>
            
            {/* Header with days */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <div className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"></div>
              {dates.map(date => {
                const holiday = getHoliday(date);
              const kegiatan = getKegiatan(date);
                const dayOfWeek = date.getDay();
              const weekend = !holiday && !kegiatan && (dayOfWeek === 0 || dayOfWeek === 6);
              
              let dayBgClass = 'bg-gray-50 dark:bg-gray-800';
              let title = '';
              if (holiday) {
                dayBgClass = 'bg-red-100 dark:bg-red-900/50';
                title = holiday.holiday_name;
              } else if (kegiatan) {
                dayBgClass = kegiatanColorHighlightMap[kegiatan.warna] || 'bg-gray-200';
                title = kegiatan.nama;
              } else if (weekend) {
                dayBgClass = 'bg-gray-100 dark:bg-gray-700/40';
                title = 'Libur Akhir Pekan Sabtu & Minggu';
              }

                return (
                  <div
                    key={date.toISOString()}
                    style={{ width: `${DAY_WIDTH}px` }}
                  className={`shrink-0 text-xs text-center border-r border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center py-1 ${dayBgClass}`}
                  title={title}
                  >
                    <span className={`font-semibold ${holiday ? 'text-red-600 dark:text-red-400' : weekend ? 'text-gray-400' : 'text-gray-500'}`}>
                      {date.toLocaleDateString('id-ID', { weekday: 'short' }).charAt(0)}
                    </span>
                    <span className={holiday ? 'text-red-600 dark:text-red-400 font-bold' : weekend ? 'text-gray-400' : ''}>{date.getDate()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="relative">
            {/* Background grid lines & Holiday overlays */}
            <div className="absolute top-0 left-48 right-0 bottom-0 flex z-0">
              {dates.map((date, index) => {
                const holiday = getHoliday(date);
              const kegiatan = getKegiatan(date);
                const dayOfWeek = date.getDay();
              const weekend = !holiday && !kegiatan && (dayOfWeek === 0 || dayOfWeek === 6);
                return (
                  <div
                    key={index}
                    style={{ width: `${DAY_WIDTH}px` }}
                    className="shrink-0 h-full border-r border-gray-200 dark:border-gray-700"
                  >
                    {holiday && (
                      <div 
                        className="w-full h-full bg-red-500/10" 
                        title={holiday.holiday_name}
                      />
                    )}
                  {kegiatan && !holiday && (
                    <div 
                      className={`w-full h-full ${kegiatanColorHighlightMap[kegiatan.warna] || ''}`}
                      title={kegiatan.nama}
                    />
                  )}
                    {weekend && (
                      <div className="w-full h-full bg-gray-500/10 dark:bg-gray-400/10" title="Libur Akhir Pekan Sabtu & Minggu" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Course content */}
            <div className="relative z-10">
              {Array.from(semesterLayouts.entries()).map(([semester, layout]) => {
                const laneCount = layout.lanes.length > 0 ? layout.lanes.length : 1;
                const semesterBlockHeight = laneCount * LANE_HEIGHT;
                
                return (
                  <div key={semester} className="flex">
                    {/* Semester label */}
                    <div 
                      className="w-48 shrink-0 border-r border-b border-gray-200 dark:border-gray-700 font-semibold text-sm flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800" 
                      style={{ height: `${semesterBlockHeight}px` }}
                    >
                      Semester {semester}
                    </div>

                    {/* Course lanes */}
                    <div className="relative" style={{ width: `${totalDays * DAY_WIDTH}px` }}>
                      {layout.lanes.length > 0 ? (
                        layout.lanes.map((lane, laneIndex) => (
                          <div 
                            key={laneIndex} 
                            className="relative border-b border-gray-200 dark:border-gray-700" 
                            style={{ height: `${LANE_HEIGHT}px` }}
                          >
                            {lane.map(course => {
                              const courseStart = new Date(course.tanggalMulai || course.tanggal_mulai || '');
                              const courseEnd = new Date(course.tanggalAkhir || course.tanggal_akhir || '');
                              const startOffsetDays = dayDiff(minDate, courseStart);
                              const durationDays = dayDiff(courseStart, courseEnd) + 1;
                              const left = startOffsetDays * DAY_WIDTH;
                              const width = durationDays * DAY_WIDTH - 4;
                              
                              const barText = formatCourseBarText(course);
                              const tooltipText = formatCourseTooltip(course);
                              
                              return (
                                <div
                                  key={course.kode}
                                  className={`absolute px-2 py-1 flex items-center rounded text-white text-sm font-medium shadow-md ${colorMap.get(course.kode)} leading-tight`}
                                  style={{ 
                                    left: `${left}px`, 
                                    width: `${width}px`, 
                                    height: `${LANE_HEIGHT - 8}px`,
                                    top: '4px',
                                    cursor: 'pointer',
                                    overflow: 'hidden'
                                  }}
                                  title={tooltipText}
                                >
                                  <span className="truncate text-sm leading-tight">
                                    {barText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <div 
                          className="relative border-b border-gray-200 dark:border-gray-700" 
                          style={{ height: `${LANE_HEIGHT}px` }}
                        ></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
});

export default function PetaAkademik({ data, holidays = [], kegiatan = [], onKegiatanAdded, isModalOpen, setIsModalOpen }: PetaAkademikProps) {
  const [deleteKegiatanId, setDeleteKegiatanId] = useState<number|null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string|null>(null);
  const [successMessage, setSuccessMessage] = useState<string|null>(null);
  const [csrData, setCsrData] = useState<CSR[]>([]);

  useEffect(() => {
    if (isModalOpen) {
      setSuccessMessage(null);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000); // 5 detik
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch CSR data
  useEffect(() => {
    const fetchCSRData = async () => {
      try {
        const csrCourses = data.filter(course => 
          course.jenis === 'Non Blok' && course.tipe_non_block === 'CSR'
        );
        if (csrCourses.length > 0) {
          const kodeList = csrCourses.map(course => course.kode);
          const response = await api.get('/csrs', { params: { kode_mk: kodeList } });
          setCsrData(response.data.data || []);
        } else {
          setCsrData([]);
        }
      } catch (error) {
        setCsrData([]);
      }
    };
    fetchCSRData();
  }, [data]);

  const usedKegiatanColors = kegiatan.map(k => k.warna);
  const filteredKegiatanColors = availableKegiatanColors.filter(
    c => !usedKegiatanColors.includes(c.value) && !csrColors.includes(c.value)
  );

  const { ganjilLayouts, genapLayouts, colorMap, holidayMap, kegiatanMap } = useMemo(() => {
    const holidayMap = new Map<string, Holiday>();
    holidays.forEach(h => {
      if (h.is_national_holiday && h.holiday_date) {
        // Normalize the date from API to YYYY-MM-DD format
        const date = new Date(h.holiday_date);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const normalizedDate = `${year}-${month}-${day}`;
        holidayMap.set(normalizedDate, h);
      }
    });

    const kegiatanMap = new Map<string, Kegiatan>();
    kegiatan.forEach(k => {
      const startDate = new Date(k.tanggal_mulai);
      const endDate = new Date(k.tanggal_akhir);
      for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const normalizedDate = `${year}-${month}-${day}`;
        kegiatanMap.set(normalizedDate, k);
      }
    });

    // Filter out courses without valid dates
    const validCourses = data.filter(c => {
      const start = c.tanggalMulai || c.tanggal_mulai;
      const end = c.tanggalAkhir || c.tanggal_akhir;
      return start && end && !isNaN(new Date(start).getTime()) && !isNaN(new Date(end).getTime());
    });

    // Create CSR courses from CSR data
    const csrCourses = csrData.map(csr => {
      const parentCourse = validCourses.find(c => c.kode === csr.mata_kuliah_kode);
      if (!parentCourse) return null;
      
      const csrNumber = parseInt(csr.nomor_csr.split('.')[1]);
      return {
        kode: `${csr.mata_kuliah_kode}_CSR_${csrNumber}`,
        nama: csr.nama,
        semester: parentCourse.semester,
        jenis: 'CSR' as const,
        tanggalMulai: csr.tanggal_mulai,
        tanggalAkhir: csr.tanggal_akhir,
        tanggal_mulai: csr.tanggal_mulai,
        tanggal_akhir: csr.tanggal_akhir,
        csr_number: csrNumber,
        parent_course: parentCourse
      };
    }).filter(Boolean) as any[];

    // Combine regular courses with CSR courses
    const allCourses = [...validCourses, ...csrCourses];

    // Split into ganjil (odd) and genap (even) semesters
    const ganjilCourses = allCourses.filter(c => c.semester % 2 !== 0);
    const genapCourses = allCourses.filter(c => c.semester % 2 === 0);

    // Generate layouts for each semester group
    const ganjilLayouts = generateLayout(ganjilCourses);
    const genapLayouts = generateLayout(genapCourses);

    // Create color mapping for courses
    const colorMap = new Map<string, string>();
    let colorIndex = 0;
    
    allCourses.forEach(course => {
      if (!colorMap.has(course.kode)) {
        if (course.jenis === 'Blok' && course.blok && course.blok <= blokColors.length) {
          // Use predefined color for Blok courses
          colorMap.set(course.kode, blokColors[course.blok - 1]);
        } else if (course.jenis === 'CSR' && course.csr_number && course.csr_number <= csrColors.length) {
          // Use predefined color for CSR courses
          colorMap.set(course.kode, csrColors[course.csr_number - 1]);
        } else if (course.jenis === 'Non Blok') {
          // Use gray for Non Blok courses
          colorMap.set(course.kode, nonBlokColor);
        } else {
          // Fallback to rotating through tailwind colors
          colorMap.set(course.kode, tailwindColors[colorIndex % tailwindColors.length]);
          colorIndex++;
        }
      }
    });

    return { ganjilLayouts, genapLayouts, colorMap, holidayMap, kegiatanMap };
  }, [data, holidays, kegiatan, csrData]);

  const handleDeleteKegiatan = async (id: number) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/kegiatan/${id}`);
      setDeleteKegiatanId(null);
      onKegiatanAdded();
      setSuccessMessage('Kegiatan berhasil dihapus.');
    } catch (err) {
      setDeleteError('Gagal menghapus kegiatan.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="text-gray-800 dark:text-white p-4">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mb-4 p-3 rounded-lg bg-green-100 text-green-700"
            role="alert"
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <AddKegiatanModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onKegiatanAdded={() => {
          setIsModalOpen(false);
          onKegiatanAdded();
          setSuccessMessage('Kegiatan berhasil ditambahkan.');
        }}
        availableColors={filteredKegiatanColors}
        kegiatan={kegiatan}
      />
      
      <AnimatePresence>
        {ganjilLayouts.size > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4">Semester Ganjil</h3>
            <CalendarTable 
              semesterLayouts={ganjilLayouts} 
              colorMap={colorMap}
              holidayMap={holidayMap}
              kegiatanMap={kegiatanMap}
            />
          </div>
        )}
      </AnimatePresence>
      
      {genapLayouts.size > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Semester Genap</h3>
          <CalendarTable 
            semesterLayouts={genapLayouts} 
            colorMap={colorMap}
            holidayMap={holidayMap}
            kegiatanMap={kegiatanMap}
          />
        </div>
      )}
      
      {(ganjilLayouts.size > 0 || genapLayouts.size > 0) && (
        <div className="mt-8">
          <h3 className="text-md font-bold mb-3">Legenda Warna</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {/* Blok courses */}
            {blokColors.map((color, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-sm ${color}`}></div>
                <span className="text-gray-700 dark:text-gray-300">Blok {idx + 1}</span>
              </div>
            ))}
            {/* Non Blok courses */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-4 h-4 rounded-sm ${nonBlokColor}`}></div>
              <span className="text-gray-700 dark:text-gray-300">Non Blok</span>
            </div>
            {/* CSR courses */}
            {csrColors.map((color, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-sm ${color}`}></div>
                <span className="text-gray-700 dark:text-gray-300">CSR {idx + 1}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-sm bg-red-500 dark:bg-red-400"></div>
              <span className="text-gray-700 dark:text-gray-300">Hari Libur Nasional</span>
            </div>
            {kegiatan.map((k) => (
              <button
                key={k.id}
                className="flex items-center gap-2 text-sm relative group px-2 py-1 rounded transition-all duration-200 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer border-none overflow-hidden"
                style={{ minWidth: 0 }}
                title="Hapus kegiatan"
                onClick={() => {
                  setSuccessMessage(null);
                  setDeleteKegiatanId(k.id);
                }}
                disabled={isDeleting}
              >
                <div className={`w-4 h-4 rounded-sm ${k.warna} transition-all duration-200`}></div>
                <span
                  className="text-gray-700 dark:text-gray-300 group-hover:opacity-0 group-hover:translate-x-2 transition-all duration-200 ease-in-out"
                  style={{ willChange: 'opacity, transform' }}
                >
                  {k.nama}
                </span>
                <span
                  className="absolute text-nowrap left-8 flex items-center gap-1 text-red-600 font-semibold opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all duration-200 ease-in-out pointer-events-none group-hover:pointer-events-auto"
                  style={{ willChange: 'opacity, transform' }}
                >
                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  Hapus Kegiatan
                </span>
              </button>
            ))}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-sm bg-gray-200 dark:bg-gray-700"></div>
              <span className="text-gray-700 dark:text-gray-300">Libur Akhir Pekan Sabtu & Minggu</span>
            </div>
          </div>
          {/* Modal konfirmasi hapus kegiatan */}
          <AnimatePresence>
            {deleteKegiatanId !== null && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center">
                {/* Overlay */}
                <div
                  className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
                  onClick={() => setDeleteKegiatanId(null)}
                ></div>
                {/* Modal Content */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001]"
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setDeleteKegiatanId(null)}
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
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white">Hapus Kegiatan</h2>
                    </div>
                    <div>
                      <p className="mb-6 text-gray-500 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus kegiatan ini? Data yang dihapus tidak dapat dikembalikan.
                      </p>
                      {deleteError && (
                        <div className="text-sm text-red-500 bg-red-100 rounded p-2 mb-4">{deleteError}</div>
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setDeleteKegiatanId(null)}
                          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                          disabled={isDeleting}
                        >Batal</button>
                        <button
                          onClick={() => handleDeleteKegiatan(deleteKegiatanId)}
                          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium shadow-theme-xs hover:bg-red-600 transition flex items-center justify-center"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <svg
                                className="w-5 h-5 mr-2 animate-spin text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                ></path>
                              </svg>
                              Menghapus...
                            </>
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {holidays.length > 0 && (
        <div className="mt-8">
          <h3 className="text-md font-bold mb-3">Keterangan Hari Libur Nasional</h3>
          <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
            <ul className="space-y-2">
              {holidays
                .filter(h => h.is_national_holiday)
                .sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime())
                .map(holiday => (
                  <li key={holiday.holiday_date} className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {new Date(holiday.holiday_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}:
                    </span>
                    <span className="ml-2">{holiday.holiday_name}</span>
                  </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
