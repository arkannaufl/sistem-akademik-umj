<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CSRMapping extends Model
{
    use HasFactory;

    protected $table = 'csr_mappings';

    protected $fillable = [
        'csr_id',
        'dosen_id'
    ];

    // Relasi ke CSR
    public function csr()
    {
        return $this->belongsTo(CSR::class, 'csr_id');
    }

    // Relasi ke dosen
    public function dosen()
    {
        return $this->belongsTo(User::class, 'dosen_id');
    }
}
