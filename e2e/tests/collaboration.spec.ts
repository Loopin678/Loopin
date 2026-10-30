import { expect, test } from '@playwright/test';
import { createProject, newUser, register } from './helpers';

test('an owner invites a teammate, who accepts from the bell and chats live', async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  const mateCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  const mate = await mateCtx.newPage();

  const teammate = newUser('Mate');
  await register(mate, teammate);
  await register(owner, newUser('Owner'));
  const projectId = await createProject(owner, 'Artemis');

  // Invite
  await owner.goto(`/projects/${projectId}/members`);
  await owner.getByRole('button', { name: /invite member/i }).click();
  await owner.getByPlaceholder('user@example.com').fill(teammate.email);
  await owner.getByPlaceholder(/e\.g\. Frontend/).fill('Frontend');
  await owner.getByRole('button', { name: 'Send Invitation' }).click();

  // The invitee sees it in the bell and accepts
  await mate.goto('/projects');
  const bell = mate.getByRole('button', { name: /notifications — 1 pending/i });
  await expect(bell).toBeVisible();
  await bell.click();
  await mate.getByRole('button', { name: 'Accept invitation to Artemis' }).click();

  // Both open the chat; a message from one appears for the other without reloading
  await mate.goto(`/projects/${projectId}/chat`);
  await owner.goto(`/projects/${projectId}/chat`);
  const input = owner.getByPlaceholder(/message your team/i);
  await input.fill('Kickoff at 10, see you there');
  await owner.getByTitle('Send message').click();
  await expect(mate.getByText('Kickoff at 10, see you there')).toBeVisible();

  await ownerCtx.close();
  await mateCtx.close();
});
