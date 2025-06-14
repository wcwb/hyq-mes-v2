<script setup lang="ts">
import InputError from '@/components/InputError.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthBase from '@/layouts/AuthLayout.vue';
import PageHead from '@/components/ui/PageHead.vue';
import { Head, useForm } from '@inertiajs/vue3';
import { LoaderCircle } from 'lucide-vue-next';
import { computed } from 'vue';

defineProps<{
    status?: string;
    canResetPassword: boolean;
}>();

const form = useForm({
    login: '',
    password: '',
    remember: false,
});

const submit = () => {
    form.post(route('login'), {
        onFinish: () => form.reset('password'),
    });
};

// SEO Meta标签配置
const canonical = computed(() => `${window.location.origin}/login`);
</script>

<template>
    <AuthBase :title="$t('page.auth.login.title')" :description="$t('page.auth.login.description')">

        <Head :title="$t('page.auth.login.pageTitle')" />

        <!-- SEO优化的Meta标签 -->
        <PageHead :title="$t('meta.auth.login.title')" :description="$t('meta.auth.login.description')"
            :keywords="$t('meta.auth.login.keywords')" :canonical="canonical" og-type="website"
            :robots="'noindex,nofollow'" />

        <div v-if="status" class="mb-4 text-center text-sm font-medium text-green-600">
            {{ status }}
        </div>

        <form @submit.prevent="submit" class="flex flex-col gap-6">
            <div class="grid gap-6">
                <div class="grid gap-2">
                    <Label for="login">{{ $t('form.login') }}</Label>
                    <Input id="login" type="text" required autofocus :tabindex="1" autocomplete="login"
                        v-model="form.login" :placeholder="$t('page.auth.login.placeholder.login')" />
                    <InputError :message="form.errors.login" />
                </div>

                <div class="grid gap-2">
                    <div class="flex items-center justify-between">
                        <Label for="password">{{ $t('form.password') }}</Label>
                        <TextLink v-if="canResetPassword" :href="route('password.request')" class="text-sm"
                            :tabindex="5">
                            {{ $t('form.forgotPassword') }}
                        </TextLink>
                    </div>
                    <Input id="password" type="password" required :tabindex="2" autocomplete="current-password"
                        v-model="form.password" :placeholder="$t('page.auth.login.placeholder.password')" />
                    <InputError :message="form.errors.password" />
                </div>

                <div class="flex items-center justify-between">
                    <Label for="remember" class="flex items-center space-x-3">
                        <Checkbox id="remember" v-model="form.remember" :tabindex="3" />
                        <span>{{ $t('form.rememberMe') }}</span>
                    </Label>
                </div>

                <Button type="submit" class="mt-4 w-full" :tabindex="4" :disabled="form.processing">
                    <LoaderCircle v-if="form.processing" class="h-4 w-4 animate-spin" />
                    {{ $t('button.login') }}
                </Button>
            </div>
        </form>
    </AuthBase>
</template>
