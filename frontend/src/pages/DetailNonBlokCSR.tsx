import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ChevronLeftIcon } from '../icons';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'framer-motion';


interface MataKuliah {
  kode: string;
  nama: string;
  semester: number;
  periode: string;
  kurikulum: number;
  jenis: string;
  tipe_non_block?: string;
  tanggal_mulai?: string;
  tanggal_akhir?: string;
  tanggalMulai?: string;
  tanggalAkhir?: string;
  durasi_minggu?: number | null;
  durasiMinggu?: number | null;
}

interface JadwalCSR {
  no: number;
  jenisCSR: 'reguler' | 'responsi';
  hariTanggal: string;
  jamMulai: string;
  jumlahKali: number;
  jamSelesai: string;
  pengampu: string;
  lokasi: string;
  kelompok: string;
  keahlian: string;
}

export default function DetailNonBlokCSR() {
  const { kode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<MataKuliah | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [jadwalCSR, setJadwalCSR] = useState<JadwalCSR[]>(() => {
    if (typeof window === 'undefined') return [];
    const kodeCSR = kode || '';
    const saved = localStorage.getItem(`jadwalCSR_${kodeCSR}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [form, setForm] = useState<{
    jenisCSR: 'reguler' | 'responsi' | '';
    hariTanggal: string;
    jamMulai: string;
    jumlahKali: number;
    jamSelesai: string;
    pengampu: string;
    lokasi: string;
    kelompok: string;
    keahlian: string;
  }>({
    jenisCSR: '',
    hariTanggal: '',
    jamMulai: '',
    jumlahKali: 3,
    jamSelesai: '',
    pengampu: '',
    lokasi: '',
    kelompok: '',
    keahlian: '',
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [errorForm, setErrorForm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteIndex, setSelectedDeleteIndex] = useState<number | null>(null);

  const dosenOptions = [
    'dr. Tirta Prawitasari, M.Sc, Sp.GK',
    'dr. Ikrimah Nisa Utami, Sp.PD',
    'dr. Sugiarto, Sp.PA',
    'dr. Muhamad Dwi Putra, M.Biomed',
    'dr. Rahma Ayu Larasati, M.Biomed',
    'Dr.dr.Fanny Septiani Farhan, M.Biomed',
    'dr. Diah Karomah, M.Biomed',
    'dr. Priyanka G. Utami, Sp.N',
    'dr. Putri Anugrah Rizki, Sp.THT-KL',
    'dr. Heryanto Syamsudin, Sp.KK',
    'dr. Sri Fulina, Sp.M',
    'dr. Ario Bimo Hanggono, Sp.OG',
    'dr. Khomimah, Sp.PD-KEMD, FINASIM',
    'dr. Rusdi Effendi, Sp.KJ, MM',
    'dr. Robiah Khairani Hasibuan, Sp.S',
    'Dr. Oneng Nurul Bariyah, M.Ag.',
    'Dr. Saiful Bahri, LC.MA',
    'dr. Lucky Brillianita, M.Biomed',
    'dr. Eddy Multazam, Sp.FK',
  ];
  const ruanganOptions = [
    'Ruang 1', 'Ruang 2', 'Ruang 3', 'Ruang 4', 'Ruang 5', 'Lab Biomedik', 'Lab Komputer', 'Aula', 'Auditorium', 'Ruang Dosen', 'Ruang Tutorial', 'Ruang OSCE', 'Ruang Skill Lab', 'Ruang Perpustakaan', 'Ruang Seminar'
  ];
  const jamMulaiOptions = [
    '07.20', '08.10', '09.00', '09.50', '10.40', '12.35', '13.25', '14.15', '15.35', '16.24'
  ];

  function hitungJamSelesai(jamMulai: string, jumlahKali: number) {
    if (!jamMulai) return '';
    const [jamStr, menitStr] = jamMulai.split(/[.:]/);
    const jam = Number(jamStr);
    const menit = Number(menitStr);
    if (isNaN(jam) || isNaN(menit)) return '';
    const totalMenit = jam * 60 + menit + jumlahKali * 50;
    const jamAkhir = Math.floor(totalMenit / 60).toString().padStart(2, '0');
    const menitAkhir = (totalMenit % 60).toString().padStart(2, '0');
    return `${jamAkhir}.${menitAkhir}`;
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    let newForm = { ...form, [name]: value };
    if (name === 'jenisCSR') {
      newForm.jumlahKali = value === 'reguler' ? 3 : value === 'responsi' ? 2 : 3;
      newForm.jamSelesai = hitungJamSelesai(newForm.jamMulai, newForm.jumlahKali);
    }
    if (name === 'jamMulai') {
      newForm.jamSelesai = hitungJamSelesai(value, newForm.jumlahKali);
    }
    // Validasi tanggal seperti di DetailBlok.tsx
    if (name === 'hariTanggal' && data && value) {
      const tglMulai = new Date(data.tanggal_mulai || data.tanggalMulai || '');
      const tglAkhir = new Date(data.tanggal_akhir || data.tanggalAkhir || '');
      const tglInput = new Date(value);
      if (tglMulai && tglInput < tglMulai) {
        setErrorForm('Tanggal tidak boleh sebelum tanggal mulai!');
      } else if (tglAkhir && tglInput > tglAkhir) {
        setErrorForm('Tanggal tidak boleh setelah tanggal akhir!');
      } else {
        setErrorForm('');
      }
    }
    setForm(newForm);
  }

  function handleTambahJadwal() {
    setErrorForm('');
    if (!form.jenisCSR || !form.hariTanggal || !form.jamMulai || !form.jamSelesai || !form.pengampu || !form.lokasi) return;
    if (editIndex !== null) {
      setJadwalCSR(prev => prev.map((row, idx) => idx === editIndex ? {
        ...row,
        jenisCSR: form.jenisCSR as 'reguler' | 'responsi',
        hariTanggal: form.hariTanggal,
        jamMulai: form.jamMulai,
        jumlahKali: form.jumlahKali,
        jamSelesai: form.jamSelesai,
        pengampu: form.pengampu,
        lokasi: form.lokasi,
        kelompok: form.kelompok,
        keahlian: form.keahlian,
      } : row));
    } else {
      setJadwalCSR(prev => [
        ...prev,
        {
          no: prev.length + 1,
          jenisCSR: form.jenisCSR as 'reguler' | 'responsi',
          hariTanggal: form.hariTanggal,
          jamMulai: form.jamMulai,
          jumlahKali: form.jumlahKali,
          jamSelesai: form.jamSelesai,
          pengampu: form.pengampu,
          lokasi: form.lokasi,
          kelompok: form.kelompok,
          keahlian: form.keahlian,
        }
      ]);
    }
    setShowModal(false);
    setForm({ jenisCSR: '', hariTanggal: '', jamMulai: '', jumlahKali: 3, jamSelesai: '', pengampu: '', lokasi: '', kelompok: '', keahlian: '' });
    setEditIndex(null);
  }

  function handleEditJadwal(idx: number) {
    const row = jadwalCSR[idx];
    let tglISO = '';
    if (row.hariTanggal) {
      const tglStr = row.hariTanggal.split(', ')[1];
      if (tglStr) {
        const [day, month, year] = tglStr.split('/');
        if (day && month && year) {
          tglISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
    setForm({
      jenisCSR: row.jenisCSR,
      hariTanggal: tglISO,
      jamMulai: row.jamMulai,
      jumlahKali: row.jumlahKali,
      jamSelesai: row.jamSelesai,
      pengampu: row.pengampu,
      lokasi: row.lokasi,
      kelompok: row.kelompok,
      keahlian: row.keahlian,
    });
    setEditIndex(idx);
    setShowModal(true);
    setErrorForm('');
  }

  function handleDeleteJadwal(idx: number) {
    setJadwalCSR(prev => prev.filter((_, i) => i !== idx).map((row, i) => ({ ...row, no: i + 1 })));
  }
  
  useEffect(() => {
    if (!kode) return;
    setLoading(true);
    api.get(`/mata-kuliah/${kode}`)
      .then(res => setData(res.data))
      .catch(() => setError('Gagal mengambil data'))
      .finally(() => setLoading(false));
  }, [kode]);

  useEffect(() => {
    if (!kode) return;
    localStorage.setItem(`jadwalCSR_${kode}`, JSON.stringify(jadwalCSR));
  }, [jadwalCSR, kode]);

  if (loading) return (
    <div className="w-full mx-auto">
      <div className="h-8 w-80 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
      <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse mt-8" />
    </div>
  );
  if (error) return <div>{error}</div>;
  if (!data) return <div>Data tidak ditemukan</div>;

  return (
    <div>
      {/* Header */}
      <div className="pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-brand-500 font-medium hover:text-brand-600 transition px-0 py-0 bg-transparent shadow-none"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Kembali
        </button>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{data.nama}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-base mb-8">Informasi lengkap mata kuliah non blok CSR</p>

      {/* Card Info Utama */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 mb-8 shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Kode Mata Kuliah</div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">{data.kode}</div>
          </div>
          <div>
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Nama Mata Kuliah</div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">{data.nama}</div>
          </div>
          <div>
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Semester</div>
            <div className="text-base text-gray-800 dark:text-white">Semester {data.semester}</div>
          </div>
          <div>
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Periode</div>
            <div className="text-base text-gray-800 dark:text-white">{data.periode}</div>
          </div>
          <div>
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Kurikulum</div>
            <div className="text-base text-gray-800 dark:text-white">{data.kurikulum}</div>
          </div>
          <div>
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Jenis</div>
            <div className="text-base text-gray-800 dark:text-white">{data.jenis}</div>
          </div>
          <div>
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Tipe Non-Blok</div>
            <div className="text-base text-gray-800 dark:text-white">{data.tipe_non_block || '-'}</div>
          </div>
        </div>
      </div>

      {/* Section Info Tambahan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Tanggal Mulai</div>
          <div className="text-base text-gray-800 dark:text-white">{(data.tanggal_mulai ? new Date(data.tanggal_mulai).toLocaleDateString('id-ID') : data.tanggalMulai ? new Date(data.tanggalMulai).toLocaleDateString('id-ID') : '-' )}</div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Tanggal Akhir</div>
          <div className="text-base text-gray-800 dark:text-white">{(data.tanggal_akhir ? new Date(data.tanggal_akhir).toLocaleDateString('id-ID') : data.tanggalAkhir ? new Date(data.tanggalAkhir).toLocaleDateString('id-ID') : '-' )}</div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Durasi Minggu</div>
          <div className="text-base text-gray-800 dark:text-white">{data.durasi_minggu || data.durasiMinggu || '-'}</div>
        </div>
      </div>

      {/* Placeholder untuk tabel/komponen lain */}
      {/* <div className="mt-8">Tabel/komponen lain di sini</div> */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Jadwal CSR</h2>
          <button
            onClick={() => {
              setForm({ jenisCSR: '', hariTanggal: '', jamMulai: '', jumlahKali: 3, jamSelesai: '', pengampu: '', lokasi: '', kelompok: '', keahlian: '' });
              setEditIndex(null);
              setShowModal(true);
              setErrorForm('');
            }}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition"
          >
            Tambah Jadwal
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">No</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Jenis CSR</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Hari/Tanggal</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pukul</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Waktu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pengampu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Ruangan</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Kelompok</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Mata Kuliah</th>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwalCSR.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-gray-400">Tidak ada data CSR</td>
                  </tr>
                ) : (
                  jadwalCSR.map((row, i) => (
                    <tr key={row.no} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                      <td className="px-4 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.no}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jenisCSR === 'reguler' ? 'CSR Reguler' : 'CSR Responsi'}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.hariTanggal}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jamMulai}–{row.jamSelesai}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jumlahKali}x50'</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pengampu}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.lokasi}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.kelompok}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.keahlian}</td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button onClick={() => handleEditJadwal(i)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition mr-2" title="Edit Jadwal">
                          <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button onClick={() => { setSelectedDeleteIndex(i); setShowDeleteModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition" title="Hapus Jadwal">
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Modal input jadwal CSR */}
      {showModal && (
        <div className="fixed inset-0 z-9999999 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-500/30 dark:bg-gray-700/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="relative w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-50 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-2 top-2 z-20 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white h-9 w-9 border border-gray-200 dark:border-gray-700 transition"
              aria-label="Tutup"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor" />
              </svg>
            </button>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis CSR</label>
                <select
                  name="jenisCSR"
                  value={form.jenisCSR}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Pilih Jenis CSR</option>
                  <option value="reguler">CSR Reguler</option>
                  <option value="responsi">CSR Responsi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelompok</label>
                <select
                  name="kelompok"
                  value={form.kelompok}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Pilih Kelompok</option>
                  <option value="Kelompok 1">Kelompok 1</option>
                  <option value="Kelompok 2">Kelompok 2</option>
                  <option value="Kelompok 3">Kelompok 3</option>
                  <option value="Kelompok 4">Kelompok 4</option>
                  <option value="Kelompok 5">Kelompok 5</option>
                  <option value="Kelompok 6">Kelompok 6</option>
                  <option value="Kelompok 7">Kelompok 7</option>
                  <option value="Kelompok 8">Kelompok 8</option>
                  <option value="Kelompok 9">Kelompok 9</option>
                  <option value="Kelompok 10">Kelompok 10</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hari/Tanggal</label>
                <input type="date" name="hariTanggal" value={form.hariTanggal} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                {errorForm && <div className="text-sm text-red-500 mt-2">{errorForm}</div>}
               
              
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Mulai</label>
                  <Select
                    options={jamMulaiOptions.map(j => ({ value: j, label: j }))}
                    value={jamMulaiOptions.map(j => ({ value: j, label: j })).find(opt => opt.value === form.jamMulai) || null}
                    onChange={opt => {
                      const value = opt?.value || '';
                      setForm(f => ({
                        ...f,
                        jamMulai: value,
                        jamSelesai: hitungJamSelesai(value, f.jumlahKali)
                      }));
                    }}
                    classNamePrefix="react-select"
                    className="react-select-container"
                    isClearable
                    placeholder="Pilih Jam Mulai"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#f9fafb',
                        borderColor: state.isFocused
                          ? '#3b82f6'
                          : (document.documentElement.classList.contains('dark') ? '#334155' : '#d1d5db'),
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                        boxShadow: state.isFocused ? '0 0 0 2px #3b82f633' : undefined,
                        borderRadius: '0.75rem',
                        minHeight: '2.5rem',
                        fontSize: '1rem',
                        paddingLeft: '0.75rem',
                        paddingRight: '0.75rem',
                        '&:hover': { borderColor: '#3b82f6' },
                      }),
                      menu: base => ({
                        ...base,
                        zIndex: 9999,
                        fontSize: '1rem',
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? '#3b82f6'
                          : state.isFocused
                          ? (document.documentElement.classList.contains('dark') ? '#334155' : '#e0e7ff')
                          : (document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff'),
                        color: state.isSelected
                          ? '#fff'
                          : (document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937'),
                        fontSize: '1rem',
                      }),
                      singleValue: base => ({
                        ...base,
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                      }),
                      placeholder: base => ({
                        ...base,
                        color: document.documentElement.classList.contains('dark') ? '#64748b' : '#6b7280',
                      }),
                      input: base => ({
                        ...base,
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                      }),
                      dropdownIndicator: base => ({
                        ...base,
                        color: document.documentElement.classList.contains('dark') ? '#64748b' : '#6b7280',
                        '&:hover': { color: '#3b82f6' },
                      }),
                      indicatorSeparator: base => ({
                        ...base,
                        backgroundColor: 'transparent',
                      }),
                    }}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">x 50 menit</label>
                  <input type="text" value={form.jumlahKali + " x 50'"} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                <input type="text" name="jamSelesai" value={form.jamSelesai} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mata Kuliah</label>
                <select
                  name="keahlian"
                  value={form.keahlian}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Pilih Mata Kuliah</option>
                  <option value="Kardiologi">Kardiologi</option>
                  <option value="Bedah">Bedah</option>
                  <option value="Pediatri">Pediatri</option>
                  <option value="Patologi">Patologi</option>
                  <option value="Radiologi">Radiologi</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pengampu</label>
                <Select
                  options={dosenOptions.map(d => ({ value: d, label: d }))}
                  value={dosenOptions.map(d => ({ value: d, label: d })).find(opt => opt.value === form.pengampu) || null}
                  onChange={opt => setForm(f => ({ ...f, pengampu: opt?.value || '' }))}
                  placeholder="Pilih Dosen"
                  isClearable
                  classNamePrefix="react-select"
                  className="react-select-container"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#f9fafb',
                      borderColor: state.isFocused
                        ? '#3b82f6'
                        : (document.documentElement.classList.contains('dark') ? '#334155' : '#d1d5db'),
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                      boxShadow: state.isFocused ? '0 0 0 2px #3b82f633' : undefined,
                      borderRadius: '0.75rem',
                      minHeight: '2.5rem',
                      fontSize: '1rem',
                      paddingLeft: '0.75rem',
                      paddingRight: '0.75rem',
                      '&:hover': { borderColor: '#3b82f6' },
                    }),
                    menu: base => ({
                      ...base,
                      zIndex: 9999,
                      fontSize: '1rem',
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected
                        ? '#3b82f6'
                        : state.isFocused
                        ? (document.documentElement.classList.contains('dark') ? '#334155' : '#e0e7ff')
                        : (document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff'),
                      color: state.isSelected
                        ? '#fff'
                        : (document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937'),
                      fontSize: '1rem',
                    }),
                    singleValue: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                    }),
                    placeholder: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#64748b' : '#6b7280',
                    }),
                    input: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                    }),
                    dropdownIndicator: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#64748b' : '#6b7280',
                      '&:hover': { color: '#3b82f6' },
                    }),
                    indicatorSeparator: base => ({
                      ...base,
                      backgroundColor: 'transparent',
                    }),
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruangan</label>
                <Select
                  options={ruanganOptions.map(r => ({ value: r, label: r }))}
                  value={ruanganOptions.map(r => ({ value: r, label: r })).find(opt => opt.value === form.lokasi) || null}
                  onChange={opt => setForm(f => ({ ...f, lokasi: opt?.value || '' }))}
                  placeholder="Pilih Ruangan"
                  isClearable
                  classNamePrefix="react-select"
                  className="react-select-container"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#f9fafb',
                      borderColor: state.isFocused
                        ? '#3b82f6'
                        : (document.documentElement.classList.contains('dark') ? '#334155' : '#d1d5db'),
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                      boxShadow: state.isFocused ? '0 0 0 2px #3b82f633' : undefined,
                      borderRadius: '0.75rem',
                      minHeight: '2.5rem',
                      fontSize: '1rem',
                      paddingLeft: '0.75rem',
                      paddingRight: '0.75rem',
                      '&:hover': { borderColor: '#3b82f6' },
                    }),
                    menu: base => ({
                      ...base,
                      zIndex: 9999,
                      fontSize: '1rem',
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected
                        ? '#3b82f6'
                        : state.isFocused
                        ? (document.documentElement.classList.contains('dark') ? '#334155' : '#e0e7ff')
                        : (document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff'),
                      color: state.isSelected
                        ? '#fff'
                        : (document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937'),
                      fontSize: '1rem',
                    }),
                    singleValue: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                    }),
                    placeholder: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#64748b' : '#6b7280',
                    }),
                    input: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                    }),
                    dropdownIndicator: base => ({
                      ...base,
                      color: document.documentElement.classList.contains('dark') ? '#64748b' : '#6b7280',
                      '&:hover': { color: '#3b82f6' },
                    }),
                    indicatorSeparator: base => ({
                      ...base,
                      backgroundColor: 'transparent',
                    }),
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-6">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">Batal</button>
                <button onClick={handleTambahJadwal} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled={!form.jenisCSR || !form.hariTanggal || !form.jamMulai || !form.jamSelesai || !form.pengampu || !form.lokasi}>{editIndex !== null ? 'Simpan' : 'Tambah Jadwal'}</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-500/30 dark:bg-gray-700/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="relative w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-50">
              <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Konfirmasi Hapus</h2>
              <p className="mb-6 text-gray-500 dark:text-gray-300">Apakah Anda yakin ingin menghapus data ini? Data yang dihapus tidak dapat dikembalikan.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">Batal</button>
                <button onClick={() => { if (selectedDeleteIndex !== null) { handleDeleteJadwal(selectedDeleteIndex); setShowDeleteModal(false); setSelectedDeleteIndex(null); } }} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium shadow-theme-xs hover:bg-red-600 transition">Hapus</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
} 