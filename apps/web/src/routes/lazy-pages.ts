import { lazy } from 'react';

export const HomePage = lazy(() => import('@/features/marketing/pages/home'));
export const ElevatePage = lazy(() => import('@/features/social/pages/social'));
export const ElevateStudioPage = lazy(
  () => import('@/features/social/pages/social/studio'),
);
export const ClimbPage = lazy(
  () => import('@/features/social/pages/social/climb'),
);
export const FeaturesPage = lazy(
  () => import('@/features/marketing/pages/features'),
);
export const ExercisesPage = lazy(
  () => import('@/features/health/pages/health/exercises'),
);
export const ShopPage = lazy(() => import('@/features/commerce/pages/shop'));
export const ShopProductPage = lazy(
  () => import('@/features/commerce/pages/shop-product'),
);
export const ShopBundlePage = lazy(
  () => import('@/features/commerce/pages/shop-bundle'),
);
export const ShopCheckoutPage = lazy(
  () => import('@/features/commerce/pages/shop-checkout'),
);
export const ShopCheckoutReviewPage = lazy(
  () => import('@/features/commerce/pages/shop-checkout-review'),
);
export const ShopCheckoutConfirmationPage = lazy(
  () => import('@/features/commerce/pages/shop-checkout-confirmation'),
);
export const ShopOrdersPage = lazy(
  () => import('@/features/commerce/pages/shop-orders'),
);
export const StackPage = lazy(
  () => import('@/features/health/pages/health/stacks/stack'),
);
export const HabitsPage = lazy(
  () => import('@/features/health/pages/health/habits/habits'),
);
export const WeeklyReportPage = lazy(
  () => import('@/features/health/pages/health/weekly-report/weekly-report'),
);
export const AchievementsPage = lazy(
  () => import('@/features/achievements/pages/achievements'),
);
export const ChallengesPage = lazy(
  () => import('@/features/challenge/pages/challenges'),
);
export const ChallengeDetailPage = lazy(
  () => import('@/features/challenge/pages/challenge-detail'),
);
export const CoachAvailabilityPage = lazy(
  () => import('@/features/coaching/pages/coaching/availability/availability'),
);
export const CoachSubscriptionPage = lazy(
  () => import('@/features/coaching/pages/coaches/subscription'),
);
export const WeightPage = lazy(
  () => import('@/features/health/pages/health/weight/weight'),
);
export const MeasurementsPage = lazy(
  () => import('@/features/health/pages/health/measurements/measurements'),
);
export const WaterPage = lazy(
  () => import('@/features/health/pages/health/water/water'),
);
export const StepsPage = lazy(
  () => import('@/features/health/pages/health/steps/steps'),
);
export const SleepPage = lazy(
  () => import('@/features/health/pages/health/sleep/sleep'),
);
export const HeartRatePage = lazy(
  () => import('@/features/health/pages/health/heart-rate/heart-rate'),
);
export const FoodDiaryPage = lazy(
  () => import('@/features/health/pages/health/nutrition/food-diary'),
);
export const RecipesPage = lazy(
  () => import('@/features/health/pages/health/nutrition/recipes'),
);
export const RecipesWizardPage = lazy(
  () => import('@/features/health/pages/health/nutrition/recipes-wizard'),
);
export const RecipeDetailPage = lazy(
  () => import('@/features/health/pages/health/nutrition/recipe-detail'),
);
export const MealPlansPage = lazy(
  () => import('@/features/health/pages/health/nutrition/meal-plans'),
);
export const GroceryListsPage = lazy(
  () => import('@/features/health/pages/health/nutrition/grocery-lists'),
);
export const WorkoutsPage = lazy(
  () => import('@/features/health/pages/health/workouts/workouts'),
);
export const PersonalRecordsPage = lazy(
  () =>
    import('@/features/health/pages/health/personal-records/personal-records'),
);
export const InjectionTrackerPage = lazy(
  () => import('@/features/health/pages/health/injections'),
);
export const AboutPage = lazy(() => import('@/features/marketing/pages/about'));
export const TeamPage = lazy(() => import('@/features/marketing/pages/team'));
export const BlogPage = lazy(() => import('@/features/blog/pages/blog'));
export const BlogViewPage = lazy(
  () => import('@/features/blog/pages/blog/view'),
);
export const CareersPage = lazy(
  () => import('@/features/marketing/pages/careers'),
);
export const TermsPage = lazy(() => import('@/features/legal/pages/terms'));
export const PrivacyPage = lazy(() => import('@/features/legal/pages/privacy'));
export const ReleaseNotesPage = lazy(
  () => import('@/features/release-notes/pages/release-notes'),
);
export const IntegrationsPage = lazy(
  () => import('@/features/integrations/pages/integrations'),
);
export const StatusPage = lazy(() => import('@/features/status/pages/status'));
export const GitHubStatusPage = lazy(
  () => import('@/features/status/pages/github-status'),
);
export const PricingPage = lazy(
  () => import('@/features/marketing/pages/pricing'),
);
export const SecurityPage = lazy(
  () => import('@/features/legal/pages/security'),
);
export const HipaaPage = lazy(() => import('@/features/legal/pages/hipaa'));
export const AiLegalPage = lazy(
  () => import('@/features/legal/pages/ai-legal'),
);
export const FAQPage = lazy(() => import('@/features/faq/pages/faq'));
export const ContactPage = lazy(
  () => import('@/features/marketing/pages/contact'),
);
export const PressPage = lazy(() => import('@/features/marketing/pages/press'));
export const AccessibilityPage = lazy(
  () => import('@/features/legal/pages/accessibility'),
);
export const RoadmapPage = lazy(
  () => import('@/features/marketing/pages/roadmap'),
);
export const AffiliatePage = lazy(
  () => import('@/features/marketing/pages/affiliate'),
);
export const LoginPage = lazy(
  () => import('@/features/auth/pages/authentication/login'),
);
export const RegisterPage = lazy(
  () => import('@/features/auth/pages/authentication/register'),
);
export const RegistrationCodeGatePage = lazy(
  () => import('@/features/auth/pages/authentication/registration-code'),
);
export const VerificationPage = lazy(
  () => import('@/features/auth/pages/authentication/verification'),
);
export const ReconsentPage = lazy(
  () => import('@/features/auth/pages/authentication/reconsent'),
);
export const ForgotPasswordPage = lazy(
  () => import('@/features/auth/pages/authentication/forgot-password'),
);
export const ResetPasswordPage = lazy(
  () => import('@/features/auth/pages/authentication/reset-password'),
);
export const CoachesPage = lazy(
  () => import('@/features/coaching/pages/coaches'),
);
export const ApplyCoachPage = lazy(
  () => import('@/features/coaching/pages/coaches/apply'),
);
export const CoachProfilePage = lazy(
  () => import('@/features/coaching/pages/coaches/profile'),
);
export const CoachesDashboardPage = lazy(
  () => import('@/features/coaching/pages/coaches/dashboard'),
);
export const CoachesClientsPage = lazy(
  () => import('@/features/coaching/pages/coaches/clients'),
);
export const CoachContractsPage = lazy(
  () => import('@/features/coaching/pages/coaches/contracts'),
);
export const CoachPackagesPage = lazy(
  () => import('@/features/coaching/pages/coaches/packages'),
);
export const MyCoachingPage = lazy(
  () => import('@/features/coaching/pages/my-coaching'),
);
export const BookingPage = lazy(
  () => import('@/features/coaching/pages/booking'),
);
export const BookingConfirmationPage = lazy(
  () => import('@/features/coaching/pages/booking/confirmation'),
);
export const SpotlightPage = lazy(
  () => import('@/features/spotlight/pages/spotlight'),
);
export const SpotlightSubmitPage = lazy(
  () => import('@/features/spotlight/pages/spotlight-submit'),
);
export const CreateProfilePage = lazy(
  () => import('@/features/profile/pages/profile/create_profile'),
);
export const PublicProfilePage = lazy(
  () => import('@/features/profile/pages/public-profile'),
);
export const AdminDashboard = lazy(() => import('@/admin/index'));
export const AdminUsers = lazy(() => import('@/admin/users'));
export const AdminUserPermissions = lazy(
  () => import('@/admin/user-permissions'),
);
export const AdminRoles = lazy(() => import('@/admin/roles'));
export const AdminStatus = lazy(() => import('@/admin/status'));
export const AdminBlogs = lazy(() => import('@/admin/blogs'));
export const AdminGyms = lazy(() => import('@/admin/gyms'));
export const AdminCategories = lazy(() => import('@/admin/categories'));
export const AdminTags = lazy(() => import('@/admin/tags'));
export const AdminExercises = lazy(() => import('@/admin/exercises'));
export const AdminFoods = lazy(() => import('@/admin/foods'));
export const AdminRecipeCategories = lazy(
  () => import('@/admin/recipe-categories'),
);
export const AdminRecipes = lazy(() => import('@/admin/recipes'));
export const AdminCoaches = lazy(() => import('@/admin/coaches'));
export const AdminPayments = lazy(() => import('@/admin/payments'));
export const AdminLegal = lazy(() => import('@/admin/legal'));
export const AdminFaqs = lazy(() => import('@/admin/faqs'));
export const AdminReports = lazy(() => import('@/admin/reports'));
export const AdminSpotlight = lazy(() => import('@/admin/spotlight'));
export const AdminPrivateMode = lazy(() => import('@/admin/private-mode'));
export const AdminTeams = lazy(() => import('@/admin/teams'));
export const AdminAmbassadors = lazy(() => import('@/admin/ambassadors'));
export const AdminAuditLogs = lazy(() => import('@/admin/audit-logs'));
export const AdminCompliance = lazy(() => import('@/admin/compliance'));
export const AdminShopCategories = lazy(
  () => import('@/admin/shop-categories'),
);
export const AdminShopBrands = lazy(() => import('@/admin/shop-brands'));
export const AdminShopCatalog = lazy(() => import('@/admin/shop-catalog'));
export const AdminShopCatalogNew = lazy(
  () => import('@/admin/shop-catalog-new'),
);
export const AdminShopStacks = lazy(() => import('@/admin/shop-stacks'));
export const AdminShopHero = lazy(() => import('@/admin/shop-hero'));
export const AdminShopSettings = lazy(() => import('@/admin/shop-settings'));
export const AdminShopInventory = lazy(() => import('@/admin/shop-inventory'));
export const AdminShopDiscounts = lazy(() => import('@/admin/shop-discounts'));
export const AdminShopReferrals = lazy(() => import('@/admin/shop-referrals'));
export const AdminShopOrders = lazy(() => import('@/admin/shop-orders'));
export const AdminShopFulfillment = lazy(
  () => import('@/admin/shop-fulfillment'),
);
export const AdminShopCustomers = lazy(() => import('@/admin/shop-customers'));
export const AdminReleaseNotes = lazy(() => import('@/admin/release-notes'));
export const AdminMarketingSubscribers = lazy(
  () => import('@/admin/marketing-subscribers'),
);
export const AdminMarketingNewsletters = lazy(
  () => import('@/admin/marketing-newsletters'),
);
export const AdminChallenges = lazy(() => import('@/admin/challenges'));
export const AdminPerformanceMetrics = lazy(
  () => import('@/features/performance-metrics/pages/performance-metrics'),
);
export const AmbassadorApplyPage = lazy(
  () => import('@/features/marketing/pages/ambassador-apply'),
);
export const AmbassadorsPage = lazy(
  () => import('@/features/marketing/pages/ambassadors'),
);
export const NotesPage = lazy(
  () => import('@/features/health/pages/health/notes/notes'),
);
export const GoalsPage = lazy(
  () => import('@/features/health/pages/health/goals'),
);
export const GoalWizard = lazy(
  () => import('@/features/health/pages/health/goals/goal-wizard'),
);
export const MessagingPage = lazy(
  () => import('@/features/messaging/pages/messaging'),
);
export const NotificationsPage = lazy(
  () => import('@/features/notifications/pages/notifications'),
);
export const NotFoundPage = lazy(
  () => import('@/features/error/pages/not-found'),
);
export const UnauthorizedPage = lazy(
  () => import('@/features/error/pages/unauthorized'),
);
export const WorkoutPlansPage = lazy(
  () => import('@/features/health/pages/health/workout-plans'),
);
export const CoachWorkoutPlansPage = lazy(
  () => import('@/features/coaching/pages/coaches/workout-plans'),
);
export const CalendarPage = lazy(
  () => import('@/features/calendar/pages/calendar'),
);
export const CalculatorsIndexPage = lazy(
  () => import('@/features/calculators/pages/calculators'),
);
export const BmiCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/bmi'),
);
export const BodyFatCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/body-fat'),
);
export const FfmiCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/ffmi'),
);
export const BmrCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/bmr'),
);
export const TdeeCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/tdee'),
);
export const CalorieGoalCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/calorie-goal'),
);
export const OneRmCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/one-rm'),
);
export const WilksCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/wilks'),
);
export const DotsCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/dots'),
);
export const MacrosCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/macros'),
);
export const MaxHrCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/max-hr'),
);
export const HrZonesCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/hr-zones'),
);
export const ProteinCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/protein'),
);
export const WaterCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/water'),
);
export const LeanMassCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/lean-mass'),
);
export const WaistHipCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/waist-hip'),
);
export const VolumeLoadCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/volume-load'),
);
export const InolCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/inol'),
);
export const Vo2MaxCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/vo2-max'),
);
export const PaceCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/pace'),
);
export const MetCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/met'),
);
export const WeightGoalCalculator = lazy(
  () => import('@/features/calculators/pages/calculators/weight-goal'),
);
export const DashboardPage = lazy(
  () => import('@/features/dashboard/pages/dashboard'),
);
export const UnsubscribePage = lazy(
  () => import('@/features/notifications/pages/unsubscribe'),
);
