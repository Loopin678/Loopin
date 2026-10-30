import { expect, Page } from '@playwright/test';

let n = 0;
// Unique per run, so tests never collide with leftovers in the database
export function newUser(label: string) {
  const id = `${Date.now().toString(36)}${(n++).toString(36)}`;
  return { name: `${label} ${id}`, email: `${label.toLowerCase()}-${id}@e2e.test`, password: 'e2e-password-123' };
}

export async function register(page: Page, user: { name: string; email: string; password: string }) {
  await page.goto('/register');
  await page.getByLabel(/name/i).fill(user.name);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/home$/);
}

export async function createProject(page: Page, name: string): Promise<string> {
  await page.goto('/projects');
  await page.getByRole('button', { name: /new project|create first project/i }).first().click();
  await page.getByPlaceholder('e.g. Loopin v2, Campus App').fill(name);
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  return page.url().split('/').pop()!;
}
