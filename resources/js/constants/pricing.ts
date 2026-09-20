/**
 * Formatage des montants du plan Pro. Les montants eux-mêmes ne vivent plus
 * ici : ils sont lus chez Paddle côté serveur et passés en props
 * (App\Services\PaddlePriceCatalog). Ce fichier ne garde qu'un repli, utilisé
 * uniquement si Paddle n'a jamais répondu depuis cette installation — il doit
 * rester aligné sur `PaddlePriceCatalog::FALLBACK`.
 */

export type PaddlePrice = {
    /** Montant en unités mineures (centimes pour EUR), tel que renvoyé par Paddle. */
    amount: number;
    currency: string;
};

export type ProPrices = {
    monthly?: PaddlePrice;
    yearly?: PaddlePrice;
};

export const FALLBACK_PRO_PRICES: ProPrices = {
    monthly: { amount: 2000, currency: 'EUR' },
    yearly: { amount: 20000, currency: 'EUR' },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
};

/** Devises sans sous-unité : le montant Paddle est déjà en unité majeure. */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK']);

export function currencySymbol(currency: string): string {
    return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function toMajorUnits(price: PaddlePrice): number {
    return ZERO_DECIMAL_CURRENCIES.has(price.currency) ? price.amount : price.amount / 100;
}

/** Arrondi à 2 décimales, puis suppression des décimales inutiles (20 et non 20,00). */
function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

export type ProPricing = {
    symbol: string;
    /** Prix mensuel, en unité majeure. */
    monthly: number;
    /** Prix annuel facturé en une fois, en unité majeure. */
    yearly: number;
    /** Équivalent mensuel de l'offre annuelle. */
    yearlyMonthlyEquivalent: number;
    /** Économie annuelle par rapport à 12 mensualités. */
    yearlySavings: number;
    /** Total de 12 mensualités, pour la comparaison affichée. */
    twelveMonths: number;
};

/**
 * Dérive tous les montants affichés à partir des prix Paddle. Tolère des props
 * absentes (cache froid, price id non configuré) en retombant sur le repli :
 * une page tarifs ne doit jamais afficher un prix vide.
 */
export function proPricing(prices?: ProPrices): ProPricing {
    const monthlyPrice = prices?.monthly ?? FALLBACK_PRO_PRICES.monthly!;
    const yearlyPrice = prices?.yearly ?? FALLBACK_PRO_PRICES.yearly!;

    const monthly = round2(toMajorUnits(monthlyPrice));
    const yearly = round2(toMajorUnits(yearlyPrice));

    return {
        symbol: currencySymbol(monthlyPrice.currency),
        monthly,
        yearly,
        yearlyMonthlyEquivalent: round2(yearly / 12),
        yearlySavings: round2(monthly * 12 - yearly),
        twelveMonths: round2(monthly * 12),
    };
}
