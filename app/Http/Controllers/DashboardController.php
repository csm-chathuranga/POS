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
        $today = Carbon::today()->toDateString();
        $hour  = now()->hour;

        $tenant   = config('database.connections.mysql.database');
        $cacheKey = $tenant . '_dashboard_' . $today . '_h' . $hour;

        $data = Cache::remember($cacheKey, 3600, function () use ($today) {
            $monthStart = Carbon::now()->startOfMonth()->startOfDay();
            $now        = now();

            // ── Scalar stats (4 queries) ──────────────────────────────
            [$todaySales, $todayBills, $monthSales, $monthBills] = [
                Sale::whereDate('created_at', $today)->where('status', '!=', 'held')->sum('total'),
                Sale::whereDate('created_at', $today)->where('status', '!=', 'held')->count(),
                Sale::whereBetween('created_at', [$monthStart, $now])->where('status', '!=', 'held')->sum('total'),
                Sale::whereBetween('created_at', [$monthStart, $now])->where('status', '!=', 'held')->count(),
            ];

            $totalProducts = Product::where('active', true)->count();
            $lowStockCount = Product::whereColumn('stock_qty', '<=', 'alert_qty')->count();

            // ── Today by payment method ───────────────────────────────
            $todayByPayment = DB::table('payments')
                ->join('sales', 'payments.sale_id', '=', 'sales.id')
                ->whereDate('sales.created_at', $today)
                ->where('sales.status', '!=', 'held')
                ->selectRaw('payments.method, SUM(payments.amount) as total, COUNT(DISTINCT payments.sale_id) as bills')
                ->groupBy('payments.method')
                ->get();

            // ── Last 3 days hourly (3 queries) ────────────────────────
            $last3Days = [];
            for ($i = 2; $i >= 0; $i--) {
                $date = Carbon::today()->subDays($i)->toDateString();
                $rows = DB::table('sales')
                    ->whereDate('created_at', $date)
                    ->where('status', '!=', 'held')
                    ->selectRaw('HOUR(created_at) as h, ROUND(SUM(total)) as t, COUNT(*) as b')
                    ->groupBy(DB::raw('HOUR(created_at)'))
                    ->get()
                    ->keyBy('h');

                $hourly = [];
                for ($h = 6; $h <= 22; $h++) {
                    $row      = $rows->get($h);
                    $hourly[] = [(int) $h, (int) ($row->t ?? 0), (int) ($row->b ?? 0)];
                }

                $last3Days[] = [
                    'date'   => $date,
                    'label'  => $i === 0 ? 'Today' : ($i === 1 ? 'Yesterday' : Carbon::today()->subDays($i)->format('D d')),
                    'total'  => (int) collect($rows)->sum('t'),
                    'bills'  => (int) collect($rows)->sum('b'),
                    'hourly' => $hourly, // compact: [hour, total, bills]
                ];
            }

            // ── Heatmap — 1 query ─────────────────────────────────────
            $heatmapFrom = Carbon::today()->startOfWeek(Carbon::MONDAY)->subWeeks(9);
            $heatmapRows = DB::table('sales')
                ->where('created_at', '>=', $heatmapFrom)
                ->where('status', '!=', 'held')
                ->selectRaw('DATE(created_at) as d, ROUND(SUM(total)) as t, COUNT(*) as b')
                ->groupBy(DB::raw('DATE(created_at)'))
                ->get()
                ->keyBy('d');

            $heatmap = [];
            $cursor  = $heatmapFrom->copy();
            $end     = Carbon::today();
            while ($cursor->lte($end)) {
                $ds  = $cursor->toDateString();
                $row = $heatmapRows->get($ds);
                // compact: [date, dow, week, total, bills]
                $heatmap[] = [
                    $ds,
                    $cursor->dayOfWeekIso,
                    $cursor->diffInWeeks($heatmapFrom),
                    (int) ($row->t ?? 0),
                    (int) ($row->b ?? 0),
                ];
                $cursor->addDay();
            }

            // ── Fast moving — 1 query ─────────────────────────────────
            $fastMoving = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
                ->where('sales.created_at', '>=', Carbon::now()->subDays(30))
                ->where('sales.status', '!=', 'held')
                ->selectRaw('sale_items.product_name, MAX(products.image) as image, ROUND(SUM(sale_items.qty)) as total_qty, COUNT(DISTINCT sales.id) as bill_count')
                ->groupBy('sale_items.product_name')
                ->orderByDesc('total_qty')
                ->limit(8)
                ->get();

            // ── Recent sales — 1 join query (no lazy load) ────────────
            $recentSales = DB::table('sales')
                ->join('users', 'sales.user_id', '=', 'users.id')
                ->where('sales.status', '!=', 'held')
                ->orderByDesc('sales.id')
                ->limit(8)
                ->get([
                    'sales.id', 'sales.invoice_no',
                    'sales.total', 'sales.created_at',
                    'users.name as user_name',
                ]);

            // ── Expiring soon — 1 query ───────────────────────────────
            $expiringSoon = DB::table('products')
                ->whereNotNull('expiry_date')
                ->where('expiry_date', '<=', Carbon::today()->addDays(30))
                ->where('stock_qty', '>', 0)
                ->orderBy('expiry_date')
                ->limit(10)
                ->get(['id', 'name', 'name_si', 'expiry_date', 'stock_qty', 'unit']);

            return compact(
                'todaySales', 'todayBills', 'monthSales', 'monthBills',
                'totalProducts', 'lowStockCount', 'todayByPayment',
                'last3Days', 'heatmap', 'fastMoving', 'recentSales', 'expiringSoon'
            );
        });

        return Inertia::render('Dashboard', $data)
            ->with(['flash' => session('flash')]);
    }
}
