import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PermissionType =
  | 'camera'
  | 'photo'
  | 'microphone'
  | 'media-images'
  | 'media-video'
  | 'media-audio';

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

export interface PermissionRationale {
  title: string;
  message: string;
  examples?: string[];
}

const CACHE_KEY_PREFIX = 'sheild_permission_status_';

function cacheKey(type: PermissionType): string {
  return `${CACHE_KEY_PREFIX}${type}`;
}

async function cacheStatus(type: PermissionType, status: PermissionStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(type), status);
  } catch (e) {
    console.warn('Failed to cache permission status', type, e);
  }
}

export async function getCachedStatus(type: PermissionType): Promise<PermissionStatus | null> {
  try {
    const v = await AsyncStorage.getItem(cacheKey(type));
    if (!v) return null;
    if (v === 'granted' || v === 'denied' || v === 'blocked' || v === 'unavailable') return v;
    return null;
  } catch (e) {
    console.warn('Failed to read cached permission status', type, e);
    return null;
  }
}

function isAndroid13OrAbove(): boolean {
  return Platform.OS === 'android' && (Platform.Version as number) >= 33;
}

async function checkAndroidPermission(permission: string): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';
  try {
    const granted = await PermissionsAndroid.check(permission as any);
    return granted ? 'granted' : 'denied';
  } catch (e) {
    console.warn('checkAndroidPermission error', permission, e);
    return 'unavailable';
  }
}

async function requestAndroidPermission(permission: string): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';
  try {
    const result = await PermissionsAndroid.request(permission as any);
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }

    // Heuristic for blocked: denied and no rationale
    const canAskAgain = await PermissionsAndroid.shouldShowRequestPermissionRationale(
      permission as any,
    );
    return canAskAgain ? 'denied' : 'blocked';
  } catch (e) {
    console.warn('requestAndroidPermission error', permission, e);
    return 'unavailable';
  }
}

export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn('Failed to open app settings', e);
  }
}

export async function checkPermission(type: PermissionType): Promise<PermissionStatus> {
  if (Platform.OS === 'android') {
    switch (type) {
      case 'camera':
        return checkAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA as any);
      case 'microphone':
        return checkAndroidPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as any);
      case 'photo':
      case 'media-images':
        if (isAndroid13OrAbove() && (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_IMAGES) {
          return checkAndroidPermission((PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_IMAGES);
        }
        return checkAndroidPermission(
          (PermissionsAndroid as any).PERMISSIONS.READ_EXTERNAL_STORAGE ??
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
      case 'media-video':
        if (isAndroid13OrAbove() && (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_VIDEO) {
          return checkAndroidPermission((PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_VIDEO);
        }
        return checkAndroidPermission(
          (PermissionsAndroid as any).PERMISSIONS.READ_EXTERNAL_STORAGE ??
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
      case 'media-audio':
        if (isAndroid13OrAbove() && (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_AUDIO) {
          return checkAndroidPermission((PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_AUDIO);
        }
        return checkAndroidPermission(
          (PermissionsAndroid as any).PERMISSIONS.READ_EXTERNAL_STORAGE ??
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
      default:
        return 'unavailable';
    }
  }

  // iOS: let system / underlying libs handle, we only track logical state here
  return 'unavailable';
}

function buildRationaleAlert(rationale: PermissionRationale): Promise<boolean> {
  const { title, message, examples } = rationale;
  const fullMessage =
    message + (examples && examples.length ? `\n\nExamples:\n- ${examples.join('\n- ')}` : '');

  return new Promise((resolve) => {
    Alert.alert(title, fullMessage, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Allow', onPress: () => resolve(true) },
    ]);
  });
}

function showBlockedAlert(rationale: PermissionRationale): void {
  const { title, message } = rationale;
  Alert.alert(
    `${title} required`,
    `${message}\n\nYou have previously denied this permission. Please enable it from settings to use this feature.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          openAppSettings();
        },
      },
    ],
  );
}

export async function requestPermissionWithRationale(
  type: PermissionType,
  rationale: PermissionRationale,
): Promise<PermissionStatus> {
  // 1. Check current status to avoid repeated prompts
  const current = await checkPermission(type);
  console.log('[Permission] check', type, '=>', current);

  if (current === 'granted') {
    await cacheStatus(type, 'granted');
    return 'granted';
  }

  if (current === 'blocked') {
    await cacheStatus(type, 'blocked');
    showBlockedAlert(rationale);
    return 'blocked';
  }

  // 2. Show custom rationale dialog
  const approved = await buildRationaleAlert(rationale);
  if (!approved) {
    console.log('[Permission] user cancelled rationale for', type);
    return current === 'denied' ? 'denied' : 'unavailable';
  }

  // 3. Request OS permission
  let result: PermissionStatus = 'unavailable';

  if (Platform.OS === 'android') {
    switch (type) {
      case 'camera':
        result = await requestAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA as any);
        break;
      case 'microphone':
        result = await requestAndroidPermission(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as any,
        );
        break;
      case 'photo':
      case 'media-images':
        if (isAndroid13OrAbove() && (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_IMAGES) {
          result = await requestAndroidPermission(
            (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_IMAGES,
          );
        } else {
          result = await requestAndroidPermission(
            (PermissionsAndroid as any).PERMISSIONS.READ_EXTERNAL_STORAGE ??
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
        }
        break;
      case 'media-video':
        if (isAndroid13OrAbove() && (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_VIDEO) {
          result = await requestAndroidPermission(
            (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_VIDEO,
          );
        } else {
          result = await requestAndroidPermission(
            (PermissionsAndroid as any).PERMISSIONS.READ_EXTERNAL_STORAGE ??
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
        }
        break;
      case 'media-audio':
        if (isAndroid13OrAbove() && (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_AUDIO) {
          result = await requestAndroidPermission(
            (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_AUDIO,
          );
        } else {
          result = await requestAndroidPermission(
            (PermissionsAndroid as any).PERMISSIONS.READ_EXTERNAL_STORAGE ??
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
        }
        break;
      default:
        result = 'unavailable';
    }
  } else {
    // iOS: delegate to underlying libraries; just pretend unavailable here
    result = 'unavailable';
  }

  console.log('[Permission] request result', type, '=>', result);
  await cacheStatus(type, result);

  if (result === 'blocked') {
    showBlockedAlert(rationale);
  } else if (result === 'denied') {
    Alert.alert(
      `${rationale.title} denied`,
      `${rationale.message}\n\nYou can enable this later from your device settings to use this feature.`,
    );
  }

  return result;
}
