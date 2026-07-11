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
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\ImageKitController;
use App\Http\Controllers\ProductImportController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/ping', fn() => response('ok', 200));

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Products & Categories
    Route::resource('products', ProductController::class);
    Route::get('/products-import/sample', [ProductImportController::class, 'sample'])->name('products.import.sample');
    Route::post('/products-import',       [ProductImportController::class, 'import'])->name('products.import');
    Route::resource('categories', CategoryController::class);
    Route::get('/promotions', [ProductController::class, 'promotions'])->name('promotions.index');

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
    Route::get('/api/products/search',  [ProductController::class, 'search'])->name('products.search');
    Route::get('/api/products/all',     [ProductController::class, 'all'])->name('products.all');
    Route::get('/api/products/version', [ProductController::class, 'version'])->name('products.version');
    Route::get('/api/imagekit/auth',    [ImageKitController::class, 'auth'])->name('imagekit.auth');

    // Purchases / GRN
    Route::resource('purchases', PurchaseController::class)->only(['index', 'create', 'store', 'show', 'destroy']);

    // Reports
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::get('/today', [ReportController::class, 'todaySales'])->name('today');
        Route::get('/day-end', [ReportController::class, 'dayEnd'])->name('day-end');
        Route::get('/monthly', [ReportController::class, 'monthlySales'])->name('monthly');
        Route::get('/top-products', [ReportController::class, 'topProducts'])->name('top-products');
        Route::get('/low-stock', [ReportController::class, 'lowStock'])->name('low-stock');
        Route::get('/profit', [ReportController::class, 'profitReport'])->name('profit');
        Route::get('/credit-customers', [ReportController::class, 'creditCustomers'])->name('credit-customers');
        Route::get('/stock-summary', [ReportController::class, 'stockSummary'])->name('stock-summary');
        Route::get('/revenue', [ReportController::class, 'revenueReport'])->name('revenue');
    });

    // Settings (admin only)
    Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
    Route::post('/settings', [SettingController::class, 'update'])->name('settings.save');
    Route::post('/api/settings', [SettingController::class, 'update'])->name('settings.update');

    // Users & Permissions (admin only)
    Route::resource('users', UserController::class);

    // Device registry (admin only)
    Route::get('/devices',              [DeviceController::class, 'index'])->name('devices.index');
    Route::post('/devices',             [DeviceController::class, 'store'])->name('devices.store');
    Route::put('/devices/{key}',        [DeviceController::class, 'update'])->name('devices.update');
    Route::delete('/devices/{key}',     [DeviceController::class, 'destroy'])->name('devices.destroy');

    // License management (admin only)
    Route::get('/licenses',                       [\App\Http\Controllers\LicenseController::class, 'index'])->name('licenses.index');
    Route::post('/licenses',                      [\App\Http\Controllers\LicenseController::class, 'store'])->name('licenses.store');
    Route::patch('/licenses/{license}',           [\App\Http\Controllers\LicenseController::class, 'update'])->name('licenses.update');
    Route::post('/licenses/{license}/upgrade',    [\App\Http\Controllers\LicenseController::class, 'upgrade'])->name('licenses.upgrade');
    Route::delete('/licenses/{license}',          [\App\Http\Controllers\LicenseController::class, 'destroy'])->name('licenses.destroy');
});

require __DIR__.'/auth.php';
