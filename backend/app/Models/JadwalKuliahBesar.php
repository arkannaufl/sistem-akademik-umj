<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JadwalKuliahBesar extends Model
{
    use HasFactory;

    protected $table = 'jadwal_kuliah_besar';

    protected $fillable = [
        'mata_kuliah_kode',
        'materi',
        'topik',
        'dosen_id',
        'ruangan_id',
        'kelompok_besar_id',
        'tanggal',
        'jam_mulai',
        'jam_selesai',
        'jumlah_sesi',
    ];

    // Relasi
    public function mataKuliah() { return $this->belongsTo(MataKuliah::class, 'mata_kuliah_kode', 'kode'); }
    public function dosen() { return $this->belongsTo(User::class, 'dosen_id'); }
    public function ruangan() { return $this->belongsTo(Ruangan::class, 'ruangan_id'); }
    // Kelompok besar sekarang disimpan sebagai semester, bukan ID
    // public function kelompokBesar() { return $this->belongsTo(KelompokBesar::class, 'kelompok_besar_id'); }
}
