<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PBL;
use App\Models\MataKuliah;
use Illuminate\Http\Response;
use App\Services\ActivityLogService;
use App\Models\PBLMapping;
use App\Models\User;

class MataKuliahPBLController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index($kode)
    {
        $pbls = PBL::where('mata_kuliah_kode', $kode)->get();
        return response()->json($pbls);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, $kode)
    {
        $validated = $request->validate([
            'modul_ke' => 'required|string',
            'nama_modul' => 'required|string',
        ]);
        $validated['mata_kuliah_kode'] = $kode;
        $pbl = PBL::create($validated);
        // Logging
        ActivityLogService::logCreate('PBL', "Menambah PBL modul ke-{$pbl->modul_ke} pada {$kode}: {$pbl->nama_modul}", $pbl->toArray());
        return response()->json($pbl, Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $pbl = \App\Models\PBL::findOrFail($id);
        return response()->json($pbl);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $pbl = \App\Models\PBL::findOrFail($id);
        $validated = $request->validate([
            'modul_ke' => 'sometimes|required|string',
            'nama_modul' => 'sometimes|required|string',
        ]);
        
        // Simpan data lama untuk perbandingan
        $oldData = $pbl->toArray();
        $oldModulKe = $pbl->modul_ke;
        $oldNamaModul = $pbl->nama_modul;
        
        $pbl->update($validated);
        
        // Buat deskripsi detail perubahan
        $changes = [];
        
        // Cek perubahan modul_ke
        if ($oldModulKe !== $pbl->modul_ke) {
            $oldModulKeDisplay = $oldModulKe ?: '(kosong)';
            $newModulKeDisplay = $pbl->modul_ke ?: '(kosong)';
            $changes[] = "modul_ke: {$oldModulKeDisplay} → {$newModulKeDisplay}";
        }
        
        // Cek perubahan nama_modul
        if ($oldNamaModul !== $pbl->nama_modul) {
            $oldNamaModulDisplay = $oldNamaModul ?: '(kosong)';
            $newNamaModulDisplay = $pbl->nama_modul ?: '(kosong)';
            $changes[] = "nama_modul: {$oldNamaModulDisplay} → {$newNamaModulDisplay}";
        }

        $description = "Mengupdate PBL modul ke-{$pbl->modul_ke} pada {$pbl->mata_kuliah_kode}";
        if (!empty($changes)) {
            $description .= " (" . implode(', ', $changes) . ")";
        }
        
        // Logging
        ActivityLogService::logUpdate('PBL', $description, ['before' => $oldData, 'after' => $pbl->toArray()]);
        return response()->json($pbl);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $pbl = \App\Models\PBL::findOrFail($id);
        $old = $pbl->toArray();
        $pbl->delete();
        // Logging
        ActivityLogService::logDelete('PBL', "Menghapus PBL modul ke-{$old['modul_ke']} pada {$old['mata_kuliah_kode']}: {$old['nama_modul']}", $old);
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Get all PBL grouped by mata_kuliah_kode for Blok courses only
     */
    public function all()
    {
        $blokCourses = \App\Models\MataKuliah::where('jenis', 'Blok')->get(['kode', 'nama', 'semester', 'blok', 'periode', 'keahlian_required']);
        $blokKodes = $blokCourses->pluck('kode');
        $pbls = \App\Models\PBL::whereIn('mata_kuliah_kode', $blokKodes)->get();
        $grouped = $pbls->groupBy('mata_kuliah_kode');
        $result = [];
        foreach ($blokCourses as $mk) {
            $result[$mk->kode] = [
                'mata_kuliah' => [
                    'kode' => $mk->kode,
                    'nama' => $mk->nama,
                    'semester' => $mk->semester,
                    'blok' => $mk->blok,
                    'periode' => $mk->periode,
                    'keahlian_required' => $mk->keahlian_required,
                ],
                'pbls' => isset($grouped[$mk->kode]) ? $grouped[$mk->kode]->values()->toArray() : [],
            ];
        }
        return response()->json($result);
    }

    /**
     * Assign dosen ke PBL
     */
    public function assignDosen(Request $request, $pblId)
    {
        $validated = $request->validate([
            'dosen_id' => 'required|exists:users,id',
        ]);
        $pbl = PBL::findOrFail($pblId);
        // Ambil semester dan blok dari mata kuliah terkait
        $mataKuliah = $pbl->mataKuliah;
        $semester = $mataKuliah->semester;
        $blok = $mataKuliah->blok;
        
        // Validasi: Mata kuliah harus punya keahlian_required
        if (empty($mataKuliah->keahlian_required) || count($mataKuliah->keahlian_required) === 0) {
            return response()->json([
                'message' => 'Mata kuliah ini belum diisi keahlian yang diperlukan. Silakan lengkapi keahlian_required pada mata kuliah sebelum assign dosen.'
            ], 422);
        }
        
        // Cek apakah dosen sudah di CSR X.Y
        $csr = \App\Models\CSR::where('nomor_csr', $semester.'.'.$blok)->first();
        if ($csr) {
            $csrMapping = \App\Models\CSRMapping::where('csr_id', $csr->id)
                ->where('dosen_id', $validated['dosen_id'])
                ->first();
            if ($csrMapping) {
                return response()->json([
                    'message' => 'Dosen ini sudah di CSR '.$csr->nomor_csr.', tidak bisa di PBL blok '.$blok.' semester '.$semester
                ], 422);
            }
        }
        // Cek apakah sudah ada assignment
        $existing = PBLMapping::where('pbl_id', $pblId)->where('dosen_id', $validated['dosen_id'])->first();
        if ($existing) {
            return response()->json(['message' => 'Dosen sudah diassign ke PBL ini'], 422);
        }
        $mapping = PBLMapping::create([
            'pbl_id' => $pblId,
            'dosen_id' => $validated['dosen_id'],
        ]);
        return response()->json($mapping->load('dosen'));
    }

    /**
     * Unassign dosen dari PBL
     */
    public function unassignDosen($pblId, $dosenId)
    {
        $mapping = PBLMapping::where('pbl_id', $pblId)->where('dosen_id', $dosenId)->first();
        if (!$mapping) {
            return response()->json(['message' => 'Mapping tidak ditemukan'], 404);
        }
        $mapping->delete();
        return response()->json(['message' => 'Dosen unassigned']);
    }

    /**
     * Get dosen yang sudah diassign ke PBL
     */
    public function assignedDosen($pblId)
    {
        $pbl = PBL::with('dosen')->findOrFail($pblId);
        return response()->json($pbl->dosen);
    }

    /**
     * Batch get assigned dosen untuk banyak PBL sekaligus
     */
    public function assignedDosenBatch(Request $request)
    {
        $validated = $request->validate([
            'pbl_ids' => 'required|array',
            'pbl_ids.*' => 'integer',
        ]);
        $result = [];
        $pbls = PBL::with('dosen')->whereIn('id', $validated['pbl_ids'])->get();
        foreach ($pbls as $pbl) {
            $result[$pbl->id] = $pbl->dosen;
        }
        return response()->json($result);
    }

    /**
     * Reset assignment dosen pada PBL (hapus semua mapping dosen pada PBL)
     */
    public function resetDosen($pblId)
    {
        $pbl = PBL::findOrFail($pblId);
        $deleted = PBLMapping::where('pbl_id', $pblId)->delete();
        return response()->json(['message' => 'Semua dosen pada PBL ini telah direset', 'deleted' => $deleted]);
    }

    /**
     * Batch assign dosen ke banyak PBL sekaligus
     */
    public function assignDosenBatch(Request $request)
    {
        $data = $request->validate([
            'assignments' => 'required|array',
            'assignments.*.pbl_id' => 'required|integer|exists:pbls,id',
            'assignments.*.dosen_id' => 'required|integer|exists:users,id',
        ]);
        $results = [];
        foreach ($data['assignments'] as $item) {
            $pbl = PBL::find($item['pbl_id']);
            if (!$pbl) continue;
            
            // Ambil mata kuliah untuk validasi keahlian
            $mataKuliah = $pbl->mataKuliah;
            if (!$mataKuliah) continue;
            
            // Validasi keahlian_required dari mata kuliah
            if (empty($mataKuliah->keahlian_required) || count($mataKuliah->keahlian_required) === 0) {
                $results[] = [
                    'pbl_id' => $item['pbl_id'],
                    'dosen_id' => $item['dosen_id'],
                    'status' => 'error',
                    'message' => 'Mata kuliah belum diisi keahlian_required',
                ];
                continue;
            }
            // Cek existing assignment
            $existing = PBLMapping::where('pbl_id', $item['pbl_id'])->where('dosen_id', $item['dosen_id'])->first();
            if ($existing) {
                $results[] = [
                    'pbl_id' => $item['pbl_id'],
                    'dosen_id' => $item['dosen_id'],
                    'status' => 'skipped',
                    'message' => 'Sudah diassign',
                ];
                continue;
            }
            // Assign
            PBLMapping::create([
                'pbl_id' => $item['pbl_id'],
                'dosen_id' => $item['dosen_id'],
            ]);
            $results[] = [
                'pbl_id' => $item['pbl_id'],
                'dosen_id' => $item['dosen_id'],
                'status' => 'success',
            ];
        }
        return response()->json(['results' => $results]);
    }

    /**
     * Batch reset assignment dosen pada banyak PBL sekaligus
     */
    public function resetDosenBatch(Request $request)
    {
        $data = $request->validate([
            'pbl_ids' => 'required|array',
            'pbl_ids.*' => 'required|integer|exists:pbls,id',
        ]);
        foreach ($data['pbl_ids'] as $pblId) {
            PBLMapping::where('pbl_id', $pblId)->delete();
        }
        return response()->json(['message' => 'Batch reset selesai']);
    }
}
