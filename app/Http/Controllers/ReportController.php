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
     * Profit / Revenue report: full breakdown — gross sales, discounts, net revenue, cost, profit.
     */
    public function profitReport(Request $request)
    {
        $dateFrom = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : Carbon::now()->startOfMonth()->startOfDay();

        $dateTo = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : Carbon::now()->endOfDay();

        // Detailed breakdown — grouped by product + unit_price + cost_price
        $items = SaleItem::select(
                'sale_items.product_id',
                'sale_items.product_name',
                'sale_items.unit_price',
                'sale_items.cost_price',
                DB::raw('(sale_items.unit_price - sale_items.cost_price) as unit_profit'),
                DB::raw('SUM(sale_items.qty) as total_qty'),
                DB::raw('SUM(sale_items.unit_price * sale_items.qty) as gross_revenue'),
                DB::raw('SUM(sale_items.discount) as total_item_discount'),
                DB::raw('SUM(sale_items.total) as net_revenue'),
                DB::raw('SUM(sale_items.cost_price * sale_items.qty) as total_cost'),
                DB::raw('SUM((sale_items.unit_price - sale_items.cost_price) * sale_items.qty) as gross_profit')
            )
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->whereBetween('sales.created_at', [$dateFrom, $dateTo])
            ->where('sales.status', '!=', 'held')
            ->groupBy('sale_items.product_id', 'sale_items.product_name', 'sale_items.unit_price', 'sale_items.cost_price')
            ->orderBy('sale_items.product_name')
            ->orderByDesc('gross_profit')
            ->get();

        // Sales-level summary (bill discounts, totals)
        $salesSummary = Sale::whereBetween('created_at', [$dateFrom, $dateTo])
            ->where('status', '!=', 'held')
            ->selectRaw('
                COUNT(*) as total_bills,
                SUM(subtotal) as subtotal,
                SUM(discount) as bill_discount,
                SUM(total) as net_total
            ')
            ->first();

        $grossRevenue  = $items->sum('gross_revenue');
        $itemDiscount  = $items->sum('total_item_discount');
        $billDiscount  = (float) ($salesSummary->bill_discount ?? 0);
        $totalDiscount = $itemDiscount + $billDiscount;
        $netRevenue    = $items->sum('net_revenue') - $billDiscount;
        $totalCost     = $items->sum('total_cost');
        $grossProfit   = $items->sum('gross_profit');          // (unit_price - cost_price) * qty
        $netProfit     = $grossProfit - $totalDiscount;        // gross profit minus all discounts

        $summary = [
            'total_bills'       => (int) ($salesSummary->total_bills ?? 0),
            'gross_revenue'     => $grossRevenue,
            'item_discount'     => $itemDiscount,
            'bill_discount'     => $billDiscount,
            'total_discount'    => $totalDiscount,
            'net_revenue'       => $netRevenue,
            'total_cost'        => $totalCost,
            'gross_profit'      => $grossProfit,   // (unit_price - cost_price) * qty
            'net_profit'        => $netProfit,     // gross_profit - discounts
        ];

        return Inertia::render('Reports/Profit', [
            'items'     => $items,
            'summary'   => $summary,
            'date_from' => $dateFrom->toDateString(),
            'date_to'   => $dateTo->toDateString(),
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Revenue report: daily revenue breakdown with discount and payment method split.
     */
    public function revenueReport(Request $request)
    {
        $dateFrom = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : Carbon::now()->startOfMonth()->startOfDay();

        $dateTo = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : Carbon::now()->endOfDay();

        // Daily breakdown with cost from sale_items
        $byDay = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->whereBetween('sales.created_at', [$dateFrom, $dateTo])
            ->where('sales.status', '!=', 'held')
            ->selectRaw('
                DATE(sales.created_at) as date,
                COUNT(DISTINCT sales.id) as total_bills,
                SUM(sale_items.unit_price * sale_items.qty) as gross_revenue,
                SUM(sale_items.discount) as item_discount,
                SUM(sale_items.total) as net_revenue,
                SUM(sale_items.cost_price * sale_items.qty) as total_cost,
                SUM((sale_items.unit_price - sale_items.cost_price) * sale_items.qty) as gross_profit
            ')
            ->groupBy(DB::raw('DATE(sales.created_at)'))
            ->orderBy('date')
            ->get();

        // Bill-level discounts per day
        $billDiscountsByDay = Sale::whereBetween('created_at', [$dateFrom, $dateTo])
            ->where('status', '!=', 'held')
            ->selectRaw('DATE(created_at) as date, SUM(discount) as bill_discount')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('bill_discount', 'date');

        foreach ($byDay as $row) {
            $row->bill_discount  = (float) ($billDiscountsByDay[$row->date] ?? 0);
            $row->total_discount = (float) $row->item_discount + $row->bill_discount;
            $row->net_profit     = (float) $row->gross_profit - $row->total_discount;
        }

        // Payment method split
        $byPayment = DB::table('payments')
            ->join('sales', 'payments.sale_id', '=', 'sales.id')
            ->whereBetween('sales.created_at', [$dateFrom, $dateTo])
            ->where('sales.status', '!=', 'held')
            ->selectRaw('payments.method, SUM(payments.amount) as total')
            ->groupBy('payments.method')
            ->get();

        $summary = [
            'total_bills'    => $byDay->sum('total_bills'),
            'gross_revenue'  => $byDay->sum('gross_revenue'),
            'item_discount'  => $byDay->sum('item_discount'),
            'bill_discount'  => $byDay->sum('bill_discount'),
            'total_discount' => $byDay->sum('total_discount'),
            'net_revenue'    => $byDay->sum('net_revenue'),
            'total_cost'     => $byDay->sum('total_cost'),
            'gross_profit'   => $byDay->sum('gross_profit'),
            'net_profit'     => $byDay->sum('net_profit'),
        ];

        return Inertia::render('Reports/Revenue', [
            'byDay'     => $byDay,
            'byPayment' => $byPayment,
            'summary'   => $summary,
            'date_from' => $dateFrom->toDateString(),
            'date_to'   => $dateTo->toDateString(),
        ]);
    }

    /**
     * Stock summary — all products with stock value, cost, and status.
     */
    public function stockSummary(Request $request)
    {
        $query = Product::with('category')
            ->where('active', true);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                  ->orWhere('name_si', 'like', "%$s%")
                  ->orWhere('sku', 'like', "%$s%")
                  ->orWhere('barcode', 'like', "%$s%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->status === 'low') {
            $query->whereColumn('stock_qty', '<=', 'alert_qty')->where('stock_qty', '>', 0);
        } elseif ($request->status === 'out') {
            $query->where('stock_qty', '<=', 0);
        }

        $products = $query->orderBy('name')->paginate(50)->withQueryString();

        // Summary across all active products (not filtered)
        $all = Product::where('active', true)
            ->selectRaw('COUNT(*) as total_products, SUM(stock_qty) as total_units, SUM(cost_price * stock_qty) as total_cost_value, SUM(selling_price * stock_qty) as total_retail_value')
            ->first();

        $categories = \App\Models\Category::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Reports/StockSummary', [
            'products'   => $products,
            'summary'    => $all,
            'categories' => $categories,
            'filters'    => $request->only(['search', 'category_id', 'status']),
        ]);
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
