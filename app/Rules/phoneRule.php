<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * South African Mobile Number Validation Rule
 *
 * 适用格式示例：
 * 1) 国际格式（带 +）：+27721234567
 * 2) 国际格式（无 +）：27721234567
 * 3) 本地格式：0721234567
 * 4) 含空格 / 破折号：+27 72 123-4567、072-123-4567
 *
 * 仅允许以下南非运营商常见前缀：
 * 72, 73, 74, 76, 78, 79, 81, 82, 83, 84
 */
class phoneRule implements ValidationRule
{
    /**
     * 运行验证规则
     *
     * @param string $attribute 字段名
     * @param mixed  $value     字段值
     * @param \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // 1️⃣ 先移除空格、破折号、括号等无关字符
        $cleanNumber = preg_replace('/[\s\-\(\)]/', '', (string) $value);

        // 2️⃣ 定义可接受的南非手机号码正则表达式
        $patterns = [
            // 国际格式：+27 + 9位数字（不包含前导0）
            '/^\+27(72|73|74|76|78|79|81|82|83|84)\d{7}$/',
            // 国际格式（无+）：27 + 9位数字
            '/^27(72|73|74|76|78|79|81|82|83|84)\d{7}$/',
            // 本地格式：0 + 9位数字
            '/^0(72|73|74|76|78|79|81|82|83|84)\d{7}$/',
        ];

        // 3️⃣ 遍历正则，若全部不匹配则验证失败
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $cleanNumber)) {
                return; // 验证通过
            }
        }

        // 4️⃣ 失败时返回中文错误信息
        $fail('手机号码格式不正确，请输入有效的南非手机号码（如：+27721234567 或 0721234567）。');
    }
}
