<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Support\Facades\DB;
use App\Models\Team;

class ModulePermissionSeeder extends Seeder
{
    /**
     * 运行数据库填充
     */
    public function run(): void
    {
        // 清除缓存
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // 模块列表
        $teams = [
            ['id' => 2, 'name' => 'users', 'description' => 'users team', 'user_id' => 1,],
            ['id' => 3, 'name' => 'roles', 'description' => 'roles team', 'user_id' => 1,],
            ['id' => 4, 'name' => 'teams', 'description' => 'teams', 'user_id' => 1,],
            ['id' => 5, 'name' => 'orders', 'description' => 'orders', 'user_id' => 1,],
            ['id' => 6, 'name' => 'customers', 'description' => 'customers teams', 'user_id' => 1,],
            ['id' => 7, 'name' => 'suppliers', 'description' => 'suppliers', 'user_id' => 1,],
            ['id' => 8, 'name' => 'invoices', 'description' => 'invoices', 'user_id' => 1,],
            ['id' => 9, 'name' => 'tasks', 'description' => 'tasks', 'user_id' => 1,],
            ['id' => 10, 'name' => 'notifications', 'description' => 'notifications', 'user_id' => 1,],
            ['id' => 11, 'name' => 'logs', 'description' => 'logs teams', 'user_id' => 1,],
            ['id' => 12, 'name' => 'styles', 'description' => 'styles', 'user_id' => 1,],
            ['id' => 13, 'name' => 'cutting', 'description' => 'cutting', 'user_id' => 1,],
            ['id' => 14, 'name' => 'sewing', 'description' => 'sewing', 'user_id' => 1,],
            ['id' => 15, 'name' => 'packing', 'description' => 'packing', 'user_id' => 1,],
            ['id' => 16, 'name' => 'office', 'description' => 'office team', 'user_id' => 1,],
            ['id' => 17, 'name' => 'quality', 'description' => 'quality control team', 'user_id' => 1,],
            ['id' => 18, 'name' => 'sales', 'description' => 'sales team', 'user_id' => 1,],
            ['id' => 19, 'name' => 'finance', 'description' => 'finance team', 'user_id' => 1,],
            ['id' => 20, 'name' => 'hr', 'description' => 'hr team', 'user_id' => 1,],
            ['id' => 21, 'name' => 'logistics', 'description' => 'logistics team', 'user_id' => 1,]
        ];

        // 权限动作列表
        $actions = [
            'view',
            'viewAny',
            'addMembers',
            'removeMembers',
            'forceRemoveMembers',
            'assign',
            'sync',
            'remove',
            'store',
            'create',
            'update',
            'delete',
            'export',
            'import',
            'print',
            'approve',
            'reject',
            'cancel',
            'archive',
            'restore',
            'forceDelete',
            'emailTo'
        ];
        $roleNames = ['owner', 'viewer', 'creator', 'member', 'approver', 'editor', 'admin'];

        Team::upsert($teams, ['id'], ['user_id', 'name', 'description'], ['updated_at']);

        // 1. 批量创建所有权限
        $this->createPermissionsBatch($teams, $actions);

        // 2. 批量创建所有角色
        $this->createRolesBatch($roleNames, $teams);
    }

