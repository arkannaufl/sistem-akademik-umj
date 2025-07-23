import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import mahasiswa from '../data/mahasiswa';
import { ChevronLeftIcon } from "../icons";
import api from "../api/axios";
import SignaturePad from "react-signature-canvas";
import React, { useRef } from "react";
import * as XLSX from "xlsx";

interface Penilaian {
  [npm: string]: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
    G: number;
    petaKonsep: number;
  };
}

const KRITERIA = {
  A: "Salam dan berdoa",
  B: "Partisipasi aktif dan tanggung jawab dalam proses PBL",
  C: "Informasi ilmiah (originalitas, validitas, keterkinian informasi)",
  D: "Keterampilan komunikasi (dalam mensosialisasikan pendapat)",
  E: "Kemampuan analisis (menyangkut materi yg didiskusikan)",
  F: "Keterbukaan dalam diskusi (dalam menerima pendapat & kritikan)",
  G: "Etika (berbicara, berdiskusi, berpakaian, dll.)",
};

function mahasiswaPerKelompok() {
  const kelompokMap: Record<string, typeof mahasiswa> = {};
  mahasiswa.forEach(m => {
    if (!kelompokMap[m.kelompok]) kelompokMap[m.kelompok] = [];
    kelompokMap[m.kelompok].push(m);
  });
  return kelompokMap;
}

