<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JadwalNonBlokNonCSR extends Model
{
    use HasFactory;

    protected $table = 'jadwal_non_blok_non_csr';

    protected $fillable = [
        'mata_kuliah_kode',
        'tanggal',
        'jam_mulai',
        'jam_selesai',
        'jumlah_sesi',
        'jenis_baris',
        'agenda',
        'materi',
        'dosen_id',
        'ruangan_id',
        'kelompok_besar_id',
        'use_ruangan',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'jam_mulai' => 'string',
        'jam_selesai' => 'string',
        'use_ruangan' => 'boolean',
    ];

    public function mataKuliah()
    {
        return $this->belongsTo(MataKuliah::class, 'mata_kuliah_kode', 'kode');
    }

    public function dosen()
    {
        return $this->belongsTo(User::class, 'dosen_id');
    }

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class, 'ruangan_id');
    }
} 