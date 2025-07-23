<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PBL;
use App\Models\MataKuliah;
use Illuminate\Http\Response;
use App\Models\PBLMapping;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

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
        
        $pbl->update($validated);
        
        return response()->json($pbl);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $pbl = \App\Models\PBL::findOrFail($id);
        $pbl->delete();
        
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
        
        activity()
            ->causedBy(Auth::user())
            ->performedOn($pbl)
            ->withProperties(['attributes' => ['dosen_id' => $validated['dosen_id']]])
            ->log("Dosen dengan ID {$validated['dosen_id']} di-assign ke PBL");

        // Tambahkan increment pbl_assignment_count
        $user = \App\Models\User::find($validated['dosen_id']);
        if ($user) $user->increment('pbl_assignment_count');
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
        $pbl = $mapping->pbl;
        $mapping->delete();
        
        activity()
            ->causedBy(Auth::user())
            ->performedOn($pbl)
            ->withProperties(['attributes' => ['dosen_id' => $dosenId]])
            ->log("Dosen dengan ID {$dosenId} di-unassign dari PBL");

        // Decrement pbl_assignment_count
        $user = \App\Models\User::find($dosenId);
        if ($user && $user->pbl_assignment_count > 0) $user->decrement('pbl_assignment_count');
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
            // Pastikan pbl_assignment_count di-load untuk setiap dosen
            $pbl->dosen->each(function($dosen) {
                $dosen->pbl_assignment_count = $dosen->pbl_assignment_count ?? 0;
            });
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
        
        activity()
            ->causedBy(Auth::user())
            ->performedOn($pbl)
            ->log("Semua dosen pada PBL ini telah di-reset");

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
            // Increment pbl_assignment_count
            $user = \App\Models\User::find($item['dosen_id']);
            if ($user) $user->increment('pbl_assignment_count');
            
            activity()
                ->causedBy(Auth::user())
                ->performedOn($pbl)
                ->withProperties(['attributes' => ['dosen_id' => $item['dosen_id']]])
                ->log("Dosen dengan ID {$item['dosen_id']} di-assign ke PBL (batch)");

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
            $pbl = PBL::find($pblId);
            if ($pbl) {
                activity()
                    ->causedBy(Auth::user())
                    ->performedOn($pbl)
                    ->log("Semua dosen pada PBL ini telah di-reset (batch)");
            }
            PBLMapping::where('pbl_id', $pblId)->delete();
        }
        return response()->json(['message' => 'Batch reset selesai']);
    }
}
