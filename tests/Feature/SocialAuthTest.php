<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    private function fakeGoogleUser(string $email, string $name = 'Jane Doe', string $id = 'google-123'): void
    {
        $googleUser = Mockery::mock(SocialiteUserContract::class);
        $googleUser->shouldReceive('getEmail')->andReturn($email);
        $googleUser->shouldReceive('getName')->andReturn($name);
        $googleUser->shouldReceive('getId')->andReturn($id);

        $provider = Mockery::mock(\Laravel\Socialite\Contracts\Provider::class);
        $provider->shouldReceive('user')->andReturn($googleUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_a_brand_new_google_signup_is_immediately_email_verified(): void
    {
        $this->fakeGoogleUser('new-user@example.test');

        $this->get(route('auth.google.callback'))->assertRedirect();

        $user = User::where('email', 'new-user@example.test')->firstOrFail();
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertSame('google-123', $user->google_id);
        $this->assertAuthenticatedAs($user);
    }

    public function test_an_existing_unverified_account_becomes_verified_after_linking_google(): void
    {
        // Reproduit le bug réel : un compte créé via inscription email/mot de
        // passe classique (donc non vérifié), qui se connecte ensuite via
        // Google avec la même adresse.
        $existing = User::factory()->unverified()->create(['email' => 'already-registered@example.test', 'google_id' => null]);
        $this->assertFalse($existing->hasVerifiedEmail());

        $this->fakeGoogleUser('already-registered@example.test');

        $this->get(route('auth.google.callback'))->assertRedirect();

        $existing->refresh();
        $this->assertTrue($existing->hasVerifiedEmail());
        $this->assertSame('google-123', $existing->google_id);
    }

    public function test_it_does_not_create_a_duplicate_user_for_an_existing_email(): void
    {
        User::factory()->create(['email' => 'already-registered@example.test']);

        $this->fakeGoogleUser('already-registered@example.test');

        $this->get(route('auth.google.callback'));

        $this->assertSame(1, User::where('email', 'already-registered@example.test')->count());
    }
}