export default function PenilaianPBLPage() {
  const { kode_blok, kelompok, pertemuan } = useParams();
  const navigate = useNavigate();

  const [mahasiswa, setMahasiswa] = useState<{ npm: string; nama: string }[]>(
    []
  );
  const [penilaian, setPenilaian] = useState<Penilaian>({});
  const [namaBlok, setNamaBlok] = useState("");
  const [kodeBlok, setKodeBlok] = useState("");
  const [loadingBlok, setLoadingBlok] = useState(true);
  const [tanggalParaf, setTanggalParaf] = useState("");
  const [signatureTutor, setSignatureTutor] = useState<string | null>(null);
  const [signatureParaf, setSignatureParaf] = useState<string | null>(null);
  const sigPadTutor = useRef<any>(null);
  const sigPadParaf = useRef<any>(null);

  // Load data mahasiswa dan penilaian dari localStorage
  useEffect(() => {
    if (kelompok && mahasiswaPerKelompok()[kelompok]) {
      setMahasiswa(mahasiswaPerKelompok()[kelompok].map(m => ({ npm: m.nim, nama: m.nama })));
    }

    // Ambil nama blok dari localStorage atau dari data yang ada
    const savedData = localStorage.getItem(`jadwalMateri_${kode_blok}`);
    if (savedData) {
      // Anda mungkin perlu cara yang lebih baik untuk mendapatkan nama blok
      // Untuk sekarang, kita bisa coba ambil dari data yang ada di halaman sebelumnya
      // atau simpan nama blok saat navigasi
    }
    setNamaBlok(`Blok ${kode_blok}`); // Fallback

    const savedPenilaian = localStorage.getItem(
      `penilaian_${kode_blok}_${kelompok}_${pertemuan}`
    );
    if (savedPenilaian) {
      setPenilaian(JSON.parse(savedPenilaian));
    } else {
      // Inisialisasi state penilaian jika tidak ada
      const initialPenilaian: Penilaian = {};
      if (kelompok && mahasiswaPerKelompok()[kelompok]) {
        mahasiswaPerKelompok()[kelompok].map(m => ({ npm: m.nim, nama: m.nama })).forEach(
          (m) => {
            initialPenilaian[m.npm] = {
              A: 0,
              B: 0,
              C: 0,
              D: 0,
              E: 0,
              F: 0,
              G: 0,
              petaKonsep: 0,
            };
          }
        );
      }
      setPenilaian(initialPenilaian);
    }
  }, [kode_blok, kelompok, pertemuan]);

  useEffect(() => {
    if (!kode_blok) return;
    setLoadingBlok(true);
    api
      .get(`/mata-kuliah/${kode_blok}`)
      .then((res) => {
        setNamaBlok(res.data.nama || "");
        setKodeBlok(res.data.kode || kode_blok);
      })
      .catch(() => {
        setNamaBlok("");
        setKodeBlok(kode_blok || "");
      })
      .finally(() => setLoadingBlok(false));
  }, [kode_blok]);

  // Simpan penilaian ke localStorage setiap kali berubah
  useEffect(() => {
    if (Object.keys(penilaian).length > 0) {
      localStorage.setItem(
        `penilaian_${kode_blok}_${kelompok}_${pertemuan}`,
        JSON.stringify(penilaian)
      );
    }
  }, [penilaian, kode_blok, kelompok, pertemuan]);

  useEffect(() => {
    // Load tanggal paraf dari localStorage
    if (kodeBlok && kelompok && pertemuan) {
      const saved = localStorage.getItem(
        `penilaian_pbl_tanggal_${kodeBlok}_${kelompok}_${pertemuan}`
      );
      if (saved) setTanggalParaf(saved);
    }
  }, [kodeBlok, kelompok, pertemuan]);

  useEffect(() => {
    // Simpan tanggal paraf ke localStorage
    if (kodeBlok && kelompok && pertemuan) {
      localStorage.setItem(
        `penilaian_pbl_tanggal_${kodeBlok}_${kelompok}_${pertemuan}`,
        tanggalParaf
      );
    }
  }, [tanggalParaf, kodeBlok, kelompok, pertemuan]);

  useEffect(() => {
    // Load signature dari localStorage setiap kali halaman dimuat
    if (kodeBlok && kelompok && pertemuan) {
      const t = localStorage.getItem(
        `penilaian_pbl_signature_tutor_${kodeBlok}_${kelompok}_${pertemuan}`
      );
      const p = localStorage.getItem(
        `penilaian_pbl_signature_paraf_${kodeBlok}_${kelompok}_${pertemuan}`
      );
      if (t) setSignatureTutor(t);
      if (p) setSignatureParaf(p);
    }
  }, [kodeBlok, kelompok, pertemuan]);

  useEffect(() => {
    // Simpan signature ke localStorage setiap kali berubah
    if (kodeBlok && kelompok && pertemuan) {
      if (signatureTutor) {
        localStorage.setItem(
          `penilaian_pbl_signature_tutor_${kodeBlok}_${kelompok}_${pertemuan}`,
          signatureTutor
        );
      }
      if (signatureParaf) {
        localStorage.setItem(
          `penilaian_pbl_signature_paraf_${kodeBlok}_${kelompok}_${pertemuan}`,
          signatureParaf
        );
      }
    }
  }, [signatureTutor, signatureParaf, kodeBlok, kelompok, pertemuan]);

  const handleInputChange = (
    npm: string,
    kriteria: keyof Penilaian[string],
    value: string
  ) => {
    const score = parseInt(value, 10);
    if (
      isNaN(score) ||
      score < 0 ||
      score > (kriteria === "petaKonsep" ? 100 : 5)
    )
      return;

    setPenilaian((prev) => ({
      ...prev,
      [npm]: {
        ...prev[npm],
        [kriteria]: score,
      },
    }));
  };

  const hitungJumlah = (npm: string) => {
    const nilai = penilaian[npm];
    if (!nilai) return 0;
    return nilai.A + nilai.B + nilai.C + nilai.D + nilai.E + nilai.F + nilai.G;
  };

  const handleClearTutor = () => {
    sigPadTutor.current?.clear();
    setSignatureTutor(null);
    if (kodeBlok && kelompok && pertemuan) {
      localStorage.removeItem(
        `penilaian_pbl_signature_tutor_${kodeBlok}_${kelompok}_${pertemuan}`
      );
    }
  };
  const handleSaveTutor = () => {
    if (sigPadTutor.current && !sigPadTutor.current.isEmpty()) {
      const data = sigPadTutor.current.getCanvas().toDataURL("image/png");
      setSignatureTutor(data);
      if (kodeBlok && kelompok && pertemuan) {
        localStorage.setItem(
          `penilaian_pbl_signature_tutor_${kodeBlok}_${kelompok}_${pertemuan}`,
          data
        );
      }
    }
  };
  const handleClearParaf = () => {
    sigPadParaf.current?.clear();
    setSignatureParaf(null);
    if (kodeBlok && kelompok && pertemuan) {
      localStorage.removeItem(
        `penilaian_pbl_signature_paraf_${kodeBlok}_${kelompok}_${pertemuan}`
      );
    }
  };
  const handleSaveParaf = () => {
    if (sigPadParaf.current && !sigPadParaf.current.isEmpty()) {
      const data = sigPadParaf.current.getCanvas().toDataURL("image/png");
      setSignatureParaf(data);
      if (kodeBlok && kelompok && pertemuan) {
        localStorage.setItem(
          `penilaian_pbl_signature_paraf_${kodeBlok}_${kelompok}_${pertemuan}`,
          data
        );
      }
    }
  };

  // Fungsi untuk handle upload file gambar tanda tangan
  const handleUploadSignature = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "tutor" | "paraf"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      const base64 = event.target?.result as string;
      if (type === "tutor") {
        setSignatureTutor(base64);
        if (kodeBlok && kelompok && pertemuan) {
          localStorage.setItem(
            `penilaian_pbl_signature_tutor_${kodeBlok}_${kelompok}_${pertemuan}`,
            base64
          );
        }
      } else {
        setSignatureParaf(base64);
        if (kodeBlok && kelompok && pertemuan) {
          localStorage.setItem(
            `penilaian_pbl_signature_paraf_${kodeBlok}_${kelompok}_${pertemuan}`,
            base64
          );
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Fungsi export Excel
  const exportExcel = () => {
    // Header info (KODE BLOK, NAMA BLOK, MODUL di kiri; KELOMPOK, PERTEMUAN KE di kolom I)
    const infoRows = [
      [
        `KODE BLOK: ${kodeBlok || ""}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `KELOMPOK: ${kelompok || ""}`,
        "",
      ],
      [
        `NAMA BLOK: ${namaBlok || ""}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `PERTEMUAN KE: ${pertemuan || ""}`,
        "",
      ],
      [`MODUL: MATA KUNING (Contoh)`, "", "", ""],
      [],
    ];
    // Table header
    const tableHeader = [
      [
        "NO",
        "NPM",
        "NAMA",
        ...Object.keys(KRITERIA),
        "Jumlah",
        ...(pertemuan === "2" ? ["Peta Konsep (0-100)"] : []),
      ],
    ];
    // Hitung jumlah kolom tabel utama
    const tableColCount = tableHeader[0].length;
    // Table body
    const tableBody = mahasiswa.map((m, idx) => {
      const nilai = penilaian[m.npm] || {};
      const row = [
        idx + 1,
        m.npm,
        m.nama,
        ...Object.keys(KRITERIA).map((k) => (nilai as Record<string, number>)[k] ?? ""),
        hitungJumlah(m.npm),
      ];
      if (pertemuan === "2") row.push(nilai.petaKonsep ?? "");
      return row;
    });
    // Keterangan dan Skoring
    const keteranganRows = [
      [],
      ["KETERANGAN:"],
      ...Object.entries(KRITERIA).map(([k, v]) => [`${k}: ${v}`]),
      [],
      ["SKORING:"],
      ["1 = SANGAT KURANG"],
      ["2 = KURANG"],
      ["3 = CUKUP"],
      ["4 = BAIK"],
      ["5 = SANGAT BAIK"],
      [],
    ];
    // Paraf section
    const parafRows = [
      [],
      [`Jakarta, ${tanggalParaf || "...................."}`],
      [
        "TUTOR",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "PARAF",
      ],
      [
        "(Tanda tangan)",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "(Tanda tangan)",
      ],
    ];
    // Gabungkan semua
    const wsData = [
      ...infoRows,
      ...tableHeader,
      ...tableBody,
      ...keteranganRows,
      ...parafRows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Merge cell untuk header kiri-kanan (A1:D1, H1:H2, dst)
    ws["!merges"] = [
      // KODE BLOK kiri (A1:D1), KELOMPOK kanan (I1:J1)
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 0, c: 8 }, e: { r: 0, c: 9 } },
      // NAMA BLOK kiri (A2:D2), PERTEMUAN KE kanan (I2:J2)
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 1, c: 8 }, e: { r: 1, c: 9 } },
      // MODUL kiri (A3:D3)
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
      // Paraf section merge (biarkan seperti sebelumnya, dinamis)
      {
        s: { r: wsData.length - 3, c: 0 },
        e: { r: wsData.length - 3, c: tableColCount - 1 },
      },
      {
        s: { r: wsData.length - 2, c: 0 },
        e: { r: wsData.length - 2, c: Math.floor((tableColCount - 1) / 2) },
      },
      {
        s: { r: wsData.length - 2, c: Math.ceil((tableColCount - 1) / 2) },
        e: { r: wsData.length - 2, c: tableColCount - 1 },
      },
      {
        s: { r: wsData.length - 1, c: 0 },
        e: { r: wsData.length - 1, c: Math.floor((tableColCount - 1) / 2) },
      },
      {
        s: { r: wsData.length - 1, c: Math.ceil((tableColCount - 1) / 2) },
        e: { r: wsData.length - 1, c: tableColCount - 1 },
      },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penilaian PBL");
    XLSX.writeFile(
      wb,
      `Penilaian_PBL_${kodeBlok || ""}_${kelompok || ""}.xlsx`
    );
  };

  // Fungsi export HTML
  const exportHtml = () => {
    // Detect dark mode from document
    const isDark = document.documentElement.classList.contains("dark");
    // Inline CSS for print-like layout, with dark mode support
    const style = `
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: ${
          isDark ? "#181F2A" : "#fff"
        }; color: ${isDark ? "#F1F5F9" : "#222"}; }
        .header-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .header-col { font-size: 14px; line-height: 1.5; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 16px; color: ${
          isDark ? "#fff" : "#222"
        }; }
        table.penilaian { border-collapse: collapse; width: 100%; margin-bottom: 24px; background: ${
          isDark ? "#232B3B" : "#fff"
        }; }
        table.penilaian th, table.penilaian td { border: 1px solid ${
          isDark ? "#334155" : "#222"
        }; padding: 6px 8px; font-size: 13px; }
        table.penilaian th { background: ${
          isDark ? "#232B3B" : "#f5f5f5"
        }; font-weight: bold; text-align: center; color: ${
      isDark ? "#fff" : "#222"
    }; }
        table.penilaian td { text-align: center; color: ${
          isDark ? "#F1F5F9" : "#222"
        }; background: ${isDark ? "#181F2A" : "#fff"}; }
        .info-section { display: flex; gap: 48px; margin-top: 24px; }
        .info-col { font-size: 12px; color: ${isDark ? "#F1F5F9" : "#222"}; }
        .info-col h3 { font-size: 13px; font-weight: bold; margin-bottom: 6px; color: ${
          isDark ? "#fff" : "#222"
        }; }
        .paraf-section { display: flex; justify-content: flex-end; margin-top: 48px; gap: 64px; }
        .paraf-col { font-size: 12px; text-align: center; color: ${
          isDark ? "#F1F5F9" : "#222"
        }; }
        .ttd-img { width: 180px; height: 60px; object-fit: contain; border: 1px solid ${
          isDark ? "#334155" : "#ccc"
        }; background: ${isDark ? "#232B3B" : "#fff"}; margin-bottom: 4px; }
        .paraf-label { margin-bottom: 32px; display: block; color: ${
          isDark ? "#fff" : "#222"
        }; }
        .paraf-date { text-align: left; margin-bottom: 8px; color: ${
          isDark ? "#F1F5F9" : "#222"
        }; }
      </style>
    `;
    // Header (left & right)
    const htmlHeader = `
      <div class="header-row">
        <div class="header-col">
          <div><b>KODE BLOK:</b> ${kodeBlok || ""}</div>
          <div><b>NAMA BLOK:</b> ${namaBlok || ""}</div>
          <div><b>MODUL:</b> MATA KUNING (Contoh)</div>
        </div>
        <div class="header-col" style="text-align:right;">
          <div><b>KELOMPOK:</b> ${kelompok || ""}</div>
          <div><b>PERTEMUAN KE:</b> ${pertemuan || ""}</div>
        </div>
      </div>
    `;
    // Table header
    const htmlTableHeader = `
      <tr>
        <th>NO</th>
        <th>NPM</th>
        <th>NAMA</th>
        ${Object.keys(KRITERIA)
          .map((k) => `<th>${k}</th>`)
          .join("")}
        <th>JUMLAH</th>
        ${pertemuan === "2" ? "<th>Peta Konsep (0-100)</th>" : ""}
      </tr>
    `;
    // Table body
    const htmlTableBody = mahasiswa
      .map((m, idx) => {
        const nilai = penilaian[m.npm] || {};
        return `<tr>
        <td>${idx + 1}</td>
        <td>${m.npm}</td>
        <td style="text-align:left;">${m.nama}</td>
        ${Object.keys(KRITERIA)
          .map((k) => `<td>${(nilai as Record<string, number>)[k] ?? ""}</td>`)
          .join("")}
        <td>${hitungJumlah(m.npm)}</td>
        ${pertemuan === "2" ? `<td>${(nilai as Record<string, number>)?.petaKonsep ?? ""}</td>` : ""}
      </tr>`;
      })
      .join("");
    // Keterangan & Skoring (2 columns)
    const htmlKeterangan = `
      <div class="info-section">
        <div class="info-col">
          <h3>KETERANGAN</h3>
          <ul style="margin:0; padding-left:18px;">
            ${Object.entries(KRITERIA)
              .map(([k, v]) => `<li><b>${k}:</b> ${v}</li>`)
              .join("")}
          </ul>
        </div>
        <div class="info-col">
          <h3>SKORING</h3>
          <div>1 = SANGAT KURANG</div>
          <div>2 = KURANG</div>
          <div>3 = CUKUP</div>
          <div>4 = BAIK</div>
          <div>5 = SANGAT BAIK</div>
        </div>
      </div>
    `;
    // Paraf section (bottom right)
    const htmlParaf = `
      <div class="paraf-section">
        <div class="paraf-col">
          <div class="paraf-date">Jakarta, ${
            tanggalParaf || "...................."
          }</div>
          <span class="paraf-label">TUTOR</span>
          ${
            signatureTutor
              ? `<img src='${signatureTutor}' class='ttd-img' alt='TTD Tutor' />`
              : `<div class='ttd-img'></div>`
          }
        </div>
        <div class="paraf-col">
          <span class="paraf-label">PARAF</span>
          ${
            signatureParaf
              ? `<img src='${signatureParaf}' class='ttd-img' alt='TTD Paraf' />`
              : `<div class='ttd-img'></div>`
          }
        </div>
      </div>
    `;
    // Gabungkan semua
    const html = `
      <html><head><meta charset="UTF-8">${style}</head><body>
        <div class="title">LEMBAR PENILAIAN MAHASISWA OLEH TUTOR</div>
        ${htmlHeader}
        <table class="penilaian">
          ${htmlTableHeader}
          ${htmlTableBody}
        </table>
        ${htmlKeterangan}
        ${htmlParaf}
      </body></html>
    `;
    // Download file
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Penilaian_PBL_${kodeBlok || ""}_${kelompok || ""}.html`;
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

      <div className="bg-white dark:bg-gray-800 mt-6 shadow-md rounded-lg p-6">
        <h1 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
          LEMBAR PENILAIAN MAHASISWA OLEH TUTOR
        </h1>
        <div className="flex justify-between items-center mb-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p>
              <strong>KODE BLOK:</strong> {kodeBlok}
            </p>
            <p>
              <strong>NAMA BLOK:</strong>{" "}
              {loadingBlok ? (
                <span className="italic text-gray-400 dark:text-gray-500">Loading...</span>
              ) : (
                namaBlok
              )}
            </p>
            <p>
              <strong>MODUL:</strong> MATA KUNING (Contoh)
            </p>
          </div>
          <div>
            <p>
              <strong>KELOMPOK:</strong> {kelompok}
            </p>
            <p>
              <strong>PERTEMUAN KE:</strong> {pertemuan}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  NO
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  NPM
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  NAMA
                </th>
                {Object.keys(KRITERIA).map((key) => (
                  <th
                    key={key}
                    className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    title={KRITERIA[key as keyof typeof KRITERIA]}
                  >
                    {key}
                  </th>
                ))}
                <th className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Jumlah
                </th>
                {pertemuan === "2" && (
                  <th className="px-2 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Peta Konsep (0-100)
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {mahasiswa.map((m, index) => (
                <tr key={m.npm} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-2 py-2 whitespace-nowrap dark:text-gray-200">{index + 1}</td>
                  <td className="px-4 py-2 whitespace-nowrap dark:text-gray-200">{m.npm}</td>
                  <td className="px-4 py-2 whitespace-nowrap dark:text-gray-200">{m.nama}</td>
                  {Object.keys(KRITERIA).map((key) => (
                    <td
                      key={key}
                      className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200"
                    >
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={
                          penilaian[m.npm]?.[key as keyof typeof KRITERIA] || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            m.npm,
                            key as keyof typeof KRITERIA,
                            e.target.value
                          )
                        }
                        className="w-12 text-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-1 dark:text-gray-100 dark:placeholder-gray-400"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    {hitungJumlah(m.npm)}
                  </td>
                  {pertemuan === "2" && (
                    <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={penilaian[m.npm]?.petaKonsep || ""}
                        onChange={(e) =>
                          handleInputChange(m.npm, "petaKonsep", e.target.value)
                        }
                        className="w-20 text-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-1 dark:text-gray-100 dark:placeholder-gray-400"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-row gap-16 mt-6">
          <div className="text-xs dark:text-gray-200">
            <h3 className="font-bold mb-2">KETERANGAN</h3>
            <ul className="list-disc list-inside">
              {Object.entries(KRITERIA).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {value}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs dark:text-gray-200">
            <h3 className="font-bold mb-2">SKORING</h3>
            <p>1 = SANGAT KURANG</p>
            <p>2 = KURANG</p>
            <p>3 = CUKUP</p>
            <p>4 = BAIK</p>
            <p>5 = SANGAT BAIK</p>
          </div>
        </div>
        {/* Paraf section below Skoring, horizontal row, both on the right */}
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
            {signatureTutor ? (
              <div className="relative w-48 h-[100px] bg-white dark:bg-gray-900 border rounded mb-6 flex flex-col justify-end dark:border-gray-600">
                <img
                  src={signatureTutor}
                  alt="Tanda Tangan Tutor"
                  className="w-full h-[80px] object-contain"
                />
                <div className="border-b-2 border-dotted w-full absolute bottom-2 left-0 dark:border-gray-600" />
              </div>
            ) : (
              <div className="relative w-48 h-[100px] bg-white dark:bg-gray-900 border rounded mb-6 flex flex-col justify-end dark:border-gray-600">
                <SignaturePad
                  ref={sigPadTutor}
                  penColor={document.documentElement.classList.contains('dark') ? '#fff' : 'black'}
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
                onClick={handleClearTutor}
                className="text-xs px-2 py-1 border rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveTutor}
                className="text-xs px-2 py-1 border rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-gray-100 dark:border-gray-600"
              >
                Simpan
              </button>
              <label className="text-xs px-2 py-1 border rounded bg-green-100 hover:bg-green-200 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-100 dark:border-gray-600 cursor-pointer">
                Upload TTD
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadSignature(e, "tutor")}
                  className="hidden"
                />
              </label>
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
                  penColor={document.documentElement.classList.contains('dark') ? '#fff' : 'black'}
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
                  onChange={(e) => handleUploadSignature(e, "paraf")}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
