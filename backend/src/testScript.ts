import { taskRepository } from './repositories/taskRepository';

async function main() {
  const listId = '9f6256f1-880f-4e3a-b05a-79a642cdccfe';

  const task = await taskRepository.createTask({ title: 'Test Task 1', listId });
  console.log('Created task:', task);
}

main()
  .then(() => console.log('Done.'))
  .catch((err) => console.error('Script failed:', err));