<?php

namespace App\Http\Controllers;

use App\Models\KelompokBesar;
use App\Models\User;
use App\Models\KelompokKecil;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KelompokBesarController extends Controller
{
    // List mahasiswa kelompok besar per semester
    public function index(Request $request)
    {
        $semester = $request->query('semester');
        $query = KelompokBesar::with('mahasiswa')->orderBy('id', 'asc');
        if ($semester) {
            $query->where('semester', $semester);
        }
        return response()->json($query->get());
    }

    // Tambah mahasiswa ke kelompok besar
    public function store(Request $request)
    {
        $request->validate([
            'semester' => 'required|string',
            'mahasiswa_ids' => 'required|array',
            'mahasiswa_ids.*' => 'required|exists:users,id',
        ]);

        $semester = $request->semester;
        $mahasiswaIds = $request->mahasiswa_ids;

        // Cek rule: mahasiswa tidak boleh ada di semester lain
        $sudahTerdaftar = KelompokBesar::whereIn('mahasiswa_id', $mahasiswaIds)
            ->where('semester', '!=', $semester)
            ->pluck('mahasiswa_id')
            ->toArray();
        if (count($sudahTerdaftar) > 0) {
            $mahasiswa = User::whereIn('id', $sudahTerdaftar)->pluck('name', 'id');
            return response()->json([
                'message' => 'Beberapa mahasiswa sudah terdaftar di semester lain',
                'mahasiswa' => $mahasiswa
            ], 422);
        }

        // Simpan (replace: hapus dulu data semester ini, lalu insert baru)
        DB::transaction(function() use ($semester, $mahasiswaIds) {
            KelompokBesar::where('semester', $semester)->delete();
            foreach ($mahasiswaIds as $id) {
                KelompokBesar::create([
                    'semester' => $semester,
                    'mahasiswa_id' => $id
                ]);
            }
        });

        return response()->json(['message' => 'Data kelompok besar berhasil disimpan']);
    }

    // Hapus mahasiswa dari kelompok besar
    public function destroy($id)
    {
        $row = KelompokBesar::findOrFail($id);
        // Hapus juga dari kelompok kecil di semester yang sama
        KelompokKecil::where('semester', $row->semester)
            ->where('mahasiswa_id', $row->mahasiswa_id)
            ->delete();
        $row->delete();
        return response()->json(['message' => 'Data berhasil dihapus']);
    }

    // Get kelompok besar by semester ID
    public function getBySemesterId($semesterId)
    {
        // Get semester info
        $semester = \App\Models\Semester::find($semesterId);
        if (!$semester) {
            return response()->json(['message' => 'Semester tidak ditemukan'], 404);
        }

        // Get kelompok besar data for this semester
        $kelompokBesar = KelompokBesar::with('mahasiswa')
            ->where('semester', $semesterId)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'semester' => $semester,
            'data' => $kelompokBesar
        ]);
    }

    /**
     * Batch get kelompok besar by semester list
     * Endpoint: POST /kelompok-besar/batch-by-semester
     * Body: { "semesters": ["Ganjil", "Genap"] }
     * Response: { "Ganjil": [...], "Genap": [...] }
     */
    public function batchBySemester(Request $request)
    {
        $semesters = $request->input('semesters', []);
        $result = [];
        foreach ($semesters as $sem) {
            $result[$sem] = KelompokBesar::with('mahasiswa')->where('semester', $sem)->get();
        }
        return response()->json($result);
    }
} 