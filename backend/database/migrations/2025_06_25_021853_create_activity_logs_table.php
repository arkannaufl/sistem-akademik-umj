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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action'); // CREATE, UPDATE, DELETE, IMPORT, LOGIN, LOGOUT, etc.
            $table->string('module'); // USER, MATA_KULIAH, RUANGAN, KEGIATAN, etc.
            $table->string('description');
            $table->json('old_data')->nullable(); // Data sebelum perubahan
            $table->json('new_data')->nullable(); // Data setelah perubahan
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('file_name')->nullable(); // Untuk import excel
            $table->integer('records_count')->nullable(); // Jumlah record yang diproses
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['action', 'module']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
