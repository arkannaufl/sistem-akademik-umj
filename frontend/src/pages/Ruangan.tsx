import { useState, ChangeEvent, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faPenToSquare, faTrash, faDownload } from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import api from "../utils/api";
import * as XLSX from 'xlsx';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

type RuanganType = {
  id: number;
  id_ruangan: string;
  nama: string;
  kapasitas: number;
  gedung: string;
  keterangan: string;
};

export default function Ruangan() {
  const [data, setData] = useState<RuanganType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<RuanganType, 'id'>>({
    id_ruangan: "",
    nama: "",
    kapasitas: 0,
    gedung: "",
    keterangan: ""
  });
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDeleteModalBulk, setShowDeleteModalBulk] = useState(false);
  // New states for Excel import
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [cellErrors, setCellErrors] = useState<{row: number, field: string, message: string, id_ruangan?: string}[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(10);
  const previewTotalPages = Math.ceil(previewData.length / previewPageSize);
  const paginatedPreviewData = previewData.slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize);
  const [editingCell, setEditingCell] = useState<{ row: number; key: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/ruangan");
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Search
  const filteredData = data.filter((r) => {
    const q = search.toLowerCase();
    // Gabungkan semua value dari objek menjadi satu string
    const allValues = Object.values(r).join(' ').toLowerCase();
    return allValues.includes(q);
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'kapasitas') {
      setForm({ ...form, [name]: parseInt(value) || 0 });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAdd = async () => {
    setIsSaving(true);
    setError("");
    try {
      if (editMode && selectedDeleteId) {
        await api.put(`/ruangan/${selectedDeleteId}`, form);
        setSuccess("Data ruangan berhasil diupdate.");
      } else {
        await api.post("/ruangan", form);
        setSuccess("Data ruangan berhasil ditambahkan.");
      }
      await fetchData();
      setShowModal(false);
      setEditMode(false);
      setForm({ id_ruangan: "", nama: "", kapasitas: 0, gedung: "", keterangan: "" });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal simpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (r: RuanganType) => {
    setForm({
      id_ruangan: r.id_ruangan,
      nama: r.nama,
      kapasitas: r.kapasitas,
      gedung: r.gedung,
      keterangan: r.keterangan
    });
    setSelectedDeleteId(r.id);
    setShowModal(true);
    setEditMode(true);
  };

  const handleDelete = (id: number) => {
    setSelectedDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteId) return;
    setIsDeleting(true);
    try {
      const roomToDelete = data.find((r) => r.id === selectedDeleteId);
      await api.delete(`/ruangan/${selectedDeleteId}`);
      await fetchData();
      setShowDeleteModal(false);
      setSelectedDeleteId(null);
      setSuccess(`Data ruangan ${roomToDelete?.nama} berhasil dihapus.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menghapus data");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedDeleteId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ id_ruangan: "", nama: "", kapasitas: 0, gedung: "", keterangan: "" });
    setEditMode(false);
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportedFile(file);
      try {
        const excelData = await readExcelFile(file);
        setPreviewData(excelData);
        const validationResult = validateExcelData(excelData, data);
        setValidationErrors(validationResult.errors);
        setCellErrors(validationResult.cellErrors);
      } catch (err: any) {
        setError(err?.message || "Gagal membaca file Excel");
      } finally {
        // Reset input file agar bisa pilih file yang sama lagi
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmitImport = async () => {
    setIsSaving(true);
    setError("");
    setLoading(true);
    setImportedCount(0);
    setCellErrors([]);

    // Validate data before submitting
    const validationResult = validateExcelData(previewData, data);
    if (validationResult.errors.length > 0) {
      setValidationErrors(validationResult.errors);
      setCellErrors(validationResult.cellErrors);
      setIsSaving(false);
      setLoading(false);
      return;
    } else {
      setValidationErrors([]);
      setCellErrors([]);
    }

    try {
      const ws = XLSX.utils.json_to_sheet(previewData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ruangan");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const file = new File([excelBuffer], "Data_Import_Ruangan_Edited.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/ruangan/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true, // Agar Axios tidak melempar error untuk status non-2xx
      });

      if (res.status === 200) {
        setImportedCount(res.data.imported_count || 0);
        if (res.data.imported_count > 0) {
          setSuccess("Data berhasil diimpor ke database.");
        }
        if (res.data.errors && res.data.errors.length > 0) {
          setError("Sebagian data gagal diimpor karena tidak valid:");
          if (res.data.failed_rows && res.data.failed_rows.length > 0) {
            setPreviewData(res.data.failed_rows);
          }
          setValidationErrors(res.data.errors);
          setCellErrors(res.data.cell_errors || []);
        } else {
          setImportedFile(null);
          setPreviewData([]);
          setValidationErrors([]);
          setCellErrors([]);
        }
        await fetchData(); // Refresh main data
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
      setError(err?.response?.data?.message || "Gagal mengimpor data");
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
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (err) {
          reject(new Error("Format file Excel tidak valid"));
        }
      };
      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateExcelData = (excelData: any[], existingDbData: RuanganType[]) => {
    const errors: string[] = [];
    const newCellErrors: {row: number, field: string, message: string, id_ruangan?: string}[] = [];
    
    if (excelData.length === 0) {
      errors.push('File Excel kosong');
      return { valid: false, errors, cellErrors: newCellErrors };
    }
    
    const firstRow = excelData[0];
    const requiredHeaders = ['id_ruangan', 'nama', 'kapasitas', 'gedung'];
    const headers = Object.keys(firstRow).map(h => h.toLowerCase()); // Convert to lowercase for comparison
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      errors.push(`Kolom yang diperlukan tidak ditemukan: ${missingHeaders.map(h => h.toUpperCase()).join(', ')}`);
      return { valid: false, errors, cellErrors: newCellErrors };
    }

    const idRuanganSetInFile = new Set();

    excelData.forEach((row, index) => {
      const rowNum = index + 2; // For displaying row number in error messages (Excel is 1-indexed, plus header row)
      const rowIdRuangan = row.id_ruangan ? String(row.id_ruangan) : '';

      // Validate required fields
      if (!row.id_ruangan) {
        errors.push(`ID Ruangan harus diisi (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'id_ruangan', message: `ID Ruangan harus diisi`, id_ruangan: rowIdRuangan });
      }
      if (!row.nama) {
        errors.push(`Nama Ruangan harus diisi (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'nama', message: `Nama Ruangan harus diisi`, id_ruangan: rowIdRuangan });
      }
      if (!row.kapasitas || isNaN(Number(row.kapasitas))) {
        errors.push(`Kapasitas harus diisi dengan angka (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'kapasitas', message: `Kapasitas harus diisi dengan angka`, id_ruangan: rowIdRuangan });
      }
      if (!row.gedung) {
        errors.push(`Gedung harus diisi (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'gedung', message: `Gedung harus diisi`, id_ruangan: rowIdRuangan });
      }

      // Check for duplicate ID Ruangan within the file
      if (rowIdRuangan) {
        if (idRuanganSetInFile.has(rowIdRuangan)) {
          errors.push(`ID Ruangan ${rowIdRuangan} sudah terdaftar dalam file Excel ini (Baris ${rowNum})`);
          newCellErrors.push({ row: index, field: 'id_ruangan', message: `ID Ruangan duplikat dalam file`, id_ruangan: rowIdRuangan });
        } else {
          idRuanganSetInFile.add(rowIdRuangan);
        }
      }

      // Check if ID Ruangan already exists in database
      if (rowIdRuangan && existingDbData.some(d => d.id_ruangan === rowIdRuangan)) {
        errors.push(`ID Ruangan ${rowIdRuangan} sudah terdaftar di database (Baris ${rowNum})`);
        newCellErrors.push({ row: index, field: 'id_ruangan', message: `ID Ruangan sudah terdaftar di database`, id_ruangan: rowIdRuangan });
      }
    });

    const uniqueErrors = Array.from(new Set(errors)); // Ensure unique global error messages
    return { valid: uniqueErrors.length === 0, errors: uniqueErrors, cellErrors: newCellErrors };
  };

  const handleCellEdit = (rowIdx: number, key: string, value: string) => {
    setPreviewData(prev => {
      const newData = [...prev];
      let valToSet = value;
      if (key === 'kapasitas') { // Specific handling for numeric input
        valToSet = value.replace(/[^0-9]/g, ""); // Filter non-numeric characters
        newData[rowIdx] = { ...newData[rowIdx], [key]: parseInt(valToSet) || 0 };
      } else {
        newData[rowIdx] = { ...newData[rowIdx], [key]: valToSet };
      }
      
      const rowErrors = validateRow(newData[rowIdx], newData, rowIdx, data);
      setCellErrors(prevCellErrors => {
        let filtered = prevCellErrors.filter(err => err.row !== rowIdx); // Remove old errors for this row
        if (rowErrors.length > 0) {
          rowErrors.forEach(err => {
            filtered.push({ row: rowIdx, field: err.field, message: err.message, id_ruangan: newData[rowIdx].id_ruangan });
          });
        }
        return filtered;
      });
      // Re-run full validation for global errors display, but only if there are existing global errors or after a change
      const newValidationResult = validateExcelData(newData, data);
      setValidationErrors(newValidationResult.errors);

      return newData;
    });
  };

  function validateRow(row: any, allRows: any[], rowIdx: number, existingDbData: RuanganType[]): { field: string, message: string }[] {
    const errors: { field: string, message: string }[] = [];
    const rowIdRuangan = row.id_ruangan ? String(row.id_ruangan) : '';

    // Validate required fields
    if (!row.id_ruangan) errors.push({ field: 'id_ruangan', message: 'ID Ruangan harus diisi' });
    if (!row.nama) errors.push({ field: 'nama', message: 'Nama Ruangan harus diisi' });
    if (!row.kapasitas) errors.push({ field: 'kapasitas', message: 'Kapasitas harus diisi' });
    if (!row.gedung) errors.push({ field: 'gedung', message: 'Gedung harus diisi' });

    // Validate data types
    if (row.kapasitas && isNaN(Number(row.kapasitas))) {
      errors.push({ field: 'kapasitas', message: 'Kapasitas harus berupa angka' });
    }

    // Check for duplicate ID Ruangan within the file
    // Filter allRows based on id_ruangan and ensure it's not the current row
    const duplicateInFile = allRows.some((r, idx) => 
      idx !== rowIdx && String(r.id_ruangan) === rowIdRuangan
    );
    if (rowIdRuangan && duplicateInFile) {
      errors.push({ field: 'id_ruangan', message: 'ID Ruangan duplikat dalam file' });
    }

    // Check if ID Ruangan already exists in database
    const existingIdInDb = existingDbData.some(d => d.id_ruangan === rowIdRuangan);
    if (rowIdRuangan && existingIdInDb) {
      errors.push({ field: 'id_ruangan', message: 'ID Ruangan sudah terdaftar di database' });
    }

    return errors;
  }

  const isFormValid = form.id_ruangan && form.nama && form.kapasitas > 0 && form.gedung;

  const downloadTemplate = async () => {
    // Data contoh untuk template
    const templateData = [
      {
        id_ruangan: 'R001',
        nama: 'Ruang Kelas 101',
        kapasitas: 30,
        gedung: 'Gedung A',
        keterangan: 'Lantai 1'
      }
    ];

    // Buat worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ruangan");
    
    // Generate file dan download
    XLSX.writeFile(wb, "Template_Import_Ruangan.xlsx");
  };

  const roomToDelete = data.find((r) => r.id === selectedDeleteId);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Daftar Ruangan</h1>
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
              disabled={isSaving}
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
          <div className="relative w-full md:w-72">
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
        </div>
      </div>

      {/* Success and Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-4 p-3 rounded-lg bg-green-100 text-green-700"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-4 p-3 rounded-lg bg-red-100 text-red-700"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {importedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-green-100 rounded-md p-3 mb-4 text-green-700"
          >
            {importedCount} data ruangan berhasil diimpor ke database.
          </motion.div>
        )}
      </AnimatePresence>

      {importedFile && (
        <div className="w-full mt-4">
          <div className="mb-2 text-sm text-gray-700 dark:text-gray-200 font-semibold">
            Preview Data: <span className="font-normal text-gray-500 dark:text-gray-400">{importedFile.name}</span>
          </div>
          {(validationErrors.length > 0 || cellErrors.length > 0) && (
            <div className="mb-4">
              <div className="bg-red-100 rounded-md p-3">
                <div className="text-base font-semibold text-red-500 mb-1">
                  {importedCount > 0
                    ? 'Sebagian data gagal diimpor karena tidak valid:'
                    : 'Semua data gagal diimpor. Periksa kembali format dan isian data:'}
                </div>
                <ul className="list-disc pl-5 text-sm text-red-600">
                  {cellErrors.length > 0
                    ? cellErrors.map((err, idx) => (
                        <li key={idx}>
                          {err.message} (Baris {err.row + 2}, Kolom {err.field.toUpperCase()}): {previewData[err.row]?.[err.field] || ''}
                        </li>
                      ))
                    : validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                </ul>
              </div>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.max-w-full::-webkit-scrollbar { display: none; }`}</style>
              <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
                <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    {previewData[0] && Object.keys(previewData[0]).map((colKey) => (
                      <th key={colKey} className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">{colKey.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedPreviewData.map((row, i) => {
                    const globalRowIdx = (previewPage - 1) * previewPageSize + i;
                    return (
                      <tr key={i} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                        {previewData[0] && Object.keys(previewData[0]).map((colKey, _) => {
                          const isEditing = editingCell?.row === globalRowIdx && editingCell?.key === colKey;
                          const cellError = cellErrors.find(err => err.row === globalRowIdx && err.field === colKey);
                          return (
                            <td
                              key={colKey}
                              className={`px-6 py-4 border-b border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-100 whitespace-nowrap cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-700/20 ${isEditing ? 'border-2 border-brand-500' : ''} ${cellError ? 'bg-red-100 dark:bg-red-900/30' : ''}`}
                              onClick={() => setEditingCell({ row: globalRowIdx, key: colKey })}
                              title={cellError ? cellError.message : ''}
                            >
                              {isEditing ? (
                                <input
                                  className="w-full px-1 border-none outline-none text-xs md:text-sm"
                                  value={previewData[editingCell.row][editingCell.key] || ""}
                                  onChange={e => {
                                    let val = e.target.value;
                                    if (["kapasitas"].includes(colKey)) {
                                      val = val.replace(/[^0-9]/g, "");
                                    }
                                    handleCellEdit(globalRowIdx, colKey, val);
                                  }}
                                  onBlur={() => setEditingCell(null)}
                                  autoFocus
                                />
                              ) : (
                                row[colKey]
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4">
              <div className="flex items-center gap-4">
                <select
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

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-6">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
            <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 text-center align-middle">
                  <button
                    type="button"
                    aria-checked={filteredData.length > 0 && filteredData.every(t => selectedRows.includes(t.id))}
                    role="checkbox"
                    onClick={() => {
                      if (filteredData.length > 0 && filteredData.every(t => selectedRows.includes(t.id))) {
                        setSelectedRows([]);
                      } else {
                        setSelectedRows(filteredData.map(t => t.id));
                      }
                    }}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 ${filteredData.length > 0 && filteredData.every(t => selectedRows.includes(t.id)) ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"} cursor-pointer`}
                  >
                    {filteredData.length > 0 && filteredData.every(t => selectedRows.includes(t.id)) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <polyline points="20 7 11 17 4 10" />
                      </svg>
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">ID Ruangan</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Nama Ruangan</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Kapasitas</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Gedung</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-left text-xs uppercase tracking-wider dark:text-gray-400">Keterangan</th>
                <th className="px-6 py-4 font-semibold text-gray-500 text-center text-xs uppercase tracking-wider dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-4 text-center align-middle">
                      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse opacity-80"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse opacity-80"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse opacity-80"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse opacity-80"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse opacity-80"></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse opacity-80 mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}>
                    <td className="px-4 py-4 text-center align-middle">
                      <button
                        type="button"
                        aria-checked={selectedRows.includes(r.id)}
                        role="checkbox"
                        onClick={() => {
                          if (selectedRows.includes(r.id)) {
                            setSelectedRows(selectedRows.filter(id => id !== r.id));
                          } else {
                            setSelectedRows([...selectedRows, r.id]);
                          }
                        }}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 ${selectedRows.includes(r.id) ? "bg-brand-500 border-brand-500" : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700"} cursor-pointer`}
                      >
                        {selectedRows.includes(r.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <polyline points="20 7 11 17 4 10" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 dark:text-white/90 align-middle">{r.id_ruangan}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{r.nama}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{r.kapasitas}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{r.gedung}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 align-middle">{r.keterangan}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(r)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="w-5 h-5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
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
                  <td colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500">Belum ada data.</td>
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
              Menampilkan {paginatedData.length} dari {filteredData.length} data
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

      {/* Modal Add/Edit */}
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
              className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
            >
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
              <div>
                <div className="flex items-center justify-between pb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">{editMode ? 'Edit Ruangan' : 'Add Ruangan'}</h2>
                </div>
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ID Ruangan</label>
                      <input
                        type="text"
                        name="id_ruangan"
                        value={form.id_ruangan}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                        disabled={editMode}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama Ruangan</label>
                      <input
                        type="text"
                        name="nama"
                        value={form.nama}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kapasitas</label>
                      <input
                        type="number"
                        name="kapasitas"
                        value={form.kapasitas}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Gedung</label>
                      <input
                        type="text"
                        name="gedung"
                        value={form.gedung}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Keterangan</label>
                      <input
                        type="text"
                        name="keterangan"
                        value={form.keterangan}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={handleCloseModal}
                        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleAdd}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition ${!isFormValid ? 'bg-emerald-800 text-white opacity-60 cursor-not-allowed' : 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600'}`}
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
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              ></path>
                            </svg>
                            Menyimpan...
                          </>
                        ) : (
                          'Simpan'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-100 rounded p-2 mt-6">{error}</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Delete */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            <div
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={cancelDelete}
            ></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001]"
            >
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
                    Apakah Anda yakin ingin menghapus data ruangan <span className="font-semibold text-gray-800 dark:text-white">{roomToDelete?.nama}</span>? Data yang dihapus tidak dapat dikembalikan.
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

      {/* Modal Delete Bulk */}
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
                  Apakah Anda yakin ingin menghapus <span className="font-semibold text-gray-800 dark:text-white">{selectedRows.length}</span> data ruangan terpilih? Data yang dihapus tidak dapat dikembalikan.
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
                      setLoading(true);
                      setIsDeleting(true);
                      try {
                        await Promise.all(selectedRows.map(id => api.delete(`/ruangan/${id}`)));
                        await fetchData();
                        setSelectedRows([]);
                        setSuccess(`${selectedRows.length} data ruangan berhasil dihapus.`);
                      } catch {
                        setError("Gagal menghapus data terpilih");
                      } finally {
                        setIsDeleting(false);
                        setLoading(false);
                      }
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
