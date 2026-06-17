import { useState, useEffect } from 'react';
import { getDateRangeFromPreset } from '@varaperformance/core';
import type { DateRangePreset, ChartColors } from './types';

export function useChartColors(): ChartColors {
  const [, setThemeTick] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeTick((previous) => previous + 1);
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const getColors = (): ChartColors => {
    if (typeof document === 'undefined') {
      return {
        chart1: 'oklch(0.6 0.22 255)',
        chart2: 'oklch(0.7 0.16 180)',
        chart3: 'oklch(0.75 0.14 145)',
        chart4: 'oklch(0.65 0.18 320)',
        chart5: 'oklch(0.8 0.12 60)',
        border: 'oklch(1 0 0 / 8%)',
        muted: 'oklch(0.22 0.015 270)',
        mutedForeground: 'oklch(0.65 0.01 270)',
        background: 'oklch(0.12 0.01 270)',
      };
    }
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    return {
      chart1:
        computedStyle.getPropertyValue('--chart-1').trim() ||
        'oklch(0.6 0.22 255)',
      chart2:
        computedStyle.getPropertyValue('--chart-2').trim() ||
        'oklch(0.7 0.16 180)',
      chart3:
        computedStyle.getPropertyValue('--chart-3').trim() ||
        'oklch(0.75 0.14 145)',
      chart4:
        computedStyle.getPropertyValue('--chart-4').trim() ||
        'oklch(0.65 0.18 320)',
      chart5:
        computedStyle.getPropertyValue('--chart-5').trim() ||
        'oklch(0.8 0.12 60)',
      border:
        computedStyle.getPropertyValue('--border').trim() ||
        'oklch(1 0 0 / 8%)',
      muted:
        computedStyle.getPropertyValue('--muted').trim() ||
        'oklch(0.22 0.015 270)',
      mutedForeground:
        computedStyle.getPropertyValue('--muted-foreground').trim() ||
        'oklch(0.65 0.01 270)',
      background:
        computedStyle.getPropertyValue('--background').trim() ||
        'oklch(0.12 0.01 270)',
    };
  };

  return getColors();
}

export const parseDateOnlyLocal = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const DATE_RANGE_PRESETS: Record<
  Exclude<DateRangePreset, 'custom'>,
  { label: string; getDates: () => { startDate: string; endDate: string } }
> = {
  today: {
    label: 'Today',
    getDates: () => getDateRangeFromPreset('today'),
  },
  '7d': {
    label: 'Last 7 days',
    getDates: () => getDateRangeFromPreset('7d'),
  },
  '30d': {
    label: 'Last 30 days',
    getDates: () => getDateRangeFromPreset('30d'),
  },
  '60d': {
    label: 'Last 60 days',
    getDates: () => getDateRangeFromPreset('60d'),
  },
  '90d': {
    label: 'Last 90 days',
    getDates: () => getDateRangeFromPreset('90d'),
  },
  '1y': {
    label: 'Last year',
    getDates: () => getDateRangeFromPreset('1y'),
  },
};

export const formatDecimal = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
