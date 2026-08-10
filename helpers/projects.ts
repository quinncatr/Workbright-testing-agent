import { test } from '@playwright/test';
import path from 'node:path';

/**
 * Storage state saved by tests/auth.setup.ts (the `setup` project) and reused by every
 * supported project, so specs start already signed in. Gitignored; recreated on every
 * run. Lives here so playwright.config.ts and auth.setup.ts share one path.
 */
export const AUTH_FILE = path.resolve(__dirname, '..', 'playwright', '.auth', 'qa-user.json');

/**
 * Projects allowed to drive the single shared QA account. Desktop chromium plus the
 * mobile emulation projects (mobile-chrome = Pixel 7, mobile-safari = iPhone 15).
 * Desktop firefox/webkit stay excluded. workers=1 in playwright.config.ts keeps
 * multi-project runs sequential so the shared account is never used concurrently.
 */
export const SUPPORTED_PROJECTS = ['chromium', 'mobile-chrome', 'mobile-safari'] as const;

/**
 * Call once at the top of every spec file. Skips the spec on any project not in
 * SUPPORTED_PROJECTS instead of duplicating the guard in each file.
 */
export function limitToSupportedProjects(): void {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !(SUPPORTED_PROJECTS as readonly string[]).includes(testInfo.project.name),
      `single QA account; supported projects: ${SUPPORTED_PROJECTS.join(', ')}`,
    );
  });
}
