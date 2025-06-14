<?php

namespace App\Models\Trait;

use Spatie\Permission\Contracts\Role;
use BackedEnum;
use InvalidArgumentException;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Traits\HasRoles as BaseHasRoles;
use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Contracts\Permission;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection as BaseCollection;

trait HasRoles
{
    // use BaseHasRoles;

    /**
     * 检查用户在指定团队中是否有指定角色
     * 
     * @param \App\Models\Team $team 团队实例
     * @param string $roleName 角色名称
     * @return bool
     */
    public function hasTeamRole($team, string $roleName): bool
    {
        // 保存当前团队上下文
        $originalTeamId = app(PermissionRegistrar::class)->getPermissionsTeamId();

        try {
            // 设置为指定团队的上下文
            app(PermissionRegistrar::class)->setPermissionsTeamId($team->id);

            // 刷新用户角色关系
            $this->unsetRelation('roles');

            // 检查是否有指定角色
            return $this->hasRole($roleName);
        } finally {
            // 恢复原始团队上下文
            app(PermissionRegistrar::class)->setPermissionsTeamId($originalTeamId);
        }
    }

    /**
     * 移除角色
     * 
     * @param string|int|array|Collection|Role|BackedEnum $role 角色
     * @return $this 
     * @throws InvalidArgumentException 如果角色不是有效的角色实例
     */
    public function removeRole($role)
    {
        $roles = $this->parseIds($role);

        $this->roles()->detach($roles);

        if (is_a($this, Permission::class)) {
            $this->forgetCachedPermissions();
        }

        $this->unsetRelation('roles');

        return $this;
    }

    /**
     * 解析角色ID值
     * 
     * 将不同类型的用角色标识转换为ID数组
     * 
     * @param mixed $value 角色标识(可以是Model实例、集合或数组)
     * @return array 角色ID数组
     */
    private function parseIds($value)
    {
        // 如果是Model实例,直接返回其ID
        if ($value instanceof Model) {
            return [$value->id];
        }

        // 如果是Eloquent集合,提取所有ID
        if ($value instanceof EloquentCollection) {
            return $value->pluck('id')->all();
        }

        // 如果是整数,直接返回包含该整数的数组
        if (is_int($value)) {
            return [$value];
        }

        if (is_string($value)) {
            return $this->getRoleClass()::findByName($value, $this->getDefaultGuardName());
        }

        // 如果是基础集合或数组,遍历处理每个元素
        if ($value instanceof BaseCollection || is_array($value)) {
            return (new BaseCollection($value))
                ->map(fn($item) => $item instanceof Model ? $item->id : $item)
                ->all();
        }

        // 其他情况转换为数组
        return (array) $value;
    }
}