    /**
     * 批量创建权限
     */
    private function createPermissionsBatch(array $teams, array $actions): void
    {
        $permissions = [];
        $timestamp = now();

        foreach ($teams as $team) {
            foreach ($actions as $action) {
                // 只有团队模块可以添加和移除成员
                if ($team['name'] === 'teams' && in_array($action, ['addMembers', 'removeMembers', 'forceRemoveMembers', 'create', 'update', 'delete', 'forceDelete', 'restore'])) {
                    $permissions[] = [
                        'name' => "{$team['name']}.{$action}",
                        'guard_name' => 'api',
                        'team_id' => $team['id'],
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];
                }

                if ($team['name'] === 'roles' && in_array($action, ['create', 'update', 'delete', 'assign', 'sync', 'remove', 'restore', 'forceDelete', 'view', 'viewAny'])) {
                    $permissions[] = [
                        'name' => "{$team['name']}.{$action}",
                        'guard_name' => 'api',
                        'team_id' => $team['id'],
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];
                }

                $teamNames = array_diff(array_column($teams, 'name'), ['teams', 'roles']);

                // 其他权限对所有模块都生效
                if (!in_array($action, ['addMembers', 'removeMembers', 'forceRemoveMembers', 'assign', 'sync', 'remove']) && in_array($team['name'], $teamNames)) {
                    $permissions[] = [
                        'name' => "{$team['name']}.{$action}",
                        'guard_name' => 'api',
                        'team_id' => $team['id'],
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];
                }
            }
        }

        // 使用 upsert 避免重复插入
        Permission::upsert(
            $permissions,
            ['name', 'guard_name', 'team_id'], // 唯一键
            ['updated_at'] // 更新字段
        );
    }

    /**
     * 批量创建角色
     */
    private function createRolesBatch(array $roleNames, array $teams): void
    {
        $roles = [];
        $timestamp = now();

        foreach ($teams as $team) {
            foreach ($roleNames as $roleName) {
                $roles[] = [
                    'name' => $roleName,
                    'guard_name' => 'api',
                    'team_id' => $team['id'],
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }
        }

        // 使用 upsert 避免重复插入
        Role::upsert(
            $roles,
            ['name', 'guard_name', 'team_id'], // 唯一键
            ['updated_at'] // 更新字段
        );
    }

    /**
     * 批量分配权限给角色
     */
    private function assignPermissionsToRoles(array $modules, array $actions, array $teams, array $roleNames): void
    {
        // 获取所有权限和角色的映射
        $permissions = Permission::whereIn('team_id', $teams)
            ->get()
            ->keyBy(function ($permission) {
                return $permission->team_id . '_' . $permission->name;
            });

        $roles = Role::whereIn('team_id', $teams)
            ->get()
            ->keyBy(function ($role) {
                return $role->team_id . '_' . $role->name;
            });

        $rolePermissions = [];

        foreach ($teams as $team) {
            foreach ($roleNames as $roleName) {
                $roleKey = $team . '_' . $roleName;
                $role = $roles[$roleKey] ?? null;

                if (!$role) continue;

                foreach ($modules as $module) {
                    foreach ($actions as $action) {
                        $permissionKey = $team . '_' . $action . '_' . $module;
                        $permission = $permissions[$permissionKey] ?? null;

                        if (!$permission) continue;

                        // 根据角色和动作决定是否分配权限
                        if ($this->shouldAssignPermission($roleName, $action)) {
                            $rolePermissions[] = [
                                'permission_id' => $permission->id,
                                'role_id' => $role->id,
                            ];
                        }
                    }
                }
            }
        }

        // 批量插入角色权限关联
        if (!empty($rolePermissions)) {
            // 先清除可能存在的重复数据
            DB::table('role_has_permissions')->whereIn('role_id', $roles->pluck('id'))->delete();

            // 分批插入以避免内存问题
            $chunks = array_chunk($rolePermissions, 1000);
            foreach ($chunks as $chunk) {
                DB::table('role_has_permissions')->insert($chunk);
            }
        }
    }

    /**
     * 判断是否应该为角色分配特定权限
     */
    private function shouldAssignPermission(string $roleName, string $action): bool
    {
        $permissions = [
            'viewer' => ['view', 'print', 'emailTo'],
            'creator' => ['view', 'create', 'update', 'import', 'print', 'restore', 'emailTo'],
            'editor' => ['view', 'update', 'import', 'print', 'emailTo'],
            'approver' => ['approve', 'reject', 'cancel'],
            'owner' => [
                'view',
                'addTeamMember',
                'removeTeamMember',
                'create',
                'update',
                'delete',
                'export',
                'import',
                'print',
                'archive',
                'restore',
                'forceDelete',
                'emailTo'
            ],
        ];

        return in_array($action, $permissions[$roleName] ?? []);
    }
}
