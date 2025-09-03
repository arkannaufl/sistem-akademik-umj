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
        $jadwal = JadwalKuliahBesar::with(['mataKuliah', 'dosen', 'ruangan', 'kelompokBesarAntara'])
            ->where('mata_kuliah_kode', $kode)
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get();
        return response()->json($jadwal);
    }

    // Tambah jadwal kuliah besar baru
    public function store(Request $request, $kode)
    {
        // Cek apakah mata kuliah adalah semester antara
        $mataKuliah = MataKuliah::where('kode', $kode)->first();
        $isSemesterAntara = $mataKuliah && $mataKuliah->semester === "Antara";

        $validationRules = [
            'topik' => 'nullable|string',
            'ruangan_id' => 'required|exists:ruangan,id',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
        ];

        if ($isSemesterAntara) {
            // Untuk semester antara: tidak ada materi, multiple dosen, kelompok besar antara
            $validationRules['dosen_ids'] = 'required|array|min:1';
            $validationRules['dosen_ids.*'] = 'exists:users,id';
            $validationRules['kelompok_besar_antara_id'] = 'nullable|exists:kelompok_besar_antara,id';
        } else {
            // Untuk semester biasa: ada materi, single dosen, kelompok besar biasa
            $validationRules['materi'] = 'required|string';
            $validationRules['dosen_id'] = 'required|exists:users,id';
            $validationRules['kelompok_besar_id'] = 'nullable|integer|min:1';
        }

        $data = $request->validate($validationRules);
        $data['mata_kuliah_kode'] = $kode;

        // Untuk semester antara, set materi dan dosen_id ke null
        if ($isSemesterAntara) {
            $data['materi'] = null;
            $data['dosen_id'] = null;
        }

        // Validasi kapasitas ruangan
        $kapasitasMessage = $this->validateRuanganCapacity($data, $isSemesterAntara);
        if ($kapasitasMessage) {
            return response()->json(['message' => $kapasitasMessage], 422);
        }

        // Validasi bentrok
        $bentrokMessage = $this->checkBentrokWithDetail($data, null, $isSemesterAntara);
        if ($bentrokMessage) {
            return response()->json(['message' => $bentrokMessage], 422);
        }

        $jadwal = JadwalKuliahBesar::create($data);
        // Reload data dengan relasi
        $jadwal->load(['mataKuliah', 'dosen', 'ruangan', 'kelompokBesarAntara']);
        return response()->json($jadwal, Response::HTTP_CREATED);
    }

    // Update jadwal kuliah besar
    public function update(Request $request, $kode, $id)
    {
        $jadwal = JadwalKuliahBesar::findOrFail($id);
        
        // Cek apakah mata kuliah adalah semester antara
        $mataKuliah = MataKuliah::where('kode', $kode)->first();
        $isSemesterAntara = $mataKuliah && $mataKuliah->semester === "Antara";

        $validationRules = [
            'topik' => 'nullable|string',
            'ruangan_id' => 'required|exists:ruangan,id',
            'tanggal' => 'required|date',
            'jam_mulai' => 'required|string',
            'jam_selesai' => 'required|string',
            'jumlah_sesi' => 'required|integer|min:1|max:6',
        ];

        if ($isSemesterAntara) {
            // Untuk semester antara: tidak ada materi, multiple dosen, kelompok besar antara
            $validationRules['dosen_ids'] = 'required|array|min:1';
            $validationRules['dosen_ids.*'] = 'exists:users,id';
            $validationRules['kelompok_besar_antara_id'] = 'nullable|exists:kelompok_besar_antara,id';
        } else {
            // Untuk semester biasa: ada materi, single dosen, kelompok besar biasa
            $validationRules['materi'] = 'required|string';
            $validationRules['dosen_id'] = 'required|exists:users,id';
            $validationRules['kelompok_besar_id'] = 'nullable|integer|min:1';
        }

        $data = $request->validate($validationRules);
        $data['mata_kuliah_kode'] = $kode;

        // Untuk semester antara, set materi dan dosen_id ke null
        if ($isSemesterAntara) {
            $data['materi'] = null;
            $data['dosen_id'] = null;
        }

        // Validasi kapasitas ruangan
        $kapasitasMessage = $this->validateRuanganCapacity($data, $isSemesterAntara);
        if ($kapasitasMessage) {
            return response()->json(['message' => $kapasitasMessage], 422);
        }

        // Validasi bentrok (kecuali dirinya sendiri)
        $bentrokMessage = $this->checkBentrokWithDetail($data, $id, $isSemesterAntara);
        if ($bentrokMessage) {
            return response()->json(['message' => $bentrokMessage], 422);
        }

        $jadwal->update($data);
        // Reload data dengan relasi
        $jadwal->load(['mataKuliah', 'dosen', 'ruangan', 'kelompokBesarAntara']);
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

        // Jika semester adalah "Antara", return kelompok besar antara
        if ($semester === "Antara") {
            return response()->json([]); // Akan dihandle di frontend
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

    // Endpoint: GET /kuliah-besar/all-dosen
    public function allDosen()
    {
        $dosen = User::where('role', 'dosen')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();
        
        return response()->json($dosen);
    }

    // Endpoint: GET /kuliah-besar/kelompok-besar-antara (global for Antara semester)
    public function kelompokBesarAntara()
    {
        $kelompokBesar = \App\Models\KelompokBesarAntara::all()
            ->map(function($kelompok) {
                $mahasiswa = \App\Models\User::whereIn('id', $kelompok->mahasiswa_ids ?? [])->get();
                return [
                    'id' => $kelompok->id,
                    'label' => $kelompok->nama_kelompok . ' (' . $mahasiswa->count() . ' mahasiswa)',
                    'jumlah_mahasiswa' => $mahasiswa->count(),
                    'mahasiswa' => $mahasiswa
                ];
            });
        
        return response()->json($kelompokBesar);
    }

    // Helper validasi bentrok antar jenis baris
    private function isBentrok($data, $ignoreId = null, $isSemesterAntara = false)
    {
        // Cek bentrok dengan jadwal Kuliah Besar
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data, $isSemesterAntara) {
                if ($isSemesterAntara && isset($data['dosen_ids'])) {
                    // Untuk semester antara, cek multiple dosen
                    $q->where(function($subQ) use ($data) {
                        foreach ($data['dosen_ids'] as $dosenId) {
                            $subQ->orWhere('dosen_id', $dosenId);
                        }
                    });
                } else {
                    // Untuk semester biasa, cek single dosen
                    $q->where('dosen_id', $data['dosen_id']);
                }
                $q->orWhere('ruangan_id', $data['ruangan_id']);
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
            ->where(function($q) use ($data, $isSemesterAntara) {
                if ($isSemesterAntara && isset($data['dosen_ids'])) {
                    // Untuk semester antara, cek multiple dosen
                    $q->where(function($subQ) use ($data) {
                        foreach ($data['dosen_ids'] as $dosenId) {
                            $subQ->orWhere('dosen_id', $dosenId);
                        }
                    });
                } else {
                    // Untuk semester biasa, cek single dosen
                    $q->where('dosen_id', $data['dosen_id']);
                }
                $q->orWhere('ruangan_id', $data['ruangan_id']);
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
            ->where(function($q) use ($data, $isSemesterAntara) {
                if ($isSemesterAntara && isset($data['dosen_ids'])) {
                    // Untuk semester antara, cek multiple dosen
                    $q->where(function($subQ) use ($data) {
                        foreach ($data['dosen_ids'] as $dosenId) {
                            $subQ->orWhere('dosen_id', $dosenId);
                        }
                    });
                } else {
                    // Untuk semester biasa, cek single dosen
                    $q->where('dosen_id', $data['dosen_id']);
                }
                $q->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });

            // Cek bentrok dengan kelompok besar (jika ada kelompok_besar_id atau kelompok_besar_antara_id)
        $kelompokBesarBentrok = false;
        if (isset($data['kelompok_besar_id']) && $data['kelompok_besar_id']) {
            $kelompokBesarBentrok = $this->checkKelompokBesarBentrok($data, $ignoreId);
        }

        // Cek bentrok dengan kelompok besar antara (jika ada kelompok_besar_antara_id)
        $kelompokBesarAntaraBentrok = false;
        if (isset($data['kelompok_besar_antara_id']) && $data['kelompok_besar_antara_id']) {
            $kelompokBesarAntaraBentrok = $this->checkKelompokBesarAntaraBentrok($data, $ignoreId);
        }

        // Cek bentrok antar Kelompok Besar (Kelompok Besar vs Kelompok Besar)
        $kelompokBesarVsKelompokBesarBentrok = false;
        if (isset($data['kelompok_besar_id']) && $data['kelompok_besar_id']) {
            $kelompokBesarVsKelompokBesarBentrok = $this->checkKelompokBesarVsKelompokBesarBentrok($data, $ignoreId);
        }

        // Cek bentrok antar Kelompok Besar Antara (Kelompok Besar Antara vs Kelompok Besar Antara)
        $kelompokBesarAntaraVsKelompokBesarAntaraBentrok = false;
        if (isset($data['kelompok_besar_antara_id']) && $data['kelompok_besar_antara_id']) {
            $kelompokBesarAntaraVsKelompokBesarAntaraBentrok = $this->checkKelompokBesarAntaraVsKelompokBesarAntaraBentrok($data, $ignoreId);
        }

        // Cek bentrok antar Kelompok Besar vs Kelompok Besar Antara
        $kelompokBesarVsKelompokBesarAntaraBentrok = false;
        if (isset($data['kelompok_besar_id']) && $data['kelompok_besar_id']) {
            $kelompokBesarVsKelompokBesarAntaraBentrok = $this->checkKelompokBesarVsKelompokBesarAntaraBentrok($data, $ignoreId);
        }

        $kelompokBesarAntaraVsKelompokBesarBentrok = false;
        if (isset($data['kelompok_besar_antara_id']) && $data['kelompok_besar_antara_id']) {
            $kelompokBesarAntaraVsKelompokBesarBentrok = $this->checkKelompokBesarAntaraVsKelompokBesarBentrok($data, $ignoreId);
        }
            
        return $kuliahBesarBentrok->exists() || $pblBentrok->exists() || 
               $agendaKhususBentrok->exists() || $praktikumBentrok->exists() || 
               $jurnalBentrok->exists() || $kelompokBesarBentrok || $kelompokBesarAntaraBentrok || 
               $kelompokBesarVsKelompokBesarBentrok || $kelompokBesarAntaraVsKelompokBesarAntaraBentrok || 
               $kelompokBesarVsKelompokBesarAntaraBentrok || $kelompokBesarAntaraVsKelompokBesarBentrok;
    }

    private function checkBentrokWithDetail($data, $ignoreId = null, $isSemesterAntara = false): ?string
    {
        // Cek bentrok dengan jadwal Kuliah Besar
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data, $isSemesterAntara) {
                if ($isSemesterAntara && isset($data['dosen_ids'])) {
                    // Untuk semester antara, cek multiple dosen
                    $q->where(function($subQ) use ($data) {
                        $subQ->whereJsonOverlaps('dosen_ids', $data['dosen_ids'])
                             ->orWhere('dosen_id', '!=', null); // Juga cek single dosen
                    });
                } else {
                    // Untuk semester biasa, cek single dosen
                    $q->where('dosen_id', $data['dosen_id']);
                }
                $q->orWhere('ruangan_id', $data['ruangan_id']);
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
            $bentrokReason = $this->getBentrokReason($data, $jadwalBentrokKuliahBesar, $isSemesterAntara);
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }
        
        // Cek bentrok dengan jadwal PBL
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data, $isSemesterAntara) {
                if ($isSemesterAntara && isset($data['dosen_ids'])) {
                    // Untuk semester antara, cek multiple dosen
                    $q->where(function($subQ) use ($data) {
                        foreach ($data['dosen_ids'] as $dosenId) {
                            $subQ->orWhere('dosen_id', $dosenId);
                        }
                    });
                } else {
                    // Untuk semester biasa, cek single dosen
                    $q->where('dosen_id', $data['dosen_id']);
                }
                $q->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();
            
        if ($pblBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $pblBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $pblBentrok->jam_selesai);
            $bentrokReason = $this->getBentrokReason($data, $pblBentrok, $isSemesterAntara);
            return "Jadwal bentrok dengan Jadwal PBL pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
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
            $bentrokReason = $this->getBentrokReason($data, $agendaKhususBentrok, $isSemesterAntara);
            return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
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
            $bentrokReason = $this->getBentrokReason($data, $praktikumBentrok, $isSemesterAntara);
            return "Jadwal bentrok dengan Jadwal Praktikum pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }
        
        // Cek bentrok dengan jadwal Jurnal Reading
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data, $isSemesterAntara) {
                if ($isSemesterAntara && isset($data['dosen_ids'])) {
                    // Untuk semester antara, cek multiple dosen
                    $q->where(function($subQ) use ($data) {
                        foreach ($data['dosen_ids'] as $dosenId) {
                            $subQ->orWhere('dosen_id', $dosenId);
                        }
                    });
                } else {
                    // Untuk semester biasa, cek single dosen
                    $q->where('dosen_id', $data['dosen_id']);
                }
                $q->orWhere('ruangan_id', $data['ruangan_id']);
            })
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();
            
        if ($jurnalBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_selesai);
            $bentrokReason = $this->getBentrokReason($data, $jurnalBentrok, $isSemesterAntara);
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        // Cek bentrok dengan kelompok besar (jika ada kelompok_besar_id atau kelompok_besar_antara_id)
        if (isset($data['kelompok_besar_id']) && $data['kelompok_besar_id']) {
            $kelompokBesarBentrokMessage = $this->checkKelompokBesarBentrokWithDetail($data, $ignoreId);
            if ($kelompokBesarBentrokMessage) {
                return $kelompokBesarBentrokMessage;
            }
        }

        // Cek bentrok dengan kelompok besar antara (jika ada kelompok_besar_antara_id)
        if (isset($data['kelompok_besar_antara_id']) && $data['kelompok_besar_antara_id']) {
            $kelompokBesarAntaraBentrokMessage = $this->checkKelompokBesarAntaraBentrokWithDetail($data, $ignoreId);
            if ($kelompokBesarAntaraBentrokMessage) {
                return $kelompokBesarAntaraBentrokMessage;
            }
        }

        // Cek bentrok antar Kelompok Besar (Kelompok Besar vs Kelompok Besar)
        if (isset($data['kelompok_besar_id']) && $data['kelompok_besar_id']) {
            $kelompokBesarVsKelompokBesarBentrokMessage = $this->checkKelompokBesarVsKelompokBesarBentrokWithDetail($data, $ignoreId);
            if ($kelompokBesarVsKelompokBesarBentrokMessage) {
                return $kelompokBesarVsKelompokBesarBentrokMessage;
            }
        }

        // Cek bentrok antar Kelompok Besar Antara (Kelompok Besar Antara vs Kelompok Besar Antara)
        if (isset($data['kelompok_besar_antara_id']) && $data['kelompok_besar_antara_id']) {
            $kelompokBesarAntaraVsKelompokBesarAntaraBentrokMessage = $this->checkKelompokBesarAntaraVsKelompokBesarAntaraBentrokWithDetail($data, $ignoreId);
            if ($kelompokBesarAntaraVsKelompokBesarAntaraBentrokMessage) {
                return $kelompokBesarAntaraVsKelompokBesarAntaraBentrokMessage;
            }
        }

        // Cek bentrok antar Kelompok Besar vs Kelompok Besar Antara
        if (isset($data['kelompok_besar_id']) && $data['kelompok_besar_id']) {
            $kelompokBesarVsKelompokBesarAntaraBentrokMessage = $this->checkKelompokBesarVsKelompokBesarAntaraBentrokWithDetail($data, $ignoreId);
            if ($kelompokBesarVsKelompokBesarAntaraBentrokMessage) {
                return $kelompokBesarVsKelompokBesarAntaraBentrokMessage;
            }
        }

        if (isset($data['kelompok_besar_antara_id']) && $data['kelompok_besar_antara_id']) {
            $kelompokBesarAntaraVsKelompokBesarBentrokMessage = $this->checkKelompokBesarAntaraVsKelompokBesarBentrokWithDetail($data, $ignoreId);
            if ($kelompokBesarAntaraVsKelompokBesarBentrokMessage) {
                return $kelompokBesarAntaraVsKelompokBesarBentrokMessage;
            }
        }

        return null; // Tidak ada bentrok
    }

    /**
     * Mendapatkan alasan bentrok yang detail
     */
    private function getBentrokReason($data, $jadwalBentrok, $isSemesterAntara = false): string
    {
        $reasons = [];
        
        // Cek bentrok dosen
        if ($isSemesterAntara && isset($data['dosen_ids']) && isset($jadwalBentrok->dosen_id)) {
            // Untuk semester antara, cek apakah ada dosen yang sama
            if (in_array($jadwalBentrok->dosen_id, $data['dosen_ids'])) {
                $dosen = \App\Models\User::find($jadwalBentrok->dosen_id);
                $reasons[] = "Dosen: " . ($dosen ? $dosen->name : 'Tidak diketahui');
            }
        } elseif (isset($data['dosen_id']) && isset($jadwalBentrok->dosen_id) && $data['dosen_id'] == $jadwalBentrok->dosen_id) {
            // Untuk semester biasa
            $dosen = \App\Models\User::find($data['dosen_id']);
            $reasons[] = "Dosen: " . ($dosen ? $dosen->name : 'Tidak diketahui');
        }
        
        // Cek bentrok ruangan
        if (isset($data['ruangan_id']) && isset($jadwalBentrok->ruangan_id) && $data['ruangan_id'] == $jadwalBentrok->ruangan_id) {
            $ruangan = \App\Models\Ruangan::find($data['ruangan_id']);
            $reasons[] = "Ruangan: " . ($ruangan ? $ruangan->nama : 'Tidak diketahui');
        }
        
        // Cek bentrok kelompok kecil
        if (isset($data['kelompok_kecil_id']) && isset($jadwalBentrok->kelompok_kecil_id) && $data['kelompok_kecil_id'] == $jadwalBentrok->kelompok_kecil_id) {
            $kelompokKecil = \App\Models\KelompokKecil::find($data['kelompok_kecil_id']);
            $reasons[] = "Kelompok Kecil: " . ($kelompokKecil ? $kelompokKecil->nama_kelompok : 'Tidak diketahui');
        }
        
        // Cek bentrok kelas praktikum
        if (isset($data['kelas_praktikum']) && isset($jadwalBentrok->kelas_praktikum) && $data['kelas_praktikum'] == $jadwalBentrok->kelas_praktikum) {
            $reasons[] = "Kelas Praktikum: " . $data['kelas_praktikum'];
        }
        
        return implode(', ', $reasons);
    }

    /**
     * Cek bentrok dengan kelompok besar
     */
    private function checkKelompokBesarBentrok($data, $ignoreId = null): bool
    {
        // Ambil mahasiswa dalam kelompok besar yang dipilih
        $mahasiswaIds = \App\Models\KelompokBesar::where('semester', $data['kelompok_besar_id'])
            ->pluck('mahasiswa_id')
            ->toArray();

        if (empty($mahasiswaIds)) {
            return false;
        }

        // Cek bentrok dengan jadwal PBL yang menggunakan kelompok kecil dari mahasiswa yang sama
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereHas('kelompokKecil', function($q) use ($mahasiswaIds) {
                $q->whereIn('mahasiswa_id', $mahasiswaIds);
            })
            ->exists();

        // Cek bentrok dengan jadwal Jurnal Reading yang menggunakan kelompok kecil dari mahasiswa yang sama
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereHas('kelompokKecil', function($q) use ($mahasiswaIds) {
                $q->whereIn('mahasiswa_id', $mahasiswaIds);
            })
            ->exists();

        return $pblBentrok || $jurnalBentrok;
    }

    /**
     * Cek bentrok dengan kelompok besar antara (Kelompok Besar Antara vs Kelompok Kecil Antara)
     */
    private function checkKelompokBesarAntaraBentrok($data, $ignoreId = null): bool
    {
        // Ambil mahasiswa dalam kelompok besar antara yang dipilih
        $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($data['kelompok_besar_antara_id']);
        if (!$kelompokBesarAntara || empty($kelompokBesarAntara->mahasiswa_ids)) {
            return false;
        }

        $mahasiswaIds = $kelompokBesarAntara->mahasiswa_ids;

        // Cek bentrok dengan jadwal PBL yang menggunakan kelompok kecil antara dari mahasiswa yang sama
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereHas('kelompokKecilAntara', function($q) use ($mahasiswaIds) {
                $q->whereJsonOverlaps('mahasiswa_ids', $mahasiswaIds);
            })
            ->exists();

        // Cek bentrok dengan jadwal Jurnal Reading yang menggunakan kelompok kecil antara dari mahasiswa yang sama
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereHas('kelompokKecilAntara', function($q) use ($mahasiswaIds) {
                $q->whereJsonOverlaps('mahasiswa_ids', $mahasiswaIds);
            })
            ->exists();

        return $pblBentrok || $jurnalBentrok;
    }

    /**
     * Cek bentrok dengan kelompok besar dengan detail
     */
    private function checkKelompokBesarBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Ambil mahasiswa dalam kelompok besar yang dipilih
        $mahasiswaIds = \App\Models\KelompokBesar::where('semester', $data['kelompok_besar_id'])
            ->pluck('mahasiswa_id')
            ->toArray();

        if (empty($mahasiswaIds)) {
            return null;
        }

        // Cek bentrok dengan jadwal PBL yang menggunakan kelompok kecil dari mahasiswa yang sama
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereHas('kelompokKecil', function($q) use ($mahasiswaIds) {
                $q->whereIn('mahasiswa_id', $mahasiswaIds);
            })
            ->first();

        if ($pblBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $pblBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $pblBentrok->jam_selesai);
            $kelompokKecil = \App\Models\KelompokKecil::find($pblBentrok->kelompok_kecil_id);
            $bentrokReason = "Kelompok Besar vs Kelompok Kecil: " . ($kelompokKecil ? $kelompokKecil->nama_kelompok : 'Tidak diketahui');
            return "Jadwal bentrok dengan Jadwal PBL pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        // Cek bentrok dengan jadwal Jurnal Reading yang menggunakan kelompok kecil dari mahasiswa yang sama
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereHas('kelompokKecil', function($q) use ($mahasiswaIds) {
                $q->whereIn('mahasiswa_id', $mahasiswaIds);
            })
            ->first();

        if ($jurnalBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_selesai);
            $kelompokKecil = \App\Models\KelompokKecil::find($jurnalBentrok->kelompok_kecil_id);
            $bentrokReason = "Kelompok Besar vs Kelompok Kecil: " . ($kelompokKecil ? $kelompokKecil->nama_kelompok : 'Tidak diketahui');
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        return null;
    }

    /**
     * Validasi kapasitas ruangan berdasarkan jumlah mahasiswa di kelompok besar + dosen
     */
    private function validateRuanganCapacity($data, $isSemesterAntara = false)
    {
        // Ambil data ruangan
        $ruangan = Ruangan::find($data['ruangan_id']);
        if (!$ruangan) {
            return 'Ruangan tidak ditemukan';
        }

        if ($isSemesterAntara) {
            // Untuk semester antara
            if (!isset($data['kelompok_besar_antara_id']) || !$data['kelompok_besar_antara_id']) {
                if ($ruangan->kapasitas < 1) {
                    return "Ruangan {$ruangan->nama} tidak memiliki kapasitas yang valid.";
                }
                return null;
            }

            // Hitung jumlah mahasiswa di kelompok besar antara
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($data['kelompok_besar_antara_id']);
            if (!$kelompokBesarAntara) {
                return 'Kelompok besar tidak ditemukan';
            }

            $jumlahMahasiswa = count($kelompokBesarAntara->mahasiswa_ids);
            $jumlahDosen = isset($data['dosen_ids']) ? count($data['dosen_ids']) : 1;
            $totalPeserta = $jumlahMahasiswa + $jumlahDosen;

            // Validasi kapasitas
            if ($totalPeserta > $ruangan->kapasitas) {
                return "Kapasitas ruangan tidak mencukupi. Ruangan {$ruangan->nama} hanya dapat menampung {$ruangan->kapasitas} orang, sedangkan diperlukan {$totalPeserta} orang ({$jumlahMahasiswa} mahasiswa + {$jumlahDosen} dosen).";
            }
        } else {
            // Untuk semester biasa
            if (!isset($data['kelompok_besar_id']) || !$data['kelompok_besar_id']) {
                if ($ruangan->kapasitas < 1) {
                    return "Ruangan {$ruangan->nama} tidak memiliki kapasitas yang valid.";
                }
                return null;
            }

            // Hitung jumlah mahasiswa di kelompok besar
            $jumlahMahasiswa = \App\Models\KelompokBesar::where('semester', $data['kelompok_besar_id'])->count();
            $jumlahDosen = 1; // Single dosen untuk semester biasa
            $totalPeserta = $jumlahMahasiswa + $jumlahDosen;

            // Validasi kapasitas
            if ($totalPeserta > $ruangan->kapasitas) {
                return "Kapasitas ruangan tidak mencukupi. Ruangan {$ruangan->nama} hanya dapat menampung {$ruangan->kapasitas} orang, sedangkan diperlukan {$totalPeserta} orang ({$jumlahMahasiswa} mahasiswa + {$jumlahDosen} dosen).";
            }
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

    /**
     * Cek bentrok antar Kelompok Besar (Kelompok Besar vs Kelompok Besar)
     */
    private function checkKelompokBesarVsKelompokBesarBentrok($data, $ignoreId = null): bool
    {
        // Cek bentrok dengan jadwal Kuliah Besar lain yang menggunakan kelompok besar yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_id', $data['kelompok_besar_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_id', $data['kelompok_besar_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });

        return $kuliahBesarBentrok->exists() || $agendaKhususBentrok->exists();
    }

    /**
     * Cek bentrok antar Kelompok Besar Antara (Kelompok Besar Antara vs Kelompok Besar Antara)
     */
    private function checkKelompokBesarAntaraVsKelompokBesarAntaraBentrok($data, $ignoreId = null): bool
    {
        // Cek bentrok dengan jadwal Kuliah Besar lain yang menggunakan kelompok besar antara yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_antara_id', $data['kelompok_besar_antara_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar antara yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_antara_id', $data['kelompok_besar_antara_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });

        return $kuliahBesarBentrok->exists() || $agendaKhususBentrok->exists();
    }

    /**
     * Cek bentrok antar Kelompok Besar vs Kelompok Besar Antara
     */
    private function checkKelompokBesarVsKelompokBesarAntaraBentrok($data, $ignoreId = null): bool
    {
        // Ambil mahasiswa dalam kelompok besar yang dipilih
        $mahasiswaIds = \App\Models\KelompokBesar::where('semester', $data['kelompok_besar_id'])
            ->pluck('mahasiswa_id')
            ->toArray();

        if (empty($mahasiswaIds)) {
            return false;
        }

        // Cek bentrok dengan jadwal Kuliah Besar yang menggunakan kelompok besar antara yang memiliki mahasiswa yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_antara_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }

        $jadwalBentrokKuliahBesar = $kuliahBesarBentrok->first();
        if ($jadwalBentrokKuliahBesar) {
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($jadwalBentrokKuliahBesar->kelompok_besar_antara_id);
            if ($kelompokBesarAntara && !empty(array_intersect($mahasiswaIds, $kelompokBesarAntara->mahasiswa_ids))) {
                return true;
            }
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar antara yang memiliki mahasiswa yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_antara_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($agendaKhususBentrok) {
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($agendaKhususBentrok->kelompok_besar_antara_id);
            if ($kelompokBesarAntara && !empty(array_intersect($mahasiswaIds, $kelompokBesarAntara->mahasiswa_ids))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cek bentrok antar Kelompok Besar Antara vs Kelompok Besar
     */
    private function checkKelompokBesarAntaraVsKelompokBesarBentrok($data, $ignoreId = null): bool
    {
        // Ambil mahasiswa dalam kelompok besar antara yang dipilih
        $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($data['kelompok_besar_antara_id']);
        if (!$kelompokBesarAntara || empty($kelompokBesarAntara->mahasiswa_ids)) {
            return false;
        }

        $mahasiswaIds = $kelompokBesarAntara->mahasiswa_ids;

        // Cek bentrok dengan jadwal Kuliah Besar yang menggunakan kelompok besar yang memiliki mahasiswa yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }

        $jadwalBentrokKuliahBesar = $kuliahBesarBentrok->first();
        if ($jadwalBentrokKuliahBesar) {
            $kelompokBesarMahasiswaIds = \App\Models\KelompokBesar::where('semester', $jadwalBentrokKuliahBesar->kelompok_besar_id)
                ->pluck('mahasiswa_id')
                ->toArray();
            
            if (!empty(array_intersect($mahasiswaIds, $kelompokBesarMahasiswaIds))) {
                return true;
            }
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar yang memiliki mahasiswa yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($agendaKhususBentrok) {
            $kelompokBesarMahasiswaIds = \App\Models\KelompokBesar::where('semester', $agendaKhususBentrok->kelompok_besar_id)
                ->pluck('mahasiswa_id')
                ->toArray();
            
            if (!empty(array_intersect($mahasiswaIds, $kelompokBesarMahasiswaIds))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cek bentrok antar Kelompok Besar dengan detail
     */
    private function checkKelompokBesarVsKelompokBesarBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Cek bentrok dengan jadwal Kuliah Besar lain yang menggunakan kelompok besar yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_id', $data['kelompok_besar_id'])
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
            $bentrokReason = "Kelompok Besar vs Kelompok Besar: Kelompok Besar Semester " . $data['kelompok_besar_id'];
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_id', $data['kelompok_besar_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($agendaKhususBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_selesai);
            $bentrokReason = "Kelompok Besar vs Kelompok Besar: Kelompok Besar Semester " . $data['kelompok_besar_id'];
            return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        return null;
    }

    /**
     * Cek bentrok dengan kelompok besar antara (Kelompok Besar Antara vs Kelompok Kecil Antara)
     */
    private function checkKelompokBesarAntaraBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Ambil mahasiswa dalam kelompok besar antara yang dipilih
        $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($data['kelompok_besar_antara_id']);
        if (!$kelompokBesarAntara || empty($kelompokBesarAntara->mahasiswa_ids)) {
            return null;
        }

        $mahasiswaIds = $kelompokBesarAntara->mahasiswa_ids;

        // Cek bentrok dengan jadwal PBL yang menggunakan kelompok kecil antara dari mahasiswa yang sama
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereExists(function($query) use ($mahasiswaIds) {
                $query->select(\DB::raw(1))
                      ->from('kelompok_kecil_antara')
                      ->whereRaw('kelompok_kecil_antara.id = jadwal_pbl.kelompok_kecil_id')
                      ->whereJsonOverlaps('kelompok_kecil_antara.mahasiswa_ids', $mahasiswaIds);
            })
            ->first();

        if ($pblBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $pblBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $pblBentrok->jam_selesai);
            $kelompokKecilAntara = \App\Models\KelompokKecilAntara::find($pblBentrok->kelompok_kecil_id);
            $bentrokReason = "Kelompok Besar Antara vs Kelompok Kecil Antara: " . ($kelompokKecilAntara ? $kelompokKecilAntara->nama_kelompok : 'Tidak diketahui');
            return "Jadwal bentrok dengan Jadwal PBL pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        // Cek bentrok dengan jadwal Jurnal Reading yang menggunakan kelompok kecil antara dari mahasiswa yang sama
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $data['tanggal'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->whereExists(function($query) use ($mahasiswaIds) {
                $query->select(\DB::raw(1))
                      ->from('kelompok_kecil_antara')
                      ->whereRaw('kelompok_kecil_antara.id = jadwal_jurnal_reading.kelompok_kecil_id')
                      ->whereJsonOverlaps('kelompok_kecil_antara.mahasiswa_ids', $mahasiswaIds);
            })
            ->first();

        if ($jurnalBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $jurnalBentrok->jam_selesai);
            $kelompokKecilAntara = \App\Models\KelompokKecilAntara::find($jurnalBentrok->kelompok_kecil_id);
            $bentrokReason = "Kelompok Besar Antara vs Kelompok Kecil Antara: " . ($kelompokKecilAntara ? $kelompokKecilAntara->nama_kelompok : 'Tidak diketahui');
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        return null;
    }

    /**
     * Cek bentrok antar Kelompok Besar Antara (Kelompok Besar Antara vs Kelompok Besar Antara)
     */
    private function checkKelompokBesarAntaraVsKelompokBesarAntaraBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Cek bentrok dengan jadwal Kuliah Besar lain yang menggunakan kelompok besar antara yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_antara_id', $data['kelompok_besar_antara_id'])
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
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($data['kelompok_besar_antara_id']);
            $bentrokReason = "Kelompok Besar Antara vs Kelompok Besar Antara: " . ($kelompokBesarAntara ? $kelompokBesarAntara->nama_kelompok : 'Tidak diketahui');
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar antara yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->where('kelompok_besar_antara_id', $data['kelompok_besar_antara_id'])
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($agendaKhususBentrok) {
            $jamMulaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_mulai);
            $jamSelesaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_selesai);
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($data['kelompok_besar_antara_id']);
            $bentrokReason = "Kelompok Besar Antara vs Kelompok Besar Antara: " . ($kelompokBesarAntara ? $kelompokBesarAntara->nama_kelompok : 'Tidak diketahui');
            return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                   date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                   $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
        }

        return null;
    }

    /**
     * Cek bentrok antar Kelompok Besar vs Kelompok Besar Antara
     */
    private function checkKelompokBesarVsKelompokBesarAntaraBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Ambil mahasiswa dalam kelompok besar yang dipilih
        $mahasiswaIds = \App\Models\KelompokBesar::where('semester', $data['kelompok_besar_id'])
            ->pluck('mahasiswa_id')
            ->toArray();

        if (empty($mahasiswaIds)) {
            return null;
        }

        // Cek bentrok dengan jadwal Kuliah Besar yang menggunakan kelompok besar antara yang memiliki mahasiswa yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_antara_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }

        $jadwalBentrokKuliahBesar = $kuliahBesarBentrok->first();
        if ($jadwalBentrokKuliahBesar) {
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($jadwalBentrokKuliahBesar->kelompok_besar_antara_id);
            if ($kelompokBesarAntara && !empty(array_intersect($mahasiswaIds, $kelompokBesarAntara->mahasiswa_ids))) {
                $jamMulaiFormatted = str_replace(':', '.', $jadwalBentrokKuliahBesar->jam_mulai);
                $jamSelesaiFormatted = str_replace(':', '.', $jadwalBentrokKuliahBesar->jam_selesai);
                $bentrokReason = "Kelompok Besar vs Kelompok Besar Antara: " . $kelompokBesarAntara->nama_kelompok;
                return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                       date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                       $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
            }
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar antara yang memiliki mahasiswa yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_antara_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($agendaKhususBentrok) {
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($agendaKhususBentrok->kelompok_besar_antara_id);
            if ($kelompokBesarAntara && !empty(array_intersect($mahasiswaIds, $kelompokBesarAntara->mahasiswa_ids))) {
                $jamMulaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_mulai);
                $jamSelesaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_selesai);
                $bentrokReason = "Kelompok Besar vs Kelompok Besar Antara: " . $kelompokBesarAntara->nama_kelompok;
                return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                       date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                       $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
            }
        }

        return null;
    }

    /**
     * Cek bentrok antar Kelompok Besar Antara vs Kelompok Besar
     */
    private function checkKelompokBesarAntaraVsKelompokBesarBentrokWithDetail($data, $ignoreId = null): ?string
    {
        // Ambil mahasiswa dalam kelompok besar antara yang dipilih
        $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($data['kelompok_besar_antara_id']);
        if (!$kelompokBesarAntara || empty($kelompokBesarAntara->mahasiswa_ids)) {
            return null;
        }

        $mahasiswaIds = $kelompokBesarAntara->mahasiswa_ids;

        // Cek bentrok dengan jadwal Kuliah Besar yang menggunakan kelompok besar yang memiliki mahasiswa yang sama
        $kuliahBesarBentrok = JadwalKuliahBesar::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            });
        
        if ($ignoreId) {
            $kuliahBesarBentrok->where('id', '!=', $ignoreId);
        }

        $jadwalBentrokKuliahBesar = $kuliahBesarBentrok->first();
        if ($jadwalBentrokKuliahBesar) {
            $kelompokBesarMahasiswaIds = \App\Models\KelompokBesar::where('semester', $jadwalBentrokKuliahBesar->kelompok_besar_id)
                ->pluck('mahasiswa_id')
                ->toArray();
            
            if (!empty(array_intersect($mahasiswaIds, $kelompokBesarMahasiswaIds))) {
                $jamMulaiFormatted = str_replace(':', '.', $jadwalBentrokKuliahBesar->jam_mulai);
                $jamSelesaiFormatted = str_replace(':', '.', $jadwalBentrokKuliahBesar->jam_selesai);
                $bentrokReason = "Kelompok Besar Antara vs Kelompok Besar: Kelompok Besar Semester " . $jadwalBentrokKuliahBesar->kelompok_besar_id;
                return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                       date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                       $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
            }
        }

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar yang memiliki mahasiswa yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $data['tanggal'])
            ->whereNotNull('kelompok_besar_id')
            ->where(function($q) use ($data) {
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                   ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->first();

        if ($agendaKhususBentrok) {
            $kelompokBesarMahasiswaIds = \App\Models\KelompokBesar::where('semester', $agendaKhususBentrok->kelompok_besar_id)
                ->pluck('mahasiswa_id')
                ->toArray();
            
            if (!empty(array_intersect($mahasiswaIds, $kelompokBesarMahasiswaIds))) {
                $jamMulaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_mulai);
                $jamSelesaiFormatted = str_replace(':', '.', $agendaKhususBentrok->jam_selesai);
                $bentrokReason = "Kelompok Besar Antara vs Kelompok Besar: Kelompok Besar Semester " . $agendaKhususBentrok->kelompok_besar_id;
                return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                       date('d/m/Y', strtotime($data['tanggal'])) . " jam " . 
                       $jamMulaiFormatted . "-" . $jamSelesaiFormatted . " (" . $bentrokReason . ")";
            }
        }

        return null;
    }
}
