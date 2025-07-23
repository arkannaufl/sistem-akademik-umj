import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ChevronLeftIcon } from '../icons';
import { AnimatePresence, motion } from 'framer-motion';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faStar } from '@fortawesome/free-solid-svg-icons';

interface MataKuliah {
  kode: string;
  nama: string;
  semester: number;
  periode: string;
  kurikulum: number;
  jenis: string;
  blok?: number | null;
  tanggal_mulai?: string;
  tanggal_akhir?: string;
  tanggalMulai?: string;
  tanggalAkhir?: string;
  durasi_minggu?: number | null;
  durasiMinggu?: number | null;
}

// Tambahkan type untuk baris jadwal
interface JadwalBaris {
  no: number;
  bagian?: string;
  hariTanggal: string;
  pukul?: string;
  waktu?: string;
  pengampu?: string;
  materi?: string;
  lokasi?: string;
  isAgenda?: boolean;
  agenda?: string;
  kelasPraktikum?: string; // Tambahkan kelasPraktikum
  topik?: string; // Tambahkan topik
  jenisBaris?: 'materi' | 'agenda' | 'praktikum' | 'pbl' | 'jurnal'; // Tambahkan 'jurnal'
  pblTipe?: string; // 'PBL 1' | 'PBL 2'
  modul?: string; // 'Modul 1' | 'Modul 2' | 'Modul 3'
  kelompok?: string; // 'Kelompok 1' ... 'Kelompok 12'
  jamMulai?: string;
  jumlahKali?: number;
  jamSelesai?: string;
  fileJurnal?: File | null; // Untuk file upload jurnal reading
}

