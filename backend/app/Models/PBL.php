<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\PBLMapping;

class PBL extends Model
{
    protected $table = 'pbls';

    protected $fillable = [
        'mata_kuliah_kode',
        'modul_ke',
        'nama_modul',
    ];

    public function mataKuliah()
    {
        return $this->belongsTo(MataKuliah::class, 'mata_kuliah_kode', 'kode');
    }

    public function mappings()
    {
        return $this->hasMany(PBLMapping::class, 'pbl_id');
    }

    public function dosen()
    {
        return $this->belongsToMany(User::class, 'pbl_mappings', 'pbl_id', 'dosen_id');
    }
}
