import { useState, ChangeEvent, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faPenToSquare, faTrash, faDownload, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import api from "../utils/api";
import { EyeIcon, EyeCloseIcon } from "../icons";
import * as XLSX from 'xlsx';
import { Listbox, Transition } from '@headlessui/react';
import React from "react";
import { Combobox } from '@headlessui/react';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

type UserDosen = {
  id?: number;
  nid: string;
  nidn: string;
  name: string;
  username: string;
  email: string;
  telp: string;
  password?: string;
  role?: string;
  kompetensi?: string[] | string;
  peran_kurikulum?: string[] | string;
  keahlian?: string[] | string;
  // Tambahan untuk fitur peran utama
  peran_utama?: "ketua" | "anggota" | "dosen_mengajar";
  matkul_ketua_nama?: string;
  matkul_ketua_semester?: number;
  matkul_anggota_nama?: string;
  matkul_anggota_semester?: number;
  peran_kurikulum_mengajar?: string;
};

export default function Dosen() {
  const [data, setData] = useState<UserDosen[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<UserDosen>({ nid: "", nidn: "", name: "", username: "", email: "", telp: "", password: "", kompetensi: [], peran_kurikulum: [], keahlian: [] });
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteNid, setSelectedDeleteNid] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(5);
  const previewTotalPages = Math.ceil(previewData.length / previewPageSize);
  const paginatedPreviewData = previewData.slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize);
  const [editingCell, setEditingCell] = useState<{ row: number; key: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteModalBulk, setShowDeleteModalBulk] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [cellErrors, setCellErrors] = useState<{row: number, field: string, message: string, nid?: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalError, setModalError] = useState("");
  const [filterKompetensi, setFilterKompetensi] = useState<string[]>([]);
  const [availableKompetensi, setAvailableKompetensi] = useState<string[]>([]);
  const [newKompetensi, setNewKompetensi] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [availableKeahlian, setAvailableKeahlian] = useState<string[]>([]);
  const [newKeahlian, setNewKeahlian] = useState("");
  const [filterKeahlian, setFilterKeahlian] = useState<string[]>([]);
  // Tambahkan state untuk daftar peran kurikulum global
  const [peranKurikulumOptions, setPeranKurikulumOptions] = useState<string[]>([]);
  // Untuk fitur peran utama dosen
  const [peranUtama, setPeranUtama] = useState<string>("");
  const [matkulList, setMatkulList] = useState<{ kode: string; nama: string; semester: number }[]>([]);
  const [matkulKetua, setMatkulKetua] = useState<string>("");
  const [matkulAnggota, setMatkulAnggota] = useState<string>("");
  const [peranKurikulumMengajar, setPeranKurikulumMengajar] = useState<string>("");
  const [activeSemester, setActiveSemester] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const isPeranValid = peranUtama === "standby" || (
    peranUtama !== "" && (
      (peranUtama === "ketua" && matkulKetua) ||
      (peranUtama === "anggota" && matkulAnggota) ||
      (peranUtama === "dosen_mengajar" && peranKurikulumMengajar)
    )
  );

  // Fungsi untuk download template Excel
  const downloadTemplate = async () => {
    // Data contoh untuk template
    const templateData = [
      {
        nid: '1987654301',
        nidn: '0123456701',
        nama: 'Nama Dosen Contoh',
        username: 'username_dosen',
        email: 'dosen.contoh@umj.ac.id',
        telepon: '081234567890',
        password: 'password123',
        kompetensi: 'Klinik, penelitian',
        keahlian: 'Kardiologi, Pendidikan',
        peran_dalam_kurikulum: 'Tutor PBL Blok Sistem Kardiovaskular, Koordinator Praktikum Histologi',
      }
    ];

    // Buat worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dosen");
    
    // Generate file dan download
    XLSX.writeFile(wb, "Template_Import_Dosen.xlsx");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ nid: "", nidn: "", name: "", username: "", email: "", telp: "", password: "", kompetensi: [], peran_kurikulum: [], keahlian: [] });
    setEditMode(false);
    setModalError("");
    setNewKompetensi("");
  };

  const userToDelete = data?.find((u) => String(u.id) === String(selectedDeleteNid));

  const isFormValid = form.nid && form.nidn && form.name && form.username && form.email && form.telp && (editMode || form.password);

  useEffect(() => {
    setLoading(true);
    api.get("/users?role=dosen").then(res => {
      if (Array.isArray(res.data)) {
        setData(res.data);
      } else {
        console.error("API response for /users?role=dosen is not an array:", res.data);
        setData([]); // Ensure data is always an array
      }
      setLoading(false);
    }).catch(() => {
      setError("Gagal memuat data");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    async function fetchSemesterAndMatkul() {
      try {
        const tahunRes = await api.get("/tahun-ajaran");
        const tahunAktif = tahunRes.data.find((t: any) => t.aktif);
        let semesterAktif = null;
        if (tahunAktif && tahunAktif.semesters) {
          const semAktif = tahunAktif.semesters.find((s: any) => s.aktif);
          semesterAktif = semAktif ? semAktif.jenis : null;
        }
        setActiveSemester(semesterAktif);
        // Ambil matkul sesuai semester aktif
        const mkRes = await api.get("/mata-kuliah");
        let mkList = mkRes.data;
        if (semesterAktif) {
          mkList = mkList.filter((mk: any) => (semesterAktif === "Ganjil" ? mk.semester % 2 === 1 : mk.semester % 2 === 0));
        }
        setMatkulList(mkList.map((mk: any) => ({ kode: mk.kode, nama: mk.nama, semester: mk.semester })));
      } catch (e) {
        setMatkulList([]);
      }
    }
    if (showModal) fetchSemesterAndMatkul();
  }, [showModal]);

  useEffect(() => {
    if (!showModal) {
      setPeranUtama("");
      setMatkulKetua("");
      setMatkulAnggota("");
      setPeranKurikulumMengajar("");
    }
  }, [showModal]);

  useEffect(() => {
    // Extract unique kompetensi dari data dosen, handle jika string JSON
    const kompetensiList = Array.from(
      new Set(
        data.flatMap(d => {
          if (Array.isArray(d.kompetensi)) {
            return d.kompetensi.map(item => String(item).trim()).filter(item => item !== '');
          } else if (typeof d.kompetensi === 'string' && d.kompetensi.trim() !== '') {
            try {
              const parsed = JSON.parse(d.kompetensi);
              if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(item => item !== '');
            } catch {
              // Bukan JSON, split biasa
            }
            return d.kompetensi.split(',').map(item => item.trim()).filter(item => item !== '');
          }
          return [];
        })
      )
    ).sort();
    setAvailableKompetensi(kompetensiList);
  }, [data]);



  useEffect(() => {
    // Extract unique keahlian dari data dosen, handle jika string JSON
    const keahlianList = Array.from(
      new Set(
        data.flatMap(d => {
          if (Array.isArray(d.keahlian)) {
            return d.keahlian.map(item => String(item).trim()).filter(item => item !== '');
          } else if (typeof d.keahlian === 'string' && d.keahlian.trim() !== '') {
            try {
              const parsed = JSON.parse(d.keahlian);
              if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(item => item !== '');
            } catch {
              // Bukan JSON, split biasa
            }
            return d.keahlian.split(',').map(item => item.trim()).filter(item => item !== '');
          }
          return [];
        })
      )
    ).sort();
    setAvailableKeahlian(keahlianList);
  }, [data]);

  useEffect(() => {
    if (importedFile && previewData.length > 0) {
      // Meneruskan data yang sudah ada di DB (state 'data') untuk validasi duplikat
      const validationResult = validateExcelData(previewData, data);
      setValidationErrors(validationResult.errors);
      setCellErrors(validationResult.cellErrors); // Update cellErrors langsung dari validasi awal
    }
  }, [previewData, data]); // Tambahkan 'data' sebagai dependency

  // Filter & Search
  const filteredData = data.filter((d) => {
    const q = search.toLowerCase();
    // Gabungkan semua value dari objek menjadi satu string
    const allValues = Object.values(d).join(' ').toLowerCase();
    return allValues.includes(q);
  });

  // Apply additional filters
  const filteredAndSearchedData = filteredData.filter(d => {
    // Kompetensi
    const dosenKompetensiArray = typeof d.kompetensi === 'string' 
      ? d.kompetensi.split(',').map(item => item.trim()).filter(item => item !== '')
      : Array.isArray(d.kompetensi) 
        ? d.kompetensi.map(item => item.trim()).filter(item => item !== '')
        : [];
    const matchKompetensi = filterKompetensi.length === 0 || filterKompetensi.some(selectedComp => 
      dosenKompetensiArray.includes(selectedComp)
    );
    // Keahlian
    const dosenKeahlianArray = typeof d.keahlian === 'string' 
      ? d.keahlian.split(',').map(item => item.trim()).filter(item => item !== '')
      : Array.isArray(d.keahlian) 
        ? d.keahlian.map(item => item.trim()).filter(item => item !== '')
        : [];
    const matchKeahlian = filterKeahlian.length === 0 || filterKeahlian.some(selectedK => 
      dosenKeahlianArray.includes(selectedK)
    );
    return matchKompetensi && matchKeahlian;
  });

  // Generate unique kompetensi options for filter, sorted alphabetically
  const uniqueKompetensiOptions = Array.from(new Set(data.flatMap(d => 
    typeof d.kompetensi === 'string' 
      ? d.kompetensi.split(',').map(item => item.trim()).filter(item => item !== '')
      : Array.isArray(d.kompetensi) 
        ? d.kompetensi.map(item => item.trim()).filter(item => item !== '')
        : []
  ))).sort();

  // Generate unique keahlian options for filter, sorted alphabetically
  const uniqueKeahlianOptions = Array.from(new Set(data.flatMap(d => 
    typeof d.keahlian === 'string' 
      ? d.keahlian.split(',').map(item => item.trim()).filter(item => item !== '')
      : Array.isArray(d.keahlian) 
        ? d.keahlian.map(item => item.trim()).filter(item => item !== '')
        : []
  ))).sort();

  // Pagination
  const totalPages = Math.ceil(filteredAndSearchedData.length / pageSize);
  const paginatedData = filteredAndSearchedData.slice((page - 1) * pageSize, page * pageSize);

const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  if (["nid", "nidn", "telp"].includes(name)) {
    setForm({ ...form, [name]: value.replace(/[^0-9]/g, "") });
  } else if (name === "peran_kurikulum" || name === "kompetensi") {
    // Simpan nilai input sebagai string biasa (bukan array)
    setForm({ ...form, [name]: value });
  } else {
    setForm({ ...form, [name]: value });
  }
};

  function handleNumberInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
  }

