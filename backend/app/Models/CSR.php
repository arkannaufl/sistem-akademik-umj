<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CSR extends Model
{
    use HasFactory;

    protected $table = 'csrs';

    protected $fillable = [
        'mata_kuliah_kode',
        'nomor_csr',
        'nama',
        'keahlian_required',
        'tanggal_mulai',
        'tanggal_akhir',
        'status'
    ];

    protected $casts = [
        'keahlian_required' => 'array',
        'tanggal_mulai' => 'date',
        'tanggal_akhir' => 'date'
    ];

    // Accessor untuk mendapatkan semester dari nomor_csr
    public function getSemesterAttribute()
    {
        $parts = explode('.', $this->nomor_csr);
        return isset($parts[0]) ? (int) $parts[0] : null;
    }

    // Accessor untuk mendapatkan blok dari nomor_csr
    public function getBlokAttribute()
    {
        $parts = explode('.', $this->nomor_csr);
        return isset($parts[1]) ? (int) $parts[1] : null;
    }

    // Relasi ke mata kuliah
    public function mataKuliah()
    {
        return $this->belongsTo(MataKuliah::class, 'mata_kuliah_kode', 'kode');
    }

    // Relasi ke dosen melalui mapping
    public function dosen()
    {
        return $this->belongsToMany(User::class, 'csr_mappings', 'csr_id', 'dosen_id')
                    ->withTimestamps();
    }

    // Relasi ke mapping
    public function mappings()
    {
        return $this->hasMany(CSRMapping::class, 'csr_id');
    }

    // Scope untuk mata kuliah yang tersedia
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    // Scope untuk mata kuliah yang sudah ditugaskan
    public function scopeAssigned($query)
    {
        return $query->where('status', 'assigned');
    }

    // Scope untuk mata kuliah yang selesai
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}
