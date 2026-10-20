import {
  APP_CURRENT_VERSION,
  DEFAULT_GITHUB_REPO,
  parseGitHubReleaseResponse,
  type GitHubReleaseCheckResult,
} from './storageAndSyncLogic';

/**
 * Queries GitHub Releases API for the repository and also checks the PWA Service Worker for updates.
 */
export async function checkGitHubReleaseUpdate(
  repoSlug: string = DEFAULT_GITHUB_REPO,
  currentVersion: string = APP_CURRENT_VERSION
): Promise<GitHubReleaseCheckResult> {
  const cleanRepo = repoSlug.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '') || DEFAULT_GITHUB_REPO;

  // Trigger Service Worker update check in parallel if supported
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
      }
    } catch {
      // Non-fatal
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      checkedAt: new Date().toISOString(),
      repoSlug: cleanRepo,
      currentVersion,
      latestVersion: currentVersion,
      tagName: `v${currentVersion}`,
      releaseName: `Haryana Medical Store v${currentVersion} (Offline)`,
      publishedAt: new Date().toISOString(),
      releaseNotes:
        'Device is currently offline. Embedded signed APK is available locally; connect to the internet to check GitHub Releases.',
      htmlUrl: `https://github.com/${cleanRepo}/releases`,
      hasUpdate: false,
      apkAsset: {
        name: 'HaryanaMedicalStore-Release.apk',
        downloadUrl: '/haryana-medical-store-release.apk',
        sizeBytes: 3565158,
        contentType: 'application/vnd.android.package-archive',
      },
      status: 'offline-error',
      message: 'Device is offline. Using built-in signed APK package.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    // 1. Try /releases/latest first
    const latestUrl = `https://api.github.com/repos/${cleanRepo}/releases/latest`;
    const latestRes = await fetch(latestUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
      signal: controller.signal,
    });

    if (latestRes.ok) {
      const data = await latestRes.json();
      clearTimeout(timeoutId);
      return parseGitHubReleaseResponse(data, currentVersion, cleanRepo);
    }

    // 2. Fallback to /releases list (in case latest is a pre-release or draft-free tag release)
    const listUrl = `https://api.github.com/repos/${cleanRepo}/releases?per_page=5`;
    const listRes = await fetch(listUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData) && listData.length > 0) {
        return parseGitHubReleaseResponse(listData[0], currentVersion, cleanRepo);
      }
    }

    return parseGitHubReleaseResponse(null, currentVersion, cleanRepo);
  } catch {
    clearTimeout(timeoutId);
    return parseGitHubReleaseResponse(null, currentVersion, cleanRepo);
  }
}
