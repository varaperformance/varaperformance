import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Lightbulb } from 'lucide-react';
import {
  useExercises,
  type ExerciseResponse,
  type ExerciseCategory,
  type MuscleGroup as APIMuscleGroup,
  type Equipment as APIEquipment,
  type ExerciseDifficulty,
} from '@/features/health';

// Local type for UI (lowercase for display)
interface Exercise {
  id: string;
  slug: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  description: string;
  instructions: string[];
  videoUrl: string;
  thumbnailUrl: string;
  tips: string[];
  variations: string[];
}

// Transform API response to local format
const transformExercise = (exercise: ExerciseResponse): Exercise => ({
  id: exercise.id,
  slug: exercise.slug,
  name: exercise.name,
  category: exercise.category.toLowerCase(),
  muscleGroups: exercise.muscleGroups.map((mg) =>
    mg.muscleGroup.toLowerCase().replace('_', '-'),
  ),
  equipment: exercise.equipment.map((eq) =>
    eq.equipment.toLowerCase().replace('_', '-'),
  ),
  difficulty: exercise.difficulty.toLowerCase(),
  description: exercise.description,
  instructions: exercise.instructions,
  videoUrl: exercise.videoUrl || '',
  thumbnailUrl: exercise.thumbnailUrl || '',
  tips: exercise.tips,
  variations: exercise.variations,
});

const VIDEO_FILE_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];

const isDirectVideoFile = (url?: string) => {
  if (!url) return false;
  const normalized = url.toLowerCase().split('?')[0];
  return VIDEO_FILE_EXTENSIONS.some((ext) => normalized.endsWith(ext));
};

const formatEquipmentLabel = (equipment: string) =>
  equipment.charAt(0).toUpperCase() + equipment.slice(1).replace('-', ' ');

const MediaPlaceholder = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 text-slate-200">
    <div className="flex flex-col items-center gap-2 text-center">
      <DumbbellIcon />
      <span className="text-xs tracking-wide uppercase text-slate-300">
        {label}
      </span>
    </div>
  </div>
);

type Category =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'plyometrics'
  | 'bodyweight';
type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'full-body';
type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'resistance-band'
  | 'cardio-machine';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type ViewMode = 'grid' | 'list';

// Map local filter values to API enum values
const categoryToAPI: Record<Category, ExerciseCategory> = {
  strength: 'STRENGTH',
  cardio: 'CARDIO',
  flexibility: 'FLEXIBILITY',
  plyometrics: 'PLYOMETRICS',
  bodyweight: 'BODYWEIGHT',
};

const muscleToAPI: Record<MuscleGroup, APIMuscleGroup> = {
  chest: 'CHEST',
  back: 'BACK',
  shoulders: 'SHOULDERS',
  biceps: 'BICEPS',
  triceps: 'TRICEPS',
  legs: 'LEGS',
  glutes: 'GLUTES',
  core: 'CORE',
  'full-body': 'FULL_BODY',
};

const equipmentToAPI: Record<Equipment, APIEquipment> = {
  barbell: 'BARBELL',
  dumbbell: 'DUMBBELL',
  cable: 'CABLE',
  machine: 'MACHINE',
  bodyweight: 'BODYWEIGHT',
  kettlebell: 'KETTLEBELL',
  'resistance-band': 'RESISTANCE_BAND',
  'cardio-machine': 'CARDIO_MACHINE',
};

const difficultyToAPI: Record<Difficulty, ExerciseDifficulty> = {
  beginner: 'BEGINNER',
  intermediate: 'INTERMEDIATE',
  advanced: 'ADVANCED',
};

// Filter options
const categories: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'plyometrics', label: 'Plyometrics' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

const muscleGroupOptions: { value: MuscleGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All Muscles' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'legs', label: 'Legs' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'core', label: 'Core' },
  { value: 'full-body', label: 'Full Body' },
];

const equipmentOptions: { value: Equipment | 'all'; label: string }[] = [
  { value: 'all', label: 'All Equipment' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'resistance-band', label: 'Resistance Band' },
];

const difficultyOptions: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// Icons
const SearchIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const PlayIcon = () => (
  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const FilterIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
    />
  </svg>
);

const DumbbellIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

const GridIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const ListIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

// Difficulty badge colors
const difficultyColors: Record<Difficulty, string> = {
  beginner: 'bg-green-500/20 text-green-500 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-500 border-red-500/30',
};

