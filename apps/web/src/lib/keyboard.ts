import { Keyboard } from '@capacitor/keyboard';
import { isNativeApp } from '@/lib/capacitor';

type KeyboardListener = (info: { keyboardHeight: number }) => void;

export async function onKeyboardShow(
  cb: KeyboardListener,
): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  const handle = await Keyboard.addListener('keyboardWillShow', cb);
  return () => {
    void handle.remove();
  };
}

export async function onKeyboardHide(cb: () => void): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  const handle = await Keyboard.addListener('keyboardWillHide', cb);
  return () => {
    void handle.remove();
  };
}

export async function hideKeyboard(): Promise<void> {
  if (!isNativeApp()) return;
  await Keyboard.hide();
}

export async function setAccessoryBarVisible(visible: boolean): Promise<void> {
  if (!isNativeApp()) return;
  await Keyboard.setAccessoryBarVisible({ isVisible: visible });
}

export async function setKeyboardScroll(disabled: boolean): Promise<void> {
  if (!isNativeApp()) return;
  await Keyboard.setScroll({ isDisabled: disabled });
}
