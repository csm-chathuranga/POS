<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index()
    {
        return Inertia::render('Reports/Index');
    }

    /**
     * Day-end summary — printable thermal receipt report for today.
     */
    public function dayEnd(Request $request)
    {
        $date  = $request->filled('date') ? Carbon::parse($request->date) : Carbon::today();

        $sales = Sale::with(['payments', 'user'])
            ->whereDate('created_at', $date)
            ->where('status', '!=', 'held')
            ->orderBy('id')
            ->get();

        $byPaymentMethod = DB::table('payments')
            ->join('sales', 'payments.sale_id', '=', 'sales.id')
            ->whereDate('sales.created_at', $date)
            ->where('sales.status', '!=', 'held')
            ->select('payments.method', DB::raw('SUM(payments.amount) as total'), DB::raw('COUNT(DISTINCT payments.sale_id) as count'))
            ->groupBy('payments.method')
            ->get();

        $settings = \App\Models\Setting::all()->pluck('value', 'key')->toArray();

        $summary = [
            'total_bills'    => $sales->count(),
            'total_revenue'  => $sales->sum('total'),
            'total_discount' => $sales->sum('discount'),
            'total_tax'      => $sales->sum('tax'),
            'total_paid'     => $sales->sum('paid'),
            'total_balance'  => $sales->sum('balance'),
        ];

        return Inertia::render('Reports/DayEnd', [
            'summary'         => $summary,
            'byPaymentMethod' => $byPaymentMethod,
            'sales'           => $sales,
            'date'            => $date->toDateString(),
            'settings'        => $settings,
        ]);
    }

    /**
     * Today's sales summary grouped by payment method.
     */
    public function todaySales(Request $request)
    {
        $today = Carbon::today();

        $sales = Sale::with(['items', 'payments'])
            ->whereDate('created_at', $today)
            ->where('status', '!=', 'held')
            ->get();

        $summary = [
            'total_sales'    => $sales->count(),
            'total_revenue'  => $sales->sum('total'),
            'total_discount' => $sales->sum('discount'),
            'total_tax'      => $sales->sum('tax'),
        ];

        $byPaymentMethod = DB::table('payments')
            ->join('sales', 'payments.sale_id', '=', 'sales.id')
            ->whereDate('sales.created_at', $today)
            ->where('sales.status', '!=', 'held')
            ->select('payments.method', DB::raw('SUM(payments.amount) as total'), DB::raw('COUNT(DISTINCT payments.sale_id) as count'))
            ->groupBy('payments.method')
            ->get();

        return Inertia::render('Reports/TodaySales', [
            'summary'         => $summary,
            'byPaymentMethod' => $byPaymentMethod,
            'sales'           => $sales,
            'date'            => $today->toDateString(),
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Monthly sales grouped by day.
     */
    public function monthlySales(Request $request)
    {
        $month = $request->filled('month')
            ? Carbon::parse($request->month . '-01')
            : Carbon::now()->startOfMonth();

        $byDay = Sale::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as total'),
                DB::raw('SUM(discount) as discount'),
                DB::raw('COUNT(*) as count')
            )
            ->whereBetween('created_at', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])
            ->where('status', '!=', 'held')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        $summary = [
            'month'          => $month->format('F Y'),
            'total_revenue'  => $byDay->sum('total'),
            'total_discount' => $byDay->sum('discount'),
            'total_sales'    => $byDay->sum('count'),
        ];

        return Inertia::render('Reports/MonthlySales', [
            'byDay'   => $byDay,
            'summary' => $summary,
            'month'   => $month->format('Y-m'),
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Top 10 products by quantity sold in last 30 days.
     */
    public function topProducts(Request $request)
    {
        $from = Carbon::now()->subDays(30)->startOfDay();

        $topProducts = SaleItem::select(
                'sale_items.product_id',
                'sale_items.product_name',
                DB::raw('SUM(sale_items.qty) as total_qty'),
                DB::raw('SUM(sale_items.total) as total_revenue'),
                DB::raw('COUNT(DISTINCT sale_items.sale_id) as sale_count')
            )
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', $from)
            ->where('sales.status', '!=', 'held')
            ->groupBy('sale_items.product_id', 'sale_items.product_name')
            ->orderByDesc('total_qty')
            ->take(10)
            ->get();

        return Inertia::render('Reports/TopProducts', [
            'topProducts' => $topProducts,
            'from'        => $from->toDateString(),
            'to'          => Carbon::now()->toDateString(),
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Products where stock_qty <= alert_qty.
     */
    public function lowStock(Request $request)
    {
        $products = Product::with('category')
            ->whereColumn('stock_qty', '<=', 'alert_qty')
            ->orderBy('stock_qty')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Reports/LowStock', [
            'products' => $products,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Profit report: (selling_price - cost_price) * qty per sale_item for a date range.
     */
    public function profitReport(Request $request)
    {
        $dateFrom = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : Carbon::now()->startOfMonth()->startOfDay();

        $dateTo = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : Carbon::now()->endOfDay();

        $items = SaleItem::select(
                'sale_items.product_id',
                'sale_items.product_name',
                DB::raw('SUM(sale_items.qty) as total_qty'),
                DB::raw('SUM(sale_items.total) as total_revenue'),
                DB::raw('SUM(sale_items.cost_price * sale_items.qty) as total_cost'),
                DB::raw('SUM((sale_items.unit_price - sale_items.cost_price) * sale_items.qty) as gross_profit')
            )
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->whereBetween('sales.created_at', [$dateFrom, $dateTo])
            ->where('sales.status', '!=', 'held')
            ->groupBy('sale_items.product_id', 'sale_items.product_name')
            ->orderByDesc('gross_profit')
            ->get();

        $summary = [
            'total_revenue' => $items->sum('total_revenue'),
            'total_cost'    => $items->sum('total_cost'),
            'gross_profit'  => $items->sum('gross_profit'),
        ];

        return Inertia::render('Reports/Profit', [
            'items'     => $items,
            'summary'   => $summary,
            'date_from' => $dateFrom->toDateString(),
            'date_to'   => $dateTo->toDateString(),
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Customers with outstanding credit balance.
     */
    public function creditCustomers(Request $request)
    {
        $customers = Customer::where('credit_balance', '>', 0)
            ->orderByDesc('credit_balance')
            ->paginate(50)
            ->withQueryString();

        $totalCredit = Customer::where('credit_balance', '>', 0)->sum('credit_balance');

        return Inertia::render('Reports/CreditCustomers', [
            'customers'   => $customers,
            'totalCredit' => $totalCredit,
        ])->with(['flash' => session('flash')]);
    }
}
