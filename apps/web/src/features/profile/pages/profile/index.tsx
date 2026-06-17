import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useProfileDetails,
  useProfileGyms,
  useSaveProfile,
  useAssociateGyms,
  useUploadAvatar,
  useUploadCover,
  useCheckDisplayName,
} from '@/features/profile';
import { useSocials, useSaveSocials } from '@/features/social';
import { useWorkoutStats } from '@/features/health';
import { usePersonalRecords } from '@/features/health';
import { useMapboxSearch, type MapboxPlace } from '@/hooks/use-mapbox';
import { useAuth } from '@/features/auth';
import { TrustBadge } from '@/components/trust-badge';
import { cn } from '@/lib/utils';
import { pickImage } from '@/lib/camera';
import { toast } from 'sonner';
import {
  Calendar,
  Ruler,
  Dumbbell,
  Users,
  Trophy,
  MapPin,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Github,
  Pencil,
  X,
  Check,
  Loader2,
  Search,
  Camera,
  AtSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// Threads icon (not in lucide)
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717-1.33 1.66-2.025 4.032-2.048 7.037v.124c.023 3.025.718 5.406 2.066 7.07 1.429 1.762 3.622 2.664 6.52 2.68 2.386-.017 4.258-.61 5.574-1.763 1.263-1.105 1.903-2.546 1.903-4.285 0-1.312-.416-2.33-1.237-3.027-.689-.583-1.546-.894-2.604-.949-.555 1.633-1.452 2.812-2.668 3.506-1.082.618-2.28.813-3.39.576-1.1-.234-2.023-.835-2.668-1.74-.728-1.02-.97-2.347-.668-3.648.506-2.18 2.285-3.682 4.587-3.875.943-.08 1.928.088 2.876.489l.27-.737c-.126-1.252-.61-2.197-1.445-2.813-.793-.586-1.836-.885-3.1-.889-1.263.002-2.306.305-3.1.9-.83.623-1.388 1.524-1.664 2.682l-1.992-.46c.365-1.565 1.131-2.794 2.276-3.652 1.17-.878 2.61-1.326 4.28-1.335h.01c1.668.01 3.108.458 4.28 1.332 1.03.77 1.742 1.832 2.12 3.16.44.126.863.278 1.263.456 1.328.59 2.387 1.52 3.15 2.762.807 1.313 1.217 2.923 1.217 4.782 0 2.29-.837 4.265-2.489 5.875-1.6 1.56-3.834 2.398-6.643 2.493h-.142zm-1.63-8.358c.665.082 1.326-.019 1.87-.284.728-.355 1.29-1.01 1.67-1.94-.64-.158-1.286-.225-1.918-.203-1.378.115-2.331.93-2.58 2.002-.147.632-.023 1.215.364 1.64.263.29.606.47.994.555.005 0 .01 0 .014.002l.1.015.085.012.101.011.096.008.106.005.098.002z" />
  </svg>
);

type SocialPlatform =
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'linkedin'
  | 'github';

const socialPlatforms: Record<
  SocialPlatform,
  {
    icon: typeof Twitter | typeof ThreadsIcon;
    label: string;
    urlPrefix: string;
  }
> = {
  twitter: {
    icon: Twitter,
    label: 'Twitter',
    urlPrefix: 'https://twitter.com/',
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    urlPrefix: 'https://instagram.com/',
  },
  facebook: {
    icon: Facebook,
    label: 'Facebook',
    urlPrefix: 'https://facebook.com/',
  },
  threads: {
    icon: ThreadsIcon,
    label: 'Threads',
    urlPrefix: 'https://threads.net/@',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    urlPrefix: 'https://linkedin.com/in/',
  },
  github: { icon: Github, label: 'GitHub', urlPrefix: 'https://github.com/' },
};

const socialKeys: SocialPlatform[] = [
  'twitter',
  'instagram',
  'facebook',
  'threads',
  'linkedin',
  'github',
];

// Display name validation (Instagram-style username)
const validateDisplayName = (name: string): string | null => {
  if (!name) return null;
  if (name.length < 3) return 'Must be at least 3 characters';
  if (name.length > 30) return 'Must be at most 30 characters';
  if (!/^[a-zA-Z0-9_]/.test(name))
    return 'Must start with a letter, number, or underscore';
  if (!/[a-zA-Z0-9_]$/.test(name))
    return 'Must end with a letter, number, or underscore';
  if (name.includes('..')) return 'Cannot contain consecutive periods';
  if (!/^[a-zA-Z0-9_.]+$/.test(name))
    return 'Can only contain letters, numbers, underscores, and periods';
  return null;
};

