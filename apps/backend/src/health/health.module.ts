import { Module } from '@nestjs/common';
import { CalculatorsModule } from './calculators/calculators.module';
import { ExercisesModule } from './exercises/exercises.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { NotesModule } from './notes/notes.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { StacksModule } from './stacks/stacks.module';
import { WeightModule } from './weight/weight.module';
import { WaterModule } from './water/water.module';
import { InjectionsModule } from './injections/injections.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { WorkoutPlansModule } from './workout-plans/workout-plans.module';
import { LifestyleModule } from './lifestyle/lifestyle.module';
import { RecipesModule } from './recipes/recipes.module';
import { RecipeCategoriesModule } from './recipe-categories/recipe-categories.module';
import { HabitsModule } from './habits/habits.module';
import { WeeklyReportModule } from './weekly-report/weekly-report.module';
import { MealPlansModule } from './meal-plans/meal-plans.module';
import { GroceryListsModule } from './grocery-lists/grocery-lists.module';
import { HealthDataModule } from './health-data/health-data.module';

@Module({
  imports: [
    CalculatorsModule,
    HabitsModule,
    ExercisesModule,
    HealthDataModule,
    MeasurementsModule,
    NotesModule,
    NutritionModule,
    StacksModule,
    WeightModule,
    WaterModule,
    InjectionsModule,
    WorkoutsModule,
    WorkoutPlansModule,
    LifestyleModule,
    RecipesModule,
    RecipeCategoriesModule,
    WeeklyReportModule,
    MealPlansModule,
    GroceryListsModule,
  ],
  exports: [
    CalculatorsModule,
    HabitsModule,
    ExercisesModule,
    HealthDataModule,
    MeasurementsModule,
    NotesModule,
    NutritionModule,
    StacksModule,
    WeightModule,
    WaterModule,
    InjectionsModule,
    WorkoutsModule,
    WorkoutPlansModule,
    LifestyleModule,
    RecipesModule,
    RecipeCategoriesModule,
    WeeklyReportModule,
    MealPlansModule,
    GroceryListsModule,
  ],
})
export class HealthModule {}
