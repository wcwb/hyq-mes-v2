<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// i18n 测试页面路由
Route::get('i18n-test', function () {
    return Inertia::render('settings/I18nTest');
})->name('i18n.test');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
