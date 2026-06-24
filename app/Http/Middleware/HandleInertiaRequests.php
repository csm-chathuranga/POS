<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => fn () => $request->user()
                    ? Cache::remember(
                        'user_auth_' . $request->user()->id,
                        300,
                        fn () => array_merge($request->user()->toArray(), [
                            'role'        => $request->user()->getRoleNames()->first(),
                            'roles'       => $request->user()->getRoleNames(),
                            'permissions' => $request->user()->getAllPermissions()->pluck('name'),
                        ])
                    )
                    : null,
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
            ],
            'device' => [
                'shop' => config('tenant.shop'),
            ],
            'appSettings' => fn () => Cache::remember('app_settings', 300, fn () =>
                Setting::all()->pluck('value', 'key')->only([
                    'ui_language', 'bill_language', 'sidebar_theme', 'primary_color',
                    'shop_name', 'currency', 'tax_rate',
                    'barcode_label_size', 'barcode_show_price',
                    'logo', 'demo_mode', 'printer_name',
                ])
            ),
            'ziggy' => fn () => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
        ];
    }
}
