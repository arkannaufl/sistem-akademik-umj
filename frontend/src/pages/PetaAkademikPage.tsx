import { useEffect, useState, useCallback } from 'react';
import PetaAkademik from '../components/PetaAkademik';
import api from '../api/axios';
import { AnimatePresence, motion } from "framer-motion";

function PetaAkademikSkeleton() {
  // Skeleton for 2 semester sections, each with a fake calendar header and 2 lanes
  return (
    <div>
      {['Semester Ganjil', 'Semester Genap'].map((title, idx) => (
        <div className={idx === 1 ? 'mt-8' : 'mt-4'} key={title}>
          <div className="text-xl font-bold mb-4 h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="overflow-x-auto no-scrollbar border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div style={{ minWidth: 'calc(12rem + 20*40px)' }}>
              {/* Header with months */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 z-20">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <div className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 font-semibold text-sm flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                    <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ width: '160px' }} className="shrink-0 text-sm font-bold text-center border-r border-gray-200 dark:border-gray-700 py-2 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                      <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Header with days */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <div className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"></div>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} style={{ width: '40px' }} className="shrink-0 text-xs text-center border-r border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center py-1 bg-gray-50 dark:bg-gray-800">
                      <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                      <div className="h-3 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Calendar grid skeleton */}
              <div className="relative">
                <div className="relative z-10">
                  {Array.from({ length: 2 }).map((_, laneIdx) => (
                    <div key={laneIdx} className="flex">
                      {/* Semester label skeleton */}
                      <div className="w-48 shrink-0 border-r border-b border-gray-200 dark:border-gray-700 font-semibold text-sm flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800" style={{ height: '50px' }}>
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                      {/* Lane skeleton */}
                      <div className="relative" style={{ width: '800px' }}>
                        <div className="relative border-b border-gray-200 dark:border-gray-700" style={{ height: '50px' }}>
                          {/* Fake course blocks */}
                          {Array.from({ length: 2 }).map((_, blockIdx) => (
                            <div key={blockIdx} className="absolute px-2 py-1 flex items-center rounded text-white text-sm font-medium shadow-md bg-gray-300 dark:bg-gray-700 animate-pulse" style={{ left: `${blockIdx * 200 + 10}px`, width: '180px', height: '38px', top: '4px' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {/* Legenda Warna Skeleton */}
      <div className="mt-8">
        <div className="text-md font-bold mb-3 h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
          {/* Blok 1-4 */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-blue-500 animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-yellow-400 animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-pink-400 animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-green-400 animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Non Blok */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-gray-500 animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Hari Libur Nasional */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-red-500 animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Libur Akhir Pekan */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Dummy Kegiatan 1 */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-green-700 animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Dummy Kegiatan 2 */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-sm bg-purple-500 animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PetaAkademikPage() {
  const [data, setData] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [kegiatan, setKegiatan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const handleOpenModal = () => {
    if (data.length === 0) {
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
      }, 5000); // Pesan hilang setelah 5 detik
    } else {
      setIsModalOpen(true);
    }
  };

  const fetchAllData = useCallback(async () => {
    // On refetch, don't show the main skeleton, just update data.
    // setLoading(true); 
    setError(null);
    try {
      // Fetch all data in parallel
      const [mataKuliahRes, kegiatanRes] = await Promise.all([
        api.get('/mata-kuliah'),
        api.get('/kegiatan')
      ]);

      const courses = Array.isArray(mataKuliahRes.data) ? mataKuliahRes.data : [];
      setData(courses);

      const kegiatanData = Array.isArray(kegiatanRes.data) ? kegiatanRes.data : [];
      setKegiatan(kegiatanData);

      // Determine unique years from courses and activities
      const yearsToFetch = new Set<number>();
      const allItems = [...courses, ...kegiatanData];

      if (allItems.length > 0) {
        allItems.forEach(item => {
          const startDate = item.tanggalMulai || item.tanggal_mulai;
          const endDate = item.tanggalAkhir || item.tanggal_akhir;
          
          if (startDate) {
              try { yearsToFetch.add(new Date(startDate).getFullYear()); } catch (e) {}
          }
          if (endDate) {
              try { yearsToFetch.add(new Date(endDate).getFullYear()); } catch (e) {}
          }
        });
      }
      
      // Fallback to current year if no dates are found
      if (yearsToFetch.size === 0) {
        yearsToFetch.add(new Date().getFullYear());
      }

      // Fetch holidays for all determined years
      const holidayPromises = Array.from(yearsToFetch).map(year =>
        fetch(`https://api-harilibur.vercel.app/api?year=${year}`).then(res => {
          if (!res.ok) return []; // Return empty array on error to not break Promise.all
          return res.json();
        })
      );
      
      const holidayResults = await Promise.all(holidayPromises);
      
      // Flatten the array of arrays and filter out any invalid entries
      const allHolidays = holidayResults.flat().filter(h => h && h.holiday_date);
      
      setHolidays(allHolidays);

    } catch (err) {
      setError('Gagal mengambil data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array makes this function stable
  
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex justify-between items-center px-5 pt-5 lg:px-6 lg:pt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Peta Akademik
        </h3>
        <button 
          onClick={handleOpenModal}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition"
        >
          Tambah Kegiatan
        </button>
      </div>
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-5 lg:mx-6 mt-4 p-3 rounded-lg bg-yellow-100 text-yellow-700"
            role="alert"
          >
            Silakan tambahkan data mata kuliah terlebih dahulu sebelum menambah kegiatan.
          </motion.div>
        )}
      </AnimatePresence>
      <div className="p-5 pt-4 lg:p-6 lg:pt-4">
        {loading ? (
          <PetaAkademikSkeleton />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <PetaAkademik 
            data={data} 
            holidays={holidays} 
            kegiatan={kegiatan}
            onKegiatanAdded={fetchAllData}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
          />
        )}
      </div>
    </div>
  );
} 