const ProfilePage = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: profileData, isLoading: isProfileLoading } = useProfileDetails({
    enabled: isAuthenticated,
  });
  const { data: socialsData, isLoading: isSocialsLoading } = useSocials({
    enabled: isAuthenticated,
  });
  const { data: gymsData, isLoading: isGymsLoading } = useProfileGyms({
    enabled: isAuthenticated,
  });
  const { data: workoutStatsData } = useWorkoutStats();
  const { data: prsData } = usePersonalRecords();

  // Edit states
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [editingSocials, setEditingSocials] = useState(false);
  const [socialsValue, setSocialsValue] = useState<
    Record<SocialPlatform, string>
  >({
    twitter: '',
    instagram: '',
    facebook: '',
    threads: '',
    linkedin: '',
    github: '',
  });

  // Display name editing state
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameValue, setDisplayNameValue] = useState('');
  const [debouncedDisplayName, setDebouncedDisplayName] = useState('');

  // Personal details editing state
  const [editingPersonalDetails, setEditingPersonalDetails] = useState(false);
  const [birthdayValue, setBirthdayValue] = useState('');
  const [heightFeetValue, setHeightFeetValue] = useState('');
  const [heightInchesValue, setHeightInchesValue] = useState('');
  const [heightCmValue, setHeightCmValue] = useState('');

  // Gym editing state
  const [editingGyms, setEditingGyms] = useState(false);
  const [selectedGyms, setSelectedGyms] = useState<MapboxPlace[]>([]);
  const [lastGymsDataKey, setLastGymsDataKey] = useState<string | null>(null);

  // Mapbox search for gyms
  const {
    query: gymSearch,
    setQuery: setGymSearch,
    results: gymResults,
    isSearching: isGymSearching,
    error: mapboxError,
  } = useMapboxSearch({ limit: 10, useProximity: true });

  // Derive selected gym IDs for comparison
  const selectedGymIds = selectedGyms.map((g) => g.id);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const saveProfile = useSaveProfile({
    onSuccess: () => {
      toast.success('Bio updated');
      setEditingBio(false);
    },
    onError: () => toast.error('Failed to update bio'),
  });

  const saveSocials = useSaveSocials({
    onSuccess: () => {
      toast.success('Social links updated');
      setEditingSocials(false);
    },
    onError: () => toast.error('Failed to update social links'),
  });

  const saveGyms = useAssociateGyms({
    onSuccess: () => {
      toast.success('Gyms updated');
      setEditingGyms(false);
      setGymSearch('');
    },
    onError: () => toast.error('Failed to update gyms'),
  });

  const uploadAvatar = useUploadAvatar({
    onSuccess: () => {
      toast.success('Avatar updated');
    },
    onError: () => toast.error('Failed to upload avatar'),
  });

  const uploadCover = useUploadCover({
    onSuccess: () => {
      toast.success('Cover photo updated');
    },
    onError: () => toast.error('Failed to upload cover photo'),
  });

  const profile = profileData?.success ? profileData.data : null;
  const socials = socialsData?.success ? socialsData.data : null;
  const gyms = useMemo(
    () => (gymsData?.success ? gymsData.data : []),
    [gymsData],
  );
  const isLoading =
    isAuthLoading || isProfileLoading || isSocialsLoading || isGymsLoading;

  // Display name validation
  const displayNameFormatError = validateDisplayName(displayNameValue);
  const isDisplayNameFormatValid =
    displayNameValue.length >= 3 && !displayNameFormatError;
  const originalDisplayName = profile?.displayName || '';
  const hasDisplayNameChanged =
    displayNameValue.toLowerCase() !== originalDisplayName.toLowerCase();

  // Debounce display name for availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDisplayNameFormatValid && hasDisplayNameChanged) {
        setDebouncedDisplayName(displayNameValue.trim().toLowerCase());
      } else {
        setDebouncedDisplayName('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [displayNameValue, isDisplayNameFormatValid, hasDisplayNameChanged]);

  // Check display name availability
  const { data: displayNameCheck, isLoading: isCheckingDisplayName } =
    useCheckDisplayName(debouncedDisplayName, {
      enabled: debouncedDisplayName.length >= 1 && hasDisplayNameChanged,
    });

  const isDisplayNameAvailable =
    !hasDisplayNameChanged ||
    (displayNameCheck?.success && displayNameCheck.data.available);
  const isDisplayNameTaken =
    hasDisplayNameChanged &&
    displayNameCheck?.success &&
    !displayNameCheck.data.available;

  // Initialize gyms from API data when data first loads (same pattern as profile-form.tsx)
  const gymsDataKey = gyms.length > 0 ? gyms.map((g) => g.id).join(',') : null;
  if (gymsDataKey && gymsDataKey !== lastGymsDataKey) {
    setLastGymsDataKey(gymsDataKey);
    const gymPlaces: MapboxPlace[] = gyms.map((gym) => ({
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
    }));
    setSelectedGyms(gymPlaces);
  }

  // Calculate age from date of birth
  const age = profile?.dateOfBirth
    ? Math.floor(
        (new Date().getTime() - new Date(profile.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  const todayDate = new Date().toISOString().slice(0, 10);
  const birthdayDisplay = profile?.dateOfBirth
    ? new Date(`${profile.dateOfBirth}T00:00:00`).toLocaleDateString(
        undefined,
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      )
    : null;

  // Build social links from socials data - properly filter by known keys
  const activeSocials = socials
    ? socialKeys
        .filter((key) => socials[key])
        .map((key) => ({
          key,
          username: socials[key]!,
          ...socialPlatforms[key],
        }))
    : [];

  const hasBioChanges = bioValue.trim() !== (profile?.bio || '').trim();
  const hasSocialChanges = socialKeys.some(
    (key) => (socialsValue[key] || '').trim() !== (socials?.[key] || '').trim(),
  );
  const editButtonClass =
    'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all';

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
        toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
        return;
      }
      uploadAvatar.mutate(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Handle cover file selection
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max for cover)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
        toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
        return;
      }
      uploadCover.mutate(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Start editing bio
  const startEditBio = () => {
    setBioValue(profile?.bio || '');
    setEditingBio(true);
  };

  const startEditPersonalDetails = () => {
    const heightInCm = profile?.height || 0;
    const feet = Math.floor(heightInCm / 30.48);
    const inches = Math.round((heightInCm % 30.48) / 2.54);

    setBirthdayValue(profile?.dateOfBirth || '');
    setHeightFeetValue(heightInCm ? String(feet) : '');
    setHeightInchesValue(heightInCm ? String(inches) : '');
    setHeightCmValue(heightInCm ? String(heightInCm) : '');
    setEditingPersonalDetails(true);
  };

  const getEditedHeightInCm = (
    showErrors = true,
  ): number | undefined | null => {
    if ((profile?.unit || 'imperial') === 'imperial') {
      const feet =
        heightFeetValue.trim() === '' ? undefined : Number(heightFeetValue);
      const inches =
        heightInchesValue.trim() === '' ? undefined : Number(heightInchesValue);

      if (feet === undefined && inches === undefined) return undefined;
      if (
        feet !== undefined &&
        (!Number.isFinite(feet) || feet < 1 || feet > 8)
      ) {
        if (showErrors) toast.error('Feet must be between 1 and 8');
        return null;
      }
      if (
        inches !== undefined &&
        (!Number.isFinite(inches) || inches < 0 || inches > 11)
      ) {
        if (showErrors) toast.error('Inches must be between 0 and 11');
        return null;
      }

      const totalCm = Math.round((feet || 0) * 30.48 + (inches || 0) * 2.54);
      if (totalCm < 50 || totalCm > 300) {
        if (showErrors) toast.error('Height must be between 50 and 300 cm');
        return null;
      }
      return totalCm;
    }

    const cm = heightCmValue.trim() === '' ? undefined : Number(heightCmValue);
    if (cm === undefined) return undefined;
    if (!Number.isFinite(cm) || cm < 50 || cm > 300) {
      if (showErrors) toast.error('Height must be between 50 and 300 cm');
      return null;
    }
    return Math.round(cm);
  };

  const editedHeightInCm = editingPersonalDetails
    ? getEditedHeightInCm(false)
    : undefined;
  const isPersonalDetailsDirty =
    birthdayValue !== (profile?.dateOfBirth || '') ||
    editedHeightInCm !== (profile?.height ?? undefined);
  const hasInvalidPersonalDetails =
    editingPersonalDetails && editedHeightInCm === null;

  const handleSavePersonalDetails = () => {
    if (!isPersonalDetailsDirty) {
      setEditingPersonalDetails(false);
      return;
    }

    if (birthdayValue && birthdayValue > todayDate) {
      toast.error('Birthday cannot be in the future');
      return;
    }

    const heightInCm = getEditedHeightInCm();
    if (heightInCm === null) return;

    saveProfile.mutate(
      {
        dateOfBirth: birthdayValue || undefined,
        height: heightInCm,
      },
      {
        onSuccess: () => {
          toast.success('Personal details updated');
          setEditingPersonalDetails(false);
        },
        onError: () => toast.error('Failed to update personal details'),
      },
    );
  };

  // Save bio
  const handleSaveBio = () => {
    if (!hasBioChanges) {
      setEditingBio(false);
      return;
    }
    saveProfile.mutate({ bio: bioValue });
  };

  // Start editing display name
  const startEditDisplayName = () => {
    setDisplayNameValue(profile?.displayName || '');
    setDebouncedDisplayName('');
    setEditingDisplayName(true);
  };

  // Save display name
  const handleSaveDisplayName = () => {
    if (!isDisplayNameFormatValid || isDisplayNameTaken) return;
    saveProfile.mutate(
      { displayName: displayNameValue.trim().toLowerCase() },
      {
        onSuccess: () => {
          toast.success('Username updated');
          setEditingDisplayName(false);
        },
        onError: () => toast.error('Failed to update username'),
      },
    );
  };

  // Cancel editing display name
  const cancelEditDisplayName = () => {
    setEditingDisplayName(false);
    setDisplayNameValue('');
    setDebouncedDisplayName('');
  };

  // Start editing socials
  const startEditSocials = () => {
    setSocialsValue({
      twitter: socials?.twitter || '',
      instagram: socials?.instagram || '',
      facebook: socials?.facebook || '',
      threads: socials?.threads || '',
      linkedin: socials?.linkedin || '',
      github: socials?.github || '',
    });
    setEditingSocials(true);
  };

  // Save socials
  const handleSaveSocials = () => {
    if (!hasSocialChanges) {
      setEditingSocials(false);
      return;
    }

    saveSocials.mutate({
      twitter: socialsValue.twitter || undefined,
      instagram: socialsValue.instagram || undefined,
      facebook: socialsValue.facebook || undefined,
      threads: socialsValue.threads || undefined,
      linkedin: socialsValue.linkedin || undefined,
      github: socialsValue.github || undefined,
    });
  };

  // Start editing gyms
  const startEditGyms = () => {
    setEditingGyms(true);
  };

  // Toggle gym selection
  const handleGymToggle = (gym: MapboxPlace) => {
    const isSelected = selectedGymIds.includes(gym.id);
    if (isSelected) {
      setSelectedGyms((prev) => prev.filter((g) => g.id !== gym.id));
    } else {
      setSelectedGyms((prev) => [...prev, gym]);
    }
  };

  // Save gyms
  const handleSaveGyms = () => {
    saveGyms.mutate(
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

  // Cancel gym editing
  const cancelEditGyms = () => {
    setEditingGyms(false);
    setGymSearch('');
    // Reset to original gyms
    if (gyms.length > 0) {
      const gymPlaces: MapboxPlace[] = gyms.map((gym) => ({
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
      }));
      setSelectedGyms(gymPlaces);
    } else {
      setSelectedGyms([]);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardContent>
          </Card>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile information
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Pencil className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Complete Your Profile
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4 text-sm">
              Set up your profile to connect with others and track your fitness
              journey.
            </p>
            <Button asChild>
              <Link to="/profile/create">Create Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName =
    profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.displayName || 'Anonymous User';

  const heightDisplay = profile.height
    ? profile.unit === 'metric'
      ? `${profile.height} cm`
      : `${Math.floor(profile.height / 30.48)}' ${Math.round((profile.height % 30.48) / 2.54)}"`
    : null;

  return (
    <div className="w-full py-6 space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Hero Profile Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
        {/* Cover Photo */}
        <div className="relative h-40 sm:h-56 w-full group">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-primary/20 via-primary/10 to-background" />
          )}
          {/* Cover upload overlay */}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors" />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleCoverChange}
            className="hidden"
          />
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
            <button
              onClick={async () => {
                const result = await pickImage();
                if (result.file) {
                  uploadCover.mutate(result.file);
                  return;
                }
                if (!result.native) coverInputRef.current?.click();
              }}
              disabled={uploadCover.isPending}
              className="px-3 py-1.5 rounded-xl bg-background/85 backdrop-blur-sm border shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:-translate-y-0.5 hover:bg-background disabled:opacity-50 flex items-center gap-2 text-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {uploadCover.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Edit cover
            </button>
            <p className="rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-xs">
              Stored securely after upload.
            </p>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(var(--primary),.18),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(var(--primary),.14),transparent_55%)] pointer-events-none" />

        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-28 w-28 rounded-3xl border-4 border-background object-cover shadow-xl ring-2 ring-primary/25"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground text-4xl font-bold shadow-xl ring-2 ring-primary/25">
                  {profile.firstName?.[0]?.toUpperCase() || '?'}
                  {profile.lastName?.[0]?.toUpperCase() || ''}
                </div>
              )}
              {/* Hidden file input for avatar upload */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                onClick={async () => {
                  const result = await pickImage();
                  if (result.file) {
                    uploadAvatar.mutate(result.file);
                    return;
                  }
                  if (!result.native) avatarInputRef.current?.click();
                }}
                disabled={uploadAvatar.isPending}
                className="absolute -bottom-2 -right-2 p-2 rounded-full bg-background border shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-105 hover:bg-muted disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Stored securely after upload.
              </p>
            </div>

            {/* Profile Info */}
            <div className="text-center sm:text-left flex-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
                Personal Space
              </p>
              <h1 className="mt-0.5 text-2xl sm:text-3xl font-bold tracking-tight">
                {displayName}
              </h1>
              <TrustBadge
                label="Private by default. Encrypted at rest."
                tooltip="Profile media files are encrypted while stored."
                className="mt-2"
              />

              {/* Editable Display Name */}
              {editingDisplayName ? (
                <div className="mt-2 max-w-xs mx-auto sm:mx-0">
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={displayNameValue}
                      onChange={(e) =>
                        setDisplayNameValue(
                          e.target.value.toLowerCase().replace(/\s/g, ''),
                        )
                      }
                      placeholder="username"
                      className={cn(
                        'pl-9 pr-10 h-10',
                        isDisplayNameTaken &&
                          'border-destructive focus-visible:ring-destructive',
                        isDisplayNameAvailable &&
                          hasDisplayNameChanged &&
                          isDisplayNameFormatValid &&
                          'border-green-500 focus-visible:ring-green-500',
                      )}
                      maxLength={30}
                    />
                    {/* Status indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingDisplayName ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : isDisplayNameTaken ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : isDisplayNameAvailable &&
                        hasDisplayNameChanged &&
                        isDisplayNameFormatValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : null}
                    </div>
                  </div>
                  {/* Error messages */}
                  {displayNameFormatError && displayNameValue.length > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      {displayNameFormatError}
                    </p>
                  )}
                  {isDisplayNameTaken && (
                    <p className="text-xs text-destructive mt-1">
                      This username is already taken
                    </p>
                  )}
                  {isDisplayNameAvailable &&
                    hasDisplayNameChanged &&
                    isDisplayNameFormatValid && (
                      <p className="text-xs text-green-500 mt-1">
                        Username is available!
                      </p>
                    )}
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditDisplayName}
                      disabled={saveProfile.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDisplayName}
                      disabled={
                        saveProfile.isPending ||
                        !isDisplayNameFormatValid ||
                        isDisplayNameTaken ||
                        !hasDisplayNameChanged
                      }
                    >
                      {saveProfile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              ) : profile.displayName ? (
                <button
                  onClick={startEditDisplayName}
                  className="group/username inline-flex items-center gap-1.5 text-muted-foreground mt-1 hover:text-primary transition-colors"
                >
                  <span>@{profile.displayName}</span>
                  <Pencil className="h-3.5 w-3.5 opacity-70 group-hover/username:opacity-100 transition-opacity" />
                </button>
              ) : (
                <button
                  onClick={startEditDisplayName}
                  className="inline-flex items-center gap-1.5 text-muted-foreground mt-1 hover:text-primary transition-colors text-sm"
                >
                  <AtSign className="h-3.5 w-3.5" />
                  <span>Set username</span>
                </button>
              )}

              {/* About (inline) */}
              <div className="mt-1.5 max-w-2xl">
                {editingBio ? (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-3">
                    <Textarea
                      value={bioValue}
                      onChange={(e) => setBioValue(e.target.value)}
                      placeholder="Tell others about yourself..."
                      className="min-h-24 resize-none"
                      maxLength={255}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {bioValue.length}/255
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBio(false)}
                          disabled={saveProfile.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveBio}
                          disabled={saveProfile.isPending || !hasBioChanges}
                        >
                          {saveProfile.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : profile.bio ? (
                  <button
                    onClick={startEditBio}
                    className="group inline-flex items-start gap-2 text-left text-sm leading-relaxed text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit about"
                  >
                    <span>{profile.bio}</span>
                    <Pencil className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-60 group-hover:opacity-100" />
                  </button>
                ) : (
                  <button
                    onClick={startEditBio}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />+ Add a short bio
                  </button>
                )}
              </div>

              {/* Quick Stats Pills */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3.5">
                {age && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/85 backdrop-blur-sm border text-sm font-medium shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {age} years old
                  </div>
                )}
                {heightDisplay && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/85 backdrop-blur-sm border text-sm font-medium shadow-sm">
                    <Ruler className="h-3.5 w-3.5 text-primary" />
                    {heightDisplay}
                  </div>
                )}
                {selectedGyms.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/85 backdrop-blur-sm border text-sm font-medium shadow-sm">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {selectedGyms.length} gym
                    {selectedGyms.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Social Links - Desktop */}
            {activeSocials.length > 0 && !editingSocials && (
              <div className="hidden sm:flex items-center gap-1">
                {activeSocials.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.key}
                      href={`${social.urlPrefix}${social.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-background/85 backdrop-blur-sm border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all hover:scale-105"
                      title={`${social.label}: @${social.username}`}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Social Links - Mobile */}
          {activeSocials.length > 0 && !editingSocials && (
            <div className="flex sm:hidden justify-center gap-1 mt-4">
              {activeSocials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.key}
                    href={`${social.urlPrefix}${social.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-background/85 backdrop-blur-sm border hover:bg-primary hover:text-primary-foreground transition-colors"
                    title={`${social.label}: @${social.username}`}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <div className="space-y-7">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition-colors hover:border-primary/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Workouts
                </p>
                <p className="text-3xl font-semibold leading-tight mt-1">
                  {workoutStatsData?.success
                    ? workoutStatsData.data.totalSessions
                    : 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition-colors hover:border-primary/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Connections
                </p>
                <p className="text-3xl font-semibold leading-tight mt-1">0</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition-colors hover:border-primary/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Personal Records
                </p>
                <p className="text-3xl font-semibold leading-tight mt-1">
                  {prsData?.success ? prsData.data.total : 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Reorganized Profile Layout */}
        <div className="space-y-6">
          <div className="space-y-6">
            {/* Personal Details Card */}
            <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm transition-all">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Ruler className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">Personal Details</h3>
                  </div>
                  {!editingPersonalDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditPersonalDetails}
                      className={editButtonClass}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="p-5">
                  {editingPersonalDetails ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthday">Birthday</Label>
                        <Input
                          id="birthday"
                          type="date"
                          value={birthdayValue}
                          max={todayDate}
                          onChange={(e) => setBirthdayValue(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Height</Label>
                        {(profile?.unit || 'imperial') === 'imperial' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Input
                                type="number"
                                min="1"
                                max="8"
                                step="1"
                                placeholder="Feet"
                                value={heightFeetValue}
                                onChange={(e) =>
                                  setHeightFeetValue(e.target.value)
                                }
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                ft
                              </p>
                            </div>
                            <div>
                              <Input
                                type="number"
                                min="0"
                                max="11"
                                step="1"
                                placeholder="Inches"
                                value={heightInchesValue}
                                onChange={(e) =>
                                  setHeightInchesValue(e.target.value)
                                }
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                in
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Input
                              type="number"
                              min="50"
                              max="300"
                              step="1"
                              placeholder="Height in centimeters"
                              value={heightCmValue}
                              onChange={(e) => setHeightCmValue(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              cm
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPersonalDetails(false)}
                          disabled={saveProfile.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSavePersonalDetails}
                          disabled={
                            saveProfile.isPending ||
                            hasInvalidPersonalDetails ||
                            !isPersonalDetailsDirty
                          }
                        >
                          {saveProfile.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Birthday
                        </div>
                        <p className="text-sm font-medium">
                          {birthdayDisplay || 'Not set'}
                          {age ? ` (${age} yrs)` : ''}
                        </p>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Ruler className="h-4 w-4" />
                          Height
                        </div>
                        <p className="text-sm font-medium">
                          {heightDisplay || 'Not set'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Social Links Card */}
            <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm transition-all">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">Social Links</h3>
                  </div>
                  {!editingSocials && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditSocials}
                      className={editButtonClass}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="p-5">
                  {editingSocials ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {socialKeys.map((key) => {
                          const platform = socialPlatforms[key];
                          const Icon = platform.icon;
                          return (
                            <div key={key} className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <Icon className="h-4 w-4" />
                              </div>
                              <Input
                                value={socialsValue[key]}
                                onChange={(e) =>
                                  setSocialsValue((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                placeholder={platform.label}
                                className="pl-10 h-10"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSocials(false)}
                          disabled={saveSocials.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveSocials}
                          disabled={saveSocials.isPending || !hasSocialChanges}
                        >
                          {saveSocials.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : activeSocials.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeSocials.map((social) => {
                        const Icon = social.icon;
                        return (
                          <a
                            key={social.key}
                            href={`${social.urlPrefix}${social.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/35 hover:bg-primary/5 group/link"
                          >
                            <div className="p-2 rounded-lg bg-background group-hover/link:bg-primary/10 transition-colors">
                              <Icon className="h-4 w-4 text-muted-foreground group-hover/link:text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {social.label}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                @{social.username}
                              </p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      onClick={startEditSocials}
                      className="w-full py-8 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground text-sm hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      Click to add social links...
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Gyms Card */}
            <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm transition-all">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">My Gyms</h3>
                    {selectedGyms.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedGyms.length}
                      </Badge>
                    )}
                  </div>
                  {!editingGyms && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditGyms}
                      className={editButtonClass}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="p-5">
                  {editingGyms ? (
                    <div className="space-y-4">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search gyms by name or location..."
                          value={gymSearch}
                          onChange={(e) => setGymSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Selected Gyms Pills */}
                      {selectedGyms.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedGyms.map((gym) => (
                            <button
                              type="button"
                              key={gym.id}
                              onClick={() => handleGymToggle(gym)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/90"
                            >
                              {gym.name}
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Gym Results */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {isGymSearching ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <Skeleton
                                key={i}
                                className="h-16 w-full rounded-xl"
                              />
                            ))}
                          </div>
                        ) : gymSearch && gymResults.length === 0 ? (
                          <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                            <Search className="mx-auto h-8 w-8 text-muted-foreground/30" />
                            <p className="mt-3 text-sm text-muted-foreground">
                              No places found matching "{gymSearch}"
                            </p>
                            {mapboxError && (
                              <p className="mt-1 text-xs text-destructive">
                                {mapboxError}
                              </p>
                            )}
                          </div>
                        ) : gymResults.length > 0 ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {gymResults.map((gym) => (
                              <button
                                type="button"
                                key={gym.id}
                                onClick={() => handleGymToggle(gym)}
                                className={cn(
                                  'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                                  selectedGymIds.includes(gym.id)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-transparent bg-muted/50 hover:border-muted-foreground/20',
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold transition-colors',
                                    selectedGymIds.includes(gym.id)
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  {gym.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {gym.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {gym.formattedAddress ||
                                      `${gym.city}${gym.state ? `, ${gym.state}` : ''}`}
                                  </p>
                                </div>
                                {selectedGymIds.includes(gym.id) && (
                                  <Check className="h-5 w-5 text-primary shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : !gymSearch ? (
                          <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                            <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" />
                            <p className="mt-3 text-sm text-muted-foreground">
                              Search for a gym to add it to your profile
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {/* Save/Cancel buttons */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditGyms}
                          disabled={saveGyms.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveGyms}
                          disabled={saveGyms.isPending}
                        >
                          {saveGyms.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : selectedGyms.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedGyms.map((gym) => (
                        <div
                          key={gym.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5"
                        >
                          <div className="p-2 rounded-lg bg-primary/10">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{gym.name}</p>
                            {(gym.city || gym.state || gym.country) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[gym.city, gym.state, gym.country]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={startEditGyms}
                      className="w-full py-12 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground text-sm hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <MapPin className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      Click to add your gyms...
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
