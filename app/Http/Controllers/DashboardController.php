<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today      = Carbon::today()->toDateString();
        $monthStart = Carbon::now()->startOfMonth()->toDateTimeString();

        $todaySales = \Illuminate\Support\Facades\Cache::remember('dash_today_' . $today, 60, fn () =>
            Sale::whereDate('created_at', $today)->where('status', '!=', 'held')->sum('total')
        );

        $monthSales = \Illuminate\Support\Facades\Cache::remember('dash_month_' . $today, 120, fn () =>
            Sale::whereBetween('created_at', [$monthStart, now()])->where('status', '!=', 'held')->sum('total')
        );

        $totalProducts = \Illuminate\Support\Facades\Cache::remember('dash_product_count', 300, fn () =>
            Product::count()
        );

        $lowStockCount = \Illuminate\Support\Facades\Cache::remember('dash_lowstock', 120, fn () =>
            Product::whereColumn('stock_qty', '<=', 'alert_qty')->count()
        );

        $recentSales = Sale::with('user')
            ->where('status', '!=', 'held')
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('Dashboard', [
            'todaySales'    => $todaySales,
            'monthSales'    => $monthSales,
            'totalProducts' => $totalProducts,
            'lowStockCount' => $lowStockCount,
            'recentSales'   => $recentSales,
        ])->with(['flash' => session('flash')]);
    }
}
