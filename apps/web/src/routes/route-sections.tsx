import type { ComponentType } from 'react';
import { Navigate, Route } from 'react-router';
import { ProtectedRoute } from '@/components/common/protected-route';
import { CoachRegisteredRoute } from '@/components/common/coach-registered-route';
import { PublicOnlyRoute } from '@/components/common/public-only-route';
import {
  AboutPage,
  AccessibilityPage,
  AdminAmbassadors,
  AdminAuditLogs,
  AdminCompliance,
  AdminBlogs,
  AdminCategories,
  AdminCoaches,
  AdminDashboard,
  AdminExercises,
  AdminFaqs,
  AdminFoods,
  AdminRecipeCategories,
  AdminRecipes,
  AdminReleaseNotes,
  AdminGyms,
  AdminLegal,
  AdminMarketingSubscribers,
  AdminMarketingNewsletters,
  AdminChallenges,
  AdminPayments,
  AdminPerformanceMetrics,
  AdminPrivateMode,
  AdminReports,
  AdminRoles,
  AdminShopBrands,
  AdminShopCatalog,
  AdminShopCatalogNew,
  AdminShopCategories,
  AdminShopCustomers,
  AdminShopDiscounts,
  AdminShopFulfillment,
  AdminShopHero,
  AdminShopInventory,
  AdminShopOrders,
  AdminShopReferrals,
  AdminShopSettings,
  AdminShopStacks,
  AdminSpotlight,
  AdminStatus,
  AdminTags,
  AdminTeams,
  AdminUserPermissions,
  AdminUsers,
  AffiliatePage,
  AiLegalPage,
  AmbassadorApplyPage,
  AmbassadorsPage,
  ApplyCoachPage,
  BlogPage,
  BlogViewPage,
  BodyFatCalculator,
  BmiCalculator,
  BmrCalculator,
  BookingConfirmationPage,
  BookingPage,
  CalorieGoalCalculator,
  CalendarPage,
  CalculatorsIndexPage,
  CareersPage,
  ClimbPage,
  CoachContractsPage,
  CoachPackagesPage,
  CoachProfilePage,
  CoachWorkoutPlansPage,
  CoachesClientsPage,
  CoachesDashboardPage,
  CoachesPage,
  ContactPage,
  DashboardPage,
  DotsCalculator,
  ElevatePage,
  ElevateStudioPage,
  ExercisesPage,
  FAQPage,
  FeaturesPage,
  FfmiCalculator,
  FoodDiaryPage,
  ForgotPasswordPage,
  GitHubStatusPage,
  GoalWizard,
  GoalsPage,
  HabitsPage,
  HipaaPage,
  WeeklyReportPage,
  AchievementsPage,
  ChallengesPage,
  ChallengeDetailPage,
  CoachAvailabilityPage,
  CoachSubscriptionPage,
  HomePage,
  HrZonesCalculator,
  InolCalculator,
  InjectionTrackerPage,
  IntegrationsPage,
  LeanMassCalculator,
  LoginPage,
  MacrosCalculator,
  MaxHrCalculator,
  MealPlansPage,
  GroceryListsPage,
  MessagingPage,
  MetCalculator,
  MyCoachingPage,
  NotFoundPage,
  NotesPage,
  NotificationsPage,
  OneRmCalculator,
  PaceCalculator,
  PersonalRecordsPage,
  PressPage,
  PricingPage,
  PrivacyPage,
  ProteinCalculator,
  PublicProfilePage,
  RecipeDetailPage,
  RecipesPage,
  RecipesWizardPage,
  ReconsentPage,
  RegisterPage,
  RegistrationCodeGatePage,
  ReleaseNotesPage,
  ResetPasswordPage,
  RoadmapPage,
  SecurityPage,
  ShopBundlePage,
  ShopCheckoutConfirmationPage,
  ShopCheckoutPage,
  ShopCheckoutReviewPage,
  ShopOrdersPage,
  ShopPage,
  ShopProductPage,
  SpotlightPage,
  SpotlightSubmitPage,
  StackPage,
  StatusPage,
  TdeeCalculator,
  TeamPage,
  TermsPage,
  UnauthorizedPage,
  UnsubscribePage,
  VerificationPage,
  Vo2MaxCalculator,
  VolumeLoadCalculator,
  WaistHipCalculator,
  WaterCalculator,
  WaterPage,
  WeightGoalCalculator,
  WeightPage,
  StepsPage,
  SleepPage,
  HeartRatePage,
  MeasurementsPage,
  WilksCalculator,
  WorkoutPlansPage,
  WorkoutsPage,
  CreateProfilePage,
} from '@/routes/lazy-pages';

