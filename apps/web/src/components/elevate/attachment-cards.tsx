import { Link } from 'react-router';
import { format } from 'date-fns';
import { Activity, Dumbbell, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ElevateMealAttachment,
  ElevatePrAttachment,
  ElevateRecipeAttachment,
  ElevateStackAttachment,
  ElevateWorkoutPlanAttachment,
} from '@/lib/elevate-attachments';

export function PrAttachmentCards({
  attachments,
  title = 'PR highlight',
  compactSingle = false,
}: {
  attachments: ElevatePrAttachment[];
  title?: string;
  compactSingle?: boolean;
}) {
  if (attachments.length === 0) {
    return null;
  }

  const single = compactSingle && attachments.length === 1;
  const singleItem = single ? attachments[0] : null;

  return (
    <div className="mb-3 rounded-xl border border-green-500/35 bg-green-500/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-green-500">
          {title}
        </p>
        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[11px] font-medium text-green-500">
          {attachments.length} record{attachments.length === 1 ? '' : 's'}
        </span>
      </div>
      {single && singleItem ? (
        <div className="rounded-lg border border-green-500/25 bg-background/70 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {singleItem.exerciseName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {singleItem.prTypeLabel}
              </p>
            </div>
            <p className="shrink-0 text-base font-semibold">
              {singleItem.valueLabel}
            </p>
          </div>
          {singleItem.improvementLabel ? (
            <p className="mt-1 text-xs text-green-500">
              {singleItem.improvementLabel}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((item, index) => (
            <div
              key={`${item.exerciseName}-${item.prTypeLabel}-${index}`}
              className="rounded-lg border border-green-500/20 bg-background/60 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {item.exerciseName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.prTypeLabel}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {item.valueLabel}
                </p>
              </div>
              {item.improvementLabel ? (
                <p className="mt-1 text-xs text-green-500">
                  {item.improvementLabel}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecipeAttachmentCards({
  attachments,
  linkPublicRecipes = false,
}: {
  attachments: ElevateRecipeAttachment[];
  linkPublicRecipes?: boolean;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 rounded-xl border border-orange-400/35 bg-orange-500/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-400">
          Recipe card
        </p>
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[11px] font-medium text-orange-400">
          {attachments.length} recipe{attachments.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2">
        {attachments.map((item) => {
          const isPublic = item.visibilityLabel === 'Public';
          const shouldLink =
            linkPublicRecipes && isPublic && Boolean(item.recipeId);

          const cardContent = (
            <div
              className={cn(
                'rounded-lg border border-orange-400/25 bg-background/65 p-2.5',
                shouldLink &&
                  'transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/45',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v12m6-6H6"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {Math.round(item.caloriesPerServing)} cal/serving
                    </span>
                    <span>•</span>
                    <span>{item.totalServings} servings</span>
                    <span>•</span>
                    <span>{item.visibilityLabel}</span>
                    {shouldLink ? (
                      <>
                        <span>•</span>
                        <span className="text-orange-300">Open recipe</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );

          if (!shouldLink) {
            return (
              <div key={`${item.recipeId}-${item.name}`}>{cardContent}</div>
            );
          }

          return (
            <Link
              key={`${item.recipeId}-${item.name}`}
              to={`/recipes/${item.recipeId}`}
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function WorkoutPlanAttachmentCards({
  attachments,
  linkPublicPlans = false,
}: {
  attachments: ElevateWorkoutPlanAttachment[];
  linkPublicPlans?: boolean;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 rounded-xl border border-blue-400/35 bg-blue-500/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-400">
          Workout plan
        </p>
        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
          {attachments.length} plan{attachments.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2">
        {attachments.map((item) => {
          const shouldLink = linkPublicPlans && Boolean(item.planId);

          const cardContent = (
            <div
              className={cn(
                'rounded-lg border border-blue-400/25 bg-background/65 p-2.5',
                shouldLink &&
                  'transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/45',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-blue-400">
                  <Activity className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.dayCount} days</span>
                    {item.difficultyLabel ? (
                      <>
                        <span>•</span>
                        <span>{item.difficultyLabel}</span>
                      </>
                    ) : null}
                    <span>•</span>
                    <span>{item.visibilityLabel}</span>
                    {shouldLink ? (
                      <>
                        <span>•</span>
                        <span className="text-blue-300">Open plan library</span>
                      </>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );

          if (!shouldLink) {
            return <div key={`${item.planId}-${item.name}`}>{cardContent}</div>;
          }

          return (
            <Link key={`${item.planId}-${item.name}`} to="/workout-plans">
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function MealAttachmentCards({
  attachments,
}: {
  attachments: ElevateMealAttachment[];
}) {
  if (attachments.length === 0) {
    return null;
  }

  const mealTypeLabelMap: Record<ElevateMealAttachment['mealType'], string> = {
    BREAKFAST: 'Breakfast',
    LUNCH: 'Lunch',
    DINNER: 'Dinner',
    SNACKS: 'Snacks',
  };

  return (
    <div className="mb-3 rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
          Meal card
        </p>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
          {attachments.length} meal{attachments.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2">
        {attachments.map((item, index) => {
          const date = new Date(item.date);
          const dateLabel = Number.isNaN(date.getTime())
            ? null
            : format(date, 'MMM d');

          return (
            <div
              key={`${item.mealType}-${item.date}-${index}`}
              className="rounded-lg border border-emerald-400/25 bg-background/65 p-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.mealLabel}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-emerald-400">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {item.mealLabel}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{mealTypeLabelMap[item.mealType]}</span>
                    <span>•</span>
                    <span>{item.totalCalories} cal</span>
                    <span>•</span>
                    <span>
                      P{item.totalProtein} C{item.totalCarbs} F{item.totalFat}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
                    </span>
                    {dateLabel ? (
                      <>
                        <span>•</span>
                        <span>{dateLabel}</span>
                      </>
                    ) : null}
                  </div>
                  {item.names.length > 0 ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.names.join(' • ')}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StackAttachmentCards({
  attachments,
}: {
  attachments: ElevateStackAttachment[];
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 rounded-xl border border-teal-400/35 bg-teal-500/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-400">
          Supplement stack
        </p>
        <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[11px] font-medium text-teal-400">
          {attachments.length} stack{attachments.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2">
        {attachments.map((item) => (
          <div
            key={`${item.stackId}-${item.name}`}
            className="rounded-lg border border-teal-400/25 bg-background/65 p-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-teal-400">
                <Pill className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {item.itemCount} supplement
                    {item.itemCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
            {item.items.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-teal-400/15 pt-2">
                {item.items.map((s, idx) => (
                  <div
                    key={`${s.name}-${idx}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {s.name}
                    </span>
                    <span className="shrink-0 font-medium text-teal-400">
                      {s.dosage}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
