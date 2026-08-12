<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\PermissionRegistrar;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request. Crée le compte et son premier
     * workspace (avec rôle owner) en une seule transaction, façon wizard.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'workspace_name' => ['required', 'string', 'max:255'],
        ]);

        $workspace = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            event(new Registered($user));

            Auth::login($user);

            $workspace = Workspace::create([
                'name' => $data['workspace_name'],
                'created_by' => $user->id,
            ]);

            app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
            $user->assignRole('owner');

            $workspace->subscription()->create([
                'plan_id' => Plan::free()->id,
                'status' => 'active',
            ]);

            return $workspace;
        });

        return redirect()->route('dashboard', $workspace->slug)->with('status', 'Bienvenue ! Votre workspace est prêt.');
    }
}
