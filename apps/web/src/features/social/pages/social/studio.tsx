import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { writeClipboard } from '@/lib/clipboard';
import { pickImage } from '@/lib/camera';
import { isNativeApp } from '@/lib/capacitor';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateWithBiometric,
} from '@/lib/biometric-auth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme, type Theme } from '@/components/theme-context';
import { PartnersContent } from '@/features/social/pages/partners';
import { NotificationPreferencesContent } from '@/components/notification/notification-preferences';
import {
  useAssociateGyms,
  useCreateProfileAddress,
  useDeleteProfileAddress,
  useProfileDetails,
  useProfileAddresses,
  useProfileGyms,
  useSaveProfile,
  useUpdateProfileAddress,
  useUploadAvatar,
  useUploadCover,
} from '@/features/profile';
import { useSocials, useSaveSocials } from '@/features/social';
import { useMapboxSearch, type MapboxPlace } from '@/hooks/use-mapbox';
import {
  useActiveLegalDocuments,
  useSubmitReconsent,
  useUserConsents,
  type ConsentType,
} from '@/features/auth';
import {
  useMyRegistrationCodes,
  useRegistrationAccessStatus,
} from '@/features/auth';
import { useAuth } from '@/features/auth';
import {
  useTotpStatus,
  useTotpSetup,
  useTotpVerify,
  useTotpDisable,
} from '@/features/auth';
import { useExportData, useDeleteAccount } from '@/features/profile';
import { useSyncStatus } from '@/features/health';
import { requestHealthPermissions } from '@/lib/health-data';
import { syncHealthToBackend } from '@/lib/health-sync';
import {
  useEmailPreferences,
  useUpdateEmailPreferences,
} from '@/features/notifications';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { toast } from 'sonner';
import {
  Camera,
  CheckCircle2,
  Copy,
  CircleDashed,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Heart,
  Loader2,
  Mail,
  Search,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  MapPin,
  Plus,
  Sun,
  Moon,
  Monitor,
  Trash2,
  User,
  Users,
  Bell,
} from 'lucide-react';

type StudioSection =
  | 'profile'
  | 'settings'
  | 'partners'
  | 'addresses'
  | 'notifications';

const AI_REQUIRED_CONSENT_TYPES: ConsentType[] = ['AI_FEATURES_CONSENT'];
const HEALTH_REQUIRED_CONSENT_TYPES: ConsentType[] = ['HEALTH_DATA_CONSENT'];

const AI_LEGAL_PATHS: Record<ConsentType, string> = {
  TERMS_OF_SERVICE: '/terms',
  PRIVACY_POLICY: '/privacy',
  MARKETING: '/privacy',
  DATA_PROCESSING: '/privacy',
  AI_FEATURES_CONSENT: '/ai-legal',
  HIPAA_AUTHORIZATION: '/hipaa',
  DATA_SHARING: '/privacy',
  COOKIES: '/privacy',
  HEALTH_DATA_CONSENT: '/health-data-consent',
  SECURITY_POLICY: '/security',
  ACCESSIBILITY_STATEMENT: '/accessibility',
};