// Perbaikan untuk handleAdd function
const handleAdd = async () => {
  setIsSaving(true);
  setModalError("");
  try {
    let payload;
    if (peranUtama === "standby") {
      payload = {
        ...form,
        peran_utama: "standby",
        matkul_ketua_id: null,
        matkul_anggota_id: null,
        peran_kurikulum_mengajar: null,
        kompetensi: [],
        keahlian: [],
      };
    } else {
      payload = {
        ...form,
        peran_utama: peranUtama,
        matkul_ketua_id: matkulKetua,
        matkul_anggota_id: matkulAnggota,
        peran_kurikulum_mengajar: peranKurikulumMengajar,
      };
      // Pastikan kompetensi adalah array
      payload.kompetensi = Array.isArray(payload.kompetensi) 
        ? payload.kompetensi.filter(k => k.trim() !== '')
        : payload.kompetensi 
          ? payload.kompetensi.split(',').map(k => k.trim()).filter(k => k !== '')
          : [];
    }
    
    // Pastikan kompetensi adalah array
    payload.kompetensi = Array.isArray(payload.kompetensi) 
      ? payload.kompetensi.filter(k => k.trim() !== '')
      : payload.kompetensi 
        ? payload.kompetensi.split(',').map(k => k.trim()).filter(k => k !== '')
        : [];

    // Perbaikan untuk peran_kurikulum
    if (payload.peran_kurikulum) {
      payload.peran_kurikulum = typeof payload.peran_kurikulum === 'string' 
        ? payload.peran_kurikulum.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '')
        : Array.isArray(payload.peran_kurikulum) 
          ? payload.peran_kurikulum.map((item: string) => item.trim()).filter((item: string) => item !== '')
          : [];
    } else {
      payload.peran_kurikulum = [];
    }

    if (editMode) {
      if (!payload.password) delete payload.password;
      await api.put(`/users/${form.id}`, payload);
      setSuccess("Data dosen berhasil diupdate.");
    } else {
      if (!payload.password) {
        setModalError("Password wajib diisi.");
        setIsSaving(false);
        return;
      }
      payload.role = 'dosen';
      await api.post("/users", payload);
      setSuccess("Data dosen berhasil ditambahkan.");
    }

    if (!isPeranValid) {
      setModalError("Pilih peran utama dan lengkapi opsinya.");
      setIsSaving(false);
      return;
    }
    
    const res = await api.get("/users?role=dosen");
    setData(res.data);
    setShowModal(false);
    setEditMode(false);
    setForm({ nid: "", nidn: "", name: "", username: "", email: "", telp: "", password: "", kompetensi: [], peran_kurikulum: [], keahlian: [] });
    setShowPassword(false);
    setNewKompetensi("");
  } catch (err: any) {
    setModalError(err?.response?.data?.message || "Gagal simpan data");
  } finally {
    setIsSaving(false);
  }
};
  const handleEdit = (d: UserDosen) => {
  // Pastikan kompetensi dan keahlian selalu array
  let kompetensiArr: string[] = [];
  if (Array.isArray(d.kompetensi)) {
    kompetensiArr = d.kompetensi;
  } else if (typeof d.kompetensi === "string" && d.kompetensi.trim() !== "") {
    try {
      const parsed = JSON.parse(d.kompetensi);
      if (Array.isArray(parsed)) kompetensiArr = parsed;
      else kompetensiArr = d.kompetensi.split(",").map(k => k.trim()).filter(k => k !== "");
    } catch {
      kompetensiArr = d.kompetensi.split(",").map(k => k.trim()).filter(k => k !== "");
    }
  }

  let keahlianArr: string[] = [];
  if (Array.isArray(d.keahlian)) {
    keahlianArr = d.keahlian;
  } else if (typeof d.keahlian === "string" && d.keahlian.trim() !== "") {
    try {
      const parsed = JSON.parse(d.keahlian);
      if (Array.isArray(parsed)) keahlianArr = parsed;
      else keahlianArr = d.keahlian.split(",").map(k => k.trim()).filter(k => k !== "");
    } catch {
      keahlianArr = d.keahlian.split(",").map(k => k.trim()).filter(k => k !== "");
    }
  }

  setForm({ ...d, password: "", kompetensi: kompetensiArr, keahlian: keahlianArr });
  setPeranUtama(d.peran_utama || "");
  setMatkulKetua(
    d.matkul_ketua_nama
      ? (matkulList.find(mk => mk.nama === d.matkul_ketua_nama)?.kode || "")
      : ""
  );
  setMatkulAnggota(
    d.matkul_anggota_nama
      ? (matkulList.find(mk => mk.nama === d.matkul_anggota_nama)?.kode || "")
      : ""
  );
  setPeranKurikulumMengajar(d.peran_kurikulum_mengajar || "");
    setShowModal(true);
    setEditMode(true);
  };

  const handleDelete = async (id: string) => {
    setSelectedDeleteNid(id);
    setShowDeleteModal(true);
  };
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (selectedDeleteNid) {
        await api.delete(`/users/${selectedDeleteNid}`);
        const res = await api.get("/users?role=dosen");
        setData(res.data);
        setSuccess("Data dosen berhasil dihapus.");
      }
      setShowDeleteModal(false);
      setSelectedDeleteNid(null);
    } catch {
      setError("Gagal menghapus data");
    } finally {
      setIsDeleting(false);
    }
  };
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedDeleteNid(null);
  };
