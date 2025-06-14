<?php

namespace App\Models\Trait;

use App\Models\Team;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Role;

/**
 * 团队关系特性
 * 
 * 该特性用于处理用户与团队之间的关系，包括：
 * - 当前团队管理
 * - 团队所有权
 * - 团队成员关系
 * - 团队访问权限
 */
trait HasTeams
{
    /**
     * 判断给定的团队是否为当前用户的当前团队
     * 
     * @param Team $team 要检查的团队实例
     * @return bool 如果是当前团队返回 true，否则返回 false
     */
    public function isCurrentTeam($team)
    {
        return $team->id === $this->currentTeam->id;
    }

    /**
     * 获取用户当前所属的团队
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function currentTeam()
    {
        return $this->belongsTo(Team::class, 'current_team_id');
    }

    /**
     * 获取用户所有相关的团队（包括拥有的和加入的）
     * 
     * @return \Illuminate\Support\Collection 按名称排序的团队集合
     */
    public function allTeams()
    {
        return $this->ownedTeams->merge($this->teams)->sortBy('name');
    }

    /**
     * 获取用户拥有的所有团队
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function ownedTeams()
    {
        return $this->HasMany(Team::class);
    }

    /**
     * 获取用户加入的所有团队
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function teams()
    {
        return $this->belongsToMany(Team::class, 'team_user')
            ->withPivot('role')
            ->withTimestamps()
            ->as('membership');
    }

    /**
     * 判断用户是否拥有指定的团队
     * 
     * @param Team|null $team 要检查的团队实例
     * @return bool 如果用户拥有该团队返回 true，否则返回 false
     */
    public function ownsTeam($team)
    {
        if (is_null($team)) {
            return false;
        }

        return $this->id == $team->{$this->getForeignKey()};
    }

    /**
     * 判断用户是否属于指定的团队（拥有或加入）
     * 
     * @param Team|null $team 要检查的团队实例
     * @return bool 如果用户属于该团队返回 true，否则返回 false
     */
    public function belongsToTeam($team)
    {
        if (is_null($team)) {
            return false;
        }

        return $this->ownsTeam($team) || $this->teams->contains(function ($t) use ($team) {
            return $t->id === $team->id;
        });
    }

    /**
     * 切换用户的当前团队
     * 
     * @param Team $team 要切换到的团队实例
     * @return bool 切换成功返回 true，失败返回 false
     */
    public function switchTeam($team)
    {
        if (! $this->belongsToTeam($team)) {
            return false;
        }

        $this->forceFill([
            'current_team_id' => $team->id,
        ])->save();

        $this->setRelation('currentTeam', $team);

        return true;
    }

    public function teamRoles(Team $team): Collection
    {
        if (! $this->isTeamOwner($team)) {
            return collect(['error' => 'You are not allowed to view roles']);
        }

        return Role::where('team_id', $team->id)->get();
    }

    public function currentTeamRoles(): Collection
    {
        return $this->teamRoles($this->currentTeam);
    }

    /**
     * 检查用户是否是团队所有者
     * 
     * @param \App\Models\Team $team 团队实例
     * @return bool
     */
    public function isTeamOwner($team): bool
    {
        return $team->user_id === $this->id;
    }
}
