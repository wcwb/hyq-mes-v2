<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->firstName(),
            'surname' => fake()->lastName(),
            'abbreviation' => fake()->lexify('???'), // 生成3位字母缩写
            'work_no' => 'H' . fake()->unique()->numberBetween(100, 999), // H100-H999
            'phone' => '+27' . fake()->unique()->numerify('##########'), // 手机号格式
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'current_team_id' => 2,
            'default_team_id' => 2,
            'position' => fake()->numberBetween(1, 10),
            'status' => fake()->randomElement(['active', 'suspended', 'disabled']),
            'email_verified_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn(array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * 创建超级管理员
     */
    public function superAdmin(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_super_admin' => true,
        ]);
    }
}
