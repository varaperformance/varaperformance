import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollIndicator } from '@/components/ui/scroll-indicator';
import { useSwipeableTabs } from '@/hooks/use-swipeable-tabs';
import { useNavigate } from 'react-router';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  formatDateInTimezone,
  getRelativeDateInTimezone,
  createTimestampForDate,
} from '@varaperformance/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import {
  Plus,
  Trash2,
  Settings,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Star,
  Clock,
  CheckCircle2,
  Scan,
  Camera,
  X,
  PlusCircle,
  Share2,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import { useTimezone } from '@/features/profile';
import { isNativeApp } from '@/lib/capacitor';
import { hideKeyboard } from '@/lib/keyboard';
import {
  BarcodeScanner as MlkitBarcodeScanner,
  BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';
import {
  useDailyNutritionSummary,
  useInfiniteSearchFoods,
  useSearchByBarcode,
  useLogFood,
  useDeleteFoodLog,
  useNutritionGoal,
  useUpdateNutritionGoal,
  useFavorites,
  useRecentFoods,
  useAddFavorite,
  useRemoveFavorite,
  useCreateFood,
  useUpdateFood,
  type FoodListItem,
  type FoodLogResponse,
  type MealType,
} from '@/features/health';

// ==================== Constants ====================

const MEAL_INFO: Record<
  MealType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  BREAKFAST: {
    label: 'Breakfast',
    icon: Coffee,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-l-amber-500',
  },
  LUNCH: {
    label: 'Lunch',
    icon: Sun,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-l-sky-500',
  },
  DINNER: {
    label: 'Dinner',
    icon: Moon,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-l-violet-500',
  },
  SNACKS: {
    label: 'Snacks',
    icon: Cookie,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-l-rose-500',
  },
};

type ElevateMealAttachment = {
  mealType: MealType;
  mealLabel: string;
  date: string;
  itemCount: number;
  names: string[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  imageUrl?: string | null;
};

const buildElevateMealPayload = (input: {
  mealType: MealType;
  logs: FoodLogResponse[];
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}): string => {
  const {
    mealType,
    logs,
    date,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
  } = input;

  const names = logs
    .map(
      (log) => log.recipe?.name || log.food?.name || log.quickAddName || 'Meal',
    )
    .filter((name): name is string => Boolean(name))
    .slice(0, 4);

  const mealLabel = MEAL_INFO[mealType].label;
  const coverImage = logs.find((log) => Boolean(log.recipe?.imageUrl));

  const payload: ElevateMealAttachment[] = [
    {
      mealType,
      mealLabel,
      date,
      itemCount: logs.length,
      names,
      totalCalories: Math.max(0, Math.round(totalCalories)),
      totalProtein: Math.max(0, Math.round(totalProtein)),
      totalCarbs: Math.max(0, Math.round(totalCarbs)),
      totalFat: Math.max(0, Math.round(totalFat)),
      imageUrl: coverImage?.recipe?.imageUrl ?? null,
    },
  ];

  return encodeURIComponent(JSON.stringify(payload));
};

// ==================== Progress Ring Component ====================

function ProgressRing({
  value,
  max,
  color,
  size = 120,
  strokeWidth = 8,
  showGlow = false,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  showGlow?: boolean;
}) {
  const progress = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {showGlow && (
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="fill-none stroke-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn('fill-none transition-all duration-700 ease-out', color)}
        strokeLinecap="round"
        filter={showGlow ? 'url(#glow)' : undefined}
      />
    </svg>
  );
}

// ==================== Circular Macro Indicator ====================

function MacroCircle({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  bgColor?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <ProgressRing
          value={value}
          max={target}
          color={color}
          size={56}
          strokeWidth={5}
        />
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-xs font-bold',
          )}
        >
          {Math.round(value)}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{target}g goal</p>
      </div>
    </div>
  );
}

// ==================== Macro Bar Component ====================

function MacroBar({
  label,
  value,
  target,
  unit,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const progress = Math.min((value / target) * 100, 100);
  const isOver = value > target;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon className={cn('h-4 w-4', color.replace('bg-', 'text-'))} />
          )}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              'font-semibold tabular-nums',
              isOver && 'text-red-500',
            )}
          >
            {Math.round(value)}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground tabular-nums">
            {target}
            {unit}
          </span>
        </div>
      </div>
      <div className="relative h-2.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
            color,
            isOver && 'bg-red-500',
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

// ==================== Food Search Result ====================

function FoodSearchItem({
  food,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: {
  food: FoodListItem;
  onSelect: (food: FoodListItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (foodId: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group border border-transparent hover:bg-muted/50 hover:border-border/50 active:bg-muted/70"
      onClick={() => onSelect(food)}
    >
      {/* Calorie badge */}
      <div className="shrink-0 w-14 h-14 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-primary">
          {Math.round(food.calories)}
        </span>
        <span className="text-[10px] text-primary/70">cal</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{food.name}</span>
          {food.isVerified && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Verified
            </span>
          )}
        </div>
        {food.brand && (
          <p className="text-xs text-muted-foreground truncate">{food.brand}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">
            {`${food.servingSize}${food.servingUnit.toLowerCase()}`}
          </span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              P {food.protein}g
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              C {food.carbohydrates}g
            </span>
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              F {food.fat}g
            </span>
          </div>
        </div>
      </div>

      {onToggleFavorite && (
        <Button
          variant="ghost"
          size="icon"
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(food.id);
          }}
        >
          <Star
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorite
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground hover:text-amber-400',
            )}
          />
        </Button>
      )}
    </div>
  );
}

// ==================== Food Log Entry ====================

