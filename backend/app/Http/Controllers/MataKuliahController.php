<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MataKuliah;
use Illuminate\Http\Response;

class MataKuliahController extends Controller
{
    /**
     * Update keahlian required untuk mata kuliah
     */
    public function updateKeahlian(Request $request, $kode)
    {
        $validated = $request->validate([
            'keahlian_required' => 'required|array',
            'keahlian_required.*' => 'string',
        ]);
        
        $mataKuliah = MataKuliah::findOrFail($kode);
        
        $mataKuliah->update([
            'keahlian_required' => $validated['keahlian_required']
        ]);
        
        return response()->json($mataKuliah);
    }

    /**
     * Get keahlian required untuk mata kuliah
     */
    public function getKeahlian($kode)
    {
        $mataKuliah = MataKuliah::findOrFail($kode);
        return response()->json([
            'keahlian_required' => $mataKuliah->keahlian_required
        ]);
    }

    /**
     * Get semua mata kuliah dengan keahlian untuk semester tertentu
     */
    public function getBySemester($semester)
    {
        $mataKuliah = MataKuliah::where('semester', $semester)
            ->where('jenis', 'Blok')
            ->get(['kode', 'nama', 'semester', 'blok', 'periode', 'keahlian_required']);
        
        return response()->json($mataKuliah);
    }

    /**
     * Ambil seluruh daftar peran_dalam_kurikulum unik dari semua mata kuliah
     */
    public function peranKurikulumOptions()
    {
        $all = MataKuliah::pluck('peran_dalam_kurikulum')->filter()->flatten()->unique()->values();
        return response()->json($all);
    }

    /**
     * Ambil seluruh daftar keahlian unik dari semua mata kuliah
     */
    public function keahlianOptions()
    {
        $all = MataKuliah::pluck('keahlian_required')->filter()->flatten()->unique()->values();
        return response()->json($all);
    }

    /**
     * Update data mata kuliah
     */
    public function update(Request $request, $kode)
    {
        $mataKuliah = MataKuliah::findOrFail($kode);
        $data = $request->all();
        $data['keahlian_required'] = $request->input('keahlian_required', []);
        $data['peran_dalam_kurikulum'] = $request->input('peran_dalam_kurikulum', []);
        $mataKuliah->update($data);
        return response()->json($mataKuliah);
    }

    /**
     * Hapus data mata kuliah
     */
    public function destroy($kode)
    {
        $mataKuliah = MataKuliah::findOrFail($kode);
        $mataKuliah->delete();
        return response()->json(['message' => 'Mata kuliah berhasil dihapus']);
    }

    /**
     * Simpan data mata kuliah baru
     */
    public function store(Request $request)
    {
        $data = $request->all();
        $data['keahlian_required'] = $request->input('keahlian_required', []);
        $data['peran_dalam_kurikulum'] = $request->input('peran_dalam_kurikulum', []);
        $mataKuliah = MataKuliah::create($data);
        return response()->json($mataKuliah, 201);
    }

    /**
     * Menampilkan semua data mata kuliah
     */
    public function index()
    {
        $mataKuliah = MataKuliah::all();
        return response()->json($mataKuliah);
    }

    /**
     * Tampilkan detail satu mata kuliah
     */
    public function show($kode)
    {
        $mataKuliah = MataKuliah::findOrFail($kode);
        return response()->json($mataKuliah);
    }
}