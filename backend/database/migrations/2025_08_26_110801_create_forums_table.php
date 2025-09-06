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
        Schema::create('forums', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // Judul forum diskusi
            $table->text('content'); // Konten/deskripsi forum
            $table->string('slug')->unique(); // Slug untuk URL forum
            $table->foreignId('category_id')->constrained('forum_categories')->onDelete('cascade'); // Kategori forum
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Pembuat forum
            $table->enum('status', ['active', 'closed', 'pinned', 'archived'])->default('active'); // Status forum
            $table->json('attachments')->nullable(); // File, gambar, video yang diupload
            $table->json('tags')->nullable(); // Tags/keywords
            $table->integer('views_count')->default(0); // Jumlah view
            $table->integer('replies_count')->default(0); // Jumlah reply
            $table->timestamp('last_activity_at')->nullable(); // Terakhir ada aktivitas
            $table->foreignId('last_reply_by')->nullable()->constrained('users')->onDelete('set null'); // User terakhir reply
            $table->boolean('is_anonymous')->default(false); // Apakah posting anonim
            $table->datetime('deadline')->nullable(); // Deadline diskusi (opsional)
            $table->json('target_audience')->nullable(); // Target audience (semua, kelas tertentu, etc)
            $table->timestamps();

            // Indexes untuk performance
            $table->index(['category_id', 'status']);
            $table->index(['user_id', 'created_at']);
            $table->index('last_activity_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('forums');
    }
};
