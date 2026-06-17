export const PR_ATTACHMENT_META_PREFIX = '[[vp-pr:';
export const PR_ATTACHMENT_META_REGEX = /\[\[vp-pr:([^\]]+)\]\]/g;
export const RECIPE_ATTACHMENT_META_PREFIX = '[[vp-recipe:';
export const RECIPE_ATTACHMENT_META_REGEX = /\[\[vp-recipe:([^\]]+)\]\]/g;
export const WORKOUT_PLAN_ATTACHMENT_META_PREFIX = '[[vp-workout-plan:';
export const WORKOUT_PLAN_ATTACHMENT_META_REGEX =
  /\[\[vp-workout-plan:([^\]]+)\]\]/g;
export const MEAL_ATTACHMENT_META_PREFIX = '[[vp-meal:';
export const MEAL_ATTACHMENT_META_REGEX = /\[\[vp-meal:([^\]]+)\]\]/g;
export const STACK_ATTACHMENT_META_PREFIX = '[[vp-stack:';
export const STACK_ATTACHMENT_META_REGEX = /\[\[vp-stack:([^\]]+)\]\]/g;

export type ElevatePrAttachment = {
  exerciseName: string;
  prTypeLabel: string;
  valueLabel: string;
  improvementLabel?: string;
};

export type ElevateRecipeAttachment = {
  recipeId: string;
  name: string;
  caloriesPerServing: number;
  totalServings: number;
  imageUrl?: string | null;
  visibilityLabel: 'Public' | 'Private';
};

export type ElevateWorkoutPlanAttachment = {
  planId: string;
  name: string;
  description?: string | null;
  dayCount: number;
  difficultyLabel?: string;
  visibilityLabel: 'Public';
};

export type ElevateMealAttachment = {
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
  mealLabel: string;
  date: string;
  itemCount: number;
  names: string[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  imageUrl?: string | null;
};

export type ElevateStackAttachment = {
  stackId: string;
  name: string;
  itemCount: number;
  items: { name: string; dosage: string }[];
};

type ElevateLegacyMealAttachment = {
  logId: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  loggedAt: string;
  imageUrl?: string | null;
};

const decodeAttachmentPayload = (encodedPayload: string): unknown => {
  try {
    return JSON.parse(decodeURIComponent(encodedPayload)) as unknown;
  } catch {
    try {
      return JSON.parse(encodedPayload) as unknown;
    } catch {
      return null;
    }
  }
};

export const decodePrAttachments = (
  encodedPayload: string,
): ElevatePrAttachment[] => {
  const parsed = decodeAttachmentPayload(encodedPayload);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is ElevatePrAttachment => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<ElevatePrAttachment>;
      return (
        typeof candidate.exerciseName === 'string' &&
        typeof candidate.prTypeLabel === 'string' &&
        typeof candidate.valueLabel === 'string'
      );
    })
    .slice(0, 6);
};

export const decodeRecipeAttachments = (
  encodedPayload: string,
): ElevateRecipeAttachment[] => {
  const parsed = decodeAttachmentPayload(encodedPayload);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is ElevateRecipeAttachment => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<ElevateRecipeAttachment>;
      return (
        typeof candidate.recipeId === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.caloriesPerServing === 'number' &&
        typeof candidate.totalServings === 'number'
      );
    })
    .slice(0, 3);
};

export const decodeWorkoutPlanAttachments = (
  encodedPayload: string,
): ElevateWorkoutPlanAttachment[] => {
  const parsed = decodeAttachmentPayload(encodedPayload);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is ElevateWorkoutPlanAttachment => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<ElevateWorkoutPlanAttachment>;
      return (
        typeof candidate.planId === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.dayCount === 'number'
      );
    })
    .slice(0, 3);
};

