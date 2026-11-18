import { z } from 'zod';

export const LAWS = ['murphy', 'kidlin', 'wilson', 'falkland', 'gilbert'] as const;
export const Law = z.enum(LAWS);
export type Law = z.infer<typeof Law>;

export const LIFE_AREAS = ['studies', 'career', 'money', 'health', 'relationships', 'other'] as const;
export const LifeArea = z.enum(LIFE_AREAS);
export type LifeArea = z.infer<typeof LifeArea>;

export const LIFE_STAGES = ['student', 'working', 'freelancer', 'business_owner'] as const;
export const LifeStage = z.enum(LIFE_STAGES);
export type LifeStage = z.infer<typeof LifeStage>;
