import {
  ActionSheet,
  ActionSheetButtonStyle,
  type ShowActionsResult,
} from '@capacitor/action-sheet';
import { isNativeApp } from '@/lib/capacitor';
import { hapticsLight } from '@/lib/haptics';

export interface ActionSheetOption {
  title: string;
  destructive?: boolean;
  handler: () => void;
}

/**
 * Show a native action sheet on iOS/Android.
 * Returns the selected index, or -1 if cancelled.
 * On web this is a no-op that returns -1 — callers
 * should use the existing DropdownMenu for web.
 */
export async function showNativeActionSheet(
  title: string,
  options: ActionSheetOption[],
): Promise<number> {
  if (!isNativeApp()) return -1;

  await hapticsLight();

  const buttons = [
    ...options.map((o) => ({
      title: o.title,
      style: o.destructive
        ? ActionSheetButtonStyle.Destructive
        : ActionSheetButtonStyle.Default,
    })),
    { title: 'Cancel', style: ActionSheetButtonStyle.Cancel },
  ];

  let result: ShowActionsResult;
  try {
    result = await ActionSheet.showActions({ title, options: buttons });
  } catch {
    return -1;
  }

  if (result.canceled || result.index < 0 || result.index >= options.length) {
    return -1;
  }

  options[result.index].handler();
  return result.index;
}
