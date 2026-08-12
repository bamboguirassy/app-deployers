<?php

namespace App\StepActions;

class StepExecutionResult
{
    public function __construct(
        public readonly string $output,
        public readonly int $exitCode,
        public readonly bool $cancelled = false,
    ) {}

    public function status(): string
    {
        return match (true) {
            $this->cancelled => 'annule',
            $this->exitCode === 0 => 'succes',
            default => 'echec',
        };
    }
}
