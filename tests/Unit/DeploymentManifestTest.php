<?php

namespace Tests\Unit;

use App\Transports\DeploymentManifest;
use PHPUnit\Framework\TestCase;

class DeploymentManifestTest extends TestCase
{
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempDir = sys_get_temp_dir().'/manifest_test_'.bin2hex(random_bytes(6));
        mkdir($this->tempDir.'/nested', 0777, true);
        file_put_contents($this->tempDir.'/index.html', '<html>v1</html>');
        file_put_contents($this->tempDir.'/nested/app.js', 'console.log(1);');
    }

    protected function tearDown(): void
    {
        $this->deleteDirectory($this->tempDir);

        parent::tearDown();
    }

    private function deleteDirectory(string $path): void
    {
        if (! is_dir($path)) {
            return;
        }

        foreach (scandir($path) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $full = $path.'/'.$entry;
            is_dir($full) ? $this->deleteDirectory($full) : unlink($full);
        }

        rmdir($path);
    }

    public function test_it_returns_an_empty_manifest_for_a_missing_directory(): void
    {
        $this->assertSame([], DeploymentManifest::buildFromLocalDirectory('/nonexistent/path/xyz'));
    }

    public function test_it_lists_every_file_with_relative_paths_sorted(): void
    {
        $manifest = DeploymentManifest::buildFromLocalDirectory($this->tempDir);

        $this->assertSame(['index.html', 'nested/app.js'], array_keys($manifest));
        $this->assertSame(strlen('<html>v1</html>'), $manifest['index.html']['size']);
    }

    public function test_diff_uploads_everything_when_there_is_no_previous_manifest(): void
    {
        $current = DeploymentManifest::buildFromLocalDirectory($this->tempDir);

        $diff = DeploymentManifest::diff([], $current);

        $this->assertSame(['index.html', 'nested/app.js'], $diff['uploads']);
        $this->assertSame([], $diff['deletions']);
    }

    public function test_diff_only_uploads_changed_files_and_reports_deletions(): void
    {
        $previous = DeploymentManifest::buildFromLocalDirectory($this->tempDir);

        // index.html change de contenu, nested/app.js reste identique, un
        // nouveau fichier apparaît et l'ancien nested/app.js disparaîtra.
        file_put_contents($this->tempDir.'/index.html', '<html>v2</html>');
        unlink($this->tempDir.'/nested/app.js');
        file_put_contents($this->tempDir.'/style.css', 'body{}');

        $current = DeploymentManifest::buildFromLocalDirectory($this->tempDir);

        $diff = DeploymentManifest::diff($previous, $current);

        $this->assertSame(['index.html', 'style.css'], $diff['uploads']);
        $this->assertSame(['nested/app.js'], $diff['deletions']);
    }

    public function test_diff_uploads_nothing_when_the_directory_is_unchanged(): void
    {
        $previous = DeploymentManifest::buildFromLocalDirectory($this->tempDir);
        $current = DeploymentManifest::buildFromLocalDirectory($this->tempDir);

        $diff = DeploymentManifest::diff($previous, $current);

        $this->assertSame([], $diff['uploads']);
        $this->assertSame([], $diff['deletions']);
    }
}
