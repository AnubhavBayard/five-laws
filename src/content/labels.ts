import type { LifeArea, LifeStage } from '@shared/laws';

export const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  student: 'Student',
  working: 'Working',
  freelancer: 'Freelancer',
  business_owner: 'Business owner',
};

export const LIFE_AREA_LABEL: Record<LifeArea, string> = {
  studies: 'Studies',
  career: 'Career',
  money: 'Money',
  health: 'Health',
  relationships: 'Relationships',
  other: 'Something else',
};

export const RECIPIENT_LABEL: Record<'teacher' | 'manager' | 'client' | 'teammate', string> = {
  teacher: 'A teacher',
  manager: 'My manager',
  client: 'A client',
  teammate: 'A teammate',
};
