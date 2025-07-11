<?php

namespace App\Http\Controllers;

use App\Models\KelompokKecil;
use App\Models\KelompokBesar;
use App\Models\User;
use App\Models\Semester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KelompokKecilController extends Controller
{
    // List kelompok kecil per semester
    public function index(Request $request)
    {
        $semester = $request->query('semester');
        $query = KelompokKecil::with('mahasiswa')->orderBy('nama_kelompok', 'asc');
        if ($semester) {
            $query->where('semester', $semester);
        }
        $kelompokList = $query->get();

        // Return a flat list: one entry per mahasiswa in kelompok kecil
        $result = $kelompokList->map(function ($item) {
            return [
                'id' => $item->id,
                'nama_kelompok' => $item->nama_kelompok,
                'semester' => $item->semester,
                'jumlah_kelompok' => $item->jumlah_kelompok,
                'mahasiswa_id' => $item->mahasiswa_id,
                'mahasiswa' => $item->mahasiswa ? [
                    'id' => $item->mahasiswa->id,
                    'nama' => $item->mahasiswa->name,
                    'nim' => $item->mahasiswa->nim,
                    'angkatan' => $item->mahasiswa->angkatan,
                    'ipk' => $item->mahasiswa->ipk,
                    'gender' => $item->mahasiswa->gender,
                ] : null,
            ];
        });

        return response()->json($result);
    }

    // Generate kelompok kecil
    public function store(Request $request)
    {
        $request->validate([
            'semester' => 'required', // bisa string atau id
            'mahasiswa_ids' => 'required|array',
            'mahasiswa_ids.*' => 'required|exists:users,id',
            'jumlah_kelompok' => 'required|integer|min:1',
        ]);

        $semester = $request->semester;

        // Cek rule: kelompok besar harus ada dulu
        $kelompokBesar = KelompokBesar::where('semester', $semester)->pluck('mahasiswa_id')->toArray();
        if (empty($kelompokBesar)) {
            return response()->json([
                'message' => 'Kelompok besar harus dibuat terlebih dahulu untuk semester ini'
            ], 422);
        }

        // Cek apakah mahasiswa yang dipilih ada di kelompok besar
        $mahasiswaTidakAda = array_diff($request->mahasiswa_ids, $kelompokBesar);
        if (!empty($mahasiswaTidakAda)) {
            $mahasiswa = User::whereIn('id', $mahasiswaTidakAda)->pluck('name', 'id');
            return response()->json([
                'message' => 'Beberapa mahasiswa tidak terdaftar di kelompok besar semester ini',
                'mahasiswa' => $mahasiswa
            ], 422);
        }

        // Cek rule: mahasiswa tidak boleh ada di semester lain
        $sudahTerdaftar = KelompokKecil::whereIn('mahasiswa_id', $request->mahasiswa_ids)
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

        // Generate kelompok dengan algoritma round robin berdasarkan gender dan IPK
        $mahasiswaData = User::whereIn('id', $request->mahasiswa_ids)->get();
        $laki = $mahasiswaData->where('gender', 'Laki-laki')->sortByDesc('ipk')->values();
        $perempuan = $mahasiswaData->where('gender', 'Perempuan')->sortByDesc('ipk')->values();

        $kelompokArr = array_fill(0, $request->jumlah_kelompok, []);

        // Round robin laki-laki
        foreach ($laki as $index => $mhs) {
            $kelompokArr[$index % $request->jumlah_kelompok][] = $mhs;
        }

        // Round robin perempuan
        foreach ($perempuan as $index => $mhs) {
            $kelompokArr[$index % $request->jumlah_kelompok][] = $mhs;
        }

        // Simpan ke database
        DB::transaction(function () use ($semester, $kelompokArr, $request) {
            // Hapus data lama
            KelompokKecil::where('semester', $semester)->delete();

            // Insert data baru
            foreach ($kelompokArr as $index => $mahasiswa) {
                $namaKelompok = ($index + 1);
                foreach ($mahasiswa as $mhs) {
                    KelompokKecil::create([
                        'semester' => $semester,
                        'nama_kelompok' => $namaKelompok,
                        'mahasiswa_id' => $mhs->id,
                        'jumlah_kelompok' => $request->jumlah_kelompok
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Kelompok kecil berhasil dibuat',
            'jumlah_kelompok' => $request->jumlah_kelompok,
            'total_mahasiswa' => count($request->mahasiswa_ids)
        ]);
    }

    // Update pengelompokan (drag & drop)
    public function update(Request $request, $id)
    {
        $request->validate([
            'nama_kelompok' => 'required|string',
        ]);

        $kelompokKecil = KelompokKecil::findOrFail($id);
        $kelompokKecil->update([
            'nama_kelompok' => $request->nama_kelompok
        ]);

        return response()->json(['message' => 'Pengelompokan berhasil diupdate']);
    }

    // Hapus kelompok kecil
    public function destroy($id)
    {
        $row = KelompokKecil::findOrFail($id);
        $row->delete();
        return response()->json(['message' => 'Data berhasil dihapus']);
    }

    // Get statistik kelompok
    public function stats(Request $request)
    {
        $semester = $request->query('semester');
        if (!$semester) {
            return response()->json(['message' => 'Parameter semester diperlukan'], 400);
        }

        $stats = KelompokKecil::getKelompokStats($semester);
        return response()->json($stats);
    }

    public function batchUpdate(Request $request)
    {
        $request->validate([
            'updates' => 'required|array',
            'updates.*.id' => 'required|integer|exists:kelompok_kecil,id',
            'updates.*.nama_kelompok' => 'required|string',
        ]);
        foreach ($request->updates as $update) {
            \App\Models\KelompokKecil::where('id', $update['id'])->update(['nama_kelompok' => $update['nama_kelompok']]);
        }
        return response()->json(['message' => 'Batch update berhasil']);
    }

    // Create single kelompok kecil (untuk insert mahasiswa baru)
    public function createSingle(Request $request)
    {
        $request->validate([
            'semester' => 'required',
            'nama_kelompok' => 'required|string',
            'mahasiswa_id' => 'required|integer|exists:users,id',
            'jumlah_kelompok' => 'required|integer|min:1',
        ]);

        $semester = $request->semester;

        // Cek apakah mahasiswa sudah ada di kelompok kecil semester ini
        $existing = KelompokKecil::where('semester', $semester)
            ->where('mahasiswa_id', $request->mahasiswa_id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Mahasiswa sudah terdaftar di kelompok kecil semester ini'
            ], 422);
        }

        // Cek apakah mahasiswa ada di kelompok besar semester ini
        $kelompokBesar = KelompokBesar::where('semester', $semester)
            ->where('mahasiswa_id', $request->mahasiswa_id)
            ->first();

        if (!$kelompokBesar) {
            return response()->json([
                'message' => 'Mahasiswa harus terdaftar di kelompok besar terlebih dahulu'
            ], 422);
        }

        // Cek apakah mahasiswa sudah ada di semester lain
        $otherSemester = KelompokKecil::where('mahasiswa_id', $request->mahasiswa_id)
            ->where('semester', '!=', $semester)
            ->first();

        if ($otherSemester) {
            return response()->json([
                'message' => 'Mahasiswa sudah terdaftar di semester lain'
            ], 422);
        }

        $kelompokKecil = KelompokKecil::create([
            'semester' => $semester,
            'nama_kelompok' => $request->nama_kelompok,
            'mahasiswa_id' => $request->mahasiswa_id,
            'jumlah_kelompok' => $request->jumlah_kelompok,
        ]);

        return response()->json([
            'message' => 'Mahasiswa berhasil ditambahkan ke kelompok',
            'data' => $kelompokKecil
        ]);
    }

    /**
     * Get mahasiswa from a specific kelompok kecil
     */
    public function getMahasiswa($id)
    {
        $kelompokKecil = KelompokKecil::with('mahasiswa')
            ->where('id', $id)
            ->first();

        if (!$kelompokKecil) {
            return response()->json(['message' => 'Kelompok kecil tidak ditemukan'], 404);
        }

        // Get all mahasiswa in this kelompok
        $mahasiswa = KelompokKecil::where('nama_kelompok', $kelompokKecil->nama_kelompok)
            ->where('semester', $kelompokKecil->semester)
            ->with('mahasiswa')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->mahasiswa->id,
                    'nama' => $item->mahasiswa->name,
                    'nim' => $item->mahasiswa->nim,
                    'angkatan' => $item->mahasiswa->angkatan,
                    'ipk' => $item->mahasiswa->ipk,
                    'gender' => $item->mahasiswa->gender,
                ];
            });

        return response()->json($mahasiswa);
    }

    /**
     * Show detail kelompok kecil beserta jumlah anggota
     */
    public function show($id)
    {
        $kelompok = KelompokKecil::findOrFail($id);
        // Hitung jumlah anggota (mahasiswa) di kelompok ini (berdasarkan nama_kelompok & semester)
        $jumlah_anggota = KelompokKecil::where('nama_kelompok', $kelompok->nama_kelompok)
            ->where('semester', $kelompok->semester)
            ->count();
        return response()->json([
            'id' => $kelompok->id,
            'nama_kelompok' => $kelompok->nama_kelompok,
            'semester' => $kelompok->semester,
            'jumlah_anggota' => $jumlah_anggota,
        ]);
    }

    /**
     * Batch get kelompok kecil by semester list
     * Endpoint: POST /kelompok-kecil/batch-by-semester
     * Body: { "semesters": ["Ganjil", "Genap"] }
     * Response: { "Ganjil": [...], "Genap": [...] }
     */
    public function batchBySemester(Request $request)
    {
        $semesters = $request->input('semesters', []);
        $result = [];
        foreach ($semesters as $sem) {
            $result[$sem] = KelompokKecil::with('mahasiswa')->where('semester', $sem)->get();
        }
        return response()->json($result);
    }

    /**
     * Get kelompok kecil by nama_kelompok and semester
     * Endpoint: GET /api/kelompok-kecil/by-nama?nama_kelompok=1&semester=1
     */
    public function getByNama(Request $request)
    {
        $nama = $request->query('nama_kelompok');
        $semester = $request->query('semester');
        if (!$nama || !$semester) {
            return response()->json(['message' => 'Parameter nama_kelompok dan semester diperlukan'], 400);
        }
        $data = \App\Models\KelompokKecil::with('mahasiswa')
            ->where('nama_kelompok', $nama)
            ->where('semester', $semester)
            ->get();
        return response()->json($data);
    }
}
