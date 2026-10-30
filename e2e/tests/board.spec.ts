import { expect, test } from '@playwright/test';
import { createProject, newUser, register } from './helpers';

test('a new user registers, creates a project and adds a task that survives a reload', async ({ page }) => {
  await register(page, newUser('Owner'));
  await createProject(page, 'Apollo');

  for (const list of ['To Do', 'In Progress', 'Done']) {
    await expect(page.getByText(list, { exact: true }).first()).toBeVisible();
  }

  await page.getByTitle('Add task').first().click();
  await page.getByPlaceholder('Task title...').fill('Write the launch checklist');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Write the launch checklist')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Write the launch checklist')).toBeVisible();
});

test('signed-out visitors are sent to login and back after signing in', async ({ page, browser }) => {
  const owner = newUser('Owner');
  await register(page, owner);
  const projectId = await createProject(page, 'Gemini');

  const fresh = await browser.newContext();
  const visitor = await fresh.newPage();
  await visitor.goto(`/projects/${projectId}`);
  await expect(visitor).toHaveURL(/\/login$/);

  await visitor.getByLabel(/email/i).fill(owner.email);
  await visitor.getByLabel(/password/i).fill(owner.password);
  await visitor.getByRole('button', { name: /sign in/i }).click();
  await expect(visitor).toHaveURL(new RegExp(`/projects/${projectId}$`));
  await fresh.close();
});
