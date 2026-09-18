<?php

namespace Tests\Unit;

use App\Transports\FtpTransport;
use App\Transports\SftpTransport;
use App\Transports\SshRsyncTransport;
use App\Transports\TransportRegistry;
use InvalidArgumentException;
use Tests\TestCase;

class TransportRegistryTest extends TestCase
{
    public function test_it_resolves_each_known_connection_type(): void
    {
        $registry = app(TransportRegistry::class);

        $this->assertInstanceOf(SshRsyncTransport::class, $registry->get('ssh_rsync'));
        $this->assertInstanceOf(SftpTransport::class, $registry->get('sftp'));
        $this->assertInstanceOf(FtpTransport::class, $registry->get('ftp'));
    }

    public function test_has_reports_known_and_unknown_types(): void
    {
        $registry = app(TransportRegistry::class);

        $this->assertTrue($registry->has('sftp'));
        $this->assertFalse($registry->has('ssh_exec'));
    }

    public function test_get_throws_for_an_unknown_type(): void
    {
        $registry = app(TransportRegistry::class);

        $this->expectException(InvalidArgumentException::class);

        $registry->get('carrier-pigeon');
    }

    public function test_types_lists_every_registered_transport(): void
    {
        $registry = app(TransportRegistry::class);

        $this->assertSame(['ssh_rsync', 'sftp', 'ftp'], $registry->types());
    }
}
