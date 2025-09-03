<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Imports\DosenImport;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\MahasiswaImport;
use App\Imports\TimAkademikImport;
use Illuminate\Validation\Rule;
use App\Models\DosenPeran;
use App\Services\SemesterService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;


class UserController extends Controller
{
    protected $semesterService;

    public function __construct(SemesterService $semesterService)
    {
        $this->semesterService = $semesterService;
    }

    // GET /users?role=tim_akademik|dosen|mahasiswa
    public function index(Request $request)
    {
        $query = User::query();
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        if ($request->has('semester')) {
            $query->where('semester', $request->semester);
        }
        $users = $query->get();
        // Tambahan: jika role dosen, tambahkan field peran multi
        if ($request->role === 'dosen') {
            $users = $users->map(function ($user) {
                $userArr = $user->toArray();
                $userArr['dosen_peran'] = $user->dosenPeran()->with('mataKuliah')->get()->map(function($peran) {
                    return [
                        'id' => $peran->id,
                        'tipe_peran' => $peran->tipe_peran,
                        'mata_kuliah_kode' => $peran->mata_kuliah_kode,
                        'mata_kuliah_nama' => $peran->mataKuliah ? $peran->mataKuliah->nama : null,
                        'blok' => $peran->blok,
                        'semester' => $peran->semester,
                        'peran_kurikulum' => $peran->peran_kurikulum,
                    ];
                });
                return $userArr;
            });
        }
        return response()->json($users);
    }

    // GET /users/{id}
    public function show($id)
    {
        try {
            $user = User::findOrFail($id);
            
            // Jika user adalah dosen, tambahkan data dosen_peran
            if ($user->role === 'dosen') {
                $userArr = $user->toArray();
                $userArr['dosen_peran'] = $user->dosenPeran()->with('mataKuliah')->get()->map(function($peran) {
                    return [
                        'id' => $peran->id,
                        'tipe_peran' => $peran->tipe_peran,
                        'mata_kuliah_kode' => $peran->mata_kuliah_kode,
                        'mata_kuliah_nama' => $peran->mataKuliah ? $peran->mataKuliah->nama : null,
                        'blok' => $peran->blok,
                        'semester' => $peran->semester,
                        'peran_kurikulum' => $peran->peran_kurikulum,
                    ];
                });
                return response()->json($userArr);
            }
            
            return response()->json($user);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'User tidak ditemukan',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    // POST /users
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'username' => [
                'required',
                'string',
                Rule::unique('users')->where(function ($query) use ($request) {
                    return $query->where('role', $request->role);
                }),
            ],
            'email' => [
                'nullable',
                'email',
                Rule::unique('users')->where(function ($query) use ($request) {
                    return $query->where('role', $request->role);
                }),
            ],
            'nip' => 'nullable|unique:users,nip',
            'nid' => 'nullable|unique:users,nid',
            'nidn' => 'nullable',
            'nim' => 'nullable|unique:users,nim',
            'telp' => 'nullable',
            'ket' => 'nullable',
            'gender' => 'nullable',
            'ipk' => 'nullable|numeric',
            'status' => 'nullable',
            'angkatan' => 'nullable',
            'role' => 'required|in:super_admin,tim_akademik,dosen,mahasiswa',
            'password' => 'required|string|min:6',
            'kompetensi' => 'nullable',
            'keahlian' => 'nullable',
            'semester' => 'nullable|integer|min:1|max:8',
            'dosen_peran' => 'nullable|array', // array of peran
        ]);
        $validated['password'] = Hash::make($validated['password']);

        // Convert kompetensi from string to array if it's a string (e.g., from form input)
        if (isset($validated['kompetensi']) && is_string($validated['kompetensi'])) {
            $validated['kompetensi'] = array_map('trim', explode(',', $validated['kompetensi']));
        }

        // Hilangkan validasi dan assignment peran_utama dan peran_kurikulum
        $dosenPeran = $request->input('dosen_peran', []);

