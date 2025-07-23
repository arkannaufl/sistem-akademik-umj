import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import mahasiswa from '../data/mahasiswa';
import { ChevronLeftIcon } from "../icons";
import SignaturePad from "react-signature-canvas";
import React, { useRef } from "react";
import * as XLSX from "xlsx";

interface PenilaianJurnal {
  [npm: string]: {
    diskusi: number;
    laporan: number;
  };
}

function mahasiswaPerKelompok() {
  const kelompokMap: Record<string, typeof mahasiswa> = {};
  mahasiswa.forEach(m => {
    if (!kelompokMap[m.kelompok]) kelompokMap[m.kelompok] = [];
    kelompokMap[m.kelompok].push(m);
  });
  return kelompokMap;
}

export default function PenilaianJurnalPage() {
  const { kode_blok, kelompok, pertemuan, rowIndex } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [judulJurnal, setJudulJurnal] = useState("");
  const [mahasiswa, setMahasiswa] = useState<{ npm: string; nama: string }[]>(
    []
  );
  const [penilaian, setPenilaian] = useState<PenilaianJurnal>({});
  const [dosen, setDosen] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [tanggalParaf, setTanggalParaf] = useState("");
  const [signatureTutor, setSignatureTutor] = useState<string | null>(null);
  const [signatureParaf, setSignatureParaf] = useState<string | null>(null);
  const sigPadTutor = useRef<any>(null);
  const sigPadParaf = useRef<any>(null);

  // Ambil data dosen & tanggal dari state (prioritas utama)
  useEffect(() => {
    if (location.state && location.state.dosen) setDosen(location.state.dosen);
    if (location.state && location.state.tanggal)
      setTanggal(location.state.tanggal);
    // fallback: localStorage hanya jika state tidak ada
    if (
      (!dosen || !tanggal) &&
      kode_blok &&
      kelompok &&
      pertemuan &&
      rowIndex
    ) {
      const saved = localStorage.getItem(
        `jurnalInfo_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`
      );
      if (saved) {
        const info = JSON.parse(saved);
        if (!dosen && info.dosen) setDosen(info.dosen);
        if (!tanggal && info.tanggal) setTanggal(info.tanggal);
        if (info.judulJurnal) setJudulJurnal(info.judulJurnal);
      }
    }
  }, [location.state, kode_blok, kelompok, pertemuan, rowIndex]);

  useEffect(() => {
    if (kelompok && mahasiswaPerKelompok()[kelompok]) {
      setMahasiswa(mahasiswaPerKelompok()[kelompok].map(m => ({ npm: m.nim, nama: m.nama })));
    } else {
      // Data dummy jika kelompok tidak ditemukan
      setMahasiswa(
        Array.from({ length: 10 }).map((_, i) => ({
          nama: `Mahasiswa ${i + 1}`,
          npm: `123456789${i}`,
        }))
      );
    }
    // Load penilaian dari localStorage
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      const saved = localStorage.getItem(
        `penilaian_jurnal_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`
      );
      if (saved) setPenilaian(JSON.parse(saved));
    }
  }, [kode_blok, kelompok, pertemuan, rowIndex]);

  useEffect(() => {
    // Simpan ke localStorage setiap kali berubah
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      localStorage.setItem(
        `penilaian_jurnal_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
        JSON.stringify(penilaian)
      );
      localStorage.setItem(
        `jurnalInfo_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
        JSON.stringify({ dosen, tanggal, judulJurnal })
      );
    }
  }, [
    penilaian,
    dosen,
    tanggal,
    judulJurnal,
    kode_blok,
    kelompok,
    pertemuan,
    rowIndex,
  ]);

  useEffect(() => {
    // Load tanggal paraf dari localStorage
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      const saved = localStorage.getItem(
        `penilaian_jurnal_tanggal_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`
      );
      if (saved) setTanggalParaf(saved);
    }
  }, [kode_blok, kelompok, pertemuan, rowIndex]);

  useEffect(() => {
    // Simpan tanggal paraf ke localStorage
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      localStorage.setItem(
        `penilaian_jurnal_tanggal_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
        tanggalParaf
      );
    }
  }, [tanggalParaf, kode_blok, kelompok, pertemuan, rowIndex]);

  useEffect(() => {
    // Load signature dari localStorage setiap kali halaman dimuat
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      const t = localStorage.getItem(
        `penilaian_jurnal_signature_tutor_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`
      );
      const p = localStorage.getItem(
        `penilaian_jurnal_signature_paraf_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`
      );
      if (t) setSignatureTutor(t);
      if (p) setSignatureParaf(p);
    }
  }, [kode_blok, kelompok, pertemuan, rowIndex]);

  useEffect(() => {
    // Simpan signature ke localStorage setiap kali berubah
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      if (signatureTutor) {
        localStorage.setItem(
          `penilaian_jurnal_signature_tutor_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
          signatureTutor
        );
      }
      if (signatureParaf) {
        localStorage.setItem(
          `penilaian_jurnal_signature_paraf_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
          signatureParaf
        );
      }
    }
  }, [
    signatureTutor,
    signatureParaf,
    kode_blok,
    kelompok,
    pertemuan,
    rowIndex,
  ]);

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
        if (kode_blok && kelompok && pertemuan && rowIndex) {
          localStorage.setItem(
            `penilaian_jurnal_signature_tutor_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
            base64
          );
        }
      } else {
        setSignatureParaf(base64);
        if (kode_blok && kelompok && pertemuan && rowIndex) {
          localStorage.setItem(
            `penilaian_jurnal_signature_paraf_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
            base64
          );
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearTutor = () => {
    sigPadTutor.current?.clear();
    setSignatureTutor(null);
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      localStorage.removeItem(
        `penilaian_jurnal_signature_tutor_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`
      );
    }
  };
  const handleSaveTutor = () => {
    if (sigPadTutor.current && !sigPadTutor.current.isEmpty()) {
      const data = sigPadTutor.current.getCanvas().toDataURL("image/png");
      setSignatureTutor(data);
      if (kode_blok && kelompok && pertemuan && rowIndex) {
        localStorage.setItem(
          `penilaian_jurnal_signature_tutor_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
          data
        );
      }
    }
  };
  const handleClearParaf = () => {
    sigPadParaf.current?.clear();
    setSignatureParaf(null);
    if (kode_blok && kelompok && pertemuan && rowIndex) {
      localStorage.removeItem(
        `penilaian_jurnal_signature_paraf_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`
      );
    }
  };
  const handleSaveParaf = () => {
    if (sigPadParaf.current && !sigPadParaf.current.isEmpty()) {
      const data = sigPadParaf.current.getCanvas().toDataURL("image/png");
      setSignatureParaf(data);
      if (kode_blok && kelompok && pertemuan && rowIndex) {
        localStorage.setItem(
          `penilaian_jurnal_signature_paraf_${kode_blok}_${kelompok}_${pertemuan}_${rowIndex}`,
          data
        );
      }
    }
  };

  const handleInputChange = (
    npm: string,
    field: "diskusi" | "laporan",
    value: string
  ) => {
    const max = field === "diskusi" ? 60 : 40;
    const score = parseInt(value, 10);
    if (isNaN(score) || score < 0 || score > max) return;
    setPenilaian((prev) => ({
      ...prev,
      [npm]: {
        ...prev[npm],
        [field]: score,
      },
    }));
  };

  const hitungJumlah = (npm: string) => {
    const nilai = penilaian[npm];
    if (!nilai) return "";
    return (nilai.diskusi || 0) + (nilai.laporan || 0);
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
        "NILAI DISKUSI",
        "NILAI LAPORAN",
        "JUMLAH",
      ],
    ];
    const tableBody = mahasiswa.map((m, idx) => {
      const nilai = penilaian[m.npm] || {};
      return [
        idx + 1,
        m.nama,
        m.npm,
        nilai.diskusi ?? "",
        nilai.laporan ?? "",
        hitungJumlah(m.npm),
      ];
    });
    // Paraf section
    const parafRows = [
      [],
      [
        `Jakarta, ${tanggalParaf || "...................."}`,
        "",
        "",
        "",
        "TUTOR",
        "",
        "PARAF",
      ],
      [
        "(Tanda tangan)",
        "",
        "",
        "",
        "(Tanda tangan)",
        "",
        "",
      ],
    ];
    const wsData = [
      ...infoRows,
      ...tableHeader,
      ...tableBody,
      ...parafRows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: wsData.length - 2, c: 0 }, e: { r: wsData.length - 2, c: 3 } },
      { s: { r: wsData.length - 2, c: 4 }, e: { r: wsData.length - 2, c: 6 } },
      { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 3 } },
      { s: { r: wsData.length - 1, c: 4 }, e: { r: wsData.length - 1, c: 6 } },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penilaian Jurnal");
    XLSX.writeFile(wb, `Penilaian_Jurnal_${kelompok || ""}.xlsx`);
  };

  // Fungsi export HTML
  const exportHtml = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const style = `
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: ${isDark ? "#181F2A" : "#fff"}; color: ${isDark ? "#F1F5F9" : "#222"}; }
        .header-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .header-col { font-size: 14px; line-height: 1.5; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 16px; color: ${isDark ? "#fff" : "#222"}; }
        table.penilaian { border-collapse: collapse; width: 100%; margin-bottom: 24px; background: ${isDark ? "#232B3B" : "#fff"}; }
        table.penilaian th, table.penilaian td { border: 1px solid ${isDark ? "#334155" : "#222"}; padding: 6px 8px; font-size: 13px; }
        table.penilaian th { background: ${isDark ? "#232B3B" : "#f5f5f5"}; font-weight: bold; text-align: center; color: ${isDark ? "#fff" : "#222"}; }
        table.penilaian td { text-align: center; color: ${isDark ? "#F1F5F9" : "#222"}; background: ${isDark ? "#181F2A" : "#fff"}; }
        .info-section { display: flex; gap: 48px; margin-top: 24px; }
        .info-col { font-size: 12px; color: ${isDark ? "#F1F5F9" : "#222"}; }
        .info-col h3 { font-size: 13px; font-weight: bold; margin-bottom: 6px; color: ${isDark ? "#fff" : "#222"}; }
        .paraf-section { display: flex; justify-content: flex-end; margin-top: 48px; gap: 64px; }
        .paraf-col { font-size: 12px; text-align: center; color: ${isDark ? "#F1F5F9" : "#222"}; }
        .ttd-img { width: 180px; height: 60px; object-fit: contain; border: 1px solid ${isDark ? "#334155" : "#ccc"}; background: ${isDark ? "#232B3B" : "#fff"}; margin-bottom: 4px; }
        .paraf-label { margin-bottom: 32px; display: block; color: ${isDark ? "#fff" : "#222"}; }
        .paraf-date { text-align: left; margin-bottom: 8px; color: ${isDark ? "#F1F5F9" : "#222"}; }
      </style>
    `;
    const htmlHeader = `
      <div class="header-row">
        <div class="header-col">
          <div><b>KELOMPOK:</b> ${kelompok || ""}</div>
          <div><b>TANGGAL:</b> ${tanggal || ""}</div>
          <div><b>JUDUL JURNAL:</b> ${judulJurnal || ""}</div>
        </div>
        <div class="header-col" style="text-align:right;">
          <div><b>DOSEN:</b> ${dosen || ""}</div>
        </div>
      </div>
    `;
    const htmlTableHeader = `
      <tr>
        <th>NO</th>
        <th>NAMA MAHASISWA</th>
        <th>NIM</th>
        <th>NILAI DISKUSI</th>
        <th>NILAI LAPORAN</th>
        <th>JUMLAH</th>
      </tr>
    `;
    const htmlTableBody = mahasiswa
      .map((m, idx) => {
        const nilai = penilaian[m.npm] || {};
        return `<tr>
        <td>${idx + 1}</td>
        <td style="text-align:left;">${m.nama}</td>
        <td>${m.npm}</td>
        <td>${nilai.diskusi ?? ""}</td>
        <td>${nilai.laporan ?? ""}</td>
        <td>${hitungJumlah(m.npm)}</td>
      </tr>`;
      })
      .join("");
    const htmlParaf = `
      <div class="paraf-section">
        <div class="paraf-col">
          <div class="paraf-date">Jakarta, ${tanggalParaf || "...................."}</div>
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
    const html = `
      <html><head><meta charset="UTF-8">${style}</head><body>
        <div class="title">LEMBAR PENILAIAN JOURNAL READING</div>
        ${htmlHeader}
        <table class="penilaian">
          ${htmlTableHeader}
          ${htmlTableBody}
        </table>
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
    <div className="container mx-auto  dark:bg-gray-900 min-h-screen">
      <div className=" pb-2 flex justify-between items-center">
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
      <div className="bg-white mt-6 dark:bg-gray-800 shadow-md rounded-lg p-6">
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
                  NILAI DISKUSI
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
                <tr key={m.npm} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap dark:text-gray-200">{m.nama}</td>
                  <td className="px-4 py-2 whitespace-nowrap dark:text-gray-200">{m.npm}</td>
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={penilaian[m.npm]?.diskusi || ""}
                      onChange={(e) =>
                        handleInputChange(m.npm, "diskusi", e.target.value)
                      }
                      className="w-16 text-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-1 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={penilaian[m.npm]?.laporan || ""}
                      onChange={(e) =>
                        handleInputChange(m.npm, "laporan", e.target.value)
                      }
                      className="w-16 text-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-1 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap dark:text-gray-200">
                    {hitungJumlah(m.npm)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-xs text-gray-700 dark:text-gray-300">
          <p>
            Penilaian keaktifan dan penulisan laporan dilakukan oleh pembimbing,
            laporan diberikan 3 hari setelah journal reading
          </p>
          <p className="mt-2">
            Keaktifan : total nilai adalah 60 &nbsp; &nbsp; Laporan : total
            nilai adalah 40
          </p>
          <ul className="list-disc list-inside mt-2">
            <li>
              Aktif : 60 &nbsp; Sesuai Format Laporan (lembar judul,
              pendahuluan, isi kesimpulan), isi laporan sesuai tema jurnal : 40
            </li>
            <li>
              Rata-rata : 50 &nbsp; Sesuai Format laporan, isi kurang
              mencerminkan jurnal : 30
            </li>
            <li>
              Kurang : 40 &nbsp; Tidak sesuai format, isi mencerminkan jurnal :
              20
            </li>
            <li>Tidak sesuai format, isi tidak sesuai jurnal : 10</li>
          </ul>
        </div>
        {/* Paraf section */}
        <div className="flex justify-end items-end gap-16 mt-12">
          <div className="flex flex-col items-start">
            <span className="text-xs mb-5 dark:text-gray-200">
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
