<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED_LOCALES = ['en', 'fr'];

    private const COOKIE_NAME = 'locale';

    /**
     * Pages marketing/legal au contenu FRANÇAIS fixe par design (déjà
     * indexées par Google avant l'introduction de l'i18n) — leur locale ne
     * doit jamais varier selon le cookie/navigateur, seulement selon la
     * route qu'elles sont.
     */
    private const FIXED_FRENCH_ROUTES = [
        'welcome.fr',
        'marketing.features',
        'marketing.how-it-works',
        'marketing.pricing',
        'marketing.security',
        'legal.terms',
        'legal.privacy',
        'legal.refunds',
    ];

    /**
     * Pages marketing/legal au contenu ANGLAIS fixe par design (nouvelles
     * pages créées pour l'i18n) — même principe, jamais de détection
     * cookie/navigateur.
     */
    private const FIXED_ENGLISH_ROUTES = [
        'welcome',
        'marketing.features.en',
        'marketing.how-it-works.en',
        'marketing.pricing.en',
        'marketing.security.en',
        'legal.terms.en',
        'legal.privacy.en',
        'legal.refunds.en',
    ];

    /**
     * Détermine et applique la locale de la requête.
     *
     * Priorité : page marketing/legal à contenu fixe (route nommée
     * explicitement FR ou EN, cf. listes ci-dessus) > cookie déjà posé
     * (choix explicite précédent de l'utilisateur, pour le reste de l'app :
     * dashboard, login/register) > en-tête Accept-Language > défaut anglais.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $routeName = $request->route()?->getName();
        $isFixedRoute = in_array($routeName, self::FIXED_FRENCH_ROUTES, true)
            || in_array($routeName, self::FIXED_ENGLISH_ROUTES, true);

        $locale = $this->resolveLocale($request, $routeName);

        App::setLocale($locale);

        $response = $next($request);

        if (! $isFixedRoute) {
            $response->headers->setCookie(
                cookie(self::COOKIE_NAME, $locale, 60 * 24 * 365)
            );
        }

        return $response;
    }

    private function resolveLocale(Request $request, ?string $routeName): string
    {
        if (in_array($routeName, self::FIXED_FRENCH_ROUTES, true)) {
            return 'fr';
        }

        if (in_array($routeName, self::FIXED_ENGLISH_ROUTES, true)) {
            return 'en';
        }

        $cookieLocale = $request->cookie(self::COOKIE_NAME);

        if (in_array($cookieLocale, self::SUPPORTED_LOCALES, true)) {
            return $cookieLocale;
        }

        return $this->preferredLocaleFromHeader($request);
    }

    private function preferredLocaleFromHeader(Request $request): string
    {
        $preferred = $request->getPreferredLanguage(self::SUPPORTED_LOCALES);

        return $preferred ?? 'en';
    }
}
