import React, { useEffect, useMemo, useState } from 'react';
import { ConnectedApps } from '../components/profile/ConnectedApps';
import { useAuth } from '../context/AuthContext';
import { usersApi, ApiError, OwnProfile } from '../api/client';
import { Avatar } from '../components/common/Avatar';
import {
  Loader2, X, Mail, Lock, Globe, Calendar, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';

// These mirror the server's limits. The server re-checks everything.
const NAME_MAX = 50;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const BIO_MAX = 160;
const SKILLS_MAX = 10;
const SKILL_MAX_LENGTH = 24;

const inputClass =
  'w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]';
const labelClass = 'block text-xs font-semibold text-[#8A9099] uppercase tracking-wider mb-1.5';

// Instant feedback only. Reserved words are checked by the server and come back as a message.
function usernameProblem(username: string): string | null {
  if (!username) return 'Pick a username';
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Use ${USERNAME_MIN}-${USERNAME_MAX} characters`;
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Only lowercase letters, numbers and underscores';
  }
  return null;
}

export function Profile() {
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillError, setSkillError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Copies the server's values into the form
  const fillForm = (p: OwnProfile) => {
    setName(p.name);
    setUsername(p.username ?? '');
    setBio(p.bio ?? '');
    setSkills(p.skills);
    setSkillInput('');
    setSkillError('');
  };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const p = await usersApi.me();
      setProfile(p);
      fillForm(p);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Validation and "has anything changed?" ────────────────────────────────

  const trimmedName = name.trim();
  const nameProblem =
    trimmedName.length < 1
      ? 'Name is required'
      : trimmedName.length > NAME_MAX
      ? `At most ${NAME_MAX} characters`
      : null;
  const handleProblem = usernameProblem(username);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return (
      trimmedName !== profile.name ||
      username !== (profile.username ?? '') ||
      bio.trim() !== (profile.bio ?? '') ||
      JSON.stringify(skills) !== JSON.stringify(profile.skills)
    );
  }, [profile, trimmedName, username, bio, skills]);

  const canSave = dirty && !nameProblem && !handleProblem && !saving;

  // ── Skills (tags) ─────────────────────────────────────────────────────────

  const addSkill = (raw: string) => {
    const skill = raw.trim().replace(/\s+/g, ' ');
    if (!skill) return;

    if (skill.length > SKILL_MAX_LENGTH) {
      setSkillError(`Each skill can be at most ${SKILL_MAX_LENGTH} characters`);
      return;
    }
    if (skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setSkillInput(''); // already there: "React" and "react" count once
      return;
    }
    if (skills.length >= SKILLS_MAX) {
      setSkillError(`You can list at most ${SKILLS_MAX} skills`);
      return;
    }

    setSkills((prev) => [...prev, skill]);
    setSkillInput('');
    setSkillError('');
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
    setSkillError('');
  };

  // ── Save / discard ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !canSave) return;

    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const updated = await usersApi.updateMe({
        name: trimmedName,
        username,
        bio: bio.trim() === '' ? null : bio.trim(),
        skills,
      });

      setProfile(updated);
      fillForm(updated); // shows exactly what the server stored (trimmed, de-duplicated)

      // Keep the sidebar and the Home greeting in sync without a reload
      if (user) setUser({ ...user, name: updated.name, username: updated.username });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save your profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (profile) fillForm(profile);
    setSaveError('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#5EE6B0]" size={32} />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{loadError || 'Profile not available'}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-[#161A1F] text-[#ECEAE4] rounded-lg text-sm border border-[rgba(255,255,255,0.08)] hover:bg-[#1C2127]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <Avatar userId={profile.id} name={profile.name} size="xl" />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-[#ECEAE4] truncate">{profile.name}</h1>
            <p className="text-sm text-[#5EE6B0] font-mono mt-1">
              {profile.username ? `@${profile.username}` : 'No username yet'}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 space-y-5 mb-6"
        >
          <h2 className="text-sm font-bold text-[#ECEAE4] uppercase tracking-wider">Profile</h2>

          {/* Name */}
          <div>
            <label className={labelClass} htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX + 10}
              autoComplete="name"
              className={inputClass}
            />
            {nameProblem && <p className="text-xs text-red-400 mt-1.5">{nameProblem}</p>}
          </div>

          {/* Username */}
          <div>
            <label className={labelClass} htmlFor="profile-username">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B616A] text-sm pointer-events-none">@</span>
              <input
                id="profile-username"
                type="text"
                value={username}
                // Always lowercase and no spaces, so what you see is what gets saved
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                maxLength={USERNAME_MAX}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                className={cn(inputClass, 'pl-7 font-mono')}
              />
            </div>
            {handleProblem ? (
              <p className="text-xs text-red-400 mt-1.5">{handleProblem}</p>
            ) : (
              <p className="text-xs text-[#5B616A] mt-1.5">
                Teammates mention you in chat with @{username}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className={labelClass} htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              rows={3}
              placeholder="What do you work on?"
              className={cn(inputClass, 'resize-none')}
            />
            <p className="text-xs text-[#5B616A] mt-1.5 text-right font-mono">
              {bio.length}/{BIO_MAX}
            </p>
          </div>

          {/* Skills */}
          <div>
            <label className={labelClass} htmlFor="profile-skills">Skills</label>
            <div className="flex flex-wrap items-center gap-2 p-2 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus-within:border-[#5EE6B0] transition-colors">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-medium bg-[#5EE6B0]/10 text-[#5EE6B0] border border-[#5EE6B0]/25"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="p-0.5 rounded hover:bg-[#5EE6B0]/20 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                id="profile-skills"
                type="text"
                value={skillInput}
                onChange={(e) => { setSkillInput(e.target.value); setSkillError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault(); // Enter adds a skill, it must not submit the form
                    addSkill(skillInput);
                  } else if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) {
                    setSkills((prev) => prev.slice(0, -1));
                  }
                }}
                onBlur={() => addSkill(skillInput)}
                placeholder={skills.length === 0 ? 'React, Node, Figma…' : ''}
                className="flex-1 min-w-[120px] bg-transparent px-1 py-1 text-sm text-[#ECEAE4] placeholder:text-[#5B616A] focus:outline-none"
              />
            </div>
            {skillError ? (
              <p className="text-xs text-red-400 mt-1.5">{skillError}</p>
            ) : (
              <p className="text-xs text-[#5B616A] mt-1.5">
                Press Enter or comma to add. Up to {SKILLS_MAX} skills ({skills.length}/{SKILLS_MAX}).
              </p>
            )}
          </div>

          {saveError && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-[#5EE6B0] mr-auto">
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
            {dirty && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-[#8A9099] hover:text-[#ECEAE4] transition-colors disabled:opacity-50"
              >
                Discard
              </button>
            )}
            <button
              type="submit"
              disabled={!canSave}
              className="flex items-center gap-2 px-5 py-2 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        {/* Account (read-only) */}
        <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#ECEAE4] uppercase tracking-wider">Account</h2>

          <div className="flex items-center gap-3 text-sm">
            <Mail size={15} className="text-[#5B616A] shrink-0" />
            <span className="text-[#ECEAE4] truncate">{profile.email}</span>
            <span className="text-[10px] font-mono text-[#5B616A] ml-auto shrink-0">only you see this</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Lock size={15} className="text-[#5B616A] shrink-0" />
            <span className="text-[#8A9099]">Sign-in:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {profile.hasPassword && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border text-[#8A9099] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]">
                  <Lock size={9} /> Email &amp; password
                </span>
              )}
              {profile.googleLinked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border text-[#8A9099] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]">
                  <Globe size={9} /> Google
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Calendar size={15} className="text-[#5B616A] shrink-0" />
            <span className="text-[#8A9099]">
              Member since{' '}
              {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <ConnectedApps />
      </div>
    </div>
  );
}