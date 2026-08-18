<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class SocialAuthController extends Controller
{
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (InvalidStateException) {
            return redirect()->route('login')
                ->withErrors(['email' => 'La session Google a expiré. Veuillez réessayer.']);
        }

        $user = User::firstOrCreate(
            ['email' => $googleUser->getEmail()],
            [
                'name' => $googleUser->getName(),
                'password' => bcrypt(Str::random(32)),
                'email_verified_at' => now(),
                'google_id' => $googleUser->getId(),
            ]
        );

        // Si le compte existait déjà, on complète les champs manquants.
        $updates = [];
        if (! $user->google_id) {
            $updates['google_id'] = $googleUser->getId();
        }
        if (! $user->email_verified_at) {
            $updates['email_verified_at'] = now();
        }
        if ($updates) {
            $user->update($updates);
        }

        if ($user->isSuspended()) {
            return redirect()->route('login')->withErrors(['email' => 'Votre compte a été suspendu.']);
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('home', absolute: false));
    }
}
