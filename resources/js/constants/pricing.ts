/**
 * Montants affichés pour le plan Pro — purement présentationnels. Le prix
 * réel facturé est celui configuré côté Paddle (PADDLE_PRO_PRICE_ID_MONTHLY/
 * YEARLY, voir database/seeders/PlanSeeder.php) ; l'app ne interroge pas
 * l'API Paddle pour ces montants, donc toute modification de tarif côté
 * Paddle doit être répercutée ici manuellement.
 */
export const PRO_MONTHLY_PRICE_EUR = 20;
export const PRO_YEARLY_PRICE_EUR = 200;
export const PRO_YEARLY_MONTHLY_EQUIVALENT_EUR = Math.round((PRO_YEARLY_PRICE_EUR / 12) * 100) / 100;
export const PRO_YEARLY_SAVINGS_EUR = PRO_MONTHLY_PRICE_EUR * 12 - PRO_YEARLY_PRICE_EUR;
