import { getApkDownloadUrl, APK_FILE_PATH, APK_FILE_NAME } from '@/infrastructure/download/apk-download';

describe('apk-download url resolution', () => {
  const OLD_APK_URL = process.env.EXPO_PUBLIC_ANDROID_APK_URL;
  const OLD_API_URL = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (OLD_APK_URL === undefined) delete process.env.EXPO_PUBLIC_ANDROID_APK_URL;
    else process.env.EXPO_PUBLIC_ANDROID_APK_URL = OLD_APK_URL;
    if (OLD_API_URL === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = OLD_API_URL;
  });

  it('exposes the stable file name and path', () => {
    expect(APK_FILE_NAME).toBe('motivation-calendar.apk');
    expect(APK_FILE_PATH).toBe('/downloads/motivation-calendar.apk');
  });

  it('prefers an explicit EXPO_PUBLIC_ANDROID_APK_URL override (Releases/EAS)', () => {
    process.env.EXPO_PUBLIC_ANDROID_APK_URL = 'https://github.com/org/repo/releases/download/v1.0.0/app.apk';
    expect(getApkDownloadUrl('https://api.example.com')).toBe(
      'https://github.com/org/repo/releases/download/v1.0.0/app.apk'
    );
  });

  it('derives the download url from an absolute api base (mismo backend que la web)', () => {
    delete process.env.EXPO_PUBLIC_ANDROID_APK_URL;
    expect(getApkDownloadUrl('https://api.example.com/')).toBe(
      'https://api.example.com/downloads/motivation-calendar.apk'
    );
  });

  it('falls back to a relative path when the api base is empty (proxy nginx /downloads/)', () => {
    delete process.env.EXPO_PUBLIC_ANDROID_APK_URL;
    expect(getApkDownloadUrl('')).toBe('/downloads/motivation-calendar.apk');
  });

  it('uses EXPO_PUBLIC_API_URL when no explicit base is given', () => {
    delete process.env.EXPO_PUBLIC_ANDROID_APK_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://backend.example.com';
    expect(getApkDownloadUrl()).toBe('https://backend.example.com/downloads/motivation-calendar.apk');
  });
});