interface LayoutProps {
  CalculatorsLayout: ComponentType;
  PublicElevateProfileLayout: ComponentType;
}

export function CalculatorsRoutes({
  CalculatorsLayout,
}: Pick<LayoutProps, 'CalculatorsLayout'>) {
  return (
    <Route element={<CalculatorsLayout />}>
      <Route path="/calculators" element={<CalculatorsIndexPage />} />
      <Route path="/calculators/bmi" element={<BmiCalculator />} />
      <Route path="/calculators/body-fat" element={<BodyFatCalculator />} />
      <Route path="/calculators/ffmi" element={<FfmiCalculator />} />
      <Route path="/calculators/bmr" element={<BmrCalculator />} />
      <Route path="/calculators/tdee" element={<TdeeCalculator />} />
      <Route
        path="/calculators/calorie-goal"
        element={<CalorieGoalCalculator />}
      />
      <Route path="/calculators/one-rm" element={<OneRmCalculator />} />
      <Route path="/calculators/wilks" element={<WilksCalculator />} />
      <Route path="/calculators/dots" element={<DotsCalculator />} />
      <Route path="/calculators/macros" element={<MacrosCalculator />} />
      <Route path="/calculators/max-hr" element={<MaxHrCalculator />} />
      <Route path="/calculators/hr-zones" element={<HrZonesCalculator />} />
      <Route path="/calculators/protein" element={<ProteinCalculator />} />
      <Route path="/calculators/water" element={<WaterCalculator />} />
      <Route path="/calculators/lean-mass" element={<LeanMassCalculator />} />
      <Route path="/calculators/waist-hip" element={<WaistHipCalculator />} />
      <Route
        path="/calculators/volume-load"
        element={<VolumeLoadCalculator />}
      />
      <Route path="/calculators/inol" element={<InolCalculator />} />
      <Route path="/calculators/vo2-max" element={<Vo2MaxCalculator />} />
      <Route path="/calculators/pace" element={<PaceCalculator />} />
      <Route path="/calculators/met" element={<MetCalculator />} />
      <Route
        path="/calculators/weight-goal"
        element={<WeightGoalCalculator />}
      />
    </Route>
  );
}

export function ShopRoutes() {
  return (
    <>
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/shop/product/:slug" element={<ShopProductPage />} />
      <Route path="/shop/bundle/:slug" element={<ShopBundlePage />} />
      <Route path="/shop/checkout" element={<ShopCheckoutPage />} />
      <Route
        path="/shop/checkout/review"
        element={<ShopCheckoutReviewPage />}
      />
      <Route
        path="/shop/checkout/confirmation"
        element={<ShopCheckoutConfirmationPage />}
      />
    </>
  );
}

export function PublicProfileRoutes({
  PublicElevateProfileLayout,
}: Pick<LayoutProps, 'PublicElevateProfileLayout'>) {
  return (
    <Route element={<PublicElevateProfileLayout />}>
      <Route path="/elevate/:displayName" element={<PublicProfilePage />} />
      <Route path="/profile/:displayName" element={<PublicProfilePage />} />
    </Route>
  );
}

