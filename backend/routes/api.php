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
use App\Http\Controllers\JadwalKuliahBesarController;
use App\Http\Controllers\JadwalCSRController;
use App\Http\Controllers\JadwalNonBlokNonCSRController;


Route::post('/login', [AuthController::class, 'login']);
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthorized'], 401);
});

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

// Route untuk laporan jadwal mengajar dosen
Route::middleware('auth:sanctum')->get('/users/{id}/jadwal-mengajar', [UserController::class, 'getJadwalMengajar']);

Route::middleware('auth:sanctum')->post('/ruangan/import', [RuanganController::class, 'importRuangan']);

Route::middleware('auth:sanctum')->post('/mata-kuliah/import', [MataKuliahController::class, 'import']);

Route::get('/mata-kuliah/filter-options', [MataKuliahController::class, 'filterOptions']);

Route::get('/mata-kuliah/peran-kurikulum-options', [MataKuliahController::class, 'peranKurikulumOptions']);

Route::get('/mata-kuliah/keahlian-options', [MataKuliahController::class, 'keahlianOptions']);

Route::middleware('auth:sanctum')->get('/ruangan/by-capacity', [RuanganController::class, 'getRuanganByCapacity']);
Route::middleware('auth:sanctum')->get('/ruangan/options', [RuanganController::class, 'getRuanganOptions']);
Route::middleware('auth:sanctum')->apiResource('ruangan', RuanganController::class);

Route::middleware('auth:sanctum')->apiResource('mata-kuliah', MataKuliahController::class);
Route::middleware('auth:sanctum')->get('/mata-kuliah-with-materi', [MataKuliahController::class, 'getWithMateri']);
Route::middleware('auth:sanctum')->get('/mata-kuliah-with-materi-all', [MataKuliahController::class, 'getWithMateriAll']);
Route::middleware('auth:sanctum')->put('/mata-kuliah/{kode}/keahlian', [MataKuliahController::class, 'updateKeahlian']);
Route::middleware('auth:sanctum')->get('/mata-kuliah/{kode}/keahlian', [MataKuliahController::class, 'getKeahlian']);
Route::middleware('auth:sanctum')->get('/mata-kuliah/semester/{semester}', [MataKuliahController::class, 'getBySemester']);

// RPS Routes
Route::middleware('auth:sanctum')->post('/mata-kuliah/upload-rps', [MataKuliahController::class, 'uploadRps']);
Route::middleware('auth:sanctum')->get('/mata-kuliah/{kode}/download-rps', [MataKuliahController::class, 'downloadRps']);
Route::middleware('auth:sanctum')->delete('/mata-kuliah/{kode}/delete-rps', [MataKuliahController::class, 'deleteRps']);

// Materi Routes
Route::middleware('auth:sanctum')->post('/mata-kuliah/upload-materi', [MataKuliahController::class, 'uploadMateri']);
Route::middleware('auth:sanctum')->get('/mata-kuliah/{kode}/materi', [MataKuliahController::class, 'getMateri']);
Route::middleware('auth:sanctum')->get('/mata-kuliah/{kode}/download-materi', [MataKuliahController::class, 'downloadMateri']);
Route::middleware('auth:sanctum')->delete('/mata-kuliah/{kode}/delete-materi', [MataKuliahController::class, 'deleteMateri']);
Route::middleware('auth:sanctum')->put('/mata-kuliah/{kode}/update-materi-judul', [MataKuliahController::class, 'updateMateriJudul']);

Route::middleware('auth:sanctum')->apiResource('kegiatan', KegiatanController::class);

