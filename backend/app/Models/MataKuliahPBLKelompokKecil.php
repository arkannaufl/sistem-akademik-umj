<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MataKuliahPBLKelompokKecil extends Model
{
    protected $table = 'mata_kuliah_pbl_kelompok_kecil';

    protected $fillable = [
        'mata_kuliah_kode',
        'nama_kelompok',
        'semester',
    ];

    /**
     * Get the mata kuliah that owns the mapping
     */
    public function mataKuliah(): BelongsTo
    {
        return $this->belongsTo(MataKuliah::class, 'mata_kuliah_kode', 'kode');
    }

    // Relasi ke kelompok kecil bisa menggunakan nama_kelompok dan semester jika diperlukan
} 