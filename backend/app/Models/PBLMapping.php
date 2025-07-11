<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PBLMapping extends Model
{
    use HasFactory;

    protected $table = 'pbl_mappings';

    protected $fillable = [
        'pbl_id',
        'dosen_id'
    ];

    // Relasi ke PBL
    public function pbl()
    {
        return $this->belongsTo(PBL::class, 'pbl_id');
    }

    // Relasi ke dosen
    public function dosen()
    {
        return $this->belongsTo(User::class, 'dosen_id');
    }
} 