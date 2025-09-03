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
        Schema::table('jadwal_non_blok_non_csr', function (Blueprint $table) {
            $table->json('dosen_ids')->nullable()->after('dosen_id');
            $table->unsignedBigInteger('kelompok_besar_antara_id')->nullable()->after('kelompok_besar_id');
            $table->foreign('kelompok_besar_antara_id')->references('id')->on('kelompok_besar_antara')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jadwal_non_blok_non_csr', function (Blueprint $table) {
            $table->dropForeign(['kelompok_besar_antara_id']);
            $table->dropColumn(['dosen_ids', 'kelompok_besar_antara_id']);
        });
    }
};
