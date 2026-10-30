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
        className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#1C2127] rounded-lg transition-colors"
        >
          <X size={16} />
        </button>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#5EE6B0]" size={24} />
          </div>
        )}

        {!loading && error && (
          <p className="py-10 text-center text-sm text-[#8A9099]">{error}</p>
        )}

        {profile && (
          <>
            <div className="flex items-center gap-4 mb-5 pr-8">
              <Avatar userId={profile.id} name={profile.name} size="lg" />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-[#ECEAE4] truncate">
                  {profile.name}
                  {user?.id === profile.id && (
                    <span className="text-[#5B616A] ml-2 text-sm font-normal">(you)</span>
                  )}
                </h2>
                {profile.username && (
                  <p className="text-sm text-[#5EE6B0] font-mono">@{profile.username}</p>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm text-[#ECEAE4] leading-relaxed whitespace-pre-wrap break-words mb-5">
                {profile.bio}
              </p>
            )}

            {profile.skills.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-[#8A9099] uppercase tracking-wider mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#5EE6B0]/10 text-[#5EE6B0] border border-[#5EE6B0]/25"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.sharedProjects.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#8A9099] uppercase tracking-wider mb-2">
                  Projects you share
                </h3>
                <div className="space-y-2">
                  {profile.sharedProjects.map((p) => (
                    <div
                      key={p.projectId}
                      className="flex items-center justify-between gap-3 px-3 py-2 bg-[#161A1F] border border-[rgba(255,255,255,0.06)] rounded-lg"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FolderKanban size={13} className="text-[#5B616A] shrink-0" />
                        <span className="text-sm text-[#ECEAE4] truncate">{p.projectName}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#8A9099]">{p.stack}</span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border',
                            p.role === 'OWNER'
                              ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30'
                              : 'text-[#8A9099] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]'
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
              <p className="text-sm text-[#5B616A]">No bio or skills added yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}