// Exercise Card Component
const ExerciseCard = ({
  exercise,
  onClick,
  viewMode = 'grid',
}: {
  exercise: Exercise;
  onClick: () => void;
  viewMode?: ViewMode;
}) => {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [previewVideoFailed, setPreviewVideoFailed] = useState(false);

  const hasThumbnail = !!exercise.thumbnailUrl && !thumbnailFailed;
  const hasDirectVideo =
    !!exercise.videoUrl &&
    isDirectVideoFile(exercise.videoUrl) &&
    !previewVideoFailed;

  const renderCardMedia = () => {
    if (hasThumbnail) {
      return (
        <img
          src={exercise.thumbnailUrl}
          alt={exercise.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          onError={() => setThumbnailFailed(true)}
        />
      );
    }

    if (hasDirectVideo) {
      return (
        <video
          src={exercise.videoUrl}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setPreviewVideoFailed(true)}
        />
      );
    }

    return <MediaPlaceholder label="Exercise Media" />;
  };

  if (viewMode === 'list') {
    return (
      <div
        className="group flex cursor-pointer items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-3 transition-all hover:border-primary/50 hover:shadow-md"
        onClick={onClick}
      >
        {/* Thumbnail */}
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md">
          {renderCardMedia()}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{exercise.name}</h3>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-xs',
                  difficultyColors[exercise.difficulty as Difficulty],
                )}
              >
                {exercise.difficulty.charAt(0).toUpperCase() +
                  exercise.difficulty.slice(1)}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              {exercise.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {exercise.muscleGroups.slice(0, 3).map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                </span>
              ))}
              {exercise.muscleGroups.length > 3 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  +{exercise.muscleGroups.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Equipment */}
          <div className="hidden shrink-0 sm:block">
            <div className="flex flex-wrap justify-end gap-1">
              {exercise.equipment.slice(0, 2).map((equip) => (
                <span
                  key={equip}
                  className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {equip.charAt(0).toUpperCase() +
                    equip.slice(1).replace('-', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <svg
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-muted/70 bg-card/60 py-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      onClick={onClick}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-emerald-500/60 to-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative aspect-video overflow-hidden">
        {renderCardMedia()}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PlayIcon />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
          {exercise.muscleGroups.slice(0, 2).map((muscle) => (
            <span
              key={muscle}
              className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm"
            >
              {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
            </span>
          ))}
          {exercise.muscleGroups.length > 2 && (
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
              +{exercise.muscleGroups.length - 2}
            </span>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{exercise.name}</h3>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-xs',
              difficultyColors[exercise.difficulty as Difficulty],
            )}
          >
            {exercise.difficulty.charAt(0).toUpperCase() +
              exercise.difficulty.slice(1)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {exercise.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {exercise.equipment.map((equip) => (
            <span
              key={equip}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {formatEquipmentLabel(equip)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Exercise Modal Component
const ExerciseModal = ({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const hasVideo = !!exercise.videoUrl && !videoFailed;
  const hasThumbnail = !!exercise.thumbnailUrl && !thumbnailFailed;

  const renderModalMedia = () => {
    if (hasVideo) {
      if (isDirectVideoFile(exercise.videoUrl)) {
        return (
          <video
            src={exercise.videoUrl}
            className="h-full w-full object-cover"
            controls
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoFailed(true)}
          />
        );
      }

      return (
        <iframe
          src={exercise.videoUrl}
          title={exercise.name}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setVideoFailed(true)}
        />
      );
    }

    if (hasThumbnail) {
      return (
        <img
          src={exercise.thumbnailUrl}
          alt={exercise.name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setThumbnailFailed(true)}
        />
      );
    }

    return <MediaPlaceholder label="No Media Available" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border/50 bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="sticky top-0 z-20 flex items-center justify-end gap-2 bg-background/80 p-3 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Media */}
        <div className="aspect-video w-full">{renderModalMedia()}</div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{exercise.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    difficultyColors[exercise.difficulty as Difficulty],
                  )}
                >
                  {exercise.difficulty.charAt(0).toUpperCase() +
                    exercise.difficulty.slice(1)}
                </span>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm">
                  {exercise.category.charAt(0).toUpperCase() +
                    exercise.category.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {exercise.muscleGroups.map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                >
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                </span>
              ))}
            </div>
          </div>

          <p className="mb-6 text-muted-foreground">{exercise.description}</p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Instructions */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  1
                </span>
                How to Perform
              </h3>
              <ol className="space-y-2">
                {exercise.instructions.map((instruction, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-muted-foreground"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                      {i + 1}
                    </span>
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs text-black">
                  !
                </span>
                Pro Tips
              </h3>
              <ul className="space-y-2">
                {exercise.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-muted-foreground"
                  >
                    <svg
                      className="h-5 w-5 shrink-0 text-yellow-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Variations */}
          <div className="mt-6">
            <h3 className="mb-3 font-semibold">Variations</h3>
            <div className="flex flex-wrap gap-2">
              {exercise.variations.map((variation) => (
                <span
                  key={variation}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  {variation}
                </span>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="mt-6 border-t border-border pt-6">
            <h3 className="mb-3 font-semibold">Equipment Needed</h3>
            <div className="flex flex-wrap gap-2">
              {exercise.equipment.map((equip) => (
                <span
                  key={equip}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm"
                >
                  <DumbbellIcon />
                  {formatEquipmentLabel(equip)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Filter Dropdown Component
const FilterDropdown = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full cursor-pointer appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <svg
      className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

const ExercisesPage = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>(
    'all',
  );
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    'all',
  );
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | 'all'>(
    'all',
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    Difficulty | 'all'
  >('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Fetch exercises from API with filters
  const {
    data: exercisesData,
    isLoading,
    error,
  } = useExercises({
    search: searchQuery || undefined,
    category:
      selectedCategory !== 'all' ? categoryToAPI[selectedCategory] : undefined,
    muscleGroup:
      selectedMuscle !== 'all' ? muscleToAPI[selectedMuscle] : undefined,
    equipment:
      selectedEquipment !== 'all'
        ? equipmentToAPI[selectedEquipment]
        : undefined,
    difficulty:
      selectedDifficulty !== 'all'
        ? difficultyToAPI[selectedDifficulty]
        : undefined,
  });

  // Transform API response to local format
  const filteredExercises = useMemo(() => {
    if (!exercisesData?.data?.items) return [];
    return exercisesData.data.items.map(transformExercise);
  }, [exercisesData]);

  const activeFiltersCount = [
    selectedCategory,
    selectedMuscle,
    selectedEquipment,
    selectedDifficulty,
  ].filter((f) => f !== 'all').length;

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedMuscle('all');
    setSelectedEquipment('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Movement Library
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Exercise Library
            </h1>
            <p className="text-muted-foreground mt-2">
              Learn proper form with guided videos and training notes for every
              level.
            </p>
          </div>
          <Badge
            variant="secondary"
            className="self-start rounded-full px-3 py-1 text-xs"
          >
            <DumbbellIcon />
            <span className="ml-1">
              {isLoading ? 'Loading' : `${filteredExercises.length} moves`}
            </span>
          </Badge>
        </div>

        <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Use search first, then filter and switch views with the icon
              controls to narrow down movements quickly.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <div className="space-y-4 rounded-2xl border bg-card/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <SearchIcon />
            </div>
            <Input
              type="text"
              placeholder="Search exercises, muscles, or equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
              aria-label="Toggle filters"
              title="Toggle filters"
            >
              <FilterIcon />
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                aria-label="Clear filters"
                title="Clear filters"
              >
                <SearchIcon />
              </Button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <GridIcon />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <ListIcon />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          className={cn(
            'grid gap-3 transition-all',
            !isMobile && 'sm:grid-cols-2 lg:grid-cols-4',
            showFilters ? 'grid' : 'hidden lg:grid',
          )}
        >
          <FilterDropdown
            value={selectedCategory}
            options={categories}
            onChange={(v) => setSelectedCategory(v as Category | 'all')}
          />
          <FilterDropdown
            value={selectedMuscle}
            options={muscleGroupOptions}
            onChange={(v) => setSelectedMuscle(v as MuscleGroup | 'all')}
          />
          <FilterDropdown
            value={selectedEquipment}
            options={equipmentOptions}
            onChange={(v) => setSelectedEquipment(v as Equipment | 'all')}
          />
          <FilterDropdown
            value={selectedDifficulty}
            options={difficultyOptions}
            onChange={(v) => setSelectedDifficulty(v as Difficulty | 'all')}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="inline-block h-4 w-24" />
          ) : (
            <>
              <span className="font-medium text-foreground">
                {filteredExercises.length}
              </span>{' '}
              exercises found
            </>
          )}
        </p>
      </div>

      {/* Exercise Grid/List */}
      {isLoading ? (
        <div
          className={cn(
            viewMode === 'grid'
              ? `grid gap-4 ${!isMobile ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none`
              : 'space-y-3',
          )}
        >
          {Array.from({ length: 8 }).map((_, i) =>
            viewMode === 'grid' ? (
              <Card
                key={i}
                className="overflow-hidden border-border/50 bg-card/50 py-0"
              >
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="mt-3 flex gap-1">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <Skeleton className="h-20 w-32 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            Failed to load exercises
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      ) : filteredExercises.length > 0 ? (
        <div
          className={cn(
            viewMode === 'grid'
              ? `grid gap-4 ${!isMobile ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : ''}`
              : 'space-y-3',
          )}
        >
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              viewMode={viewMode}
              onClick={() => setSelectedExercise(exercise)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <SearchIcon />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No exercises found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Try adjusting your filters or search query
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={clearFilters}
            aria-label="Clear filters"
            title="Clear filters"
          >
            <SearchIcon />
          </Button>
        </div>
      )}

      {/* Exercise Modal */}
      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
};

export default ExercisesPage;
