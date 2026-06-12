<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Products & Categories
    Route::resource('products', ProductController::class);
    Route::resource('categories', CategoryController::class);

    // Suppliers & Customers
    Route::resource('suppliers', SupplierController::class);
    Route::post('/customers/quick-add', [CustomerController::class, 'quickStore'])->name('customers.quick-store');
    Route::resource('customers', CustomerController::class);
    Route::post('/customers/{customer}/settle-credit', [CustomerController::class, 'settleCredit'])->name('customers.settle-credit');

    // ණය පොත (Credit Book)
    Route::get('/naya-potha', [CustomerController::class, 'nayaPotha'])->name('naya-potha.index');

    // Sales / Billing
    Route::resource('sales', SaleController::class)->only(['index', 'create', 'store', 'show']);
    Route::post('/sales/hold', [SaleController::class, 'holdBill'])->name('sales.hold');
    Route::get('/sales/held', [SaleController::class, 'getHeldBills'])->name('sales.held');
    Route::get('/api/products/search', [ProductController::class, 'search'])->name('products.search');
    Route::get('/api/products/all',    [ProductController::class, 'all'])->name('products.all');

    // Purchases / GRN
    Route::resource('purchases', PurchaseController::class)->only(['index', 'create', 'store', 'show']);

    // Reports
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::get('/today', [ReportController::class, 'todaySales'])->name('today');
        Route::get('/monthly', [ReportController::class, 'monthlySales'])->name('monthly');
        Route::get('/top-products', [ReportController::class, 'topProducts'])->name('top-products');
        Route::get('/low-stock', [ReportController::class, 'lowStock'])->name('low-stock');
        Route::get('/profit', [ReportController::class, 'profitReport'])->name('profit');
        Route::get('/credit-customers', [ReportController::class, 'creditCustomers'])->name('credit-customers');
    });

    // Settings (admin only)
    Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
    Route::post('/settings', [SettingController::class, 'update'])->name('settings.update');

    // Users & Permissions (admin only)
    Route::resource('users', UserController::class);
});

require __DIR__.'/auth.php';