export function ProtectedAppRoutes() {
  return (
    <>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/elevate" element={<ElevatePage />} />
      <Route path="/elevate/studio" element={<ElevateStudioPage />} />
      <Route path="/climb" element={<ClimbPage />} />
      <Route
        path="/partners"
        element={<Navigate to="/elevate/studio?section=partners" replace />}
      />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/integrations" element={<IntegrationsPage />} />
      <Route path="/stack" element={<StackPage />} />
      <Route path="/weight" element={<WeightPage />} />
      <Route path="/measurements" element={<MeasurementsPage />} />
      <Route path="/water" element={<WaterPage />} />
      <Route path="/steps" element={<StepsPage />} />
      <Route path="/sleep" element={<SleepPage />} />
      <Route path="/heart-rate" element={<HeartRatePage />} />
      <Route path="/injections" element={<InjectionTrackerPage />} />
      <Route path="/food-diary" element={<FoodDiaryPage />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/recipes/wizard" element={<RecipesWizardPage />} />
      <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      <Route path="/meal-plans" element={<MealPlansPage />} />
      <Route path="/grocery-lists" element={<GroceryListsPage />} />
      <Route path="/workouts" element={<WorkoutsPage />} />
      <Route path="/shop/orders" element={<ShopOrdersPage />} />
      <Route path="/workout-plans" element={<WorkoutPlansPage />} />
      <Route path="/personal-records" element={<PersonalRecordsPage />} />
      <Route path="/exercises" element={<ExercisesPage />} />
      <Route path="/goals" element={<GoalsPage />} />
      <Route path="/habits" element={<HabitsPage />} />
      <Route path="/weekly-report" element={<WeeklyReportPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="/challenges" element={<ChallengesPage />} />
      <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
      <Route path="/health/goals/wizard" element={<GoalWizard />} />
      <Route
        path="/profile"
        element={<Navigate to="/elevate/studio?section=profile" replace />}
      />
      <Route path="/profile/create" element={<CreateProfilePage />} />
      <Route
        path="/settings"
        element={<Navigate to="/elevate/studio?section=settings" replace />}
      />
      <Route path="/my-coaching" element={<MyCoachingPage />} />

      <Route element={<ProtectedRoute requiredPermission="messaging:read" />}>
        <Route path="/messages" element={<MessagingPage />} />
      </Route>

      <Route path="/notifications" element={<NotificationsPage />} />

      <Route element={<ProtectedRoute requiredPermission="calendar:read" />}>
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>

      <Route element={<ProtectedRoute requiredPermission="coaching:read" />}>
        <Route element={<CoachRegisteredRoute />}>
          <Route path="/coaches/dashboard" element={<CoachesDashboardPage />} />
          <Route path="/coaches/clients" element={<CoachesClientsPage />} />
          <Route path="/coaches/contracts" element={<CoachContractsPage />} />
          <Route
            element={
              <ProtectedRoute
                requiredPermission={['coaching:read', 'coaching:update']}
              />
            }
          >
            <Route path="/coaches/packages" element={<CoachPackagesPage />} />
          </Route>
          <Route
            path="/coaches/workout-plans"
            element={<CoachWorkoutPlansPage />}
          />
          <Route
            path="/coaches/availability"
            element={<CoachAvailabilityPage />}
          />
          <Route
            path="/coaches/subscription"
            element={<CoachSubscriptionPage />}
          />
        </Route>
      </Route>

      <Route path="/reconsent" element={<ReconsentPage />} />
    </>
  );
}

export function AdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route element={<ProtectedRoute requiredPermission="admin:read" />}>
        <Route
          path="/admin/users/:id/permissions"
          element={<AdminUserPermissions />}
        />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="admin:read" />}>
        <Route path="/admin/roles" element={<AdminRoles />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="admin:update" />}>
        <Route path="/admin/private-mode" element={<AdminPrivateMode />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="incident:create" />}>
        <Route path="/admin/status" element={<AdminStatus />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="blog:read" />}>
        <Route path="/admin/blogs" element={<AdminBlogs />} />
        <Route path="/admin/blogs/new" element={<AdminBlogs />} />
        <Route path="/admin/blogs/:slug/edit" element={<AdminBlogs />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/tags" element={<AdminTags />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="spotlight:read" />}>
        <Route path="/admin/spotlight" element={<AdminSpotlight />} />
      </Route>
      <Route
        element={<ProtectedRoute requiredPermission="release-note:read" />}
      >
        <Route path="/admin/release-notes" element={<AdminReleaseNotes />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="gym:create" />}>
        <Route path="/admin/gyms" element={<AdminGyms />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="exercise:read" />}>
        <Route path="/admin/exercises" element={<AdminExercises />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="nutrition:read" />}>
        <Route path="/admin/foods" element={<AdminFoods />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="recipe:read" />}>
        <Route
          path="/admin/recipe-categories"
          element={<AdminRecipeCategories />}
        />
        <Route path="/admin/recipes" element={<AdminRecipes />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="team:read" />}>
        <Route path="/admin/teams" element={<AdminTeams />} />
        <Route path="/admin/ambassadors" element={<AdminAmbassadors />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="admin:read" />}>
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="marketing:read" />}>
        <Route
          path="/admin/marketing/subscribers"
          element={<AdminMarketingSubscribers />}
        />
        <Route
          path="/admin/marketing/newsletters"
          element={<AdminMarketingNewsletters />}
        />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="coach:read" />}>
        <Route path="/admin/coaches" element={<AdminCoaches />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="payment:read" />}>
        <Route path="/admin/payments" element={<AdminPayments />} />
      </Route>
      <Route
        element={<ProtectedRoute requiredPermission="shop:catalog-read" />}
      >
        <Route
          path="/admin/shop/categories"
          element={<AdminShopCategories />}
        />
        <Route path="/admin/shop/brands" element={<AdminShopBrands />} />
        <Route path="/admin/shop/catalog" element={<AdminShopCatalog />} />
        <Route
          path="/admin/shop/catalog/new"
          element={<AdminShopCatalogNew />}
        />
        <Route path="/admin/shop/stacks" element={<AdminShopStacks />} />
        <Route path="/admin/shop/hero" element={<AdminShopHero />} />
        <Route path="/admin/shop/settings" element={<AdminShopSettings />} />
      </Route>
      <Route
        element={<ProtectedRoute requiredPermission="shop:inventory-read" />}
      >
        <Route path="/admin/shop/inventory" element={<AdminShopInventory />} />
      </Route>
      <Route
        element={<ProtectedRoute requiredPermission="shop:discount-read" />}
      >
        <Route
          path="/admin/shop/discount-codes"
          element={<AdminShopDiscounts />}
        />
      </Route>
      <Route
        element={<ProtectedRoute requiredPermission="shop:referral-read" />}
      >
        <Route path="/admin/shop/referrals" element={<AdminShopReferrals />} />
      </Route>
      <Route
        element={
          <ProtectedRoute
            requiredPermission={['payment:read', 'shop:order-read']}
          />
        }
      >
        <Route path="/admin/shop/orders" element={<AdminShopOrders />} />
        <Route
          path="/admin/shop/fulfillment"
          element={<AdminShopFulfillment />}
        />
      </Route>
      <Route
        element={
          <ProtectedRoute
            requiredPermission={['payment:read', 'shop:customer-read']}
          />
        }
      >
        <Route path="/admin/shop/customers" element={<AdminShopCustomers />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="legal:read" />}>
        <Route path="/admin/compliance" element={<AdminCompliance />} />
        <Route path="/admin/legal" element={<AdminLegal />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="faq:read" />}>
        <Route path="/admin/faqs" element={<AdminFaqs />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="elevate:moderate" />}>
        <Route path="/admin/reports" element={<AdminReports />} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="challenge:read" />}>
        <Route path="/admin/challenges" element={<AdminChallenges />} />
      </Route>
      <Route
        element={
          <ProtectedRoute requiredPermission="performance-metric:read" />
        }
      >
        <Route
          path="/admin/performance-metrics"
          element={<AdminPerformanceMetrics />}
        />
      </Route>
    </>
  );
}

