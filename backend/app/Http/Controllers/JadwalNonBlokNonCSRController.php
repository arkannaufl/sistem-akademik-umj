<?php

namespace App\Http\Controllers;

use App\Models\JadwalNonBlokNonCSR;
use App\Models\JadwalKuliahBesar;
use App\Models\JadwalAgendaKhusus;
use App\Models\JadwalPraktikum;
use App\Models\JadwalPBL;
use App\Models\JadwalJurnalReading;
use App\Models\JadwalCSR;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;

class JadwalNonBlokNonCSRController extends Controller
{
    public function index($mataKuliahKode)
    {
        try {
            $jadwal = JadwalNonBlokNonCSR::with(['dosen', 'ruangan', 'kelompokBesarAntara'])
                ->where('mata_kuliah_kode', $mataKuliahKode)
                ->orderBy('tanggal')
                ->get()
                ->map(function ($item) {
                    // Add dosen_names attribute for frontend
                    $item->dosen_names = $item->dosen_names;
                    return $item;
                });

            // Konversi format jam dari HH:MM ke HH.MM untuk frontend
            $jadwal->transform(function ($item) {
                if ($item->jam_mulai) {
                    $jamMulai = str_replace(':', '.', $item->jam_mulai);
                    // Regex yang benar: mencari pattern dengan 3 bagian (HH.MM.SS) dan ambil 2 bagian pertama
                    if (preg_match('/^(\d{2}\.\d{2})\.\d{2}$/', $jamMulai, $matches)) {
                        $jamMulai = $matches[1]; // Ambil HH.MM saja
                    }
                    $item->jam_mulai = $jamMulai;
                }
                if ($item->jam_selesai) {
                    $jamSelesai = str_replace(':', '.', $item->jam_selesai);
                    // Regex yang benar: mencari pattern dengan 3 bagian (HH.MM.SS) dan ambil 2 bagian pertama
                    if (preg_match('/^(\d{2}\.\d{2})\.\d{2}$/', $jamSelesai, $matches)) {
                        $jamSelesai = $matches[1]; // Ambil HH.MM saja
                    }
                    $item->jam_selesai = $jamSelesai;
                }
                return $item;
            });

            return response()->json($jadwal);
        } catch (\Exception $e) {
            Log::error('Error fetching jadwal non blok non CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal mengambil data jadwal'], 500);
        }
    }

    public function store(Request $request, $mataKuliahKode)
    {
        try {
            $validator = Validator::make($request->all(), [
                'tanggal' => 'required|date',
                'jam_mulai' => 'required|string',
                'jam_selesai' => 'required|string',
                'jumlah_sesi' => 'required|integer|min:1',
                'jenis_baris' => 'required|in:materi,agenda',
                'agenda' => 'nullable|string',
                'materi' => 'nullable|string',
                'dosen_id' => 'nullable|integer|exists:users,id',
                'dosen_ids' => 'nullable|array',
                'dosen_ids.*' => 'exists:users,id',
                'ruangan_id' => 'nullable|integer|exists:ruangan,id',
                'kelompok_besar_id' => 'nullable|integer|min:1',
                'kelompok_besar_antara_id' => 'nullable|integer|exists:kelompok_besar_antara,id',
                'use_ruangan' => 'required|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['message' => $validator->errors()->first()], 400);
            }

            // Validasi kapasitas ruangan
            if ($request->use_ruangan && $request->ruangan_id) {
                $kapasitasMessage = $this->validateRuanganCapacity($request);
                if ($kapasitasMessage) {
                    return response()->json(['message' => $kapasitasMessage], 422);
                }
            }

            // Validasi bentrok
            $isBentrok = $this->isBentrok($request, $mataKuliahKode);
            if ($isBentrok) {
                return response()->json(['message' => $isBentrok], 422);
            }

            $jadwal = JadwalNonBlokNonCSR::create([
                'mata_kuliah_kode' => $mataKuliahKode,
                'tanggal' => $request->tanggal,
                'jam_mulai' => str_replace('.', ':', $request->jam_mulai),
                'jam_selesai' => str_replace('.', ':', $request->jam_selesai),
                'jumlah_sesi' => $request->jumlah_sesi,
                'jenis_baris' => $request->jenis_baris,
                'agenda' => $request->agenda,
                'materi' => $request->materi,
                'dosen_id' => $request->dosen_id,
                'dosen_ids' => $request->dosen_ids,
                'ruangan_id' => $request->ruangan_id,
                'kelompok_besar_id' => $request->kelompok_besar_id,
                'kelompok_besar_antara_id' => $request->kelompok_besar_antara_id,
                'use_ruangan' => $request->use_ruangan,
            ]);

            $jadwal->load(['dosen', 'ruangan', 'kelompokBesarAntara']);

            // Konversi format jam dari HH:MM ke HH.MM untuk frontend
            if ($jadwal->jam_mulai) {
                $jamMulai = str_replace(':', '.', $jadwal->jam_mulai);
                if (preg_match('/^(\d{2}\.\d{2})\.\d{2}$/', $jamMulai, $matches)) {
                    $jamMulai = $matches[1];
                }
                $jadwal->jam_mulai = $jamMulai;
            }
            if ($jadwal->jam_selesai) {
                $jamSelesai = str_replace(':', '.', $jadwal->jam_selesai);
                if (preg_match('/^(\d{2}\.\d{2})\.\d{2}$/', $jamSelesai, $matches)) {
                    $jamSelesai = $matches[1];
                }
                $jadwal->jam_selesai = $jamSelesai;
            }

            return response()->json($jadwal, 201);
        } catch (\Exception $e) {
            Log::error('Error creating jadwal non blok non CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal menyimpan jadwal'], 500);
        }
    }

    public function update(Request $request, $mataKuliahKode, $id)
    {
        try {
            $jadwal = JadwalNonBlokNonCSR::where('mata_kuliah_kode', $mataKuliahKode)
                ->where('id', $id)
                ->first();

            if (!$jadwal) {
                return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
            }

            $validator = Validator::make($request->all(), [
                'tanggal' => 'required|date',
                'jam_mulai' => 'required|string',
                'jam_selesai' => 'required|string',
                'jumlah_sesi' => 'required|integer|min:1',
                'jenis_baris' => 'required|in:materi,agenda',
                'agenda' => 'nullable|string',
                'materi' => 'nullable|string',
                'dosen_id' => 'nullable|integer|exists:users,id',
                'dosen_ids' => 'nullable|array',
                'dosen_ids.*' => 'exists:users,id',
                'ruangan_id' => 'nullable|integer|exists:ruangan,id',
                'kelompok_besar_id' => 'nullable|integer|min:1',
                'kelompok_besar_antara_id' => 'nullable|integer|exists:kelompok_besar_antara,id',
                'use_ruangan' => 'required|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['message' => $validator->errors()->first()], 400);
            }

            // Validasi kapasitas ruangan
            if ($request->use_ruangan && $request->ruangan_id) {
                $kapasitasMessage = $this->validateRuanganCapacity($request);
                if ($kapasitasMessage) {
                    return response()->json(['message' => $kapasitasMessage], 422);
                }
            }

            // Validasi bentrok (exclude current jadwal)
            $isBentrok = $this->isBentrok($request, $mataKuliahKode, $id);
            if ($isBentrok) {
                return response()->json(['message' => $isBentrok], 422);
            }

            $jadwal->update([
                'tanggal' => $request->tanggal,
                'jam_mulai' => str_replace('.', ':', $request->jam_mulai),
                'jam_selesai' => str_replace('.', ':', $request->jam_selesai),
                'jumlah_sesi' => $request->jumlah_sesi,
                'jenis_baris' => $request->jenis_baris,
                'agenda' => $request->agenda,
                'materi' => $request->materi,
                'dosen_id' => $request->dosen_id,
                'dosen_ids' => $request->dosen_ids,
                'ruangan_id' => $request->ruangan_id,
                'kelompok_besar_id' => $request->kelompok_besar_id,
                'kelompok_besar_antara_id' => $request->kelompok_besar_antara_id,
                'use_ruangan' => $request->use_ruangan,
            ]);

            $jadwal->load(['dosen', 'ruangan', 'kelompokBesarAntara']);

            // Konversi format jam dari HH:MM ke HH.MM untuk frontend
            if ($jadwal->jam_mulai) {
                $jamMulai = str_replace(':', '.', $jadwal->jam_mulai);
                if (preg_match('/^(\d{2}\.\d{2})\.\d{2}$/', $jamMulai, $matches)) {
                    $jamMulai = $matches[1];
                }
                $jadwal->jam_mulai = $jamMulai;
            }
            if ($jadwal->jam_selesai) {
                $jamSelesai = str_replace(':', '.', $jadwal->jam_selesai);
                if (preg_match('/^(\d{2}\.\d{2})\.\d{2}$/', $jamSelesai, $matches)) {
                    $jamSelesai = $matches[1];
                }
                $jadwal->jam_selesai = $jamSelesai;
            }

            return response()->json($jadwal);
        } catch (\Exception $e) {
            Log::error('Error updating jadwal non blok non CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal mengupdate jadwal'], 500);
        }
    }

    public function destroy($mataKuliahKode, $id)
    {
        try {
            $jadwal = JadwalNonBlokNonCSR::where('mata_kuliah_kode', $mataKuliahKode)
                ->where('id', $id)
                ->first();

            if (!$jadwal) {
                return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
            }

            $jadwal->delete();

            return response()->json(['message' => 'Jadwal berhasil dihapus']);
        } catch (\Exception $e) {
            Log::error('Error deleting jadwal non blok non CSR: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal menghapus jadwal'], 500);
        }
    }

    private function isBentrok(Request $request, $mataKuliahKode, $excludeId = null)
    {
        $tanggal = $request->tanggal;
        $jamMulai = str_replace('.', ':', $request->jam_mulai);
        $jamSelesai = str_replace('.', ':', $request->jam_selesai);
        $ruanganId = $request->ruangan_id;
        $dosenId = $request->dosen_id;
        $dosenIds = $request->dosen_ids;
        $jenisBaris = $request->jenis_baris;

        // Cek bentrok dengan jadwal non blok non CSR lainnya
        $query = JadwalNonBlokNonCSR::where('tanggal', $tanggal)
            ->where('id', '!=', $excludeId)
            ->where(function ($q) use ($jamMulai, $jamSelesai) {
                $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                    $subQ->where('jam_mulai', '<', $jamSelesai)
                        ->where('jam_selesai', '>', $jamMulai);
                });
            });

        // Untuk agenda khusus: cek bentrok jam dan ruangan (hanya jika menggunakan ruangan)
        if ($jenisBaris === 'agenda' && $request->use_ruangan && $ruanganId) {
            $bentrokAgenda = $query->where('ruangan_id', $ruanganId)->first();
            if ($bentrokAgenda) {
                return "Jadwal bentrok dengan {$bentrokAgenda->jenis_baris} pada tanggal " . 
                       date('d/m/Y', strtotime($tanggal)) . " jam " . 
                       str_replace(':', '.', $bentrokAgenda->jam_mulai) . "-" . 
                       str_replace(':', '.', $bentrokAgenda->jam_selesai) . 
                       " di ruangan " . $bentrokAgenda->ruangan->nama;
            }
        }

        // Untuk jadwal materi: cek bentrok jam, pengampu, dan ruangan
        if ($jenisBaris === 'materi') {
            $bentrokMateri = $query->where(function ($q) use ($ruanganId, $dosenId, $dosenIds) {
                $q->where('ruangan_id', $ruanganId);
                
                // Cek single dosen
                if ($dosenId) {
                    $q->orWhere('dosen_id', $dosenId);
                }
                
                // Cek multiple dosen
                if ($dosenIds && is_array($dosenIds)) {
                    $q->orWhereJsonContains('dosen_ids', $dosenIds);
                }
            })->first();
            
            if ($bentrokMateri) {
                return "Jadwal bentrok dengan {$bentrokMateri->jenis_baris} pada tanggal " . 
                       date('d/m/Y', strtotime($tanggal)) . " jam " . 
                       str_replace(':', '.', $bentrokMateri->jam_mulai) . "-" . 
                       str_replace(':', '.', $bentrokMateri->jam_selesai) . 
                       " di ruangan " . $bentrokMateri->ruangan->nama;
            }
        }

        // Cek bentrok dengan jadwal non blok non CSR lainnya yang menggunakan ruangan
        if ($request->use_ruangan && $ruanganId) {
            $bentrokNonBlokNonCSR = $query->where('use_ruangan', true)
                ->where('ruangan_id', $ruanganId)
                ->first();
            
            if ($bentrokNonBlokNonCSR) {
                return "Jadwal bentrok dengan {$bentrokNonBlokNonCSR->jenis_baris} pada tanggal " . 
                       date('d/m/Y', strtotime($tanggal)) . " jam " . 
                       str_replace(':', '.', $bentrokNonBlokNonCSR->jam_mulai) . "-" . 
                       str_replace(':', '.', $bentrokNonBlokNonCSR->jam_selesai) . 
                       " di ruangan " . $bentrokNonBlokNonCSR->ruangan->nama;
            }
        }

        // Cek bentrok dengan jadwal lainnya (Kuliah Besar, Agenda Khusus, Praktikum, PBL, Jurnal Reading, CSR)
        // Hanya cek jika menggunakan ruangan
        if (!$request->use_ruangan || !$ruanganId) {
            return false;
        }
        
        $jadwalLain = collect();

        // Kuliah Besar
        $jadwalLain = $jadwalLain->merge(
            JadwalKuliahBesar::where('tanggal', $tanggal)
                ->where(function ($q) use ($jamMulai, $jamSelesai) {
                    $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                        $subQ->where('jam_mulai', '<', $jamSelesai)
                            ->where('jam_selesai', '>', $jamMulai);
                    });
                })
                ->where('ruangan_id', $ruanganId)
                ->get()
        );

        // Agenda Khusus (hanya yang menggunakan ruangan)
        $jadwalLain = $jadwalLain->merge(
            JadwalAgendaKhusus::where('tanggal', $tanggal)
                ->where('use_ruangan', true)
                ->where(function ($q) use ($jamMulai, $jamSelesai) {
                    $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                        $subQ->where('jam_mulai', '<', $jamSelesai)
                            ->where('jam_selesai', '>', $jamMulai);
                    });
                })
                ->where('ruangan_id', $ruanganId)
                ->get()
        );

        // Praktikum
        $jadwalLain = $jadwalLain->merge(
            JadwalPraktikum::where('tanggal', $tanggal)
                ->where(function ($q) use ($jamMulai, $jamSelesai) {
                    $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                        $subQ->where('jam_mulai', '<', $jamSelesai)
                            ->where('jam_selesai', '>', $jamMulai);
                    });
                })
                ->where('ruangan_id', $ruanganId)
                ->get()
        );

        // PBL
        $jadwalLain = $jadwalLain->merge(
            JadwalPBL::where('tanggal', $tanggal)
                ->where(function ($q) use ($jamMulai, $jamSelesai) {
                    $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                        $subQ->where('jam_mulai', '<', $jamSelesai)
                            ->where('jam_selesai', '>', $jamMulai);
                    });
                })
                ->where('ruangan_id', $ruanganId)
                ->get()
        );

        // Jurnal Reading
        $jadwalLain = $jadwalLain->merge(
            JadwalJurnalReading::where('tanggal', $tanggal)
                ->where(function ($q) use ($jamMulai, $jamSelesai) {
                    $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                        $subQ->where('jam_mulai', '<', $jamSelesai)
                            ->where('jam_selesai', '>', $jamMulai);
                    });
                })
                ->where('ruangan_id', $ruanganId)
                ->get()
        );

        // CSR
        $jadwalLain = $jadwalLain->merge(
            JadwalCSR::where('tanggal', $tanggal)
                ->where(function ($q) use ($jamMulai, $jamSelesai) {
                    $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                        $subQ->where('jam_mulai', '<', $jamSelesai)
                            ->where('jam_selesai', '>', $jamMulai);
                    });
                })
                ->where('ruangan_id', $ruanganId)
                ->get()
        );

        // Cek bentrok dengan kelompok besar (jika ada kelompok_besar_id di jadwal lain)
        $kelompokBesarBentrok = $this->checkKelompokBesarBentrok($request, $ruanganId, $jamMulai, $jamSelesai);
        if ($kelompokBesarBentrok) {
            return $kelompokBesarBentrok;
        }

        // Cek bentrok antar Kelompok Besar (Kelompok Besar vs Kelompok Besar)
        if (isset($request->kelompok_besar_id) && $request->kelompok_besar_id) {
            $kelompokBesarVsKelompokBesarBentrok = $this->checkKelompokBesarVsKelompokBesarBentrok($request, $ruanganId, $jamMulai, $jamSelesai);
            if ($kelompokBesarVsKelompokBesarBentrok) {
                return $kelompokBesarVsKelompokBesarBentrok;
            }
        }

        // Untuk jadwal materi, cek juga bentrok dengan pengampu
        if ($jenisBaris === 'materi' && ($dosenId || $dosenIds)) {
            $dosenIdsToCheck = [];
            if ($dosenId) {
                $dosenIdsToCheck[] = $dosenId;
            }
            if ($dosenIds && is_array($dosenIds)) {
                $dosenIdsToCheck = array_merge($dosenIdsToCheck, $dosenIds);
            }
            
            $jadwalLain = $jadwalLain->merge(
                JadwalKuliahBesar::where('tanggal', $tanggal)
                    ->where(function ($q) use ($jamMulai, $jamSelesai) {
                        $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                            $subQ->where('jam_mulai', '<', $jamSelesai)
                                ->where('jam_selesai', '>', $jamMulai);
                        });
                    })
                    ->where(function ($q) use ($dosenIdsToCheck) {
                        $q->whereIn('dosen_id', $dosenIdsToCheck)
                          ->orWhereJsonOverlaps('dosen_ids', $dosenIdsToCheck);
                    })
                    ->get()
            );

            // Note: JadwalPraktikum tidak memiliki dosen_id langsung, menggunakan tabel pivot
            // Jadi tidak perlu cek bentrok dengan pengampu untuk jadwal praktikum

            $jadwalLain = $jadwalLain->merge(
                JadwalPBL::where('tanggal', $tanggal)
                    ->where(function ($q) use ($jamMulai, $jamSelesai) {
                        $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                            $subQ->where('jam_mulai', '<', $jamSelesai)
                                ->where('jam_selesai', '>', $jamMulai);
                        });
                    })
                    ->where('dosen_id', $dosenId)
                    ->get()
            );

            $jadwalLain = $jadwalLain->merge(
                JadwalJurnalReading::where('tanggal', $tanggal)
                    ->where(function ($q) use ($jamMulai, $jamSelesai) {
                        $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                            $subQ->where('jam_mulai', '<', $jamSelesai)
                                ->where('jam_selesai', '>', $jamMulai);
                        });
                    })
                    ->where('dosen_id', $dosenId)
                    ->get()
            );

            $jadwalLain = $jadwalLain->merge(
                JadwalCSR::where('tanggal', $tanggal)
                    ->where(function ($q) use ($jamMulai, $jamSelesai) {
                        $q->where(function ($subQ) use ($jamMulai, $jamSelesai) {
                            $subQ->where('jam_mulai', '<', $jamSelesai)
                                ->where('jam_selesai', '>', $jamMulai);
                        });
                    })
                    ->where('dosen_id', $dosenId)
                    ->get()
            );
        }

        if ($jadwalLain->isNotEmpty()) {
            $jadwalBentrok = $jadwalLain->first();
            $jenisJadwal = $this->getJenisJadwal($jadwalBentrok);
            
            return "Jadwal bentrok dengan {$jenisJadwal} pada tanggal " . 
                   date('d/m/Y', strtotime($tanggal)) . " jam " . 
                   str_replace(':', '.', $jadwalBentrok->jam_mulai) . "-" . 
                   str_replace(':', '.', $jadwalBentrok->jam_selesai) . 
                   " di ruangan " . $jadwalBentrok->ruangan->nama;
        }

        // Cek bentrok dengan kelompok besar antara (jika ada kelompok_besar_antara_id)
        if (isset($request->kelompok_besar_antara_id) && $request->kelompok_besar_antara_id) {
            $kelompokBesarAntaraBentrok = $this->checkKelompokBesarAntaraBentrok($request, $ruanganId, $jamMulai, $jamSelesai);
            if ($kelompokBesarAntaraBentrok) {
                return $kelompokBesarAntaraBentrok;
            }
        }

        return false;
    }

    private function getJenisJadwal($jadwal)
    {
        if ($jadwal instanceof JadwalKuliahBesar) return 'Kuliah Besar';
        if ($jadwal instanceof JadwalAgendaKhusus) return 'Agenda Khusus';
        if ($jadwal instanceof JadwalPraktikum) return 'Praktikum';
        if ($jadwal instanceof JadwalPBL) return 'PBL';
        if ($jadwal instanceof JadwalJurnalReading) return 'Jurnal Reading';
        if ($jadwal instanceof JadwalCSR) return 'CSR';
        if ($jadwal instanceof JadwalNonBlokNonCSR) return $jadwal->jenis_baris === 'materi' ? 'Jadwal Materi' : 'Agenda Khusus';
        
        return 'Jadwal Lain';
    }

    // Reference data methods
    public function getDosenOptions(): JsonResponse
    {
        try {
            $dosen = \App\Models\User::where('role', 'dosen')
                ->select('id', 'name', 'nid')
                ->orderBy('name')
                ->get();
            return response()->json($dosen);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data dosen'], 500);
        }
    }

    public function getRuanganOptions(): JsonResponse
    {
        try {
            $ruangan = \App\Models\Ruangan::select('id', 'nama')
                ->orderBy('nama')
                ->get();
            return response()->json($ruangan);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data ruangan'], 500);
        }
    }

    public function getJamOptions(): JsonResponse
    {
        try {
            $jamOptions = [
                '07.20', '08.10', '09.00', '09.50', '10.40', '11.30', '12.35', 
                '13.25', '14.15', '15.05', '15.35', '16.25', '17.15'
            ];
            return response()->json($jamOptions);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data jam'], 500);
        }
    }



    /**
     * Validasi kapasitas ruangan berdasarkan jenis baris
     */
    private function validateRuanganCapacity($request)
    {
        // Ambil data ruangan
        $ruangan = \App\Models\Ruangan::find($request->ruangan_id);
        if (!$ruangan) {
            return 'Ruangan tidak ditemukan';
        }

        // Validasi berdasarkan jenis baris
        if ($request->jenis_baris === 'materi') {
            // Untuk Jadwal Materi: validasi berdasarkan kelompok besar + dosen jika ada
            if (isset($request->kelompok_besar_id) && $request->kelompok_besar_id) {
                // Untuk semester Antara, kelompok_besar_id sebenarnya adalah ID kelompok besar antara
                $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($request->kelompok_besar_id);
                if ($kelompokBesarAntara) {
                    $jumlahMahasiswa = count($kelompokBesarAntara->mahasiswa_ids ?? []);
                    $totalPeserta = $jumlahMahasiswa + 1; // +1 untuk dosen
                    if ($totalPeserta > $ruangan->kapasitas) {
                        return "Kapasitas ruangan {$ruangan->nama} ({$ruangan->kapasitas} orang) tidak mencukupi untuk {$totalPeserta} peserta ({$jumlahMahasiswa} mahasiswa + 1 dosen).";
                    }
                }
            } else if (isset($request->kelompok_besar_antara_id) && $request->kelompok_besar_antara_id) {
                // Untuk kelompok besar antara
                $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($request->kelompok_besar_antara_id);
                if ($kelompokBesarAntara) {
                    $jumlahMahasiswa = count($kelompokBesarAntara->mahasiswa_ids ?? []);
                    $totalPeserta = $jumlahMahasiswa + 1; // +1 untuk dosen
                    if ($totalPeserta > $ruangan->kapasitas) {
                        return "Kapasitas ruangan {$ruangan->nama} ({$ruangan->kapasitas} orang) tidak mencukupi untuk {$totalPeserta} peserta ({$jumlahMahasiswa} mahasiswa + 1 dosen).";
                    }
                }
            } else {
                // Jika tidak ada kelompok besar, hanya pastikan kapasitas minimal 1 orang untuk dosen
                if ($ruangan->kapasitas < 1) {
                    return "Ruangan {$ruangan->nama} tidak memiliki kapasitas yang valid.";
                }
            }
        } else if ($request->jenis_baris === 'agenda') {
            // Untuk Agenda Khusus: validasi berdasarkan kelompok besar jika ada
            if (isset($request->kelompok_besar_id) && $request->kelompok_besar_id) {
                // Untuk semester Antara, kelompok_besar_id sebenarnya adalah ID kelompok besar antara
                $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($request->kelompok_besar_id);
                if ($kelompokBesarAntara) {
                    $jumlahMahasiswa = count($kelompokBesarAntara->mahasiswa_ids ?? []);
                    $totalPeserta = $jumlahMahasiswa; // Tidak ada dosen untuk agenda khusus
                    if ($totalPeserta > $ruangan->kapasitas) {
                        return "Kapasitas ruangan {$ruangan->nama} ({$ruangan->kapasitas} orang) tidak mencukupi untuk {$totalPeserta} mahasiswa.";
                    }
                }
            } else if (isset($request->kelompok_besar_antara_id) && $request->kelompok_besar_antara_id) {
                // Untuk kelompok besar antara
                $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($request->kelompok_besar_antara_id);
                if ($kelompokBesarAntara) {
                    $jumlahMahasiswa = count($kelompokBesarAntara->mahasiswa_ids ?? []);
                    $totalPeserta = $jumlahMahasiswa; // Tidak ada dosen untuk agenda khusus
                    if ($totalPeserta > $ruangan->kapasitas) {
                        return "Kapasitas ruangan {$ruangan->nama} ({$ruangan->kapasitas} orang) tidak mencukupi untuk {$totalPeserta} mahasiswa.";
                    }
                }
            } else {
                // Jika tidak ada kelompok besar, hanya pastikan kapasitas minimal 1 orang
                if ($ruangan->kapasitas < 1) {
                    return "Ruangan {$ruangan->nama} tidak memiliki kapasitas yang valid.";
                }
            }
        }

        return null; // Kapasitas mencukupi
    }

    public function kelompokBesar(Request $request)
    {
        $semester = $request->query('semester');
        if (!$semester) {
            return response()->json(['message' => 'Parameter semester diperlukan'], 400);
        }
        
        // Jika semester antara, ambil dari kelompok_besar_antara
        if ($semester === 'Antara') {
            $kelompokBesarAntara = \App\Models\KelompokBesarAntara::orderBy('nama_kelompok')->get();
            
            return response()->json($kelompokBesarAntara->map(function($kelompok) {
                $mahasiswaCount = count($kelompok->mahasiswa_ids ?? []);
                return [
                    'id' => $kelompok->id,
                    'label' => "{$kelompok->nama_kelompok} ({$mahasiswaCount} mahasiswa)",
                    'jumlah_mahasiswa' => $mahasiswaCount
                ];
            }));
        }
        
        // Untuk semester biasa
        $jumlahMahasiswa = \App\Models\KelompokBesar::where('semester', $semester)->count();
        if ($jumlahMahasiswa > 0) {
            return response()->json([
                [
                    'id' => $semester, // Gunakan semester sebagai ID
                    'label' => "Kelompok Besar Semester {$semester} ({$jumlahMahasiswa} mahasiswa)",
                    'jumlah_mahasiswa' => $jumlahMahasiswa
                ]
            ]);
        }
        return response()->json([]);
    }

    private function checkKelompokBesarBentrok(Request $request, $ruanganId, $jamMulai, $jamSelesai)
    {
        $tanggal = $request->tanggal;
        $kelompokBesarId = $request->kelompok_besar_id;

        if (!$kelompokBesarId) {
            return false;
        }

        // Ambil mahasiswa dalam kelompok besar yang dipilih
        $mahasiswaIds = \App\Models\KelompokBesar::where('semester', $kelompokBesarId)
            ->pluck('mahasiswa_id')
            ->toArray();

        if (empty($mahasiswaIds)) {
            return false;
        }

        // Cek bentrok dengan jadwal PBL yang menggunakan kelompok kecil dari mahasiswa yang sama
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $tanggal)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->whereHas('kelompokKecil', function($q) use ($mahasiswaIds) {
                $q->whereIn('mahasiswa_id', $mahasiswaIds);
            })
            ->exists();

        // Cek bentrok dengan jadwal Jurnal Reading yang menggunakan kelompok kecil dari mahasiswa yang sama
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $tanggal)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->whereHas('kelompokKecil', function($q) use ($mahasiswaIds) {
                $q->whereIn('mahasiswa_id', $mahasiswaIds);
            })
            ->exists();

        if ($pblBentrok) {
            return "Jadwal bentrok dengan Jadwal PBL pada tanggal " . 
                   date('d/m/Y', strtotime($tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar vs Kelompok Kecil)";
        }

        if ($jurnalBentrok) {
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar vs Kelompok Kecil)";
        }

        return false;
    }

    private function checkKelompokBesarVsKelompokBesarBentrok(Request $request, $ruanganId, $jamMulai, $jamSelesai)
    {
        // Cek bentrok dengan jadwal Kuliah Besar yang menggunakan kelompok besar yang sama
        $kuliahBesarBentrok = \App\Models\JadwalKuliahBesar::where('tanggal', $request->tanggal)
            ->where('kelompok_besar_id', $request->kelompok_besar_id)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->exists();

        // Cek bentrok dengan jadwal Agenda Khusus yang menggunakan kelompok besar yang sama
        $agendaKhususBentrok = \App\Models\JadwalAgendaKhusus::where('tanggal', $request->tanggal)
            ->where('kelompok_besar_id', $request->kelompok_besar_id)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->exists();

        // Cek bentrok dengan jadwal Non-Blok Non-CSR lain yang menggunakan kelompok besar yang sama
        $nonBlokNonCSRBentrok = JadwalNonBlokNonCSR::where('tanggal', $request->tanggal)
            ->where('kelompok_besar_id', $request->kelompok_besar_id)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->exists();

        if ($kuliahBesarBentrok) {
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($request->tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar vs Kelompok Besar: Kelompok Besar Semester " . $request->kelompok_besar_id . ")";
        }

        if ($agendaKhususBentrok) {
            return "Jadwal bentrok dengan Jadwal Agenda Khusus pada tanggal " . 
                   date('d/m/Y', strtotime($request->tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar vs Kelompok Besar: Kelompok Besar Semester " . $request->kelompok_besar_id . ")";
        }

        if ($nonBlokNonCSRBentrok) {
            return "Jadwal bentrok dengan Jadwal Non-Blok Non-CSR pada tanggal " . 
                   date('d/m/Y', strtotime($request->tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar vs Kelompok Besar: Kelompok Besar Semester " . $request->kelompok_besar_id . ")";
        }

        return false;
    }

    private function checkKelompokBesarAntaraBentrok(Request $request, $ruanganId, $jamMulai, $jamSelesai)
    {
        $tanggal = $request->tanggal;
        $kelompokBesarAntaraId = $request->kelompok_besar_antara_id;

        // Ambil mahasiswa dari kelompok besar antara
        $kelompokBesarAntara = \App\Models\KelompokBesarAntara::find($kelompokBesarAntaraId);
        if (!$kelompokBesarAntara || empty($kelompokBesarAntara->mahasiswa_ids)) {
            return false;
        }

        $mahasiswaIds = $kelompokBesarAntara->mahasiswa_ids;

        // Cek bentrok dengan jadwal PBL yang menggunakan kelompok kecil antara dari mahasiswa yang sama
        $pblBentrok = \App\Models\JadwalPBL::where('tanggal', $tanggal)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->whereHas('kelompokKecilAntara', function($q) use ($mahasiswaIds) {
                $q->whereJsonOverlaps('mahasiswa_ids', $mahasiswaIds);
            })
            ->exists();

        // Cek bentrok dengan jadwal Jurnal Reading yang menggunakan kelompok kecil dari mahasiswa yang sama
        $jurnalBentrok = \App\Models\JadwalJurnalReading::where('tanggal', $tanggal)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->whereHas('kelompokKecil', function($q) use ($mahasiswaIds) {
                $q->whereIn('mahasiswa_id', $mahasiswaIds);
            })
            ->exists();

        // Cek bentrok dengan jadwal Kuliah Besar yang menggunakan kelompok besar antara yang sama
        $kuliahBesarBentrok = \App\Models\JadwalKuliahBesar::where('tanggal', $tanggal)
            ->where('kelompok_besar_antara_id', $kelompokBesarAntaraId)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->exists();

        // Cek bentrok dengan jadwal Non-Blok Non-CSR lain yang menggunakan kelompok besar antara yang sama
        $nonBlokNonCSRBentrok = JadwalNonBlokNonCSR::where('tanggal', $tanggal)
            ->where('kelompok_besar_antara_id', $kelompokBesarAntaraId)
            ->where('id', '!=', $request->id ?? 0)
            ->where(function($q) use ($jamMulai, $jamSelesai) {
                $q->where('jam_mulai', '<', $jamSelesai)
                   ->where('jam_selesai', '>', $jamMulai);
            })
            ->exists();

        if ($pblBentrok) {
            return "Jadwal bentrok dengan Jadwal PBL pada tanggal " . 
                   date('d/m/Y', strtotime($tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar Antara vs Kelompok Kecil Antara)";
        }

        if ($jurnalBentrok) {
            return "Jadwal bentrok dengan Jadwal Jurnal Reading pada tanggal " . 
                   date('d/m/Y', strtotime($tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar Antara vs Kelompok Kecil)";
        }

        if ($kuliahBesarBentrok) {
            return "Jadwal bentrok dengan Jadwal Kuliah Besar pada tanggal " . 
                   date('d/m/Y', strtotime($tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar Antara vs Kelompok Besar Antara)";
        }

        if ($nonBlokNonCSRBentrok) {
            return "Jadwal bentrok dengan Jadwal Non-Blok Non-CSR pada tanggal " . 
                   date('d/m/Y', strtotime($tanggal)) . " jam " . 
                   str_replace(':', '.', $jamMulai) . "-" . str_replace(':', '.', $jamSelesai) . 
                   " (Kelompok Besar Antara vs Kelompok Besar Antara)";
        }

        return false;
    }
} 