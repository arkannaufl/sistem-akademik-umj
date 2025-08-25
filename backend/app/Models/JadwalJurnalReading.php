<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JadwalJurnalReading extends Model
{
    use HasFactory;

    protected $table = 'jadwal_jurnal_reading';

    protected $fillable = [
        'mata_kuliah_kode',
        'tanggal',
        'jam_mulai',
        'jam_selesai',
        'jumlah_sesi',
        'kelompok_kecil_id',
        'dosen_id',
        'ruangan_id',
        'topik',
        'file_jurnal',
    ];

    // Relasi
    public function mataKuliah() { return $this->belongsTo(MataKuliah::class, 'mata_kuliah_kode', 'kode'); }
    public function kelompokKecil() { return $this->belongsTo(KelompokKecil::class, 'kelompok_kecil_id'); }
    public function dosen() { return $this->belongsTo(User::class, 'dosen_id'); }
    public function ruangan() { return $this->belongsTo(Ruangan::class, 'ruangan_id'); }
}
