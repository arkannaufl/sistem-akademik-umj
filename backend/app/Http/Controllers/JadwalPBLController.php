<?php

namespace App\Http\Controllers;

use App\Models\JadwalPBL;
use App\Models\PBL;
use App\Models\KelompokKecil;
use App\Models\User;
use App\Models\Ruangan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

class JadwalPBLController extends Controller
{
    // List semua jadwal PBL untuk satu mata kuliah blok
    public function index($kode)
    {
        $jadwal = JadwalPBL::with(['modulPBL', 'kelompokKecil', 'dosen', 'ruangan'])
            ->where('mata_kuliah_kode', $kode)
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get();
        
        // Tambahkan modul_pbl_id untuk kompatibilitas dengan frontend
        $jadwal->transform(function ($item) {
            $item->modul_pbl_id = $item->pbl_id;
            return $item;
        });
        
        return response()->json($jadwal);
    }

    // Tambah jadwal PBL baru
    public function store(Request $request, $kode)
    {
        $data = $request->validate([
            'modul_pbl_id' => 'required|exists:pbls,id',
            'kelompok_kecil_id' => 'required|exists:kelompok_kecil,id',
            'dosen_id' => 'required|exists:users,id',
            'ruangan_id' => 'required|exists:ruangan,id',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'nullable|integer|min:1|max:6',
            'pbl_tipe' => 'nullable|string',
        ]);
        $data['mata_kuliah_kode'] = $kode;
        $data['pbl_id'] = $data['modul_pbl_id']; // Map modul_pbl_id ke pbl_id
        
        // Set jumlah_sesi berdasarkan pbl_tipe jika tidak disediakan
        if (!isset($data['jumlah_sesi'])) {
            $data['jumlah_sesi'] = $data['pbl_tipe'] === 'PBL 2' ? 3 : 2;
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

        $jadwal = JadwalPBL::create($data);
        
        // Load relasi dan tambahkan modul_pbl_id
        $jadwal->load(['modulPBL', 'kelompokKecil', 'dosen', 'ruangan']);
        $jadwal->modul_pbl_id = $jadwal->pbl_id;
        
        return response()->json($jadwal, Response::HTTP_CREATED);
    }

    // Update jadwal PBL
    public function update(Request $request, $kode, $id)
    {
        $jadwal = JadwalPBL::findOrFail($id);
        $data = $request->validate([
            'modul_pbl_id' => 'required|exists:pbls,id',
            'kelompok_kecil_id' => 'required|exists:kelompok_kecil,id',
            'dosen_id' => 'required|exists:users,id',
            'ruangan_id' => 'required|exists:ruangan,id',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'nullable|integer|min:1|max:6',
            'pbl_tipe' => 'nullable|string',
        ]);
        $data['mata_kuliah_kode'] = $kode;
        $data['pbl_id'] = $data['modul_pbl_id']; // Map modul_pbl_id ke pbl_id
        
        // Set jumlah_sesi berdasarkan pbl_tipe jika tidak disediakan
        if (!isset($data['jumlah_sesi'])) {
            $data['jumlah_sesi'] = $data['pbl_tipe'] === 'PBL 2' ? 3 : 2;
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
        
        // Load relasi dan tambahkan modul_pbl_id
        $jadwal->load(['modulPBL', 'kelompokKecil', 'dosen', 'ruangan']);
        $jadwal->modul_pbl_id = $jadwal->pbl_id;
        
        return response()->json($jadwal);
    }

    // Hapus jadwal PBL
    public function destroy($kode, $id)
    {
        $jadwal = JadwalPBL::findOrFail($id);

        // Cascade delete: hapus penilaian PBL yang terkait
        $kelompokKecil = \App\Models\KelompokKecil::find($jadwal->kelompok_kecil_id);
        $namaKelompok = $kelompokKecil ? $kelompokKecil->nama_kelompok : $jadwal->kelompok_kecil_id;

        // Hapus penilaian PBL berdasarkan mata_kuliah_kode, kelompok, dan pbl_tipe
        \App\Models\PenilaianPBL::where('mata_kuliah_kode', $kode)
            ->where('kelompok', $namaKelompok)
            ->where('pertemuan', $jadwal->pbl_tipe)
            ->delete();

        $jadwal->delete();
        return response()->json(['message' => 'Jadwal dan penilaian PBL terkait berhasil dihapus']);
    }

    // Get jadwal PBL untuk dosen tertentu
    public function getJadwalForDosen($dosenId)
    {
        try {
            // Check if user exists
            $user = User::find($dosenId);
            if (!$user) {
                return response()->json([
                    'message' => 'Dosen tidak ditemukan',
                    'data' => []
                ], 404);
            }

            $jadwal = JadwalPBL::with([
                'modulPBL.mataKuliah',
                'kelompokKecil',
                'dosen',
                'ruangan'
            ])
            ->where('dosen_id', $dosenId)
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get();

            \Log::info("Found {$jadwal->count()} JadwalPBL records for dosen ID: {$dosenId}");
            
            $mappedJadwal = $jadwal->map(function ($jadwal) {
                return [
                    'id' => $jadwal->id,
                    'mata_kuliah_kode' => $jadwal->modulPBL->mataKuliah->kode ?? $jadwal->mata_kuliah_kode,
                    'mata_kuliah_nama' => $jadwal->modulPBL->mataKuliah->nama ?? 'Unknown',
                    'modul_ke' => $jadwal->modulPBL->modul_ke ?? 'Unknown',
                    'nama_modul' => $jadwal->modulPBL->nama_modul ?? 'Unknown',
                    'tanggal' => $jadwal->tanggal,
                    'waktu_mulai' => $jadwal->jam_mulai,
                    'waktu_selesai' => $jadwal->jam_selesai,
                    'ruangan' => $jadwal->ruangan->nama ?? 'Unknown',
                    'status_konfirmasi' => $jadwal->status_konfirmasi ?? 'belum_konfirmasi',
                    'created_at' => $jadwal->created_at,
                ];
            });

            return response()->json([
                'message' => 'Data jadwal PBL berhasil diambil',
                'data' => $mappedJadwal,
                'count' => $mappedJadwal->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan saat mengambil data jadwal PBL',
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    // Konfirmasi jadwal PBL oleh dosen
    public function konfirmasiJadwal(Request $request, $jadwalId)
    {
        $request->validate([
            'status' => 'required|in:bisa,tidak_bisa',
            'dosen_id' => 'required|exists:users,id'
        ]);

        $jadwal = JadwalPBL::with(['modulPBL.mataKuliah', 'dosen'])
            ->where('id', $jadwalId)
            ->where('dosen_id', $request->dosen_id)
            ->firstOrFail();

        $jadwal->update([
            'status_konfirmasi' => $request->status
        ]);

        // Jika dosen tidak bisa, kirim notifikasi ke admin
        if ($request->status === 'tidak_bisa') {
            $this->sendReplacementNotification($jadwal);
        }

        return response()->json([
            'message' => 'Status konfirmasi berhasil diperbarui',
            'status' => $request->status
        ]);
    }

    // Kirim notifikasi ke admin untuk replace dosen
    private function sendReplacementNotification($jadwal)
    {
        // Ambil semua super admin
        $superAdmins = User::where('role', 'super_admin')->get();

        foreach ($superAdmins as $admin) {
            \App\Models\Notification::create([
                'user_id' => $admin->id,
                'title' => 'Dosen Tidak Bisa Mengajar',
                'message' => "Dosen {$jadwal->dosen->name} tidak bisa mengajar pada jadwal PBL {$jadwal->modulPBL->mataKuliah->nama} - Modul {$jadwal->modulPBL->modul_ke}",
                'type' => 'warning',
                'is_read' => false,
                'data' => [
                    'jadwal_id' => $jadwal->id,
                    'dosen_id' => $jadwal->dosen_id,
                    'mata_kuliah' => $jadwal->modulPBL->mataKuliah->nama,
                    'modul' => $jadwal->modulPBL->modul_ke,
                    'tanggal' => $jadwal->tanggal,
                    'waktu' => $jadwal->jam_mulai . ' - ' . $jadwal->jam_selesai
                ]
            ]);
        }
    }

    // Helper validasi bentrok antar jenis baris
    private function isBentrok($data, $ignoreId = null)
    {
        // Cek bentrok dengan jadwal PBL
        $pblBentrok = JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('pbl_id', $data['pbl_id'])
                  ->orWhere('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                       ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $pblBentrok->where('id', '!=', $ignoreId);
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
            ->where(function($q) use ($data) {
                $q->where('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        return $pblBentrok->exists() || $kuliahBesarBentrok->exists() || 
               $agendaKhususBentrok->exists() || $praktikumBentrok->exists() || 
               $jurnalBentrok->exists();
    }

    private function checkBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Cek bentrok dengan jadwal PBL
        $pblBentrok = JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('pbl_id', $data['pbl_id'])
                  ->orWhere('kelompok_kecil_id', $data['kelompok_kecil_id'])
                  ->orWhere('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                       ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $pblBentrok->where('id', '!=', $ignoreId);
        }
        
        $jadwalBentrokPBL = $pblBentrok->first();
        if ($jadwalBentrokPBL) {
            $jamMulaiFormatted = str_replace(':', '.', $jadwalBentrokPBL->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jadwalBentrokPBL->jam_selesai);
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
            ->where(function($q) use ($data) {
                $q->where('ruangan_id', $data['ruangan_id']);
            })
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
            
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
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
            
        if ($jurnalBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }

        // Cek bentrok dengan jadwal CSR
        $csrBentrok = \App\Models\JadwalCSR::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id'])
                  ->orWhere('kelompok_kecil_id', $data['kelompok_kecil_id']);
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