export const decodeMealAttachments = (
  encodedPayload: string,
): ElevateMealAttachment[] => {
  const parsed = decodeAttachmentPayload(encodedPayload);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item): ElevateMealAttachment | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Partial<ElevateMealAttachment>;
      if (
        typeof candidate.mealType === 'string' &&
        typeof candidate.mealLabel === 'string' &&
        typeof candidate.date === 'string' &&
        typeof candidate.itemCount === 'number' &&
        Array.isArray(candidate.names) &&
        typeof candidate.totalCalories === 'number' &&
        typeof candidate.totalProtein === 'number' &&
        typeof candidate.totalCarbs === 'number' &&
        typeof candidate.totalFat === 'number'
      ) {
        return {
          mealType: candidate.mealType,
          mealLabel: candidate.mealLabel,
          date: candidate.date,
          itemCount: candidate.itemCount,
          names: candidate.names.filter(
            (entry): entry is string => typeof entry === 'string',
          ),
          totalCalories: candidate.totalCalories,
          totalProtein: candidate.totalProtein,
          totalCarbs: candidate.totalCarbs,
          totalFat: candidate.totalFat,
          imageUrl: candidate.imageUrl ?? null,
        };
      }

      const legacy = item as Partial<ElevateLegacyMealAttachment>;
      if (
        typeof legacy.logId === 'string' &&
        typeof legacy.mealType === 'string' &&
        typeof legacy.name === 'string' &&
        typeof legacy.calories === 'number' &&
        typeof legacy.protein === 'number' &&
        typeof legacy.carbs === 'number' &&
        typeof legacy.fat === 'number'
      ) {
        return {
          mealType: legacy.mealType,
          mealLabel:
            legacy.mealType === 'BREAKFAST'
              ? 'Breakfast'
              : legacy.mealType === 'LUNCH'
                ? 'Lunch'
                : legacy.mealType === 'DINNER'
                  ? 'Dinner'
                  : 'Snacks',
          date: legacy.loggedAt || '',
          itemCount: 1,
          names: [legacy.name],
          totalCalories: legacy.calories,
          totalProtein: legacy.protein,
          totalCarbs: legacy.carbs,
          totalFat: legacy.fat,
          imageUrl: legacy.imageUrl ?? null,
        };
      }

      return null;
    })
    .filter((item): item is ElevateMealAttachment => Boolean(item))
    .slice(0, 4);
};

const encodePrAttachments = (attachments: ElevatePrAttachment[]): string =>
  encodeURIComponent(JSON.stringify(attachments));

const encodeRecipeAttachments = (
  attachments: ElevateRecipeAttachment[],
): string => encodeURIComponent(JSON.stringify(attachments));

const encodeWorkoutPlanAttachments = (
  attachments: ElevateWorkoutPlanAttachment[],
): string => encodeURIComponent(JSON.stringify(attachments));

const encodeMealAttachments = (attachments: ElevateMealAttachment[]): string =>
  encodeURIComponent(JSON.stringify(attachments));

export const appendPrAttachmentMeta = (
  content: string,
  attachments: ElevatePrAttachment[],
): string => {
  if (attachments.length === 0) {
    return content.trim();
  }

  const baseContent = content.trim();
  const payload = `${PR_ATTACHMENT_META_PREFIX}${encodePrAttachments(attachments)}]]`;
  return baseContent ? `${baseContent}\n\n${payload}` : payload;
};

export const appendRecipeAttachmentMeta = (
  content: string,
  attachments: ElevateRecipeAttachment[],
): string => {
  if (attachments.length === 0) {
    return content.trim();
  }

  const baseContent = content.trim();
  const payload = `${RECIPE_ATTACHMENT_META_PREFIX}${encodeRecipeAttachments(attachments)}]]`;
  return baseContent ? `${baseContent}\n\n${payload}` : payload;
};

export const appendWorkoutPlanAttachmentMeta = (
  content: string,
  attachments: ElevateWorkoutPlanAttachment[],
): string => {
  if (attachments.length === 0) {
    return content.trim();
  }

  const baseContent = content.trim();
  const payload = `${WORKOUT_PLAN_ATTACHMENT_META_PREFIX}${encodeWorkoutPlanAttachments(attachments)}]]`;
  return baseContent ? `${baseContent}\n\n${payload}` : payload;
};

