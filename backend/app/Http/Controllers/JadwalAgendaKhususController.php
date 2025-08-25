<?php

namespace App\Http\Controllers;

use App\Models\JadwalAgendaKhusus;
use App\Models\MataKuliah;
use App\Models\Ruangan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class JadwalAgendaKhususController extends Controller
{
    // List semua jadwal agenda khusus untuk satu mata kuliah blok
    public function index($kode)
    {
        $jadwal = JadwalAgendaKhusus::with(['mataKuliah', 'ruangan'])
            ->where('mata_kuliah_kode', $kode)
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get();
        return response()->json($jadwal);
    }

    // Tambah jadwal agenda khusus baru
    public function store(Request $request, $kode)
    {
        $data = $request->validate([
            'agenda' => 'required|string',
            'ruangan_id' => 'nullable|exists:ruangan,id',
            'kelompok_besar_id' => 'nullable|integer|min:1',
            'use_ruangan' => 'required|boolean',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
        ]);
        $data['mata_kuliah_kode'] = $kode;

        // Validasi kapasitas ruangan hanya jika menggunakan ruangan
        if ($data['use_ruangan'] && $data['ruangan_id']) {
            $kapasitasMessage = $this->validateRuanganCapacity($data);
            if ($kapasitasMessage) {
                return response()->json(['message' => $kapasitasMessage], 422);
            }
        }

        // Validasi bentrok
        $bentrokMessage = $this->checkBentrokWithDetail($data, null);
        if ($bentrokMessage) {
            return response()->json(['message' => $bentrokMessage], 422);
        }

        $jadwal = JadwalAgendaKhusus::create($data);
        return response()->json($jadwal, Response::HTTP_CREATED);
    }

    // Update jadwal agenda khusus
    public function update(Request $request, $kode, $id)
    {
        $jadwal = JadwalAgendaKhusus::findOrFail($id);
        $data = $request->validate([
            'agenda' => 'required|string',
            'ruangan_id' => 'nullable|exists:ruangan,id',
            'kelompok_besar_id' => 'nullable|integer|min:1',
            'use_ruangan' => 'required|boolean',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
        ]);
        $data['mata_kuliah_kode'] = $kode;

        // Validasi kapasitas ruangan hanya jika menggunakan ruangan
        if ($data['use_ruangan'] && $data['ruangan_id']) {
            $kapasitasMessage = $this->validateRuanganCapacity($data);
            if ($kapasitasMessage) {
                return response()->json(['message' => $kapasitasMessage], 422);
            }
        }

        // Validasi bentrok (kecuali dirinya sendiri)
        $bentrokMessage = $this->checkBentrokWithDetail($data, $id);
        if ($bentrokMessage) {
            return response()->json(['message' => $bentrokMessage], 422);
        }

        $jadwal->update($data);
        return response()->json($jadwal);
    }

    // Hapus jadwal agenda khusus
    public function destroy($kode, $id)
    {
        $jadwal = JadwalAgendaKhusus::findOrFail($id);
        $jadwal->delete();
        return response()->json(['message' => 'Jadwal agenda khusus berhasil dihapus']);
    }

    // Cek bentrok antar jenis baris
    private function isBentrok($data, $ignoreId = null)
    {
        // Cek bentrok dengan jadwal Agenda Khusus
        $agendaKhususBentrok = JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                        ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $agendaKhususBentrok->where('id', '!=', $ignoreId);
        }

        // Cek bentrok dengan jadwal PBL
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        // Cek bentrok dengan jadwal Kuliah Besar
        $kuliahBesarBentrok = \App\Models\JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        // Cek bentrok dengan jadwal Praktikum
        $praktikumBentrok = \App\Models\JadwalPraktikum::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        return $agendaKhususBentrok->exists() || $pblBentrok->exists() || 
               $kuliahBesarBentrok->exists() || $praktikumBentrok->exists() || 
               $jurnalBentrok->exists();
    }

    private function checkBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Cek bentrok dengan jadwal Agenda Khusus
        $agendaKhususBentrok = JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                        ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $agendaKhususBentrok->where('id', '!=', $ignoreId);
        }

        $jadwalBentrokAgendaKhusus = $agendaKhususBentrok->first();
        if ($jadwalBentrokAgendaKhusus) {
            $jamMulaiFormatted = str_replace(':', '.', $jadwalBentrokAgendaKhusus->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jadwalBentrokAgendaKhusus->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }

        // Cek bentrok dengan jadwal PBL
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
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
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
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
            
        // Cek bentrok dengan jadwal Praktikum
        $praktikumBentrok = \App\Models\JadwalPraktikum::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
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
            
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();
            
        if ($jurnalBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }

        // Cek bentrok dengan jadwal CSR
        $csrBentrok = \App\Models\JadwalCSR::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
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

        // Cek bentrok dengan jadwal Non-Blok Non-CSR
        $nonBlokNonCSRBentrok = \App\Models\JadwalNonBlokNonCSR::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
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

        // Jika ada kelompok besar yang dipilih, validasi kapasitas berdasarkan jumlah mahasiswa
        if (isset($data['kelompok_besar_id']) && $data['kelompok_besar_id']) {
            // Hitung jumlah mahasiswa di kelompok besar
            $jumlahMahasiswa = \App\Models\KelompokBesar::where('semester', $data['kelompok_besar_id'])->count();
            
            // Untuk agenda khusus, tidak ada dosen yang perlu ditambahkan
            $totalPeserta = $jumlahMahasiswa;
            
            if ($totalPeserta > $ruangan->kapasitas) {
                return "Kapasitas ruangan {$ruangan->nama} ({$ruangan->kapasitas} orang) tidak mencukupi untuk {$totalPeserta} mahasiswa.";
            }
        } else {
            // Untuk Agenda Khusus tanpa kelompok besar, tidak perlu validasi kapasitas ketat
            // karena bisa jadi acara khusus dengan jumlah peserta yang bervariasi
            // Hanya pastikan ruangan memiliki kapasitas minimal 1 orang
            if ($ruangan->kapasitas < 1) {
                return "Ruangan {$ruangan->nama} tidak memiliki kapasitas yang valid.";
            }
        }

        return null; // Kapasitas mencukupi
    }

    /**
     * Get kelompok besar options for agenda khusus
     */
    public function kelompokBesar(Request $request)
    {
        $semester = $request->query('semester');
        if (!$semester) {
            return response()->json(['message' => 'Parameter semester diperlukan'], 400);
        }
        
        $jumlahMahasiswa = \App\Models\KelompokBesar::where('semester', $semester)->count();
        if ($jumlahMahasiswa > 0) {
            return response()->json([
                [
                    'id' => $semester, // Gunakan semester sebagai ID
                    'label' => "Kelompok Besar Semester {$semester} ({$jumlahMahasiswa} mahasiswa)",
                    'jumlah_mahasiswa' => $jumlahMahasiswa
                ]
            ]);
        }
        return response()->json([]);
    }
}
