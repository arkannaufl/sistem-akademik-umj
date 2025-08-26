<?php

namespace App\Http\Controllers;

use App\Models\JadwalPraktikum;
use App\Models\MataKuliah;
use App\Models\Ruangan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class JadwalPraktikumController extends Controller
{
    // List semua jadwal praktikum untuk satu mata kuliah blok
    public function index($kode)
    {
        $jadwal = JadwalPraktikum::with(['mataKuliah', 'ruangan', 'dosen'])
            ->where('mata_kuliah_kode', $kode)
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get();
        return response()->json($jadwal);
    }

    // Tambah jadwal praktikum baru
    public function store(Request $request, $kode)
    {
        $data = $request->validate([
            'materi' => 'required|string',
            'topik' => 'nullable|string',
            'kelas_praktikum' => 'required|string',
            'ruangan_id' => 'required|exists:ruangan,id',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
            'dosen_ids' => 'required|array|min:1',
            'dosen_ids.*' => 'exists:users,id',
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

        $jadwal = JadwalPraktikum::create($data);

        // Attach dosen
        $jadwal->dosen()->attach($data['dosen_ids']);

        // Load relasi untuk response
        $jadwal->load(['mataKuliah', 'ruangan', 'dosen']);

        return response()->json($jadwal, Response::HTTP_CREATED);
    }

    // Update jadwal praktikum
    public function update(Request $request, $kode, $id)
    {
        $jadwal = JadwalPraktikum::findOrFail($id);
        $data = $request->validate([
            'materi' => 'required|string',
            'topik' => 'nullable|string',
            'kelas_praktikum' => 'required|string',
            'ruangan_id' => 'required|exists:ruangan,id',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
            'dosen_ids' => 'required|array|min:1',
            'dosen_ids.*' => 'exists:users,id',
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

        // Sync dosen (replace semua dosen yang ada)
        $jadwal->dosen()->sync($data['dosen_ids']);

        // Load relasi untuk response
        $jadwal->load(['mataKuliah', 'ruangan', 'dosen']);

        return response()->json($jadwal);
    }

    // Hapus jadwal praktikum
    public function destroy($kode, $id)
    {
        $jadwal = JadwalPraktikum::findOrFail($id);
        $jadwal->delete();
        return response()->json(['message' => 'Jadwal praktikum berhasil dihapus']);
    }

    // Get kelas praktikum berdasarkan semester
    public function getKelasPraktikum($semester)
    {
        try {
            // Ambil kelas dari semester yang sesuai
            $kelas = \App\Models\Kelas::where('semester', $semester)->get();
            return response()->json($kelas);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data kelas'], 500);
        }
    }

    // Get materi (keahlian) untuk praktikum
    public function getMateri($blok, $semester)
    {
        try {
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

            return response()->json($keahlian);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data materi'], 500);
        }
    }

    // Get pengampu berdasarkan keahlian
    public function getPengampu($keahlian, $blok, $semester)
    {
        try {
            $dosen = User::where('role', 'dosen')
                ->whereHas('dosenPeran', function($q) use ($blok, $semester) {
                    if ($blok) $q->where('blok', $blok);
                    if ($semester) $q->where('semester', $semester);
                })
                ->get();

            $filtered = $dosen->filter(function($d) use ($keahlian) {
                $arr = is_array($d->keahlian) ? $d->keahlian : (is_string($d->keahlian) ? explode(',', $d->keahlian) : []);
                return in_array($keahlian, array_map('trim', $arr));
            })->values();

            return response()->json($filtered);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data pengampu'], 500);
        }
    }

    // Cek bentrok antar jenis baris
    private function isBentrok($data, $ignoreId = null)
    {
        // Cek bentrok dengan jadwal Praktikum
        $praktikumBentrok = JadwalPraktikum::where('tanggal', $data['tanggal'])
            ->where(function ($q) use ($data) {
                $q->where('kelas_praktikum', $data['kelas_praktikum'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                        ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $praktikumBentrok->where('id', '!=', $ignoreId);
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
            
        // Cek bentrok dengan jadwal Agenda Khusus
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
            
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });

        // Cek bentrok dengan kelompok besar (jika ada kelompok_besar_id di jadwal lain)
        $kelompokBesarBentrok = $this->checkKelompokBesarBentrok($data, $ignoreId);
            
        return $praktikumBentrok->exists() || $pblBentrok->exists() || 
               $kuliahBesarBentrok->exists() || $agendaKhususBentrok->exists() || 
               $jurnalBentrok->exists() || $kelompokBesarBentrok;
    }

    private function checkBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Cek bentrok dengan jadwal Praktikum
        $praktikumBentrok = JadwalPraktikum::where('tanggal', $data['tanggal'])
            ->where(function ($q) use ($data) {
                $q->where('kelas_praktikum', $data['kelas_praktikum'])
                  ->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                        ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        if ($ignoreId) {
            $praktikumBentrok->where('id', '!=', $ignoreId);
        }

        $jadwalBentrokPraktikum = $praktikumBentrok->first();
        if ($jadwalBentrokPraktikum) {
            $jamMulaiFormatted = str_replace(':', '.', $jadwalBentrokPraktikum->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jadwalBentrokPraktikum->jam_selesai);
            $bentrokReason = $this->getBentrokReason($data, $jadwalBentrokPraktikum);
            return "Jadwal bentrok dengan Jadwal Praktikum pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
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
            $bentrokReason = $this->getBentrokReason($data, $pblBentrok);
            return "Jadwal bentrok dengan Jadwal PBL pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
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
            $bentrokReason = $this->getBentrokReason($data, $kuliahBesarBentrok);
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }
        
        // Cek bentrok dengan jadwal Agenda Khusus
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('ruangan_id', $data['ruangan_id'])
            ->where(function ($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();
            
        if ($agendaKhususBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_selesai);
            $bentrokReason = $this->getBentrokReason($data, $agendaKhususBentrok);
            return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
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
            $bentrokReason = $this->getBentrokReason($data, $jurnalBentrok);
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        return null; // Tidak ada bentrok
    }

    /**
     * Mendapatkan alasan bentrok yang detail
     */
    private function getBentrokReason($data, $jadwalBentrok): string
    {
        $reasons = [];
        
        // Cek bentrok ruangan
        if (isset($data['ruangan_id']) && isset($jadwalBentrok->ruangan_id) && $data['ruangan_id'] == $jadwalBentrok->ruangan_id) {
            $ruangan = \App\Models\Ruangan::find($data['ruangan_id']);
            $reasons[] = "Ruangan: " . ($ruangan ? $ruangan->nama : 'Tidak diketahui');
        }
        
        // Cek bentrok kelas praktikum
        if (isset($data['kelas_praktikum']) && isset($jadwalBentrok->kelas_praktikum) && $data['kelas_praktikum'] == $jadwalBentrok->kelas_praktikum) {
            $reasons[] = "Kelas Praktikum: " . $data['kelas_praktikum'];
        }
        
        return implode(', ', $reasons);
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

        // Untuk praktikum, hitung mahasiswa berdasarkan semester kelas praktikum
        $semester = $this->getMataKuliahSemester($data['mata_kuliah_kode']);
        
        // Ambil semester dari kelas praktikum
        $kelasPraktikum = \App\Models\Kelas::where('nama_kelas', $data['kelas_praktikum'])->first();
        $semesterKelas = $kelasPraktikum ? $kelasPraktikum->semester : $semester;
        
        // Hitung mahasiswa yang HANYA ada di kelas praktikum ini
        $jumlahMahasiswa = 0;
        if ($kelasPraktikum) {
            // Ambil kelompok yang ada di kelas ini
            $kelompokIds = DB::table('kelas_kelompok')
                ->where('kelas_id', $kelasPraktikum->id)
                ->pluck('nama_kelompok')
                ->toArray();
            
            // Hitung mahasiswa yang ada di kelompok tersebut
            $jumlahMahasiswa = \App\Models\KelompokKecil::where('semester', $semesterKelas)
                ->whereIn('nama_kelompok', $kelompokIds)
                ->count();
        } else {
            // Fallback: hitung semua mahasiswa di semester jika kelas tidak ditemukan
            $jumlahMahasiswa = \App\Models\KelompokKecil::where('semester', $semesterKelas)->count();
        }

        // Hitung jumlah dosen yang dipilih
        $jumlahDosen = count($data['dosen_ids']);

        // Total yang diperlukan
        $totalYangDiperlukan = $jumlahMahasiswa + $jumlahDosen;

        // Debug: Log untuk troubleshooting
        \Log::info('Praktikum Capacity Check:', [
            'kelas_praktikum' => $data['kelas_praktikum'],
            'semester' => $semester,
            'jumlah_mahasiswa' => $jumlahMahasiswa,
            'jumlah_dosen' => $jumlahDosen,
            'total_yang_diperlukan' => $totalYangDiperlukan,
            'kapasitas_ruangan' => $ruangan->kapasitas,
            'is_over_capacity' => $totalYangDiperlukan > $ruangan->kapasitas
        ]);

        // Cek apakah kapasitas ruangan mencukupi
        if ($totalYangDiperlukan > $ruangan->kapasitas) {
            return "Kapasitas ruangan tidak mencukupi. Ruangan {$ruangan->nama} hanya dapat menampung {$ruangan->kapasitas} orang, sedangkan diperlukan {$totalYangDiperlukan} orang (kelas {$data['kelas_praktikum']}: {$jumlahMahasiswa} mahasiswa + {$jumlahDosen} dosen).";
        }

        return null; // Kapasitas mencukupi
    }

    /**
     * Cek bentrok dengan kelompok besar
     */
    private function checkKelompokBesarBentrok($data, $ignoreId = null): bool
    {
        // Praktikum tidak menggunakan kelompok besar, jadi tidak ada bentrok
        return false;
    }

    /**
     * Dapatkan semester mata kuliah
     */
    private function getMataKuliahSemester($kode)
    {
        $mataKuliah = \App\Models\MataKuliah::where('kode', $kode)->first();
        return $mataKuliah ? $mataKuliah->semester : null;
    }

    /**
     * Dapatkan informasi debug untuk validasi
     */
    private function getDebugInfo($data)
    {
        $ruangan = Ruangan::find($data['ruangan_id']);
        $semester = $this->getMataKuliahSemester($data['mata_kuliah_kode']);
        
        // Hitung jumlah mahasiswa berdasarkan kelas praktikum
        $jumlahMahasiswa = \App\Models\KelompokKecil::where('nama_kelompok', $data['kelas_praktikum'])
                                                    ->where('semester', $semester)
                                                    ->count();

        // Hitung jumlah dosen yang dipilih
        $jumlahDosen = count($data['dosen_ids']);

        // Total yang diperlukan
        $totalYangDiperlukan = $jumlahMahasiswa + $jumlahDosen;

        return [
            'kelas_praktikum' => $data['kelas_praktikum'],
            'mata_kuliah_kode' => $data['mata_kuliah_kode'],
            'semester' => $semester,
            'ruangan_nama' => $ruangan ? $ruangan->nama : 'Tidak ditemukan',
            'kapasitas_ruangan' => $ruangan ? $ruangan->kapasitas : 0,
            'jumlah_mahasiswa' => $jumlahMahasiswa,
            'jumlah_dosen' => $jumlahDosen,
            'total_yang_diperlukan' => $totalYangDiperlukan,
            'is_over_capacity' => $totalYangDiperlukan > ($ruangan ? $ruangan->kapasitas : 0)
        ];
    }
}
