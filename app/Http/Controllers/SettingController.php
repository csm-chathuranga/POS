<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key')->toArray();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ])->with(['flash' => session('flash')]);
    }

    public function update(Request $request)
    {
        Log::info('[Settings] update() called', [
            'method'   => $request->method(),
            'is_inertia' => $request->header('X-Inertia') ? 'yes' : 'no',
            'settings_keys' => array_keys($request->input('settings', [])),
        ]);

        $request->validate([
            'settings'                    => 'required|array',
            'settings.shop_name'          => 'nullable|string|max:255',
            'settings.shop_address'       => 'nullable|string',
            'settings.shop_phone'         => 'nullable|string|max:50',
            'settings.shop_email'         => 'nullable|string|max:255',
            'settings.currency'           => 'nullable|string|max:10',
            'settings.tax_rate'           => 'nullable|numeric|min:0|max:100',
            'settings.receipt_footer'     => 'nullable|string',
            'settings.ui_language'        => 'nullable|string|in:si,en,ta',
            'settings.bill_language'      => 'nullable|string|in:si,en,ta',
            'settings.sidebar_theme'      => 'nullable|string|in:slate,zinc,forest,navy,purple,coffee',
            'settings.primary_color'      => 'nullable|string|in:blue,green,purple,orange,red,teal',
            'settings.barcode_label_size' => 'nullable|string|in:20x30,40x25,50x30,58x40',
            'settings.barcode_show_price' => 'nullable',
            'settings.logo'               => 'nullable|string',
            'settings.demo_mode'          => 'nullable',
        ]);

        Log::info('[Settings] validation passed, saving…');

        foreach ($request->input('settings', []) as $key => $value) {
            Setting::set($key, is_bool($value) ? ($value ? '1' : '0') : ($value ?? ''));
        }

        Log::info('[Settings] all keys saved');

        return redirect()->back()->with('success', 'Settings saved successfully.');
    }
}
