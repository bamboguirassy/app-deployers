<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Services\PaddlePriceCatalog;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Non-régression sur la vérité unique des offres.
 *
 * Contexte : la page /tarifs annonçait « Jusqu'à 5 déploiements simultanés »
 * (libellé codé en dur dans `constants/marketing.ts`) pendant que la base en
 * appliquait 3, et les montants étaient recopiés à la main dans
 * `constants/pricing.ts` avec le risque d'afficher un prix différent de celui
 * réellement débité. Limites et montants ne doivent plus exister qu'à un seul
 * endroit : la base pour les unes, Paddle pour les autres.
 */
class PublicPricingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    public function test_the_public_pricing_page_exposes_the_limits_stored_in_database(): void
    {
        Plan::query()->where('slug', 'pro')->update(['max_concurrent_deployments' => 7]);

        $this->get('/tarifs')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Marketing/Tarifs')
                ->where('plans.pro.max_concurrent_deployments', 7)
                ->where('plans.free.max_concurrent_deployments', 1)
            );
    }

    public function test_the_english_pricing_page_exposes_the_same_source(): void
    {
        Plan::query()->where('slug', 'pro')->update(['max_concurrent_deployments' => 7]);

        $this->get('/pricing')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Marketing/Pricing')
                ->where('plans.pro.max_concurrent_deployments', 7)
            );
    }

    /**
     * Le seeder tourne à chaque déploiement (`db:seed --force` dans le
     * pipeline). Une limite ajustée depuis l'admin ne doit plus être écrasée
     * silencieusement au déploiement suivant.
     */
    public function test_reseeding_does_not_overwrite_an_administrator_adjusted_limit(): void
    {
        Plan::query()->where('slug', 'pro')->update([
            'max_concurrent_deployments' => 9,
            'max_applications' => 42,
        ]);

        $this->seed(PlanSeeder::class);

        $pro = Plan::query()->where('slug', 'pro')->first();

        $this->assertSame(9, $pro->max_concurrent_deployments);
        $this->assertSame(42, $pro->max_applications);
    }

    public function test_seeding_a_fresh_database_still_creates_the_default_limits(): void
    {
        Plan::query()->delete();

        $this->seed(PlanSeeder::class);

        $this->assertSame(3, Plan::query()->where('slug', 'pro')->value('max_concurrent_deployments'));
        $this->assertSame(1, Plan::query()->where('slug', 'free')->value('max_concurrent_deployments'));
        $this->assertSame(2, Plan::query()->where('slug', 'free')->value('max_applications'));
    }

    public function test_prices_come_from_paddle_and_are_cached(): void
    {
        config([
            'paddle.pro_price_id_monthly' => 'pri_monthly',
            'paddle.pro_price_id_yearly' => 'pri_yearly',
        ]);

        Http::fake([
            '*/prices/pri_monthly' => Http::response(['data' => ['unit_price' => ['amount' => '2500', 'currency_code' => 'EUR']]]),
            '*/prices/pri_yearly' => Http::response(['data' => ['unit_price' => ['amount' => '25000', 'currency_code' => 'EUR']]]),
        ]);

        $prices = app(PaddlePriceCatalog::class)->proPrices();

        $this->assertSame(2500, $prices['monthly']['amount']);
        $this->assertSame(25000, $prices['yearly']['amount']);
        $this->assertSame($prices, Cache::get(PaddlePriceCatalog::CACHE_KEY));
    }

    /**
     * /tarifs est publique et rendue côté serveur pour le SEO : une panne
     * Paddle ne doit ni lever, ni afficher un prix vide.
     */
    public function test_a_paddle_outage_falls_back_to_the_last_known_prices(): void
    {
        config(['paddle.pro_price_id_monthly' => 'pri_monthly']);

        $lastKnown = ['monthly' => ['amount' => 3300, 'currency' => 'EUR']];
        Cache::forever(PaddlePriceCatalog::LAST_KNOWN_KEY, $lastKnown);

        Http::fake(['*' => Http::response(null, 500)]);

        $this->assertSame($lastKnown, app(PaddlePriceCatalog::class)->proPrices());

        $this->get('/tarifs')->assertOk();
    }

    public function test_a_cold_cache_without_any_paddle_history_falls_back_to_hardcoded_prices(): void
    {
        config(['paddle.pro_price_id_monthly' => 'pri_monthly']);

        Http::fake(['*' => Http::response(null, 500)]);

        $this->assertSame(PaddlePriceCatalog::FALLBACK, app(PaddlePriceCatalog::class)->proPrices());
    }
}
