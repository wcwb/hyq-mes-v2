<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/composables/useInitials';
import type { User } from '@/types';
import { computed } from 'vue';

interface Props {
    user: User;
    showEmail?: boolean;
    compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    showEmail: false,
    compact: false,
});

const { getInitials } = useInitials();

// Compute whether we should show the avatar image
const showAvatar = computed(() => props.user.avatar && props.user.avatar !== '');
</script>

<template>
    <Avatar :class="compact ? 'h-6 w-6' : 'h-8 w-8'" class="overflow-hidden rounded-lg">
        <AvatarImage v-if="showAvatar" :src="user.avatar!" :alt="user.name" />
        <AvatarFallback class="rounded-lg text-black dark:text-white">
            {{ getInitials(user.name) }}
        </AvatarFallback>
    </Avatar>

    <div :class="['grid flex-1 text-left leading-tight', compact ? 'text-xs' : 'text-sm']">
        <span class="truncate font-medium">{{ user.name }}</span>
        <span v-if="showEmail" :class="['truncate text-muted-foreground', compact ? 'text-[10px]' : 'text-xs']">{{ user.email }}</span>
    </div>
</template>
