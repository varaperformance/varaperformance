// Exercises
export {
  useExercises,
  useExercise,
  type ExerciseResponse,
  type ExerciseListData,
  type ExerciseFilters,
  type ExerciseCategory,
  type MuscleGroup,
  type Equipment,
  type ExerciseDifficulty,
} from './hooks/use-exercises';

// Workout sessions
export {
  useWorkoutSessions,
  useWorkoutSession,
  useWorkoutStats,
  useFrequentExercises,
  useActiveSession,
  useStartSession,
  useEndSession,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useAddWorkout,
  useRemoveWorkout,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useUpdateWorkout,
  type WorkoutSessionResponse,
  type WorkoutSessionListData,
  type WorkoutStats,
  type CreateWorkoutSession,
  type UpdateWorkoutSession,
  type CreateWorkout,
  type WorkoutResponse,
  type WorkoutSet,
  type CreateSessionResponse,
  type NewPR,
  type StartSession,
  type EndSession,
  type ActiveSession,
  type UpdateWorkoutInSession,
  type DailyActivity,
  type ActivityData,
  type MuscleBreakdownItem,
  type MuscleBreakdownData,
  type RecentWorkoutSummary,
  type DateRangeQuery,
  type WorkoutMotivationQuote,
  useActivityData,
  useMuscleBreakdown,
  useRecentWorkouts,
  useWorkoutMotivationQuote,
  useWorkoutGoal,
  useWorkoutGoalWithDefaults,
  useUpdateWorkoutGoal,
} from './hooks/use-workout-sessions';

// Workout plans
export {
  useWorkoutPlans,
  useMyWorkoutPlans,
  useWorkoutPlan,
  useMyAssignments,
  useAssignment,
  useCoachWorkoutPlans,
  useCoachAssignments,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  useCopyPlan,
  useFollowPlan,
  useUnfollowPlan,
  useAddDay,
  useUpdateDay,
  useDeleteDay,
  useAddExercise,
  useUpdateExercise,
  useDeleteExercise,
  useAddSet as useAddPlanSet,
  useUpdateSet as useUpdatePlanSet,
  useDeleteSet as useDeletePlanSet,
  useUpdateAssignmentStatus,
  useStartPlanWorkout,
  useCompletePlanDay,
  useCreateCoachPlan,
  useAssignPlan,
  DAY_LABELS,
  DAYS_ORDERED,
  DIFFICULTY_LABELS,
  VISIBILITY_LABELS,
  type WorkoutPlanResponse,
  type WorkoutPlanListData,
  type WorkoutPlanListItem,
  type WorkoutPlanAssignmentResponse,
  type WorkoutPlanAssignmentListData,
  type CreateWorkoutPlan,
  type UpdateWorkoutPlan,
  type CreateWorkoutPlanDay,
  type UpdateWorkoutPlanDay,
  type CreateWorkoutPlanExercise,
  type UpdateWorkoutPlanExercise,
  type AssignWorkoutPlan,
  type DayOfWeek,
} from './hooks/use-workout-plans';

// Weight
export {
  type WeightLogResponse,
  type WeightLogsListData,
  type WeightGoalResponse,
  type WeightLogsQuery,
  useWeightLogs,
  useWeightLog,
  useCreateWeightLog,
  useDeleteWeightLog,
  useWeightGoal,
  useUpdateWeightGoal,
} from './hooks/use-weight';

// Water
export {
  type WaterLogResponse,
  type WaterGoalResponse,
  type DailyWaterSummary,
  type WaterHistoryDay,
  useDailyWaterSummary,
  useWaterHistory,
  useWaterGoal,
  useLogWater,
  useUpdateWaterGoal,
  useDeleteWaterLog,
} from './hooks/use-water';

// Nutrition
export {
  type FoodListItem,
  type FoodResponse,
  type FoodLogResponse,
  type FoodSearchResult,
  type DailyNutritionSummary,
  type NutritionGoalResponse,
  type FavoriteFoodResponse,
  type RecentFoodResponse,
  type MealType,
  useSearchFoods,
  useInfiniteSearchFoods,
  useSearchByBarcode,
  useFood,
  type NutritionHistoryDay,
  useDailyNutritionSummary,
  useNutritionHistory,
  useNutritionGoal,
  useFavorites,
  useRecentFoods,
  useCreateFood,
  useUpdateFood,
  useDeleteFood,
  useLogFood,
  useUpdateFoodLog,
  useDeleteFoodLog,
  useUpdateNutritionGoal,
  useAddFavorite,
  useRemoveFavorite,
} from './hooks/use-nutrition';

