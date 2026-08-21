require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Get all tasks for a project
app.get('/api/projects/:projectId/tasks', async (req, res) => {
  const { projectId } = req.params;
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { position: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get all commits for a project
app.get('/api/projects/:projectId/commits', async (req, res) => {
  const { projectId } = req.params;
  try {
    const commits = await prisma.commit.findMany({
      where: { projectId },
      include: { tasks: true }
    });
    res.json(commits);
  } catch (error) {
    console.error('Error fetching commits:', error);
    res.status(500).json({ error: 'Failed to fetch commits' });
  }
});

// Insert a new commit
app.post('/api/commits', async (req, res) => {
  const { sha, message, projectId, authorId, taskIds } = req.body;
  
  if (!sha || !message || !projectId || !authorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const tasksToConnect = Array.isArray(taskIds) ? taskIds.map(id => ({ id })) : [];

  try {
    const commit = await prisma.commit.upsert({
      where: { id: sha },
      update: { 
        tasks: {
          set: tasksToConnect
        }
      },
      create: {
        id: sha,
        message,
        projectId,
        authorId,
        tasks: {
          connect: tasksToConnect
        }
      }
    });
    res.status(201).json(commit);
  } catch (error) {
    console.error('Error creating/updating commit:', error);
    res.status(500).json({ error: 'Failed to insert or update commit' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
