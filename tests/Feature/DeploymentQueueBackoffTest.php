<?php

namespace Tests\Feature;

use App\Jobs\RunDeploymentJob;
use Tests\TestCase;

/**
 * Expose le calcul de délai et simule le compteur de tentatives du job, que
 * seul un vrai worker renseigne.
 */
class BackoffProbe extends RunDeploymentJob
{
    public int $fakeAttempts = 1;

    public function attempts(): int
    {
        return $this->fakeAttempts;
    }

    public function delayFor(int $attempts): int
    {
        $this->fakeAttempts = $attempts;

        return $this->concurrencyRetryDelay();
    }
}

/**
 * Un déploiement en attente de slot rejouait son job toutes les 10 secondes
 * pendant toute l'attente — jusqu'à 720 fois sur 2 h, en pure perte, sur des
 * workers partagés entre tous les clients.
 */
class DeploymentQueueBackoffTest extends TestCase
{
    private function probe(): BackoffProbe
    {
        return new BackoffProbe(1);
    }

    /** Gigue de ±20 % : on vérifie l'encadrement, pas une valeur exacte. */
    private function assertAround(int $expected, int $actual): void
    {
        $jitter = (int) round($expected * 0.2);

        $this->assertGreaterThanOrEqual($expected - $jitter, $actual);
        $this->assertLessThanOrEqual($expected + $jitter, $actual);
    }

    public function test_the_delay_grows_with_each_attempt_up_to_the_ceiling(): void
    {
        config([
            'deploy.concurrency_retry_seconds' => 10,
            'deploy.concurrency_retry_max_seconds' => 30,
            'deploy.concurrency_retry_factor' => 2,
        ]);

        $probe = $this->probe();

        $this->assertAround(10, $probe->delayFor(1));
        $this->assertAround(20, $probe->delayFor(2));
        // 40 serait la progression, plafonnée à 30.
        $this->assertAround(30, $probe->delayFor(3));
    }

    /**
     * Sur une attente longue le compteur de tentatives grimpe : l'exposant
     * doit rester borné, sinon on calculerait 2^700 avant de plafonner.
     */
    public function test_a_very_high_attempt_count_stays_at_the_ceiling_without_overflowing(): void
    {
        config([
            'deploy.concurrency_retry_seconds' => 10,
            'deploy.concurrency_retry_max_seconds' => 30,
            'deploy.concurrency_retry_factor' => 2,
        ]);

        $delay = $this->probe()->delayFor(700);

        $this->assertAround(30, $delay);
        $this->assertLessThan(PHP_INT_MAX, $delay);
    }

    /**
     * Sans gigue, plusieurs déploiements d'un même workspace se réveillent en
     * lockstep et se disputent le verrou de réservation — le perdant est
     * remis en file pour une raison qui n'est pas le quota.
     */
    public function test_the_delay_is_jittered_so_queued_deployments_do_not_wake_in_lockstep(): void
    {
        config([
            'deploy.concurrency_retry_seconds' => 10,
            'deploy.concurrency_retry_max_seconds' => 30,
            'deploy.concurrency_retry_factor' => 2,
        ]);

        $probe = $this->probe();
        $delays = collect(range(1, 50))->map(fn () => $probe->delayFor(3))->unique();

        $this->assertGreaterThan(1, $delays->count());
    }

    public function test_the_ceiling_is_configurable(): void
    {
        config([
            'deploy.concurrency_retry_seconds' => 10,
            'deploy.concurrency_retry_max_seconds' => 120,
            'deploy.concurrency_retry_factor' => 2,
        ]);

        $this->assertAround(80, $this->probe()->delayFor(4));
    }

    /** Un plafond mal réglé sous le délai de base ne doit pas produire 0. */
    public function test_a_ceiling_below_the_base_delay_never_yields_a_zero_delay(): void
    {
        config([
            'deploy.concurrency_retry_seconds' => 10,
            'deploy.concurrency_retry_max_seconds' => 0,
            'deploy.concurrency_retry_factor' => 2,
        ]);

        $this->assertGreaterThanOrEqual(1, $this->probe()->delayFor(5));
    }
}
