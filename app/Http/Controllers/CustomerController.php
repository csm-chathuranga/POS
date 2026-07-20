<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CreditPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $customers = $query->select([
                'id', 'name', 'phone', 'email', 'address',
                'credit_limit', 'credit_balance', 'active', 'created_at', 'updated_at',
            ])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters'   => $request->only(['search']),
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Customers/Create')
            ->with(['flash' => session('flash')]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'phone'        => 'nullable|string|max:50',
            'email'        => 'nullable|email|max:255|unique:customers,email',
            'address'      => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'active'       => 'boolean',
        ]);

        Customer::create($validated);
        Cache::forget(config('database.connections.mysql.database') . '_pos_customers');

        return redirect()->route('customers.index')->with('success', 'Customer created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $customer = Customer::findOrFail($id);

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $customer = Customer::findOrFail($id);

        return Inertia::render('Customers/Edit', [
            'customer' => $customer,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $customer = Customer::findOrFail($id);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'phone'        => 'nullable|string|max:50',
            'email'        => 'nullable|email|max:255|unique:customers,email,' . $customer->id,
            'address'      => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'active'       => 'boolean',
        ]);

        $customer->update($validated);
        Cache::forget(config('database.connections.mysql.database') . '_pos_customers');

        return redirect()->route('customers.index')->with('success', 'Customer updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();
        Cache::forget(config('database.connections.mysql.database') . '_pos_customers');

        return redirect()->route('customers.index')->with('success', 'Customer deleted successfully.');
    }

    /**
     * ණය පොත — credit book with per-customer credit sales.
     */
    public function nayaPotha(Request $request)
    {
        $history = $request->boolean('history');

        $with = [
            'sales' => function ($q) use ($history) {
                $q->where('status', 'completed')
                  ->when(!$history, fn($q) => $q->where('balance', '>', 0))
                  ->orderByDesc('created_at')
                  ->select('id', 'customer_id', 'invoice_no', 'total', 'paid', 'balance', 'created_at');
            },
            'creditPayments' => function ($q) {
                $q->orderByDesc('created_at')
                  ->select('id', 'customer_id', 'amount', 'note', 'created_at');
            },
        ];

        if ($history) {
            // Customers with zero balance who have credit history
            $customers = Customer::where('credit_balance', '<=', 0)
                ->where(function ($q) {
                    $q->whereHas('creditPayments')
                      ->orWhereHas('sales', fn($q) => $q->where('status', 'completed'));
                })
                ->with($with)
                ->orderByDesc('updated_at')
                ->get();
        } else {
            $customers = Customer::where('credit_balance', '>', 0)
                ->with($with)
                ->orderByDesc('credit_balance')
                ->get();
        }

        $totalCredit = $history ? 0 : $customers->sum('credit_balance');

        return Inertia::render('NayaPotha/Index', [
            'customers'   => $customers,
            'totalCredit' => $totalCredit,
            'history'     => $history,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Settle (reduce) a customer's credit balance.
     */
    public function settleCredit(Request $request, string $id)
    {
        $customer = Customer::findOrFail($id);

        $request->validate([
            'amount' => 'required|numeric|min:0.01|max:' . $customer->credit_balance,
        ]);

        $customer->decrement('credit_balance', $request->amount);

        CreditPayment::create([
            'customer_id' => $customer->id,
            'user_id'     => $request->user()->id,
            'amount'      => $request->amount,
            'note'        => $request->note ?? null,
        ]);

        return back()->with('success', 'Rs. ' . number_format($request->amount, 2) . ' ණය ගෙවීම සටහන් කෙරිණ.');
    }

    /**
     * Quick customer creation from POS — returns JSON.
     */
    public function quickStore(Request $request)
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
        ]);

        $customer = Customer::create([
            'name'   => $validated['name'],
            'phone'  => $validated['phone'] ?? null,
            'active' => true,
        ]);
        Cache::forget(config('database.connections.mysql.database') . '_pos_customers');

        return response()->json([
            'customer' => $customer->only(['id', 'name', 'phone', 'credit_balance']),
        ], 201);
    }
}
