<?php

namespace App\Imports;

use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class DosenImport implements ToCollection, WithHeadingRow
{
    private $errors = [];
    private $failedRows = [];
    private $cellErrors = [];
    private $seenNidsInFile = []; // Untuk cek duplikat NID di dalam file Excel
    private $seenNidnsInFile = []; // Untuk cek duplikat NIDN di dalam file Excel
    private $seenUsernamesInFile = []; // Untuk cek duplikat Username di dalam file Excel
    private $seenEmailsInFile = []; // Untuk cek duplikat Email di dalam file Excel

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $originalRowArray = $row->toArray();
            $rowArray = $originalRowArray; // Salin untuk digunakan dalam validasi

            // Mapping kolom agar sesuai field database (ini penting untuk validasi Laravel)
            $rowArray['name'] = $originalRowArray['nama'] ?? null;
            $rowArray['telp'] = $originalRowArray['telepon'] ?? null;
            $rowArray['kompetensi'] = $originalRowArray['kompetensi'] ?? null;

            // Convert 'peran_dalam_kurikulum' string to JSON array
            $peranKurikulumString = $originalRowArray['peran_dalam_kurikulum'] ?? null;
            if (!is_null($peranKurikulumString)) {
                $roles = array_map('trim', explode(',', $peranKurikulumString));
                // Filter out empty strings that might result from extra commas or leading/trailing commas
                $rowArray['peran_kurikulum'] = array_values(array_filter($roles));
            } else {
                $rowArray['peran_kurikulum'] = null;
            }

            $rowArray['peran_utama'] = $originalRowArray['peran_utama'] ?? null;
            $rowArray['matkul_ketua_id'] = $originalRowArray['matkul_ketua_id'] ?? null;
            $rowArray['matkul_anggota_id'] = $originalRowArray['matkul_anggota_id'] ?? null;
            $rowArray['peran_kurikulum_mengajar'] = $originalRowArray['peran_kurikulum_mengajar'] ?? null;

            $currentRowErrors = [];

            // 1. Validasi keberadaan field wajib dan isinya tidak kosong (basic validation)
            $basicValidator = Validator::make($rowArray, [
                'nid' => 'required',
                'nidn' => 'required',
                'name' => 'required',
                'username' => 'required',
                'email' => 'required',
                'telp' => 'required',
                'password' => 'required|min:6',
                'peran_utama' => 'required|in:koordinator,tim_blok,dosen_mengajar',
                'matkul_ketua_id' => 'nullable|required_if:peran_utama,koordinator|exists:mata_kuliah,kode',
                'matkul_anggota_id' => 'nullable|required_if:peran_utama,tim_blok|exists:mata_kuliah,kode',
                'peran_kurikulum_mengajar' => 'nullable|required_if:peran_utama,dosen_mengajar|string',
            ], [
                'nid.required' => 'NID harus diisi (Baris '.($index+2).')',
                'nidn.required' => 'NIDN harus diisi (Baris '.($index+2).')',
                'name.required' => 'Nama harus diisi (Baris '.($index+2).')',
                'username.required' => 'Username harus diisi (Baris '.($index+2).')',
                'email.required' => 'Email harus diisi (Baris '.($index+2).')',
                'telp.required' => 'Nomor telepon harus diisi (Baris '.($index+2).')',
                'password.required' => 'Password harus diisi (Baris '.($index+2).')',
                'password.min' => 'Password minimal 6 karakter (Baris '.($index+2).')',
                'peran_utama.required' => 'Peran utama harus diisi (Baris '.($index+2).')',
                'peran_utama.in' => 'Peran utama tidak valid (Baris '.($index+2).')',
                'matkul_ketua_id.required_if' => 'Mata kuliah koordinator harus diisi jika peran koordinator (Baris '.($index+2).')',
                'matkul_anggota_id.required_if' => 'Mata kuliah tim blok harus diisi jika peran tim blok (Baris '.($index+2).')',
                'peran_kurikulum_mengajar.required_if' => 'Peran kurikulum mengajar harus diisi jika peran dosen mengajar (Baris '.($index+2).')',
            ]);

            if ($basicValidator->fails()) {
                foreach ($basicValidator->errors()->messages() as $field => $messages) {
                    foreach ($messages as $message) {
                        $excelFieldName = $field;
                        if ($field === 'name') $excelFieldName = 'nama';
                        if ($field === 'telp') $excelFieldName = 'telepon';
                        if ($field === 'peran_kurikulum') $excelFieldName = 'peran_dalam_kurikulum';

                        $currentRowErrors[] = [
                            'type' => 'required_or_min',
                            'field' => $excelFieldName,
                            'message' => $message,
                            'nid' => $rowArray['nid'] ?? null,
                        ];
                    }
                }
            }

            // 2. Validasi duplikat dalam file Excel ini
            // Pastikan NID tidak kosong sebelum cek duplikat
            if (isset($rowArray['nid']) && trim($rowArray['nid']) !== '') {
                if (in_array(trim($rowArray['nid']), $this->seenNidsInFile)) {
                    $currentRowErrors[] = [
                        'type' => 'duplicate_in_file',
                        'field' => 'nid',
                        'message' => "NID '{$rowArray['nid']}' sudah terdaftar dalam file ini (Baris ".($index+2).')',
                        'nid' => $rowArray['nid'] ?? null,
                    ];
                } else {
                    $this->seenNidsInFile[] = trim($rowArray['nid']);
                }
            }
            if (isset($rowArray['nidn']) && trim($rowArray['nidn']) !== '') {
                if (in_array(trim($rowArray['nidn']), $this->seenNidnsInFile)) {
                    $currentRowErrors[] = [
                        'type' => 'duplicate_in_file',
                        'field' => 'nidn',
                        'message' => "NIDN '{$rowArray['nidn']}' sudah terdaftar dalam file ini (Baris ".($index+2).')',
                        'nid' => $rowArray['nid'] ?? null,
                    ];
                } else {
                    $this->seenNidnsInFile[] = trim($rowArray['nidn']);
                }
            }
            if (isset($rowArray['username']) && trim($rowArray['username']) !== '') {
                if (in_array(trim($rowArray['username']), $this->seenUsernamesInFile)) {
                    $currentRowErrors[] = [
                        'type' => 'duplicate_in_file',
                        'field' => 'username',
                        'message' => "Username '{$rowArray['username']}' sudah terdaftar dalam file ini (Baris ".($index+2).')',
                        'nid' => $rowArray['nid'] ?? null,
                    ];
                } else {
                    $this->seenUsernamesInFile[] = trim($rowArray['username']);
                }
            }
            if (isset($rowArray['email']) && trim($rowArray['email']) !== '') {
                if (in_array(trim($rowArray['email']), $this->seenEmailsInFile)) {
                    $currentRowErrors[] = [
                        'type' => 'duplicate_in_file',
                        'field' => 'email',
                        'message' => "Email '{$rowArray['email']}' sudah terdaftar dalam file ini (Baris ".($index+2).')',
                        'nid' => $rowArray['nid'] ?? null,
                    ];
                } else {
                    $this->seenEmailsInFile[] = trim($rowArray['email']);
                }
            }

            // Validasi satu matkul hanya satu koordinator
            if ($rowArray['peran_utama'] === 'koordinator' && User::where('matkul_ketua_id', $rowArray['matkul_ketua_id'])->where('peran_utama', 'koordinator')->exists()) {
                $currentRowErrors[] = [
                    'type' => 'duplicate_koordinator',
                    'field' => 'matkul_ketua_id',
                    'message' => 'Mata kuliah ini sudah memiliki koordinator (Baris '.($index+2).')',
                    'nid' => $rowArray['nid'] ?? null,
                ];
            }
            // Validasi anggota max 3 per matkul
            if ($rowArray['peran_utama'] === 'tim_blok' && User::where('matkul_anggota_id', $rowArray['matkul_anggota_id'])->where('peran_utama', 'tim_blok')->count() >= 3) {
                $currentRowErrors[] = [
                    'type' => 'max_tim_blok',
                    'field' => 'matkul_anggota_id',
                    'message' => 'Mata kuliah ini sudah memiliki 3 tim blok (Baris '.($index+2).')',
                    'nid' => $rowArray['nid'] ?? null,
                ];
            }

            // 3. Validasi duplikat terhadap database yang sudah ada
            // Gunakan Laravel Validator untuk unique di database
            $dbValidator = Validator::make($rowArray, [
                'nid' => [Rule::unique('users', 'nid')->ignore($originalRowArray['id'] ?? null, 'id')],
                'nidn' => [Rule::unique('users', 'nidn')->ignore($originalRowArray['id'] ?? null, 'id')],
                'username' => [Rule::unique('users', 'username')->ignore($originalRowArray['id'] ?? null, 'id')],
                'email' => ['nullable', Rule::unique('users', 'email')->ignore($originalRowArray['id'] ?? null, 'id')], // Email bisa null tapi kalau ada harus unique dan valid
            ], [
                'nid.unique' => 'NID sudah terdaftar di database (Baris '.($index+2).')',
                'nidn.unique' => 'NIDN sudah terdaftar di database (Baris '.($index+2).')',
                'username.unique' => 'Username sudah terdaftar di database (Baris '.($index+2).')',
                'email.unique' => 'Email sudah terdaftar di database (Baris '.($index+2).')',
                'email.email' => 'Email tidak valid (Baris '.($index+2).')',
            ]);

            if ($dbValidator->fails()) {
                foreach ($dbValidator->errors()->messages() as $field => $messages) {
                    foreach ($messages as $message) {
                        $excelFieldName = $field;
                        if ($field === 'name') $excelFieldName = 'nama';
                        if ($field === 'telp') $excelFieldName = 'telepon';
                        if ($field === 'peran_kurikulum') $excelFieldName = 'peran_dalam_kurikulum';

                        $currentRowErrors[] = [
                            'type' => 'duplicate_in_db',
                            'field' => $excelFieldName,
                            'message' => $message,
                            'nid' => $rowArray['nid'] ?? null,
                        ];
                    }
                }
            }

            // Jika ada error pada baris ini, tambahkan ke daftar error global dan skip baris
            if (!empty($currentRowErrors)) {
                foreach ($currentRowErrors as $error) {
                    $this->errors[] = $error['message'];
                    $this->cellErrors[] = [
                        'row' => $index,
                        'field' => $error['field'],
                        'message' => $error['message'],
                        'nid' => $error['nid'],
                    ];
                }
                $this->failedRows[] = $originalRowArray;
                continue; // Lanjut ke baris berikutnya di Excel
            }

            // Simpan data jika semua validasi berhasil
            User::create([
                'nid' => $rowArray['nid'],
                'nidn' => $rowArray['nidn'],
                'name' => $rowArray['name'],
                'username' => $rowArray['username'],
                'email' => $rowArray['email'],
                'telp' => $rowArray['telp'],
                'password' => Hash::make($rowArray['password']),
                'role' => 'dosen',
                'kompetensi' => $rowArray['kompetensi'],
                'peran_kurikulum' => $rowArray['peran_kurikulum'],
                'peran_utama' => $rowArray['peran_utama'],
                'matkul_ketua_id' => $rowArray['matkul_ketua_id'],
                'matkul_anggota_id' => $rowArray['matkul_anggota_id'],
                'peran_kurikulum_mengajar' => $rowArray['peran_kurikulum_mengajar'],
            ]);
        }
    }

    public function getErrors()
    {
        return array_unique($this->errors); // Pastikan error unik
    }

    public function getFailedRows()
    {
        return $this->failedRows;
    }

    public function getCellErrors()
    {
        return $this->cellErrors;
    }
}
