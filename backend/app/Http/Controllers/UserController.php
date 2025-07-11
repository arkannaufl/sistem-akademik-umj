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
use App\Services\ActivityLogService;


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
        return response()->json($query->get());
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
            'peran_kurikulum' => 'nullable|array',
            'semester' => 'nullable|integer|min:1|max:8',
        ]);
        $validated['password'] = Hash::make($validated['password']);

        // Convert kompetensi from string to array if it's a string (e.g., from form input)
        if (isset($validated['kompetensi']) && is_string($validated['kompetensi'])) {
            $validated['kompetensi'] = array_map('trim', explode(',', $validated['kompetensi']));
        }

        // Convert peran_kurikulum from string to array if it's a string
        if (isset($validated['peran_kurikulum']) && is_string($validated['peran_kurikulum'])) {
            $validated['peran_kurikulum'] = array_map('trim', explode(',', $validated['peran_kurikulum']));
        }

        $user = User::create($validated);
        
        // Log activity
        ActivityLogService::logCreate(
            'USER',
            "Menambahkan {$validated['role']} baru: {$validated['name']}",
            $validated,
            $request
        );
        
        return response()->json($user, 201);
    }

    // PUT /users/{id}
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $oldData = $user->toArray();
        
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
            'peran_kurikulum' => 'nullable|array',
            'semester' => 'nullable|integer|min:1|max:8',
        ]);
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Convert kompetensi from string to array if it's a string (e.g., from form input)
        if (isset($validated['kompetensi']) && is_string($validated['kompetensi'])) {
            $validated['kompetensi'] = array_map('trim', explode(',', $validated['kompetensi']));
        }

        // Convert peran_kurikulum from string to array if it's a string
        if (isset($validated['peran_kurikulum']) && is_string($validated['peran_kurikulum'])) {
            $validated['peran_kurikulum'] = array_map('trim', explode(',', $validated['peran_kurikulum']));
        }

        $user->update($validated);
        
        // Log activity
        ActivityLogService::logUpdate(
            'USER',
            "Mengupdate data {$user->role}: {$user->name}",
            $oldData,
            $validated,
            $request
        );
        
        return response()->json($user);
    }

    // DELETE /users/{id}
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $oldData = $user->toArray();
        
        // Reset login status and delete all tokens
        $user->is_logged_in = 0;
        $user->current_token = null;
        $user->save();
        $user->tokens()->delete();
        $user->delete();
        
        // Log activity
        ActivityLogService::logDelete(
            'USER',
            "Menghapus {$user->role}: {$user->name}",
            $oldData,
            request()
        );
        
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

        // Log activity
        ActivityLogService::logImport(
            'USER',
            "Import data dosen dari file: {$request->file('file')->getClientOriginalName()}",
            $request->file('file')->getClientOriginalName(),
            $importedCount,
            $request
        );

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

        // Log activity
        ActivityLogService::logImport(
            'USER',
            "Import data mahasiswa dari file: {$request->file('file')->getClientOriginalName()}",
            $request->file('file')->getClientOriginalName(),
            $importedCount,
            $request
        );

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

        // Log activity
        ActivityLogService::logImport(
            'USER',
            "Import data tim akademik dari file: {$request->file('file')->getClientOriginalName()}",
            $request->file('file')->getClientOriginalName(),
            $importedCount,
            $request
        );

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