function FoodLogEntry({
  log,
  onDelete,
  isMobile,
}: {
  log: FoodLogResponse;
  onDelete: (id: string) => void;
  isMobile: boolean;
}) {
  const displayName = log.food?.name || log.quickAddName || 'Quick Add';
  const calories = log.totalCalories;

  return (
    <SwipeToDelete onDelete={() => onDelete(log.id)} disabled={!isMobile}>
      <div className="flex items-center gap-3 py-3 px-2 hover:bg-muted/30 rounded-lg group transition-all duration-200">
        {/* Calories indicator */}
        <div className="shrink-0 w-12 h-12 rounded-lg bg-muted/50 flex flex-col items-center justify-center">
          <span className="text-sm font-bold">{calories}</span>
          <span className="text-[9px] text-muted-foreground">cal</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate text-sm">{displayName}</span>
            {log.food?.isVerified && (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {log.servings > 1 ? `${log.servings}× ` : ''}
              {log.food?.servingLabel ||
                `${log.servingSize || log.food?.servingSize} ${(log.servingUnit || log.food?.servingUnit || 'serving').toLowerCase()}`}
            </span>
            {log.food && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-blue-500/80">
                  P{Math.round(log.totalProtein)}
                </span>
                <span className="text-emerald-500/80">
                  C{Math.round(log.totalCarbs)}
                </span>
                <span className="text-orange-500/80">
                  F{Math.round(log.totalFat)}
                </span>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(log.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </SwipeToDelete>
  );
}

// ==================== Meal Section ====================

function MealSection({
  mealType,
  logs,
  totalCalories,
  suggestedCalories,
  onAddFood,
  onShareMeal,
  onQuickAdd,
  onDeleteLog,
  isMobile,
}: {
  mealType: MealType;
  logs: FoodLogResponse[];
  totalCalories: number;
  suggestedCalories: number;
  onAddFood: () => void;
  onShareMeal: () => void;
  onQuickAdd: (calories: number) => void;
  onDeleteLog: (id: string) => void;
  isMobile: boolean;
}) {
  const {
    label,
    icon: Icon,
    color,
    bgColor,
    borderColor,
  } = MEAL_INFO[mealType];
  const progress =
    suggestedCalories > 0
      ? Math.min((totalCalories / suggestedCalories) * 100, 100)
      : 0;
  const isCompleted =
    totalCalories >= suggestedCalories && suggestedCalories > 0;

  return (
    <Card
      className={cn(
        'group border-l-4 overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        borderColor,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', bgColor)}>
              <Icon className={cn('h-5 w-5', color)} />
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {logs.length} {logs.length === 1 ? 'item' : 'items'}
                </p>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Target hit
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-lg font-semibold tabular-nums">
                {totalCalories}
              </span>
              <span className="text-xs text-muted-foreground ml-1">cal</span>
              <p className="text-[10px] text-muted-foreground">
                /{suggestedCalories} goal
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onShareMeal}
                disabled={logs.length === 0}
                aria-label={`Share ${label} to Elevate`}
                title={
                  logs.length === 0
                    ? `Add food to ${label} first, then share`
                    : `Share ${label} to Elevate`
                }
                className="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-background hover:text-foreground disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onAddFood}
                aria-label={`Add food to ${label}`}
                title={`Add food to ${label}`}
                className="h-7 w-7 rounded-md bg-primary/15 text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/20 hover:text-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isCompleted ? 'bg-emerald-500' : 'bg-primary/70',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-3 flex items-center gap-1.5">
          {[100, 250, 500].map((cal) => (
            <Button
              key={cal}
              variant="ghost"
              size="sm"
              className="h-7 rounded-full border border-dashed px-2.5 text-xs transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              onClick={() => onQuickAdd(cal)}
            >
              +{cal} cal
            </Button>
          ))}
        </div>
        {logs.length === 0 ? (
          <button
            onClick={onAddFood}
            className="w-full py-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer border-2 border-dashed border-muted hover:border-muted-foreground/30"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">Add your first food</span>
            <span className="text-xs text-muted-foreground/80">
              Use + above to log and Share when ready
            </span>
          </button>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <FoodLogEntry
                key={log.id}
                log={log}
                onDelete={onDeleteLog}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Barcode Scanner ====================

function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (barcode: string) => void;
  onClose: () => void;
}) {
  const nativePlatform = isNativeApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closingNativeScannerRef = useRef(false);
  const [useBrowserScanner, setUseBrowserScanner] = useState(!nativePlatform);
  const [cameraState, setCameraState] = useState<
    'requesting' | 'ready' | 'error'
  >('requesting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Use native scanner first on Capacitor platforms.
  useEffect(() => {
    if (!nativePlatform || useBrowserScanner) {
      return;
    }

    let cancelled = false;
    closingNativeScannerRef.current = false;

    const isCancelLikeError = (error: unknown): boolean => {
      if (!error) return false;
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : String(error);
      const normalized = message.toLowerCase();
      return (
        normalized.includes('cancel') ||
        normalized.includes('aborted') ||
        normalized.includes('user closed')
      );
    };

    const runNativeScan = async () => {
      try {
        const support = await MlkitBarcodeScanner.isSupported();
        if (!support.supported) {
          throw new Error(
            'Native barcode scanning is not supported on this device',
          );
        }

        const currentPermission = await MlkitBarcodeScanner.checkPermissions();
        if (currentPermission.camera !== 'granted') {
          const requestedPermission =
            await MlkitBarcodeScanner.requestPermissions();
          if (requestedPermission.camera !== 'granted') {
            throw new Error(
              'Camera permission is required for barcode scanning',
            );
          }
        }

        const result = await MlkitBarcodeScanner.scan({
          formats: [
            BarcodeFormat.Ean13,
            BarcodeFormat.Ean8,
            BarcodeFormat.UpcA,
            BarcodeFormat.UpcE,
          ],
        });

        if (cancelled) {
          return;
        }

        const firstBarcode = result.barcodes[0];
        let barcodeValue =
          firstBarcode?.rawValue || firstBarcode?.displayValue || null;

        if (!barcodeValue) {
          throw new Error('No barcode was detected');
        }

        // UPC-A barcodes are 12 digits; pad to 13-digit EAN-13 for consistency
        if (barcodeValue.length === 12 && /^\d+$/.test(barcodeValue)) {
          barcodeValue = '0' + barcodeValue;
        }

        onScan(barcodeValue);
      } catch (error) {
        if (cancelled || closingNativeScannerRef.current) {
          return;
        }

        if (isCancelLikeError(error)) {
          onClose();
          return;
        }

        console.warn(
          'Native barcode scan failed, falling back to browser:',
          error,
        );
        setErrorMsg(
          'Native scanner unavailable. Using browser camera fallback.',
        );
        setUseBrowserScanner(true);
      }
    };

    runNativeScan();

    return () => {
      cancelled = true;
      void MlkitBarcodeScanner.stopScan().catch(() => {
        // Ignore stop errors during teardown.
      });
    };
  }, [nativePlatform, onClose, onScan, useBrowserScanner]);

  // Start browser camera for fallback and web.
  useEffect(() => {
    if (!useBrowserScanner) return;

    let mounted = true;
    const videoElement = videoRef.current;

    const initCamera = async () => {
      // Wait a tick for video element to be in DOM
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!mounted) return;

      if (!videoRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // Set srcObject on the video element
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.play().catch(() => {});
        }

        // Mark ready after short delay
        setTimeout(() => {
          if (mounted) setCameraState('ready');
        }, 300);
      } catch {
        if (mounted) {
          setCameraState('error');
          setErrorMsg(
            'Camera access denied. Please enable camera permissions.',
          );
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [useBrowserScanner]);

  // Barcode detection
  useEffect(() => {
    if (!useBrowserScanner) return;
    if (cameraState !== 'ready' || !videoRef.current) return;
    if (!('BarcodeDetector' in window)) return;

    // @ts-expect-error - BarcodeDetector is not in TypeScript types yet
    const barcodeDetector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
    });

    let animationId: number;
    let detecting = false;

    const detect = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4 || detecting) {
        animationId = requestAnimationFrame(detect);
        return;
      }

      detecting = true;
      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          // Stop camera before callback
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          onScan(barcode);
          return;
        }
      } catch {
        // Ignore detection errors
      }
      detecting = false;
      animationId = requestAnimationFrame(detect);
    };

    animationId = requestAnimationFrame(detect);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [cameraState, onScan, useBrowserScanner]);

  const handleClose = () => {
    closingNativeScannerRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (nativePlatform && !useBrowserScanner) {
      void MlkitBarcodeScanner.stopScan().catch(() => {
        // Ignore stop errors when closing scanner.
      });
    }
    onClose();
  };

  if (nativePlatform && !useBrowserScanner) {
    return (
      <div className="relative flex min-h-64 flex-col items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Opening native barcode scanner...
        </p>
        {errorMsg && <p className="mt-2 text-xs text-amber-500">{errorMsg}</p>}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Video container - always rendered but may be hidden */}
      <div
        className="relative bg-black rounded-lg overflow-hidden h-64"
        style={{ display: cameraState === 'error' ? 'none' : 'block' }}
      >
        {/* Video element always in DOM so ref works */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Loading overlay */}
        {cameraState === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
            <p className="text-sm text-white">Starting camera...</p>
          </div>
        )}

        {/* Scan overlay - only when ready */}
        {cameraState === 'ready' && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-64 h-32 border-2 border-primary rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary -translate-x-0.5 -translate-y-0.5" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary translate-x-0.5 -translate-y-0.5" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary -translate-x-0.5 translate-y-0.5" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary translate-x-0.5 translate-y-0.5" />
              </div>
            </div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary/50 animate-pulse z-10" />
          </>
        )}
      </div>

      {/* Error state */}
      {cameraState === 'error' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            {errorMsg || 'Camera access is required to scan barcodes'}
          </p>
          <Button variant="outline" onClick={handleClose}>
            Go Back
          </Button>
        </div>
      )}

      {/* Instructions */}
      {cameraState !== 'error' && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Point your camera at a barcode
          </p>
          {errorMsg && (
            <p className="text-xs text-amber-500 mt-2">{errorMsg}</p>
          )}
          {!('BarcodeDetector' in window) && (
            <p className="text-xs text-amber-500 mt-2">
              Barcode scanning not supported in this browser. Try Chrome or
              Edge.
            </p>
          )}
        </div>
      )}

      {/* Close button */}
      {cameraState !== 'error' && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-20"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ==================== Create Custom Food Form ====================

function CreateCustomFoodForm({
  onSuccess,
  onCancel,
  initialBarcode,
}: {
  onSuccess: (food: FoodListItem) => void;
  onCancel: () => void;
  initialBarcode?: string | null;
}) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    barcode: initialBarcode || '',
    servingSize: 1,
    servingUnit: 'SERVING' as const,
    servingLabel: '',
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    isPrivate: false,
  });
  const [barcodeInput, setBarcodeInput] = useState(initialBarcode || '');
  const [isScanning, setIsScanning] = useState(false);
  const [existingFood, setExistingFood] = useState<FoodListItem | null>(null);
  const [showExistingWarning, setShowExistingWarning] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  // Check if barcode already exists
  const { data: barcodeCheck, isLoading: isCheckingBarcode } =
    useSearchByBarcode(
      formData.barcode,
      formData.barcode.length >= 8, // Only check valid-length barcodes
    );

  // Update existing food state when barcode check completes
  useEffect(() => {
    if (barcodeCheck?.data && !isCheckingBarcode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExistingFood(barcodeCheck.data);
      setShowExistingWarning(true);
    } else if (!isCheckingBarcode) {
      setExistingFood(null);
      setShowExistingWarning(false);
    }
  }, [barcodeCheck, isCheckingBarcode]);

  const createFood = useCreateFood({
    onSuccess: (response) => {
      toast.success('Custom food created!');
      onSuccess({
        id: response.data.id,
        name: response.data.name,
        brand: response.data.brand || null,
        barcode: response.data.barcode || null,
        calories: response.data.calories,
        protein: response.data.protein,
        carbohydrates: response.data.carbohydrates,
        fat: response.data.fat,
        servingSize: response.data.servingSize,
        servingUnit: response.data.servingUnit,
        servingLabel: response.data.servingLabel || null,
        source: response.data.source,
        isVerified: response.data.isVerified,
        isPrivate: response.data.isPrivate,
        createdById: response.data.createdById,
      });
    },
    onError: () => {
      toast.error('Failed to create food');
    },
  });

  const updateFood = useUpdateFood({
    onSuccess: (response) => {
      toast.success('Food updated!');
      onSuccess({
        id: response.data.id,
        name: response.data.name,
        brand: response.data.brand || null,
        barcode: response.data.barcode || null,
        calories: response.data.calories,
        protein: response.data.protein,
        carbohydrates: response.data.carbohydrates,
        fat: response.data.fat,
        servingSize: response.data.servingSize,
        servingUnit: response.data.servingUnit,
        servingLabel: response.data.servingLabel || null,
        source: response.data.source,
        isVerified: response.data.isVerified,
        isPrivate: response.data.isPrivate,
        createdById: response.data.createdById,
      });
    },
    onError: () => {
      toast.error('Failed to update food');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Food name is required');
      return;
    }

    const foodData = {
      name: formData.name.trim(),
      brand: formData.brand.trim() || undefined,
      barcode: formData.barcode.trim() || undefined,
      servingSize: formData.servingSize,
      servingUnit: formData.servingUnit,
      servingLabel: formData.servingLabel.trim() || undefined,
      calories: formData.calories,
      protein: formData.protein,
      carbohydrates: formData.carbohydrates,
      fat: formData.fat,
      fiber: formData.fiber || undefined,
      sugar: formData.sugar || undefined,
      sodium: formData.sodium || undefined,
      isPrivate: formData.isPrivate,
    };

    if (editingFoodId) {
      // Update existing food
      updateFood.mutate({ id: editingFoodId, data: foodData });
    } else {
      // Create new food
      createFood.mutate(foodData);
    }
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBarcodeScan = (barcode: string) => {
    setIsScanning(false);
    setBarcodeInput(barcode);
    updateField('barcode', barcode);
  };

  const handleBarcodeInputChange = (value: string) => {
    setBarcodeInput(value);
    // Only update form data when user explicitly confirms or scans
  };

  const handleBarcodeConfirm = () => {
    if (barcodeInput.trim()) {
      updateField('barcode', barcodeInput.trim());
    }
  };

  const handleUseExistingFood = () => {
    if (existingFood) {
      onSuccess(existingFood);
    }
  };

  const handlePrefillFromExisting = () => {
    if (existingFood) {
      setFormData({
        name: existingFood.name,
        brand: existingFood.brand || '',
        barcode: formData.barcode,
        servingSize: existingFood.servingSize,
        servingUnit: existingFood.servingUnit as typeof formData.servingUnit,
        servingLabel: existingFood.servingLabel || '',
        calories: existingFood.calories,
        protein: existingFood.protein,
        carbohydrates: existingFood.carbohydrates,
        fat: existingFood.fat,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        isPrivate: existingFood.isPrivate,
      });
      setEditingFoodId(existingFood.id);
      setShowExistingWarning(false);
    }
  };

  if (isScanning) {
    return (
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onClose={() => setIsScanning(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 pr-4 pb-4">
          {/* Barcode Section */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Barcode (optional)</p>
            <div className="flex gap-2">
              <Input
                placeholder="Scan or enter barcode..."
                value={barcodeInput}
                onChange={(e) => handleBarcodeInputChange(e.target.value)}
                onBlur={handleBarcodeConfirm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBarcodeConfirm();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScanning(true)}
              >
                <Scan className="h-4 w-4" />
              </Button>
            </div>
            {isCheckingBarcode && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking barcode...
              </p>
            )}
            {showExistingWarning && existingFood && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                <p className="text-sm font-medium text-amber-500">
                  Food already exists for this barcode
                </p>
                <p className="text-xs text-muted-foreground">
                  {existingFood.name}{' '}
                  {existingFood.brand && `(${existingFood.brand})`}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleUseExistingFood}
                  >
                    Use Existing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handlePrefillFromExisting}
                  >
                    Edit Values
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowExistingWarning(false)}
                  >
                    Create New
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-3 pt-2 border-t">
            <div>
              <Label htmlFor="name">Food Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Homemade Protein Shake"
                required
              />
            </div>
            <div>
              <Label htmlFor="brand">Brand (optional)</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => updateField('brand', e.target.value)}
                placeholder="e.g., MyBrand"
              />
            </div>
          </div>

          {/* Serving Info */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Serving Size</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="servingSize">Amount</Label>
                <Input
                  id="servingSize"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.servingSize}
                  onChange={(e) =>
                    updateField('servingSize', parseFloat(e.target.value) || 1)
                  }
                />
              </div>
              <div>
                <Label htmlFor="servingUnit">Unit</Label>
                <select
                  id="servingUnit"
                  value={formData.servingUnit}
                  onChange={(e) => updateField('servingUnit', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="SERVING">Serving</option>
                  <option value="G">Grams (g)</option>
                  <option value="ML">Milliliters (ml)</option>
                  <option value="OZ">Ounces (oz)</option>
                  <option value="CUP">Cup</option>
                  <option value="TBSP">Tablespoon</option>
                  <option value="TSP">Teaspoon</option>
                  <option value="PIECE">Piece</option>
                  <option value="SLICE">Slice</option>
                  <option value="SCOOP">Scoop</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="servingLabel">Serving Label (optional)</Label>
              <Input
                id="servingLabel"
                value={formData.servingLabel}
                onChange={(e) => updateField('servingLabel', e.target.value)}
                placeholder="e.g., 1 cup, 1 scoop"
              />
            </div>
          </div>

          {/* Main Macros */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Nutrition (per serving)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  min="0"
                  value={formData.calories}
                  onChange={(e) =>
                    updateField('calories', parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.protein}
                  onChange={(e) =>
                    updateField('protein', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label htmlFor="carbohydrates">Carbs (g)</Label>
                <Input
                  id="carbohydrates"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.carbohydrates}
                  onChange={(e) =>
                    updateField(
                      'carbohydrates',
                      parseFloat(e.target.value) || 0,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.fat}
                  onChange={(e) =>
                    updateField('fat', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Optional nutrition */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">
              Additional (optional)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="fiber" className="text-xs">
                  Fiber (g)
                </Label>
                <Input
                  id="fiber"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.fiber}
                  onChange={(e) =>
                    updateField('fiber', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label htmlFor="sugar" className="text-xs">
                  Sugar (g)
                </Label>
                <Input
                  id="sugar"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.sugar}
                  onChange={(e) =>
                    updateField('sugar', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label htmlFor="sodium" className="text-xs">
                  Sodium (mg)
                </Label>
                <Input
                  id="sodium"
                  type="number"
                  min="0"
                  value={formData.sodium}
                  onChange={(e) =>
                    updateField('sodium', parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="isPrivate">Private Food</Label>
              <p className="text-xs text-muted-foreground">
                Only you can see and edit this food
              </p>
            </div>
            <Switch
              id="isPrivate"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => updateField('isPrivate', checked)}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-4 border-t shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createFood.isPending || updateFood.isPending}
          className="flex-1"
        >
          {(createFood.isPending || updateFood.isPending) && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {editingFoodId ? 'Update Food' : 'Create Food'}
        </Button>
      </div>
    </form>
  );
}

// ==================== Add Food Dialog ====================

function AddFoodDialog({
  open,
  onOpenChange,
  mealType,
  onLogFood,
  isLogging,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType;
  onLogFood: (foodId: string, servings: number) => void;
  isLogging: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('foodDiary.recentSearches');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved) as string[];
      return parsed.slice(0, 5);
    } catch {
      return [];
    }
  });
  const [selectedFood, setSelectedFood] = useState<FoodListItem | null>(null);
  const [amount, setAmount] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const tabValues = [
    'search',
    'scan',
    'favorites',
    'recent',
    'create',
  ] as const;
  const { containerRef, handlers: swipeHandlers } = useSwipeableTabs({
    currentIndex: tabValues.indexOf(activeTab as (typeof tabValues)[number]),
    tabCount: tabValues.length,
    onTabChange: (i) => setActiveTab(tabValues[i]),
  });
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState(''); // Separate state for input field
  const [isScanning, setIsScanning] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createBarcode, setCreateBarcode] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleScrollDismissKeyboard = useCallback(() => {
    void hideKeyboard();
  }, []);

  // Unit conversion constants — all units convert through grams (1ml ≈ 1g for food)
  const UNIT_TO_GRAMS: Record<string, number> = {
    G: 1,
    ML: 1,
    OZ: 28.3495,
    LB: 453.592,
    TSP: 4.929,
    TBSP: 14.787,
    CUP: 236.588,
  };

  const MEASURABLE_UNITS = Object.keys(UNIT_TO_GRAMS);

  const UNIT_LABELS: Record<string, string> = {
    G: 'g',
    OZ: 'oz',
    LB: 'lb',
    ML: 'ml',
    TSP: 'tsp',
    TBSP: 'tbsp',
    CUP: 'cup',
    PIECE: 'piece',
    SERVING: 'serving',
    SLICE: 'slice',
    BOWL: 'bowl',
    CONTAINER: 'container',
    SCOOP: 'scoop',
  };

  const getConvertibleUnits = (nativeUnit: string): string[] => {
    if (nativeUnit === 'SERVING') return ['SERVING', ...MEASURABLE_UNITS];
    if (nativeUnit in UNIT_TO_GRAMS) return [...MEASURABLE_UNITS, 'SERVING'];
    return [nativeUnit, ...MEASURABLE_UNITS, 'SERVING'];
  };

  const getAmountStep = (unit: string): number => {
    switch (unit) {
      case 'G':
      case 'ML':
        return 10;
      case 'OZ':
        return 1;
      case 'LB':
        return 0.25;
      case 'CUP':
        return 0.25;
      case 'TBSP':
        return 0.5;
      case 'TSP':
        return 0.25;
      default:
        return 1;
    }
  };

  // Compute servings multiplier from amount + unit
  const servings = (() => {
    if (!selectedFood) return 1;
    const nativeUnit = selectedFood.servingUnit;
    const nativeSize = selectedFood.servingSize;

    // "SERVING" means the user wants N servings directly
    if (selectedUnit === 'SERVING') {
      return amount;
    }

    if (selectedUnit === nativeUnit) {
      return amount / nativeSize;
    }

    const selectedFactor = UNIT_TO_GRAMS[selectedUnit];
    const nativeFactor = UNIT_TO_GRAMS[nativeUnit];

    if (selectedFactor && nativeFactor) {
      return (amount * selectedFactor) / (nativeSize * nativeFactor);
    }

    return amount / nativeSize;
  })();

  const convertAmount = (
    amt: number,
    fromUnit: string,
    toUnit: string,
  ): number => {
    if (fromUnit === toUnit) return amt;
    if (!selectedFood) return amt;

    const nativeSize = selectedFood.servingSize;
    const nativeUnit = selectedFood.servingUnit;
    const nativeFactor = UNIT_TO_GRAMS[nativeUnit];

    // Convert from SERVING to a measurable unit
    if (fromUnit === 'SERVING' && nativeFactor) {
      const grams = amt * nativeSize * nativeFactor;
      const toFactor = UNIT_TO_GRAMS[toUnit];
      return toFactor ? grams / toFactor : amt;
    }

    // Convert from a measurable unit to SERVING
    if (toUnit === 'SERVING' && nativeFactor) {
      const fromFactor = UNIT_TO_GRAMS[fromUnit];
      if (fromFactor) {
        return (amt * fromFactor) / (nativeSize * nativeFactor);
      }
      return amt;
    }

    const fromFactor = UNIT_TO_GRAMS[fromUnit];
    const toFactor = UNIT_TO_GRAMS[toUnit];
    if (fromFactor && toFactor) {
      return (amt * fromFactor) / toFactor;
    }
    return amt;
  };

  const availableUnits = selectedFood
    ? getConvertibleUnits(selectedFood.servingUnit)
    : [];

  const {
    data: searchResults,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteSearchFoods(
    debouncedSearchQuery,
    20,
    debouncedSearchQuery.length >= 2,
  );

  // Flatten all pages of search results
  const allSearchResults =
    searchResults?.pages.flatMap((page) => page.data?.items || []) || [];

  const { data: barcodeResult, isLoading: isBarcodeSearching } =
    useSearchByBarcode(scannedBarcode || '', !!scannedBarcode);

  const { data: favoritesData } = useFavorites();
  const { data: recentData } = useRecentFoods(10);
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  const favorites = favoritesData?.data || [];
  const recentFoods = recentData?.data || [];
  const favoriteIds = new Set(favorites.map((f) => f.food.id));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmedQuery = searchQuery.trim();
      setDebouncedSearchQuery(trimmedQuery);

      if (trimmedQuery.length < 3) return;

      setRecentSearches((previous) => {
        const next = [
          trimmedQuery,
          ...previous.filter((query) => query !== trimmedQuery),
        ].slice(0, 5);
        localStorage.setItem('foodDiary.recentSearches', JSON.stringify(next));
        return next;
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // When barcode result arrives, auto-select it
  useEffect(() => {
    if (barcodeResult?.data && !isBarcodeSearching) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFood(barcodeResult.data);
      setAmount(1);
      setSelectedUnit('SERVING');
      setScannedBarcode(null);
    }
  }, [barcodeResult, isBarcodeSearching]);

  const handleSelect = (food: FoodListItem) => {
    setSelectedFood(food);
    setAmount(1);
    setSelectedUnit('SERVING');
  };

  const handleToggleFavorite = (foodId: string) => {
    if (favoriteIds.has(foodId)) {
      removeFavoriteMutation.mutate(foodId);
    } else {
      addFavoriteMutation.mutate({ foodId });
    }
  };

  const handleLog = () => {
    if (!selectedFood) return;
    onLogFood(selectedFood.id, servings);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedFood(null);
    setSearchQuery('');
    setAmount(0);
    setSelectedUnit('');
    setActiveTab('search');
    setScannedBarcode(null);
    setBarcodeInput('');
    setIsScanning(false);
    setShowCreateForm(false);
    setCreateBarcode(null);
  };

  const handleBarcodeScan = (barcode: string) => {
    setIsScanning(false);
    setScannedBarcode(barcode);
  };

  const handleManualBarcodeSearch = () => {
    if (barcodeInput.trim()) {
      setScannedBarcode(barcodeInput.trim());
    }
  };

  const handleCreateFood = (barcode?: string | null) => {
    setShowCreateForm(true);
    setCreateBarcode(barcode || null);
  };

  const handleFoodCreated = (food: FoodListItem) => {
    setShowCreateForm(false);
    setCreateBarcode(null);
    setSelectedFood(food);
    setAmount(1);
    setSelectedUnit('SERVING');
  };

  // Calculate nutrition based on servings
  const nutritionInfo = selectedFood
    ? {
        calories: Math.round(selectedFood.calories * servings),
        protein: Math.round(selectedFood.protein * servings * 10) / 10,
        carbs: Math.round(selectedFood.carbohydrates * servings * 10) / 10,
        fat: Math.round(selectedFood.fat * servings * 10) / 10,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'max-w-md flex flex-col overflow-hidden',
          isMobile ? 'max-h-[95vh]' : 'h-[80vh]',
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Add to {MEAL_INFO[mealType].label}</DialogTitle>
        </DialogHeader>

        {showCreateForm ? (
          // Create custom food form
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CreateCustomFoodForm
              onSuccess={handleFoodCreated}
              onCancel={() => {
                setShowCreateForm(false);
                setCreateBarcode(null);
              }}
              initialBarcode={createBarcode}
            />
          </div>
        ) : selectedFood ? (
          // Food selected - show serving selection
          <div className="space-y-4 flex-1">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{selectedFood.name}</h4>
                {selectedFood.isVerified && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>
              {selectedFood.brand && (
                <p className="text-sm text-muted-foreground">
                  {selectedFood.brand}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-lg shrink-0"
                  onClick={() => {
                    const step = getAmountStep(selectedUnit);
                    setAmount(
                      Math.max(step, Math.round((amount - step) * 100) / 100),
                    );
                  }}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) setAmount(val);
                  }}
                  className="w-20 text-center h-10"
                  step={getAmountStep(selectedUnit)}
                  min={0}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-lg shrink-0"
                  onClick={() => {
                    const step = getAmountStep(selectedUnit);
                    setAmount(Math.round((amount + step) * 100) / 100);
                  }}
                >
                  +
                </Button>
                {availableUnits.length > 1 ? (
                  <select
                    value={selectedUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value;
                      const converted = convertAmount(
                        amount,
                        selectedUnit,
                        newUnit,
                      );
                      setSelectedUnit(newUnit);
                      setAmount(Math.round(converted * 100) / 100);
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {availableUnits.map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABELS[u] || u.toLowerCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {UNIT_LABELS[selectedUnit] || selectedUnit.toLowerCase()}
                  </span>
                )}
              </div>
              {selectedFood.servingLabel ? (
                <p className="text-xs text-muted-foreground">
                  1 serving = {selectedFood.servingLabel}
                </p>
              ) : selectedFood.servingUnit in UNIT_TO_GRAMS ? (
                <p className="text-xs text-muted-foreground">
                  1 serving = {selectedFood.servingSize}{' '}
                  {UNIT_LABELS[selectedFood.servingUnit] ||
                    selectedFood.servingUnit.toLowerCase()}
                </p>
              ) : null}
            </div>

            {nutritionInfo && (
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{nutritionInfo.calories}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-blue-500">
                    {nutritionInfo.protein}g
                  </p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-green-500">
                    {nutritionInfo.carbs}g
                  </p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-orange-500">
                    {nutritionInfo.fat}g
                  </p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>
            )}

            <PrivacyNotice variant="health" />
            <DialogFooter className="gap-2 mt-auto pt-2">
              <Button variant="outline" onClick={() => setSelectedFood(null)}>
                Back
              </Button>
              <Button
                onClick={handleLog}
                disabled={isLogging}
                className="flex-1 sm:flex-initial"
              >
                {isLogging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Log Food
              </Button>
            </DialogFooter>
          </div>
        ) : isScanning ? (
          // Barcode scanner view
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setIsScanning(false)}
          />
        ) : isBarcodeSearching ? (
          // Searching by barcode
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">
              Looking up barcode: {scannedBarcode}
            </p>
          </div>
        ) : scannedBarcode && !barcodeResult?.data ? (
          // Barcode not found
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Scan className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No food found for barcode: {scannedBarcode}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleCreateFood(scannedBarcode)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Custom Food
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setScannedBarcode(null)}
                >
                  Search Manually
                </Button>
                <Button variant="outline" onClick={() => setIsScanning(true)}>
                  Scan Again
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // No food selected - show search/favorites/recent/scan
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              if (value === 'scan') {
                setIsScanning(true);
              }
            }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <ScrollIndicator>
              <TabsList className="flex w-full gap-0.5 whitespace-nowrap rounded-md p-1 shrink-0">
                <TabsTrigger
                  value="search"
                  className="flex-1 shrink-0 text-xs sm:text-sm"
                >
                  <Search className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Search</span>
                </TabsTrigger>
                <TabsTrigger
                  value="scan"
                  className="flex-1 shrink-0 text-xs sm:text-sm"
                >
                  <Scan className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Scan</span>
                </TabsTrigger>
                <TabsTrigger
                  value="favorites"
                  className="flex-1 shrink-0 text-xs sm:text-sm"
                >
                  <Star className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Faves</span>
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="flex-1 shrink-0 text-xs sm:text-sm"
                >
                  <Clock className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Recent</span>
                </TabsTrigger>
                <TabsTrigger
                  value="create"
                  className="flex-1 shrink-0 text-xs sm:text-sm"
                >
                  <PlusCircle className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Create</span>
                </TabsTrigger>
              </TabsList>
            </ScrollIndicator>

            <div
              {...swipeHandlers}
              ref={containerRef}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsContent
                value="search"
                className="flex-1 flex flex-col mt-4 min-h-0 overflow-hidden"
              >
                <div className="relative mb-4 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search foods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div
                    className="pr-4"
                    onTouchMove={handleScrollDismissKeyboard}
                  >
                    {isSearching && allSearchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Searching foods...
                        </p>
                      </div>
                    ) : searchQuery.length < 3 ? (
                      <div className="text-center py-8 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Type at least 3 characters to search
                        </p>
                        {recentSearches.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Recent searches
                            </p>
                            <div className="flex flex-wrap justify-center gap-1.5">
                              {recentSearches.map((query) => (
                                <Button
                                  key={query}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 rounded-full text-xs"
                                  onClick={() => setSearchQuery(query)}
                                >
                                  {query}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : allSearchResults.length === 0 && !isSearching ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-4">
                          No foods found for "{searchQuery}"
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => handleCreateFood()}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create Custom Food
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {allSearchResults.map((food) => (
                          <FoodSearchItem
                            key={food.id}
                            food={food}
                            onSelect={handleSelect}
                            isFavorite={favoriteIds.has(food.id)}
                            onToggleFavorite={handleToggleFavorite}
                          />
                        ))}
                        {/* Load more trigger */}
                        <div ref={loadMoreRef} className="py-2">
                          {isFetchingNextPage && (
                            <div className="flex items-center justify-center gap-2 py-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">
                                Loading more...
                              </span>
                            </div>
                          )}
                          {!hasNextPage && allSearchResults.length > 0 && (
                            <p className="text-xs text-muted-foreground text-center">
                              No more results
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="scan"
                className="flex-1 flex flex-col mt-4 min-h-0 overflow-auto"
              >
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                    <Scan className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Scan Barcode</h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                    Use your camera to scan a product barcode for quick food
                    lookup
                  </p>
                  <Button onClick={() => setIsScanning(true)} size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Open Camera
                  </Button>
                  <div className="mt-6 pt-6 border-t w-full">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      Or enter barcode manually:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter barcode..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleManualBarcodeSearch();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="secondary"
                        disabled={!barcodeInput.trim()}
                        onClick={handleManualBarcodeSearch}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="favorites"
                className="flex-1 flex flex-col mt-4 min-h-0 overflow-hidden"
              >
                <ScrollArea className="flex-1 min-h-0">
                  <div className="pr-4">
                    {favorites.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No favorites yet. Star foods to add them here!
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {favorites.map((fav) => (
                          <FoodSearchItem
                            key={fav.id}
                            food={fav.food}
                            onSelect={handleSelect}
                            isFavorite={true}
                            onToggleFavorite={handleToggleFavorite}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="recent"
                className="flex-1 flex flex-col mt-4 min-h-0 overflow-hidden"
              >
                <ScrollArea className="flex-1 min-h-0">
                  <div className="pr-4">
                    {recentFoods.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No recent foods. Start logging to see history!
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {recentFoods.map((recent) => (
                          <FoodSearchItem
                            key={recent.food.id}
                            food={recent.food}
                            onSelect={handleSelect}
                            isFavorite={favoriteIds.has(recent.food.id)}
                            onToggleFavorite={handleToggleFavorite}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="create"
                className="flex-1 flex flex-col mt-4 min-h-0 overflow-hidden"
              >
                <CreateCustomFoodForm
                  onSuccess={handleFoodCreated}
                  onCancel={() => setActiveTab('search')}
                  initialBarcode={null}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==================== Goal Settings Dialog ====================

function GoalSettingsDialog({
  open,
  onOpenChange,
  currentGoal,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onSubmit: (data: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  }) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    calories: currentGoal?.calories ?? 2000,
    protein: currentGoal?.protein ?? 150,
    carbs: currentGoal?.carbs ?? 200,
    fat: currentGoal?.fat ?? 65,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      targetCalories: formData.calories,
      targetProtein: formData.protein,
      targetCarbs: formData.carbs,
      targetFat: formData.fat,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nutrition Goals</DialogTitle>
          <DialogDescription>
            Set your daily calorie and macro targets
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Daily Calories</Label>
            <Input
              type="number"
              value={formData.calories}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  calories: parseInt(e.target.value) || 0,
                })
              }
              min={500}
              max={10000}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Protein (g)</Label>
              <Input
                type="number"
                value={formData.protein}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    protein: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                value={formData.carbs}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    carbs: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Fat (g)</Label>
              <Input
                type="number"
                value={formData.fat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fat: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Macros total:{' '}
            {formData.protein * 4 + formData.carbs * 4 + formData.fat * 9}{' '}
            calories
          </p>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Goals
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Main Page ====================

export default function FoodDiaryPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [addFoodMeal, setAddFoodMeal] = useState<MealType | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

  const timezone = useTimezone();
  const dateStr = formatDateInTimezone(selectedDate, timezone);

  const {
    data: summaryData,
    isLoading,
    error,
  } = useDailyNutritionSummary(dateStr);
  const { data: goalData } = useNutritionGoal();

  const logFoodMutation = useLogFood({
    onSuccess: () => {
      toast.success('Food logged!');
      setAddFoodMeal(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log food');
    },
  });

  const deleteMutation = useDeleteFoodLog({
    onSuccess: () => {
      toast.success('Entry removed');
      setDeleteLogId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete entry');
    },
  });

  const updateGoalMutation = useUpdateNutritionGoal({
    onSuccess: () => {
      toast.success('Goals updated!');
      setShowGoalDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update goals');
    },
  });

  const summary = summaryData?.data;
  const goal = goalData?.data;
  const totalLoggedItems = summary
    ? summary.meals.breakfast.logs.length +
      summary.meals.lunch.logs.length +
      summary.meals.dinner.logs.length +
      summary.meals.snacks.logs.length
    : 0;

  const totals = summary?.totals || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  const targets = {
    calories: goal?.targetCalories ?? 2000,
    protein: goal?.targetProtein ?? 150,
    carbs: goal?.targetCarbs ?? 200,
    fat: goal?.targetFat ?? 65,
  };

  const mealCalorieTargets = {
    BREAKFAST: Math.round(
      targets.calories * ((goal?.breakfastPercent ?? 25) / 100),
    ),
    LUNCH: Math.round(targets.calories * ((goal?.lunchPercent ?? 30) / 100)),
    DINNER: Math.round(targets.calories * ((goal?.dinnerPercent ?? 30) / 100)),
    SNACKS: Math.round(targets.calories * ((goal?.snacksPercent ?? 15) / 100)),
  };

  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fat: Math.max(0, targets.fat - totals.fat),
  };

  const isToday = dateStr === formatDateInTimezone(new Date(), timezone);

  const macroDeltas = [
    { name: 'protein', delta: targets.protein - totals.protein, unit: 'g' },
    { name: 'carbs', delta: targets.carbs - totals.carbs, unit: 'g' },
    { name: 'fat', delta: targets.fat - totals.fat, unit: 'g' },
  ];
  const topGap = macroDeltas.sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
  )[0];
  const insightText = !summary
    ? null
    : topGap.delta > 0
      ? `${topGap.name[0].toUpperCase()}${topGap.name.slice(1)} is ${Math.round(topGap.delta)}${topGap.unit} under target.`
      : `${topGap.name[0].toUpperCase()}${topGap.name.slice(1)} is ${Math.round(Math.abs(topGap.delta))}${topGap.unit} over target.`;

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleLogFood = (foodId: string, servings: number) => {
    if (!addFoodMeal) return;
    logFoodMutation.mutate({
      foodId,
      servings,
      mealType: addFoodMeal,
      // Create UTC timestamp for noon in user's timezone to avoid date drift
      loggedAt: createTimestampForDate(dateStr, timezone),
    });
  };

  const handleQuickAdd = (mealType: MealType, calories: number) => {
    logFoodMutation.mutate({
      mealType,
      quickAddName: `Quick add ${calories} cal`,
      quickAddCalories: calories,
      quickAddProtein: 0,
      quickAddCarbs: 0,
      quickAddFat: 0,
      servings: 1,
      loggedAt: createTimestampForDate(dateStr, timezone),
    });
  };

  const handleShareMealToElevate = (input: {
    mealType: MealType;
    logs: FoodLogResponse[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  }) => {
    const payload = buildElevateMealPayload({
      ...input,
      date: dateStr,
    });
    navigate(`/elevate?compose=1&meal=${payload}`);
    toast.success(
      `${MEAL_INFO[input.mealType].label} attached to Elevate composer`,
    );
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Nutrition Log
              </p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">
                Food Diary
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Track meals, macros, and daily calorie progress.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  {Math.round(totals.calories)} cal logged
                </span>
                <span className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  {totalLoggedItems} items today
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                onClick={() => navigateDate(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-44 text-center">
                <Button
                  variant={isToday ? 'default' : 'outline'}
                  onClick={() => setSelectedDate(new Date())}
                  className={cn(
                    'w-full font-medium transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                    isToday &&
                      'bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90',
                  )}
                >
                  {getRelativeDateInTimezone(selectedDate, timezone)}
                </Button>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                onClick={() => navigateDate(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowGoalDialog(true)}
                className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Use + to log each meal section and share finished meals to
                Elevate from the share icon in each card.
              </p>
            </div>
          </div>
        </div>
      </section>

      {insightText && (
        <div className="rounded-xl border bg-card/60 px-4 py-2.5 text-sm">
          <span className="font-medium">Insight:</span>{' '}
          <span className="text-muted-foreground">{insightText}</span>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div
        className={cn('grid gap-6', !isMobile && 'lg:grid-cols-[400px_1fr]')}
      >
        {/* Left Column - Summary */}
        <div className={cn(!isMobile && 'lg:sticky lg:top-6 lg:h-fit')}>
          {isMobile ? (
            /* Compact mobile summary bar */
            <div className="flex items-center gap-4 rounded-2xl border bg-card px-4 py-3">
              {isLoading ? (
                <div className="flex items-center gap-4 w-full">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">Failed to load</p>
              ) : (
                <>
                  <div className="relative shrink-0">
                    <ProgressRing
                      value={totals.calories}
                      max={targets.calories}
                      color="stroke-primary"
                      size={44}
                      strokeWidth={5}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold tabular-nums">
                        {remaining.calories}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold tabular-nums">
                        {Math.round(totals.calories)}{' '}
                        <span className="font-normal text-muted-foreground">
                          / {targets.calories} cal
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 -mr-1"
                        onClick={() => setShowGoalDialog(true)}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      {[
                        {
                          label: 'P',
                          value: totals.protein,
                          target: targets.protein,
                          color: 'bg-blue-500',
                        },
                        {
                          label: 'C',
                          value: totals.carbs,
                          target: targets.carbs,
                          color: 'bg-emerald-500',
                        },
                        {
                          label: 'F',
                          value: totals.fat,
                          target: targets.fat,
                          color: 'bg-orange-500',
                        },
                      ].map((m) => (
                        <div key={m.label} className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span className="font-medium">{m.label}</span>
                            <span className="tabular-nums">
                              {Math.round(m.value)}/{m.target}g
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                m.color,
                              )}
                              style={{
                                width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Card className="overflow-hidden border-muted/70 transition-all duration-200 hover:shadow-md">
              <div className="bg-linear-to-br from-primary/5 via-transparent to-primary/5">
                <CardContent className="pt-6 pb-6">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Skeleton className="h-36 w-36 rounded-full" />
                      <Skeleton className="h-6 w-48 mt-4" />
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-destructive">
                      Failed to load nutrition data
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Calorie Progress - Centered */}
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <ProgressRing
                            value={totals.calories}
                            max={targets.calories}
                            color="stroke-primary"
                            size={160}
                            strokeWidth={12}
                            showGlow
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold tabular-nums">
                              {remaining.calories}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              remaining
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 mt-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="tabular-nums font-medium">
                              {totals.calories}
                            </span>
                            <span className="text-muted-foreground">eaten</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                            <span className="tabular-nums font-medium">
                              {targets.calories}
                            </span>
                            <span className="text-muted-foreground">goal</span>
                          </div>
                        </div>
                      </div>

                      {/* Macro Circles - Row */}
                      <div className="flex justify-center gap-8 pt-2">
                        <MacroCircle
                          label="Protein"
                          value={totals.protein}
                          target={targets.protein}
                          color="stroke-blue-500"
                        />
                        <MacroCircle
                          label="Carbs"
                          value={totals.carbs}
                          target={targets.carbs}
                          color="stroke-emerald-500"
                        />
                        <MacroCircle
                          label="Fat"
                          value={totals.fat}
                          target={targets.fat}
                          color="stroke-orange-500"
                        />
                      </div>

                      {/* Macro Bars - Below circles for detail */}
                      <div className="grid gap-3 pt-2 border-t">
                        <MacroBar
                          label="Protein"
                          value={totals.protein}
                          target={targets.protein}
                          unit="g"
                          color="bg-blue-500"
                        />
                        <MacroBar
                          label="Carbs"
                          value={totals.carbs}
                          target={targets.carbs}
                          unit="g"
                          color="bg-emerald-500"
                        />
                        <MacroBar
                          label="Fat"
                          value={totals.fat}
                          target={targets.fat}
                          unit="g"
                          color="bg-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Meal Sections */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
          {!isLoading && !error && summary && (
            <>
              <MealSection
                mealType="BREAKFAST"
                logs={summary.meals.breakfast.logs}
                totalCalories={summary.meals.breakfast.totalCalories}
                suggestedCalories={mealCalorieTargets.BREAKFAST}
                onShareMeal={() =>
                  handleShareMealToElevate({
                    mealType: 'BREAKFAST',
                    logs: summary.meals.breakfast.logs,
                    totalCalories: summary.meals.breakfast.totalCalories,
                    totalProtein: summary.meals.breakfast.totalProtein,
                    totalCarbs: summary.meals.breakfast.totalCarbs,
                    totalFat: summary.meals.breakfast.totalFat,
                  })
                }
                onAddFood={() => setAddFoodMeal('BREAKFAST')}
                onQuickAdd={(cal) => handleQuickAdd('BREAKFAST', cal)}
                onDeleteLog={(id) => setDeleteLogId(id)}
                isMobile={isMobile}
              />
              <MealSection
                mealType="LUNCH"
                logs={summary.meals.lunch.logs}
                totalCalories={summary.meals.lunch.totalCalories}
                suggestedCalories={mealCalorieTargets.LUNCH}
                onShareMeal={() =>
                  handleShareMealToElevate({
                    mealType: 'LUNCH',
                    logs: summary.meals.lunch.logs,
                    totalCalories: summary.meals.lunch.totalCalories,
                    totalProtein: summary.meals.lunch.totalProtein,
                    totalCarbs: summary.meals.lunch.totalCarbs,
                    totalFat: summary.meals.lunch.totalFat,
                  })
                }
                onAddFood={() => setAddFoodMeal('LUNCH')}
                onQuickAdd={(cal) => handleQuickAdd('LUNCH', cal)}
                onDeleteLog={(id) => setDeleteLogId(id)}
                isMobile={isMobile}
              />
              <MealSection
                mealType="DINNER"
                logs={summary.meals.dinner.logs}
                totalCalories={summary.meals.dinner.totalCalories}
                suggestedCalories={mealCalorieTargets.DINNER}
                onShareMeal={() =>
                  handleShareMealToElevate({
                    mealType: 'DINNER',
                    logs: summary.meals.dinner.logs,
                    totalCalories: summary.meals.dinner.totalCalories,
                    totalProtein: summary.meals.dinner.totalProtein,
                    totalCarbs: summary.meals.dinner.totalCarbs,
                    totalFat: summary.meals.dinner.totalFat,
                  })
                }
                onAddFood={() => setAddFoodMeal('DINNER')}
                onQuickAdd={(cal) => handleQuickAdd('DINNER', cal)}
                onDeleteLog={(id) => setDeleteLogId(id)}
                isMobile={isMobile}
              />
              <MealSection
                mealType="SNACKS"
                logs={summary.meals.snacks.logs}
                totalCalories={summary.meals.snacks.totalCalories}
                suggestedCalories={mealCalorieTargets.SNACKS}
                onShareMeal={() =>
                  handleShareMealToElevate({
                    mealType: 'SNACKS',
                    logs: summary.meals.snacks.logs,
                    totalCalories: summary.meals.snacks.totalCalories,
                    totalProtein: summary.meals.snacks.totalProtein,
                    totalCarbs: summary.meals.snacks.totalCarbs,
                    totalFat: summary.meals.snacks.totalFat,
                  })
                }
                onAddFood={() => setAddFoodMeal('SNACKS')}
                onQuickAdd={(cal) => handleQuickAdd('SNACKS', cal)}
                onDeleteLog={(id) => setDeleteLogId(id)}
                isMobile={isMobile}
              />
            </>
          )}
          {(isLoading || error || !summary) && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {isLoading
                ? 'Loading meals...'
                : error
                  ? 'Failed to load meals'
                  : null}
            </div>
          )}
        </div>
      </div>

      {/* Add Food Dialog */}
      {addFoodMeal && (
        <AddFoodDialog
          open={!!addFoodMeal}
          onOpenChange={(open) => !open && setAddFoodMeal(null)}
          mealType={addFoodMeal}
          onLogFood={handleLogFood}
          isLogging={logFoodMutation.isPending}
        />
      )}

      {/* Goal Settings Dialog */}
      <GoalSettingsDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        currentGoal={
          goal
            ? {
                calories: goal.targetCalories,
                protein: goal.targetProtein,
                carbs: goal.targetCarbs,
                fat: goal.targetFat,
              }
            : undefined
        }
        onSubmit={(data) => updateGoalMutation.mutate(data)}
        isLoading={updateGoalMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteLogId}
        onOpenChange={() => setDeleteLogId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this food log entry from your diary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLogId && deleteMutation.mutate(deleteLogId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrivacyNotice variant="health" />
    </div>
  );
}
