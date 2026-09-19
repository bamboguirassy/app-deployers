<?php

namespace Tests\Unit;

use App\Support\DirectorySymlinkGuard;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class DirectorySymlinkGuardTest extends TestCase
{
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempDir = sys_get_temp_dir().'/symlink_guard_test_'.bin2hex(random_bytes(6));
        mkdir($this->tempDir.'/nested', 0777, true);
    }

    protected function tearDown(): void
    {
        $this->deleteDirectory($this->tempDir);

        parent::tearDown();
    }

    private function deleteDirectory(string $path): void
    {
        if (! is_dir($path) && ! is_link($path)) {
            return;
        }

        if (is_link($path)) {
            unlink($path);

            return;
        }

        foreach (scandir($path) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $full = $path.'/'.$entry;
            (is_dir($full) && ! is_link($full)) ? $this->deleteDirectory($full) : unlink($full);
        }

        rmdir($path);
    }

    public function test_it_allows_a_directory_with_only_regular_files(): void
    {
        file_put_contents($this->tempDir.'/index.html', '<html></html>');
        file_put_contents($this->tempDir.'/nested/app.js', 'console.log(1);');

        DirectorySymlinkGuard::assertNone($this->tempDir);

        $this->addToAssertionCount(1);
    }

    public function test_it_rejects_a_top_level_symlink_pointing_outside_the_directory(): void
    {
        $secret = sys_get_temp_dir().'/symlink_guard_secret_'.bin2hex(random_bytes(4)).'.txt';
        file_put_contents($secret, 'top secret');

        symlink($secret, $this->tempDir.'/leak.txt');

        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessageMatches('/lien symbolique/');

            DirectorySymlinkGuard::assertNone($this->tempDir);
        } finally {
            @unlink($secret);
        }
    }

    public function test_it_rejects_a_symlinked_directory_nested_deep(): void
    {
        $secretDir = sys_get_temp_dir().'/symlink_guard_secret_dir_'.bin2hex(random_bytes(4));
        mkdir($secretDir, 0777, true);
        file_put_contents($secretDir.'/env', 'APP_KEY=secret');

        symlink($secretDir, $this->tempDir.'/nested/escape');

        try {
            $this->expectException(RuntimeException::class);

            DirectorySymlinkGuard::assertNone($this->tempDir);
        } finally {
            $this->deleteDirectory($secretDir);
        }
    }

    public function test_it_is_a_no_op_for_a_missing_directory(): void
    {
        DirectorySymlinkGuard::assertNone('/nonexistent/path/xyz');

        $this->addToAssertionCount(1);
    }
}
