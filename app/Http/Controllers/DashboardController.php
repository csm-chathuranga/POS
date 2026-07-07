<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today      = Carbon::today()->toDateString();
        $monthStart = Carbon::now()->startOfMonth()->toDateTimeString();

        $todaySales = Cache::remember('dash_today_rev_' . $today, 60, fn () =>
            Sale::whereDate('created_at', $today)->where('status', '!=', 'held')->sum('total')
        );

        $todayBills = Cache::remember('dash_today_bills_' . $today, 60, fn () =>
            Sale::whereDate('created_at', $today)->where('status', '!=', 'held')->count()
        );

        $monthSales = Cache::remember('dash_month_' . $today, 120, fn () =>
            Sale::whereBetween('created_at', [$monthStart, now()])->where('status', '!=', 'held')->sum('total')
        );

        $monthBills = Cache::remember('dash_month_bills_' . $today, 120, fn () =>
            Sale::whereBetween('created_at', [$monthStart, now()])->where('status', '!=', 'held')->count()
        );

        $totalProducts = Cache::remember('dash_product_count', 300, fn () =>
            Product::where('active', true)->count()
        );

        $lowStockCount = Cache::remember('dash_lowstock', 120, fn () =>
            Product::whereColumn('stock_qty', '<=', 'alert_qty')->count()
        );

        // Today by payment method
        $todayByPayment = DB::table('payments')
            ->join('sales', 'payments.sale_id', '=', 'sales.id')
            ->whereDate('sales.created_at', $today)
            ->where('sales.status', '!=', 'held')
            ->selectRaw('payments.method, SUM(payments.amount) as total, COUNT(DISTINCT payments.sale_id) as bills')
            ->groupBy('payments.method')
            ->get();

        // Last 3 days — daily totals + hourly breakdown
        $last3Days = [];
        for ($i = 2; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i)->toDateString();

            $rows = DB::table('sales')
                ->whereDate('created_at', $date)
                ->where('status', '!=', 'held')
                ->selectRaw('HOUR(created_at) as hour, SUM(total) as total, COUNT(*) as bills')
                ->groupBy(DB::raw('HOUR(created_at)'))
                ->orderBy('hour')
                ->get();

            $hourly = [];
            for ($h = 6; $h <= 22; $h++) {
                $row = $rows->firstWhere('hour', $h);
                $hourly[] = ['hour' => $h, 'total' => (float) ($row->total ?? 0), 'bills' => (int) ($row->bills ?? 0)];
            }

            $last3Days[] = [
                'date'   => $date,
                'label'  => $i === 0 ? 'Today' : ($i === 1 ? 'Yesterday' : Carbon::today()->subDays($i)->format('D d')),
                'total'  => (float) collect($rows)->sum('total'),
                'bills'  => (int)   collect($rows)->sum('bills'),
                'hourly' => $hourly,
            ];
        }

        // Heatmap — last 10 weeks by day-of-week (Mon–Sun)
        $heatmapFrom = Carbon::today()->startOfWeek(Carbon::MONDAY)->subWeeks(9);
        $heatmapRows = DB::table('sales')
            ->where('created_at', '>=', $heatmapFrom)
            ->where('status', '!=', 'held')
            ->selectRaw('DATE(created_at) as date, SUM(total) as total, COUNT(*) as bills')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->get()
            ->keyBy('date');

        $heatmap = [];
        $cursor  = $heatmapFrom->copy();
        $end     = Carbon::today();
        while ($cursor->lte($end)) {
            $dateStr = $cursor->toDateString();
            $row     = $heatmapRows->get($dateStr);
            $heatmap[] = [
                'date'  => $dateStr,
                'dow'   => $cursor->dayOfWeekIso, // 1=Mon … 7=Sun
                'week'  => $cursor->diffInWeeks($heatmapFrom),
                'total' => (float) ($row->total ?? 0),
                'bills' => (int)   ($row->bills ?? 0),
            ];
            $cursor->addDay();
        }

        // Fast moving items — top 8 by qty sold in last 30 days
        $fastMoving = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', Carbon::now()->subDays(30))
            ->where('sales.status', '!=', 'held')
            ->selectRaw('sale_items.product_id, sale_items.product_name, SUM(sale_items.qty) as total_qty, SUM(sale_items.total) as total_revenue, COUNT(DISTINCT sales.id) as bill_count')
            ->groupBy('sale_items.product_id', 'sale_items.product_name')
            ->orderByDesc('total_qty')
            ->limit(8)
            ->get();

        $recentSales = Sale::with('user')
            ->where('status', '!=', 'held')
            ->latest()
            ->take(8)
            ->get();

        $expiringSoon = Product::with('category')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', Carbon::today()->addDays(30))
            ->where('stock_qty', '>', 0)
            ->orderBy('expiry_date')
            ->take(10)
            ->get(['id', 'name', 'name_si', 'category_id', 'expiry_date', 'stock_qty', 'unit']);

        return Inertia::render('Dashboard', [
            'todaySales'     => $todaySales,
            'todayBills'     => $todayBills,
            'monthSales'     => $monthSales,
            'monthBills'     => $monthBills,
            'totalProducts'  => $totalProducts,
            'lowStockCount'  => $lowStockCount,
            'todayByPayment' => $todayByPayment,
            'last3Days'      => $last3Days,
            'heatmap'        => $heatmap,
            'fastMoving'     => $fastMoving,
            'recentSales'    => $recentSales,
            'expiringSoon'   => $expiringSoon,
        ])->with(['flash' => session('flash')]);
    }
}
