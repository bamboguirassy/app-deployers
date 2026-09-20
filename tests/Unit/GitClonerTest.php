<?php

namespace Tests\Unit;

use App\Models\Target;
use App\Services\GitCloner;
use RuntimeException;
use Tests\TestCase;

class GitClonerTest extends TestCase
{
    public function test_it_rejects_a_target_without_a_connected_repository(): void
    {
        $target = new Target(['repository' => null, 'repository_provider' => null]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Aucun dépôt Git connecté');

        app(GitCloner::class)->clone($target, 'main', sys_get_temp_dir().'/unused');
    }

    public function test_it_rejects_an_unsupported_provider(): void
    {
        $target = new Target(['repository' => 'owner/repo', 'repository_provider' => 'sourcehut']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Provider Git non supporté');

        app(GitCloner::class)->clone($target, 'main', sys_get_temp_dir().'/unused');
    }
}
