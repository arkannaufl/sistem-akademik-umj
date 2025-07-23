import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ChevronLeftIcon } from '../icons';
import { AnimatePresence, motion } from 'framer-motion';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

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

export default function DetailNonBlokNonCSR() {
  const { kode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<MataKuliah | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk modal input jadwal materi
  const [showModal, setShowModal] = useState(false);
  const [jadwalMateri, setJadwalMateri] = useState<{
    no: number;
    hariTanggal: string;
    pukul: string;
    waktu: string;
    pengampu: string;
    materi: string;
    lokasi: string;
    isAgenda?: boolean;
    agenda?: string;
  }[]>([
    { no: 1, hariTanggal: "Selasa, 25/02/2025", pukul: "07.20-09.00", waktu: "2x50'", pengampu: "Drs. Fakhrurazi, MA", materi: "Manusia dan Agama", lokasi: "Cirendeu" },
    { no: 2, hariTanggal: "Selasa, 04/03/2025", pukul: "07.20-09.00", waktu: "2x50'", pengampu: "Drs. Fakhrurazi, MA", materi: "Allah dan Penciptaan Alam Semestea", lokasi: "Cirendeu" },
    { no: 3, hariTanggal: "Selasa, 11/03/2025", pukul: "07.20-09.00", waktu: "2x50'", pengampu: "Drs. Fakhrurazi, MA", materi: "Tauhidullah", lokasi: "Cirendeu" },
    { no: 4, hariTanggal: "Selasa, 18/03/2025", pukul: "07.20-09.00", waktu: "2x50'", pengampu: "Drs. Fakhrurazi, MA", materi: "Islam sebagai Agama Pilihan", lokasi: "Cirendeu" },
    { no: 5, hariTanggal: "Selasa, 25/03/2025", pukul: "07.20-09.00", waktu: "2x50'", pengampu: "Drs. Fakhrurazi, MA", materi: "Pokok-pokok Aqidah Islamiyah", lokasi: "Cirendeu" },
    { no: 6, hariTanggal: "Selasa, 01/04/2025", pukul: "07.20-09.00", waktu: "2x50'", pengampu: "Drs. Fakhrurazi, MA", materi: "Makna Syahadatain", lokasi: "Cirendeu" },
    { no: 7, hariTanggal: "Selasa, 08/04/2025", pukul: "07.20-09.00", waktu: "2x50'", pengampu: "Drs. Fakhrurazi, MA", materi: "Hal-hal yang Merusak Keimanan", lokasi: "Cirendeu" },
  ]);
  const [form, setForm] = useState({
    hariTanggal: '',
    jamMulai: '',
    jumlahKali: 2,
    jamSelesai: '',
    pengampu: '',
    materi: '',
    lokasi: '',
    jenisBaris: 'materi', // 'materi' | 'agenda'
    agenda: '', // hanya untuk agenda khusus
  });
  const [errorForm, setErrorForm] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteIndex, setSelectedDeleteIndex] = useState<number | null>(null);
  const dosenOptions = [
    'Drs. Fakhrurazi, MA',
    'Dr. Budi, M.Pd',
    'Dr. Siti, M.Ag',
    'Dr. Ahmad, M.Ag',
  ];
  const ruanganOptions = [
    'Ruang 1', 'Ruang 2', 'Ruang 3', 'Ruang 4', 'Ruang 5', 'Lab Biomedik', 'Lab Komputer', 'Aula', 'Auditorium', 'Ruang Dosen', 'Ruang Tutorial', 'Ruang OSCE', 'Ruang Skill Lab', 'Ruang Perpustakaan', 'Ruang Seminar'
  ];
  const jamMulaiOptions = [
    '07.20', '08.10', '09.00', '09.50', '10.40', '12.35', '13.25', '14.15', '15.35', '16.24'
  ];

  // Hitung jam selesai otomatis
  function hitungJamSelesai(jamMulai: string, jumlahKali: number) {
    if (!jamMulai) return '';
    // Support format jam dengan titik (misal 09.00, 07.20)
    const [jamStr, menitStr] = jamMulai.split(/[.:]/); // support titik atau titik dua
    const jam = Number(jamStr);
    const menit = Number(menitStr);
    if (isNaN(jam) || isNaN(menit)) return '';
    const totalMenit = jam * 60 + menit + jumlahKali * 50;
    const jamAkhir = Math.floor(totalMenit / 60).toString().padStart(2, '0');
    const menitAkhir = (totalMenit % 60).toString().padStart(2, '0');
    return `${jamAkhir}.${menitAkhir}`;
  }

  // Update jam selesai saat jam mulai/jumlah kali berubah
  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    let newForm = { ...form, [name]: value };
    if (name === 'jamMulai' || name === 'jumlahKali') {
      const jumlah = name === 'jumlahKali' ? Number(value) : Number(newForm.jumlahKali);
      newForm.jamSelesai = hitungJamSelesai(name === 'jamMulai' ? value : newForm.jamMulai, jumlah);
    }
    // Cek duplikat tanggal secara realtime
    let isDuplicate = false;
    if (name === 'hariTanggal') {
      isDuplicate = jadwalMateri.some((j, idx) => {
        if (!j.hariTanggal) return false;
        const tglStr = j.hariTanggal.split(', ')[1];
        const [day, month, year] = tglStr.split('/');
        const tglISO = `${year}-${month}-${day}`;
        // Saat edit, abaikan baris yang sedang diedit
        if (editIndex !== null && idx === editIndex) return false;
        return tglISO === value;
      });
      if (isDuplicate) {
        setErrorForm('Hari/Tanggal sudah ada di jadwal materi!');
      } else {
        setErrorForm('');
      }
    }
    // Validasi tanggal harus dalam rentang tanggal mulai & akhir
    if (name === 'hariTanggal' && data && value) {
      const tglMulai = new Date(data.tanggal_mulai || data.tanggalMulai || '');
      const tglAkhir = new Date(data.tanggal_akhir || data.tanggalAkhir || '');
      const tglInput = new Date(value);
      if (tglMulai && tglInput < tglMulai) {
        setErrorForm('Tanggal tidak boleh sebelum tanggal mulai!');
      } else if (tglAkhir && tglInput > tglAkhir) {
        setErrorForm('Tanggal tidak boleh setelah tanggal akhir!');
      } else if (!isDuplicate) {
        setErrorForm('');
      }
    }
    setForm(newForm);
  }

  function handleEditJadwal(idx: number) {
    const row = jadwalMateri[idx];
    // Ekstrak tanggal ISO dari string hariTanggal
    let tglISO = '';
    if (row.hariTanggal) {
      const tglStr = row.hariTanggal.split(', ')[1];
      if (tglStr) {
        const [day, month, year] = tglStr.split('/');
        tglISO = `${year}-${month}-${day}`;
      }
    }
    if (row.isAgenda) {
      setForm({
        hariTanggal: tglISO,
        jamMulai: row.pukul.split('-')[0],
        jumlahKali: Number(row.waktu.split('x')[0]),
        jamSelesai: row.pukul.split('-')[1],
        pengampu: row.pengampu,
        materi: '',
        lokasi: row.lokasi,
        jenisBaris: 'agenda',
        agenda: row.materi || '',
      });
    } else {
    setForm({
      hariTanggal: tglISO,
      jamMulai: row.pukul.split('-')[0],
      jumlahKali: Number(row.waktu.split('x')[0]),
      jamSelesai: row.pukul.split('-')[1],
      pengampu: row.pengampu,
      materi: row.materi,
      lokasi: row.lokasi,
      jenisBaris: 'materi',
      agenda: '',
    });
    }
    setEditIndex(idx);
    setShowModal(true);
    setErrorForm('');
  }

  function handleDeleteJadwal(idx: number) {
    setJadwalMateri(prev => prev.filter((_, i) => i !== idx).map((row, i) => ({ ...row, no: i + 1 })));
  }

  function handleTambahJadwal() {
    setErrorForm('');
    if (!form.hariTanggal || (form.jenisBaris === 'materi' && (!form.jamMulai || !form.jumlahKali || !form.pengampu || !form.materi || !form.lokasi)) || (form.jenisBaris === 'agenda' && !form.agenda)) return;
    // Cek duplikat tanggal (berdasarkan value date ISO)
    const isDuplicate = jadwalMateri.some((j, idx) => {
      if (!j.hariTanggal) return false;
      const tglStr = j.hariTanggal.split(', ')[1];
      const [day, month, year] = tglStr.split('/');
      const tglISO = `${year}-${month}-${day}`;
      // Saat edit, abaikan baris yang sedang diedit
      if (editIndex !== null && idx === editIndex) return false;
      return tglISO === form.hariTanggal;
    });
    if (isDuplicate) {
      setErrorForm('Hari/Tanggal sudah ada di jadwal materi!');
      return;
    }
    const tanggal = new Date(form.hariTanggal);
    const hari = tanggal.toLocaleDateString('id-ID', { weekday: 'long' });
    const tgl = tanggal.toLocaleDateString('id-ID');
    if (editIndex !== null) {
      setJadwalMateri(prev => prev.map((row, idx) => idx === editIndex ? (
        form.jenisBaris === 'agenda'
          ? {
              ...row,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              isAgenda: true,
              materi: form.agenda,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              lokasi: form.lokasi,
            }
          : {
              ...row,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              materi: form.materi,
              lokasi: form.lokasi,
              isAgenda: false,
            }
      ) : row));
    } else {
      setJadwalMateri(prev => [
        ...prev,
        form.jenisBaris === 'agenda'
          ? {
              no: prev.length + 1,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              isAgenda: true,
              materi: form.agenda,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              lokasi: form.lokasi,
            }
          : {
              no: prev.length + 1,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              materi: form.materi,
              lokasi: form.lokasi,
              isAgenda: false,
            },
      ]);
    }
    setShowModal(false);
    setForm({ hariTanggal: '', jamMulai: '', jumlahKali: 2, jamSelesai: '', pengampu: '', materi: '', lokasi: '', jenisBaris: 'materi', agenda: '' });
    setEditIndex(null);
  }

  useEffect(() => {
    if (!kode) return;
    setLoading(true);
    api.get(`/mata-kuliah/${kode}`)
      .then(res => setData(res.data))
      .catch(() => setError('Gagal mengambil data'))
      .finally(() => setLoading(false));
  }, [kode]);

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Non CSR Semester {data.semester}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-base mb-8">Informasi lengkap mata kuliah non blok Non-CSR</p>

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
            <div className="mb-2 text-gray-500 text-xs font-semibold suppercase">Periode</div>
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

      {/* TOMBOL TAMBAH JADWAL MATERI */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition-all duration-300"
        >
          Tambah Jadwal Kuliah
        </button>
      </div>

      {/* Tabel Jadwal Materi */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-8">
        <div className="max-w-full overflow-x-auto hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .max-w-full::-webkit-scrollbar { display: none; }
            .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            .hide-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
            <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">No</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Hari/Tanggal</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pukul</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Waktu</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pengampu</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Materi</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Lokasi</th>
                <th className="px-4 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[...jadwalMateri]
                .filter(row => {
                  if (!data) return true;
                  const tglMulai = new Date(data.tanggal_mulai || data.tanggalMulai || '');
                  const tglAkhir = new Date(data.tanggal_akhir || data.tanggalAkhir || '');
                  const tglStr = row.hariTanggal.split(', ')[1];
                  if (!tglStr) return false;
                  const [d, m, y] = tglStr.split('/').map(Number);
                  const tglRow = new Date(y, m - 1, d);
                  return tglRow >= tglMulai && tglRow <= tglAkhir;
                })
                .sort((a, b) => {
                  const tglA = a.hariTanggal.split(', ')[1];
                  const tglB = b.hariTanggal.split(', ')[1];
                  if (!tglA || !tglB) return 0;
                  const [dA, mA, yA] = tglA.split('/').map(Number);
                  const [dB, mB, yB] = tglB.split('/').map(Number);
                  const dateA = new Date(yA, mA - 1, dA);
                  const dateB = new Date(yB, mB - 1, dB);
                  return dateA.getTime() - dateB.getTime();
                })
                .map((row, idx) => (
                  <tr key={row.no} className={row.isAgenda ? 'bg-yellow-50 dark:bg-yellow-900/20' : (idx % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : '')}>
                    <td className="px-4 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.no}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.hariTanggal}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pukul}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.waktu}</td>
                    {row.isAgenda ? (
                      <td colSpan={2} className="px-6 py-4 text-center  uppercase bg-yellow-100 dark:bg-yellow-900/40 text-gray-900 dark:text-white whitespace-nowrap">
                        {row.materi}
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pengampu}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white/90`}>{row.materi}</td>
                      </>
                    )}
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.lokasi}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button onClick={() => handleEditJadwal(idx)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition mr-2" title="Edit Jadwal">
                        <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button onClick={() => { setSelectedDeleteIndex(idx); setShowDeleteModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition" title="Hapus Jadwal">
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT JADWAL MATERI */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-9999999 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500/30 dark:bg-gray-700/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-50 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-2 top-2 z-20 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white h-9 w-9 border border-gray-200 dark:border-gray-700 transition"
                aria-label="Tutup"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor" />
                </svg>
              </button>
              {/* Jenis Baris */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Baris</label>
                <select name="jenisBaris" value={form.jenisBaris} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="materi">Jadwal Materi</option>
                  <option value="agenda">Agenda Khusus</option>
                </select>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hari/Tanggal</label>
                  <input type="date" name="hariTanggal" value={form.hariTanggal} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {errorForm && <div className="text-sm text-red-500 mt-2">{errorForm}</div>}
                </div>
               {form.jenisBaris === 'agenda' && (
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keterangan Agenda</label>
                   <input type="text" name="agenda" value={form.agenda} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Contoh: UTS AIK 1, UAS, Libur, dll" />
                 </div>
               )}
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
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          backgroundColor: state.isDisabled
                            ? (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f3f4f6')
                            : (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f9fafb'),
                          borderColor: state.isFocused
                            ? '#3b82f6'
                            : (document.documentElement.classList.contains('dark') ? '#334155' : '#d1d5db'),
                          boxShadow: state.isFocused ? '0 0 0 2px #3b82f633' : undefined,
                          borderRadius: '0.5rem',
                          minHeight: '2.5rem',
                          fontSize: '0.875rem',
                          color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem',
                          '&:hover': { borderColor: '#3b82f6' },
                        }),
                        menu: base => ({
                          ...base,
                          zIndex: 9999,
                          fontSize: '0.875rem',
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
                          fontSize: '0.875rem',
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
                    <select name="jumlahKali" value={form.jumlahKali} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} x 50'</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                  <input type="text" name="jamSelesai" value={form.jamSelesai} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
                </div>
                {form.jenisBaris === 'materi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pengampu</label>
                  <Select
                    options={dosenOptions.map(d => ({ value: d, label: d }))}
                    value={dosenOptions.map(d => ({ value: d, label: d })).find(opt => opt.value === form.pengampu) || null}
                    onChange={opt => setForm({ ...form, pengampu: opt?.value || '' })}
                    placeholder="Pilih Dosen"
                    isClearable
                    classNamePrefix="react-select"
                    className="react-select-container"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        backgroundColor: state.isDisabled
                          ? (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f3f4f6')
                          : (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f9fafb'),
                        borderColor: state.isFocused
                          ? '#3b82f6'
                          : (document.documentElement.classList.contains('dark') ? '#334155' : '#d1d5db'),
                        boxShadow: state.isFocused ? '0 0 0 2px #3b82f633' : undefined,
                        borderRadius: '0.5rem',
                        minHeight: '2.5rem',
                        fontSize: '0.875rem',
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                        paddingLeft: '0.75rem',
                        paddingRight: '0.75rem',
                        '&:hover': { borderColor: '#3b82f6' },
                      }),
                      menu: base => ({
                        ...base,
                        zIndex: 9999,
                        fontSize: '0.875rem',
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
                        fontSize: '0.875rem',
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
                )}
                {form.jenisBaris === 'materi' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materi</label>
                    <input type="text" name="materi" value={form.materi} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruangan</label>
                  <Select
                    options={ruanganOptions.map(r => ({ value: r, label: r }))}
                    value={ruanganOptions.map(r => ({ value: r, label: r })).find(opt => opt.value === form.lokasi) || null}
                    onChange={opt => setForm({ ...form, lokasi: opt?.value || '' })}
                    placeholder="Pilih Ruangan"
                    isClearable
                    classNamePrefix="react-select"
                    className="react-select-container"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        backgroundColor: state.isDisabled
                          ? (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f3f4f6')
                          : (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f9fafb'),
                        borderColor: state.isFocused
                          ? '#3b82f6'
                          : (document.documentElement.classList.contains('dark') ? '#334155' : '#d1d5db'),
                        boxShadow: state.isFocused ? '0 0 0 2px #3b82f633' : undefined,
                        borderRadius: '0.5rem',
                        minHeight: '2.5rem',
                        fontSize: '0.875rem',
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
                        paddingLeft: '0.75rem',
                        paddingRight: '0.75rem',
                        '&:hover': { borderColor: '#3b82f6' },
                      }),
                      menu: base => ({
                        ...base,
                        zIndex: 9999,
                        fontSize: '0.875rem',
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
                        fontSize: '0.875rem',
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
              </div>
              <div className="flex justify-end gap-2 pt-6">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">Batal</button>
                <button onClick={handleTambahJadwal} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled={!form.hariTanggal || (form.jenisBaris === 'materi' && (!form.jamMulai || !form.jumlahKali || !form.pengampu || !form.materi || !form.lokasi)) || (form.jenisBaris === 'agenda' && !form.agenda) || !!errorForm}>Simpan</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL KONFIRMASI HAPUS */}
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

      {/* Placeholder untuk tabel/komponen lain */}
      {/* <div className="mt-8">Tabel/komponen lain di sini</div> */}
    </div>
  );
} 