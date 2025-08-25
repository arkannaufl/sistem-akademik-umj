<?php

namespace App\Http\Controllers;

use App\Models\JadwalJurnalReading;
use App\Models\KelompokKecil;
use App\Models\User;
use App\Models\Ruangan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class JadwalJurnalReadingController extends Controller
{
    // List semua jadwal Jurnal Reading untuk satu mata kuliah blok
    public function index($kode)
    {
        $jadwal = JadwalJurnalReading::with(['kelompokKecil', 'dosen', 'ruangan'])
            ->where('mata_kuliah_kode', $kode)
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get();
        return response()->json($jadwal);
    }

    // Tambah jadwal Jurnal Reading baru
    public function store(Request $request, $kode)
    {
        $data = $request->validate([
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
            'kelompok_kecil_id' => 'required|exists:kelompok_kecil,id',
            'dosen_id' => 'required|exists:users,id',
            'ruangan_id' => 'required|exists:ruangan,id',
            'topik' => 'required|string',
            'file_jurnal' => 'nullable|file|mimes:xlsx,xls,docx,doc,pdf|max:10240', // 10MB max
        ]);

        $data['mata_kuliah_kode'] = $kode;

        // Handle file upload
        if ($request->hasFile('file_jurnal')) {
            $file = $request->file('file_jurnal');
            $fileName = $file->getClientOriginalName();
            $filePath = $file->storeAs('jurnal_reading', $fileName, 'public');
            $data['file_jurnal'] = $filePath;
        }

        // Validasi kapasitas ruangan
        $kapasitasMessage = $this->validateRuanganCapacity($data);
        if ($kapasitasMessage) {
            return response()->json(['message' => $kapasitasMessage], 422);
        }

        // Validasi bentrok
        $bentrokMessage = $this->checkBentrokWithDetail($data, null);
        if ($bentrokMessage) {
            return response()->json(['message' => $bentrokMessage], 422);
        }

        $jadwal = JadwalJurnalReading::create($data);
        return response()->json($jadwal, Response::HTTP_CREATED);
    }

    // Update jadwal Jurnal Reading
    public function update(Request $request, $kode, $id)
    {
        $jadwal = JadwalJurnalReading::findOrFail($id);

        // Debug: log semua data yang diterima
        \Illuminate\Support\Facades\Log::info('Update Jurnal Reading - All request data:', $request->all());
        \Illuminate\Support\Facades\Log::info('Update Jurnal Reading - Has file:', ['has_file' => $request->hasFile('file_jurnal')]);
        \Illuminate\Support\Facades\Log::info('Update Jurnal Reading - Content type:', ['content_type' => $request->header('Content-Type')]);

        $data = $request->validate([
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
            'kelompok_kecil_id' => 'required|exists:kelompok_kecil,id',
            'dosen_id' => 'required|exists:users,id',
            'ruangan_id' => 'required|exists:ruangan,id',
            'topik' => 'required|string',
            'file_jurnal' => 'nullable|file|mimes:xlsx,xls,docx,doc,pdf|max:10240',
        ]);

        $data['mata_kuliah_kode'] = $kode;

        // Handle file upload
        if ($request->hasFile('file_jurnal')) {
            // Hapus file lama jika ada
            if ($jadwal->file_jurnal) {
                Storage::disk('public')->delete($jadwal->file_jurnal);
            }

            $file = $request->file('file_jurnal');
            $fileName = $file->getClientOriginalName();
            $filePath = $file->storeAs('jurnal_reading', $fileName, 'public');
            $data['file_jurnal'] = $filePath;
        }

        // Validasi kapasitas ruangan
        $kapasitasMessage = $this->validateRuanganCapacity($data);
        if ($kapasitasMessage) {
            return response()->json(['message' => $kapasitasMessage], 422);
        }

        // Validasi bentrok (kecuali dirinya sendiri)
        $bentrokMessage = $this->checkBentrokWithDetail($data, $id);
        if ($bentrokMessage) {
            return response()->json(['message' => $bentrokMessage], 422);
        }

        $jadwal->update($data);
        return response()->json($jadwal);
    }

    // Hapus jadwal Jurnal Reading
    public function destroy($kode, $id)
    {
        $jadwal = JadwalJurnalReading::findOrFail($id);

        // Hapus file jika ada
        if ($jadwal->file_jurnal) {
            Storage::disk('public')->delete($jadwal->file_jurnal);
        }

        $jadwal->delete();
        return response()->json(['message' => 'Jadwal Jurnal Reading berhasil dihapus']);
    }

    // Download file jurnal
    public function downloadFile($kode, $id)
    {
        $jadwal = JadwalJurnalReading::findOrFail($id);

        if (!$jadwal->file_jurnal || !Storage::disk('public')->exists($jadwal->file_jurnal)) {
            return response()->json(['message' => 'File tidak ditemukan'], 404);
        }

        $path = Storage::disk('public')->path($jadwal->file_jurnal);
        $fileName = basename($jadwal->file_jurnal);

        return response()->download($path, $fileName);
    }

    // Helper validasi bentrok antar jenis baris
    private function isBentrok($data, $ignoreId = null)
    {
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $jurnalBentrok->where('id', '!=', $ignoreId);
        }
        
        // Cek bentrok dengan jadwal PBL
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            });

        // Cek bentrok dengan jadwal Kuliah Besar
        $kuliahBesarBentrok = \App\Models\JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        // Cek bentrok dengan jadwal Agenda Khusus
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        // Cek bentrok dengan jadwal Praktikum
        $praktikumBentrok = \App\Models\JadwalPraktikum::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            });

        return $jurnalBentrok->exists() || $pblBentrok->exists() || 
               $kuliahBesarBentrok->exists() || $agendaKhususBentrok->exists() || 
               $praktikumBentrok->exists();
    }

    private function checkBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $jurnalBentrok->where('id', '!=', $ignoreId);
        }
        
        $jadwalBentrokJurnal = $jurnalBentrok->first();
        if ($jadwalBentrokJurnal) {
            $jamMulaiFormatted = str_replace(':', '.', $jadwalBentrokJurnal->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jadwalBentrokJurnal->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }
        
        // Cek bentrok dengan jadwal PBL
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($pblBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $pblBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $pblBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal PBL pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }

        // Cek bentrok dengan jadwal Kuliah Besar
        $kuliahBesarBentrok = \App\Models\JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();
            
        if ($kuliahBesarBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $kuliahBesarBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $kuliahBesarBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }
            
        // Cek bentrok dengan jadwal Agenda Khusus (hanya yang menggunakan ruangan)
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('use_ruangan', true)
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();
            
        if ($agendaKhususBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }
            
        // Cek bentrok dengan jadwal Praktikum
        $praktikumBentrok = \App\Models\JadwalPraktikum::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($praktikumBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $praktikumBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $praktikumBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Praktikum pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }

        // Cek bentrok dengan jadwal CSR
        $csrBentrok = \App\Models\JadwalCSR::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($csrBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $csrBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $csrBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal CSR pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }

        // Cek bentrok dengan jadwal Non-Blok Non-CSR (hanya yang menggunakan ruangan)
        $nonBlokNonCSRBentrok = \App\Models\JadwalNonBlokNonCSR::where('tanggal', $data['tanggal'])
            ->where('use_ruangan', true)
            ->where(function($q) use ($data) {
                $q->where('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                  ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($nonBlokNonCSRBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $nonBlokNonCSRBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $nonBlokNonCSRBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Non-Blok Non-CSR pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }

        return null; // Tidak ada bentrok
    }

    /**
     * Validasi kapasitas ruangan berdasarkan jumlah mahasiswa
     */
    private function validateRuanganCapacity($data)
    {
        // Ambil data ruangan
        $ruangan = Ruangan::find($data['ruangan_id']);
        if (!$ruangan) {
            return 'Ruangan tidak ditemukan';
        }

        // Ambil data kelompok kecil
        $kelompokKecil = KelompokKecil::find($data['kelompok_kecil_id']);
        if (!$kelompokKecil) {
            return 'Kelompok kecil tidak ditemukan';
        }

        // Hitung jumlah mahasiswa dalam kelompok
        $jumlahMahasiswa = KelompokKecil::where('nama_kelompok', $kelompokKecil->nama_kelompok)
                                       ->where('semester', $kelompokKecil->semester)
                                       ->count();

        // Hitung total (mahasiswa + 1 dosen)
        $totalMahasiswa = $jumlahMahasiswa + 1;

        // Cek apakah kapasitas ruangan mencukupi
        if ($totalMahasiswa > $ruangan->kapasitas) {
            return "Kapasitas ruangan tidak mencukupi. Ruangan {$ruangan->nama} hanya dapat menampung {$ruangan->kapasitas} orang, sedangkan diperlukan {$totalMahasiswa} orang (kelompok {$jumlahMahasiswa} mahasiswa + 1 dosen).";
        }

        return null; // Kapasitas mencukupi
    }
}