// Meal Plans
export {
  type MealPlanResponse,
  type MealPlanListItem,
  type MealPlanItemResponse,
  useMealPlans,
  useActiveMealPlan,
  useMealPlan,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useAddMealPlanItem,
  useUpdateMealPlanItem,
  useRemoveMealPlanItem,
  useCopyMealPlanDay,
  useQuickLogMealPlan,
  useGenerateFromMacros,
} from './hooks/use-meal-plans';

// Grocery Lists
export {
  type GroceryListDetailResponse,
  type GroceryListSummary,
  type GroceryListItemResponse,
  useGroceryLists,
  useGroceryList,
  useCreateGroceryList,
  useUpdateGroceryList,
  useDeleteGroceryList,
  useAddGroceryItem,
  useUpdateGroceryItem,
  useRemoveGroceryItem,
  useBatchCheckItems,
  useSeedFromMealPlan,
  useSeedFromRecipe,
} from './hooks/use-grocery-lists';

// Recipes
export {
  type RecipeCategoryResponse,
  type RecipeResponse,
  type RecipeSearchResult,
  useSearchRecipes,
  useRecipe,
  useRecipeCategories,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useSaveRecipe,
  useUnsaveRecipe,
  useLogRecipeToDiary,
  useUploadRecipeImage,
} from './hooks/use-recipes';

// Habits
export {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useToggleHabit,
  useHabitHeatmap,
} from './hooks/use-habits';

// Injections
export {
  useInjectionProtocols,
  useCreateInjectionProtocol,
  useUpdateInjectionProtocol,
  useDeleteInjectionProtocol,
  useInjectionLogs,
  useCreateInjectionLog,
  useDeleteInjectionLog,
} from './hooks/use-injections';

// Personal records
export {
  type PersonalRecordResponse,
  type PersonalRecordListData,
  type CreatePersonalRecord,
  type UpdatePersonalRecord,
  type PRType,
  prKeys,
  usePersonalRecords,
  useExercisePRs,
  usePersonalRecord,
  useCreatePersonalRecord,
  useUpdatePersonalRecord,
  useDeletePersonalRecord,
  PR_TYPE_LABELS,
  formatPRValue,
} from './hooks/use-personal-records';

// Stacks
export {
  type StackResponse,
  type StackListItem,
  type StackItemResponse,
  type StackTip,
  type DailyLogResponse,
  type TimeSlot,
  useStacks,
  useActiveStack,
  useStack,
  useCreateStack,
  useUpdateStack,
  useDeleteStack,
  useActivateStack,
  useAddStackItem,
  useUpdateStackItem,
  useDeleteStackItem,
  useBatchUpdateItems,
  useLogIntake,
  useStackLogs,
  useResetLogs,
} from './hooks/use-stacks';

// Weekly report
export {
  type WeeklyReportData,
  useWeeklyReport,
  useClientWeeklyReport,
} from './hooks/use-weekly-report';

// Body measurements
export {
  type BodyMeasurementResponse,
  type BodyMeasurementsListData,
  type MeasurementsQuery,
  useMeasurements,
  useMeasurement,
  useCreateMeasurement,
  useDeleteMeasurement,
} from './hooks/use-measurements';

// Notes
export {
  type NoteResponse,
  type NotesListData,
  useNotes,
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from './hooks/use-notes';

// Lifestyle goals
export {
  useLifestyleGoal,
  useLifestyleGoalWithDefaults,
  useLifestyleInsights,
  useUpdateLifestyleGoal,
} from './hooks/use-lifestyle-goal';

// Gyms
export { useGyms, useGym, useGymLocations } from './hooks/use-gyms';

// Health data (steps, sleep, heart rate — mobile sync)
export {
  healthDataKeys,
  useStepsToday,
  useStepsTrend,
  useLogSteps,
  useDeleteStepLog,
  useSleepTrend,
  useLogSleep,
  useHeartRate,
  useHeartRateDailySummary,
  useLogHeartRate,
  useSyncHealthData,
  useSyncStatus,
  useSyncPreferences,
  useUpdateSyncPreferences,
} from './hooks/use-health-data';
