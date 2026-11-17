import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersApi, ApiError, PublicProfile } from '../../api/client';
import { Avatar } from './Avatar';
import { Loader2, X, Crown, ShieldCheck, FolderKanban } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ProfileCardProps {
  userId: string;
  onClose: () => void;
}

export function ProfileCard({ userId, onClose }: ProfileCardProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false; // ignore an answer that arrives after the card was closed or switched
    setLoading(true);
    setError('');
    setProfile(null);

    usersApi
      .get(userId)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "This profile isn't available."
            : 'Failed to load this profile'
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop: clicking it closes the card */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Member profile"
        className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar bg-[#151713] border border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-2xl p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-[#6E7268] hover:text-[#F4F5EF] hover:bg-[#23271F] rounded-lg transition-colors"
        >
          <X size={16} />
        </button>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#D0E36A]" size={24} />
          </div>
        )}

        {!loading && error && (
          <p className="py-10 text-center text-sm text-[#A1A69B]">{error}</p>
        )}

        {profile && (
          <>
            <div className="flex items-center gap-4 mb-5 pr-8">
              <Avatar userId={profile.id} name={profile.name} size="lg" />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-[#F4F5EF] truncate">
                  {profile.name}
                  {user?.id === profile.id && (
                    <span className="text-[#6E7268] ml-2 text-sm font-normal">(you)</span>
                  )}
                </h2>
                {profile.username && (
                  <p className="text-sm text-[#D0E36A] font-mono">@{profile.username}</p>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm text-[#F4F5EF] leading-relaxed whitespace-pre-wrap break-words mb-5">
                {profile.bio}
              </p>
            )}

            {profile.skills.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-[#A1A69B] uppercase tracking-wider mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#D0E36A]/10 text-[#D0E36A] border border-[#D0E36A]/25"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.sharedProjects.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#A1A69B] uppercase tracking-wider mb-2">
                  Projects you share
                </h3>
                <div className="space-y-2">
                  {profile.sharedProjects.map((p) => (
                    <div
                      key={p.projectId}
                      className="flex items-center justify-between gap-3 px-3 py-2 bg-[#1B1E19] border border-[rgba(255,255,255,0.06)] rounded-lg"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FolderKanban size={13} className="text-[#6E7268] shrink-0" />
                        <span className="text-sm text-[#F4F5EF] truncate">{p.projectName}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#A1A69B]">{p.stack}</span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border',
                            p.role === 'OWNER'
                              ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30'
                              : 'text-[#A1A69B] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]'
                          )}
                        >
                          {p.role === 'OWNER' ? <Crown size={9} /> : <ShieldCheck size={9} />}
                          {p.role}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!profile.bio && profile.skills.length === 0 && (
              <p className="text-sm text-[#6E7268]">No bio or skills added yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}