export default function DetailBlok() {
  const { kode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<MataKuliah | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk modal input jadwal materi
  const [showModal, setShowModal] = useState(false);
  // Ganti inisialisasi jadwalMateri agar langsung ambil dari localStorage
  const [jadwalMateri, setJadwalMateri] = useState(() => {
    if (typeof window === 'undefined') return [];
    const kodeBlok = kode || '';
    const saved = localStorage.getItem(`jadwalMateri_${kodeBlok}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [form, setForm] = useState<{
    hariTanggal: string;
    jamMulai: string;
    jumlahKali: number;
    jamSelesai: string;
    pengampu: string;
    materi: string;
    topik: string;
    lokasi: string;
    jenisBaris: string;
    agenda: string;
    kelasPraktikum: string;
    pblTipe: string;
    modul: string;
    kelompok: string;
    fileJurnal: File | null;
  }>(
    {
    hariTanggal: '',
    jamMulai: '',
    jumlahKali: 2,
    jamSelesai: '',
    pengampu: '',
    materi: '',
      topik: '',
    lokasi: '',
      jenisBaris: 'materi',
      agenda: '',
      kelasPraktikum: '',
    pblTipe: '',
    modul: '',
    kelompok: '',
      fileJurnal: null,
    }
  );
  const [errorForm, setErrorForm] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
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
  // 1. Tambahkan opsi materi
  const materiOptions = [
    'IPD', 'PA', 'Biokimia', 'Imunologi', 'Fisiologi', 'Histologi', 'Psikiatri', 'THT', 'Kulit Kelamin', 'Orthopedi', 'Mata', 'Gizi', 'Obgyn', 'AIK', 'Anatomi', 'Farmakologi'
  ];
  // Tambahkan opsi kelas praktikum dummy
  const kelasPraktikumOptions = [
    { value: 'Kelas A', label: 'Kelas A' },
    { value: 'Kelas B', label: 'Kelas B' },
    { value: 'Kelas C', label: 'Kelas C' },
  ];

  // Dummy data modul untuk PBL
  const modulPBLDummy = [
    { value: 'Modul 1', label: 'Modul 1 (Kardiovaskuler Dasar)' },
    { value: 'Modul 2', label: 'Modul 2 (Respirasi)' },
    { value: 'Modul 3', label: 'Modul 3 (Pencernaan)' },
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
    if (name === 'jamMulai' || name === 'jumlahKali') {
      const jumlah = name === 'jumlahKali' ? Number(value) : Number(newForm.jumlahKali);
      newForm.jamSelesai = hitungJamSelesai(name === 'jamMulai' ? value : newForm.jamMulai, jumlah);
    }
    let isDuplicate = false;
    if (name === 'hariTanggal') {
      isDuplicate = jadwalMateri.some((j: JadwalBaris, idx: number) => {
        if (!j.hariTanggal) return false;
        const tglStr = j.hariTanggal.split(', ')[1];
        const [day, month, year] = tglStr.split('/');
        const tglISO = `${year}-${month}-${day}`;
        if (editIndex !== null && idx === editIndex) return false;
        return tglISO === value;
      });
      if (isDuplicate) {
        setErrorForm('Hari/Tanggal sudah ada di jadwal materi!');
      } else {
        setErrorForm('');
      }
    }
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
    if (row.jenisBaris === 'agenda') {
      setForm({
        hariTanggal: tglISO,
        jamMulai: row.pukul?.split('-')[0] || '',
        jumlahKali: Number(row.waktu?.split('x')[0]) || 2,
        jamSelesai: row.pukul?.split('-')[1] || '',
        pengampu: '',
        materi: '',
        topik: '',
        lokasi: row.lokasi || '',
        jenisBaris: 'agenda',
        agenda: row.agenda || '',
        kelasPraktikum: '',
        pblTipe: '',
        modul: '',
        kelompok: '',
        fileJurnal: null, // Tambahkan fileJurnal
      });
    } else if (row.jenisBaris === 'praktikum') {
      setForm({
        hariTanggal: tglISO,
        jamMulai: row.pukul?.split('-')[0] || '',
        jumlahKali: Number(row.waktu?.split('x')[0]) || 2,
        jamSelesai: row.pukul?.split('-')[1] || '',
        pengampu: row.pengampu || '',
        materi: row.materi || row.topik || '',
        topik: row.topik || row.materi || '',
        lokasi: row.lokasi || '',
        jenisBaris: 'praktikum',
        agenda: '',
        kelasPraktikum: row.kelasPraktikum || '',
        pblTipe: '',
        modul: '',
        kelompok: '',
        fileJurnal: null, // Tambahkan fileJurnal
      });
    } else if (row.jenisBaris === 'pbl') {
      setForm({
        hariTanggal: tglISO,
        jamMulai: row.jamMulai || '',
        jumlahKali: row.jumlahKali || 2,
        jamSelesai: row.jamSelesai || '',
        pengampu: row.pengampu || '',
        materi: '',
        topik: '',
        lokasi: row.lokasi || '',
        jenisBaris: 'pbl',
        agenda: '',
        kelasPraktikum: '',
        pblTipe: row.pblTipe || '',
        modul: row.modul || '',
        kelompok: row.kelompok || '',
        fileJurnal: null, // Tambahkan fileJurnal
      });
    } else if (row.jenisBaris === 'jurnal') {
      setForm({
        hariTanggal: tglISO,
        jamMulai: row.jamMulai || '',
        jumlahKali: row.jumlahKali || 1,
        jamSelesai: row.jamSelesai || '',
        pengampu: row.pengampu || '',
        materi: '',
        topik: '',
        lokasi: row.lokasi || '',
        jenisBaris: 'jurnal',
        agenda: '',
        kelasPraktikum: '',
        pblTipe: '',
        modul: '',
        kelompok: row.kelompok || '',
        fileJurnal: null, // Tambahkan fileJurnal
      });
    } else {
      setForm({
        hariTanggal: tglISO,
        jamMulai: row.pukul?.split('-')[0] || '',
        jumlahKali: Number(row.waktu?.split('x')[0]) || 2,
        jamSelesai: row.pukul?.split('-')[1] || '',
        pengampu: row.pengampu || '',
        materi: row.materi || row.topik || '',
        topik: row.topik || row.materi || '',
        lokasi: row.lokasi || '',
        jenisBaris: 'materi',
        agenda: '',
        kelasPraktikum: '',
        pblTipe: '',
        modul: '',
        kelompok: '',
        fileJurnal: null, // Tambahkan fileJurnal
      });
    }
    setEditIndex(idx);
    setErrorForm('');
    setShowModal(true);
  }

  function handleDeleteJadwal(idx: number) {
    setJadwalMateri((prev: JadwalBaris[]) => prev.filter((_: JadwalBaris, i: number) => i !== idx).map((row: JadwalBaris, i: number) => ({ ...row, no: i + 1 })));
  }

  function handleTambahJadwal() {
    setErrorForm('');
    if (!form.hariTanggal ||
      (form.jenisBaris === 'materi' && (!form.jamMulai || !form.jumlahKali || !form.pengampu || !form.materi || !form.topik || !form.lokasi)) ||
      (form.jenisBaris === 'agenda' && (!form.agenda || !form.jamMulai || !form.jumlahKali || !form.jamSelesai || !form.lokasi)) ||
      (form.jenisBaris === 'praktikum' && (!form.kelasPraktikum || !form.topik)) ||
      (form.jenisBaris === 'pbl' && (!form.pblTipe || !form.jamMulai || !form.jamSelesai || !form.modul || !form.kelompok || !form.pengampu || !form.lokasi)) ||
      (form.jenisBaris === 'jurnal' && (!form.hariTanggal || !form.jamMulai || !form.jamSelesai || !form.kelompok || !form.topik || !form.pengampu || !form.fileJurnal || !form.lokasi))
    ) return;
    const isDuplicate = jadwalMateri.some((j: JadwalBaris, idx: number) => {
      if (!j.hariTanggal) return false;
      const tglStr = j.hariTanggal.split(', ')[1];
      const [day, month, year] = tglStr.split('/');
      const tglISO = `${year}-${month}-${day}`;
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
      setJadwalMateri((prev: JadwalBaris[]) => prev.map((row: JadwalBaris, idx: number) => idx === editIndex ? (
        form.jenisBaris === 'agenda'
          ? {
              ...row,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              isAgenda: true,
              agenda: form.agenda,
              materi: form.agenda,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              lokasi: form.lokasi,
              jenisBaris: 'agenda',
              jamMulai: form.jamMulai,
              jamSelesai: form.jamSelesai,
              jumlahKali: form.jumlahKali,
              fileJurnal: form.fileJurnal,
            }
          : form.jenisBaris === 'pbl'
            ? {
                ...row,
                hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
                jenisBaris: 'pbl',
                pblTipe: form.pblTipe,
                jamMulai: form.jamMulai,
                jumlahKali: form.jumlahKali,
                jamSelesai: form.jamSelesai,
                modul: form.modul,
                kelompok: form.kelompok,
                materi: form.materi,
                pengampu: form.pengampu,
                topik: form.topik,
                lokasi: form.lokasi,
                fileJurnal: form.fileJurnal,
              }
          : form.jenisBaris === 'jurnal'
            ? {
                ...row,
                hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
                jenisBaris: 'jurnal',
                jamMulai: form.jamMulai,
                jumlahKali: 1,
                jamSelesai: form.jamSelesai,
                kelompok: form.kelompok,
                topik: form.topik,
                pengampu: form.pengampu,
                fileJurnal: form.fileJurnal,
                lokasi: form.lokasi,
              }
          : {
              ...row,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              materi: form.materi,
              topik: form.topik || form.materi,
              lokasi: form.lokasi,
              isAgenda: false,
              kelasPraktikum: form.kelasPraktikum,
              jenisBaris: form.jenisBaris,
              fileJurnal: form.fileJurnal,
            }
      ) : row));
    } else {
      setJadwalMateri((prev: JadwalBaris[]) => [
        ...prev,
        form.jenisBaris === 'agenda'
          ? {
              no: prev.length + 1,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              isAgenda: true,
              agenda: form.agenda,
              materi: form.agenda,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              lokasi: form.lokasi,
              jenisBaris: 'agenda',
              jamMulai: form.jamMulai,
              jamSelesai: form.jamSelesai,
              jumlahKali: form.jumlahKali,
              fileJurnal: form.fileJurnal,
            }
          : form.jenisBaris === 'pbl'
            ? {
                no: prev.length + 1,
                hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
                jenisBaris: 'pbl',
                pblTipe: form.pblTipe,
                jamMulai: form.jamMulai,
                jumlahKali: form.jumlahKali,
                jamSelesai: form.jamSelesai,
                modul: form.modul,
                kelompok: form.kelompok,
                materi: form.materi,
                pengampu: form.pengampu,
                topik: form.topik,
                lokasi: form.lokasi,
                fileJurnal: form.fileJurnal,
              }
          : form.jenisBaris === 'jurnal'
            ? {
                no: prev.length + 1,
                hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
                jenisBaris: 'jurnal',
                jamMulai: form.jamMulai,
                jumlahKali: 1,
                jamSelesai: form.jamSelesai,
                kelompok: form.kelompok,
                topik: form.topik,
                pengampu: form.pengampu,
                fileJurnal: form.fileJurnal,
                lokasi: form.lokasi,
              }
          : {
              no: prev.length + 1,
              hariTanggal: `${hari.charAt(0).toUpperCase() + hari.slice(1)}, ${tgl}`,
              pukul: `${form.jamMulai}-${form.jamSelesai}`,
              waktu: `${form.jumlahKali}x50'`,
              pengampu: form.pengampu,
              materi: form.materi,
              topik: form.topik || form.materi,
              lokasi: form.lokasi,
              isAgenda: false,
              kelasPraktikum: form.kelasPraktikum,
              jenisBaris: form.jenisBaris,
              fileJurnal: form.fileJurnal,
            },
      ]);
    }
    setShowModal(false);
    setForm({ hariTanggal: '', jamMulai: '', jumlahKali: 2, jamSelesai: '', pengampu: '', materi: '', topik: '', lokasi: '', jenisBaris: 'materi', agenda: '', kelasPraktikum: '', pblTipe: '', modul: '', kelompok: '', fileJurnal: null });
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

  // Tambahkan efek untuk load dan simpan jadwalMateri ke localStorage
  useEffect(() => {
    if (!kode) return;
    // Simpan ke localStorage setiap kali jadwalMateri berubah
    localStorage.setItem(`jadwalMateri_${kode}`, JSON.stringify(jadwalMateri));
  }, [jadwalMateri, kode]);

  useEffect(() => {
    // Migrasi data lama yang belum punya field jenisBaris
    setJadwalMateri((prev: JadwalBaris[]) => prev.map((row: JadwalBaris) => {
      if (row.jenisBaris) return row;
      if (row.isAgenda || row.agenda) return { ...row, jenisBaris: 'agenda' };
      if (row.kelasPraktikum) return { ...row, jenisBaris: 'praktikum' };
      return { ...row, jenisBaris: 'materi' };
    }));
  }, []);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteIndex, setSelectedDeleteIndex] = useState<number | null>(null);

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
      <p className="text-gray-500 dark:text-gray-400 text-base mb-8">Informasi lengkap mata kuliah blok</p>

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
            <div className="mb-2 text-gray-500 text-xs font-semibold uppercase">Blok ke-</div>
            <div className="text-base text-gray-800 dark:text-white">{data.blok ?? '-'}</div>
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

      {/* Section Jadwal Materi dipisah menjadi 3 bagian berdasarkan jenisBaris */}
      {/* Section Kuliah Besar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Kuliah Besar</h2>
          <button
            onClick={() => {
              setForm({
                hariTanggal: '',
                jamMulai: '',
                jumlahKali: 2,
                jamSelesai: '',
                pengampu: '',
                materi: '',
                topik: '',
                lokasi: '',
                jenisBaris: 'materi',
                agenda: '',
                kelasPraktikum: '',
                pblTipe: '',
                modul: '',
                kelompok: '',
                fileJurnal: null, // Tambahkan fileJurnal
              });
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
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Hari/Tanggal</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pukul</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Waktu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Materi</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pengampu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Topik</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Lokasi</th>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwalMateri.filter((j: JadwalBaris) => j.jenisBaris === 'materi').length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-400">Tidak ada data Kuliah Besar</td>
                  </tr>
                ) : (
                  jadwalMateri
                  .filter((j: JadwalBaris) => j.jenisBaris === 'materi')
                  .slice()
                  .sort((a: JadwalBaris, b: JadwalBaris) => {
                    const tglA = a.hariTanggal?.split(', ')[1] || '';
                    const tglB = b.hariTanggal?.split(', ')[1] || '';
                    const [dA, mA, yA] = tglA.split('/');
                    const [dB, mB, yB] = tglB.split('/');
                    const dateA = new Date(`${yA}-${mA?.padStart(2, '0')}-${dA?.padStart(2, '0')}`);
                    const dateB = new Date(`${yB}-${mB?.padStart(2, '0')}-${dB?.padStart(2, '0')}`);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((row: JadwalBaris, i: number) => (
                  <tr key={row.no} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                    <td className="px-4 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.no}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.hariTanggal}</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jamMulai}–{row.jamSelesai}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.waktu}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.materi}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pengampu}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.topik || row.materi}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.lokasi}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button onClick={() => handleEditJadwal(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no))} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition mr-2" title="Edit Jadwal">
                        <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button onClick={() => { setSelectedDeleteIndex(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no)); setShowDeleteModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition" title="Hapus Jadwal">
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
      {/* Section Praktikum */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Praktikum</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">No</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Hari/Tanggal</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Kelas</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pukul</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Waktu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Materi</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pengampu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Topik</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Lokasi</th>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwalMateri.filter((j: JadwalBaris) => j.jenisBaris === 'praktikum').length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-gray-400">Tidak ada data Praktikum</td>
                  </tr>
                ) : (
                  jadwalMateri
                  .filter((j: JadwalBaris) => j.jenisBaris === 'praktikum')
                  .slice()
                  .sort((a: JadwalBaris, b: JadwalBaris) => {
                    const tglA = a.hariTanggal?.split(', ')[1] || '';
                    const tglB = b.hariTanggal?.split(', ')[1] || '';
                    const [dA, mA, yA] = tglA.split('/');
                    const [dB, mB, yB] = tglB.split('/');
                    const dateA = new Date(`${yA}-${mA?.padStart(2, '0')}-${dA?.padStart(2, '0')}`);
                    const dateB = new Date(`${yB}-${mB?.padStart(2, '0')}-${dB?.padStart(2, '0')}`);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((row: JadwalBaris, i: number) => (
                  <tr key={row.no} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                    <td className="px-4 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.no}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.hariTanggal}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.kelasPraktikum}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pukul}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.waktu}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.materi}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pengampu}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.topik || row.materi}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.lokasi}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button onClick={() => handleEditJadwal(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no))} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition mr-2" title="Edit Jadwal">
                        <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button onClick={() => { setSelectedDeleteIndex(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no)); setShowDeleteModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition" title="Hapus Jadwal">
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
      {/* Section Agenda Khusus */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Agenda Khusus</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">No</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Hari/Tanggal</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pukul</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Waktu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Agenda</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Ruangan</th>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwalMateri.filter((j: JadwalBaris) => j.jenisBaris === 'agenda').length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-400">Tidak ada data Agenda Khusus</td>
                  </tr>
                ) : (
                  jadwalMateri
                  .filter((j: JadwalBaris) => j.jenisBaris === 'agenda')
                  .slice()
                  .sort((a: JadwalBaris, b: JadwalBaris) => {
                    const tglA = a.hariTanggal?.split(', ')[1] || '';
                    const tglB = b.hariTanggal?.split(', ')[1] || '';
                    const [dA, mA, yA] = tglA.split('/');
                    const [dB, mB, yB] = tglB.split('/');
                    const dateA = new Date(`${yA}-${mA?.padStart(2, '0')}-${dA?.padStart(2, '0')}`);
                    const dateB = new Date(`${yB}-${mB?.padStart(2, '0')}-${dB?.padStart(2, '0')}`);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((row: JadwalBaris, i: number) => (
                  <tr key={row.no} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                    <td className="px-4 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.no}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.hariTanggal}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pukul}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.waktu}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.agenda}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.lokasi}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button onClick={() => handleEditJadwal(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no))} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition mr-2" title="Edit Jadwal">
                        <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button onClick={() => { setSelectedDeleteIndex(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no)); setShowDeleteModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition" title="Hapus Jadwal">
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

      {/* Modal input jadwal materi */}
      <AnimatePresence>
        {showModal && (
          <>
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
                key={form.jenisBaris + String(editIndex)}
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
                    <option value="materi">Kuliah Besar</option>
                    <option value="agenda">Agenda Khusus</option>
                    <option value="praktikum">Praktikum</option>
                    <option value="pbl">PBL</option>
                    <option value="jurnal">Jurnal Reading</option>
                  </select>
                </div>
                <div className="space-y-4">
                  {form.jenisBaris === 'materi' && (
                    <>
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
                          <select name="jumlahKali" value={form.jumlahKali} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} x 50'</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input type="text" name="jamSelesai" value={form.jamSelesai} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materi</label>
                        <Select
                          options={materiOptions.map(m => ({ value: m, label: m }))}
                          value={materiOptions.map(m => ({ value: m, label: m })).find(opt => opt.value === form.materi) || null}
                          onChange={opt => setForm(f => ({ ...f, materi: opt?.value || '' }))}
                          placeholder="Pilih Materi"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topik</label>
                        <input type="text" name="topik" value={form.topik} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                    </>
                  )}
                  {form.jenisBaris === 'praktikum' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hari/Tanggal</label>
                        <input type="date" name="hariTanggal" value={form.hariTanggal} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        {errorForm && <div className="text-sm text-red-500 mt-2">{errorForm}</div>}
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelas Praktikum</label>
                      <Select
                        options={kelasPraktikumOptions}
                        value={kelasPraktikumOptions.find(opt => opt.value === form.kelasPraktikum) || null}
                        onChange={opt => setForm(f => ({ ...f, kelasPraktikum: opt?.value || '' }))}
                        placeholder="Pilih Kelas"
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
                          <select name="jumlahKali" value={form.jumlahKali} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} x 50'</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input type="text" name="jamSelesai" value={form.jamSelesai} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materi</label>
                        <Select
                          options={materiOptions.map(m => ({ value: m, label: m }))}
                          value={materiOptions.map(m => ({ value: m, label: m })).find(opt => opt.value === form.materi) || null}
                          onChange={opt => setForm(f => ({ ...f, materi: opt?.value || '' }))}
                          placeholder="Pilih Materi"
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topik</label>
                          <input type="text" name="topik" value={form.topik} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                    </>
                  )}
                  {form.jenisBaris === 'agenda' && (
                    <>
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
                          <select name="jumlahKali" value={form.jumlahKali} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} x 50'</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input type="text" name="jamSelesai" value={form.jamSelesai} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agenda</label>
                        <input type="text" name="agenda" value={form.agenda} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                    </>
                  )}
                  {form.jenisBaris === 'pbl' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hari/Tanggal</label>
      
                        <input
                          type="date"
                          name="hariTanggal"
                          value={form.hariTanggal}
                          onChange={handleFormChange}
                          className="w-full px-3 sa py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        {errorForm && <div className="text-sm text-red-500 mt-2">{errorForm}</div>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe PBL</label>
                        <select
                          name="pblTipe"
                          value={form.pblTipe}
                          onChange={e => {
                            const val = e.target.value;
                            setForm(f => ({
                              ...f,
                              pblTipe: val,
                              jumlahKali: val === 'PBL 1' ? 2 : val === 'PBL 2' ? 3 : 2,
                              jamSelesai: hitungJamSelesai(f.jamMulai, val === 'PBL 1' ? 2 : val === 'PBL 2' ? 3 : 2)
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Pilih Tipe PBL</option>
                          <option value="PBL 1">PBL 1</option>
                          <option value="PBL 2">PBL 2</option>
                        </select>
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
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input type="text" name="jamSelesai" value={form.jamSelesai} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modul</label>
                        <Select
                          options={modulPBLDummy}
                          value={modulPBLDummy.find(opt => opt.value === form.modul) || null}
                          onChange={opt => setForm(f => ({ ...f, modul: opt?.value || '' }))}
                          placeholder="Pilih Modul"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelompok</label>
                        <select name="kelompok" value={form.kelompok} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                          <option value="">Pilih Kelompok</option>
                          {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i+1} value={`Kelompok ${i+1}`}>{`Kelompok ${i+1}`}</option>
                          ))}
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
                    </>
                  )}
                  {form.jenisBaris === 'jurnal' && (
                    <>
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
                          <select name="jumlahKali" value={form.jumlahKali} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} x 50'</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input type="text" name="jamSelesai" value={form.jamSelesai} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelompok</label>
                        <select name="kelompok" value={form.kelompok} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                          <option value="">Pilih Kelompok</option>
                          {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i+1} value={`Kelompok ${i+1}`}>{`Kelompok ${i+1}`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topik</label>
                        <input type="text" name="topik" value={form.topik} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload File Jurnal</label>
                        <input type="file" accept="application/pdf" onChange={e => setForm(f => ({ ...f, fileJurnal: e.target.files && e.target.files[0] ? e.target.files[0] : null }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        {form.fileJurnal && form.fileJurnal instanceof File && <div className="text-xs text-green-600 mt-1">{form.fileJurnal.name}</div>}
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
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-6">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">Batal</button>
                  <button onClick={handleTambahJadwal} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled={!form.hariTanggal || (form.jenisBaris === 'materi' && (!form.jamMulai || !form.jumlahKali || !form.pengampu || !form.materi || !form.topik || !form.lokasi)) || (form.jenisBaris === 'agenda' && (!form.agenda || !form.jamMulai || !form.jumlahKali || !form.jamSelesai || !form.lokasi)) || (form.jenisBaris === 'praktikum' && (!form.kelasPraktikum || !form.topik)) || (form.jenisBaris === 'pbl' && (!form.pblTipe || !form.jamMulai || !form.jamSelesai || !form.modul || !form.kelompok || !form.pengampu || !form.lokasi)) || (form.jenisBaris === 'jurnal' && (!form.hariTanggal || !form.jamMulai || !form.jamSelesai || !form.kelompok || !form.topik || !form.pengampu || !form.fileJurnal || !form.lokasi)) || !!errorForm}>{editIndex !== null ? 'Simpan' : 'Tambah Jadwal'}</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Section PBL */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">PBL</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">No</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Hari/Tanggal</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Tipe PBL</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pukul</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">x 50</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Modul</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Kelompok</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pengampu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Ruangan</th>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwalMateri.filter((j: JadwalBaris) => j.jenisBaris && j.jenisBaris === 'pbl').length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-gray-400">Tidak ada data PBL</td>
                  </tr>
                ) : (
                  jadwalMateri
                  .filter((j: JadwalBaris) => j.jenisBaris && j.jenisBaris === 'pbl')
                  .slice()
                  .sort((a: JadwalBaris, b: JadwalBaris) => {
                    const tglA = a.hariTanggal?.split(', ')[1] || '';
                    const tglB = b.hariTanggal?.split(', ')[1] || '';
                    const [dA, mA, yA] = tglA.split('/');
                    const [dB, mB, yB] = tglB.split('/');
                    const dateA = new Date(`${yA}-${mA?.padStart(2, '0')}-${dA?.padStart(2, '0')}`);
                    const dateB = new Date(`${yB}-${mB?.padStart(2, '0')}-${dB?.padStart(2, '0')}`);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((row: JadwalBaris, i: number) => (
                    <tr key={row.no} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                      <td className="px-4 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.no}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.hariTanggal}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pblTipe}</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jamMulai}–{row.jamSelesai}</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jumlahKali} x 50'</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{modulPBLDummy.find(m => m.value === row.modul)?.label || row.modul}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.kelompok}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pengampu}</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.lokasi}</td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/penilaian-pbl/${kode}/${row.kelompok || ''}/${row.pblTipe || ''}?rowIndex=${i}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition mr-2"
                            title="Nilai"
                          >
                            <FontAwesomeIcon icon={faStar} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                            <span className="hidden sm:inline">Nilai</span>
                          </button>
                          <button onClick={() => handleEditJadwal(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no))} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition mr-2" title="Edit Jadwal">
                            <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button onClick={() => { setSelectedDeleteIndex(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no)); setShowDeleteModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition" title="Hapus Jadwal">
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
      {/* Section Jurnal Reading */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Jurnal Reading</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">No</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Hari/Tanggal</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pukul</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">x 50</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Kelompok</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Topik</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Pengampu</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">File Jurnal</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Ruangan</th>
                  <th className="px-4 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwalMateri.filter((j: JadwalBaris) => j.jenisBaris === 'jurnal').length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-gray-400">Tidak ada data Jurnal Reading</td>
                  </tr>
                ) : (
                  jadwalMateri.filter((j: JadwalBaris) => j.jenisBaris === 'jurnal').map((row: JadwalBaris, i: number) => (
                    <tr key={row.no} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                      <td className="px-4 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.no}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.hariTanggal}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jamMulai}–{row.jamSelesai}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.jumlahKali} x 50'</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.kelompok}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.topik}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.pengampu}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.fileJurnal instanceof File ? <a href={URL.createObjectURL(row.fileJurnal)} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Lihat File</a> : '-'}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-white/90 whitespace-nowrap">{row.lokasi}</td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/penilaian-jurnal/${kode}/${row.kelompok || ''}/1/${i}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition mr-2"
                          title="Nilai"
                        >
                          <FontAwesomeIcon icon={faStar} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                          <span className="hidden sm:inline">Nilai</span>
                        </button>
                        <button onClick={() => handleEditJadwal(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no))} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition mr-2" title="Edit Jadwal">
                          <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button onClick={() => { setSelectedDeleteIndex(jadwalMateri.findIndex((j: JadwalBaris) => j.no === row.no)); setShowDeleteModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition" title="Hapus Jadwal">
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