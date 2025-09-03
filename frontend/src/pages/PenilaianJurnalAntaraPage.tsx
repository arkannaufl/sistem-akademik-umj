import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "../icons";
import SignaturePad from "react-signature-canvas";
import React, { useRef } from "react";
import * as XLSX from "xlsx";
import api from "../utils/api";
import { AnimatePresence, motion } from "framer-motion";

interface PenilaianJurnal {
  [nim: string]: {
    keaktifan: number;
    laporan: number;
  };
}

interface AbsensiJurnal {
  [nim: string]: {
    hadir: boolean;
  };
}

export default function PenilaianJurnalPage() {
  const { kode_blok, kelompok, jurnal_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [judulJurnal, setJudulJurnal] = useState("");
  const [mahasiswa, setMahasiswa] = useState<{ nim: string; nama: string }[]>([]);
  const [penilaian, setPenilaian] = useState<PenilaianJurnal>({});
  const [absensi, setAbsensi] = useState<AbsensiJurnal>({});
  const [dosen, setDosen] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [tanggalParaf, setTanggalParaf] = useState("");
  const [signatureParaf, setSignatureParaf] = useState<string | null>(null);
  const sigPadParaf = useRef<any>(null);
  const [namaTutor, setNamaTutor] = useState("");

  // State untuk loading dan error
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch data dari backend
  useEffect(() => {
    if (!kode_blok || !kelompok || !jurnal_id) return;
    
    setLoading(true);
    setError(null);
    
    // Fetch data penilaian dan absensi secara parallel
    Promise.all([
      api.get(`/penilaian-jurnal-antara/${kode_blok}/${kelompok}/${jurnal_id}`),
      api.get(`/penilaian-jurnal-antara/${kode_blok}/${kelompok}/${jurnal_id}/absensi`)
    ])
      .then(([penilaianRes, absensiRes]) => {
        const data = penilaianRes.data;
        const absensiData = absensiRes.data;
        
        // Set data jurnal reading
        if (data.jurnal_reading) {
          setJudulJurnal(data.jurnal_reading.topik || '');
          setTanggal(data.jurnal_reading.tanggal || '');
          setDosen(data.jurnal_reading.dosen?.name || '');
        }
        
        // Set data mahasiswa
        if (data.mahasiswa) {
          setMahasiswa(data.mahasiswa);
        }
        
        // Set data penilaian yang sudah ada
        if (data.penilaian) {
          const pen: PenilaianJurnal = {};
          Object.keys(data.penilaian).forEach(nim => {
            const nilai = data.penilaian[nim];
            pen[nim] = {
              keaktifan: nilai.nilai_keaktifan || 0,
              laporan: nilai.nilai_laporan || 0,
            };
          });
          setPenilaian(pen);
        }
        
        // Set data absensi yang sudah ada
        if (data.absensi) {
          const abs: AbsensiJurnal = {};
          Object.keys(data.absensi).forEach(nim => {
            const absen = data.absensi[nim];
            abs[nim] = {
              hadir: absen.hadir || false,
            };
          });
          setAbsensi(abs);
        }
        
        // Set data tutor
        if (data.tutor_data) {
          setNamaTutor(data.tutor_data.nama_tutor || '');
          setTanggalParaf(data.tutor_data.tanggal_paraf || '');
          setSignatureParaf(data.tutor_data.signature_paraf || null);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Gagal memuat data penilaian');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [kode_blok, kelompok, jurnal_id]);

  // Fungsi untuk handle upload file gambar tanda tangan
  const handleUploadSignature = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      const base64 = event.target?.result as string;
        setSignatureParaf(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClearParaf = () => {
    sigPadParaf.current?.clear();
    setSignatureParaf(null);
  };
  
  const handleSaveParaf = () => {
    if (sigPadParaf.current && !sigPadParaf.current.isEmpty()) {
      const data = sigPadParaf.current.getCanvas().toDataURL("image/png");
      setSignatureParaf(data);
    }
  };

  const handleInputChange = (
    nim: string,
    field: "keaktifan" | "laporan",
    value: string
  ) => {
    const max = field === "keaktifan" ? 60 : 40;
    const score = parseInt(value, 10);
    if (isNaN(score) || score < 0 || score > max) return;
    setPenilaian((prev) => ({
      ...prev,
      [nim]: {
        ...prev[nim],
        [field]: score,
      },
    }));
  };

  const handleAbsensiChange = (nim: string, hadir: boolean) => {
    setAbsensi((prev) => ({
      ...prev,
      [nim]: {
        hadir: hadir,
      },
    }));
  };

  const hitungJumlah = (nim: string) => {
    const nilai = penilaian[nim];
    if (!nilai) return "";
    return (nilai.keaktifan || 0) + (nilai.laporan || 0);
  };

  // Fungsi simpan ke backend
  const handleSaveAll = async () => {
    if (!kode_blok || !kelompok || !jurnal_id) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Simpan absensi terlebih dahulu
      const absensiSuccess = await handleSaveAbsensi();
      if (!absensiSuccess) {
        setSaving(false);
        return;
      }
      
      // Kemudian simpan penilaian
      const payload = {
        penilaian: mahasiswa.map(m => ({
          mahasiswa_nim: m.nim,
          nilai_keaktifan: penilaian[m.nim]?.keaktifan || 0,
          nilai_laporan: penilaian[m.nim]?.laporan || 0,
        })),
        tanggal_paraf: tanggalParaf,
        signature_paraf: signatureParaf,
        nama_tutor: namaTutor,
      };
      
      await api.post(`/penilaian-jurnal-antara/${kode_blok}/${kelompok}/${jurnal_id}`, payload);
      setSuccess('Absensi dan penilaian berhasil disimpan!');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Gagal menyimpan penilaian');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Fungsi simpan absensi ke backend
  const handleSaveAbsensi = async () => {
    if (!kode_blok || !kelompok || !jurnal_id) return;
    
    try {
      const payload = {
        absensi: mahasiswa.map(m => ({
          mahasiswa_nim: m.nim,
          hadir: absensi[m.nim]?.hadir || false,
        })),
      };
      
      await api.post(`/penilaian-jurnal-antara/${kode_blok}/${kelompok}/${jurnal_id}/absensi`, payload);
      return true;
    } catch (error: any) {
      setError(error.response?.data?.message || 'Gagal menyimpan absensi');
      return false;
    }
  };

  // Fungsi export Excel
  const exportExcel = () => {
    const infoRows = [
      [
        `KELOMPOK: ${kelompok || ""}`,
        "",
        "",
        "",
        `TANGGAL: ${tanggal || ""}`,
        "",
        "",
        "",
        `DOSEN: ${dosen || ""}`,
      ],
      [
        `JUDUL JURNAL: ${judulJurnal || ""}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [],
    ];
    const tableHeader = [
      [
        "NO",
        "NAMA MAHASISWA",
        "NIM",
        "NILAI KEAKTIFAN",
        "NILAI LAPORAN",
        "JUMLAH",
      ],
    ];
    const tableBody = mahasiswa.map((m, idx) => {
      const nilai = penilaian[m.nim] || {};
      return [
        idx + 1,
        m.nama,
        m.nim,
        nilai.keaktifan ?? "",
        nilai.laporan ?? "",
        hitungJumlah(m.nim),
      ];
    });
    // Paraf section
    const parafRows = [
      [],
      [
        `Jakarta, ${tanggalParaf || "...................."}`,
        namaTutor || "..................................",
        "PARAF",
      ],
      [
        "",
        "",
        "(Tanda tangan)",
      ],
    ];

    // Kriteria penilaian
    const kriteriaRows = [
      [],
      ["Penilaian keaktifan dan penulisan laporan dilakukan oleh pembimbing, laporan diberikan 3 hari setelah journal reading"],
      [],
      ["KEAKTIFAN (Total: 60)", "", "", "", "LAPORAN (Total: 40)"],
      ["Aktif: 60", "", "", "", "Sesuai Format Laporan (lembar judul, pendahuluan, isi kesimpulan), isi laporan sesuai tema jurnal: 40"],
      ["Rata-rata: 50", "", "", "", "Sesuai Format laporan, isi kurang mencerminkan jurnal: 30"],
      ["Kurang: 40", "", "", "", "Tidak sesuai format, isi mencerminkan jurnal: 20"],
      ["", "", "", "", "Tidak sesuai format, isi tidak sesuai jurnal: 10"],
    ];

    const wsData = [
      ...infoRows,
      ...tableHeader,
      ...tableBody,
      ...kriteriaRows,
      ...parafRows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: wsData.length - 8, c: 0 }, e: { r: wsData.length - 8, c: 8 } }, // Kriteria penjelasan
      { s: { r: wsData.length - 6, c: 0 }, e: { r: wsData.length - 6, c: 3 } }, // KEAKTIFAN header
      { s: { r: wsData.length - 6, c: 4 }, e: { r: wsData.length - 6, c: 8 } }, // LAPORAN header
      { s: { r: wsData.length - 5, c: 4 }, e: { r: wsData.length - 5, c: 8 } }, // LAPORAN kriteria 1
      { s: { r: wsData.length - 4, c: 4 }, e: { r: wsData.length - 4, c: 8 } }, // LAPORAN kriteria 2
      { s: { r: wsData.length - 3, c: 4 }, e: { r: wsData.length - 3, c: 8 } }, // LAPORAN kriteria 3
      { s: { r: wsData.length - 2, c: 4 }, e: { r: wsData.length - 2, c: 8 } }, // LAPORAN kriteria 4
      { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 3 } },
      { s: { r: wsData.length - 1, c: 4 }, e: { r: wsData.length - 1, c: 6 } },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penilaian Jurnal");
    XLSX.writeFile(wb, `Penilaian_Jurnal_${kelompok || ""}.xlsx`);
  };

  // Fungsi export HTML
  const exportHtml = () => {
    const style = `
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #fff; color: #222; }
        .header-row { display: flex; justify-content: flex-start; margin-bottom: 8px; }
        .header-col { font-size: 14px; line-height: 1.5; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #222; }
        table.penilaian { border-collapse: collapse; width: 100%; margin-bottom: 24px; background: #fff; }
        table.penilaian th, table.penilaian td { border: 1px solid #222; padding: 6px 8px; font-size: 13px; }
        table.penilaian th { background: #f5f5f5; font-weight: bold; text-align: center; color: #222; }
        table.penilaian td { text-align: center; color: #222; background: #fff; }
        .info-section { display: flex; gap: 48px; margin-top: 24px; }
        .info-col { font-size: 12px; color: #222; }
        .info-col h3 { font-size: 13px; font-weight: bold; margin-bottom: 6px; color: #222; }
      </style>
    `;
    const htmlHeader = `
      <div class="header-row">
        <div class="header-col">
          <div><b>KELOMPOK:</b> ${kelompok || ""}</div>
          <div><b>TANGGAL:</b> ${tanggal || ""}</div>
          <div><b>JUDUL JURNAL:</b> ${judulJurnal || ""}</div>
          <div><b>DOSEN:</b> ${dosen || ""}</div>
        </div>
      </div>
    `;
    const htmlTableHeader = `
      <tr>
        <th>NO</th>
        <th>NAMA MAHASISWA</th>
        <th>NIM</th>
        <th>NILAI KEAKTIFAN</th>
        <th>NILAI LAPORAN</th>
        <th>JUMLAH</th>
      </tr>
    `;
    const htmlTableBody = mahasiswa
      .map((m, idx) => {
        const nilai = penilaian[m.nim] || {};
        return `<tr>
        <td>${idx + 1}</td>
        <td style="text-align:left;">${m.nama}</td>
        <td>${m.nim}</td>
        <td>${nilai.keaktifan ?? ""}</td>
        <td>${nilai.laporan ?? ""}</td>
        <td>${hitungJumlah(m.nim)}</td>
      </tr>`;
      })
      .join("");
    const htmlParaf = `
      <div style="width:420px; margin:48px 0 0 auto; display:flex; justify-content:flex-end; align-items:flex-start; gap:32px;">
        <div style="width:200px;">
          <div style="margin-bottom:8px;">Jakarta, ${tanggalParaf || "...................."}</div>
          <div style="font-weight:normal; margin-top:5px; margin-bottom:20px;">TUTOR</div>
          <div style="width:100%; text-align:center; font-size:14px; font-weight:normal; min-height:24px; margin-top:8px;">${namaTutor || ""}</div>
          <div style="width:100%; border-bottom:2px dotted #ccc; margin:0 0 8px 0;"></div>
        </div>
        <div style="width:160px;">
          <div style="font-weight:normal; margin-bottom:9px; text-align:center;">PARAF</div>
          <div style="width:100%; height:60px; margin-bottom:0; ">
            ${
              signatureParaf
                ? `<img src='${signatureParaf}' style='width:100%; height:60px; object-fit:contain; ' alt='TTD Paraf' />`
                : ""
            }
          </div>
          <div style="width:100%; border-bottom:2px dotted #ccc; margin:0;"></div>
        </div>
      </div>
    `;

    // Kriteria penilaian yang sudah diperbaiki
    const htmlKriteria = `
      <div style="margin-top: 24px; font-size: 12px; color: #222;">
        <p style="margin-bottom: 8px;">
          Penilaian keaktifan dan penulisan laporan dilakukan oleh pembimbing,
          laporan diberikan 3 hari setelah journal reading
        </p>
        
        <div style="display: flex; gap: 0; margin-top: 16px;">
          <div style="margin-left: 12px;">
            <h4 style="font-weight: bold; margin-bottom: 8px; color: #222; font-size: 13px;">KEAKTIFAN (Total: 60)</h4>
            <ul style="list-style-type: disc;  line-height: 1.4;">
              <li>Aktif: 60</li>
              <li>Rata-rata: 50</li>
              <li>Kurang: 40</li>
            </ul>
          </div>
          
          <div style="margin-left: 40px;">
            <h4 style="font-weight: bold; margin-bottom: 8px; color: #222; font-size: 13px;">LAPORAN (Total: 40)</h4>
            <ul style="list-style-type: disc;  line-height: 1.4;">
              <li>Sesuai Format Laporan (lembar judul, pendahuluan, isi kesimpulan), isi laporan sesuai tema jurnal: 40</li>
              <li>Sesuai Format laporan, isi kurang mencerminkan jurnal: 30</li>
              <li>Tidak sesuai format, isi mencerminkan jurnal: 20</li>
              <li>Tidak sesuai format, isi tidak sesuai jurnal: 10</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    const html = `
      <html><head><meta charset="UTF-8">${style}</head><body>
        <div class="title">LEMBAR PENILAIAN JOURNAL READING</div>
        ${htmlHeader}
        <table class="penilaian">
          ${htmlTableHeader}
          ${htmlTableBody}
        </table>
        ${htmlKriteria}
        ${htmlParaf}
      </body></html>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Penilaian_Jurnal_${kelompok || ""}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto dark:bg-gray-900 min-h-screen">
      <div className="pb-2 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-brand-500 font-medium hover:text-brand-600 transition px-0 py-0 bg-transparent shadow-none dark:text-green-400 dark:hover:text-green-300"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Kembali ke Detail Blok
        </button>
        <div className="flex items-center">
          <button
            onClick={exportExcel}
            className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium shadow-theme-xs hover:bg-green-600 transition dark:bg-green-600 dark:hover:bg-green-500"
          >
            Export Excel
          </button>
          <button
            onClick={exportHtml}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium shadow-theme-xs hover:bg-blue-600 transition ml-2 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Export HTML
          </button>
        </div>
      </div>

      {/* Success Messages */}
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
      
      {/* Error Messages */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 mt-6 shadow-md rounded-lg p-6">
        <h1 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
          LEMBAR PENILAIAN JOURNAL READING
        </h1>
        <div className="flex flex-col gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <strong>KELOMPOK:</strong> {kelompok}
          </div>
          <div>
            <strong>TANGGAL:</strong> {tanggal}
          </div>
          <div>
            <strong>JUDUL JURNAL:</strong>{" "}
            <input
              type="text"
              value={judulJurnal}
              onChange={(e) => setJudulJurnal(e.target.value)}
              className="border rounded px-2 py-1 w-full max-w-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400"
              placeholder="Masukkan judul jurnal"
            />
          </div>
          <div>
            <strong>DOSEN:</strong> {dosen}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse">
            {/* Skeleton untuk tabel */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-4"></div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                    </th>
                    <th className="px-2 py-3 text-center">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 mx-auto"></div>
                    </th>
                    <th className="px-2 py-3 text-center">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 mx-auto"></div>
                    </th>
                    <th className="px-2 py-3 text-center">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12 mx-auto"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(5)].map((_, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-2 py-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4"></div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  NO
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  NAMA MAHASISWA
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  NIM
                </th>
                <th className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ABSENSI
                </th>
                <th className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    NILAI KEAKTIFAN
                </th>
                <th className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  NILAI LAPORAN
                </th>
                <th className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  JUMLAH
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {mahasiswa.map((m, index) => (
                  <tr key={m.nim} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap dark:text-gray-200">{m.nama}</td>
                    <td className="px-4 py-2 whitespace-nowrap dark:text-gray-200">{m.nim}</td>
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={absensi[m.nim]?.hadir || false}
                        onChange={(e) => handleAbsensiChange(m.nim, e.target.checked)}
                        className={`w-5 h-5 appearance-none rounded-md border-2 ${
                          absensi[m.nim]?.hadir 
                            ? 'border-brand-500 bg-brand-500' 
                            : 'border-brand-500 bg-transparent'
                        } transition-colors duration-150 focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600 relative`}
                        style={{ outline: 'none' }}
                      />
                      {absensi[m.nim]?.hadir && (
                        <svg
                          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                        >
                          <polyline points="5 11 9 15 15 7" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    <input
                      type="number"
                      min="0"
                      max="60"
                        value={penilaian[m.nim]?.keaktifan || ""}
                      onChange={(e) =>
                          handleInputChange(m.nim, "keaktifan", e.target.value)
                      }
                      className="w-16 text-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-1 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    <input
                      type="number"
                      min="0"
                      max="40"
                        value={penilaian[m.nim]?.laporan || ""}
                      onChange={(e) =>
                          handleInputChange(m.nim, "laporan", e.target.value)
                      }
                      className="w-16 text-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-1 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                      {hitungJumlah(m.nim)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        <div className="mt-6 text-xs text-gray-700 dark:text-gray-300">
          <p>
            Penilaian keaktifan dan penulisan laporan dilakukan oleh pembimbing,
            laporan diberikan 3 hari setelah journal reading
          </p>
          
          {/* Kriteria Keaktifan */}
          <div className="mt-4 flex gap-0">
            <div className="mr-5">
              <h4 className="font-semibold mb-2 dark:text-white">KEAKTIFAN (Total: 60)</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Aktif: 60</li>
                <li>Rata-rata: 50</li>
                <li>Kurang: 40</li>
              </ul>
            </div>

            {/* Kriteria Laporan */}
            <div className="flex-1 ml-3">
              <h4 className="font-semibold mb-2 dark:text-white">LAPORAN (Total: 40)</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Sesuai Format Laporan (lembar judul, pendahuluan, isi kesimpulan), isi laporan sesuai tema jurnal: 40</li>
                <li>Sesuai Format laporan, isi kurang mencerminkan jurnal: 30</li>
                <li>Tidak sesuai format, isi mencerminkan jurnal: 20</li>
                <li>Tidak sesuai format, isi tidak sesuai jurnal: 10</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Paraf section */}
        <div className="flex justify-end items-end gap-16 mt-12">
          <div className="flex flex-col items-start">
            <span className="text-xs mb-1 dark:text-gray-200">
              Jakarta,{" "}
              <input
                type="date"
                value={tanggalParaf}
                onChange={(e) => setTanggalParaf(e.target.value)}
                className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              />
            </span>
            <span className="text-xs mb-5 dark:text-gray-200">TUTOR</span>
            <div className="w-48 h-[100px] bg-white dark:bg-gray-900 border rounded mb-6 flex flex-col justify-center dark:border-gray-600">
              <input
                type="text"
                value={namaTutor}
                onChange={(e) => setNamaTutor(e.target.value)}
                placeholder="Masukkan nama tutor"
                className="w-full h-full px-3 py-2 text-center bg-transparent border-none outline-none dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setNamaTutor("")}
                className="text-xs px-2 py-1 border rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs mb-5 dark:text-gray-200">PARAF</span>
            {signatureParaf ? (
              <div className="relative w-48 h-[100px] bg-white dark:bg-gray-900 border rounded mb-6 flex flex-col justify-end dark:border-gray-600">
                <img
                  src={signatureParaf}
                  alt="Tanda Tangan Paraf"
                  className="w-full h-[80px] object-contain"
                />
                <div className="border-b-2 border-dotted w-full absolute bottom-2 left-0 dark:border-gray-600" />
              </div>
            ) : (
              <div className="relative w-48 h-[100px] bg-white dark:bg-gray-900 border rounded mb-6 flex flex-col justify-end dark:border-gray-600">
                <SignaturePad
                  ref={sigPadParaf}
                  penColor={document.documentElement.classList.contains('dark') ? '#000' : 'black'}
                  canvasProps={{
                    width: 192,
                    height: 100,
                    className:
                      "absolute top-0 left-0 w-full h-full bg-white dark:bg-gray-900 rounded",
                  }}
                />
                <div className="border-b-2 border-dotted w-full absolute bottom-2 left-0 dark:border-gray-600" />
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={handleClearParaf}
                className="text-xs px-2 py-1 border rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveParaf}
                className="text-xs px-2 py-1 border rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-gray-100 dark:border-gray-600"
              >
                Simpan
              </button>
              <label className="text-xs px-2 py-1 border rounded bg-green-100 hover:bg-green-200 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-100 dark:border-gray-600 cursor-pointer">
                Upload TTD
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadSignature(e)}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">.....................</span>
          </div>
        </div>

        {/* Tombol simpan */}
        <div className="mt-6 flex gap-4">
          <button 
            onClick={handleSaveAll} 
            disabled={saving || loading} 
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium shadow-theme-xs hover:bg-blue-600 transition dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Simpan Absensi & Penilaian'}
          </button>
        </div>
      </div>
    </div>
  );
}