        // Tambahkan validasi: maksimal 2 peran di blok yang sama untuk satu dosen
        $blokCount = [];
        foreach ($dosenPeran as $peran) {
            if (($peran['tipe_peran'] ?? null) !== 'mengajar' && !empty($peran['mata_kuliah_kode'])) {
                $kode = $peran['mata_kuliah_kode'];
                $blokCount[$kode] = ($blokCount[$kode] ?? 0) + 1;
            }
        }
        foreach ($blokCount as $kode => $count) {
            if ($count > 2) {
                // Ambil nama blok jika bisa
                $mk = \App\Models\MataKuliah::where('kode', $kode)->first();
                $nama = $mk ? $mk->nama : $kode;
                return response()->json([
                    'message' => "Maksimal 2 peran di blok $nama untuk satu dosen.",
                ], 422);
            }
        }
        $user = User::create($validated);
        
        // Jika user adalah mahasiswa, update semester berdasarkan semester aktif
        if ($user->role === 'mahasiswa') {
            $this->semesterService->updateNewStudentSemester($user);
        }
        
        // Simpan peran ke tabel dosen_peran
        foreach ($dosenPeran as $peran) {
            DosenPeran::create([
                'user_id' => $user->id,
                'tipe_peran' => $peran['tipe_peran'],
                'mata_kuliah_kode' => $peran['tipe_peran'] === 'mengajar' ? null : $peran['mata_kuliah_kode'],
                'peran_kurikulum' => $peran['peran_kurikulum'],
                'blok' => $peran['tipe_peran'] === 'mengajar' ? null : ($peran['blok'] ?? null),
                'semester' => $peran['tipe_peran'] === 'mengajar' ? null : ($peran['semester'] ?? null),
            ]);
        }

