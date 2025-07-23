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
use Illuminate\Support\Facades\Auth;


class UserController extends Controller
{
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
}
