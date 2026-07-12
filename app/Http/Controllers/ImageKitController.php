<?php

namespace App\Http\Controllers;

use Illuminate\Support\Str;

class ImageKitController extends Controller
{
    public function auth()
    {
        $privateKey = config('services.imagekit.private_key');
        $expire     = time() + 1800;
        $token      = (string) Str::uuid();
        $signature  = hash_hmac('sha1', $token . $expire, $privateKey);

        return response()->json([
            'token'     => $token,
            'expire'    => $expire,
            'signature' => $signature,
        ]);
    }
}
