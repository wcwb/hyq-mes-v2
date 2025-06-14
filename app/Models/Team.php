<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection as BaseCollection;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class Team extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * 可批量赋值的属性
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'personal_team',
    ];

    protected $hidden = [
        'deleted_at',
        'created_at',
        'updated_at',
    ];

    /**
     * 属性类型转换
     *
     * @var array<string, string>
     */
    protected $casts = [
        'personal_team' => 'boolean',
    ];

    /**
     * 团队所有者关联
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * 团队成员关联
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'team_user')
            ->withPivot('role')
            ->withTimestamps()
            ->as('membership');
    }

    public function allUsers(): EloquentCollection
    {
        return $this->users->merge([$this->owner]);
    }

    public function hasUser($user)
    {
        return $this->allUsers()->contains($user);
    }

    /**
     * 从团队中移除用户
     * 
     * @param  mixed  $users 要移除的用户(可以是用户实例、ID、或用户集合)
     * @return array 操作结果，包含成功和失败的用户信息
     */
    public function removeUser($users)
    {
        $userIds = $this->parseIds($users);

        if (empty($userIds)) {
            return false;
        }

        $this->users()->detach($userIds);

        return count($userIds);
    }


    /**
     * 移除团队的所有角色和权限
     * 
     * @return void 
     */
    /* public function removeTeamRolesAndPermissions()
    {
        DB::transaction(function () {
            DB::table('model_has_permissions')
                ->where('team_id', $this->id)
                ->delete();

            DB::table('model_has_roles')
                ->where('team_id', $this->id)
                ->delete();

            Role::where('team_id', $this->id)->delete();
            Permission::where('team_id', $this->id)->delete();

            DB::table('role_has_permissions')
                ->where('team_id', $this->id)
                ->delete();
        });
    } */


    /**
     * 解析用户ID值
     * 
     * 将不同类型的用户标识转换为ID数组
     * 
     * @param mixed $value 用户标识(可以是Model实例、集合或数组)
     * @return array 用户ID数组
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
