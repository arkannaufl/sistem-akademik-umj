<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CSR;
use App\Models\MataKuliah;
use Illuminate\Http\Response;
use App\Services\ActivityLogService;

class MataKuliahCSRController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index($kode)
    {
        $csrs = CSR::where('mata_kuliah_kode', $kode)->get();
        return response()->json($csrs);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, $kode)
    {
        $validated = $request->validate([
            'nomor_csr' => 'required|string',
            'keahlian_required' => 'nullable|array',
            'keahlian_required.*' => 'string',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_akhir' => 'nullable|date',
        ]);
        $validated['mata_kuliah_kode'] = $kode;
        $csr = CSR::create($validated);
        // Logging
        ActivityLogService::logCreate('CSR', "Menambah CSR {$csr->nomor_csr} pada {$kode}", $csr->toArray());
        return response()->json($csr, Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show($kode, $id)
    {
        $csr = CSR::where('mata_kuliah_kode', $kode)->findOrFail($id);
        return response()->json($csr);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $csr = CSR::findOrFail($id);
        $validated = $request->validate([
            'nomor_csr' => 'sometimes|required|string',
            'keahlian' => 'nullable|string',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_akhir' => 'nullable|date',
        ]);
        
        // Simpan data lama untuk perbandingan
        $oldData = $csr->toArray();
        $oldNomor = $csr->nomor_csr;
        $oldKeahlian = $csr->keahlian_required;
        $oldTanggalMulai = $csr->tanggal_mulai;
        $oldTanggalAkhir = $csr->tanggal_akhir;
        
        $csr->update($validated);
        
        // Buat deskripsi detail perubahan
        $changes = [];
        
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
        
        // Cek perubahan tanggal
        if ($oldTanggalMulai !== $csr->tanggal_mulai) {
            $oldTanggalMulaiDisplay = $oldTanggalMulai ?: '(kosong)';
            $newTanggalMulaiDisplay = $csr->tanggal_mulai ?: '(kosong)';
            $changes[] = "tanggal_mulai: {$oldTanggalMulaiDisplay} → {$newTanggalMulaiDisplay}";
        }
        if ($oldTanggalAkhir !== $csr->tanggal_akhir) {
            $oldTanggalAkhirDisplay = $oldTanggalAkhir ?: '(kosong)';
            $newTanggalAkhirDisplay = $csr->tanggal_akhir ?: '(kosong)';
            $changes[] = "tanggal_akhir: {$oldTanggalAkhirDisplay} → {$newTanggalAkhirDisplay}";
        }

        if (!empty($changes)) {
            $description = "Mengupdate CSR {$csr->nomor_csr} pada {$csr->mata_kuliah_kode} (" . implode(', ', $changes) . ")";
            ActivityLogService::logUpdate('CSR', $description, ['before' => $oldData, 'after' => $csr->toArray()]);
        }
        return response()->json($csr);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $csr = CSR::findOrFail($id);
        $old = $csr->toArray();
        $csr->delete();
        // Logging
        ActivityLogService::logDelete('CSR', "Menghapus CSR {$old['nomor_csr']} pada {$old['mata_kuliah_kode']}", $old);
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
