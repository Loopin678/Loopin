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

// Insert a new commit
app.post('/api/commits', async (req, res) => {
  const { sha, message, projectId, authorId, taskId } = req.body;
  
  if (!sha || !message || !projectId || !authorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const commit = await prisma.commit.create({
      data: {
        id: sha,
        message,
        projectId,
        authorId,
        taskId: taskId || null
      }
    });
    res.status(201).json(commit);
  } catch (error) {
    console.error('Error creating commit:', error);
    // If it already exists, just return 200 OK to avoid crashing the flow
    if (error.code === 'P2002') {
       return res.status(200).json({ status: 'already_exists' });
    }
    res.status(500).json({ error: 'Failed to insert commit' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
