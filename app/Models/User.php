<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Trait\HasTeams;
use Laravel\Sanctum\HasApiTokens;
use App\Casts\Uppercase;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, HasTeams;

    protected $guarded = [];


    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'updated_at',
        'created_at',
        'deleted_at'
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'work_no' => Uppercase::class,
            'last_login_at' => 'timestamp',
            'online' => 'boolean',
            'is_super_admin' => 'boolean',
            'created_at' => 'timestamp',
            'updated_at' => 'timestamp',
            'deleted_at' => 'timestamp',
            'current_team_id' => 'integer',
            'default_team_id' => 'integer',
            'commencement_date' => 'date',
            'last_logout_at' => 'timestamp',
            'cell_verified_at' => 'datetime',
            'cell_verify_code_sent_at' => 'datetime',
            'terminated_at' => 'datetime',
        ];
    }

    /**
     * 判断用户是否是超级管理员
     *
     * @return bool
     */
    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin;
    }

    public static function findForAuth(string $login): ?self
    {
        return self::where('work_no', $login)
            ->orWhere('email', $login)
            ->orWhere('phone', $login)
            ->first();
    }
}