export function PublicRoutes() {
  return (
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/coaches" element={<CoachesPage />} />
      <Route
        path="/coaches/apply"
        element={
          <ProtectedRoute>
            <ApplyCoachPage />
          </ProtectedRoute>
        }
      />
      <Route path="/coaches/:slug" element={<CoachProfilePage />} />
      <Route path="/booking/:slug" element={<BookingPage />} />
      <Route
        path="/booking/:slug/confirmation"
        element={<BookingConfirmationPage />}
      />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="/ambassadors" element={<AmbassadorsPage />} />
      <Route
        path="/ambassadors/apply"
        element={
          <ProtectedRoute>
            <AmbassadorApplyPage />
          </ProtectedRoute>
        }
      />
      <Route path="/spotlight" element={<SpotlightPage />} />
      <Route
        path="/spotlight/submit"
        element={
          <ProtectedRoute>
            <SpotlightSubmitPage />
          </ProtectedRoute>
        }
      />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogViewPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/release-notes" element={<ReleaseNotesPage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/github-status" element={<GitHubStatusPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/hipaa" element={<HipaaPage />} />
      <Route path="/ai-legal" element={<AiLegalPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/press" element={<PressPage />} />
      <Route path="/accessibility" element={<AccessibilityPage />} />
      <Route path="/roadmap" element={<RoadmapPage />} />
      <Route path="/affiliate" element={<AffiliatePage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationCodeGatePage />} />
        <Route path="/register/create" element={<RegisterPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}
