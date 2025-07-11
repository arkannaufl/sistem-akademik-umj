<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MataKuliahPBLKelompokKecilController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/pbl-kelompok-kecil/list', [MataKuliahPBLKelompokKecilController::class, 'listKelompokWithStatus']);