const getSection = (value: string | null): StudioSection =>
  value === 'settings'
    ? 'settings'
    : value === 'addresses'
      ? 'addresses'
      : value === 'partners'
        ? 'partners'
        : value === 'notifications'
          ? 'notifications'
          : 'profile';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Phoenix', label: 'Mountain Time (Phoenix, no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { value: 'America/Mexico_City', label: 'Central Time (Mexico City)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time (Sao Paulo)' },
  { value: 'Europe/London', label: 'GMT/BST (London)' },
  { value: 'Europe/Paris', label: 'CET (Paris)' },
  { value: 'Europe/Berlin', label: 'CET (Berlin)' },
  { value: 'Europe/Amsterdam', label: 'CET (Amsterdam)' },
  { value: 'Europe/Rome', label: 'CET (Rome)' },
  { value: 'Europe/Madrid', label: 'CET (Madrid)' },
  { value: 'Europe/Moscow', label: 'MSK (Moscow)' },
  { value: 'Asia/Dubai', label: 'GST (Dubai)' },
  { value: 'Asia/Kolkata', label: 'IST (Mumbai/Delhi)' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore)' },
  { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Seoul', label: 'KST (Seoul)' },
  { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
  { value: 'Australia/Melbourne', label: 'AEST (Melbourne)' },
  { value: 'Australia/Perth', label: 'AWST (Perth)' },
  { value: 'UTC', label: 'UTC' },
] as const;

export default function ElevateStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const { data: profileData, isLoading: isProfileLoading } =
    useProfileDetails();
  const { data: socialsData, isLoading: isSocialsLoading } = useSocials();
  const { data: gymsData, isLoading: isGymsLoading } = useProfileGyms();
  const { data: addressesData, isLoading: isAddressesLoading } =
    useProfileAddresses();
  const { data: registrationAccessStatus } = useRegistrationAccessStatus();
  const { data: myCodesResponse } = useMyRegistrationCodes();
  const submitReconsent = useSubmitReconsent();
  const { data: aiLegalDocsResponse, isLoading: aiLegalLoading } =
    useActiveLegalDocuments(AI_REQUIRED_CONSENT_TYPES);
  const { data: healthLegalDocsResponse, isLoading: healthLegalLoading } =
    useActiveLegalDocuments(HEALTH_REQUIRED_CONSENT_TYPES);
  const { data: userConsentsResponse, isLoading: userConsentsLoading } =
    useUserConsents();

  const saveProfile = useSaveProfile({
    onSuccess: () => toast.success('Profile updated'),
    onError: () => toast.error('Unable to save profile'),
  });
  const saveSocials = useSaveSocials({
    onSuccess: () => toast.success('Social links updated'),
    onError: () => toast.error('Unable to save social links'),
  });
  const saveGyms = useAssociateGyms({
    onSuccess: () => toast.success('Gyms updated'),
    onError: () => toast.error('Unable to save gyms'),
  });
  const createAddress = useCreateProfileAddress({
    onSuccess: () => toast.success('Address saved'),
    onError: () => toast.error('Unable to save address'),
  });
  const updateAddress = useUpdateProfileAddress({
    onSuccess: () => toast.success('Address updated'),
    onError: () => toast.error('Unable to update address'),
  });
  const deleteAddress = useDeleteProfileAddress({
    onSuccess: () => toast.success('Address removed'),
    onError: () => toast.error('Unable to delete address'),
  });
  const uploadAvatar = useUploadAvatar({
    onSuccess: () => toast.success('Avatar updated'),
    onError: () => toast.error('Avatar upload failed'),
  });
  const uploadCover = useUploadCover({
    onSuccess: () => toast.success('Cover updated'),
    onError: () => toast.error('Cover upload failed'),
  });

  const profile = profileData?.success ? profileData.data : null;
  const socials = socialsData?.success ? socialsData.data : null;
  const gyms = useMemo(
    () => (gymsData?.success ? gymsData.data : []),
    [gymsData],
  );
  const addresses = useMemo(
    () => (addressesData?.success ? addressesData.data.items : []),
    [addressesData],
  );
  const aiLegalDocs = useMemo(
    () => aiLegalDocsResponse?.data ?? [],
    [aiLegalDocsResponse?.data],
  );
  const healthLegalDocs = useMemo(
    () => healthLegalDocsResponse?.data ?? [],
    [healthLegalDocsResponse?.data],
  );
  const userConsents = useMemo(
    () => userConsentsResponse?.data ?? [],
    [userConsentsResponse?.data],
  );

  const [displayNameDraft, setDisplayNameDraft] = useState<string>();
  const [bioDraft, setBioDraft] = useState<string>();
  const [isProfilePublicDraft, setIsProfilePublicDraft] = useState<boolean>();
  const [dateOfBirthDraft, setDateOfBirthDraft] = useState<string>();
  const [heightCmDraft, setHeightCmDraft] = useState<string>();
  const [heightFeetDraft, setHeightFeetDraft] = useState<string>();
  const [heightInchesDraft, setHeightInchesDraft] = useState<string>();
  const [unitDraft, setUnitDraft] = useState<'imperial' | 'metric'>();
  const [timezoneDraft, setTimezoneDraft] = useState<string>();
  const [themeDraft, setThemeDraft] = useState<Theme>();

  const [instagramDraft, setInstagramDraft] = useState<string>();
  const [threadsDraft, setThreadsDraft] = useState<string>();
  const [twitterDraft, setTwitterDraft] = useState<string>();
  const [facebookDraft, setFacebookDraft] = useState<string>();
  const [linkedinDraft, setLinkedinDraft] = useState<string>();
  const [githubDraft, setGithubDraft] = useState<string>();
  const [selectedGymsDraft, setSelectedGymsDraft] = useState<MapboxPlace[]>();
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressDraft, setAddressDraft] = useState({
    label: '',
    recipientName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    isDefault: false,
  });
  const [aiEnabledDraft, setAiEnabledDraft] = useState<boolean>();
  const [showAiConsentDialog, setShowAiConsentDialog] = useState(false);
  const [acceptedAiTerms, setAcceptedAiTerms] = useState(false);
  const [showHealthConsentDialog, setShowHealthConsentDialog] = useState(false);
  const [acceptedHealthTerms, setAcceptedHealthTerms] = useState(false);
  const [isSyncingHealth, setIsSyncingHealth] = useState(false);
  const { data: syncStatusData } = useSyncStatus({ enabled: isNativeApp() });

  // ─── TOTP / 2FA ────────────────────────────────────────────────────────────
  const { data: totpStatus, isLoading: isTotpStatusLoading } = useTotpStatus();
  const totpSetup = useTotpSetup();
  const totpVerify = useTotpVerify({
    onSuccess: (res) => {
      setTotpRecoveryCodes(res.data?.recoveryCodes ?? []);
      setTotpStep('recovery');
    },
    onError: () => toast.error('Invalid verification code'),
  });
  const totpDisable = useTotpDisable({
    onSuccess: () => {
      setShowTotpDisableDialog(false);
      setTotpDisableInput('');
      setShowTotpDisablePassword(false);
      toast.success('Two-factor authentication disabled');
    },
    onError: () =>
      toast.error(
        totpStatus?.hasPassword
          ? 'Unable to disable 2FA — check your password'
          : 'Unable to disable 2FA — check your code',
      ),
  });

  const [showTotpSetupDialog, setShowTotpSetupDialog] = useState(false);
  const [totpStep, setTotpStep] = useState<'qr' | 'verify' | 'recovery'>('qr');
  const [totpToken, setTotpToken] = useState('');
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState<string[]>([]);
  const [showTotpDisableDialog, setShowTotpDisableDialog] = useState(false);
  const [totpDisableInput, setTotpDisableInput] = useState('');
  const [showTotpDisablePassword, setShowTotpDisablePassword] = useState(false);

  // ─── Privacy / Data ──────────────────────────────────────────────────────
  const navigate = useNavigate();
  const { logout } = useAuth();
  const exportData = useExportData();
  const deleteAccountMutation = useDeleteAccount();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // ─── Biometric Lock ──────────────────────────────────────────────────────
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    (async () => {
      const avail = await isBiometricAvailable();
      setBiometricAvailable(avail);
      if (avail) {
        const on = await isBiometricEnabled();
        setBiometricOn(on);
      }
    })().catch(() => {});
  }, []);

  // ─── Email Preferences ───────────────────────────────────────────────────
  const emailPrefs = useEmailPreferences();
  const updateEmailPrefs = useUpdateEmailPreferences();

  const handleExportData = () => {
    exportData.mutate(undefined, {
      onSuccess: (res) => {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vara-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data export downloaded');
      },
      onError: () => toast.error('Unable to export data'),
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    deleteAccountMutation.mutate(undefined, {
      onSuccess: async () => {
        toast.success('Account deleted');
        await logout();
        navigate('/login');
      },
      onError: () => toast.error('Unable to delete account'),
    });
  };

  const handleTotpSetupStart = async () => {
    setTotpStep('qr');
    setTotpToken('');
    setTotpRecoveryCodes([]);
    setShowTotpSetupDialog(true);
    totpSetup.mutate();
  };

  const handleTotpVerify = () => {
    if (totpToken.length !== 6) {
      toast.error('Enter a 6-digit code');
      return;
    }
    totpVerify.mutate(totpToken);
  };

  const handleTotpDisable = () => {
    if (!totpDisableInput.trim()) {
      toast.error(
        totpStatus?.hasPassword
          ? 'Password is required'
          : 'Enter a 6-digit code',
      );
      return;
    }
    if (totpStatus?.hasPassword) {
      totpDisable.mutate({ password: totpDisableInput });
    } else {
      totpDisable.mutate({ totpToken: totpDisableInput });
    }
  };

  const handleCopyRecoveryCodes = async () => {
    try {
      await writeClipboard(totpRecoveryCodes.join('\n'));
      toast.success('Recovery codes copied');
    } catch {
      toast.error('Unable to copy codes');
    }
  };

  const section = useMemo(
    () => getSection(searchParams.get('section')),
    [searchParams],
  );

  const profileTheme: Theme =
    profile?.theme === 'light' ||
    profile?.theme === 'dark' ||
    profile?.theme === 'system'
      ? profile.theme
      : theme;

  const displayName = displayNameDraft ?? profile?.displayName ?? '';
  const bio = bioDraft ?? profile?.bio ?? '';
  const isProfilePublic =
    isProfilePublicDraft ?? profile?.isProfilePublic ?? true;
  const dateOfBirth = dateOfBirthDraft ?? profile?.dateOfBirth ?? '';
  const unit =
    unitDraft ?? (profile?.unit as 'imperial' | 'metric') ?? 'metric';
  const timezone = timezoneDraft ?? profile?.timezone ?? 'UTC';
  const themeSelection = themeDraft ?? profileTheme;

  const profileHeightCm = profile?.height ?? null;
  const profileHeightFeet =
    typeof profileHeightCm === 'number' && profileHeightCm > 0
      ? String(Math.floor(profileHeightCm / 30.48))
      : '';
  const profileHeightInches =
    typeof profileHeightCm === 'number' && profileHeightCm > 0
      ? String(Math.round((profileHeightCm % 30.48) / 2.54))
      : '';
  const heightCmValue =
    heightCmDraft ??
    (typeof profileHeightCm === 'number' && profileHeightCm > 0
      ? String(Number(profileHeightCm.toFixed(1)))
      : '');
  const heightFeetValue = heightFeetDraft ?? profileHeightFeet;
  const heightInchesValue = heightInchesDraft ?? profileHeightInches;

  const instagram = instagramDraft ?? socials?.instagram ?? '';
  const threads = threadsDraft ?? socials?.threads ?? '';
  const twitter = twitterDraft ?? socials?.twitter ?? '';
  const facebook = facebookDraft ?? socials?.facebook ?? '';
  const linkedin = linkedinDraft ?? socials?.linkedin ?? '';
  const github = githubDraft ?? socials?.github ?? '';
  const aiEnabled = aiEnabledDraft ?? Boolean(profile?.allowedAI);

  const gymPlacesFromApi = useMemo<MapboxPlace[]>(
    () =>
      gyms.map((gym) => ({
        id: gym.mapboxId || gym.id,
        name: gym.name,
        formattedAddress: gym.location?.address || '',
        city: gym.location?.city || '',
        state: gym.location?.state || undefined,
        country: gym.location?.country || '',
        postalCode: undefined,
        latitude: 0,
        longitude: 0,
        categories: [],
      })),
    [gyms],
  );
  const selectedGyms = selectedGymsDraft ?? gymPlacesFromApi;
  const selectedGymIds = selectedGyms.map((gym) => gym.id);

  const {
    query: gymQuery,
    setQuery: setGymQuery,
    results: gymResults,
    isSearching: isGymSearching,
  } = useMapboxSearch({ limit: 8, useProximity: true });
  const {
    query: addressSearchQuery,
    setQuery: setAddressSearchQuery,
    results: addressSearchResults,
    isSearching: isAddressSearching,
    error: addressSearchError,
    retrieveDetails: retrieveAddressDetails,
  } = useMapboxSearch({ limit: 6, useProximity: true });

  const myCodes = useMemo(
    () => myCodesResponse?.data?.codes ?? [],
    [myCodesResponse?.data?.codes],
  );
  const privateModeEnabled = Boolean(
    registrationAccessStatus?.data?.privateModeEnabled,
  );
  const availableRegistrationCodes = useMemo(
    () => myCodes.filter((item) => !item.usedAt).slice(0, 5),
    [myCodes],
  );
  const canManagePrivateMode = hasPermission('user:update');

  const buildRegistrationCodeLink = (registrationCode: string) =>
    `https://varaperformance.com/register/create?registrationCode=${encodeURIComponent(registrationCode)}`;

  const handleCopyRegistrationLink = async (registrationCode: string) => {
    const registrationLink = buildRegistrationCodeLink(registrationCode);

    try {
      await writeClipboard(registrationLink);
      toast.success('Registration link copied');
    } catch {
      toast.error('Unable to copy link');
    }
  };

  const handleSectionChange = (value: string) => {
    const nextSection = getSection(value);
    setSearchParams({ section: nextSection }, { replace: true });
  };

  const handleProfileSave = async () => {
    const normalizedDob = dateOfBirth.trim();

    let height: number | undefined;
    if (unit === 'imperial') {
      const feet =
        heightFeetValue.trim() === '' ? undefined : Number(heightFeetValue);
      const inches =
        heightInchesValue.trim() === '' ? undefined : Number(heightInchesValue);

      if (feet !== undefined && !Number.isFinite(feet)) {
        toast.error('Feet must be a valid number');
        return;
      }

      if (inches !== undefined && !Number.isFinite(inches)) {
        toast.error('Inches must be a valid number');
        return;
      }

      if ((feet ?? 0) < 0 || (inches ?? 0) < 0) {
        toast.error('Height values cannot be negative');
        return;
      }

      if (feet !== undefined || inches !== undefined) {
        const totalInches = (feet ?? 0) * 12 + (inches ?? 0);
        const computedCm = totalInches * 2.54;
        if (computedCm < 50 || computedCm > 300) {
          toast.error('Height must be between 50 cm and 300 cm');
          return;
        }
        height = Number(computedCm.toFixed(1));
      }
    } else {
      const parsedCm =
        heightCmValue.trim() === '' ? undefined : Number(heightCmValue);
      if (parsedCm !== undefined && !Number.isFinite(parsedCm)) {
        toast.error('Height must be a valid number');
        return;
      }
      if (parsedCm !== undefined && (parsedCm < 50 || parsedCm > 300)) {
        toast.error('Height must be between 50 cm and 300 cm');
        return;
      }
      height = parsedCm;
    }

    await saveProfile.mutateAsync({
      displayName: displayName.trim(),
      bio: bio.trim(),
      isProfilePublic,
      dateOfBirth: normalizedDob || undefined,
      height,
    });
  };

  const handlePreferencesSave = async () => {
    await saveProfile.mutateAsync({
      unit,
      timezone,
      theme: themeSelection,
    });
  };

  const handleSocialsSave = async () => {
    await saveSocials.mutateAsync({
      instagram: instagram.trim() || undefined,
      threads: threads.trim() || undefined,
      twitter: twitter.trim() || undefined,
      facebook: facebook.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
      github: github.trim() || undefined,
    });
  };

  const handleGymToggle = (gym: MapboxPlace) => {
    const isSelected = selectedGymIds.includes(gym.id);
    if (isSelected) {
      setSelectedGymsDraft((prev) =>
        (prev ?? gymPlacesFromApi).filter((item) => item.id !== gym.id),
      );
      return;
    }

    setSelectedGymsDraft((prev) => [...(prev ?? gymPlacesFromApi), gym]);
  };

  const handleSaveGyms = async () => {
    await saveGyms.mutateAsync(
      selectedGyms.map((gym) => ({
        mapboxId: gym.id,
        name: gym.name,
        formattedAddress: gym.formattedAddress || undefined,
        city: gym.city || undefined,
        state: gym.state || undefined,
        country: gym.country || undefined,
        postalCode: gym.postalCode || undefined,
        latitude: gym.latitude,
        longitude: gym.longitude,
        categories: gym.categories,
      })),
    );
  };

  const resetAddressDraft = () => {
    setEditingAddressId(null);
    setShowAddressForm(false);
    setShowAddressSuggestions(false);
    setAddressSearchQuery('');
    setAddressDraft({
      label: '',
      recipientName: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      isDefault: false,
    });
  };

  const handleEditAddress = (address: {
    id: string;
    label: string | null;
    recipientName: string;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }) => {
    setEditingAddressId(address.id);
    setShowAddressForm(true);
    setShowAddressSuggestions(false);
    setAddressSearchQuery('');
    setAddressDraft({
      label: address.label ?? '',
      recipientName: address.recipientName,
      phone: address.phone ?? '',
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      state: address.state ?? '',
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
  };

  const handleStartAddressCreate = () => {
    setEditingAddressId(null);
    setShowAddressForm(true);
    setShowAddressSuggestions(false);
    setAddressSearchQuery('');
    setAddressDraft({
      label: '',
      recipientName: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      isDefault: false,
    });
  };

  const toCountryCode = (country: string): string => {
    const normalized = country.trim();
    if (!normalized) return 'US';
    if (/^[A-Za-z]{2}$/.test(normalized)) return normalized.toUpperCase();

    const map: Record<string, string> = {
      'united states': 'US',
      'united states of america': 'US',
      canada: 'CA',
      'united kingdom': 'GB',
      'great britain': 'GB',
      australia: 'AU',
      germany: 'DE',
      france: 'FR',
      italy: 'IT',
      spain: 'ES',
      mexico: 'MX',
    };

    return map[normalized.toLowerCase()] ?? 'US';
  };

  const handleAddressSuggestionSelect = async (place: MapboxPlace) => {
    const detailed = (await retrieveAddressDetails(place)) ?? place;
    const firstLine = detailed.name?.trim() || detailed.formattedAddress;

    setAddressDraft((prev) => ({
      ...prev,
      line1: firstLine,
      city: detailed.city || prev.city,
      state: detailed.state || prev.state,
      postalCode: detailed.postalCode || prev.postalCode,
      country: toCountryCode(detailed.country || prev.country),
    }));
    setAddressSearchQuery(firstLine);
    setShowAddressSuggestions(false);
  };

  const handleSaveAddress = async () => {
    if (
      !addressDraft.recipientName.trim() ||
      !addressDraft.line1.trim() ||
      !addressDraft.city.trim() ||
      !addressDraft.postalCode.trim() ||
      !addressDraft.country.trim()
    ) {
      toast.error('Please complete required address fields');
      return;
    }

    const payload = {
      label: addressDraft.label.trim() || undefined,
      recipientName: addressDraft.recipientName.trim(),
      phone: addressDraft.phone.trim() || undefined,
      line1: addressDraft.line1.trim(),
      line2: addressDraft.line2.trim() || undefined,
      city: addressDraft.city.trim(),
      state: addressDraft.state.trim() || undefined,
      postalCode: addressDraft.postalCode.trim(),
      country: addressDraft.country.trim().toUpperCase(),
      isDefault: addressDraft.isDefault,
    };

    if (editingAddressId) {
      await updateAddress.mutateAsync({
        addressId: editingAddressId,
        data: payload,
      });
    } else {
      await createAddress.mutateAsync(payload);
    }

    resetAddressDraft();
  };

  const handleDeleteAddress = async (addressId: string) => {
    await deleteAddress.mutateAsync(addressId);
    if (editingAddressId === addressId) {
      resetAddressDraft();
    }
  };

  const handleThemeSelect = (nextTheme: Theme) => {
    setThemeDraft(nextTheme);
    setTheme(nextTheme);
  };

  const aiRequiredDocs = useMemo(
    () =>
      AI_REQUIRED_CONSENT_TYPES.map((type) =>
        aiLegalDocs.find((doc) => doc.type === type),
      ).filter((doc): doc is NonNullable<(typeof aiLegalDocs)[number]> =>
        Boolean(doc),
      ),
    [aiLegalDocs],
  );

  const hasRequiredAiConsents = useMemo(() => {
    if (aiRequiredDocs.length !== AI_REQUIRED_CONSENT_TYPES.length) {
      return false;
    }
    return aiRequiredDocs.every((doc) =>
      userConsents.some(
        (consent) =>
          consent.type === doc.type && consent.version === doc.version,
      ),
    );
  }, [aiRequiredDocs, userConsents]);

  const isAiConsentBusy =
    aiLegalLoading || userConsentsLoading || submitReconsent.isPending;

  const handleAiToggle = async (checked: boolean) => {
    if (!checked) {
      await saveProfile.mutateAsync({ allowedAI: false });
      setAiEnabledDraft(false);
      setShowAiConsentDialog(false);
      setAcceptedAiTerms(false);
      toast.success('AI features disabled');
      return;
    }

    if (hasRequiredAiConsents) {
      await saveProfile.mutateAsync({ allowedAI: true });
      setAiEnabledDraft(true);
      toast.success('AI features enabled');
      return;
    }

    setAcceptedAiTerms(false);
    setShowAiConsentDialog(true);
  };

  const handleConfirmAiConsent = async () => {
    if (
      !acceptedAiTerms ||
      aiRequiredDocs.length !== AI_REQUIRED_CONSENT_TYPES.length
    ) {
      return;
    }

    await Promise.all(
      aiRequiredDocs.map((doc) =>
        submitReconsent.mutateAsync([
          {
            type: doc.type,
            version: doc.version,
          },
        ]),
      ),
    );

    await saveProfile.mutateAsync({ allowedAI: true });
    setAiEnabledDraft(true);
    setShowAiConsentDialog(false);
    setAcceptedAiTerms(false);
    toast.success('AI features enabled and consent recorded');
  };

  // ─── Health Consent ─────────────────────────────────────────────────────────
  const healthRequiredDocs = useMemo(
    () =>
      HEALTH_REQUIRED_CONSENT_TYPES.map((type) =>
        healthLegalDocs.find((doc) => doc.type === type),
      ).filter((doc): doc is NonNullable<(typeof healthLegalDocs)[number]> =>
        Boolean(doc),
      ),
    [healthLegalDocs],
  );

  const hasHealthConsent = useMemo(() => {
    if (healthRequiredDocs.length !== HEALTH_REQUIRED_CONSENT_TYPES.length)
      return false;
    return healthRequiredDocs.every((doc) =>
      userConsents.some(
        (consent) =>
          consent.type === doc.type && consent.version === doc.version,
      ),
    );
  }, [healthRequiredDocs, userConsents]);

  const isHealthConsentBusy =
    healthLegalLoading || userConsentsLoading || submitReconsent.isPending;

  const handleHealthToggle = async (checked: boolean) => {
    if (!checked) {
      // Nothing to "turn off" — consent cannot be revoked, just inform user
      toast.info(
        'Health data consent cannot be revoked here. Contact support if needed.',
      );
      return;
    }

    if (hasHealthConsent) {
      toast.info('Health data consent is already active.');
      return;
    }

    setAcceptedHealthTerms(false);
    setShowHealthConsentDialog(true);
  };

  const handleConfirmHealthConsent = async () => {
    if (
      !acceptedHealthTerms ||
      healthRequiredDocs.length !== HEALTH_REQUIRED_CONSENT_TYPES.length
    )
      return;

    await Promise.all(
      healthRequiredDocs.map((doc) =>
        submitReconsent.mutateAsync([{ type: doc.type, version: doc.version }]),
      ),
    );

    setShowHealthConsentDialog(false);
    setAcceptedHealthTerms(false);
    toast.success('Health data consent recorded');
  };

  const handleSyncNow = async () => {
    if (!isNativeApp()) {
      toast.error('Health sync is only available on mobile devices.');
      return;
    }
    setIsSyncingHealth(true);
    try {
      await requestHealthPermissions();
      const result = await syncHealthToBackend();
      if (result) {
        toast.success(
          `Synced: ${result.stepsUpserted ?? 0} step records, ${result.sleepUpserted ?? 0} sleep records, ${result.heartRateInserted ?? 0} HR samples`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Health sync failed');
    } finally {
      setIsSyncingHealth(false);
    }
  };

  const onAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatar.mutateAsync(file);
    event.target.value = '';
  };

  const onCoverPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadCover.mutateAsync(file);
    event.target.value = '';
  };

  const profileBusy =
    isProfileLoading ||
    isGymsLoading ||
    saveProfile.isPending ||
    isAddressesLoading ||
    createAddress.isPending ||
    updateAddress.isPending ||
    deleteAddress.isPending ||
    uploadAvatar.isPending ||
    uploadCover.isPending ||
    saveGyms.isPending;
  const socialsBusy = isSocialsLoading || saveSocials.isPending;
  const timezoneValue = TIMEZONES.some((zone) => zone.value === timezone)
    ? timezone
    : 'UTC';
  const coverImageUrl = profile?.coverUrl || '';
  const [loadedCoverUrl, setLoadedCoverUrl] = useState<string | null>(null);
  const isCoverImageLoaded =
    Boolean(coverImageUrl) && loadedCoverUrl === coverImageUrl;

  const timezoneOptions = TIMEZONES.some((zone) => zone.value === timezone)
    ? TIMEZONES
    : [{ value: timezone, label: timezone }, ...TIMEZONES];

  const completionScore = [
    Boolean(displayName.trim()),
    Boolean(bio.trim()),
    Boolean(profile?.avatarUrl),
    Boolean(profile?.coverUrl),
    Boolean(
      instagram.trim() ||
      threads.trim() ||
      twitter.trim() ||
      facebook.trim() ||
      linkedin.trim() ||
      github.trim(),
    ),
    selectedGyms.length > 0,
  ].filter(Boolean).length;
  const completionPercent = Math.round((completionScore / 6) * 100);
  const isAnySavePending =
    saveProfile.isPending ||
    saveSocials.isPending ||
    uploadAvatar.isPending ||
    uploadCover.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative h-36 w-full overflow-hidden md:h-44 lg:h-52">
        {!coverImageUrl ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : (
          <>
            {!isCoverImageLoaded && (
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            )}
            <img
              key={coverImageUrl}
              src={coverImageUrl}
              alt="Studio cover"
              onLoad={() => setLoadedCoverUrl(coverImageUrl)}
              onError={() => setLoadedCoverUrl(null)}
              className={cn(
                'h-full w-full object-cover transition-opacity duration-300',
                isCoverImageLoaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          </>
        )}
      </div>

      <div className="relative px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="-mt-12 mb-6 rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile?.displayName || 'User avatar'}
                  className="h-20 w-20 rounded-2xl border-2 border-background object-cover shadow-md sm:h-24 sm:w-24"
                />
              ) : (
                <Skeleton className="h-20 w-20 rounded-2xl border-2 border-background sm:h-24 sm:w-24" />
              )}
              <div>
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Elevate Studio
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {displayName || 'Your Profile'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{displayName || 'username'} • {completionPercent}% complete
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/elevate">
                  Back to Feed
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const result = await pickImage();
                  if (result.file) {
                    await uploadCover.mutateAsync(result.file);
                    return;
                  }
                  if (!result.native) coverInputRef.current?.click();
                }}
                disabled={uploadCover.isPending}
              >
                {uploadCover.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                Update Cover
              </Button>
            </div>
          </div>

          <div className="divider-soft border-t px-4 py-3">
            <Tabs value={section} onValueChange={handleSectionChange}>
              <TabsList
                className={cn(
                  'h-11 w-full rounded-xl bg-muted/70 p-1',
                  isMobile ? 'flex overflow-x-auto gap-1' : 'grid grid-cols-5',
                )}
              >
                <TabsTrigger value="profile" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className={cn(isMobile && 'sr-only')}>Profile</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className={cn(isMobile && 'sr-only')}>Settings</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="h-4 w-4" />
                  <span className={cn(isMobile && 'sr-only')}>
                    Notifications
                  </span>
                </TabsTrigger>
                <TabsTrigger value="partners" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className={cn(isMobile && 'sr-only')}>Partners</span>
                </TabsTrigger>
                <TabsTrigger value="addresses" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className={cn(isMobile && 'sr-only')}>Addresses</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="pb-8">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-6">
              {section === 'profile' ? (
                <>
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4 text-primary" />
                        Identity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const result = await pickImage();
                            if (result.file) {
                              await uploadAvatar.mutateAsync(result.file);
                              return;
                            }
                            if (!result.native) avatarInputRef.current?.click();
                          }}
                          disabled={uploadAvatar.isPending}
                        >
                          {uploadAvatar.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="mr-2 h-4 w-4" />
                          )}
                          Update Avatar
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Keep profile visuals fresh for the Elevate feed.
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Display name
                          </label>
                          <Input
                            value={displayName}
                            onChange={(event) =>
                              setDisplayNameDraft(event.target.value)
                            }
                            placeholder="username"
                            maxLength={30}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Public profile URL
                          </label>
                          <div className="flex h-10 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                            /elevate/{(displayName || 'username').trim()}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Date of birth
                          </label>
                          <Input
                            type="date"
                            value={dateOfBirth}
                            onChange={(event) =>
                              setDateOfBirthDraft(event.target.value)
                            }
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Height ({unit === 'imperial' ? 'ft / in' : 'cm'})
                          </label>
                          {unit === 'imperial' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="ft"
                                value={heightFeetValue}
                                onChange={(event) =>
                                  setHeightFeetDraft(event.target.value)
                                }
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="in"
                                value={heightInchesValue}
                                onChange={(event) =>
                                  setHeightInchesDraft(event.target.value)
                                }
                              />
                            </div>
                          ) : (
                            <Input
                              type="number"
                              min="50"
                              max="300"
                              step="0.1"
                              placeholder="175"
                              value={heightCmValue}
                              onChange={(event) =>
                                setHeightCmDraft(event.target.value)
                              }
                            />
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold">
                              Public profile
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isProfilePublic
                                ? 'Visible to other members in Elevate.'
                                : 'Hidden from other members. Only you can view it.'}
                            </p>
                          </div>
                          <Switch
                            checked={isProfilePublic}
                            onCheckedChange={setIsProfilePublicDraft}
                            aria-label="Toggle public profile visibility"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Bio
                        </label>
                        <Textarea
                          value={bio}
                          onChange={(event) => setBioDraft(event.target.value)}
                          placeholder="Tell Elevate who you are and what you train for."
                          rows={4}
                          maxLength={320}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Appears on your feed profile header.</span>
                          <span>{bio.length}/320</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          onClick={() => void handleProfileSave()}
                          disabled={profileBusy}
                        >
                          {saveProfile.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Profile
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Profile editing is fully available in Studio.
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4 text-primary" />
                        Social Handles
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Instagram
                          </label>
                          <Input
                            value={instagram}
                            onChange={(event) =>
                              setInstagramDraft(event.target.value)
                            }
                            placeholder="yourhandle"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Threads
                          </label>
                          <Input
                            value={threads}
                            onChange={(event) =>
                              setThreadsDraft(event.target.value)
                            }
                            placeholder="yourhandle"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            X / Twitter
                          </label>
                          <Input
                            value={twitter}
                            onChange={(event) =>
                              setTwitterDraft(event.target.value)
                            }
                            placeholder="yourhandle"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            GitHub
                          </label>
                          <Input
                            value={github}
                            onChange={(event) =>
                              setGithubDraft(event.target.value)
                            }
                            placeholder="username"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Facebook
                          </label>
                          <Input
                            value={facebook}
                            onChange={(event) =>
                              setFacebookDraft(event.target.value)
                            }
                            placeholder="yourhandle"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            LinkedIn
                          </label>
                          <Input
                            value={linkedin}
                            onChange={(event) =>
                              setLinkedinDraft(event.target.value)
                            }
                            placeholder="yourhandle"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleSocialsSave()}
                        disabled={socialsBusy}
                      >
                        {saveSocials.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Social Links
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4 text-primary" />
                        My Gyms
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Input
                        placeholder="Search gyms by name or location..."
                        value={gymQuery}
                        onChange={(event) => setGymQuery(event.target.value)}
                      />

                      {selectedGyms.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedGyms.map((gym) => (
                            <button
                              key={gym.id}
                              type="button"
                              onClick={() => handleGymToggle(gym)}
                              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                            >
                              {gym.name} ×
                            </button>
                          ))}
                        </div>
                      )}

                      {gymQuery.trim().length > 0 && (
                        <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-2">
                          {isGymSearching ? (
                            <p className="px-2 py-2 text-sm text-muted-foreground">
                              Searching gyms...
                            </p>
                          ) : gymResults.length === 0 ? (
                            <p className="px-2 py-2 text-sm text-muted-foreground">
                              No gyms found.
                            </p>
                          ) : (
                            gymResults.map((gym) => {
                              const isSelected = selectedGymIds.includes(
                                gym.id,
                              );
                              return (
                                <button
                                  key={gym.id}
                                  type="button"
                                  onClick={() => handleGymToggle(gym)}
                                  className={cn(
                                    'w-full rounded-md border px-3 py-2 text-left text-sm transition',
                                    isSelected
                                      ? 'border-primary bg-primary/10'
                                      : 'border-border hover:border-primary/40',
                                  )}
                                >
                                  <p className="font-medium">{gym.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {gym.formattedAddress}
                                  </p>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleSaveGyms()}
                          disabled={saveGyms.isPending}
                        >
                          {saveGyms.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Gyms
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {selectedGyms.length} selected
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : section === 'addresses' ? (
                <>
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-primary" />
                        Stored Addresses
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Optional shipping/billing addresses for faster checkout.
                      </p>
                      <div className="mt-1 rounded-xl border border-primary/30 bg-primary/8 px-3.5 py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="rounded-md border border-primary/30 bg-primary/15 p-1.5">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                              Address Security Controls (SOC2/HIPAA Aligned)
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Saved addresses are encrypted at rest for your
                              privacy and only used for secure checkout
                              workflows.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <button
                          type="button"
                          onClick={handleStartAddressCreate}
                          className="group flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/70 bg-muted/10 p-5 text-center transition-colors hover:border-primary/55 hover:bg-primary/5"
                        >
                          <div className="mb-3 rounded-full border border-border/70 bg-background p-2.5 transition-colors group-hover:border-primary/60 group-hover:bg-primary/10">
                            <Plus className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                          </div>
                          <p className="text-xl font-semibold tracking-tight">
                            Add Address
                          </p>
                          <p className="mt-1.5 text-sm text-muted-foreground">
                            Save a new shipping or billing address.
                          </p>
                        </button>

                        {addresses.map((address) => (
                          <div
                            key={address.id}
                            className="flex min-h-52 flex-col rounded-xl border border-border/70 bg-muted/15"
                          >
                            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {address.isDefault
                                  ? 'Default Address'
                                  : address.label || 'Saved Address'}
                              </p>
                              {address.label && !address.isDefault && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {address.label}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 space-y-1 px-4 py-3 text-sm leading-6">
                              <p className="font-semibold text-foreground">
                                {address.recipientName}
                              </p>
                              <p>{address.line1}</p>
                              {address.line2 && <p>{address.line2}</p>}
                              <p>
                                {[address.city, address.state]
                                  .filter(Boolean)
                                  .join(', ')}{' '}
                                {address.postalCode}
                              </p>
                              <p>{address.country}</p>
                              {address.phone && (
                                <p className="text-muted-foreground">
                                  Phone number: {address.phone}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-auto p-0 text-sm font-medium text-primary hover:bg-transparent hover:underline"
                                onClick={() => handleEditAddress(address)}
                              >
                                Edit
                              </Button>
                              <span className="text-muted-foreground">|</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-auto p-0 text-sm font-medium text-primary hover:bg-transparent hover:underline"
                                onClick={() =>
                                  void handleDeleteAddress(address.id)
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {addresses.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No saved addresses yet. Use Add Address to prefill
                          shop checkout.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : section === 'settings' ? (
                <>
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Settings className="h-4 w-4 text-primary" />
                        Preferences
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Configure display and time defaults for Elevate.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Units
                          </label>
                          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-1">
                            <button
                              type="button"
                              className={cn(
                                'rounded-md px-3 py-2 text-sm font-medium transition',
                                unit === 'imperial'
                                  ? 'bg-card text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                              onClick={() => setUnitDraft('imperial')}
                            >
                              Imperial
                            </button>
                            <button
                              type="button"
                              className={cn(
                                'rounded-md px-3 py-2 text-sm font-medium transition',
                                unit === 'metric'
                                  ? 'bg-card text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                              onClick={() => setUnitDraft('metric')}
                            >
                              Metric
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Timezone
                          </label>
                          <Select
                            value={timezoneValue}
                            onValueChange={setTimezoneDraft}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              {timezoneOptions.map((zone) => (
                                <SelectItem key={zone.value} value={zone.value}>
                                  {zone.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Theme
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(
                            [
                              { key: 'light', icon: Sun, label: 'Light' },
                              { key: 'dark', icon: Moon, label: 'Dark' },
                              { key: 'system', icon: Monitor, label: 'System' },
                            ] as const
                          ).map(({ key, icon: Icon, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleThemeSelect(key)}
                              className={cn(
                                'rounded-lg border p-3 text-center text-xs transition',
                                themeSelection === key
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                              )}
                            >
                              <Icon className="mx-auto mb-1 h-4 w-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="divider-soft border-t pt-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            onClick={() => void handlePreferencesSave()}
                            disabled={saveProfile.isPending}
                          >
                            {saveProfile.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Preferences
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Preferences are managed directly in Studio.
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Settings className="h-4 w-4 text-primary" />
                        AI Features
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Enable AI tooling with required legal consent.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div>
                          <p className="text-sm font-medium">
                            AI Assistant Access
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {aiEnabled
                              ? 'AI features are active for your account.'
                              : 'AI features are currently disabled.'}
                          </p>
                        </div>
                        <Switch
                          checked={aiEnabled}
                          onCheckedChange={(checked) => {
                            void handleAiToggle(checked);
                          }}
                          disabled={isAiConsentBusy || saveProfile.isPending}
                        />
                      </div>

                      {aiRequiredDocs.length > 0 && (
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Required docs
                          </p>
                          <div className="space-y-2">
                            {aiRequiredDocs.map((doc) => (
                              <div
                                key={`${doc.type}-${doc.version}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {doc.type.replaceAll('_', ' ')}
                                </span>
                                <Link
                                  to={AI_LEGAL_PATHS[doc.type] ?? '/ai-legal'}
                                  className="text-primary hover:underline"
                                >
                                  {`View ${doc.version.toLowerCase().startsWith('v') ? doc.version : `v${doc.version}`}`}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ─── Health Data Consent ──────────────────────────────── */}
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Heart className="h-4 w-4 text-primary" />
                        Health Data
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Consent to health data collection and syncing.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div>
                          <p className="text-sm font-medium">
                            Health Data Consent
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hasHealthConsent
                              ? 'Health data consent is active.'
                              : 'Grant consent to enable health data syncing.'}
                          </p>
                        </div>
                        <Switch
                          checked={hasHealthConsent}
                          onCheckedChange={(checked) => {
                            void handleHealthToggle(checked);
                          }}
                          disabled={isHealthConsentBusy}
                        />
                      </div>

                      {healthRequiredDocs.length > 0 && (
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Required docs
                          </p>
                          <div className="space-y-2">
                            {healthRequiredDocs.map((doc) => (
                              <div
                                key={`${doc.type}-${doc.version}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {doc.type.replaceAll('_', ' ')}
                                </span>
                                <Link
                                  to={
                                    AI_LEGAL_PATHS[doc.type] ??
                                    '/health-data-consent'
                                  }
                                  className="text-primary hover:underline"
                                >
                                  {`View ${doc.version.toLowerCase().startsWith('v') ? doc.version : `v${doc.version}`}`}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ─── Security / 2FA ──────────────────────────────────── */}
                  {isNativeApp() && hasHealthConsent && (
                    <Card className="card-elevated border-border/70 bg-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Settings className="h-4 w-4 text-primary" />
                          Health Sync
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Sync steps, sleep, heart rate, weight, and water from
                          your device.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                          <div>
                            <p className="text-sm font-medium">Sync Now</p>
                            <p className="text-xs text-muted-foreground">
                              Manually sync the last 7 days of health data from
                              HealthKit / Health Connect.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSyncingHealth}
                            onClick={() => void handleSyncNow()}
                          >
                            {isSyncingHealth ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {isSyncingHealth ? 'Syncing…' : 'Sync'}
                          </Button>
                        </div>

                        {syncStatusData && syncStatusData.length > 0 && (
                          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Last sync
                            </p>
                            <div className="space-y-1.5">
                              {syncStatusData.map((s) => (
                                <div
                                  key={s.source}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-muted-foreground capitalize">
                                    {s.source}
                                  </span>
                                  <span className="text-xs tabular-nums text-muted-foreground">
                                    {s.lastSyncedAt
                                      ? new Date(
                                          s.lastSyncedAt,
                                        ).toLocaleString()
                                      : 'Never'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* ─── Security / 2FA ──────────────────────────────────── */}
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Security
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Protect your account with two-factor authentication.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div>
                          <p className="text-sm font-medium">
                            Two-Factor Authentication (TOTP)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isTotpStatusLoading
                              ? 'Checking status…'
                              : totpStatus?.totpEnabled
                                ? '2FA is active on your account.'
                                : 'Add an extra layer of security to your account.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isTotpStatusLoading && (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                totpStatus?.totpEnabled
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {totpStatus?.totpEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {totpStatus?.totpEnabled ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setTotpDisableInput('');
                              setShowTotpDisablePassword(false);
                              setShowTotpDisableDialog(true);
                            }}
                          >
                            Disable 2FA
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => void handleTotpSetupStart()}
                            disabled={
                              isTotpStatusLoading || totpSetup.isPending
                            }
                          >
                            {totpSetup.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            Enable 2FA
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* ─── Email Preferences ───────────────────────────────── */}
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Preferences
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Manage which emails you receive from us.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div>
                          <p className="text-sm font-medium">
                            Marketing emails
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emailPrefs.data?.marketingOptIn
                              ? "You'll receive product updates, tips, and promotions."
                              : "You won't receive marketing emails."}
                          </p>
                        </div>
                        <Switch
                          checked={emailPrefs.data?.marketingOptIn ?? false}
                          onCheckedChange={(checked) => {
                            updateEmailPrefs.mutate(checked, {
                              onSuccess: () => {
                                toast.success(
                                  checked
                                    ? 'Opted in to marketing emails'
                                    : 'Opted out of marketing emails',
                                );
                              },
                            });
                          }}
                          disabled={
                            emailPrefs.isLoading || updateEmailPrefs.isPending
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* ─── Privacy & Data ──────────────────────────────────── */}
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4 text-primary" />
                        Privacy & Data
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Export your data or delete your account per GDPR rights.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {biometricAvailable && (
                        <>
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">
                                Biometric Lock
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Require Face ID or fingerprint for sensitive
                                actions.
                              </p>
                            </div>
                            <Switch
                              checked={biometricOn}
                              onCheckedChange={async (checked) => {
                                const ok = await setBiometricEnabled(checked);
                                if (ok) {
                                  setBiometricOn(checked);
                                  toast.success(
                                    checked
                                      ? 'Biometric lock enabled'
                                      : 'Biometric lock disabled',
                                  );
                                } else {
                                  toast.error('Biometric verification failed');
                                }
                              }}
                            />
                          </div>
                          <div className="border-t border-border/50" />
                        </>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Download My Data
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Export all personal data as a JSON file.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleExportData}
                          disabled={exportData.isPending}
                        >
                          {exportData.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Export Data
                        </Button>
                      </div>

                      <div className="border-t border-border/50" />

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-destructive">
                            Delete My Account
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Permanently delete your account and all data.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={async () => {
                            if (biometricOn) {
                              const ok = await authenticateWithBiometric(
                                'Verify your identity to delete your account',
                              );
                              if (!ok) {
                                toast.error('Biometric verification required');
                                return;
                              }
                            }
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ─── Delete Account Dialog ───────────────────────────── */}
                  <Dialog
                    open={showDeleteDialog}
                    onOpenChange={(open) => {
                      setShowDeleteDialog(open);
                      if (!open) setDeleteConfirmation('');
                    }}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                          This action is <strong>permanent</strong> and cannot
                          be undone. All your data will be erased.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          <li>Profile, posts, and social connections</li>
                          <li>Workouts, health logs, and nutrition data</li>
                          <li>Messages and notification history</li>
                          <li>Orders and coaching records</li>
                        </ul>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Type{' '}
                            <span className="font-mono text-destructive">
                              DELETE MY ACCOUNT
                            </span>{' '}
                            to confirm
                          </label>
                          <Input
                            value={deleteConfirmation}
                            onChange={(e) =>
                              setDeleteConfirmation(e.target.value)
                            }
                            placeholder="DELETE MY ACCOUNT"
                            autoFocus
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={
                            deleteConfirmation !== 'DELETE MY ACCOUNT' ||
                            deleteAccountMutation.isPending
                          }
                        >
                          {deleteAccountMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Permanently Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* ─── TOTP Setup Dialog ───────────────────────────────── */}
                  <Dialog
                    open={showTotpSetupDialog}
                    onOpenChange={(open) => {
                      if (!open && totpStep !== 'recovery') {
                        setShowTotpSetupDialog(false);
                      }
                    }}
                  >
                    <DialogContent className="sm:max-w-md">
                      {totpStep === 'qr' && (
                        <>
                          <DialogHeader>
                            <DialogTitle>
                              Set Up Two-Factor Authentication
                            </DialogTitle>
                            <DialogDescription>
                              Scan the QR code with your authenticator app (e.g.
                              Google Authenticator, Authy, 1Password).
                            </DialogDescription>
                          </DialogHeader>

                          <div className="flex flex-col items-center gap-4 py-4">
                            {totpSetup.isPending ? (
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : totpSetup.data?.data ? (
                              <>
                                <img
                                  src={totpSetup.data.data.qrCodeDataUrl}
                                  alt="TOTP QR Code"
                                  className="h-48 w-48 rounded-lg border"
                                  loading="lazy"
                                  decoding="async"
                                />
                                <div className="w-full space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    Can't scan? Enter this key manually:
                                  </p>
                                  <code className="block break-all rounded bg-muted px-3 py-2 text-xs">
                                    {totpSetup.data.data.secret}
                                  </code>
                                </div>
                              </>
                            ) : null}
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowTotpSetupDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                setTotpToken('');
                                setTotpStep('verify');
                              }}
                              disabled={totpSetup.isPending || !totpSetup.data}
                            >
                              Next
                            </Button>
                          </DialogFooter>
                        </>
                      )}

                      {totpStep === 'verify' && (
                        <>
                          <DialogHeader>
                            <DialogTitle>Verify Your Code</DialogTitle>
                            <DialogDescription>
                              Enter the 6-digit code from your authenticator app
                              to complete setup.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="py-4">
                            <Input
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="000000"
                              value={totpToken}
                              onChange={(event) =>
                                setTotpToken(
                                  event.target.value.replace(/\D/g, ''),
                                )
                              }
                              className="text-center text-lg tracking-[0.5em]"
                              autoFocus
                            />
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setTotpStep('qr')}
                            >
                              Back
                            </Button>
                            <Button
                              onClick={handleTotpVerify}
                              disabled={
                                totpToken.length !== 6 || totpVerify.isPending
                              }
                            >
                              {totpVerify.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Verify
                            </Button>
                          </DialogFooter>
                        </>
                      )}

                      {totpStep === 'recovery' && (
                        <>
                          <DialogHeader>
                            <DialogTitle>Recovery Codes</DialogTitle>
                            <DialogDescription>
                              Save these codes in a secure place. Each code can
                              only be used once if you lose access to your
                              authenticator app.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="py-4">
                            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-4">
                              {totpRecoveryCodes.map((code) => (
                                <code
                                  key={code}
                                  className="text-center text-sm font-mono"
                                >
                                  {code}
                                </code>
                              ))}
                            </div>
                          </div>

                          <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Button
                              variant="outline"
                              onClick={() => void handleCopyRecoveryCodes()}
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copy Codes
                            </Button>
                            <Button
                              onClick={() => {
                                setShowTotpSetupDialog(false);
                                toast.success(
                                  'Two-factor authentication enabled',
                                );
                              }}
                            >
                              Done
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* ─── TOTP Disable Dialog ─────────────────────────────── */}
                  <Dialog
                    open={showTotpDisableDialog}
                    onOpenChange={setShowTotpDisableDialog}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          Disable Two-Factor Authentication
                        </DialogTitle>
                        <DialogDescription>
                          {totpStatus?.hasPassword
                            ? 'Enter your password to confirm. You can re-enable 2FA at any time.'
                            : 'Enter a code from your authenticator app to confirm.'}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="relative py-4">
                        {totpStatus?.hasPassword ? (
                          <>
                            <Input
                              type={
                                showTotpDisablePassword ? 'text' : 'password'
                              }
                              placeholder="Current password"
                              value={totpDisableInput}
                              onChange={(event) =>
                                setTotpDisableInput(event.target.value)
                              }
                              autoFocus
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setShowTotpDisablePassword((prev) => !prev)
                              }
                            >
                              {showTotpDisablePassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        ) : (
                          <Input
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={totpDisableInput}
                            onChange={(e) =>
                              setTotpDisableInput(
                                e.target.value.replace(/\D/g, ''),
                              )
                            }
                            className="text-center text-lg tracking-[0.5em]"
                            autoFocus
                          />
                        )}
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowTotpDisableDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleTotpDisable}
                          disabled={
                            !totpDisableInput.trim() || totpDisable.isPending
                          }
                        >
                          {totpDisable.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Disable 2FA
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : section === 'notifications' ? (
                <NotificationPreferencesContent />
              ) : (
                <PartnersContent embedded />
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void onAvatarPick(event)}
              />
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void onCoverPick(event)}
              />
            </div>

            <div className="hidden space-y-4 xl:sticky xl:top-20 xl:block">
              <Card className="card-elevated border-primary/20 bg-linear-to-br from-card via-card to-primary/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Studio Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-semibold">
                        {completionPercent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      {isAnySavePending ? (
                        <CircleDashed className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                      {isAnySavePending
                        ? 'Syncing your updates'
                        : 'All changes are synced'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Profile edits update your Elevate identity and feed
                      presence.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {privateModeEnabled && availableRegistrationCodes.length > 0 && (
                <Card className="card-elevated border-border/70 bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Registration Codes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Private mode is enabled. These are your available invite
                      codes.
                    </p>
                    <div className="space-y-2">
                      {availableRegistrationCodes.slice(0, 5).map((code) => (
                        <div
                          key={code.id}
                          className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-mono text-sm">{code.code}</p>
                              <p className="text-xs text-muted-foreground">
                                Available
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                void handleCopyRegistrationLink(code.code)
                              }
                              title="Copy registration link"
                              aria-label="Copy registration link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {canManagePrivateMode && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin/private-mode">
                          Manage Private Mode
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={showAddressForm}
        onOpenChange={(open) => {
          if (!createAddress.isPending && !updateAddress.isPending) {
            if (open) {
              setShowAddressForm(true);
            } else {
              resetAddressDraft();
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAddressId ? 'Edit Address' : 'Add Address'}
            </DialogTitle>
            <DialogDescription>
              Save shipping or billing details for faster checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search Address (Mapbox)
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addressSearchQuery}
                onChange={(event) => {
                  setAddressSearchQuery(event.target.value);
                  setShowAddressSuggestions(true);
                }}
                onFocus={() => {
                  if (addressSearchQuery.trim().length > 0) {
                    setShowAddressSuggestions(true);
                  }
                }}
                placeholder="Start typing your street address..."
                className="pl-9"
              />
            </div>

            {showAddressSuggestions && addressSearchQuery.trim().length > 0 && (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
                {isAddressSearching ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">
                    Searching addresses...
                  </p>
                ) : addressSearchResults.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">
                    No matching addresses found.
                  </p>
                ) : (
                  addressSearchResults.map((place) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => void handleAddressSuggestionSelect(place)}
                      className="w-full rounded-md border border-border/60 bg-background/70 px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <p className="font-medium">{place.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {place.formattedAddress}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {addressSearchError && (
              <p className="text-xs text-destructive">{addressSearchError}</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={addressDraft.label}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  label: event.target.value,
                }))
              }
              placeholder="Label (Home, Office)"
            />
            <Input
              value={addressDraft.recipientName}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  recipientName: event.target.value,
                }))
              }
              placeholder="Recipient name"
            />
            <Input
              value={addressDraft.phone}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
              placeholder="Phone (optional)"
            />
            <Input
              value={addressDraft.country}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  country: event.target.value.toUpperCase(),
                }))
              }
              placeholder="Country code"
            />
            <Input
              className="md:col-span-2"
              value={addressDraft.line1}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  line1: event.target.value,
                }))
              }
              placeholder="Address line 1"
            />
            <Input
              className="md:col-span-2"
              value={addressDraft.line2}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  line2: event.target.value,
                }))
              }
              placeholder="Address line 2 (optional)"
            />
            <Input
              value={addressDraft.city}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  city: event.target.value,
                }))
              }
              placeholder="City"
            />
            <Input
              value={addressDraft.state}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  state: event.target.value,
                }))
              }
              placeholder="State/Province"
            />
            <Input
              value={addressDraft.postalCode}
              onChange={(event) =>
                setAddressDraft((prev) => ({
                  ...prev,
                  postalCode: event.target.value,
                }))
              }
              placeholder="Postal code"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="address-default"
              checked={addressDraft.isDefault}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setAddressDraft((prev) => ({
                  ...prev,
                  isDefault: Boolean(checked),
                }))
              }
            />
            <label htmlFor="address-default" className="text-sm">
              Set as default address
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetAddressDraft}
              disabled={createAddress.isPending || updateAddress.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveAddress()}
              disabled={
                createAddress.isPending ||
                updateAddress.isPending ||
                deleteAddress.isPending
              }
            >
              {createAddress.isPending || updateAddress.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingAddressId ? (
                <Save className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingAddressId ? 'Update Address' : 'Add Address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAiConsentDialog}
        onOpenChange={(open) => {
          if (!submitReconsent.isPending) {
            setShowAiConsentDialog(open);
            if (!open) setAcceptedAiTerms(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable AI Features</DialogTitle>
            <DialogDescription>
              Review and accept the required legal document to enable AI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            {aiRequiredDocs.map((doc) => (
              <div
                key={`${doc.type}-${doc.version}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {doc.type.replaceAll('_', ' ')} v{doc.version}
                </span>
                <Link
                  to={AI_LEGAL_PATHS[doc.type] ?? '/ai-legal'}
                  className="text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptedAiTerms}
                onChange={(event) => setAcceptedAiTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className="text-muted-foreground">
                I have reviewed and accept the required AI legal terms.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!submitReconsent.isPending) {
                  setShowAiConsentDialog(false);
                  setAcceptedAiTerms(false);
                }
              }}
              disabled={submitReconsent.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleConfirmAiConsent();
              }}
              disabled={
                !acceptedAiTerms ||
                submitReconsent.isPending ||
                aiRequiredDocs.length !== AI_REQUIRED_CONSENT_TYPES.length
              }
            >
              {submitReconsent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm and Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showHealthConsentDialog}
        onOpenChange={(open) => {
          if (!submitReconsent.isPending) {
            setShowHealthConsentDialog(open);
            if (!open) setAcceptedHealthTerms(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Health Data Consent</DialogTitle>
            <DialogDescription>
              Review and accept the required agreement to enable health data
              syncing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            {healthRequiredDocs.map((doc) => (
              <div
                key={`${doc.type}-${doc.version}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {doc.type.replaceAll('_', ' ')} v{doc.version}
                </span>
                <Link
                  to={AI_LEGAL_PATHS[doc.type] ?? '/health-data-consent'}
                  className="text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptedHealthTerms}
                onChange={(event) =>
                  setAcceptedHealthTerms(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className="text-muted-foreground">
                I have reviewed and accept the health data sharing agreement.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!submitReconsent.isPending) {
                  setShowHealthConsentDialog(false);
                  setAcceptedHealthTerms(false);
                }
              }}
              disabled={submitReconsent.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleConfirmHealthConsent();
              }}
              disabled={
                !acceptedHealthTerms ||
                submitReconsent.isPending ||
                healthRequiredDocs.length !==
                  HEALTH_REQUIRED_CONSENT_TYPES.length
              }
            >
              {submitReconsent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