// Reporting routes
Route::middleware('auth:sanctum')->prefix('reporting')->group(function () {
    Route::get('/', [ReportingController::class, 'index']);
    Route::get('/summary', [ReportingController::class, 'summary']);
    Route::get('/export', [ReportingController::class, 'export']);
    Route::get('/dosen-csr', [ReportingController::class, 'dosenCsrReport']);
    Route::get('/dosen-pbl', [ReportingController::class, 'dosenPblReport']);
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
    Route::get('/pbls', [MataKuliahPBLController::class, 'getAllPbls']);
    Route::apiResource('mata-kuliah.pbls', MataKuliahPBLController::class)->shallow();

    // CSR Routes
    Route::apiResource('csr', CSRController::class);
    Route::get('/csrs', [CSRController::class, 'batch']);
    Route::get('/csr/{csr}/mappings', [\App\Http\Controllers\CSRMappingController::class, 'index']);
    Route::post('/csr/{csr}/mappings', [\App\Http\Controllers\CSRMappingController::class, 'store']);
    Route::delete('/csr/{csr}/mappings/{dosen}/{keahlian}', [\App\Http\Controllers\CSRMappingController::class, 'destroy']);

    Route::get('/pbls/check-blok/{blokId}', [App\Http\Controllers\MataKuliahPBLController::class, 'checkBlokGenerated']);
    Route::post('/pbls/assign-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'assignDosenBatch']);
    Route::post('/pbls/reset-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'resetDosenBatch']);
    
    // Assignment dosen ke PBL
    Route::post('/pbls/{pbl}/assign-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'assignDosen']);
    Route::delete('/pbls/{pbl}/unassign-dosen/{dosen}', [App\Http\Controllers\MataKuliahPBLController::class, 'unassignDosen']);
    Route::get('/pbls/{pbl}/assigned-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'assignedDosen']);
    Route::post('/pbls/assigned-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'assignedDosenBatch']);
    Route::delete('/pbls/{pbl}/reset-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'resetDosen']);
    
    // Get PBL assignments for specific dosen
    Route::get('/dosen/{dosenId}/pbl-assignments', [App\Http\Controllers\MataKuliahPBLController::class, 'getDosenPBLAssignments']);
    
    // Admin notification tracking routes (MUST come BEFORE parameterized routes)
    Route::middleware(['auth:sanctum', 'role:super_admin'])->get('/notifications/admin/all', [App\Http\Controllers\NotificationController::class, 'getAllNotificationsForAdmin']);
    Route::middleware(['auth:sanctum', 'role:super_admin'])->get('/notifications/admin/stats', [App\Http\Controllers\NotificationController::class, 'getNotificationStats']);
    
    // Notification routes - Allow both super_admin and dosen to access their respective endpoints
    Route::middleware(['auth:sanctum'])->get('/notifications/dosen/{userId}', [App\Http\Controllers\NotificationController::class, 'getUserNotifications']);
    Route::middleware(['auth:sanctum', 'role:super_admin'])->get('/notifications/admin/{userId}', [App\Http\Controllers\NotificationController::class, 'getAdminNotifications']);
    Route::middleware(['auth:sanctum', 'sanitize'])->put('/notifications/{notificationId}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead']);
    Route::middleware(['auth:sanctum'])->put('/notifications/dosen/{userId}/mark-all-read', [App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
    Route::middleware(['auth:sanctum', 'role:super_admin'])->put('/notifications/admin/{userId}/mark-all-read', [App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
    Route::middleware(['auth:sanctum'])->get('/notifications/dosen/{userId}/unread-count', [App\Http\Controllers\NotificationController::class, 'getUnreadCount']);
    Route::middleware(['auth:sanctum', 'role:super_admin'])->get('/notifications/admin/{userId}/unread-count', [App\Http\Controllers\NotificationController::class, 'getUnreadCount']);
    Route::middleware(['auth:sanctum'])->delete('/notifications/dosen/{userId}/clear-all', [App\Http\Controllers\NotificationController::class, 'clearAllNotifications']);
    Route::middleware(['auth:sanctum', 'role:super_admin'])->delete('/notifications/admin/{userId}/clear-all', [App\Http\Controllers\NotificationController::class, 'clearAllNotifications']);
    Route::middleware(['auth:sanctum', 'sanitize'])->delete('/notifications/{notificationId}', [App\Http\Controllers\NotificationController::class, 'deleteNotification']);
});

Route::middleware('auth:sanctum')->get('/kelompok-besar', [KelompokBesarController::class, 'index']);
Route::middleware('auth:sanctum')->get('/kelompok-besar/semester/{semesterId}', [KelompokBesarController::class, 'getBySemesterId']);
Route::middleware('auth:sanctum')->post('/kelompok-besar', [KelompokBesarController::class, 'store']);
Route::middleware('auth:sanctum')->delete('/kelompok-besar/{id}', [KelompokBesarController::class, 'destroy']);
Route::middleware('auth:sanctum')->post('/kelompok-besar/batch-by-semester', [\App\Http\Controllers\KelompokBesarController::class, 'batchBySemester']);

Route::middleware('auth:sanctum')->get('/kelompok-kecil', [KelompokKecilController::class, 'index']);
Route::middleware('auth:sanctum')->post('/kelompok-kecil', [KelompokKecilController::class, 'store']);
Route::middleware('auth:sanctum')->post('/kelompok-kecil/single', [KelompokKecilController::class, 'createSingle']);
Route::middleware('auth:sanctum')->put('/kelompok-kecil/{id}', [KelompokKecilController::class, 'update']);
Route::middleware('auth:sanctum')->delete('/kelompok-kecil/{id}', [KelompokKecilController::class, 'destroy']);
Route::middleware('auth:sanctum')->get('/kelompok-kecil/stats', [KelompokKecilController::class, 'stats']);
Route::middleware('auth:sanctum')->post('/kelompok-kecil/batch-update', [App\Http\Controllers\KelompokKecilController::class, 'batchUpdate']);
Route::middleware('auth:sanctum')->get('/kelompok-kecil/by-nama', [KelompokKecilController::class, 'getByNama']);
Route::middleware('auth:sanctum')->get('/kelompok-kecil/{id}/mahasiswa', [KelompokKecilController::class, 'getMahasiswa']);
Route::middleware('auth:sanctum')->get('/kelompok-kecil/{id}', [KelompokKecilController::class, 'show']);
Route::middleware('auth:sanctum')->post('/kelompok-kecil/batch-by-semester', [\App\Http\Controllers\KelompokKecilController::class, 'batchBySemester']);

Route::middleware('auth:sanctum')->get('/kelas', [KelasController::class, 'index']);
Route::middleware('auth:sanctum')->get('/kelas/semester/{semester}', [KelasController::class, 'getBySemester']);
Route::middleware('auth:sanctum')->get('/kelas/semester-id/{semesterId}', [KelasController::class, 'getBySemesterId']);
Route::middleware('auth:sanctum')->post('/kelas', [KelasController::class, 'store']);
Route::middleware('auth:sanctum')->get('/kelas/{id}', [KelasController::class, 'show']);
Route::middleware('auth:sanctum')->put('/kelas/{id}', [KelasController::class, 'update']);
Route::middleware('auth:sanctum')->delete('/kelas/{id}', [KelasController::class, 'destroy']);

// PBL Kelompok Kecil Routes
Route::middleware('auth:sanctum')->post('/mata-kuliah/{kode}/pbl-kelompok-kecil', [MataKuliahPBLKelompokKecilController::class, 'store']);
Route::middleware('auth:sanctum')->get('/pbl-kelompok-kecil/available', [MataKuliahPBLKelompokKecilController::class, 'getAvailableKelompok']);
Route::middleware('auth:sanctum')->get('/pbl-kelompok-kecil/all-with-status', [MataKuliahPBLKelompokKecilController::class, 'getAllKelompokWithStatus']);
Route::middleware('auth:sanctum')->delete('/mata-kuliah/{kode}/pbl-kelompok-kecil', [MataKuliahPBLKelompokKecilController::class, 'destroyMapping']);
Route::middleware('auth:sanctum')->get('/pbl-kelompok-kecil/list', [MataKuliahPBLKelompokKecilController::class, 'listKelompokWithStatus']);

// Batch mapping kelompok kecil untuk banyak mata kuliah sekaligus
Route::middleware('auth:sanctum')->post('/mata-kuliah/pbl-kelompok-kecil/batch', [\App\Http\Controllers\MataKuliahPBLKelompokKecilController::class, 'batchMapping']);
// Batch mapping kelompok kecil untuk banyak semester sekaligus
Route::middleware('auth:sanctum')->post('/mata-kuliah/pbl-kelompok-kecil/batch-multi-semester', [\App\Http\Controllers\MataKuliahPBLKelompokKecilController::class, 'batchMappingMultiSemester']);
// Batch detail kelompok kecil berdasarkan array nama_kelompok dan semester
Route::middleware('auth:sanctum')->post('/kelompok-kecil/batch-detail', [\App\Http\Controllers\KelompokKecilController::class, 'batchDetail']);

// Assignment dosen ke PBL
Route::middleware('auth:sanctum')->post('/pbls/{pbl}/assign-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'assignDosen']);
Route::middleware('auth:sanctum')->delete('/pbls/{pbl}/unassign-dosen/{dosen}', [App\Http\Controllers\MataKuliahPBLController::class, 'unassignDosen']);
Route::middleware('auth:sanctum')->get('/pbls/{pbl}/assigned-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'assignedDosen']);
Route::middleware('auth:sanctum')->post('/pbls/assigned-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'assignedDosenBatch']);
Route::middleware('auth:sanctum')->post('/pbls/reset-dosen-batch', [App\Http\Controllers\MataKuliahPBLController::class, 'resetDosenBatch']);
Route::middleware('auth:sanctum')->delete('/pbls/{pbl}/reset-dosen', [App\Http\Controllers\MataKuliahPBLController::class, 'resetDosen']);

Route::middleware('auth:sanctum')->prefix('mata-kuliah/{kode}')->group(function () {
    Route::apiResource('jadwal-pbl', App\Http\Controllers\JadwalPBLController::class)->parameters([
        'jadwal-pbl' => 'id'
    ]);
    
    // Batch endpoint untuk DetailBlok page optimization
    Route::get('/batch-data', [App\Http\Controllers\DetailBlokController::class, 'getBatchData']);
});

// Jadwal PBL untuk dosen
Route::middleware('auth:sanctum')->get('/jadwal-pbl/dosen/{dosenId}', [App\Http\Controllers\JadwalPBLController::class, 'getJadwalForDosen']);
Route::middleware('auth:sanctum')->post('/jadwal-pbl/{jadwalId}/konfirmasi', [App\Http\Controllers\JadwalPBLController::class, 'konfirmasiJadwal']);

Route::middleware('auth:sanctum')->prefix('mata-kuliah/{kode}/kelompok/{kelompok}/pertemuan/{pertemuan}')->group(function () {
    Route::get('penilaian-pbl', [App\Http\Controllers\PenilaianPBLController::class, 'index']);
    Route::post('penilaian-pbl', [App\Http\Controllers\PenilaianPBLController::class, 'store']);
});

Route::middleware('auth:sanctum')->prefix('kuliah-besar')->group(function () {
    Route::get('/jadwal/{kode}', [JadwalKuliahBesarController::class, 'index']);
    Route::post('/jadwal/{kode}', [JadwalKuliahBesarController::class, 'store']);
    Route::put('/jadwal/{kode}/{id}', [JadwalKuliahBesarController::class, 'update']);
    Route::delete('/jadwal/{kode}/{id}', [JadwalKuliahBesarController::class, 'destroy']);
    Route::get('/materi', [JadwalKuliahBesarController::class, 'materi']);
    Route::get('/pengampu', [JadwalKuliahBesarController::class, 'pengampu']);
    Route::get('/kelompok-besar', [JadwalKuliahBesarController::class, 'kelompokBesar']);
});

Route::middleware('auth:sanctum')->prefix('agenda-khusus')->group(function () {
    Route::get('/jadwal/{kode}', [App\Http\Controllers\JadwalAgendaKhususController::class, 'index']);
    Route::post('/jadwal/{kode}', [App\Http\Controllers\JadwalAgendaKhususController::class, 'store']);
    Route::put('/jadwal/{kode}/{id}', [App\Http\Controllers\JadwalAgendaKhususController::class, 'update']);
    Route::delete('/jadwal/{kode}/{id}', [App\Http\Controllers\JadwalAgendaKhususController::class, 'destroy']);
    Route::get('/kelompok-besar', [App\Http\Controllers\JadwalAgendaKhususController::class, 'kelompokBesar']);
});

Route::middleware('auth:sanctum')->prefix('praktikum')->group(function () {
    Route::get('/jadwal/{kode}', [App\Http\Controllers\JadwalPraktikumController::class, 'index']);
    Route::post('/jadwal/{kode}', [App\Http\Controllers\JadwalPraktikumController::class, 'store']);
    Route::put('/jadwal/{kode}/{id}', [App\Http\Controllers\JadwalPraktikumController::class, 'update']);
    Route::delete('/jadwal/{kode}/{id}', [App\Http\Controllers\JadwalPraktikumController::class, 'destroy']);
    Route::get('/kelas/{semester}', [App\Http\Controllers\JadwalPraktikumController::class, 'getKelasPraktikum']);
    Route::get('/materi/{blok}/{semester}', [App\Http\Controllers\JadwalPraktikumController::class, 'getMateri']);
    Route::get('/pengampu/{keahlian}/{blok}/{semester}', [App\Http\Controllers\JadwalPraktikumController::class, 'getPengampu']);
});

Route::middleware('auth:sanctum')->prefix('jurnal-reading')->group(function () {
    Route::get('/jadwal/{kode}', [App\Http\Controllers\JadwalJurnalReadingController::class, 'index']);
    Route::post('/jadwal/{kode}', [App\Http\Controllers\JadwalJurnalReadingController::class, 'store']);
    Route::put('/jadwal/{kode}/{id}', [App\Http\Controllers\JadwalJurnalReadingController::class, 'update']);
    Route::delete('/jadwal/{kode}/{id}', [App\Http\Controllers\JadwalJurnalReadingController::class, 'destroy']);
});

// Route download tanpa auth untuk memudahkan akses file
Route::get('/jurnal-reading/download/{kode}/{id}', [App\Http\Controllers\JadwalJurnalReadingController::class, 'downloadFile'])->name('jurnal.download');

// Route test untuk debugging
Route::get('/test-jurnal-download', function() {
    return response()->json([
        'message' => 'Route test berhasil',
        'timestamp' => now(),
        'storage_path' => storage_path('app/public/jurnal_reading')
    ]);
});

// Reference data endpoints untuk CSR
Route::middleware('auth:sanctum')->get('/dosen-options', [JadwalCSRController::class, 'getDosenOptions']);
Route::middleware('auth:sanctum')->get('/ruangan-options', [JadwalCSRController::class, 'getRuanganOptions']);
Route::middleware('auth:sanctum')->get('/kelompok-options', [JadwalCSRController::class, 'getKelompokOptions']);
Route::middleware('auth:sanctum')->get('/kategori-options', [JadwalCSRController::class, 'getKategoriOptions']);
Route::middleware('auth:sanctum')->get('/jam-options', [JadwalCSRController::class, 'getJamOptions']);

// Reference data endpoints untuk Non-Blok Non-CSR
Route::middleware('auth:sanctum')->get('/non-blok-non-csr-dosen-options', [JadwalNonBlokNonCSRController::class, 'getDosenOptions']);
Route::middleware('auth:sanctum')->get('/non-blok-non-csr-ruangan-options', [JadwalNonBlokNonCSRController::class, 'getRuanganOptions']);
Route::middleware('auth:sanctum')->get('/non-blok-non-csr-jam-options', [JadwalNonBlokNonCSRController::class, 'getJamOptions']);

// Jadwal CSR routes (dalam prefix untuk menghindari konflik)
Route::middleware('auth:sanctum')->prefix('csr')->group(function () {
    Route::get('/jadwal/{kode}', [JadwalCSRController::class, 'index']);
    Route::post('/jadwal/{kode}', [JadwalCSRController::class, 'store']);
    Route::put('/jadwal/{kode}/{id}', [JadwalCSRController::class, 'update']);
    Route::delete('/jadwal/{kode}/{id}', [JadwalCSRController::class, 'destroy']);
});

// Batch endpoint untuk DetailNonBlokCSR page optimization
Route::middleware('auth:sanctum')->get('/csr/{kode}/batch-data', [App\Http\Controllers\DetailNonBlokCSRController::class, 'getBatchData']);

// Batch endpoint untuk DetailNonBlokNonCSR page optimization
Route::middleware('auth:sanctum')->get('/non-blok-non-csr/{kode}/batch-data', [App\Http\Controllers\DetailNonBlokNonCSRController::class, 'getBatchData']);

// Batch endpoint untuk CSR page optimization
Route::middleware('auth:sanctum')->get('/csr-batch-data', [App\Http\Controllers\CSRBatchController::class, 'getBatchData']);

// Batch endpoint untuk CSRDetail page optimization
Route::middleware('auth:sanctum')->get('/csr-detail/{csrId}/batch-data', [App\Http\Controllers\CSRDetailBatchController::class, 'getBatchData']);

Route::middleware('auth:sanctum')->prefix('non-blok-non-csr')->group(function () {
    Route::get('/jadwal/{kode}', [JadwalNonBlokNonCSRController::class, 'index']);
    Route::post('/jadwal/{kode}', [JadwalNonBlokNonCSRController::class, 'store']);
    Route::put('/jadwal/{kode}/{id}', [JadwalNonBlokNonCSRController::class, 'update']);
    Route::delete('/jadwal/{kode}/{id}', [JadwalNonBlokNonCSRController::class, 'destroy']);
    Route::get('/kelompok-besar', [JadwalNonBlokNonCSRController::class, 'kelompokBesar']);
});

// Routes untuk penilaian jurnal
Route::middleware('auth:sanctum')->prefix('penilaian-jurnal')->group(function () {
    Route::get('/{kode_blok}/{kelompok}/{jurnal_id}', [App\Http\Controllers\PenilaianJurnalController::class, 'index']);
    Route::post('/{kode_blok}/{kelompok}/{jurnal_id}', [App\Http\Controllers\PenilaianJurnalController::class, 'store']);
    Route::get('/{kode_blok}/{kelompok}/{jurnal_id}/export', [App\Http\Controllers\PenilaianJurnalController::class, 'export']);
});
