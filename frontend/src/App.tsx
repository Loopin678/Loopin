import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import type { Project, List, Task, Commit, User, ProjectMember, ProjectInvite } from './types';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { CommitsView } from './components/CommitsView';
import { DesktopSyncView } from './components/DesktopSyncView';
import { TaskModal } from './components/TaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProjectMembersModal } from './components/ProjectMembersModal';
import { InvitesModal } from './components/InvitesModal';
import { AuthScreen } from './components/AuthScreen';
import { AlertCircle, FolderPlus, Sparkles, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [myInvites, setMyInvites] = useState<ProjectInvite[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'commits' | 'desktop'>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Check existing session on mount
  useEffect(() => {
    api.getMe()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, []);

  // 2. Fetch projects whenever currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setProjects([]);
      setCurrentProject(null);
      setMembers([]);
      setMyInvites([]);
      setLists([]);
      setTasks([]);
      setCommits([]);
      return;
    }

    setLoading(true);
    api.getProjects()
      .then((userProjects) => {
        setProjects(userProjects);
        if (userProjects.length > 0) {
          // Select previous or first project
          setCurrentProject((prev) => {
            if (prev && userProjects.some((p) => p.id === prev.id)) {
              return prev;
            }
            return userProjects[0];
          });
        } else {
          setCurrentProject(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load user projects:', err);
        setErrorMsg('Failed to fetch your projects');
      })
      .finally(() => {
        setLoading(false);
      });

    // Check pending invitations for current user
    refreshMyInvites();

    // Check if invite ID was passed in query parameter
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    if (inviteParam) {
      setIsInvitesModalOpen(true);
    }
  }, [currentUser]);

  // 3. Fetch project data (lists, tasks, commits, members) when active project changes
  const refreshProjectData = async (projectId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [fetchedLists, fetchedTasks, fetchedCommits, fetchedMembers] = await Promise.all([
        api.getLists(projectId),
        api.getTasks(projectId),
        api.getCommits(projectId),
        api.getProjectMembers(projectId),
      ]);

      if (fetchedLists.length === 0) {
        setLists([
          { id: 'list-backlog', name: 'Backlog', position: 0, projectId },
          { id: 'list-inprogress', name: 'In Progress', position: 1, projectId },
          { id: 'list-review', name: 'Review', position: 2, projectId },
          { id: 'list-done', name: 'Done', position: 3, projectId },
        ]);
      } else {
        setLists(fetchedLists);
      }

      setTasks(fetchedTasks);
      setCommits(fetchedCommits);
      setMembers(fetchedMembers);
    } catch (err: any) {
      console.error('Failed to load project data:', err);
      setErrorMsg(err.message || 'Error connecting to project data');
    } finally {
      setLoading(false);
    }
  };

  const refreshProjectMembers = async (projectId: string) => {
    try {
      const m = await api.getProjectMembers(projectId);
      setMembers(m);
    } catch (e) {
      console.error('Failed to refresh members:', e);
    }
  };

  const refreshMyInvites = async () => {
    if (!currentUser) return;
    try {
      const invs = await api.getMyInvites();
      setMyInvites(invs);
    } catch (e) {
      console.error('Failed to fetch invites:', e);
    }
  };

  const handleInviteHandled = async (acceptedProject?: Project) => {
    await refreshMyInvites();
    if (acceptedProject) {
      const projs = await api.getProjects();
      setProjects(projs);
      const found = projs.find((p) => p.id === acceptedProject.id) || projs[0];
      if (found) {
        setCurrentProject(found);
      }
      setIsInvitesModalOpen(false);
    }
  };

  useEffect(() => {
    if (currentProject) {
      refreshProjectData(currentProject.id);
    } else {
      setLists([]);
      setTasks([]);
      setCommits([]);
      setMembers([]);
    }
  }, [currentProject?.id]);

  // Auth Handlers
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setProjects([]);
    setCurrentProject(null);
    setMembers([]);
    setMyInvites([]);
    setTasks([]);
    setLists([]);
    setCommits([]);
  };

  // Kanban Handlers
  const handleCreateList = async (name: string) => {
    if (!currentProject) return;
    try {
      const newList = await api.createList(currentProject.id, name);
      setLists((prev) => [...prev, newList]);
    } catch {
      const localList: List = {
        id: `list-${Date.now()}`,
        name,
        position: lists.length,
        projectId: currentProject.id,
      };
      setLists((prev) => [...prev, localList]);
    }
  };

  const handleCreateTask = async (
    listId: string,
    title: string,
    priority: string = 'medium',
    dueDate?: string,
    assigneeId?: string
  ) => {
    if (!currentProject || !currentUser) return;
    const targetAssigneeId = assigneeId || currentUser.id;
    try {
      const created = await api.createTask({
        title,
        listId,
        projectId: currentProject.id,
        priority,
        dueDate,
        assigneeId: targetAssigneeId,
      });
      setTasks((prev) => [...prev, created]);
    } catch {
      const assignedMember = members.find((m) => m.userId === targetAssigneeId);
      const localTask: Task = {
        id: `task-${Date.now()}`,
        title,
        description: null,
        position: tasks.filter((t) => t.listId === listId).length,
        stack: 'Fullstack',
        priority: priority as any,
        dueDate: dueDate || null,
        listId,
        projectId: currentProject.id,
        assigneeId: targetAssigneeId,
        assignee: assignedMember?.user || { id: currentUser.id, name: currentUser.name, email: currentUser.email },
        commitId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, localTask]);
    }
  };

  const handleMoveTask = async (taskId: string, newListId: string, newPosition: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, listId: newListId, position: newPosition } : t
      )
    );
    try {
      await api.moveTask(taskId, newListId, newPosition);
    } catch (e) {
      console.warn('Backend move error:', e);
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      stack?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
    }
  ) => {
    let assigneeObj: { id: string; name: string; email: string } | null | undefined = undefined;
    if (updates.assigneeId) {
      const member = members.find((m) => m.userId === updates.assigneeId);
      if (member?.user) {
        assigneeObj = member.user;
      }
    } else if (updates.assigneeId === '') {
      assigneeObj = null;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              ...updates,
              ...(assigneeObj !== undefined ? { assignee: assigneeObj } : {}),
            }
          : t
      )
    );

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
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setErrorMsg(err.message || 'Failed to create project');
    }
  };

  const handleReportCommit = async (sha: string, message: string, taskIds: string[]) => {
    if (!currentProject || !currentUser) return;
    try {
      const commit = await api.reportCommit({
        sha,
        message,
        projectId: currentProject.id,
        authorId: currentUser.id,
        taskIds,
      });
      setCommits((prev) => [commit, ...prev]);
      if (currentProject) refreshProjectData(currentProject.id);
    } catch (e) {
      console.error('Failed to report commit:', e);
    }
  };

  // If session is checking
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground font-medium">Loading Loopin Workspace...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show Auth Screen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/25 selection:text-primary">
      {/* Header */}
      <Header
        projects={projects}
        currentProject={currentProject}
        onSelectProject={(p) => setCurrentProject(p)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        taskCount={tasks.length}
        commitCount={commits.length}
        membersCount={members.length}
        pendingInvitesCount={myInvites.length}
        onOpenMembersModal={() => setIsMembersModalOpen(true)}
        onOpenInvitesModal={() => setIsInvitesModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {errorMsg && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-2 flex items-center justify-between text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => currentProject && refreshProjectData(currentProject.id)}
              className="underline hover:text-foreground"
            >
              Retry
            </button>
          </div>
        )}

        {/* If user has no projects yet */}
        {projects.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 text-primary shadow-xl">
              <FolderPlus className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Projects Found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your account ({currentUser.email}) has isolated access. Create your first project or accept a pending invitation to start collaborating!
            </p>
            <button
              onClick={() => setIsNewProjectOpen(true)}
              className="py-3 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 text-sm transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'board' && (
              <KanbanBoard
                lists={lists}
                tasks={tasks}
                members={members}
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
          </>
        )}
      </main>

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        members={members}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      <CreateProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={handleCreateProject}
      />

      <ProjectMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        project={currentProject}
        currentUser={currentUser}
        onMembersUpdated={() => currentProject && refreshProjectMembers(currentProject.id)}
      />

      <InvitesModal
        isOpen={isInvitesModalOpen}
        onClose={() => setIsInvitesModalOpen(false)}
        invites={myInvites}
        onInviteHandled={handleInviteHandled}
      />
    </div>
  );
};

export default App;