const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files || e.target.files.length === 0) return;
  const file = e.target.files[0];
  setImportedFile(file);
  try {
    const excelParsedData = await readExcelFile(file);
    
    // Transform data tanpa mengubah nama kolom
    const transformedData = excelParsedData.map(row => {
      const newRow: any = { ...row };
      
      // Handle kompetensi - simpan sebagai string
      if (typeof newRow.kompetensi === 'string') {
        newRow.kompetensi = newRow.kompetensi;
      } else if (Array.isArray(newRow.kompetensi)) {
        newRow.kompetensi = newRow.kompetensi.join(', ');
      } else {
        newRow.kompetensi = '';
      }

      // Handle peran_dalam_kurikulum - simpan sebagai string
      if (typeof newRow.peran_dalam_kurikulum === 'string') {
        newRow.peran_dalam_kurikulum = newRow.peran_dalam_kurikulum;
      } else if (Array.isArray(newRow.peran_dalam_kurikulum)) {
        newRow.peran_dalam_kurikulum = newRow.peran_dalam_kurikulum.join(', ');
      } else {
        newRow.peran_dalam_kurikulum = '';
      }

      // Handle keahlian - simpan sebagai string
      if (typeof newRow.keahlian === 'string') {
        newRow.keahlian = newRow.keahlian;
      } else if (Array.isArray(newRow.keahlian)) {
        newRow.keahlian = newRow.keahlian.join(', ');
      } else {
        newRow.keahlian = '';
      }

      return newRow;
    });
    
    const validationResult = validateExcelData(transformedData, data);
    setPreviewData(transformedData);
    setValidationErrors(validationResult.errors);
    setCellErrors(validationResult.cellErrors);
    setError("");
  } catch (err: any) {
    setError(err.message || "Gagal membaca file Excel");
    setPreviewData([]);
    setValidationErrors([]);
    setCellErrors([]);
  } finally {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};

