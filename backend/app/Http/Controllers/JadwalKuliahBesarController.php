<?php

namespace App\Http\Controllers;

use App\Models\JadwalKuliahBesar;
use App\Models\MataKuliah;
use App\Models\User;
use App\Models\Ruangan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class JadwalKuliahBesarController extends Controller
{
    // List semua jadwal kuliah besar untuk satu mata kuliah blok
    public function index($kode)
    {
        $jadwal = JadwalKuliahBesar::with(['mataKuliah', 'dosen', 'ruangan'])
            ->where('mata_kuliah_kode', $kode)
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get();
        return response()->json($jadwal);
    }

    // Tambah jadwal kuliah besar baru
    public function store(Request $request, $kode)
    {
        $data = $request->validate([
            'materi' => 'required|string',
            'topik' => 'nullable|string',
            'dosen_id' => 'required|exists:users,id',
            'ruangan_id' => 'required|exists:ruangan,id',
            'kelompok_besar_id' => 'nullable|integer|min:1',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
        ]);
        $data['mata_kuliah_kode'] = $kode;

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

        $jadwal = JadwalKuliahBesar::create($data);
        return response()->json($jadwal, Response::HTTP_CREATED);
    }

    // Update jadwal kuliah besar
    public function update(Request $request, $kode, $id)
    {
        $jadwal = JadwalKuliahBesar::findOrFail($id);
        $data = $request->validate([
            'materi' => 'required|string',
            'topik' => 'nullable|string',
            'dosen_id' => 'required|exists:users,id',
            'ruangan_id' => 'required|exists:ruangan,id',
            'kelompok_besar_id' => 'nullable|integer|min:1',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
        ]);
        $data['mata_kuliah_kode'] = $kode;

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

    // Hapus jadwal kuliah besar
    public function destroy($kode, $id)
    {
        $jadwal = JadwalKuliahBesar::findOrFail($id);
        $jadwal->delete();
        return response()->json(['message' => 'Jadwal kuliah besar berhasil dihapus']);
    }

    // Endpoint: GET /kuliah-besar/materi?blok=...&semester=...
    public function materi(Request $request)
    {
        $blok = $request->query('blok');
        $semester = $request->query('semester');
        // Ambil dosen yang sudah dikelompokkan di blok & semester
        $dosen = User::where('role', 'dosen')
            ->whereHas('dosenPeran', function($q) use ($blok, $semester) {
                if ($blok) $q->where('blok', $blok);
                if ($semester) $q->where('semester', $semester);
            })
            ->get();
        // Gabungkan semua keahlian unik
        $keahlian = [];
        foreach ($dosen as $d) {
            $arr = is_array($d->keahlian) ? $d->keahlian : (is_string($d->keahlian) ? explode(',', $d->keahlian) : []);
            foreach ($arr as $k) {
                $k = trim($k);
                if ($k && !in_array($k, $keahlian)) $keahlian[] = $k;
            }
        }

        // Debug: Log untuk melihat data
        \Log::info('Materi query params:', [
            'blok' => $blok,
            'semester' => $semester,
            'dosen_count' => $dosen->count(),
            'keahlian_found' => $keahlian
        ]);

        return response()->json($keahlian);
    }

    // Endpoint: GET /kuliah-besar/pengampu?keahlian=...&blok=...&semester=...
    public function pengampu(Request $request)
    {
        $keahlian = $request->query('keahlian');
        $blok = $request->query('blok');
        $semester = $request->query('semester');

        if (!$keahlian || !$blok || !$semester) {
            return response()->json(['message' => 'Parameter keahlian, blok, dan semester diperlukan'], 400);
        }

        // Debug: Cek semua dosen dengan keahlian yang sesuai (tanpa filter peran dulu)
        $allDosenWithKeahlian = User::where('role', 'dosen')
            ->whereJsonContains('keahlian', $keahlian)
            ->get(['id', 'name', 'keahlian']);
        
        \Log::info('All dosen with keahlian:', [
            'keahlian' => $keahlian,
            'count' => $allDosenWithKeahlian->count(),
            'data' => $allDosenWithKeahlian->toArray()
        ]);

        // Debug: Cek semua dosen dengan peran di blok/semester (tanpa filter keahlian dulu)
        $allDosenWithPeran = User::whereHas('dosenPeran', function($q) use ($blok, $semester) {
            $q->where('blok', $blok)
              ->where('semester', $semester)
              ->whereIn('tipe_peran', ['koordinator', 'tim_blok', 'mengajar']);
        })->where('role', 'dosen')
          ->get(['id', 'name', 'keahlian']);

        \Log::info('All dosen with peran:', [
            'blok' => $blok,
            'semester' => $semester,
            'count' => $allDosenWithPeran->count(),
            'data' => $allDosenWithPeran->toArray()
        ]);

        // Debug: Cek apakah ada dosen dengan keahlian yang punya peran di blok/semester
        $dosenWithKeahlianAndPeran = User::whereHas('dosenPeran', function($q) use ($blok, $semester) {
            $q->where('blok', $blok)
              ->where('semester', $semester)
              ->whereIn('tipe_peran', ['koordinator', 'tim_blok', 'mengajar']);
        })->where('role', 'dosen')
          ->whereJsonContains('keahlian', $keahlian)
          ->get(['id', 'name', 'keahlian']);

        \Log::info('Dosen with keahlian AND peran:', [
            'keahlian' => $keahlian,
            'blok' => $blok,
            'semester' => $semester,
            'count' => $dosenWithKeahlianAndPeran->count(),
            'data' => $dosenWithKeahlianAndPeran->toArray()
        ]);

        // Ambil dosen yang memiliki keahlian yang sesuai (relax constraint - tidak harus punya peran di blok/semester)
        $dosen = User::where('role', 'dosen')
          ->where(function($q) use ($keahlian) {
            // Coba JSON contains
            $q->whereJsonContains('keahlian', $keahlian)
              // Atau coba dengan LIKE untuk string
              ->orWhere('keahlian', 'LIKE', '%' . $keahlian . '%')
              // Atau coba dengan case insensitive
              ->orWhereRaw('LOWER(JSON_EXTRACT(keahlian, "$")) LIKE ?', ['%' . strtolower($keahlian) . '%']);
          })
          ->get(['id', 'name', 'keahlian']);

        // Debug: Log untuk melihat data final
        \Log::info('Final pengampu query result:', [
            'keahlian' => $keahlian,
            'blok' => $blok,
            'semester' => $semester,
            'dosen_count' => $dosen->count(),
            'dosen_data' => $dosen->toArray()
        ]);

        return response()->json($dosen);
    }

    // Endpoint: GET /kuliah-besar/kelompok-besar?semester=...
    public function kelompokBesar(Request $request)
    {
        $semester = $request->query('semester');

        if (!$semester) {
            return response()->json(['message' => 'Parameter semester diperlukan'], 400);
        }

        // Ambil jumlah mahasiswa di semester tersebut
        $jumlahMahasiswa = \App\Models\KelompokBesar::where('semester', $semester)->count();
        
        // Jika ada mahasiswa di semester tersebut, buat satu kelompok besar
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

    // Helper validasi bentrok antar jenis baris
    private function isBentrok($data, $ignoreId = null)
    {
        // Cek bentrok dengan jadwal Kuliah Besar
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                       ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }
        
        // Cek bentrok dengan jadwal PBL
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
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
                $q->where('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        return $kuliahBesarBentrok->exists() || $pblBentrok->exists() || 
               $agendaKhususBentrok->exists() || $praktikumBentrok->exists() || 
               $jurnalBentrok->exists();
    }

    private function checkBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Cek bentrok dengan jadwal Kuliah Besar
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('dosen_id', $data['dosen_id'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                       ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }
        
        $jadwalBentrokKuliahBesar = $kuliahBesarBentrok->first();
        if ($jadwalBentrokKuliahBesar) {
            $jamMulaiFormatted = str_replace(':', '.', $jadwalBentrokKuliahBesar->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jadwalBentrokKuliahBesar->jam_selesai);
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted;
        }
        
        // Cek bentrok dengan jadwal PBL
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('dosen_id', $data['dosen_id'])
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
            
        // Cek bentrok dengan jadwal Agenda Khusus
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
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
                $q->where('dosen_id', $data['dosen_id'])
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

        // Cek bentrok dengan jadwal Non-Blok Non-CSR
        $nonBlokNonCSRBentrok = \App\Models\JadwalNonBlokNonCSR::where('tanggal', $data['tanggal'])
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
     * Validasi kapasitas ruangan berdasarkan jumlah mahasiswa di kelompok besar + dosen
     */
    private function validateRuanganCapacity($data)
    {
        // Ambil data ruangan
        $ruangan = Ruangan::find($data['ruangan_id']);
        if (!$ruangan) {
            return 'Ruangan tidak ditemukan';
        }

        // Jika tidak ada kelompok besar yang dipilih, hanya validasi kapasitas minimal untuk dosen
        if (!$data['kelompok_besar_id']) {
            if ($ruangan->kapasitas < 1) {
                return "Ruangan {$ruangan->nama} tidak memiliki kapasitas yang valid.";
            }
            return null;
        }

        // Hitung jumlah mahasiswa di kelompok besar
        // Karena kelompok_besar_id sekarang adalah semester, kita hitung berdasarkan semester
        $jumlahMahasiswa = \App\Models\KelompokBesar::where('semester', $data['kelompok_besar_id'])->count();
        
        // Tambahkan 1 untuk dosen
        $totalPeserta = $jumlahMahasiswa + 1;

        // Validasi kapasitas
        if ($totalPeserta > $ruangan->kapasitas) {
            return "Kapasitas ruangan tidak mencukupi. Ruangan {$ruangan->nama} hanya dapat menampung {$ruangan->kapasitas} orang, sedangkan diperlukan {$totalPeserta} orang ({$jumlahMahasiswa} mahasiswa + 1 dosen).";
        }

        return null; // Kapasitas mencukupi
    }

    /**
     * Dapatkan semester mata kuliah
     */
    private function getMataKuliahSemester($kode)
    {
        $mataKuliah = \App\Models\MataKuliah::where('kode', $kode)->first();
        return $mataKuliah ? $mataKuliah->semester : null;
    }
}
