<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Kegiatan extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'nama',
        'tanggal_mulai',
        'tanggal_akhir',
        'warna',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn(string $eventName) => "Kegiatan {$this->nama} telah di-{$eventName}");
    }
}