export const appendMealAttachmentMeta = (
  content: string,
  attachments: ElevateMealAttachment[],
): string => {
  if (attachments.length === 0) {
    return content.trim();
  }

  const baseContent = content.trim();
  const payload = `${MEAL_ATTACHMENT_META_PREFIX}${encodeMealAttachments(attachments)}]]`;
  return baseContent ? `${baseContent}\n\n${payload}` : payload;
};

export const extractPrAttachmentsFromContent = (
  content: string,
): ElevatePrAttachment[] => {
  const matches = [...content.matchAll(PR_ATTACHMENT_META_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  const attachments: ElevatePrAttachment[] = [];
  for (const match of matches) {
    const encoded = match[1];
    if (!encoded) {
      continue;
    }
    attachments.push(...decodePrAttachments(encoded));
  }

  return attachments.slice(0, 6);
};

export const extractRecipeAttachmentsFromContent = (
  content: string,
): ElevateRecipeAttachment[] => {
  const matches = [...content.matchAll(RECIPE_ATTACHMENT_META_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  const attachments: ElevateRecipeAttachment[] = [];
  for (const match of matches) {
    const encoded = match[1];
    if (!encoded) {
      continue;
    }
    attachments.push(...decodeRecipeAttachments(encoded));
  }

  return attachments.slice(0, 3);
};

export const extractWorkoutPlanAttachmentsFromContent = (
  content: string,
): ElevateWorkoutPlanAttachment[] => {
  const matches = [...content.matchAll(WORKOUT_PLAN_ATTACHMENT_META_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  const attachments: ElevateWorkoutPlanAttachment[] = [];
  for (const match of matches) {
    const encoded = match[1];
    if (!encoded) {
      continue;
    }
    attachments.push(...decodeWorkoutPlanAttachments(encoded));
  }

  return attachments.slice(0, 3);
};

export const extractMealAttachmentsFromContent = (
  content: string,
): ElevateMealAttachment[] => {
  const matches = [...content.matchAll(MEAL_ATTACHMENT_META_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  const attachments: ElevateMealAttachment[] = [];
  for (const match of matches) {
    const encoded = match[1];
    if (!encoded) {
      continue;
    }
    attachments.push(...decodeMealAttachments(encoded));
  }

  return attachments.slice(0, 6);
};

export const decodeStackAttachments = (
  encodedPayload: string,
): ElevateStackAttachment[] => {
  const parsed = decodeAttachmentPayload(encodedPayload);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is ElevateStackAttachment => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<ElevateStackAttachment>;
      return (
        typeof candidate.stackId === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.itemCount === 'number' &&
        Array.isArray(candidate.items)
      );
    })
    .slice(0, 3);
};

const encodeStackAttachments = (
  attachments: ElevateStackAttachment[],
): string => encodeURIComponent(JSON.stringify(attachments));

export const appendStackAttachmentMeta = (
  content: string,
  attachments: ElevateStackAttachment[],
): string => {
  if (attachments.length === 0) {
    return content.trim();
  }

  const baseContent = content.trim();
  const payload = `${STACK_ATTACHMENT_META_PREFIX}${encodeStackAttachments(attachments)}]]`;
  return baseContent ? `${baseContent}\n\n${payload}` : payload;
};

export const extractStackAttachmentsFromContent = (
  content: string,
): ElevateStackAttachment[] => {
  const matches = [...content.matchAll(STACK_ATTACHMENT_META_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  const attachments: ElevateStackAttachment[] = [];
  for (const match of matches) {
    const encoded = match[1];
    if (!encoded) {
      continue;
    }
    attachments.push(...decodeStackAttachments(encoded));
  }

  return attachments.slice(0, 3);
};

export const stripAttachmentMetaFromContent = (content: string): string =>
  content
    .replace(PR_ATTACHMENT_META_REGEX, '')
    .replace(RECIPE_ATTACHMENT_META_REGEX, '')
    .replace(WORKOUT_PLAN_ATTACHMENT_META_REGEX, '')
    .replace(MEAL_ATTACHMENT_META_REGEX, '')
    .replace(STACK_ATTACHMENT_META_REGEX, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
