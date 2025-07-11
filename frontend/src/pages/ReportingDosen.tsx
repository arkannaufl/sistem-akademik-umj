import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import {
  DownloadIcon,
  DocsIcon,
} from '../icons';

interface DosenCSRReport {
  dosen_id: number;
  dosen_name: string;
  nid: string;
  keahlian?: string[];
  total_csr: number;
  per_semester: Array<{
    semester: number;
    jumlah: number;
    blok_csr: string[];
    tanggal_mulai?: string;
    tanggal_akhir?: string;
  }>;
  tanggal_mulai?: string;
  tanggal_akhir?: string;
}

const SKELETON_ROWS = 6;

const ReportingDosen: React.FC = () => {
  const [allDosenCsrReport, setAllDosenCsrReport] = useState<DosenCSRReport[]>([]);
  const [dosenCsrReport, setDosenCsrReport] = useState<DosenCSRReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    semester: '',
    start_date: '',
    end_date: '',
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  useEffect(() => {
    const fetchDosenCsrReport = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pagination.current_page.toString(),
          per_page: pagination.per_page.toString(),
        });
        const response = await axios.get(`/reporting/dosen-csr?${params}`);
        let data = Array.isArray(response.data.data) ? response.data.data : [];
        // Cari tanggal mulai/akhir terawal/terakhir dari semua blok CSR yang diajar dosen
        data = data.map((d: DosenCSRReport) => {
          let allTanggalMulai: string[] = [];
          let allTanggalAkhir: string[] = [];
          d.per_semester.forEach(sem => {
            if (Array.isArray(sem.tanggal_mulai)) allTanggalMulai.push(...sem.tanggal_mulai);
            else if (sem.tanggal_mulai) allTanggalMulai.push(sem.tanggal_mulai);
            if (Array.isArray(sem.tanggal_akhir)) allTanggalAkhir.push(...sem.tanggal_akhir);
            else if (sem.tanggal_akhir) allTanggalAkhir.push(sem.tanggal_akhir);
          });
          d.tanggal_mulai = allTanggalMulai.length > 0 ? allTanggalMulai.sort()[0] : undefined;
          d.tanggal_akhir = allTanggalAkhir.length > 0 ? allTanggalAkhir.sort().reverse()[0] : undefined;
          return d;
        });
        setAllDosenCsrReport(data);
        setDosenCsrReport(data);
        setPagination({
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
          per_page: response.data.per_page || 15,
          total: response.data.total || 0,
        });
      } catch (error) {
        setAllDosenCsrReport([]);
        setDosenCsrReport([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDosenCsrReport();
    // eslint-disable-next-line
  }, [pagination.current_page, pagination.per_page]);

  // Search & filter
  useEffect(() => {
    const q = filters.search.toLowerCase();
    let filtered = allDosenCsrReport;
    if (filters.semester) {
      filtered = filtered.filter(d => d.per_semester.some(sem => String(sem.semester) === filters.semester));
    }
    if (filters.start_date) {
      filtered = filtered.filter(d => d.tanggal_mulai && d.tanggal_mulai >= filters.start_date);
    }
    if (filters.end_date) {
      filtered = filtered.filter(d => d.tanggal_akhir && d.tanggal_akhir <= filters.end_date);
    }
    if (q) {
      filtered = filtered.filter(d => {
        const nama = d.dosen_name.toLowerCase();
        const nid = d.nid.toLowerCase();
        const keahlianArr = Array.isArray(d.keahlian) ? d.keahlian : typeof d.keahlian === 'string' ? String(d.keahlian).split(',').map((k: string) => k.trim()) : [];
        const keahlianStr = keahlianArr.join(',').toLowerCase();
        return nama.includes(q) || nid.includes(q) || keahlianStr.includes(q);
      });
    }
    setDosenCsrReport(filtered);
  }, [filters, allDosenCsrReport]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`/reporting/dosen-csr/export?${params}`);
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename || 'dosen-csr-report.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {}
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reporting Dosen</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Laporan dosen mengajar CSR per semester</p>
        </div>
        <button
          onClick={handleExport}
          className="w-fit flex items-center gap-2 px-5 text-sm py-2 bg-brand-500 text-white rounded-lg shadow hover:bg-brand-600 transition-colors font-semibold"
        >
          <DownloadIcon className="w-5 h-5" />
          Export Data .JSON
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.05] px-6 py-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
          {/* Search Bar */}
          <div className="w-full md:w-72 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <DocsIcon className="w-5 h-5 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Cari dosen, NID, atau keahlian..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-12 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
          {/* Filter Group */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto justify-end">
            <select
              value={filters.semester}
              onChange={e => handleFilterChange('semester', e.target.value)}
              className="w-full md:w-44 h-11 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Semester</option>
              {Array.from(new Set(allDosenCsrReport.flatMap(d => d.per_semester.map(sem => sem.semester)))).sort((a, b) => a - b).map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.start_date}
              onChange={e => handleFilterChange('start_date', e.target.value)}
              className="h-11 w-full md:w-32 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Dari tanggal"
            />
            <span className="self-center text-gray-400 text-sm">sampai</span>
            <input
              type="date"
              value={filters.end_date}
              onChange={e => handleFilterChange('end_date', e.target.value)}
              className="h-11 w-full md:w-32 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Sampai tanggal"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .max-w-full::-webkit-scrollbar { display: none; }
            .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            .hide-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
            <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Nama Dosen</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">NID</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Keahlian</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Total CSR</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Per Semester</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Tanggal Mulai</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Tanggal Akhir</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
                  <tr key={idx}>
                    {Array.from({ length: 7 }).map((_, colIdx) => (
                      <td key={colIdx} className="px-6 py-4">
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse opacity-60 mb-2"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : dosenCsrReport.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">Tidak ada data dosen mengajar CSR.</td>
                </tr>
              ) : (
                dosenCsrReport.map((dosen, idx) => (
                  <tr key={dosen.dosen_id} className={idx % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : '' + ' hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors'}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">{dosen.dosen_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">{dosen.nid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                      {(() => {
                        let keahlianArr: string[] = [];
                        if (Array.isArray(dosen.keahlian)) {
                          keahlianArr = dosen.keahlian;
                        } else if (typeof dosen.keahlian === 'string') {
                          keahlianArr = String(dosen.keahlian).split(',').map((k: string) => k.trim()).filter(Boolean);
                        } else {
                          keahlianArr = [];
                        }
                        return keahlianArr.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {keahlianArr.map((k, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full">
                                {k}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>-</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">{dosen.total_csr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                      <div className="flex flex-col gap-1">
                        {dosen.per_semester.map((sem) => (
                          <div key={sem.semester} className="mb-1">
                            <span className="font-semibold">Semester {sem.semester}:</span> {sem.jumlah} CSR
                            {sem.blok_csr.length > 0 && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Blok: {sem.blok_csr.join(', ')})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                      {dosen.tanggal_mulai ? new Date(dosen.tanggal_mulai).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                      {dosen.tanggal_akhir ? new Date(dosen.tanggal_akhir).toLocaleDateString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4">
            <div className="flex items-center gap-4">
              <select
                value={pagination.per_page}
                onChange={e => setPagination(prev => ({ ...prev, per_page: Number(e.target.value), current_page: 1 }))}
                className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:outline-none"
              >
                {[10, 15, 20, 50].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {((pagination.current_page - 1) * pagination.per_page) + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total)} dari {pagination.total} dosen
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: pagination.last_page }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 ${
                    pagination.current_page === i + 1
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } transition`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportingDosen; 