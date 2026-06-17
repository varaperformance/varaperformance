import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Loader2, Plus, Trash2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { pickImage } from '@/lib/camera';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth';
import {
  useApplyCoach,
  useUploadCoachCertificationPhoto,
  type CoachCertification,
  type CoachSpecialty,
} from '@/features/coaching';
import { useMapboxSearch } from '@/hooks/use-mapbox';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

const SPECIALTY_OPTIONS: { value: CoachSpecialty; label: string }[] = [
  { value: 'STRENGTH', label: 'Strength' },
  { value: 'BODYBUILDING', label: 'Bodybuilding' },
  { value: 'POWERLIFTING', label: 'Powerlifting' },
  { value: 'CROSSFIT', label: 'CrossFit' },
  { value: 'NUTRITION', label: 'Nutrition' },
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'ENDURANCE', label: 'Endurance' },
];

const INITIAL_STATE = {
  title: '',
  bio: '',
  location: '',
  experienceYears: '',
};

type CertificationFormState = {
  name: string;
  lookupUrl: string;
  photoUrl: string;
  certId: string;
};

const EMPTY_CERTIFICATION: CertificationFormState = {
  name: '',
  lookupUrl: '',
  photoUrl: '',
  certId: '',
};

type CoachDesignation = 'CERTIFIED' | 'INFLUENCER';

