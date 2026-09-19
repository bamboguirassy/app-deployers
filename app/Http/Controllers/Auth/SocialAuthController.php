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
                'google_id' => $googleUser->getId(),
            ]
        );

        // email_verified_at n'est volontairement pas mass-assignable (voir
        // #[Fillable] sur User — on ne veut pas qu'un formulaire quelconque
        // permette de s'auto-vérifier) : update()/firstOrCreate() l'ignorent
        // silencieusement. Google a déjà vérifié cette adresse pour nous,
        // donc on passe par markEmailAsVerified() qui contourne
        // volontairement cette protection pour ce cas précis.
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        // Si le compte existait déjà (créé par email/mot de passe avant de
        // se connecter via Google), on complète le lien manquant.
        if (! $user->google_id) {
            $user->update(['google_id' => $googleUser->getId()]);
        }

        if ($user->isSuspended()) {
            return redirect()->route('login')->withErrors(['email' => 'Votre compte a été suspendu.']);
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('home', absolute: false));
    }
}
