import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import type { Project, List, Task, Commit, User } from './types';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { CommitsView } from './components/CommitsView';
import { DesktopSyncView } from './components/DesktopSyncView';
import { TaskModal } from './components/TaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const users = api.getKnownUsers();
  const [currentUser, setCurrentUser] = useState<User>(users[0]);
  const [projects, setProjects] = useState<Project[]>(api.getKnownProjects());
  const [currentProject, setCurrentProject] = useState<Project | null>(api.getKnownProjects()[0]);
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'commits' | 'desktop'>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch project data (lists, tasks, commits)
  const refreshProjectData = async (projectId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [fetchedLists, fetchedTasks, fetchedCommits] = await Promise.all([
        api.getLists(projectId),
        api.getTasks(projectId),
        api.getCommits(projectId),
      ]);

      // If no lists returned from API yet, initialize default view
      if (fetchedLists.length === 0) {
        setLists([
          { id: 'list-todo', name: 'To Do', position: 0, projectId },
          { id: 'list-inprogress', name: 'In Progress', position: 1, projectId },
          { id: 'list-done', name: 'Done', position: 2, projectId },
        ]);
      } else {
        setLists(fetchedLists);
      }

      setTasks(fetchedTasks);
      setCommits(fetchedCommits);
    } catch (err: any) {
      console.error('Failed to load project data:', err);
      setErrorMsg(err.message || 'Error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    // Also try to fetch latest projects from DB
    api.getProjects().then((dbProjects) => {
      if (dbProjects && dbProjects.length > 0) {
        setProjects(dbProjects);
        if (!currentProject) {
          setCurrentProject(dbProjects[0]);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (currentProject) {
      refreshProjectData(currentProject.id);
    }
  }, [currentProject?.id]);

  // Handlers for Kanban operations
  const handleCreateList = async (name: string) => {
    if (!currentProject) return;
    try {
      const newList = await api.createList(currentProject.id, name);
      setLists((prev) => [...prev, newList]);
    } catch {
      // Local fallback
      const localList: List = {
        id: `list-${Date.now()}`,
        name,
        position: lists.length,
        projectId: currentProject.id,
      };
      setLists((prev) => [...prev, localList]);
    }
  };

  const handleCreateTask = async (listId: string, title: string) => {
    if (!currentProject) return;
    try {
      const created = await api.createTask({
        title,
        listId,
        projectId: currentProject.id,
        assigneeId: currentUser.id,
      });
      setTasks((prev) => [...prev, created]);
    } catch {
      // Local fallback
      const localTask: Task = {
        id: `task-${Date.now()}`,
        title,
        description: null,
        position: tasks.filter((t) => t.listId === listId).length,
        stack: 'Fullstack',
        listId,
        projectId: currentProject.id,
        assigneeId: currentUser.id,
        commitId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, localTask]);
    }
  };

  const handleMoveTask = async (taskId: string, newListId: string, newPosition: number) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, listId: newListId, position: newPosition } : t))
    );

    try {
      await api.moveTask(taskId, newListId, newPosition);
    } catch (e) {
      console.warn('Backend move error (or demo mode):', e);
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: { title?: string; description?: string; stack?: string }
  ) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
    try {
      await api.updateTask(taskId, updates);
    } catch (e) {
      console.warn('Backend update error:', e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.deleteTask(taskId);
    } catch (e) {
      console.warn('Backend delete error:', e);
    }
  };

  const handleCreateProject = async (name: string) => {
    try {
      const newProj = await api.createProject(name);
      setProjects((prev) => [newProj, ...prev]);
      setCurrentProject(newProj);
    } catch {
      const localProj: Project = {
        id: `proj-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [localProj, ...prev]);
      setCurrentProject(localProj);
    }
  };

  const handleReportCommit = async (sha: string, message: string, taskIds: string[]) => {
    if (!currentProject) return;
    try {
      const commit = await api.reportCommit({
        sha,
        message,
        projectId: currentProject.id,
        authorId: currentUser.id,
        taskIds,
      });
      setCommits((prev) => [commit, ...prev]);
      // Refresh tasks to get updated commitId associations
      if (currentProject) refreshProjectData(currentProject.id);
    } catch (e) {
      console.error('Failed to report commit:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-300">
      {/* Header */}
      <Header
        projects={projects}
        currentProject={currentProject}
        onSelectProject={(p) => setCurrentProject(p)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        currentUser={currentUser}
        users={users}
        onSelectUser={(u) => setCurrentUser(u)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        taskCount={tasks.length}
        commitCount={commits.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Error / Alert banner if any */}
        {errorMsg && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg} (Make sure your backend is running on http://localhost:3000)</span>
            </div>
            <button
              onClick={() => currentProject && refreshProjectData(currentProject.id)}
              className="underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* View Switcher */}
        {activeTab === 'board' && (
          <KanbanBoard
            lists={lists}
            tasks={tasks}
            onCreateList={handleCreateList}
            onCreateTask={handleCreateTask}
            onMoveTask={handleMoveTask}
            onSelectTask={(task) => setSelectedTask(task)}
          />
        )}

        {activeTab === 'commits' && (
          <CommitsView
            commits={commits}
            currentProject={currentProject}
            currentUser={currentUser}
            tasks={tasks}
            onReportCommit={handleReportCommit}
            onSelectTaskById={(taskId) => {
              const t = tasks.find((x) => x.id === taskId);
              if (t) setSelectedTask(t);
            }}
          />
        )}

        {activeTab === 'desktop' && (
          <DesktopSyncView
            currentProject={currentProject}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      <CreateProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};

export default App;
