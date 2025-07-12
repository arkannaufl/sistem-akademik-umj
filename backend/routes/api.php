<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RuanganController;
use App\Http\Controllers\MataKuliahController;
use App\Http\Controllers\KegiatanController;
use App\Http\Controllers\ReportingController;
use App\Http\Controllers\TahunAjaranController;
use App\Http\Controllers\MataKuliahCSRController;
use App\Http\Controllers\MataKuliahPBLController;
use App\Http\Controllers\CSRController;
use App\Http\Controllers\KelompokBesarController;
use App\Http\Controllers\KelompokKecilController;
use App\Http\Controllers\KelasController;
use App\Http\Controllers\MataKuliahPBLKelompokKecilController;


Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});

Route::middleware('auth:sanctum')->put('/profile', [AuthController::class, 'updateProfile']);

Route::middleware('auth:sanctum')->post('/profile/avatar', [AuthController::class, 'updateAvatar']);

Route::middleware('auth:sanctum')->apiResource('users', \App\Http\Controllers\UserController::class);

Route::middleware('auth:sanctum')->post('/users/import-dosen', [UserController::class, 'importDosen']);

Route::middleware('auth:sanctum')->post('/users/import-mahasiswa', [UserController::class, 'importMahasiswa']);

Route::middleware('auth:sanctum')->post('/users/import-tim-akademik', [UserController::class, 'importTimAkademik']);

Route::middleware('auth:sanctum')->post('/ruangan/import', [RuanganController::class, 'importRuangan']);

Route::middleware('auth:sanctum')->post('/mata-kuliah/import', [MataKuliahController::class, 'import']);

Route::get('/mata-kuliah/filter-options', [MataKuliahController::class, 'filterOptions']);

Route::get('/mata-kuliah/peran-kurikulum-options', [MataKuliahController::class, 'peranKurikulumOptions']);

Route::middleware('auth:sanctum')->apiResource('ruangan', RuanganController::class);

Route::middleware('auth:sanctum')->apiResource('mata-kuliah', MataKuliahController::class);
Route::middleware('auth:sanctum')->put('/mata-kuliah/{kode}/keahlian', [MataKuliahController::class, 'updateKeahlian']);
Route::middleware('auth:sanctum')->get('/mata-kuliah/{kode}/keahlian', [MataKuliahController::class, 'getKeahlian']);
Route::middleware('auth:sanctum')->get('/mata-kuliah/semester/{semester}', [MataKuliahController::class, 'getBySemester']);

Route::middleware('auth:sanctum')->apiResource('kegiatan', KegiatanController::class);

// Reporting routes
Route::middleware('auth:sanctum')->prefix('reporting')->group(function () {
    Route::get('/', [ReportingController::class, 'index']);
    Route::get('/summary', [ReportingController::class, 'summary']);
    Route::get('/export', [ReportingController::class, 'export']);
    Route::get('/dosen-csr', [ReportingController::class, 'dosenCsrReport']);
});

