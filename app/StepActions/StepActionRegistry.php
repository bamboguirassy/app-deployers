<?php

namespace App\StepActions;

use InvalidArgumentException;

/**
 * Point d'entrée unique pour résoudre un type de step vers son
 * implémentation. Ajouter un nouveau type d'action (webhook HTTP, Slack,
 * ...) = créer une classe qui implémente StepActionContract et l'ajouter à
 * $actions ci-dessous — aucune autre partie du code (job, contrôleur,
 * validation) n'a besoin d'être modifiée.
 */
class StepActionRegistry
{
    /** @var class-string<StepActionContract>[] */
    private array $actions = [
        CommandStepAction::class,
        EmailStepAction::class,
    ];

    public function get(string $type): StepActionContract
    {
        foreach ($this->actions as $class) {
            if ($class::type() === $type) {
                return app($class);
            }
        }

        throw new InvalidArgumentException("Type de step inconnu : {$type}");
    }

    public function has(string $type): bool
    {
        foreach ($this->actions as $class) {
            if ($class::type() === $type) {
                return true;
            }
        }

        return false;
    }

    public function types(): array
    {
        return array_map(fn ($class) => $class::type(), $this->actions);
    }
}
