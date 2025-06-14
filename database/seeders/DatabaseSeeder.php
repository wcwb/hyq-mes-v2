<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Team;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 首先创建管理员团队
        $defaultTeam = Team::create([
            'user_id' => 1, // 临时设置，稍后更新
            'name' => 'Admin',
            'description' => 'Admin Team',
            'personal_team' => false,
        ]);

        // 创建超级管理员
        $adminUser = User::create([
            'work_no' => 'admin01',
            'abbreviation' => 'Admin',
            'phone' => '0832609600',
            'email' => 'james@hyq.com',
            'name' => 'James',
            'surname' => 'Wang',
            'current_team_id' => $defaultTeam->id,
            'default_team_id' => $defaultTeam->id,
            'position' => 1,
            'status' => 'active',
            'online' => true,
            'is_super_admin' => true,
            'commencement_date' => now(),
            'password' => 'juWveg-kegnyq-3dewxu',
            'email_verified_at' => now(),
        ]);

        // 更新团队所有者
        $defaultTeam->update(['user_id' => $adminUser->id]);


        // 创建更多测试用户
        User::factory(5)->create([
            'current_team_id' => 2,
            'default_team_id' => 2
        ]);

        // $this->call(ModulePermissionSeeder::class);

        $this->command->info('数据库种子运行完成！');
    }
}