Route::middleware('auth:sanctum')->group(function () {
    // Tahun Ajaran Routes
    Route::get('/tahun-ajaran', [TahunAjaranController::class, 'index']);
    Route::post('/tahun-ajaran', [TahunAjaranController::class, 'store']);
    Route::delete('/tahun-ajaran/{tahunAjaran}', [TahunAjaranController::class, 'destroy']);
    Route::post('/tahun-ajaran/{tahunAjaran}/activate', [TahunAjaranController::class, 'activate']);
    Route::post('/semesters/{semester}/activate', [TahunAjaranController::class, 'activateSemester']);
    Route::get('/tahun-ajaran/active', [App\Http\Controllers\TahunAjaranController::class, 'active']);
    Route::get('/tahun-ajaran/available-semesters', [TahunAjaranController::class, 'getAvailableSemesters']);

    Route::post('kegiatan-akademik-mahasiswa', [MataKuliahController::class, 'getMataKuliahMahasiswa']);
    Route::post('pilih-mata-kuliah', [MataKuliahController::class, 'pilihMataKuliah']);

    Route::apiResource('mata-kuliah.csrs', MataKuliahCSRController::class)->shallow();
    Route::get('/pbls/all', [MataKuliahPBLController::class, 'all']);
    Route::apiResource('mata-kuliah.pbls', MataKuliahPBLController::class)->shallow();

    // CSR Routes
    Route::apiResource('csr', CSRController::class);
    Route::get('/csr-mappings', [CSRController::class, 'getMappings']);
    Route::post('/csr-mappings', [CSRController::class, 'createMapping']);
    Route::delete('/csr-mappings/{mappingId}', [CSRController::class, 'removeMapping']);
    Route::get('/csr/{csrId}/available-dosen', [CSRController::class, 'getAvailableDosen']);
    Route::get('/csrs', [CSRController::class, 'batch']);

    Route::post('/pbls/assign-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'assignDosenBatch']);
    Route::post('/pbls/reset-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'resetDosenBatch']);
});

Route::get('/kelompok-besar', [KelompokBesarController::class, 'index']);
Route::get('/kelompok-besar/semester/{semesterId}', [KelompokBesarController::class, 'getBySemesterId']);
Route::post('/kelompok-besar', [KelompokBesarController::class, 'store']);
Route::delete('/kelompok-besar/{id}', [KelompokBesarController::class, 'destroy']);
Route::post('/kelompok-besar/batch-by-semester', [\App\Http\Controllers\KelompokBesarController::class, 'batchBySemester']);

Route::get('/kelompok-kecil', [KelompokKecilController::class, 'index']);
Route::post('/kelompok-kecil', [KelompokKecilController::class, 'store']);
Route::post('/kelompok-kecil/single', [KelompokKecilController::class, 'createSingle']);
Route::put('/kelompok-kecil/{id}', [KelompokKecilController::class, 'update']);
Route::delete('/kelompok-kecil/{id}', [KelompokKecilController::class, 'destroy']);
Route::get('/kelompok-kecil/stats', [KelompokKecilController::class, 'stats']);
Route::post('/kelompok-kecil/batch-update', [App\Http\Controllers\KelompokKecilController::class, 'batchUpdate']);
Route::get('/kelompok-kecil/by-nama', [KelompokKecilController::class, 'getByNama']);
Route::get('/kelompok-kecil/{id}/mahasiswa', [KelompokKecilController::class, 'getMahasiswa']);
Route::get('/kelompok-kecil/{id}', [KelompokKecilController::class, 'show']);
Route::post('/kelompok-kecil/batch-by-semester', [\App\Http\Controllers\KelompokKecilController::class, 'batchBySemester']);

Route::get('/kelas', [KelasController::class, 'index']);
Route::get('/kelas/semester/{semester}', [KelasController::class, 'getBySemester']);
Route::get('/kelas/semester-id/{semesterId}', [KelasController::class, 'getBySemesterId']);
Route::post('/kelas', [KelasController::class, 'store']);
Route::get('/kelas/{id}', [KelasController::class, 'show']);
Route::put('/kelas/{id}', [KelasController::class, 'update']);
Route::delete('/kelas/{id}', [KelasController::class, 'destroy']);

// PBL Kelompok Kecil Routes
Route::post('/mata-kuliah/{kode}/pbl-kelompok-kecil', [MataKuliahPBLKelompokKecilController::class, 'store']);
Route::get('/pbl-kelompok-kecil/available', [MataKuliahPBLKelompokKecilController::class, 'getAvailableKelompok']);
Route::get('/pbl-kelompok-kecil/all-with-status', [MataKuliahPBLKelompokKecilController::class, 'getAllKelompokWithStatus']);
Route::delete('/mata-kuliah/{kode}/pbl-kelompok-kecil', [MataKuliahPBLKelompokKecilController::class, 'destroyMapping']);
Route::get('/pbl-kelompok-kecil/list', [MataKuliahPBLKelompokKecilController::class, 'listKelompokWithStatus']);

// Batch mapping kelompok kecil untuk banyak mata kuliah sekaligus
Route::post('/mata-kuliah/pbl-kelompok-kecil/batch', [\App\Http\Controllers\MataKuliahPBLKelompokKecilController::class, 'batchMapping']);
// Batch mapping kelompok kecil untuk banyak semester sekaligus
Route::post('/mata-kuliah/pbl-kelompok-kecil/batch-multi-semester', [\App\Http\Controllers\MataKuliahPBLKelompokKecilController::class, 'batchMappingMultiSemester']);
// Batch detail kelompok kecil berdasarkan array nama_kelompok dan semester
Route::post('/kelompok-kecil/batch-detail', [\App\Http\Controllers\KelompokKecilController::class, 'batchDetail']);

// Assignment dosen ke PBL
Route::post('/pbls/{pbl}/assign-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'assignDosen']);
Route::delete('/pbls/{pbl}/unassign-dosen/{dosen}', [App\Http\Controllers\MataKuliahPBLController::class, 'unassignDosen']);
Route::get('/pbls/{pbl}/assigned-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'assignedDosen']);
Route::post('/pbls/assigned-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'assignedDosenBatch']);
Route::post('/pbls/reset-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'resetDosenBatch']);
Route::delete('/pbls/{pbl}/reset-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'resetDosen']);
