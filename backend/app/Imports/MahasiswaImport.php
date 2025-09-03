<?php

namespace App\Imports;

use App\Models\User;
use App\Services\SemesterService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MahasiswaImport implements ToCollection, WithHeadingRow
{
    private $errors = [];
    private $failedRows = [];
    private $cellErrors = [];
    private $seenNimsInFile = [];
    private $seenUsernamesInFile = [];
    private $seenEmailsInFile = [];
    private $semesterService;

    public function __construct(SemesterService $semesterService)
    {
        $this->semesterService = $semesterService;
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $originalRowArray = $row->toArray();
            $rowArray = $originalRowArray;
            $rowArray['name'] = $originalRowArray['nama'] ?? null;
            $rowArray['telp'] = $originalRowArray['telepon'] ?? null;

            $currentRowErrors = [];

            // Basic validation
            $basicValidator = Validator::make($rowArray, [
                'nim' => 'required|numeric',
                'name' => 'required',
                'username' => 'required',
                'email' => 'required|email',
                'telp' => 'required',
                'password' => 'required|min:6',
                'gender' => 'required|in:Laki-laki,Perempuan',
                'ipk' => 'required|numeric|min:0|max:4',
                'status' => 'required|in:aktif,cuti,lulus,keluar',
                'angkatan' => 'required|numeric',
            ], [
                'nim.required' => 'NIM harus diisi (Baris '.($index+2).')',
                'nim.numeric' => 'NIM harus berupa angka (Baris '.($index+2).')',
                'name.required' => 'Nama harus diisi (Baris '.($index+2).')',
                'username.required' => 'Username harus diisi (Baris '.($index+2).')',
                'email.required' => 'Email harus diisi (Baris '.($index+2).')',
                'email.email' => 'Email tidak valid (Baris '.($index+2).')',
                'telp.required' => 'Nomor telepon harus diisi (Baris '.($index+2).')',
                'password.required' => 'Password harus diisi (Baris '.($index+2).')',
                'password.min' => 'Password minimal 6 karakter (Baris '.($index+2).')',
                'gender.required' => 'Gender harus diisi (Baris '.($index+2).')',
                'gender.in' => 'Gender harus Laki-laki atau Perempuan (Baris '.($index+2).')',
                'ipk.required' => 'IPK harus diisi (Baris '.($index+2).')',
                'ipk.numeric' => 'IPK harus berupa angka (Baris '.($index+2).')',
                'ipk.min' => 'IPK minimal 0 (Baris '.($index+2).')',
                'ipk.max' => 'IPK maksimal 4 (Baris '.($index+2).')',
                'status.required' => 'Status harus diisi (Baris '.($index+2).')',
                'status.in' => 'Status harus aktif, cuti, lulus, atau keluar (Baris '.($index+2).')',
                'angkatan.required' => 'Angkatan harus diisi (Baris '.($index+2).')',
                'angkatan.numeric' => 'Angkatan harus berupa angka (Baris '.($index+2).')',
            ]);

            if ($basicValidator->fails()) {
                foreach ($basicValidator->errors()->messages() as $field => $messages) {
                    foreach ($messages as $message) {
                        $excelFieldName = $field;
                        if ($field === 'name') $excelFieldName = 'nama';
                        if ($field === 'telp') $excelFieldName = 'telepon';
                        $currentRowErrors[] = [
                            'type' => 'required_or_min',
                            'field' => $excelFieldName,
                            'message' => $message,
                            'nim' => $rowArray['nim'] ?? null,
                        ];
                    }
                }
            }

            // Duplicate in file
            if (isset($rowArray['nim']) && trim($rowArray['nim']) !== '') {
                if (in_array(trim($rowArray['nim']), $this->seenNimsInFile)) {
                    $currentRowErrors[] = [
                        'type' => 'duplicate_in_file',
                        'field' => 'nim',
                        'message' => "NIM '{$rowArray['nim']}' sudah terdaftar dalam file ini (Baris ".($index+2).')',
                        'nim' => $rowArray['nim'] ?? null,
                    ];
                } else {
                    $this->seenNimsInFile[] = trim($rowArray['nim']);
                }
            }
            if (isset($rowArray['username']) && trim($rowArray['username']) !== '') {
                if (in_array(trim($rowArray['username']), $this->seenUsernamesInFile)) {
                    $currentRowErrors[] = [
                        'type' => 'duplicate_in_file',
                        'field' => 'username',
                        'message' => "Username '{$rowArray['username']}' sudah terdaftar dalam file ini (Baris ".($index+2).')',
                        'nim' => $rowArray['nim'] ?? null,
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
                        'nim' => $rowArray['nim'] ?? null,
                    ];
                } else {
                    $this->seenEmailsInFile[] = trim($rowArray['email']);
                }
            }

            // Duplicate in DB
            $dbValidator = Validator::make($rowArray, [
                'nim' => [Rule::unique('users', 'nim')->ignore($originalRowArray['id'] ?? null, 'id')],
                'username' => [Rule::unique('users', 'username')->ignore($originalRowArray['id'] ?? null, 'id')],
                'email' => ['nullable', Rule::unique('users', 'email')->ignore($originalRowArray['id'] ?? null, 'id')],
            ], [
                'nim.unique' => 'NIM sudah terdaftar di database (Baris '.($index+2).')',
                'username.unique' => 'Username sudah terdaftar di database (Baris '.($index+2).')',
                'email.unique' => 'Email sudah terdaftar di database (Baris '.($index+2).')',
            ]);

            if ($dbValidator->fails()) {
                foreach ($dbValidator->errors()->messages() as $field => $messages) {
                    foreach ($messages as $message) {
                        $excelFieldName = $field;
                        if ($field === 'name') $excelFieldName = 'nama';
                        if ($field === 'telp') $excelFieldName = 'telepon';
                        $currentRowErrors[] = [
                            'type' => 'duplicate_in_db',
                            'field' => $excelFieldName,
                            'message' => $message,
                            'nim' => $rowArray['nim'] ?? null,
                        ];
                    }
                }
            }

            if (!empty($currentRowErrors)) {
                foreach ($currentRowErrors as $error) {
                    $this->errors[] = $error['message'];
                    $this->cellErrors[] = [
                        'row' => $index,
                        'field' => $error['field'],
                        'message' => $error['message'],
                        'nim' => $error['nim'],
                    ];
                }
                $this->failedRows[] = $originalRowArray;
                continue;
            }

            // Save if valid
            $user = User::create([
                'nim' => $rowArray['nim'],
                'name' => $rowArray['name'],
                'username' => $rowArray['username'],
                'email' => $rowArray['email'],
                'telp' => $rowArray['telp'],
                'password' => Hash::make($rowArray['password']),
                'gender' => $rowArray['gender'],
                'ipk' => $rowArray['ipk'],
                'status' => $rowArray['status'],
                'angkatan' => $rowArray['angkatan'],
                'role' => 'mahasiswa',
                'semester' => $rowArray['semester'] ?? null,
            ]);

            // Update semester berdasarkan semester aktif
            $this->semesterService->updateNewStudentSemester($user);
        }
    }

    public function getErrors()
    {
        return array_unique($this->errors);
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