const handleSubmitImport = async () => {
  if (!previewData || previewData.length === 0) return;
  setIsSaving(true);
  setError("");
  setLoading(true);
  setImportedCount(0);
  setCellErrors([]);

  const validationResult = validateExcelData(previewData, data);
  if (validationResult.errors.length > 0) {
    setValidationErrors(validationResult.errors);
    setCellErrors(validationResult.cellErrors);
    setIsSaving(false);
    setLoading(false);
    return;
  }

  try {
    // Transform data untuk dikirim ke backend
    const dataToExport = previewData.map(row => {
      // Konversi string ke array untuk kompetensi dan peran_dalam_kurikulum
      const kompetensiArray = typeof row.kompetensi === 'string' 
        ? row.kompetensi.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '')
        : Array.isArray(row.kompetensi) 
          ? row.kompetensi.map((item: string) => item.trim()).filter((item: string) => item !== '')
          : [];

      const peranKurikulumArray = typeof row.peran_dalam_kurikulum === 'string'
        ? row.peran_dalam_kurikulum.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '')
        : Array.isArray(row.peran_dalam_kurikulum)
          ? row.peran_dalam_kurikulum.map((item: string) => item.trim()).filter((item: string) => item !== '')
          : [];

      const keahlianArray = typeof row.keahlian === 'string'
        ? row.keahlian.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '')
        : Array.isArray(row.keahlian)
          ? row.keahlian.map((item: string) => item.trim()).filter((item: string) => item !== '')
          : [];

      // Construct the object with exact column names as expected by the backend's Excel import
      // Note: role is not a column in the Excel template, so don't include it here for Excel export.
      return {
        nid: row.nid,
        nidn: row.nidn,
        nama: row.nama, // Use original 'nama' column name
        username: row.username,
        email: row.email,
        telepon: row.telepon, // Use original 'telepon' column name
        password: row.password,
        kompetensi: kompetensiArray.join(', '), // Convert back to string for Excel export
        peran_dalam_kurikulum: peranKurikulumArray.join(', '), // Convert back to string for Excel export with original column name
        keahlian: keahlianArray.join(', '),
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dosen");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const file = new File([excelBuffer], "Data_Import_Dosen.xlsx", { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await api.post('/users/import-dosen', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      validateStatus: () => true,
    });
    
    // After successful import, re-fetch the entire list of users
    const updatedDataRes = await api.get("/users?role=dosen");
    if (Array.isArray(updatedDataRes.data)) {
      setData(updatedDataRes.data);
    } else {
      console.error("API response for /users?role=dosen after import is not an array:", updatedDataRes.data);
      setData([]); // Ensure data is always an array to prevent TypeError
    }
    if (res.status === 200) {
      setImportedCount(res.data.imported_count || res.data.importedCount || 0);
      if ((res.data.imported_count || res.data.importedCount) > 0) {
        setSuccess(`${res.data.imported_count || res.data.importedCount} data dosen berhasil diimpor ke database.`);
      }
      setImportedFile(null); // Hide the preview table
      setPreviewData([]);
      setValidationErrors([]);
      setCellErrors([]);
    } else if (res.status === 422) {
      setImportedCount(0);
      setError(res.data.message || 'Gagal mengimpor data');
      if (res.data.failed_rows && res.data.failed_rows.length > 0) {
        setPreviewData(res.data.failed_rows);
      }
      setValidationErrors(res.data.errors || []);
      setCellErrors(res.data.cell_errors || []);
    } else {
      setImportedCount(0);
      setError('Gagal mengimpor data');
      setCellErrors([]);
    }
  } catch (err: any) {
    setImportedCount(0);
    setError(err.message || 'Gagal mengimpor data');
    setCellErrors([]);
  } finally {
    setIsSaving(false);
    setLoading(false);
  }
};

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Get data as array of arrays
          const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (aoa.length === 0) {
            resolve([]);
            return;
          }

          const rawHeaders = aoa[0];
          // Normalize headers: lowercase, trim spaces, replace spaces with underscores
          const normalizedHeaders = rawHeaders.map((h: string) => 
            String(h).toLowerCase().trim().replace(/\s+/g, '_')
          );

          const jsonData: any[] = [];
          for (let i = 1; i < aoa.length; i++) {
            const rowData: any = {};
            const currentRow = aoa[i];
            normalizedHeaders.forEach((header, index) => {
              rowData[header] = currentRow[index];
            });
            jsonData.push(rowData);
          }
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Fungsi validasi data Excel saat diunggah
  const validateExcelData = (excelData: any[], existingDbData: UserDosen[]) => {
    const errors: string[] = [];
    const newCellErrors: {row: number, field: string, message: string, nid?: string}[] = [];

    if (excelData.length === 0) {
      errors.push('File Excel kosong');
      return { valid: false, errors, cellErrors: newCellErrors };
    }

    // Cek header kolom
    const firstRow = excelData[0];
    const requiredHeaders = ['nid', 'nidn', 'nama', 'username', 'email', 'telepon', 'password', 'kompetensi', 'peran_dalam_kurikulum'];
    const headers = Object.keys(firstRow);

    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h.toLowerCase()));
    if (missingHeaders.length > 0) {
      errors.push(`Kolom yang diperlukan tidak ditemukan: ${missingHeaders.join(', ')}`);
      return { valid: false, errors, cellErrors: newCellErrors };
    }

    // Validasi setiap baris data
    const nidSetInFile = new Set();
    const nidnSetInFile = new Set();
    const usernameSetInFile = new Set();
    const emailSetInFile = new Set();

    excelData.forEach((row, index) => {
      const rowNum = index + 2; // +2 karena header di row 1 dan index mulai dari 0
      const rowNid = row.nid ? String(row.nid) : '';
      const rowNidn = row.nidn ? String(row.nidn) : '';
      const rowUsername = row.username ? String(row.username).toLowerCase() : '';
      const rowEmail = row.email ? String(row.email).toLowerCase() : '';

      // Basic required and format validations
      if (!row.nid || !/^[0-9]+$/.test(row.nid)) {
        errors.push(`NID harus diisi dengan angka (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'nid', message: `NID harus diisi dengan angka`, nid: rowNid });
      }
      if (!row.nidn || !/^[0-9]+$/.test(row.nidn)) {
        errors.push(`NIDN harus diisi dengan angka (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'nidn', message: `NIDN harus diisi dengan angka`, nid: rowNidn });
      }
      if (!row.nama) {
        errors.push(`Nama harus diisi (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'nama', message: `Nama harus diisi`, nid: rowNid });
      }
      if (!row.username) {
        errors.push(`Username harus diisi (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'username', message: `Username harus diisi`, nid: rowNid });
      }
      if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Email tidak valid (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'email', message: `Email tidak valid`, nid: rowNid });
      }
      if (!row.telepon || !/^[0-9]+$/.test(row.telepon)) {
        errors.push(`Nomor telepon harus diisi dengan angka (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'telepon', message: `Nomor telepon harus diisi dengan angka`, nid: rowNid });
      }
      if (!row.password || String(row.password).length < 6) {
        errors.push(`Password harus diisi minimal 6 karakter (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'password', message: `Password harus diisi minimal 6 karakter`, nid: rowNid });
      }
      // Validate kompetensi: should not be an empty string
      if (!row.kompetensi || String(row.kompetensi).trim() === '') {
        errors.push(`Kompetensi harus diisi (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'kompetensi', message: `Kompetensi harus diisi`, nid: rowNid });
      }
      // Validate peran_dalam_kurikulum: should not be an empty string
      if (!row.peran_dalam_kurikulum || String(row.peran_dalam_kurikulum).trim() === '') {
        errors.push(`Peran dalam Kurikulum harus diisi (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'peran_dalam_kurikulum', message: `Peran dalam Kurikulum harus diisi`, nid: rowNid });
      }

      // Duplikat dalam file Excel
      if (rowNid) {
        if (nidSetInFile.has(rowNid)) {
          errors.push(`NID ${rowNid} sudah terdaftar dalam file Excel ini (Baris ${rowNum})`);
          newCellErrors.push({ row: index, field: 'nid', message: `NID sudah terdaftar dalam file Excel ini`, nid: rowNid });
        } else {
          nidSetInFile.add(rowNid);
        }
      }
      if (rowNidn) {
        if (nidnSetInFile.has(rowNidn)) {
          errors.push(`NIDN ${rowNidn} sudah terdaftar dalam file Excel ini (Baris ${rowNum})`);
          newCellErrors.push({ row: index, field: 'nidn', message: `NIDN sudah terdaftar dalam file Excel ini`, nid: rowNidn });
        } else {
          nidnSetInFile.add(rowNidn);
        }
      }
      if (rowUsername) {
        if (usernameSetInFile.has(rowUsername)) {
          errors.push(`Username ${rowUsername} sudah terdaftar dalam file Excel ini (Baris ${rowNum})`);
          newCellErrors.push({ row: index, field: 'username', message: `Username sudah terdaftar dalam file Excel ini`, nid: rowNid });
        } else {
          usernameSetInFile.add(rowUsername);
        }
      }
      if (rowEmail) {
        if (emailSetInFile.has(rowEmail)) {
          errors.push(`Email ${rowEmail} sudah terdaftar dalam file Excel ini (Baris ${rowNum})`);
          newCellErrors.push({ row: index, field: 'email', message: `Email sudah terdaftar dalam file Excel ini`, nid: rowNid });
        } else {
          emailSetInFile.add(rowEmail);
        }
      }

      // Duplikat dengan data di database
      const existingNid = existingDbData.find(d => String(d.nid) === rowNid);
      if (existingNid) {
        errors.push(`NID ${rowNid} sudah terdaftar di database (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'nid', message: `NID sudah terdaftar di database`, nid: rowNid });
      }
      const existingNidn = existingDbData.find(d => String(d.nidn) === rowNidn);
      if (existingNidn) {
        errors.push(`NIDN ${rowNidn} sudah terdaftar di database (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'nidn', message: `NIDN sudah terdaftar di database`, nid: rowNidn });
      }
      const existingUsername = existingDbData.find(d => String(d.username).toLowerCase() === rowUsername);
      if (existingUsername) {
        errors.push(`Username ${rowUsername} sudah terdaftar di database (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'username', message: `Username sudah terdaftar di database`, nid: rowNid });
      }
      const existingEmail = existingDbData.find(d => String(d.email).toLowerCase() === rowEmail);
      if (existingEmail) {
        errors.push(`Email ${rowEmail} sudah terdaftar di database (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'email', message: `Email sudah terdaftar di database`, nid: rowNid });
      }
    });

    return { valid: errors.length === 0, errors, cellErrors: newCellErrors };
  };

  // Fungsi validasi cell per baris (untuk real-time cell validation)
  // `allRows` adalah `previewData` saat ini
  // `existingDbData` adalah `data` (dosen dari database)
  const handleCellEdit = (rowIdx: number, key: string, value: string | string[]) => {
    setPreviewData(prev => {
      const newData = [...prev];
      if (key === 'kompetensi' || key === 'peran_dalam_kurikulum') {
        // Simpan sebagai string jika input adalah string
        if (typeof value === 'string') {
          newData[rowIdx] = { 
            ...newData[rowIdx], 
            [key]: value
          };
        } else {
          // Jika sudah array, konversi ke string dengan koma
          newData[rowIdx] = { 
            ...newData[rowIdx], 
            [key]: value.join(', ')
          };
        }
      } else {
        newData[rowIdx] = { ...newData[rowIdx], [key]: value };
      }
      return newData;
    });

    // Validasi setelah edit
    const updatedData = [...previewData];
    if (key === 'kompetensi' || key === 'peran_dalam_kurikulum') {
      // Simpan sebagai string untuk validasi
      updatedData[rowIdx] = { 
        ...updatedData[rowIdx], 
        [key]: typeof value === 'string' ? value : value.join(', ')
      };
    } else {
      updatedData[rowIdx] = { ...updatedData[rowIdx], [key]: value };
    }

    const validationResult = validateExcelData(updatedData, data);
    setValidationErrors(validationResult.errors);
    setCellErrors(validationResult.cellErrors);
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedRows.map(id => api.delete(`/users/${id}`)));
      const res = await api.get("/users?role=dosen");
      setData(res.data);
      setSuccess(`${selectedRows.length} data dosen berhasil dihapus.`);
      setSelectedRows([]);
    } catch {
      setError("Gagal menghapus data terpilih");
    } finally {
      setIsDeleting(false);
    }
  };

  // New handler for Listbox onChange to manage 'all_kompetensi' logic
  const handleFilterKompetensiChange = (newSelection: string[]) => {
    // If 'all_kompetensi' was just selected
    if (newSelection.includes('all_kompetensi')) {
      setFilterKompetensi([]); // Clear all other selections, effectively 'select all'
      setPage(1); // RESET PAGE!
    } else if (newSelection.length === 0 && filterKompetensi.length > 0) {
      // If newSelection is empty AND previous filterKompetensi was not empty, it means all individual items were deselected.
      // In this case, we want to reset to 'all' state (empty array).
      setFilterKompetensi([]);
      setPage(1); // RESET PAGE!
    } 
    else {
      // Filter out 'all_kompetensi' if it was present and actual competencies are being selected
      const filtered = newSelection.filter(item => item !== 'all_kompetensi');
      setFilterKompetensi(filtered);
      setPage(1); // RESET PAGE!
    }
  };

  // New handler for Listbox onChange to manage 'all_keahlian' logic
  const handleFilterKeahlianChange = (newSelection: string[]) => {
    // If 'all_keahlian' was just selected
    if (newSelection.includes('all_keahlian')) {
      setFilterKeahlian([]); // Clear all other selections, effectively 'select all'
      setPage(1); // RESET PAGE!
    } else if (newSelection.length === 0 && filterKeahlian.length > 0) {
      // If newSelection is empty AND previous filterKeahlian was not empty, it means all individual items were deselected.
      // In this case, we want to reset to 'all' state (empty array).
      setFilterKeahlian([]);
      setPage(1); // RESET PAGE!
    } 
    else {
      // Filter out 'all_keahlian' if it was present and actual keahlian are being selected
      const filtered = newSelection.filter(item => item !== 'all_keahlian');
      setFilterKeahlian(filtered);
      setPage(1); // RESET PAGE!
    }
  };

  // Fetch daftar peran kurikulum global dari backend
  useEffect(() => {
    api.get('/mata-kuliah/peran-kurikulum-options').then(res => {
      if (Array.isArray(res.data)) setPeranKurikulumOptions(res.data);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Daftar Dosen</h1>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setShowModal(true); setEditMode(false); }}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition"
          >
            Input Data
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-sm font-medium shadow-theme-xs hover:bg-green-200 dark:hover:bg-green-800 transition cursor-pointer">
            <FontAwesomeIcon icon={faFileExcel} className="w-5 h-5 text-green-700 dark:text-green-200" />
            Import Excel
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
          </label>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-medium shadow-theme-xs hover:bg-blue-200 dark:hover:bg-blue-800 transition flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faDownload} className="w-5 h-5" />
            Download Template Excel
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-0">
          <div className="relative w-full md:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill="" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari apa saja di semua kolom data..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <Listbox value={filterKompetensi} onChange={handleFilterKompetensiChange} multiple>
            {({ open }) => (
              <div className="relative w-full md:w-60">
                <Listbox.Button className="relative h-11 w-full cursor-default rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2 pl-3 pr-10 text-left text-gray-800 dark:text-white shadow-theme-xs focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-300 sm:text-sm">
                  <span className="block truncate">
                    {filterKompetensi.length === 0
                      ? "Semua Kompetensi"
                      : filterKompetensi.join(", ")}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </Listbox.Button>
                <Transition
                  show={open}
                  as={"div"}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  className="absolute z-50 mt-1 w-full overflow-auto rounded-md bg-gray-50 dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm max-h-60 hide-scroll"
                >
                  <Listbox.Option
                    className={({ active }) =>
                      `relative cursor-default select-none py-2.5 pl-4 pr-4 ${
                        active ? 'bg-brand-100 text-brand-900 dark:bg-brand-700/20 dark:text-white' : 'text-gray-900 dark:text-gray-100'
                      }`
                    }
                    value="all_kompetensi" // Changed value to a string
                  >
                    {({ selected: _selected }) => (
                      <div className="flex items-center justify-between">
                        <span
                          className={`block truncate ${
                            filterKompetensi.length === 0 ? 'font-medium' : 'font-normal' // Check if filterKompetensi is empty for 'selected' state
                          }`}
                        >
                          Semua Kompetensi
                        </span>
                        <button
                          type="button"
                          aria-checked={filterKompetensi.length === 0} // Check if filterKompetensi is empty for aria-checked
                          role="checkbox"
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500
                            ${filterKompetensi.length === 0 ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"}
                            cursor-pointer`}
                        >
                          {filterKompetensi.length === 0 && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={3}
                              viewBox="0 0 24 24"
                            >
                              <polyline points="20 7 11 17 4 10" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </Listbox.Option>
                  {uniqueKompetensiOptions.map((kompetensi, kompetensiIdx) => (
                    <Listbox.Option
                      key={kompetensiIdx}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2.5 pl-4 pr-4 ${
                          active ? 'bg-brand-100 text-brand-900 dark:bg-brand-700/20 dark:text-white' : 'text-gray-900 dark:text-gray-100'
                        }`
                      }
                      value={kompetensi}
                    >
                      {({ selected: _selected }) => (
                        <div className="flex items-center justify-between">
                          <span
                            className={`block truncate ${
                              _selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {kompetensi}
                          </span>
                          {/* Render checkbox only if this option is selected AND 'all_kompetensi' is NOT selected */}
                          {_selected && filterKompetensi.length > 0 && (
                            <button
                              type="button"
                              aria-checked={_selected}
                              role="checkbox"
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500
                                ${_selected ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"}
                                cursor-pointer`}
                            >
                              {_selected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                  viewBox="0 0 24 24"
                                >
                                  <polyline points="20 7 11 17 4 10" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </Listbox.Option>
                  ))}
                </Transition>
              </div>
            )}
          </Listbox>
          <Listbox value={filterKeahlian} onChange={handleFilterKeahlianChange} multiple>
            {({ open }) => (
              <div className="relative w-full md:w-60 mt-2 md:mt-0">
                <Listbox.Button className="relative h-11 w-full cursor-default rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2 pl-3 pr-10 text-left text-gray-800 dark:text-white shadow-theme-xs focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-300 sm:text-sm">
                  <span className="block truncate">
                    {filterKeahlian.length === 0
                      ? "Semua Keahlian"
                      : filterKeahlian.join(", ")}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </Listbox.Button>
                <Transition
                  show={open}
                  as={"div"}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  className="absolute z-50 mt-1 w-full overflow-auto rounded-md bg-gray-50 dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm max-h-60 hide-scroll"
                >
                  <Listbox.Options static>
                    <Listbox.Option
                      className={({ active }) =>
                        `relative cursor-default select-none py-2.5 pl-4 pr-4 ${
                          active ? 'bg-brand-100 text-brand-900 dark:bg-brand-700/20 dark:text-white' : 'text-gray-900 dark:text-gray-100'
                        }`
                      }
                      value="all_keahlian"
                    >
                      {({ selected: _selected }) => (
                        <div className="flex items-center justify-between">
                          <span className={`block truncate ${filterKeahlian.length === 0 ? 'font-medium' : 'font-normal'}`}>Semua Keahlian</span>
                          <button
                            type="button"
                            aria-checked={filterKeahlian.length === 0}
                            role="checkbox"
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 ${filterKeahlian.length === 0 ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"} cursor-pointer`}
                          >
                            {filterKeahlian.length === 0 && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><polyline points="20 7 11 17 4 10" /></svg>
                            )}
                          </button>
                        </div>
                      )}
                    </Listbox.Option>
                    {uniqueKeahlianOptions.map((keahlian, idx) => (
                      <Listbox.Option
                        key={idx}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2.5 pl-4 pr-4 ${active ? 'bg-brand-100 text-brand-900 dark:bg-brand-700/20 dark:text-white' : 'text-gray-900 dark:text-gray-100'}`
                        }
                        value={keahlian}
                      >
                        {({ selected: _selected }) => (
                          <div className="flex items-center justify-between">
                            <span className={`block truncate ${_selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {keahlian}
                            </span>
                            {_selected && filterKeahlian.length > 0 && (
                              <button type="button" aria-checked={_selected} role="checkbox" className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 ${_selected ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"} cursor-pointer`}>
                                {_selected && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><polyline points="20 7 11 17 4 10" /></svg>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            )}
          </Listbox>
        </div>
      </div>
      {error && (
        <div className="bg-red-100 rounded-md p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {/* Preview Data Section (now below search bar) */}
      {importedFile && (
        <div className="w-full mt-4">
          <div className="mb-2 text-sm text-gray-700 dark:text-gray-200 font-semibold">
            Preview Data: <span className="font-normal text-gray-500 dark:text-gray-400">{importedFile.name}</span>
          </div>
          {/* Error di atas tabel preview, hanya tampil jika ada validationErrors atau cellErrors */}
          {(validationErrors.length > 0 || cellErrors.length > 0) && (
            <div className="mb-4">
              <div className="bg-red-100 rounded-md p-3">
                <div className="text-base font-semibold text-red-500 mb-1">
                  {importedCount > 0
                    ? 'Sebagian data gagal diimpor karena tidak valid:'
                    : 'Semua data gagal diimpor. Periksa kembali format dan isian data:'}
                </div>
                {/* Tampilkan error cell detail jika ada cellErrors, jika tidak fallback ke validationErrors */}
                <ul className="list-disc pl-5 text-sm text-red-600">
                  {cellErrors.length > 0
                    ? cellErrors.map((err, idx) => (
                        <li key={idx}>
                          {err.message} (Baris {err.row + 2}, Kolom {err.field.toUpperCase()}): {previewData.find(r => r.nid === err.nid)?.[err.field] || ''}
                        </li>
                      ))
                    : validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                </ul>
              </div>
            </div>
          )}
          {/* Table Preview dengan style dan pagination sama seperti table dosen utama */}
          <div
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
          >
            <div
              className="max-w-full overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`
                .max-w-full::-webkit-scrollbar { display: none; }
                .hide-scroll { 
                  -ms-overflow-style: none; /* IE and Edge */
                  scrollbar-width: none; /* Firefox */
                }
                .hide-scroll::-webkit-scrollbar { /* Chrome, Safari, Opera */
                  display: none;
                }
              `}</style>
              <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
                <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
      <th className="px-4 py-4"></th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">NID</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">NIDN</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Nama</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Username</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Email</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">No. Telepon</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Peran Utama</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Mata Kuliah/Peran Kurikulum</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400">Aksi</th>
                  </tr>
                </thead>
                <tbody>
    {loading ? (
      // Skeleton loading: tampilkan 5 baris skeleton
      Array.from({ length: 5 }).map((_, idx) => (
        <tr key={idx} className="animate-pulse">
          {/* Checkbox */}
          <td className="px-4 py-4">
            <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* NID */}
          <td className="px-6 py-4">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* NIDN */}
          <td className="px-6 py-4">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Nama */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Username */}
          <td className="px-6 py-4">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Email */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Telp */}
          <td className="px-6 py-4">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Kompetensi */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Keahlian */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Peran Kurikulum */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Peran Utama */}
          <td className="px-6 py-4">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Matkul/Peran Kurikulum */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Aksi */}
          <td className="px-6 py-4 text-center">
            <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
          </td>
        </tr>
      ))
    ) : paginatedData.length > 0 ? (
      paginatedData.map((d, idx) => (
        <tr key={d.nid} className={idx % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
          <td className="px-4 py-4">
            <button
              type="button"
              aria-checked={selectedRows.includes(String(d.id || d.nid))}
              role="checkbox"
              onClick={() => {
                if (selectedRows.includes(String(d.id || d.nid))) {
                  setSelectedRows(selectedRows.filter(id => id !== String(d.id || d.nid)));
                                        } else {
                  setSelectedRows([...selectedRows, String(d.id || d.nid)]);
                }
              }}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 ${selectedRows.includes(String(d.id || d.nid)) ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"} cursor-pointer`}
            >
              {selectedRows.includes(String(d.id || d.nid)) && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <polyline points="20 7 11 17 4 10" />
                </svg>
              )}
            </button>
                                </td>
          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 dark:text-white/90 align-middle">{d.nid}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.nidn}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.name}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.username}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.email}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle min-w-[120px]">{d.telp}</td>
          {/* Kolom Peran Utama */}
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">
            {d.peran_utama === "ketua" && (
              <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Ketua</span>
            )}
            {d.peran_utama === "anggota" && (
              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Anggota</span>
            )}
            {d.peran_utama === "dosen_mengajar" && (
              <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">Dosen Mengajar</span>
            )}
          </td>
          {/* Kolom Mata Kuliah/Peran Kurikulum */}
          <td className="px-6 py-4 whitespace-pre-line text-gray-700 dark:text-gray-300 align-middle min-w-[200px]">
            {d.peran_utama === "ketua" && d.matkul_ketua_nama && d.matkul_ketua_semester && (
              <span>
                {d.matkul_ketua_nama} (Semester {d.matkul_ketua_semester})
              </span>
            )}
            {d.peran_utama === "anggota" && d.matkul_anggota_nama && d.matkul_anggota_semester && (
              <span>
                {d.matkul_anggota_nama} (Semester {d.matkul_anggota_semester})
              </span>
            )}
            {d.peran_utama === "dosen_mengajar" && d.peran_kurikulum_mengajar && (
              <span>{d.peran_kurikulum_mengajar}</span>
            )}
          </td>
          {/* Kolom Aksi */}
          <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleEdit(d)}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition"
                title="Edit"
              >
                <FontAwesomeIcon icon={faPenToSquare} className="w-5 h-5" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(d.id!.toString())}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition"
                title="Delete"
              >
                <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />
                Delete
              </button>
            </div>
          </td>
                          </tr>
      ))
                  ) : (
                    <tr>
        <td colSpan={10} className="text-center py-8 text-gray-400 dark:text-gray-500">Belum ada data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Preview Table */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4">
              <div className="flex items-center gap-4">
                <select
                  id="previewPerPage"
                  value={previewPageSize}
                  onChange={e => { setPreviewPageSize(Number(e.target.value)); setPreviewPage(1); }}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Menampilkan {paginatedPreviewData.length} dari {previewData.length} data
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage === 1}
                  className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Prev
                </button>
                {Array.from({ length: previewTotalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewPage(i + 1)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 ${
                      previewPage === i + 1
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } transition`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                  disabled={previewPage === previewTotalPages}
                  className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 mb-6">
            <button
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              onClick={() => {
                setImportedFile(null);
                setPreviewData([]);
                setValidationErrors([]);
                setCellErrors([]);
              }}
              type="button"
            >
              Batal
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-theme-xs flex items-center justify-center min-w-[160px] transition
                ${isSaving || loading
                  ? 'bg-emerald-800 text-white opacity-60 cursor-not-allowed'
                  : 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600'}`}
              onClick={handleSubmitImport}
              disabled={isSaving || loading}
            >
              {isSaving ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Mengimpor...
                </>
              ) : (
                'Import ke Database'
              )}
            </button>
          </div>
        </div>
      )}
      {/* Success Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-green-100 rounded-md p-3 mb-4 text-green-700"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
      >
        <div
          className="max-w-full overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            .max-w-full::-webkit-scrollbar { display: none; }
            .hide-scroll { 
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
            }
            .hide-scroll::-webkit-scrollbar { /* Chrome, Safari, Opera */
              display: none;
            }
          `}</style>
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
            <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
      <th className="px-4 py-4"></th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">NID</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">NIDN</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Nama</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Username</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Email</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">No. Telepon</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Kompetensi</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Keahlian</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Peran dalam Kurikulum</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Peran Utama</th>
      <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Mata Kuliah/Peran Kurikulum</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
    {loading ? (
      // Skeleton loading: tampilkan 5 baris skeleton
      Array.from({ length: 5 }).map((_, idx) => (
        <tr key={idx} className="animate-pulse">
          {/* Checkbox */}
                    <td className="px-4 py-4">
            <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700" />
                    </td>
          {/* NID */}
          <td className="px-6 py-4">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
          {/* NIDN */}
          <td className="px-6 py-4">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
          {/* Nama */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
          {/* Username */}
          <td className="px-6 py-4">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
          {/* Email */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
          {/* Telp */}
          <td className="px-6 py-4">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Kompetensi */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Keahlian */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Peran Kurikulum */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Peran Utama */}
          <td className="px-6 py-4">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Matkul/Peran Kurikulum */}
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          {/* Aksi */}
          <td className="px-6 py-4 text-center">
            <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
          </td>
                  </tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((d, idx) => (
                  <tr key={d.nid} className={idx % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                    <td className="px-4 py-4">
                        <button
                          type="button"
                          aria-checked={selectedRows.includes(String(d.id || d.nid))}
                          role="checkbox"
                          onClick={() => {
                            if (selectedRows.includes(String(d.id || d.nid))) {
                              setSelectedRows(selectedRows.filter(id => id !== String(d.id || d.nid)));
                            } else {
                              setSelectedRows([...selectedRows, String(d.id || d.nid)]);
                            }
                          }}
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 ${selectedRows.includes(String(d.id || d.nid)) ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"} cursor-pointer`}
                        >
                          {selectedRows.includes(String(d.id || d.nid)) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <polyline points="20 7 11 17 4 10" />
                            </svg>
                          )}
                        </button>
          </td>
          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 dark:text-white/90 align-middle">{d.nid || "-"}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.nidn || "-"}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.name || "-"}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.username || "-"}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{d.email || "-"}</td>
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle min-w-[120px]">{d.telp || "-"}</td>
          {/* Kolom Kompetensi */}
          <td className="px-6 py-4 whitespace-pre-line text-gray-700 dark:text-gray-300 align-middle min-w-[200px]">
            {(() => {
              let val = d.kompetensi;
              if (!val) return "-";
              if (Array.isArray(val)) return val.join(', ');
              try {
                const arr = JSON.parse(val);
                return Array.isArray(arr) ? arr.join(', ') : String(val);
              } catch {
                return String(val);
              }
            })()}
          </td>
          {/* Kolom Keahlian */}
          <td className="px-6 py-4 whitespace-pre-line text-gray-700 dark:text-gray-300 align-middle min-w-[200px]">
            {(() => {
              let val = d.keahlian;
              if (!val) return "-";
              if (Array.isArray(val)) return val.join(', ');
              try {
                const arr = JSON.parse(val);
                return Array.isArray(arr) ? arr.join(', ') : String(val);
              } catch {
                return String(val);
              }
            })()}
          </td>
          {/* Kolom Peran dalam Kurikulum */}
          <td className="px-6 py-4 whitespace-pre-line text-gray-700 dark:text-gray-300 align-middle min-w-[300px]">
            {(() => {
              let val = d.peran_kurikulum;
              if (!val) return "-";
              if (Array.isArray(val)) return val.join(', ');
              try {
                const arr = JSON.parse(val);
                return Array.isArray(arr) ? arr.join(', ') : String(val);
              } catch {
                return String(val);
              }
            })()}
          </td>
          {/* Kolom Peran Utama */}
          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">
            {d.peran_utama === "ketua" && (
              <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Ketua</span>
            )}
            {d.peran_utama === "anggota" && (
              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Anggota</span>
            )}
            {d.peran_utama === "dosen_mengajar" && (
              <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">Dosen Mengajar</span>
            )}
            {!d.peran_utama && "-"}
                    </td>
          {/* Kolom Mata Kuliah/Peran Kurikulum */}
          <td className="px-6 py-4 whitespace-pre-line text-gray-700 dark:text-gray-300 align-middle min-w-[200px]">
            {d.peran_utama === "ketua" && d.matkul_ketua_nama && d.matkul_ketua_semester && (
              <span>
                {d.matkul_ketua_nama} (Semester {d.matkul_ketua_semester})
              </span>
            )}
            {d.peran_utama === "anggota" && d.matkul_anggota_nama && d.matkul_anggota_semester && (
              <span>
                {d.matkul_anggota_nama} (Semester {d.matkul_anggota_semester})
              </span>
            )}
            {d.peran_utama === "dosen_mengajar" && d.peran_kurikulum_mengajar && (
              <span>{d.peran_kurikulum_mengajar}</span>
            )}
          </td>
          {/* Kolom Aksi */}
                    <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(d)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="w-5 h-5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(d.id!.toString())}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
        <td colSpan={13} className="text-center py-8 text-gray-400 dark:text-gray-500">Belum ada data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-4">
            <select
              id="perPage"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {paginatedData.length} dari {filteredAndSearchedData.length} data
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 ${
                  page === i + 1
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                } transition`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-8">
        <button
          disabled={selectedRows.length === 0 || isDeleting}
          onClick={() => setShowDeleteModalBulk(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition ${selectedRows.length === 0 || isDeleting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-500 text-white shadow-theme-xs hover:bg-red-600'}`}
        >
          {isDeleting ? 'Menghapus...' : `Hapus Terpilih (${selectedRows.length})`}
        </button>
      </div>
      <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={handleCloseModal}
          ></div>
          {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
            >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
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
              <div className="flex items-center justify-between pb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {editMode ? 'Edit Dosen' : 'Tambah Dosen'}
                </h2>
              </div>
              <div>
                <form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nama */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama</label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    {/* Password */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={form.password || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                          required={!editMode}
                          autoComplete="new-password"
                          placeholder={editMode ? "Kosongkan jika tidak ingin mengubah password" : ""}
                        />
                        <span
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                          {showPassword ? (
                            <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                          ) : (
                            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Username full width */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  {/* NID & NIDN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">NID</label>
                      <input
                        type="text"
                        name="nid"
                        value={form.nid}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                        disabled={editMode}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        onKeyDown={handleNumberInput}
                        autoComplete="off"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">NIDN</label>
                      <input
                        type="text"
                        name="nidn"
                        value={form.nidn}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        onKeyDown={handleNumberInput}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  {/* Email & Telepon */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nomor Telepon</label>
                      <input
                        type="tel"
                        name="telp"
                        value={form.telp}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        onKeyDown={handleNumberInput}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                  <div className="mb-4">
  <label className="block text-sm font-medium text-gray-300 mb-2">Peran Utama</label>
  <div className="flex gap-3">
    {[
      { value: "ketua", label: "Ketua" },
      { value: "anggota", label: "Anggota" },
      { value: "dosen_mengajar", label: "Dosen Mengajar" },
      { value: "standby", label: "Standby" },
    ].map(opt => (
      <label
        key={opt.value}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition
          border-2
          ${peranUtama === opt.value
            ? "border-brand-500 bg-brand-900/30 text-brand-400"
            : "border-gray-700 bg-gray-800 text-gray-300 hover:border-brand-700"}
          ${editMode ? "opacity-60 pointer-events-none" : ""}
        `}
      >
        <input
          type="radio"
          name="peran_utama"
          value={opt.value}
          checked={peranUtama === opt.value}
          onChange={() => setPeranUtama(opt.value)}
          disabled={editMode}
          className="hidden"
        />
        <span className="font-semibold">{opt.label}</span>
      </label>
    ))}
  </div>
</div>
</div>
{peranUtama === "ketua" && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Mata Kuliah (Ketua)</label>
    <select className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base hide-scroll" value={matkulKetua} onChange={e => setMatkulKetua(e.target.value)} disabled={editMode}>
      <option value="">Pilih Mata Kuliah</option>
      {matkulList.map(mk => (
        <option key={mk.kode} value={mk.kode}>{mk.nama} (Semester {mk.semester})</option>
      ))}
    </select>
  </div>
)}
{peranUtama === "anggota" && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Mata Kuliah (Anggota)</label>
    <select className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base hide-scroll" value={matkulAnggota} onChange={e => setMatkulAnggota(e.target.value)} disabled={editMode}>
      <option value="">Pilih Mata Kuliah</option>
      {matkulList.map(mk => (
        <option key={mk.kode} value={mk.kode}>{mk.nama} (Semester {mk.semester})</option>
      ))}
    </select>
  </div>
)}
{peranUtama === "dosen_mengajar" && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Peran dalam Kurikulum (Dosen Mengajar)</label>
    <select className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base hide-scroll" value={peranKurikulumMengajar} onChange={e => setPeranKurikulumMengajar(e.target.value)} disabled={editMode}>
      <option value="">Pilih Peran Kurikulum</option>
      {peranKurikulumOptions.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
)}

{/* Field kompetensi & keahlian hanya muncul jika bukan standby */}
{peranUtama !== "standby" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Kompetensi */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kompetensi</label>
                      <Listbox 
                        value={Array.isArray(form.kompetensi) ? form.kompetensi : (form.kompetensi || '').split(',').map(k => k.trim()).filter(k => k !== '')} 
                        onChange={(newSelection) => setForm(prev => ({ ...prev, kompetensi: newSelection }))} 
                        multiple
                      >
                        {({ open }) => (
                          <div className="relative">
                            <Listbox.Button className="relative w-full cursor-default rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2 pl-3 pr-10 text-left text-gray-800 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm">
                              <span className="block truncate">
                                {Array.isArray(form.kompetensi) && form.kompetensi.length === 0
                                  ? "Pilih Kompetensi"
                                  : Array.isArray(form.kompetensi) ? form.kompetensi.join(", ") : ""}
                              </span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <FontAwesomeIcon
                                  icon={faChevronDown}
                                  className="h-5 w-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </span>
                            </Listbox.Button>
                            <Transition
                              show={open}
                              as={"div"}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                              className="absolute z-50 mt-1 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm max-h-60 hide-scroll"
                            >
                              <Listbox.Options static>
                                {availableKompetensi.length === 0 ? (
                                  <Listbox.Option
                                    className="relative cursor-default select-none py-2.5 pl-4 pr-4 text-gray-400 dark:text-gray-500"
                                    value=""
                                    disabled
                                  >
                                    Belum ada kompetensi
                                  </Listbox.Option>
                                ) : (
                                  availableKompetensi.map((kompetensi) => (
                                    <Listbox.Option
                                      key={kompetensi}
                                      className={({ active }) =>
                                        `relative cursor-default select-none py-2.5 pl-4 pr-4 ${active
                                          ? 'bg-brand-100 text-brand-900 dark:bg-brand-700/20 dark:text-white'
                                          : 'text-gray-900 dark:text-gray-100'
                                        }`
                                      }
                                      value={kompetensi}
                                    >
                                      {({ selected }) => (
                                        <div className="flex items-center justify-between">
                                          <span
                                            className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                              }`}
                                          >
                                            {kompetensi}
                                          </span>
                                          {selected && (
                                            <span className="text-brand-500">
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </Listbox.Option>
                                  ))
                                )}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        )}
                      </Listbox>
                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          value={newKompetensi}
                          onChange={(e) => setNewKompetensi(e.target.value)}
                          placeholder="Tambah kompetensi baru"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newKompetensi.trim() && !availableKompetensi.includes(newKompetensi.trim())) {
                              setAvailableKompetensi(prev => [...prev, newKompetensi.trim()].sort());
                              setForm(prev => ({
                                ...prev,
                                kompetensi: Array.isArray(prev.kompetensi)
                                  ? [...prev.kompetensi, newKompetensi.trim()]
                                  : prev.kompetensi
                                    ? [...prev.kompetensi.split(',').map(k => k.trim()).filter(k => k !== ''), newKompetensi.trim()]
                                    : [newKompetensi.trim()]
                              }));
                              setNewKompetensi("");
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition flex items-center justify-center"
                          disabled={!newKompetensi.trim() || availableKompetensi.includes(newKompetensi.trim())}
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                    {/* Keahlian */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Keahlian</label>
                      <Listbox 
                        value={Array.isArray(form.keahlian) ? form.keahlian : (form.keahlian || '').split(',').map(k => k.trim()).filter(k => k !== '')} 
                        onChange={(newSelection) => setForm(prev => ({ ...prev, keahlian: newSelection }))} 
                        multiple
                      >
                        {({ open }) => (
                          <div className="relative">
                            <Listbox.Button className="relative w-full cursor-default rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2 pl-3 pr-10 text-left text-gray-800 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm">
                              <span className="block truncate">
                                {Array.isArray(form.keahlian) && form.keahlian.length === 0
                                  ? "Pilih Keahlian"
                                  : Array.isArray(form.keahlian) ? form.keahlian.join(", ") : ""}
                              </span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <FontAwesomeIcon
                                  icon={faChevronDown}
                                  className="h-5 w-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </span>
                            </Listbox.Button>
                            <Transition
                              show={open}
                              as={"div"}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                              className="absolute z-50 mt-1 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm max-h-60 hide-scroll"
                            >
                              <Listbox.Options static>
                                {availableKeahlian.length === 0 ? (
                                  <Listbox.Option
                                    className="relative cursor-default select-none py-2.5 pl-4 pr-4 text-gray-400 dark:text-gray-500"
                                    value=""
                                    disabled
                                  >
                                    Belum ada keahlian
                                  </Listbox.Option>
                                ) : (
                                  availableKeahlian.map((keahlian) => (
                                    <Listbox.Option
                                      key={keahlian}
                                      className={({ active }) =>
                                        `relative cursor-default select-none py-2.5 pl-4 pr-4 ${active
                                          ? 'bg-brand-100 text-brand-900 dark:bg-brand-700/20 dark:text-white'
                                          : 'text-gray-900 dark:text-gray-100'
                                        }`
                                      }
                                      value={keahlian}
                                    >
                                      {({ selected }) => (
                                        <div className="flex items-center justify-between">
                                          <span
                                            className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                              }`}
                                          >
                                            {keahlian}
                                          </span>
                                          {selected && (
                                            <span className="text-brand-500">
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </Listbox.Option>
                                  ))
                                )}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        )}
                      </Listbox>
                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          value={newKeahlian}
                          onChange={(e) => setNewKeahlian(e.target.value)}
                          placeholder="Tambah keahlian baru"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newKeahlian.trim() && !availableKeahlian.includes(newKeahlian.trim())) {
                              setAvailableKeahlian(prev => [...prev, newKeahlian.trim()].sort());
                              setForm(prev => ({
                                ...prev,
                                keahlian: Array.isArray(prev.keahlian)
                                  ? [...prev.keahlian, newKeahlian.trim()]
                                  : prev.keahlian
                                    ? [...prev.keahlian.split(',').map(k => k.trim()).filter(k => k !== ''), newKeahlian.trim()]
                                    : [newKeahlian.trim()]
                              }));
                              setNewKeahlian("");
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition flex items-center justify-center"
                          disabled={!newKeahlian.trim() || availableKeahlian.includes(newKeahlian.trim())}
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  </div>
)}
                  {/* Form Actions */}
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleAdd}
                      className={`px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition flex items-center justify-center ${!isFormValid ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={!isFormValid || isSaving}
                    >
                      {isSaving ? (
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
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Menyimpan...
                        </>
                      ) : (
                        'Simpan'
                      )}
                    </button>
                  </div>
                </form>
              </div>
              {modalError && (
                <div className="text-sm text-red-500 bg-red-100 rounded p-2 mt-6">{modalError}</div>
              )}
            </motion.div>
        </div>
      )}
      </AnimatePresence>
      {/* Modal Delete Data */}
      <AnimatePresence>
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={cancelDelete}
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
              onClick={cancelDelete}
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
                  Apakah Anda yakin ingin menghapus data dosen <span className="font-semibold text-gray-800 dark:text-white">{userToDelete?.name || selectedDeleteNid}</span>? Data yang dihapus tidak dapat dikembalikan.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium shadow-theme-xs hover:bg-red-600 transition flex items-center justify-center"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (<><svg className="w-5 h-5 mr-2 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Menghapus...</>) : 'Hapus'}
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
        </div>
      )}
      </AnimatePresence>
      {/* Modal konfirmasi hapus massal */}
      <AnimatePresence>
        {showDeleteModalBulk && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            <div
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={() => setShowDeleteModalBulk(false)}
            ></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001]"
            >
              <div className="flex items-center justify-between pb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Konfirmasi Hapus Data</h2>
              </div>
              <div>
                <p className="mb-6 text-gray-500 dark:text-gray-400">
                  Apakah Anda yakin ingin menghapus <span className="font-semibold text-gray-800 dark:text-white">{selectedRows.length}</span> data dosen terpilih? Data yang dihapus tidak dapat dikembalikan.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowDeleteModalBulk(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => {
                      setShowDeleteModalBulk(false);
                      await handleDeleteSelected();
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium shadow-theme-xs hover:bg-red-600 transition flex items-center justify-center"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Menghapus...' : 'Hapus'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}