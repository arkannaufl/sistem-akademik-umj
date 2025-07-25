import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import {
  DownloadIcon,
  DocsIcon,
} from '../icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { faChevronDown, faChevronUp, faBookOpen } from "@fortawesome/free-solid-svg-icons";

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

interface DosenPBLReport {
  dosen_id: number;
  dosen_name: string;
  nid: string;
  keahlian?: string[];
  total_pbl: number;
  total_sesi: number;
  total_waktu_menit: number;
  per_semester: Array<{
    semester: number;
    jumlah: number;
    total_sesi: number;
    total_waktu_menit: number;
    modul_pbl: Array<{
      blok: number;
      modul_ke: string;
      nama_modul: string;
      mata_kuliah_kode: string;
      mata_kuliah_nama: string;
      waktu_menit: number;
      jumlah_sesi: number;
    }>;
    tanggal_mulai?: string;
    tanggal_akhir?: string;
  }>;
  tanggal_mulai?: string;
  tanggal_akhir?: string;
  // Tambahan multi peran
  dosen_peran?: Array<{
    tipe_peran: string;
    mata_kuliah_nama?: string;
    semester?: number;
    blok?: number;
    peran_kurikulum?: string;
  }>;
  peran_utama?: string; // fallback lama
  matkul_ketua_nama?: string;
  matkul_anggota_nama?: string;
  peran_kurikulum_mengajar?: string;
}

const SKELETON_ROWS = 6;

