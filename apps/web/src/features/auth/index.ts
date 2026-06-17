export {
  useAuth,
  useRequireRole,
  useRequirePermission,
} from './hooks/use-auth';
export { useAppleAuth } from './hooks/use-apple-auth';
export { useGoogleAuth } from './hooks/use-google-auth';
export {
  useRegister,
  useLogin,
  useVerifyEmail,
  useResendVerification,
  useRefreshTokens,
  useForgotPassword,
  useResetPassword,
  useMe,
  useRegistrationAccessStatus,
  useValidateRegistrationCode,
  useMyRegistrationCodes,
  useLogout,
} from './hooks/use-local-auth';
export {
  type ConsentType,
  type LegalDocument,
  type LegalDocumentVersion,
  type ConsentGrant,
  type ConsentRecord,
  type ConsentCheckResult,
  useActiveLegalDocuments,
  useLegalDocument,
  useLegalDocumentByVersion,
  useLegalDocumentVersions,
  useConsentCheck,
  useUserConsents,
  useSubmitReconsent,
} from './hooks/use-consent';
export {
  totpKeys,
  useTotpStatus,
  useTotpSetup,
  useTotpVerify,
  useTotpDisable,
} from './hooks/use-totp';
