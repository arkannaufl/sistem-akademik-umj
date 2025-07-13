<?php

namespace App\Http\Controllers;

use App\Models\CSR;
use App\Models\CSRMapping;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CSRController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $csrs = CSR::with(['dosen', 'mataKuliah'])->get();
            return response()->json(['data' => $csrs]);
        } catch (\Exception $e) {
            Log::error('Error fetching CSR data: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal memuat data CSR'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'mata_kuliah_kode' => 'required|string|exists:mata_kuliah,kode',
                'nomor_csr' => 'required|string|unique:csrs,nomor_csr',
                'nama' => 'required|string',
                'keahlian_required' => 'required|array',
                'keahlian_required.*' => 'string'
            ]);

            // Ambil tanggal dari mata kuliah blok yang sesuai
            $parts = explode('.', $request->nomor_csr);
            $semester = (int) $parts[0];
            $blok = (int) $parts[1];
            
            $mataKuliahBlok = \App\Models\MataKuliah::where('kode', 'MKB' . $semester . '0' . $blok)->first();
            
            if ($mataKuliahBlok) {
                $request->merge([
                    'tanggal_mulai' => $mataKuliahBlok->tanggal_mulai,
                    'tanggal_akhir' => $mataKuliahBlok->tanggal_akhir
                ]);
            }

            $csr = CSR::create($request->all());

            // Log activity
            $this->logActivity('CREATE', 'CSR', "Membuat mata kuliah CSR: {$csr->nama}");

            return response()->json([
                'message' => 'Mata kuliah CSR berhasil ditambahkan',
                'data' => $csr
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal menambahkan mata kuliah CSR'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(CSR $csr)
    {
        try {
            $csr->load('dosen');
            return response()->json(['data' => $csr]);
        } catch (\Exception $e) {
            Log::error('Error fetching CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal memuat data CSR'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CSR $csr)
    {
        try {
            $request->validate([
                'mata_kuliah_kode' => 'required|string|exists:mata_kuliah,kode',
                'nomor_csr' => 'required|string|unique:csrs,nomor_csr,' . $csr->id,
                'nama' => 'required|string',
                'keahlian_required' => 'required|array',
                'keahlian_required.*' => 'string'
            ]);

            // Ambil tanggal dari mata kuliah blok yang sesuai
            $parts = explode('.', $request->nomor_csr);
            $semester = (int) $parts[0];
            $blok = (int) $parts[1];
            
            $mataKuliahBlok = \App\Models\MataKuliah::where('kode', 'MKB' . $semester . '0' . $blok)->first();
            
            if ($mataKuliahBlok) {
                $request->merge([
                    'tanggal_mulai' => $mataKuliahBlok->tanggal_mulai,
                    'tanggal_akhir' => $mataKuliahBlok->tanggal_akhir
                ]);
            }

            // Simpan data lama untuk perbandingan
            $oldData = $csr->toArray();
            $oldName = $csr->nama;
            $oldNomor = $csr->nomor_csr;
            $oldKeahlian = $csr->keahlian_required;

            $csr->update($request->all());

            // Buat deskripsi detail perubahan
            $changes = [];
            
            // Cek perubahan nama
            if ($oldName !== $csr->nama) {
                $oldNameDisplay = $oldName ?: '(kosong)';
                $newNameDisplay = $csr->nama ?: '(kosong)';
                $changes[] = "nama: {$oldNameDisplay} → {$newNameDisplay}";
            }
            
            // Cek perubahan nomor CSR
            if ($oldNomor !== $csr->nomor_csr) {
                $oldNomorDisplay = $oldNomor ?: '(kosong)';
                $newNomorDisplay = $csr->nomor_csr ?: '(kosong)';
                $changes[] = "nomor: {$oldNomorDisplay} → {$newNomorDisplay}";
            }
            
            // Cek perubahan keahlian
            $oldKeahlianStr = is_array($oldKeahlian) ? implode(', ', $oldKeahlian) : $oldKeahlian;
            $newKeahlianStr = is_array($csr->keahlian_required) ? implode(', ', $csr->keahlian_required) : $csr->keahlian_required;
            if ($oldKeahlianStr !== $newKeahlianStr) {
                $oldKeahlianDisplay = $oldKeahlianStr ?: '(kosong)';
                $newKeahlianDisplay = $newKeahlianStr ?: '(kosong)';
                $changes[] = "keahlian: {$oldKeahlianDisplay} → {$newKeahlianDisplay}";
            }

            if (!empty($changes)) {
                $description = "Mengupdate CSR {$csr->nomor_csr} pada {$csr->mata_kuliah_kode} (" . implode(', ', $changes) . ")";
                $this->logActivity('UPDATE', 'CSR', $description);
            }

            return response()->json([
                'message' => 'Mata kuliah CSR berhasil diupdate',
                'data' => $csr
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal mengupdate mata kuliah CSR'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CSR $csr)
    {
        try {
            $csrName = $csr->nama;
            $csr->delete();

            // Log activity
            $this->logActivity('DELETE', 'CSR', "Menghapus mata kuliah CSR: {$csrName}");

            return response()->json(['message' => 'Mata kuliah CSR berhasil dihapus']);
        } catch (\Exception $e) {
            Log::error('Error deleting CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal menghapus mata kuliah CSR'], 500);
        }
    }

    /**
     * Get CSR mappings
     */
    public function getMappings()
    {
        try {
            $mappings = CSRMapping::with(['csr', 'dosen'])->get();
            return response()->json(['data' => $mappings]);
        } catch (\Exception $e) {
            Log::error('Error fetching CSR mappings: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal memuat data mapping CSR'], 500);
        }
    }

    /**
     * Create CSR mapping (assign dosen to CSR)
     */
    public function createMapping(Request $request)
    {
        try {
            $request->validate([
                'csr_id' => 'required|exists:csrs,id',
                'dosen_id' => 'required|exists:users,id'
            ]);

            $csr = CSR::findOrFail($request->csr_id);
            $semester = $csr->semester;
            $blok = $csr->blok;
            // Cari PBL dengan semester dan blok yang sama
            $pbl = \App\Models\PBL::whereHas('mataKuliah', function($q) use ($semester, $blok) {
                $q->where('semester', $semester)->where('blok', $blok);
            })->first();
            if (!$pbl) {
                return response()->json([
                    'message' => 'Tidak ditemukan PBL blok '.$blok.' semester '.$semester.' yang sesuai untuk CSR ini.'
                ], 422);
            }
            $pblMapping = \App\Models\PBLMapping::where('pbl_id', $pbl->id)
                ->where('dosen_id', $request->dosen_id)
                ->first();
            if (!$pblMapping) {
                return response()->json([
                    'message' => 'Dosen ini hanya bisa ditempatkan di CSR '.$csr->nomor_csr.' karena sudah di PBL blok '.$blok.' semester '.$semester
                ], 422);
            }

            // Check if dosen is already assigned to another CSR
            $existingMapping = CSRMapping::where('dosen_id', $request->dosen_id)->first();
            if ($existingMapping) {
                return response()->json([
                    'message' => 'Dosen sudah ditugaskan ke mata kuliah CSR lain'
                ], 422);
            }

            // Check if CSR is already assigned
            $existingCSRMapping = CSRMapping::where('csr_id', $request->csr_id)->first();
            if ($existingCSRMapping) {
                return response()->json([
                    'message' => 'Mata kuliah CSR sudah ditugaskan ke dosen lain'
                ], 422);
            }

            DB::beginTransaction();

            // Create mapping
            $mapping = CSRMapping::create([
                'csr_id' => $request->csr_id,
                'dosen_id' => $request->dosen_id
            ]);

            // Update CSR status
            $csr = CSR::find($request->csr_id);
            $csr->update(['status' => 'assigned']);

            DB::commit();

            // Get dosen name for logging
            $dosen = User::find($request->dosen_id);
            $csrName = $csr->nama;

            // Log activity
            $this->logActivity('CREATE', 'CSR', "Menugaskan dosen {$dosen->name} ke mata kuliah CSR: {$csrName}");

            return response()->json([
                'message' => 'Dosen berhasil ditugaskan',
                'data' => $mapping->load(['csr', 'dosen'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating CSR mapping: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal menugaskan dosen'], 500);
        }
    }

    /**
     * Remove CSR mapping
     */
    public function removeMapping($mappingId)
    {
        try {
            $mapping = CSRMapping::with(['csr', 'dosen'])->findOrFail($mappingId);
            
            $dosenName = $mapping->dosen->name;
            $csrName = $mapping->csr->nama;

            DB::beginTransaction();

            // Update CSR status back to available
            $mapping->csr->update(['status' => 'available']);

            // Delete mapping
            $mapping->delete();

            DB::commit();

            // Log activity
            $this->logActivity('DELETE', 'CSR', "Menghapus penugasan dosen {$dosenName} dari mata kuliah CSR: {$csrName}");

            return response()->json(['message' => 'Penugasan dosen berhasil dihapus']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error removing CSR mapping: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal menghapus penugasan dosen'], 500);
        }
    }

    /**
     * Get available dosen for CSR
     */
    public function getAvailableDosen($csrId)
    {
        try {
            $csr = CSR::findOrFail($csrId);
            $assignedDosenIds = CSRMapping::pluck('dosen_id')->toArray();
            
            $availableDosen = User::where('role', 'dosen')
                ->whereNotIn('id', $assignedDosenIds)
                ->get()
                ->filter(function ($dosen) use ($csr) {
                    $dosenKeahlian = is_array($dosen->keahlian) 
                        ? $dosen->keahlian 
                        : explode(',', $dosen->keahlian);
                    
                    return collect($csr->keahlian_required)
                        ->intersect($dosenKeahlian)
                        ->isNotEmpty();
                });

            return response()->json(['data' => $availableDosen]);
        } catch (\Exception $e) {
            Log::error('Error fetching available dosen: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal memuat data dosen tersedia'], 500);
        }
    }

    /**
     * Log activity for reporting
     */
    private function logActivity($action, $module, $description)
    {
        try {
            DB::table('activity_logs')->insert([
                'user_id' => auth()->id(),
                'action' => $action,
                'module' => $module,
                'description' => $description,
                'ip_address' => request()->ip(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } catch (\Exception $e) {
            Log::error('Error logging activity: ' . $e->getMessage());
        }
    }

    /**
     * Batch fetch CSR by array of kode mata kuliah
     */
    public function batch(Request $request)
    {
        $kodeList = $request->input('kode_mk', []);
        if (!is_array($kodeList) || empty($kodeList)) {
            return response()->json(['message' => 'kode_mk harus berupa array dan tidak boleh kosong'], 400);
        }
        $csrs = CSR::whereIn('mata_kuliah_kode', $kodeList)->get();
        return response()->json(['data' => $csrs]);
    }
} 