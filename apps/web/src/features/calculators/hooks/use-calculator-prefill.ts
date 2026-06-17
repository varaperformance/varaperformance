import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  convertHeightFromStorage,
  convertWeightFromStorage,
} from '@varaperformance/core';
import { useAuth } from '@/features/auth';
import { useProfileDetails } from '@/features/profile';
import api from '@/lib/api';
import type {
  SuccessResponse,
  WeightLogsListData,
} from '@varaperformance/core';

export const calculatorPrefillKeys = {
  all: ['calculator-prefill'] as const,
  weightLogs: () => [...calculatorPrefillKeys.all, 'weight-logs'] as const,
};

type UnitSystem = 'metric' | 'imperial';

export interface CalculatorPrefillValues {
  unitPreference: UnitSystem | null;
  age: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightKg: string;
  weightLb: string;
  hasPrefill: boolean;
}

export function mergeStringPrefill<T extends Record<string, string>>(
  current: T,
  prefill: Partial<T>,
): T {
  const merged = { ...current };

  for (const [key, value] of Object.entries(prefill)) {
    if (typeof value !== 'string' || value.trim() === '') {
      continue;
    }

    const currentValue = merged[key as keyof T];
    if (typeof currentValue === 'string' && currentValue.trim() === '') {
      merged[key as keyof T] = value as T[keyof T];
    }
  }

  return merged;
}

function calculateAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '';

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age > 0 ? String(age) : '';
}

export function useCalculatorPrefill(): CalculatorPrefillValues {
  const { isAuthenticated, profile } = useAuth();
  const { data: profileDetailsResponse } = useProfileDetails({
    enabled: isAuthenticated,
  });
  const { data: weightLogsResponse } = useQuery({
    queryKey: calculatorPrefillKeys.weightLogs(),
    queryFn: async () => {
      const response =
        await api.get<SuccessResponse<WeightLogsListData>>('weight?limit=30');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    retry: false,
  });

  return useMemo(() => {
    if (!isAuthenticated) {
      return {
        unitPreference: null,
        age: '',
        heightCm: '',
        heightFt: '',
        heightIn: '',
        weightKg: '',
        weightLb: '',
        hasPrefill: false,
      };
    }

    const unitPreference =
      profile?.unit === 'imperial' || profile?.unit === 'metric'
        ? profile.unit
        : null;

    const details = profileDetailsResponse?.data;
    const age = calculateAge(details?.dateOfBirth ?? null);

    const heightCmValue = details?.height ?? null;
    const heightCm =
      typeof heightCmValue === 'number' && heightCmValue > 0
        ? String(Number(heightCmValue.toFixed(1)))
        : '';

    const imperialHeight =
      typeof heightCmValue === 'number' && heightCmValue > 0
        ? convertHeightFromStorage(heightCmValue, 'imperial')
        : null;

    const heightFt =
      imperialHeight && Number.isFinite(imperialHeight.feet)
        ? String(imperialHeight.feet)
        : '';
    const heightIn =
      imperialHeight && typeof imperialHeight.inches === 'number'
        ? String(Number(imperialHeight.inches.toFixed(1)))
        : '';

    const items = weightLogsResponse?.data.items ?? [];
    const latestWeight = [...items].sort((a, b) => {
      const aTime = new Date(a.loggedAt).getTime();
      const bTime = new Date(b.loggedAt).getTime();
      return bTime - aTime;
    })[0];

    let latestWeightKg: number | null = null;
    if (latestWeight) {
      latestWeightKg =
        latestWeight.unit === 'KG'
          ? latestWeight.value
          : latestWeight.value / 2.2046226218;
    }

    const weightKg =
      typeof latestWeightKg === 'number' && latestWeightKg > 0
        ? String(Number(latestWeightKg.toFixed(1)))
        : '';

    const weightLbValue =
      typeof latestWeightKg === 'number' && latestWeightKg > 0
        ? convertWeightFromStorage(latestWeightKg, 'imperial')
        : null;

    const weightLb =
      typeof weightLbValue === 'number' && weightLbValue > 0
        ? String(Number(weightLbValue.toFixed(1)))
        : '';

    const hasPrefill =
      Boolean(unitPreference) ||
      age !== '' ||
      heightCm !== '' ||
      heightFt !== '' ||
      heightIn !== '' ||
      weightKg !== '' ||
      weightLb !== '';

    return {
      unitPreference,
      age,
      heightCm,
      heightFt,
      heightIn,
      weightKg,
      weightLb,
      hasPrefill,
    };
  }, [
    isAuthenticated,
    profile?.unit,
    profileDetailsResponse?.data,
    weightLogsResponse?.data.items,
  ]);
}