export default function ApplyCoachPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const applyCoach = useApplyCoach();
  const uploadCertificationPhoto = useUploadCoachCertificationPhoto();

  const [form, setForm] = useState(INITIAL_STATE);
  const [designation, setDesignation] = useState<CoachDesignation>('CERTIFIED');
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationResults, setShowLocationResults] = useState(false);
  const [specialties, setSpecialties] = useState<CoachSpecialty[]>([]);
  const [certifications, setCertifications] = useState<
    CertificationFormState[]
  >([{ ...EMPTY_CERTIFICATION }]);
  const [uploadingCertificationIndex, setUploadingCertificationIndex] =
    useState<number | null>(null);
  const [influencerSocialLinks, setInfluencerSocialLinks] = useState<string[]>([
    '',
  ]);

  const {
    setQuery: setLocationQuery,
    results: locationResults,
    isSearching: isSearchingLocation,
    error: locationError,
  } = useMapboxSearch({ limit: 8, useProximity: true });

  const certificationChecks = useMemo(
    () =>
      certifications.map((cert) => {
        const evidenceCount = [
          cert.lookupUrl,
          cert.photoUrl,
          cert.certId,
        ].filter((value) => value.trim().length > 0).length;
        const hasName = cert.name.trim().length > 0;
        return {
          hasName,
          evidenceCount,
          isValid: hasName && evidenceCount >= 2,
        };
      }),
    [certifications],
  );

  const hasValidCertifications =
    certifications.length > 0 &&
    certificationChecks.every((item) => item.isValid);

  const validInfluencerLinks = influencerSocialLinks
    .map((link) => link.trim())
    .filter((link) => link.length > 0);

  const hasValidInfluencerLinks = validInfluencerLinks.length > 0;

  const canSubmit = useMemo(() => {
    return (
      form.title.trim().length > 0 &&
      form.bio.trim().length >= 40 &&
      form.location.trim().length > 0 &&
      form.experienceYears.trim().length > 0 &&
      Number(form.experienceYears) >= 0 &&
      (designation === 'CERTIFIED'
        ? hasValidCertifications
        : hasValidInfluencerLinks) &&
      specialties.length > 0
    );
  }, [
    designation,
    form,
    specialties,
    hasValidCertifications,
    hasValidInfluencerLinks,
  ]);

  const updateCertification = (
    index: number,
    key: keyof CertificationFormState,
    value: string,
  ) => {
    setCertifications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addCertification = () => {
    setCertifications((prev) => [...prev, { ...EMPTY_CERTIFICATION }]);
  };

  const removeCertification = (index: number) => {
    setCertifications((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addInfluencerLink = () => {
    setInfluencerSocialLinks((prev) => [...prev, '']);
  };

  const updateInfluencerLink = (index: number, value: string) => {
    setInfluencerSocialLinks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeInfluencerLink = (index: number) => {
    setInfluencerSocialLinks((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCertificationPhotoUpload = async (
    index: number,
    file?: File | null,
  ) => {
    if (!file) {
      return;
    }

    setUploadingCertificationIndex(index);
    try {
      const response = await uploadCertificationPhoto.mutateAsync(file);
      updateCertification(index, 'photoUrl', response.data.photoUrl);
      toast.success('Certification photo uploaded');
    } catch {
      toast.error('Failed to upload certification photo');
    } finally {
      setUploadingCertificationIndex(null);
    }
  };

  const toggleSpecialty = (specialty: CoachSpecialty) => {
    setSpecialties((prev) => {
      if (prev.includes(specialty)) {
        return prev.filter((item) => item !== specialty);
      }
      if (prev.length >= 5) {
        toast.error('Choose up to 5 specialties');
        return prev;
      }
      return [...prev, specialty];
    });
  };

  const onSubmit = () => {
    const payloadCertifications: CoachCertification[] =
      designation === 'CERTIFIED'
        ? certifications.map((cert) => ({
            name: cert.name.trim(),
            lookupUrl: cert.lookupUrl.trim() || undefined,
            photoUrl: cert.photoUrl.trim() || undefined,
            certId: cert.certId.trim() || undefined,
          }))
        : [];

    applyCoach.mutate(
      {
        title: form.title.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        experienceYears: Number(form.experienceYears),
        designation,
        certifications: payloadCertifications,
        influencerSocialLinks:
          designation === 'INFLUENCER' ? validInfluencerLinks : [],
        specialties,
      },
      {
        onSuccess: () => {
          toast.success('Coach application submitted for review');
          navigate('/coaches');
        },
        onError: () => {
          toast.error('Unable to submit application. Please try again.');
        },
      },
    );
  };

  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/coaches">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Apply as a Coach
            </h1>
            <p className="text-sm text-muted-foreground">
              Logged in as {user?.email}. Applications are reviewed before
              approval.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Coach Application</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill out your coaching profile details. Admin will review and
              approve your application.
            </p>
          </CardHeader>
          <CardContent
            className={cn(
              'grid gap-4',
              isMobile ? 'grid-cols-1' : 'md:grid-cols-2',
            )}
          >
            <div className="space-y-2 md:col-span-2">
              <Label>Application Type</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={designation === 'CERTIFIED' ? 'default' : 'outline'}
                  onClick={() => setDesignation('CERTIFIED')}
                >
                  Certified Coach
                </Button>
                <Button
                  type="button"
                  variant={designation === 'INFLUENCER' ? 'default' : 'outline'}
                  onClick={() => setDesignation('INFLUENCER')}
                >
                  Influencer Coach
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose certified if you are submitting credential verification,
                or influencer if you are applying with social platform proof.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Strength and Conditioning Coach"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={locationSearch || form.location}
                onFocus={() => setShowLocationResults(true)}
                onChange={(event) => {
                  const value = event.target.value;
                  setLocationSearch(value);
                  setForm((prev) => ({ ...prev, location: value }));
                  setLocationQuery(value);
                  setShowLocationResults(true);
                }}
                placeholder="Austin, TX"
              />
              {showLocationResults && locationSearch.trim().length > 0 && (
                <div className="max-h-56 overflow-auto rounded-md border bg-card p-1">
                  {isSearchingLocation ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Searching locations...
                    </p>
                  ) : locationResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      No location matches found.
                    </p>
                  ) : (
                    locationResults.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          const selectedLocation =
                            place.formattedAddress ||
                            `${place.city}${place.state ? `, ${place.state}` : ''}`;
                          setForm((prev) => ({
                            ...prev,
                            location: selectedLocation,
                          }));
                          setLocationSearch(selectedLocation);
                          setLocationQuery('');
                          setShowLocationResults(false);
                        }}
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
              {locationError && (
                <p className="text-xs text-destructive">{locationError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use Mapbox location suggestions for consistent address data.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceYears">Years of Experience</Label>
              <Input
                id="experienceYears"
                type="number"
                min={0}
                max={80}
                value={form.experienceYears}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    experienceYears: event.target.value,
                  }))
                }
                placeholder="8"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={6}
                value={form.bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bio: event.target.value }))
                }
                placeholder="Describe your coaching background, philosophy, and who you help."
              />
              <p className="text-xs text-muted-foreground">
                Minimum 40 characters
              </p>
            </div>

            {designation === 'CERTIFIED' ? (
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Certifications</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCertification}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add certification
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  For each certification provide at least 2 of: lookup link,
                  photo upload, cert id.
                </p>

                {certifications.map((certification, index) => {
                  const check = certificationChecks[index];
                  return (
                    <div
                      key={`cert-${index}`}
                      className="space-y-3 rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Certification #{index + 1}
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeCertification(index)}
                          disabled={certifications.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div
                        className={cn(
                          'grid gap-3',
                          isMobile ? 'grid-cols-1' : 'md:grid-cols-2',
                        )}
                      >
                        <div className="space-y-2 md:col-span-2">
                          <Label>Name</Label>
                          <Input
                            value={certification.name}
                            onChange={(event) =>
                              updateCertification(
                                index,
                                'name',
                                event.target.value,
                              )
                            }
                            placeholder="NSCA-CSCS"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>License/Cert ID Number</Label>
                          <Input
                            value={certification.certId}
                            onChange={(event) =>
                              updateCertification(
                                index,
                                'certId',
                                event.target.value,
                              )
                            }
                            placeholder="CSCS-123456"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>License/Cert ID Lookup Link</Label>
                          <Input
                            value={certification.lookupUrl}
                            onChange={(event) =>
                              updateCertification(
                                index,
                                'lookupUrl',
                                event.target.value,
                              )
                            }
                            placeholder="https://..."
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Upload Photo of Certification</Label>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Input
                              type="file"
                              accept="image/*"
                              disabled={uploadingCertificationIndex === index}
                              onChange={(event) =>
                                handleCertificationPhotoUpload(
                                  index,
                                  event.target.files?.[0],
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingCertificationIndex === index}
                              onClick={async () => {
                                const { file } = await pickImage();
                                if (file)
                                  handleCertificationPhotoUpload(index, file);
                              }}
                            >
                              <Camera className="mr-2 h-4 w-4" />
                              Take Photo
                            </Button>
                          </div>
                          {uploadingCertificationIndex === index && (
                            <p className="text-xs text-muted-foreground">
                              Uploading certification photo...
                            </p>
                          )}
                          {certification.photoUrl && (
                            <a
                              className="text-xs text-primary underline"
                              href={certification.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View uploaded certificate image
                            </a>
                          )}
                        </div>
                      </div>

                      <p
                        className={cn(
                          'text-xs',
                          check?.isValid
                            ? 'text-green-600'
                            : 'text-muted-foreground',
                        )}
                      >
                        {check?.isValid
                          ? 'Certification evidence requirement met'
                          : `Evidence fields completed: ${check?.evidenceCount ?? 0} of 2 required`}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Social Media Accounts</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addInfluencerLink}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provide at least one social profile URL so admins can verify
                  your coaching influence.
                </p>
                {influencerSocialLinks.map((link, index) => (
                  <div key={`social-${index}`} className="flex gap-2">
                    <Input
                      value={link}
                      onChange={(event) =>
                        updateInfluencerLink(index, event.target.value)
                      }
                      placeholder="https://instagram.com/yourhandle"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeInfluencerLink(index)}
                      disabled={influencerSocialLinks.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Specialties (select up to 5)</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map((option) => {
                  const selected = specialties.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleSpecialty(option.value)}
                      className="outline-none"
                    >
                      <Badge variant={selected ? 'default' : 'secondary'}>
                        {option.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button
                disabled={!canSubmit || applyCoach.isPending}
                onClick={onSubmit}
              >
                {applyCoach.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
