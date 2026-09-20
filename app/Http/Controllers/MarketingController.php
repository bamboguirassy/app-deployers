<?php

namespace App\Http\Controllers;

use App\Services\PaddlePriceCatalog;
use App\Support\PlanCatalog;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pages marketing publiques qui ont besoin de données réelles plutôt que de
 * constantes recopiées dans le front (voir PlanCatalog / PaddlePriceCatalog).
 * Les autres pages marketing restent de simples closures dans routes/web.php :
 * elles n'affichent rien de chiffré.
 */
class MarketingController extends Controller
{
    public function __construct(private PaddlePriceCatalog $prices) {}

    public function pricingFr(): Response
    {
        return Inertia::render('Marketing/Tarifs', $this->pricingProps());
    }

    public function pricingEn(): Response
    {
        return Inertia::render('Marketing/Pricing', $this->pricingProps());
    }

    /**
     * @return array<string, mixed>
     */
    private function pricingProps(): array
    {
        return [
            'plans' => PlanCatalog::publicPlans(),
            'prices' => $this->prices->proPrices(),
        ];
    }
}
