import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi, ApiError, OwnProfile } from '../api/client';
import { Avatar } from '../components/common/Avatar';
import {
  Loader2, X, Mail, Lock, Globe, Calendar, CheckCircle2, AlertCircle, Pencil,
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
  'w-full px-3 py-2.5 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:border-[#D0E36A] text-sm text-[#F4F5EF] transition-colors placeholder:text-[#6E7268]';
const labelClass = 'block text-xs font-semibold text-[#A1A69B] uppercase tracking-wider mb-1.5';

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
  // The form only opens after pressing "Edit profile"
  const [editing, setEditing] = useState(false);

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
      setEditing(false); // back to the read-only view once the server has it
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save your profile');
    } finally {
      setSaving(false);
    }
  };

  // Opens the form with the latest saved values
  const startEditing = () => {
    if (profile) fillForm(profile);
    setSaveError('');
    setSaved(false);
    setEditing(true);
  };

  // Throws away anything typed and closes the form
  const handleCancel = () => {
    if (profile) fillForm(profile);
    setSaveError('');
    setEditing(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D0E36A]" size={32} />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{loadError || 'Profile not available'}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-[#1B1E19] text-[#F4F5EF] rounded-lg text-sm border border-[rgba(255,255,255,0.08)] hover:bg-[#23271F]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[28px] dusk-sky mb-6 animate-rise">
          <div className="absolute inset-x-0 bottom-0 h-[38%] hills opacity-70" aria-hidden />
          <div className="relative px-6 md:px-8 pt-16 pb-7 flex items-end gap-5">
            <div className="rounded-full p-1 bg-[#0B0C0A]/60 ring-2 ring-[#D0E36A]/60 shadow-[0_0_30px_rgba(208,227,106,0.3)] shrink-0">
              <Avatar userId={profile.id} name={profile.name} size="xl" />
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="text-3xl md:text-4xl font-semibold text-[#F4F5EF] truncate">{profile.name}</h1>
              <p className="text-sm text-[#E2EE9C] mt-1">
                {profile.username ? `@${profile.username}` : 'No username yet'}
              </p>
            </div>
          </div>
        </div>

        {!editing ? (
          /* ── Read-only view ─────────────────────────────────────────── */
          <div className="bg-[#151713] border border-white/5 rounded-[24px] p-6 animate-rise [animation-delay:120ms] mb-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-[#F4F5EF]">Profile</h2>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs text-[#D0E36A]">
                    <CheckCircle2 size={14} /> Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={startEditing}
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D0E36A] text-[#0B0C0A] text-sm font-bold hover:bg-[#BED158] hover:shadow-[0_0_24px_rgba(208,227,106,0.35)] transition-all"
                >
                  <Pencil size={14} className="transition-transform group-hover:-rotate-12" />
                  Edit profile
                </button>
              </div>
            </div>

            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <dt className={labelClass}>Name</dt>
                <dd className="text-sm text-[#F4F5EF]">{profile.name}</dd>
              </div>
              <div>
                <dt className={labelClass}>Username</dt>
                <dd className="text-sm font-mono text-[#D0E36A]">
                  {profile.username ? `@${profile.username}` : <span className="text-[#6E7268] font-sans">Not set</span>}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={labelClass}>Bio</dt>
                <dd className={cn('text-sm leading-relaxed', profile.bio ? 'text-[#F4F5EF]' : 'text-[#6E7268]')}>
                  {profile.bio || 'No bio yet. Tell your team what you work on.'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={labelClass}>Skills</dt>
                <dd>
                  {profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-[#D0E36A]/10 text-[#D0E36A] border border-[#D0E36A]/25"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-[#6E7268]">No skills added yet.</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-[#151713] border border-[#D0E36A]/20 rounded-[24px] p-6 animate-rise space-y-5 mb-6 shadow-[0_20px_50px_-30px_rgba(208,227,106,0.35)]"
        >
          <div className="flex items-center gap-2">
            <Pencil size={15} className="text-[#D0E36A]" />
            <h2 className="text-lg font-semibold text-[#F4F5EF]">Edit profile</h2>
          </div>

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
              autoFocus
              className={inputClass}
            />
            {nameProblem && <p className="text-xs text-red-400 mt-1.5">{nameProblem}</p>}
          </div>

          {/* Username */}
          <div>
            <label className={labelClass} htmlFor="profile-username">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E7268] text-sm pointer-events-none">@</span>
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
              <p className="text-xs text-[#6E7268] mt-1.5">
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
            <p className="text-xs text-[#6E7268] mt-1.5 text-right font-mono">
              {bio.length}/{BIO_MAX}
            </p>
          </div>

          {/* Skills */}
          <div>
            <label className={labelClass} htmlFor="profile-skills">Skills</label>
            <div className="flex flex-wrap items-center gap-2 p-2 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl focus-within:border-[#D0E36A] transition-colors">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#D0E36A]/10 text-[#D0E36A] border border-[#D0E36A]/25"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="p-0.5 rounded-full hover:bg-[#D0E36A]/20 transition-colors"
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
                className="flex-1 min-w-[120px] bg-transparent px-1 py-1 text-sm text-[#F4F5EF] placeholder:text-[#6E7268] focus:outline-none"
              />
            </div>
            {skillError ? (
              <p className="text-xs text-red-400 mt-1.5">{skillError}</p>
            ) : (
              <p className="text-xs text-[#6E7268] mt-1.5">
                Press Enter or comma to add. Up to {SKILLS_MAX} skills ({skills.length}/{SKILLS_MAX}).
              </p>
            )}
          </div>

          {saveError && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-5 py-2 rounded-full border border-white/10 text-sm font-medium text-[#A1A69B] hover:text-[#F4F5EF] hover:border-white/25 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="flex items-center gap-2 px-5 py-2 bg-[#D0E36A] text-[#0B0C0A] text-sm font-bold rounded-full hover:bg-[#BED158] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
        )}

        {/* Account (read-only) */}
        <div className="bg-[#151713] border border-white/5 rounded-[24px] p-6 animate-rise [animation-delay:120ms] space-y-4">
          <h2 className="text-lg font-semibold text-[#F4F5EF]">Account</h2>

          <div className="flex items-center gap-3 text-sm">
            <Mail size={15} className="text-[#6E7268] shrink-0" />
            <span className="text-[#F4F5EF] truncate">{profile.email}</span>
            <span className="text-[10px] font-mono text-[#6E7268] ml-auto shrink-0">only you see this</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Lock size={15} className="text-[#6E7268] shrink-0" />
            <span className="text-[#A1A69B]">Sign-in:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {profile.hasPassword && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border text-[#A1A69B] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]">
                  <Lock size={9} /> Email &amp; password
                </span>
              )}
              {profile.googleLinked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border text-[#A1A69B] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]">
                  <Globe size={9} /> Google
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Calendar size={15} className="text-[#6E7268] shrink-0" />
            <span className="text-[#A1A69B]">
              Member since{' '}
              {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}