<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JadwalPBL extends Model
{
    use HasFactory;

    protected $table = 'jadwal_pbl';

    protected $fillable = [
        'mata_kuliah_kode',
        'pbl_id',
        'kelompok_kecil_id',
        'dosen_id',
        'ruangan_id',
        'tanggal',
        'jam_mulai',
        'jam_selesai',
        'jumlah_sesi',
        'pbl_tipe',
        'status_konfirmasi',
    ];

    // Relasi
    public function mataKuliah() { return $this->belongsTo(MataKuliah::class, 'mata_kuliah_kode', 'kode'); }
    public function modulPBL() { return $this->belongsTo(PBL::class, 'pbl_id'); }
    public function kelompokKecil() { return $this->belongsTo(KelompokKecil::class, 'kelompok_kecil_id'); }
    public function dosen() { return $this->belongsTo(User::class, 'dosen_id'); }
    public function ruangan() { return $this->belongsTo(Ruangan::class, 'ruangan_id'); }
}
