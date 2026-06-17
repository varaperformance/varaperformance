// Coaches (public-facing + coach self-service)
export {
  type CoachResponse,
  type CoachCertification,
  type CreateCoachReview,
  type CoachListData,
  type CoachListItem,
  type CoachFilters,
  type CoachPackageResponse,
  type CoachReviewResponse,
  type CoachReviewsData,
  type CoachSpecialty,
  type BillingCycle,
  type CoachingContractResponse,
  type ContractSignatureResponse,
  type BookingPaymentResult,
  type UserBookingsListData,
  type UserBookingResponse,
  useCoaches,
  useCoach,
  useFeaturedCoaches,
  useCoachReviews,
  useCreateCoachReview,
  useCoachContract,
  useMyCoachPackages,
  useSignContract,
  useInitiateBookingPayment,
  useCompleteBookingPayment,
  useApplyCoach,
  useUploadCoachCertificationPhoto,
  useCreateMyCoachPackage,
  useUpdateMyCoachPackage,
  useArchiveMyCoachPackage,
  useDeleteMyCoachPackage,
  formatPrice,
  specialtyConfig,
  useUserBookings,
  useCancelUserBooking,
} from './hooks/use-coaches';

// Coach dashboard
export {
  type CoachDashboardStats,
  type CoachClient,
  type CoachClientsData,
  type ClientIntake,
  type ContractSignatureInfo,
  type ClientDetails,
  type ClientMetrics,
  type MonthlyRevenueData,
  type StripeConnectStatus,
  type CoachClientAnalytics,
  type ActivityTimelineEvent,
  type ClientActivityTimeline,
  useMyCoachProfile,
  useCoachDashboard,
  useCoachClients,
  useClientDetails,
  useClientMetrics,
  useUpdateBookingStatus,
  useUpdateCoachAvailability,
  useStripeConnectStatus,
  useCreateStripeOnboardingLink,
  useDisconnectStripeConnect,
  useCoachRevenueHistory,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useCoachClientAnalytics,
  useExportClientsCsv,
  useClientActivityTimeline,
} from './hooks/use-coach-dashboard';

// Coach contracts
export {
  useCoachContracts,
  useCoachContract as useCoachContractById,
  useContractVersionHistory,
  useCreateContract,
  useCreateContractVersion,
  useVerifyContractIntegrity,
} from './hooks/use-coach-contracts';

// Availability
export {
  useMyAvailability,
  useCoachAvailability,
  useCreateAvailabilitySlot,
  useUpdateAvailabilitySlot,
  useDeleteAvailabilitySlot,
} from './hooks/use-availability';

// Coach tier subscription
export {
  useCoachTierSubscription,
  useCoachTierCheckout,
  useCoachTierCancelEligibility,
  useCancelCoachTierSubscription,
} from './hooks/use-coach-tier-subscription';
