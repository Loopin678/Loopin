import { create } from 'zustand';
import { ProjectMember } from '../api/client';

interface MemberState {
  namesById: Record<string, string>; // userId -> display name
  loaded: boolean;                   // false until the first fetch finishes
  setMembers: (members: ProjectMember[]) => void;
  clearMembers: () => void;
  renameMember: (userId: string, name: string) => void;
}

export const useMemberStore = create<MemberState>((set) => ({
  namesById: {},
  loaded: false,

  setMembers: (members) => {
    const namesById: Record<string, string> = {};
    for (const m of members) {
      if (m.user) namesById[m.userId] = m.user.name;
    }
    set({ namesById, loaded: true });
  },

  clearMembers: () => set({ namesById: {}, loaded: false }),

  // A member changed their display name: update just that entry
  renameMember: (userId, name) =>
    set((state) => ({ namesById: { ...state.namesById, [userId]: name } })),
}));