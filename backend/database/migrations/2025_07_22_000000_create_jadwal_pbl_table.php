<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('jadwal_pbl', function (Blueprint $table) {
            $table->id();
            $table->string('mata_kuliah_kode');
            $table->unsignedBigInteger('modul_pbl_id');
            $table->unsignedBigInteger('kelompok_kecil_id');
            $table->unsignedBigInteger('dosen_id');
            $table->unsignedBigInteger('ruangan_id');
            $table->date('tanggal');
            $table->string('jam_mulai');
            $table->string('jam_selesai');
            $table->integer('jumlah_sesi')->default(2);
            $table->string('pbl_tipe')->nullable();
            $table->timestamps();

            $table->foreign('mata_kuliah_kode')->references('kode')->on('mata_kuliah')->onDelete('cascade');
            $table->foreign('modul_pbl_id')->references('id')->on('pbls')->onDelete('cascade');
            $table->foreign('kelompok_kecil_id')->references('id')->on('kelompok_kecil')->onDelete('cascade');
            $table->foreign('dosen_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('ruangan_id')->references('id')->on('ruangan')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jadwal_pbl');
    }
};
