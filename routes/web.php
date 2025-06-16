<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\SearchController;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

/* Route::get('dashboard', function () {
    return Inertia::render('Dashboard', [
        'meta' => [
            'title' => '仪表板',
            'icon' => '📊',
            'closable' => false,
        ]
    ]);
})->middleware(['auth', 'verified'])->name('dashboard'); */


Route::get('dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');


// i18n 测试页面路由
Route::get('i18n-test', function () {
    return Inertia::render('settings/I18nTest');
})->name('i18n.test');

// TopMenuBar 测试页面路由
Route::get('test/topmenubar', function () {
    return Inertia::render('test/TopMenuBarTest');
})->name('test.topmenubar');

// 搜索API演示页面路由
Route::get('test/search-api', function () {
    return Inertia::render('test/SearchApiDemo');
})->middleware(['auth', 'verified'])->name('test.search-api');

// 搜索分组演示页面路由
Route::get('test/search-grouping', function () {
    return Inertia::render('test/SearchGroupingDemo');
})->middleware(['auth', 'verified'])->name('test.search-grouping');

// 搜索API路由
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('api/search', [SearchController::class, 'globalSearch'])
        ->name('api.search');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
