<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public const PERMISSIONS = [
        'workspace.manage',
        'applications.create',
        'applications.manage',
        'servers.manage',
        'pipeline.manage',
        'environments.manage',
        'deployments.trigger',
        'application.view',
    ];

    public const ROLES = [
        'owner' => self::PERMISSIONS,
        'manager' => [
            'applications.create',
            'applications.manage',
            'servers.manage',
            'pipeline.manage',
            'environments.manage',
            'deployments.trigger',
            'application.view',
        ],
        'deployer' => ['deployments.trigger', 'application.view'],
        'viewer' => ['application.view'],
    ];

    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId(null);

        foreach (self::PERMISSIONS as $permission) {
            $registrar->forgetCachedPermissions();
            Permission::findOrCreate($permission, 'web');
        }

        $registrar->forgetCachedPermissions();

        foreach (self::ROLES as $role => $permissions) {
            $roleModel = Role::findOrCreate($role, 'web');
            $roleModel->syncPermissions($permissions);
        }
    }
}