const ReportingDosen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'csr' | 'pbl'>('csr');
  const [allDosenCsrReport, setAllDosenCsrReport] = useState<DosenCSRReport[]>([]);
  const [dosenCsrReport, setDosenCsrReport] = useState<DosenCSRReport[]>([]);
  const [allDosenPblReport, setAllDosenPblReport] = useState<DosenPBLReport[]>([]);
  const [dosenPblReport, setDosenPblReport] = useState<DosenPBLReport[]>([]);
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
    per_page: 10,
    total: 0,
  });
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});
  const [expandedPeran, setExpandedPeran] = useState<{ [key: string]: boolean }>({});
  const toggleExpandedPeran = (rowKey: string) => {
    setExpandedPeran(prev => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  // Pindahkan ke luar agar bisa dipanggil event listener
  const fetchDosenReport = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pagination.current_page.toString(),
          per_page: pagination.per_page.toString(),
        });
      let response;
      if (activeTab === 'csr') {
        response = await axios.get(`/reporting/dosen-csr?${params}`);
        let data = Array.isArray(response.data.data) ? response.data.data : [];
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
      } else {
        response = await axios.get(`/reporting/dosen-pbl?${params}`);
        let data = Array.isArray(response.data.data) ? response.data.data : [];
        data = data.map((d: DosenPBLReport) => {
          // HAPUS: proses JSON.parse/overwrite keahlian di sini
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
        setAllDosenPblReport(data);
        setDosenPblReport(data);
      }
        setPagination({
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
          per_page: response.data.per_page || 15,
          total: response.data.total || 0,
        });
      } catch (error) {
      if (activeTab === 'csr') {
        setAllDosenCsrReport([]);
        setDosenCsrReport([]);
      } else {
        setAllDosenPblReport([]);
        setDosenPblReport([]);
      }
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchDosenReport();
    // eslint-disable-next-line
  }, [activeTab, pagination.current_page, pagination.per_page]);

  // Tambahkan event listener untuk real-time sync dengan PBL-detail.tsx
  useEffect(() => {
    const handlePblAssignmentUpdate = () => {
      if (activeTab === 'pbl') {
        fetchDosenReport();
      }
    };
    window.addEventListener('pbl-assignment-updated', handlePblAssignmentUpdate);
    return () => {
      window.removeEventListener('pbl-assignment-updated', handlePblAssignmentUpdate);
    };
  }, [activeTab]);

  // Search & filter
  useEffect(() => {
    const q = filters.search.toLowerCase();
    if (activeTab === 'csr') {
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
    } else {
      let filtered = allDosenPblReport;
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
      setDosenPblReport(filtered);
    }
  }, [filters, allDosenCsrReport, allDosenPblReport, activeTab]);

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
      const endpoint = activeTab === 'csr' ? 'dosen-csr' : 'dosen-pbl';
      const response = await axios.get(`/reporting/${endpoint}/export?${params}`);
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename || `dosen-${activeTab}-report.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {}
  };

  const getCurrentReportData = () => {
    return activeTab === 'csr' ? dosenCsrReport : dosenPblReport;
  };

  const getCurrentAllReportData = () => {
    return activeTab === 'csr' ? allDosenCsrReport : allDosenPblReport;
  };

  const getTotalField = () => {
    return activeTab === 'csr' ? 'total_csr' : 'total_pbl';
  };

  const getTitle = () => {
    return activeTab === 'csr' ? 'CSR' : 'PBL';
  };

  const getDescription = () => {
    return activeTab === 'csr' ? 'Laporan dosen mengajar CSR per semester' : 'Laporan dosen mengajar PBL per semester';
  };

  const toggleExpand = (dosenId: number) => {
    setExpandedRows((prev) => ({ ...prev, [dosenId]: !prev[dosenId] }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reporting Dosen</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{getDescription()}</p>
        </div>
        <button
          onClick={handleExport}
          className="w-fit flex items-center gap-2 px-5 text-sm py-2 bg-brand-500 text-white rounded-lg shadow hover:bg-brand-600 transition-colors font-semibold"
        >
          <DownloadIcon className="w-5 h-5" />
          Export Data .JSON
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2 bg-white dark:bg-gray-800 rounded-full shadow-lg p-1 w-fit mx-auto border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('csr')}
            className={`flex-1 px-6 py-2 text-base font-semibold rounded-full transition-colors ${
              activeTab === 'csr'
                ? 'bg-brand-500 text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400'
            }`}
            style={{ minWidth: 100 }}
          >
            CSR
          </button>
          <button
            onClick={() => setActiveTab('pbl')}
            className={`flex-1 px-6 py-2 text-base font-semibold rounded-full transition-colors ${
              activeTab === 'pbl'
                ? 'bg-brand-500 text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400'
            }`}
            style={{ minWidth: 100 }}
          >
            PBL
          </button>
        </div>
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
              {Array.from(new Set(getCurrentAllReportData().flatMap(d => d.per_semester.map(sem => sem.semester)))).sort((a, b) => a - b).map(sem => (
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
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Peran</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Keahlian</th>
                {activeTab === 'pbl' && (
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Total Modul PBL</th>
                )}
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">{activeTab === 'csr' ? 'Total CSR' : 'Total PBL'}</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Total Waktu</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Per Semester</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Tanggal Mulai</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Tanggal Akhir</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
                  <tr key={idx}>
                    {Array.from({ length: 9 }).map((_, colIdx) => (
                      <td key={colIdx} className="px-6 py-4">
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse opacity-60 mb-2"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : getCurrentReportData().length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">Tidak ada data dosen mengajar {getTitle()}.</td>
                </tr>
              ) : (
                getCurrentReportData().map((dosen, idx) => {
                  // Gunakan type narrowing
                  let totalWaktuMenit = 0;
                  let totalModulPbl = 0;
                  let totalPbl = 0;
                  let totalSesi = 0;
                  if (activeTab === 'pbl') {
                    const d = dosen as DosenPBLReport;
                    totalWaktuMenit = d.total_waktu_menit;
                    // total modul PBL = jumlah seluruh modul_pbl di semua semester
                    totalModulPbl = d.per_semester.reduce((acc, sem) => acc + (sem.modul_pbl ? sem.modul_pbl.length : 0), 0);
                    // total PBL = jumlah unique mata_kuliah_kode di seluruh modul_pbl
                    const mkSet = new Set<string>();
                    d.per_semester.forEach(sem => {
                      sem.modul_pbl.forEach(modul => {
                        mkSet.add(modul.mata_kuliah_kode);
                      });
                    });
                    totalPbl = mkSet.size;
                    totalSesi = d.total_sesi;
                  } else {
                    // CSR pakai struktur baru
                    const d = dosen as any;
                    totalWaktuMenit = d.total_waktu_menit || (d.total_csr * 5 * 50);
                    totalModulPbl = d.total_csr; // CSR tidak relevan, tetap isi agar tidak error
                    totalPbl = d.total_csr;
                    totalSesi = d.total_sesi || (d.total_csr * 5);
                  }
                  const totalJam = Math.floor(totalWaktuMenit / 60);
                  const totalMenit = totalWaktuMenit % 60;
                  return (
                    <React.Fragment key={dosen.dosen_id}>
                      <tr className={
                        'group border-b-4 border-gray-200 dark:border-gray-800 ' +
                        (idx % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : '') +
                        ' hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors'
                      }>
                        {/* Nama dosen besar dan bold */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-semibold text-gray-900 dark:text-white mb-1">{dosen.dosen_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">NID: {dosen.nid}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* UI multi-peran profesional ala PBLGenerate dengan badge toggle (chevron) dan icon buku */}
                          {(() => {
                            const peranArr = (dosen as any).dosen_peran;
                            if (Array.isArray(peranArr) && peranArr.length > 0) {
                              const tipeList = ['ketua', 'anggota', 'mengajar'];
                              const tipeLabel: Record<string, string> = {
                                'ketua': 'Ketua',
                                'anggota': 'Anggota',
                                'mengajar': 'Dosen Mengajar',
                              };
                              const tipeBadge: Record<string, string> = {
                                'ketua': 'bg-blue-100 text-blue-700',
                                'anggota': 'bg-green-100 text-green-700',
                                'mengajar': 'bg-yellow-100 text-yellow-700',
                              };
                              return (
                                <div className="flex flex-col gap-2">
                                  {tipeList.map((tipe) => {
                                    const peranList = peranArr.filter((p: any) => p.tipe_peran === tipe);
                                    if (peranList.length === 0) return null;
                                    const rowKey = `${dosen.dosen_id}_${tipe}`;
                                    const isExpanded = !!expandedPeran[rowKey];
                                    return (
                                      <div key={tipe} className="mb-1">
                                        <button
                                          type="button"
                                          className={`px-3 py-1 rounded-full text-xs font-semibold ${tipeBadge[tipe]} mb-1 inline-flex items-center gap-1 focus:outline-none cursor-pointer`}
                                          onClick={() => toggleExpandedPeran(rowKey)}
                                          title="Klik untuk buka/tutup daftar peran"
                                        >
                                          {tipeLabel[tipe]} ({peranList.length})
                                          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="ml-1 w-3 h-3" />
                                        </button>
                                        {isExpanded && (
                                          <ul className="ml-0 mt-1 flex flex-col gap-2">
                                            {peranList.map((p: any, idx: number) => (
                                              <li
                                                key={idx}
                                                className="flex items-start gap-2 bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2 transition"
                                              >
                                                <FontAwesomeIcon icon={faBookOpen} className="text-blue-400 mt-1 w-4 h-4 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-brand-400 text-sm truncate">
                                                    {tipe === 'mengajar' 
                                                      ? (p.peran_kurikulum || '-')
                                                      : (p.mata_kuliah_nama || p.mata_kuliah_kode || '-')
                                                    }
                                                  </div>
                                                  {tipe === 'mengajar' ? (
                                                    // Untuk dosen mengajar, tidak ada info tambahan
                                                    null
                                                  ) : (
                                                    // Untuk ketua dan anggota, tampilkan semester dan blok
                                                    <div className="text-xs text-gray-400">
                                                      Semester {p.semester} | Blok {p.blok}
                                                    </div>
                                                  )}
                                                  {tipe !== 'mengajar' && p.peran_kurikulum && (
                                                    <div className="text-xs text-gray-500">{p.peran_kurikulum}</div>
                                                  )}
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {/* Jika tidak ada peran sama sekali, fallback ke peran_utama lama */}
                                  {tipeList.every(tipe => peranArr.filter((p: any) => p.tipe_peran === tipe).length === 0) && (() => {
                                    let peran: string = 'standby';
                                    if (typeof (dosen as any).peran_utama === 'string' && (dosen as any).peran_utama) {
                                      peran = (dosen as any).peran_utama;
                                    }
                                    let badgeClass = 'bg-gray-200 text-gray-700';
                                    let label = 'Standby';
                                    if (peran === 'ketua') {
                                      badgeClass = 'bg-blue-100 text-blue-700';
                                      label = 'Ketua';
                                    } else if (peran === 'anggota') {
                                      badgeClass = 'bg-green-100 text-green-700';
                                      label = 'Anggota';
                                    } else if (peran === 'dosen_mengajar') {
                                      badgeClass = 'bg-yellow-100 text-yellow-700';
                                      label = 'Dosen Mengajar';
                                    } else if (peran && peran.toLowerCase() === 'standby') {
                                      badgeClass = 'bg-gray-200 text-gray-700';
                                      label = 'Standby';
                                    }
                                    // Keterangan peran
                                    let keterangan = '-';
                                    if (peran === 'ketua' && (dosen as any).matkul_ketua_nama) {
                                      keterangan = `Ketua dari ${(dosen as any).matkul_ketua_nama}`;
                                    } else if (peran === 'anggota' && (dosen as any).matkul_anggota_nama) {
                                      keterangan = `Anggota dari ${(dosen as any).matkul_anggota_nama}`;
                                    } else if (peran === 'dosen_mengajar' && (dosen as any).peran_kurikulum_mengajar) {
                                      keterangan = `Peran dalam kurikulum: ${(dosen as any).peran_kurikulum_mengajar}`;
                                    }
                                    return (
                                      <div className="flex flex-col gap-1 mt-2">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${badgeClass} w-fit`}>{label}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{keterangan}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            } else {
                              // fallback ke peran_utama lama
                            let peran: string = 'standby';
                            if (typeof (dosen as any).peran_utama === 'string' && (dosen as any).peran_utama) {
                              peran = (dosen as any).peran_utama;
                            }
                            let badgeClass = 'bg-gray-200 text-gray-700';
                            let label = 'Standby';
                            if (peran === 'ketua') {
                              badgeClass = 'bg-blue-100 text-blue-700';
                              label = 'Ketua';
                            } else if (peran === 'anggota') {
                              badgeClass = 'bg-green-100 text-green-700';
                              label = 'Anggota';
                            } else if (peran === 'dosen_mengajar') {
                              badgeClass = 'bg-yellow-100 text-yellow-700';
                              label = 'Dosen Mengajar';
                            } else if (peran && peran.toLowerCase() === 'standby') {
                              badgeClass = 'bg-gray-200 text-gray-700';
                              label = 'Standby';
                            }
                            // Keterangan peran
                            let keterangan = '-';
                            if (peran === 'ketua' && (dosen as any).matkul_ketua_nama) {
                              keterangan = `Ketua dari ${(dosen as any).matkul_ketua_nama}`;
                            } else if (peran === 'anggota' && (dosen as any).matkul_anggota_nama) {
                              keterangan = `Anggota dari ${(dosen as any).matkul_anggota_nama}`;
                            } else if (peran === 'dosen_mengajar' && (dosen as any).peran_kurikulum_mengajar) {
                              keterangan = `Peran dalam kurikulum: ${(dosen as any).peran_kurikulum_mengajar}`;
                            }
                            return (
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${badgeClass} w-fit`}>{label}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{keterangan}</span>
                              </div>
                            );
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Badge keahlian seragam seperti di PBLGenerate.tsx */}
                        {(() => {
                          let keahlianArr: string[] = [];
                          if (Array.isArray(dosen.keahlian)) {
                            keahlianArr = dosen.keahlian;
                          } else if (typeof dosen.keahlian === 'string') {
                            const val = String(dosen.keahlian).trim();
                            if (val === '' || val === '[]') {
                              keahlianArr = [];
                            } else if (val.startsWith('[')) {
                              // Coba parse JSON array string
                              try {
                                keahlianArr = JSON.parse(val);
                              } catch {
                                keahlianArr = val.replace(/[\[\]"]/g, '').split(',').map((k: string) => k.trim()).filter(Boolean);
                              }
                            } else {
                              keahlianArr = val.split(',').map((k: string) => k.trim()).filter(Boolean);
                            }
                          } else {
                            keahlianArr = [];
                          }
                          return keahlianArr.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                              {keahlianArr.map((k, i) => (
                                  <span key={i} className="bg-gray-700 text-white dark:bg-gray-700 dark:text-white px-3 py-1 rounded-full text-xs font-medium">{k}</span>
                              ))}
                            </div>
                          ) : (
                            <span>-</span>
                          );
                        })()}
                      </td>
                        {/* Total Modul PBL */}
                        {activeTab === 'pbl' && (
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90 text-center font-semibold text-base">{totalModulPbl}</td>
                        )}
                        {/* Total PBL / CSR */}
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90 text-center font-semibold text-base">{activeTab === 'csr' ? (dosen as any).total_csr : totalPbl}</td>
                        {/* Total Waktu */}
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-base">
                                {totalJam > 0 ? `${totalJam}j ${totalMenit}m` : `${totalMenit}m`}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">({totalSesi} sesi, {activeTab === 'pbl' ? `${totalModulPbl} modul` : `${totalPbl} × 5×50 menit`})</span>
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                        <div className="flex flex-col gap-1">
                            {dosen.per_semester.map((sem, i) => {
                              let waktuPerSemester = 0;
                              let countPerSemester = 0;
                              let sesiPerSemester = 0;
                              if (activeTab === 'pbl') {
                                const s = sem as DosenPBLReport['per_semester'][0];
                                waktuPerSemester = s.total_waktu_menit;
                                countPerSemester = s.jumlah;
                                sesiPerSemester = s.total_sesi;
                              } else {
                                // CSR pakai struktur baru
                                const s = sem as any;
                                waktuPerSemester = s.total_waktu_menit;
                                countPerSemester = s.jumlah;
                                sesiPerSemester = s.total_sesi;
                              }
                            const jamPerSemester = Math.floor(waktuPerSemester / 60);
                            const menitPerSemester = waktuPerSemester % 60;
                            return (
                              <div key={sem.semester} className="mb-1">
                                  <button
                                    className="flex items-center gap-2 font-semibold text-brand-600 dark:text-brand-400 focus:outline-none"
                                    onClick={() => toggleExpand(dosen.dosen_id * 100 + sem.semester)}
                                    aria-expanded={!!expandedRows[dosen.dosen_id * 100 + sem.semester]}
                                  >
                                    <FontAwesomeIcon icon={expandedRows[dosen.dosen_id * 100 + sem.semester] ? faChevronUp : faChevronDown} className="w-3 h-3" />
                                    Semester {sem.semester}: {countPerSemester} {getTitle()} / {sesiPerSemester} sesi
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{jamPerSemester > 0 ? `${jamPerSemester}j ${menitPerSemester}m` : `${menitPerSemester}m`}</span>
                                  </button>
                                  {/* Collapsible detail modul/blok */}
                                  {activeTab === 'csr' && Array.isArray((sem as any).blok_csr) && (sem as any).blok_csr.length > 0 && expandedRows[dosen.dosen_id * 100 + sem.semester] && (
                                    <div className="ml-6 text-xs text-gray-700 dark:text-gray-300 space-y-2">
                                      {/* Group by blok, tampilkan info blok dan waktu */}
                                      {((sem as any).blok_csr as any[]).map((blok, idx) => {
                                        const jam = Math.floor((blok.waktu_menit || 0) / 60);
                                        const menit = (blok.waktu_menit || 0) % 60;
                                        return (
                                          <div key={idx}>
                                            <div className="flex items-center gap-2">
                                              <span>
                                                • CSR {blok.blok}: {blok.kode} — {blok.nama}, {blok.jumlah_sesi} sesi, {jam > 0 ? `${jam}j` : ''} {menit > 0 ? `${menit}m` : ''}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {activeTab === 'pbl' && (sem as DosenPBLReport['per_semester'][0]).modul_pbl && (sem as DosenPBLReport['per_semester'][0]).modul_pbl.length > 0 && expandedRows[dosen.dosen_id * 100 + sem.semester] && (
                                    <div className="ml-6 text-xs text-gray-700 dark:text-gray-300 space-y-2">
                                      {/* Group by blok + kode MK, lalu tampilkan modul di bawahnya */}
                                      {(() => {
                                        const modulPbl = (sem as DosenPBLReport['per_semester'][0]).modul_pbl;
                                        // Group by blok + kode MK
                                        const blokMap: Record<string, { blok: number, kode: string, nama: string, sesi: number, waktu: number, modul: number, modulList: {modul_ke: string, nama_modul: string}[] }> = {};
                                        modulPbl.forEach(modul => {
                                          const key = `${modul.blok}__${modul.mata_kuliah_kode}`;
                                          if (!blokMap[key]) {
                                            blokMap[key] = {
                                              blok: modul.blok,
                                              kode: modul.mata_kuliah_kode,
                                              nama: modul.mata_kuliah_nama,
                                              sesi: 0,
                                              waktu: 0,
                                              modul: 0,
                                              modulList: [],
                                            };
                                          }
                                          blokMap[key].sesi += modul.jumlah_sesi;
                                          blokMap[key].waktu += modul.waktu_menit;
                                          blokMap[key].modul += 1;
                                          blokMap[key].modulList.push({ modul_ke: modul.modul_ke, nama_modul: modul.nama_modul });
                                        });
                                        return Object.values(blokMap).sort((a, b) => a.blok - b.blok).map((blok, idx) => {
                                          const jam = Math.floor(blok.waktu / 60);
                                          const menit = blok.waktu % 60;
                                          return (
                                            <div key={idx}>
                                              <div className="flex items-center gap-2">
                                                <span>
                                                  • Blok {blok.blok}: {blok.kode} — {blok.modul} modul, {blok.sesi} sesi, {jam > 0 ? `${jam}j` : ''} {menit > 0 ? `${menit}m` : ''}
                                                </span>
                                              </div>
                                              <div className="ml-6 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                                {blok.modulList.sort((a, b) => Number(a.modul_ke) - Number(b.modul_ke)).map((modul, mIdx) => (
                                                  <div key={mIdx}>
                                                    - Modul {modul.modul_ke} ({modul.nama_modul})
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                          {dosen.tanggal_mulai ? new Date(dosen.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white/90">
                          {dosen.tanggal_akhir ? new Date(dosen.tanggal_akhir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                })
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
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                disabled={pagination.current_page === 1}
                className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: pagination.last_page }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPagination(prev => ({ ...prev, current_page: i + 1 }))}
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
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
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