        return response()->json($user, 201);
    }

    // PUT /users/{id}
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string',
            'username' => [
                'sometimes',
                'required',
                'string',
                Rule::unique('users')->where(function ($query) use ($request, $user) {
                    return $query->where('role', $request->role ?? $user->role);
                })->ignore($user->id),
            ],
            'email' => [
                'nullable',
                'email',
                Rule::unique('users')->where(function ($query) use ($request, $user) {
                    return $query->where('role', $request->role ?? $user->role);
                })->ignore($user->id),
            ],
            'nip' => 'nullable|unique:users,nip,' . $user->id,
            'nid' => 'nullable|unique:users,nid,' . $user->id,
            'nidn' => 'nullable',
            'nim' => 'nullable|unique:users,nim,' . $user->id,
            'telp' => 'nullable',
            'ket' => 'nullable',
            'gender' => 'nullable',
            'ipk' => 'nullable|numeric',
            'status' => 'nullable',
            'angkatan' => 'nullable',
            'role' => 'sometimes|required|in:super_admin,tim_akademik,dosen,mahasiswa',
            'password' => 'nullable|string|min:6',
            'kompetensi' => 'nullable',
            'keahlian' => 'nullable',
            'semester' => 'nullable|integer|min:1|max:8',
            // Tidak boleh update dosen_peran dari sini
        ]);
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }
        if (isset($validated['kompetensi']) && is_string($validated['kompetensi'])) {
            $validated['kompetensi'] = array_map('trim', explode(',', $validated['kompetensi']));
        }
        // Tambahkan konversi keahlian jika string
        if (isset($validated['keahlian']) && is_string($validated['keahlian'])) {
            $validated['keahlian'] = array_map('trim', explode(',', $validated['keahlian']));
        }
        $user->update($validated);

        return response()->json($user);
    }

    // DELETE /users/{id}
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Reset login status and delete all tokens
        $user->is_logged_in = 0;
        $user->current_token = null;
        $user->save();
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted']);
    }

    // Import Dosen
    public function importDosen(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls',
        ]);

        $import = new DosenImport();
        Excel::import($import, $request->file('file'));

        $errors = $import->getErrors();
        $failedRows = $import->getFailedRows();
        $cellErrors = $import->getCellErrors();

        // Hitung jumlah baris di file (tanpa header)
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($request->file('file')->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $totalRows = $sheet->getHighestDataRow() - 1; // -1 untuk header

        $importedCount = $totalRows - count($failedRows);

        activity()
            ->causedBy(Auth::user())
            ->log("Mengimpor {$importedCount} data dosen dari file: {$request->file('file')->getClientOriginalName()}");

        if ($importedCount > 0) {
            // Ada data valid yang berhasil diimpor
            return response()->json([
                'imported_count' => $importedCount,
                'errors' => $errors,
                'failed_rows' => $failedRows,
                'cell_errors' => $cellErrors,
            ], 200);
        } else {
            // Semua data gagal, return 422
            return response()->json([
                'message' => 'Semua data gagal diimpor. Periksa kembali format dan isian data.',
                'errors' => $errors,
                'cell_errors' => $cellErrors,
            ], 422);
        }
    }

    // Import Mahasiswa
    public function importMahasiswa(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls',
        ]);

        $import = new MahasiswaImport();
        \Maatwebsite\Excel\Facades\Excel::import($import, $request->file('file'));

        $errors = $import->getErrors();
        $failedRows = $import->getFailedRows();
        $cellErrors = $import->getCellErrors();

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($request->file('file')->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $totalRows = $sheet->getHighestDataRow() - 1; // -1 untuk header

        $importedCount = $totalRows - count($failedRows);

        activity()
            ->causedBy(Auth::user())
            ->log("Mengimpor {$importedCount} data mahasiswa dari file: {$request->file('file')->getClientOriginalName()}");

        if ($importedCount > 0) {
            // Ada data valid yang berhasil diimpor
            return response()->json([
                'imported_count' => $importedCount,
                'errors' => $errors,
                'failed_rows' => $failedRows,
                'cell_errors' => $cellErrors,
            ], 200);
        } else {
            // Semua data gagal, return 422
            return response()->json([
                'message' => 'Semua data gagal diimpor. Periksa kembali format dan isian data.',
                'errors' => $errors,
                'cell_errors' => $cellErrors,
            ], 422);
        }
    }

    // Import Tim Akademik
    public function importTimAkademik(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls',
        ]);

        $import = new TimAkademikImport();
        \Maatwebsite\Excel\Facades\Excel::import($import, $request->file('file'));

        $errors = $import->getErrors();
        $failedRows = $import->getFailedRows();
        $cellErrors = $import->getCellErrors();

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($request->file('file')->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $totalRows = $sheet->getHighestDataRow() - 1; // -1 untuk header

        $importedCount = $totalRows - count($failedRows);

        activity()
            ->causedBy(Auth::user())
            ->log("Mengimpor {$importedCount} data tim akademik dari file: {$request->file('file')->getClientOriginalName()}");

        if ($importedCount > 0) {
            // Ada data valid yang berhasil diimpor
            return response()->json([
                'imported_count' => $importedCount,
                'errors' => $errors,
                'failed_rows' => $failedRows,
                'cell_errors' => $cellErrors,
            ], 200);
        } else {
            // Semua data gagal, return 422
            return response()->json([
                'message' => 'Semua data gagal diimpor. Periksa kembali format dan isian data.',
                'errors' => $errors,
                'cell_errors' => $cellErrors,
            ], 422);
        }
    }

    public function getJadwalMengajar($id)
    {
        try {
            $dosen = User::findOrFail($id);

            // Log untuk debug
            Log::info("Fetching jadwal mengajar for dosen ID: " . $id);

            // Ambil semua jadwal mengajar dosen dari berbagai tabel
            $jadwalMengajar = collect();

            // 1. Jadwal Kuliah Besar
            $jadwalKuliahBesar = DB::table('jadwal_kuliah_besar as jkb')
                ->join('mata_kuliah as mk', 'jkb.mata_kuliah_kode', '=', 'mk.kode')
                ->join('ruangan as r', 'jkb.ruangan_id', '=', 'r.id')
                ->where('jkb.dosen_id', $id)
                ->select([
                    'jkb.id',
                    'mk.kode as mata_kuliah_kode',
                    'mk.nama as mata_kuliah_nama',
                    'jkb.tanggal',
                    'jkb.jam_mulai',
                    'jkb.jam_selesai',
                    DB::raw("'kuliah_besar' as jenis_jadwal"),
                    'jkb.materi as topik',
                    'r.nama as ruangan_nama',
                    'jkb.jumlah_sesi',
                    'mk.semester',
                    'mk.blok'
                ])
                ->get();

            Log::info("Jadwal Kuliah Besar count: " . $jadwalKuliahBesar->count());
            $jadwalMengajar = $jadwalMengajar->concat($jadwalKuliahBesar);

            // 2. Jadwal Agenda Khusus
            $jadwalAgendaKhusus = DB::table('jadwal_agenda_khusus as jak')
                ->join('mata_kuliah as mk', 'jak.mata_kuliah_kode', '=', 'mk.kode')
                ->join('ruangan as r', 'jak.ruangan_id', '=', 'r.id')
                ->select([
                    'jak.id',
                    'mk.kode as mata_kuliah_kode',
                    'mk.nama as mata_kuliah_nama',
                    'jak.tanggal',
                    'jak.jam_mulai',
                    'jak.jam_selesai',
                    DB::raw("'agenda_khusus' as jenis_jadwal"),
                    'jak.agenda',
                    'r.nama as ruangan_nama',
                    'jak.jumlah_sesi',
                    'mk.semester',
                    'mk.blok'
                ])
                ->get();

            Log::info("Jadwal Agenda Khusus count: " . $jadwalAgendaKhusus->count());
            $jadwalMengajar = $jadwalMengajar->concat($jadwalAgendaKhusus);

            // 3. Jadwal Praktikum
            // Debug: cek apakah ada data di jadwal_praktikum_dosen
            $debugJadwalPraktikumDosen = DB::table('jadwal_praktikum_dosen')
                ->where('dosen_id', $id)
                ->get();
            Log::info("Debug - jadwal_praktikum_dosen for dosen $id: " . $debugJadwalPraktikumDosen->toJson());

            $jadwalPraktikum = DB::table('jadwal_praktikum as jp')
                ->join('mata_kuliah as mk', 'jp.mata_kuliah_kode', '=', 'mk.kode')
                ->join('ruangan as r', 'jp.ruangan_id', '=', 'r.id')
                ->join('jadwal_praktikum_dosen as jpd', 'jp.id', '=', 'jpd.jadwal_praktikum_id')
                ->where('jpd.dosen_id', $id)
                ->select([
                    'jp.id',
                    'mk.kode as mata_kuliah_kode',
                    'mk.nama as mata_kuliah_nama',
                    'jp.tanggal',
                    'jp.jam_mulai',
                    'jp.jam_selesai',
                    DB::raw("'praktikum' as jenis_jadwal"),
                    'jp.topik',
                    'r.nama as ruangan_nama',
                    'jp.kelas_praktikum as kelompok_kecil',
                    'jp.jumlah_sesi',
                    'mk.semester',
                    'mk.blok'
                ])
                ->get();

            Log::info("Jadwal Praktikum count: " . $jadwalPraktikum->count());
            Log::info("Jadwal Praktikum data: " . $jadwalPraktikum->toJson());
            $jadwalMengajar = $jadwalMengajar->concat($jadwalPraktikum);

            // 4. Jadwal Jurnal Reading
            $jadwalJurnalReading = DB::table('jadwal_jurnal_reading as jjr')
                ->join('mata_kuliah as mk', 'jjr.mata_kuliah_kode', '=', 'mk.kode')
                ->join('ruangan as r', 'jjr.ruangan_id', '=', 'r.id')
                ->join('kelompok_kecil as kk', 'jjr.kelompok_kecil_id', '=', 'kk.id')
                ->where('jjr.dosen_id', $id)
                ->select([
                    'jjr.id',
                    'mk.kode as mata_kuliah_kode',
                    'mk.nama as mata_kuliah_nama',
                    'jjr.tanggal',
                    'jjr.jam_mulai',
                    'jjr.jam_selesai',
                    DB::raw("'jurnal_reading' as jenis_jadwal"),
                    'jjr.topik',
                    'r.nama as ruangan_nama',
                    'kk.nama_kelompok as kelompok_kecil',
                    'jjr.jumlah_sesi',
                    'mk.semester',
                    'mk.blok'
                ])
                ->get();

            Log::info("Jadwal Jurnal Reading count: " . $jadwalJurnalReading->count());
            $jadwalMengajar = $jadwalMengajar->concat($jadwalJurnalReading);

            // 5. Jadwal PBL
            $jadwalPBL = DB::table('jadwal_pbl as jp')
                ->join('mata_kuliah as mk', 'jp.mata_kuliah_kode', '=', 'mk.kode')
                ->join('ruangan as r', 'jp.ruangan_id', '=', 'r.id')
                ->join('kelompok_kecil as kk', 'jp.kelompok_kecil_id', '=', 'kk.id')
                ->join('pbls as pbl', 'jp.pbl_id', '=', 'pbl.id')
                ->where('jp.dosen_id', $id)
                ->select([
                    'jp.id',
                    'mk.kode as mata_kuliah_kode',
                    'mk.nama as mata_kuliah_nama',
                    'jp.tanggal',
                    'jp.jam_mulai',
                    'jp.jam_selesai',
                    DB::raw("'pbl' as jenis_jadwal"),
                    'pbl.nama_modul as modul_pbl',
                    'r.nama as ruangan_nama',
                    'kk.nama_kelompok as kelompok_kecil',
                    DB::raw('CASE
                        WHEN jp.pbl_tipe = "PBL 1" THEN 2
                        WHEN jp.pbl_tipe = "PBL 2" THEN 3
                        ELSE 2
                    END as jumlah_sesi'),
                    'jp.pbl_tipe',
                    'mk.semester',
                    'mk.blok'
                ])
                ->get();

            Log::info("Jadwal PBL count: " . $jadwalPBL->count());
            $jadwalMengajar = $jadwalMengajar->concat($jadwalPBL);

            // 6. Jadwal CSR
            $jadwalCSR = DB::table('jadwal_csr as jc')
                ->join('mata_kuliah as mk', 'jc.mata_kuliah_kode', '=', 'mk.kode')
                ->join('ruangan as r', 'jc.ruangan_id', '=', 'r.id')
                ->join('kelompok_kecil as kk', 'jc.kelompok_kecil_id', '=', 'kk.id')
                ->where('jc.dosen_id', $id)
                ->select([
                    'jc.id',
                    'mk.kode as mata_kuliah_kode',
                    'mk.nama as mata_kuliah_nama',
                    'jc.tanggal',
                    'jc.jam_mulai',
                    'jc.jam_selesai',
                    DB::raw("'csr' as jenis_jadwal"),
                    'jc.topik',
                    'r.nama as ruangan_nama',
                    'kk.nama_kelompok as kelompok_kecil',
                    DB::raw('NULL as kategori_csr'),
                    'jc.jenis_csr',
                    'jc.jumlah_sesi',
                    'mk.semester'
                ])
                ->get();

            Log::info("Jadwal CSR count: " . $jadwalCSR->count());
            $jadwalMengajar = $jadwalMengajar->concat($jadwalCSR);

            // 7. Jadwal Non-Blok Non-CSR
            $jadwalNonBlokNonCSR = DB::table('jadwal_non_blok_non_csr as jnbnc')
                ->join('mata_kuliah as mk', 'jnbnc.mata_kuliah_kode', '=', 'mk.kode')
                ->join('ruangan as r', 'jnbnc.ruangan_id', '=', 'r.id')
                ->where('jnbnc.dosen_id', $id)
                ->select([
                    'jnbnc.id',
                    'mk.kode as mata_kuliah_kode',
                    'mk.nama as mata_kuliah_nama',
                    'jnbnc.tanggal',
                    'jnbnc.jam_mulai',
                    'jnbnc.jam_selesai',
                    'jnbnc.jenis_baris as jenis_jadwal',
                    'jnbnc.materi',
                    'jnbnc.agenda',
                    'r.nama as ruangan_nama',
                    'jnbnc.jumlah_sesi',
                    'mk.semester'
                ])
                ->get();

            Log::info("Jadwal Non-Blok Non-CSR count: " . $jadwalNonBlokNonCSR->count());
            $jadwalMengajar = $jadwalMengajar->concat($jadwalNonBlokNonCSR);

            // Sort berdasarkan tanggal dan jam
            $jadwalMengajar = $jadwalMengajar->sortBy([
                ['tanggal', 'desc'],
                ['jam_mulai', 'asc']
            ]);

            Log::info("Total jadwal mengajar: " . $jadwalMengajar->count());

            return response()->json($jadwalMengajar->values());

        } catch (\Exception $e) {
            Log::error("Error in getJadwalMengajar: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal mengambil data jadwal mengajar',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
