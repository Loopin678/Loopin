import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, LayoutGrid, MessageSquare, GitCommitHorizontal, Users, Focus, Command, Download,
  Sparkles, Menu, X, Plus, Monitor, Bell, Repeat,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { DESKTOP_DOWNLOAD_URL } from '../utils/desktopDownload';

// ── Small building blocks ───────────────────────────────────────────────────

export function LoopinMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="w-6 h-6 rounded-lg bg-[#D0E36A] flex items-center justify-center shrink-0">
        <div className="w-2.5 h-2.5 rounded-full border-2 border-[#0B0C0A]" />
      </div>
      <span className="font-display font-semibold text-lg text-white">Loopin</span>
    </div>
  );
}

function Eyebrow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[#A9B97A] bg-[#D0E36A]/10 border border-[#D0E36A]/25">
      <Icon size={13} className="text-[#A9B97A]" />
      {children}
    </span>
  );
}

function PillCta({ to, children, variant = 'dark' }: { to: string; children: React.ReactNode; variant?: 'dark' | 'lime' }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-3 rounded-full pl-5 pr-1.5 py-1.5 text-sm font-semibold transition-all',
        variant === 'dark'
          ? 'bg-[#0B0C0A]/80 text-white border border-white/10 hover:bg-[#0B0C0A]'
          : 'bg-[#D0E36A] text-[#0B0C0A] hover:bg-[#BED158]'
      )}
    >
      {children}
      <span
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5',
          variant === 'dark' ? 'bg-[#D0E36A] text-[#0B0C0A]' : 'bg-[#0B0C0A] text-[#D0E36A]'
        )}
      >
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

function SectionHead({ icon, eyebrow, title, sub }: { icon: React.ElementType; eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
      <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-3xl md:text-5xl font-semibold text-white">{title}</h2>
      {sub && <p className="mt-4 text-white/60 text-base md:text-lg">{sub}</p>}
    </div>
  );
}

// ── Nav ─────────────────────────────────────────────────────────────────────

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#desktop', label: 'Desktop' },
  { href: '#faq', label: 'FAQ' },
];

function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(y > 24);
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
      // The last section is too short to reach mid-screen, so claim it at the bottom
      if (max > 0 && y >= max - 8) setActive(NAV[NAV.length - 1].href);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the nav link of the section currently in view
  useEffect(() => {
    const sections = NAV.map(n => document.querySelector(n.href)).filter(Boolean) as Element[];
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive('#' + e.target.id); });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  return { scrolled, progress, active };
}

function Nav() {
  const [open, setOpen] = useState(false);
  const { scrolled, progress, active } = useScrollState();
  return (
    <div className={cn('fixed inset-x-0 z-50 px-4 transition-all duration-500', scrolled ? 'top-2 md:top-3' : 'top-3 md:top-5')}>
      <nav
        className={cn(
          'relative overflow-hidden mx-auto rounded-full flex items-center justify-between border transition-all duration-500',
          'bg-gradient-to-b from-[#1C2018] to-[#10120E] border-[rgba(208,227,106,0.18)]',
          scrolled
            ? 'max-w-4xl pl-4 pr-1.5 py-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),0_0_0_1px_rgba(208,227,106,0.08)]'
            : 'max-w-5xl pl-5 pr-2 py-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]'
        )}
      >
        {/* Faint chartreuse sheen along the top edge */}
        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#D0E36A]/50 to-transparent" aria-hidden />
        <a href="#top" aria-label="Loopin home"><LoopinMark /></a>
        <div className="hidden md:flex items-center gap-1 text-sm">
          {NAV.map(n => {
            const isActive = active === n.href;
            return (
              <a
                key={n.href}
                href={n.href}
                className={cn(
                  'group relative px-3.5 py-1.5 rounded-full transition-colors duration-300',
                  isActive ? 'text-[#D0E36A] bg-[#D0E36A]/10' : 'text-white/65 hover:text-white'
                )}
              >
                {n.label}
                <span
                  className={cn(
                    'absolute left-3.5 right-3.5 -bottom-0.5 h-px bg-[#D0E36A] origin-left transition-transform duration-300',
                    isActive ? 'scale-x-0' : 'scale-x-0 group-hover:scale-x-100'
                  )}
                  aria-hidden
                />
              </a>
            );
          })}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <a
            href={DESKTOP_DOWNLOAD_URL}
            download
            title="Download the Loopin desktop app for Windows (.exe)"
            className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#D0E36A]/25 text-sm font-medium text-white/80 hover:text-[#D0E36A] hover:border-[#D0E36A]/50 transition-colors"
          >
            <Download size={14} className="transition-transform group-hover:translate-y-0.5" />
            Desktop app
          </a>
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-white/75 hover:text-[#D0E36A] transition-colors">Sign in</Link>
          <Link
            to="/register"
            className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#D0E36A] text-[#10120E] text-sm font-semibold hover:bg-[#BED158] hover:shadow-[0_0_24px_rgba(208,227,106,0.35)] transition-all"
          >
            Get started
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden w-10 h-10 rounded-full bg-[#D0E36A]/10 border border-[#D0E36A]/20 flex items-center justify-center text-[#D0E36A]"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        {/* Reading progress along the bottom edge */}
        <span
          className="pointer-events-none absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-[#A9B97A] to-[#D0E36A] transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
          aria-hidden
        />
      </nav>
      {open && (
        <div className="md:hidden animate-rise mx-auto max-w-5xl mt-2 rounded-3xl p-4 bg-gradient-to-b from-[#1C2018] to-[#10120E] border border-[rgba(208,227,106,0.18)] shadow-2xl flex flex-col gap-1">
          {NAV.map(n => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn('px-3 py-2.5 rounded-xl transition-colors', active === n.href ? 'text-[#D0E36A] bg-[#D0E36A]/10' : 'text-white/80 hover:bg-white/5')}
            >
              {n.label}
            </a>
          ))}
          <a
            href={DESKTOP_DOWNLOAD_URL}
            download
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/80 hover:bg-white/5"
          >
            <Download size={15} className="text-[#D0E36A]" /> Download desktop app
          </a>
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1 text-center px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium">Sign in</Link>
            <Link to="/register" className="flex-1 text-center px-4 py-2.5 rounded-full bg-[#D0E36A] text-[#0B0C0A] text-sm font-semibold">Get started</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

const HERO_CARDS = [
  { icon: LayoutGrid, title: 'Kanban boards', body: 'Drag tasks through lists that match how your team really works.' },
  { icon: MessageSquare, title: 'Chat & AI', body: 'Talk it through next to the work, with real-time project chat.' },
  { icon: GitCommitHorizontal, title: 'Git-aware', body: 'See the commits behind each task, synced from the desktop app.' },
];

const HERO_CARD_MS = 4500;

// Three feature boxes that take turns being highlighted; clicking one selects it
function HeroCards() {
  const [active, setActive] = useState(1);
  const [cycle, setCycle] = useState(0); // bumps to restart the timer and bar after a click

  useEffect(() => {
    const id = window.setInterval(() => setActive(a => (a + 1) % HERO_CARDS.length), HERO_CARD_MS);
    return () => window.clearInterval(id);
  }, [cycle]);

  return (
    <div className="mt-14 grid sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-left">
      {HERO_CARDS.map((c, i) => {
        const on = i === active;
        return (
          <button
            key={c.title}
            type="button"
            onClick={() => { setActive(i); setCycle(n => n + 1); }}
            aria-pressed={on}
            className={cn(
              'group relative overflow-hidden rounded-[22px] p-5 border text-left transition-all duration-500',
              'backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0E36A]/60',
              on
                ? 'bg-[#0B0C0A]/90 border-[#D0E36A]/45 shadow-[0_20px_50px_-20px_rgba(208,227,106,0.45)] -translate-y-1'
                : 'bg-[#0B0C0A]/55 border-white/10 hover:bg-[#0B0C0A]/70 hover:border-white/20'
            )}
          >
            {/* Soft chartreuse wash in the corner of the active card */}
            <span
              className={cn(
                'pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#D0E36A]/20 blur-3xl transition-opacity duration-500',
                on ? 'opacity-100' : 'opacity-0'
              )}
              aria-hidden
            />
            <div className="relative flex items-center gap-3">
              <span
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-500',
                  on ? 'bg-[#D0E36A] text-[#0B0C0A]' : 'bg-white/[0.06] text-[#D0E36A] group-hover:bg-white/10'
                )}
              >
                <c.icon size={17} />
              </span>
              <span className="font-display text-[17px] font-semibold text-white">{c.title}</span>
            </div>
            <p className={cn('relative mt-3 text-[13px] leading-relaxed transition-colors duration-500', on ? 'text-white/80' : 'text-white/60')}>
              {c.body}
            </p>
            <div className="relative mt-4 h-1 rounded-full bg-white/10 overflow-hidden">
              {on && (
                <div
                  key={`${active}-${cycle}`}
                  className="h-full rounded-full bg-gradient-to-r from-[#A9B97A] to-[#D0E36A] animate-fill"
                  style={{ animationDuration: `${HERO_CARD_MS}ms` }}
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function BoardMock() {
  const cols = [
    { name: 'To do', dot: 'bg-white/40', cards: [['Design onboarding flow', 'Design'], ['Write API docs', 'Docs']] },
    { name: 'In progress', dot: 'bg-[#F59E0B]', cards: [['Socket reconnect logic', 'Backend']] },
    { name: 'Done', dot: 'bg-[#D0E36A]', cards: [['Kanban drag & drop', 'Frontend'], ['Invite teammates', 'Teams']] },
  ];
  return (
    <div className="rounded-[28px] bg-[#0B0C0A]/90 border border-white/10 p-3 md:p-4 shadow-2xl shadow-black/60">
      <div className="grid md:grid-cols-[220px_1fr] gap-3">
        <div className="hidden md:flex flex-col rounded-[24px] bg-[#151713] p-5">
          <div className="w-9 h-9 rounded-full bg-[#D0E36A] flex items-center justify-center mb-4 animate-pulse-glow">
            <Sparkles size={16} className="text-[#0B0C0A]" />
          </div>
          <p className="font-display text-2xl font-semibold text-white leading-tight">Good morning!</p>
          <p className="mt-3 text-xs text-white/60 leading-relaxed">
            You have <span className="text-white underline decoration-[#D0E36A]">3 tasks</span> due this week and
            one invite waiting.
          </p>
          <div className="mt-auto pt-6 space-y-2">
            {['Board', 'Members', 'Chat & AI'].map((l, i) => (
              <div key={l} className={cn('text-xs px-3 py-2 rounded-xl', i === 0 ? 'bg-[#D0E36A]/10 text-[#D0E36A]' : 'text-white/50')}>{l}</div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cols.map(c => (
            <div key={c.name} className="rounded-[24px] bg-[#151713] p-3">
              <div className="flex items-center gap-2 px-1 pb-3 text-xs font-medium text-white/70">
                <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                {c.name}
                <span className="ml-auto text-white/30">{c.cards.length}</span>
              </div>
              <div className="space-y-2">
                {c.cards.map(([t, tag]) => (
                  <div key={t} className="rounded-xl bg-[#23271F] border border-white/5 p-3">
                    <p className="text-[13px] text-white font-medium">{t}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">{tag}</span>
                      <div className="flex -space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#A9B97A] border-2 border-[#23271F]" />
                        <span className="w-5 h-5 rounded-full bg-[#D0E36A] border-2 border-[#23271F]" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 px-2 py-2 text-xs text-white/30"><Plus size={12} /> Add task</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="px-2 md:px-3 pt-2 md:pt-3">
      <div className="relative overflow-hidden rounded-[28px] md:rounded-[36px] dusk-sky">
        {/* Bright halo behind the headline */}
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 w-[70%] max-w-3xl h-72 rounded-full bg-[#D0E36A]/[0.13] blur-[90px]" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-[55%] hills opacity-90" aria-hidden />
        <div className="relative pt-32 md:pt-40 pb-6 md:pb-10 px-4 text-center">
          <div className="animate-rise"><Eyebrow icon={Repeat}>Tasks, code &amp; teams</Eyebrow></div>
          <h1 className="animate-rise mt-5 text-4xl sm:text-6xl md:text-7xl font-semibold text-white leading-[1.02] max-w-4xl mx-auto [animation-delay:80ms]">
            Work happens in a{' '}
            <span className="bg-gradient-to-r from-[#EEF7B8] via-[#D0E36A] to-[#A9C24A] bg-clip-text text-transparent">loop.</span>
          </h1>
          <p className="animate-rise mt-5 max-w-xl mx-auto text-base md:text-lg text-white/80 [animation-delay:160ms]">
            Plan, build, discuss, review and ship — in one calm place where your board, your chat and your commits
            finally talk to each other.
          </p>
          <div className="animate-rise mt-8 flex justify-center [animation-delay:240ms]">
            <PillCta to="/register">Get started</PillCta>
          </div>

          <HeroCards />

          <div className="mt-8 max-w-5xl mx-auto text-left">
            <BoardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Loop marquee ────────────────────────────────────────────────────────────

function LoopStrip() {
  const words = ['Plan', 'Build', 'Discuss', 'Review', 'Ship', 'Repeat'];
  const row = [...words, ...words, ...words, ...words];
  return (
    <section className="py-14 md:py-20 overflow-hidden">
      <p className="text-center text-sm text-white/50 mb-8">One loop, from first idea to merged code</p>
      <div className="relative [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
        <div className="flex w-max animate-marquee gap-12">
          {row.map((w, i) => (
            <span key={i} className="flex items-center gap-12 font-display text-3xl md:text-4xl font-semibold text-white/80">
              {w}
              <span className="w-2 h-2 rounded-full bg-[#D0E36A] animate-pulse-glow" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features (stacked bento) ────────────────────────────────────────────────

const FEATURES = [
  {
    icon: LayoutGrid,
    title: 'Boards that bend to your team',
    body: 'Rename lists, add your own, filter and sort, and drag tasks wherever they belong. Every change shows up for everyone instantly.',
    stat: 'Live', statLabel: 'updates over sockets',
  },
  {
    icon: Users,
    title: 'Invite, assign, collaborate',
    body: 'Bring teammates in with an invite, give each task an owner, and keep roles clear across every project you share.',
    stat: '1 click', statLabel: 'to accept an invite',
  },
  {
    icon: MessageSquare,
    title: 'Chat & AI beside the work',
    body: 'Every project gets its own chat. Ask questions, settle decisions and keep the context right next to the board.',
    stat: 'Per-project', statLabel: 'conversations',
  },
  {
    icon: GitCommitHorizontal,
    title: 'Commits, connected',
    body: 'The Loopin desktop app watches your repo and links commits to the tasks they belong to, so reviews start with context.',
    stat: 'Git', statLabel: 'linked to tasks',
  },
];

function FeatureArt({ index }: { index: number }) {
  // Abstract dusk panels so each card has a visual without stock imagery
  const hues = [
    'from-[#161C0D] via-[#46561F] to-[#A9B97A]',
    'from-[#12160A] via-[#3A481A] to-[#D0E36A]/80',
    'from-[#151A0C] via-[#4F5E24] to-[#D8D58A]',
    'from-[#161A0B] via-[#5F6C26] to-[#B9C96A]',
  ];
  return (
    <div className={cn('relative h-56 md:h-full min-h-56 rounded-[22px] overflow-hidden bg-gradient-to-b', hues[index % hues.length])}>
      <div className="absolute inset-x-0 bottom-0 h-2/3 hills opacity-80" />
      <div className="absolute left-5 bottom-5 right-5 rounded-2xl p-3 bg-[#10120E]/70 border border-[#D0E36A]/15 backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1">
        <div className="h-2 w-2/3 rounded-full bg-white/50" />
        <div className="mt-2 h-2 w-1/3 rounded-full bg-[#D0E36A]/80" />
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="px-4 py-16 md:py-24 scroll-mt-24">
      <SectionHead icon={Sparkles} eyebrow="Features" title="Built for teams that ship" sub="Everything a small team needs to move from idea to merged code, without juggling five tabs." />
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="group md:sticky rounded-[28px] bg-[#151713] border border-white/5 hover:border-[#A9B97A]/20 transition-colors duration-500 p-3 grid md:grid-cols-2 gap-3 shadow-2xl shadow-black/50"
            style={{ top: `${96 + i * 16}px` }}
          >
            <div className={cn(i % 2 === 1 && 'md:order-2')}><FeatureArt index={i} /></div>
            <div className="p-5 md:p-8 flex flex-col">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#A9B97A]">
                <f.icon size={18} />
              </div>
              <h3 className="mt-5 text-2xl md:text-3xl font-semibold text-white">{f.title}</h3>
              <p className="mt-3 text-white/60 leading-relaxed max-w-md">{f.body}</p>
              <div className="mt-8 md:mt-auto pt-6 border-t border-white/10 flex items-baseline gap-3">
                <span className="font-display text-4xl md:text-5xl font-semibold text-[#D0E36A]">{f.stat}</span>
                <span className="text-sm text-white/50">{f.statLabel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Hub statement ───────────────────────────────────────────────────────────

function Hub() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="max-w-4xl mx-auto text-center">
        <Eyebrow icon={Repeat}>Your hub</Eyebrow>
        <h2 className="mt-6 text-3xl md:text-5xl font-semibold leading-tight text-white/40">
          Loopin brings your <span className="text-white">team</span>, your{' '}
          <span className="inline-flex items-center gap-2 align-middle px-3 py-0.5 rounded-full bg-[#D0E36A] text-[#0B0C0A] text-2xl md:text-4xl">tasks</span>{' '}
          and your <span className="text-white">code</span> into one calm, structured space — so nothing falls
          out of the loop.
        </h2>
      </div>
    </section>
  );
}

// ── Workflow ────────────────────────────────────────────────────────────────

const STEPS = [
  { icon: Plus, title: 'Create a project', body: 'Spin up a board in seconds with To do, In progress and Done ready to go.' },
  { icon: Users, title: 'Invite your team', body: 'Send invites by username. Teammates accept from their notification bell.' },
  { icon: Focus, title: 'Focus on one task', body: 'Open Focus mode to hide everything except the task in front of you.' },
  { icon: Command, title: 'Move fast', body: 'Jump anywhere with the command palette and keep your hands on the keys.' },
];

function Workflow() {
  return (
    <section id="workflow" className="px-4 py-16 md:py-24 scroll-mt-24">
      <SectionHead icon={Bell} eyebrow="Workflow" title="Organize work with ease" sub="Four steps from an empty workspace to a team in flow." />
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-[24px] bg-[#151713] border border-white/5 p-6 hover:border-white/15 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <s.icon size={18} />
              </div>
              <span className="font-display text-sm text-white/30">0{i + 1}</span>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-white">{s.title}</h3>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Desktop ─────────────────────────────────────────────────────────────────

function Desktop() {
  return (
    <section id="desktop" className="px-2 md:px-3 py-10 scroll-mt-24">
      <div className="relative overflow-hidden rounded-[28px] md:rounded-[36px] dusk-sky bg-gradient-to-br from-[#121808] via-[#34431A] to-[#0C1006] px-6 py-16 md:py-24">
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-[#D0E36A]/10 blur-3xl" aria-hidden />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Eyebrow icon={Monitor}>Desktop app</Eyebrow>
            <h2 className="mt-5 text-3xl md:text-5xl font-semibold text-white leading-tight">
              Bring your repo into the loop
            </h2>
            <p className="mt-4 text-white/70 max-w-md">
              Loopin for Windows, macOS and Linux watches your working copy, shows the diff, and ties each commit to
              the task it moves forward.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={DESKTOP_DOWNLOAD_URL}
                download
                className="group inline-flex items-center gap-3 rounded-full pl-5 pr-1.5 py-1.5 text-sm font-semibold bg-[#D0E36A] text-[#0B0C0A] hover:bg-[#BED158] transition-all"
              >
                Download for Windows
                <span className="w-8 h-8 rounded-full bg-[#0B0C0A] text-[#D0E36A] flex items-center justify-center transition-transform group-hover:translate-y-0.5">
                  <Download size={16} />
                </span>
              </a>
              <PillCta to="/register">Get started</PillCta>
            </div>
          </div>
          <div className="rounded-[24px] bg-[#0B0C0A]/80 border border-white/10 p-5 font-mono text-xs md:text-sm">
            {[
              ['a3f9c21', 'feat: drag tasks between lists', 'Kanban drag & drop'],
              ['7be0d44', 'fix: resync invites after reconnect', 'Socket reconnect logic'],
              ['19c2e8a', 'docs: task state diagram', 'Write API docs'],
            ].map(([sha, msg, task]) => (
              <div key={sha} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 border-b border-white/5 last:border-0">
                <span className="text-[#D0E36A]">{sha}</span>
                <span className="text-white/80 flex-1 min-w-0 truncate">{msg}</span>
                <span className="font-sans text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">{task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: 'What is Loopin?', a: 'A collaborative workspace that combines Kanban boards, project chat and Git commit tracking, so planning and code live side by side.' },
  { q: 'Can I sign in with Google?', a: 'Yes. You can create an account with email and password, or continue with Google from the sign-in page.' },
  { q: 'How do I add teammates?', a: 'Open a project’s Members page and invite people by username. They’ll see the invite in their notification bell and can accept with one click.' },
  { q: 'Do I need the desktop app?', a: 'No. Boards, members and chat all work in the browser. The desktop app adds Git awareness by watching your local repository.' },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="px-4 py-16 md:py-24 scroll-mt-24">
      <SectionHead icon={MessageSquare} eyebrow="FAQ" title="Questions? We’ve got answers" />
      <div className="max-w-3xl mx-auto space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className={cn('rounded-[22px] border transition-colors', isOpen ? 'bg-[#151713] border-white/10' : 'bg-white/[0.03] border-white/5')}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                aria-expanded={isOpen}
              >
                <span className="font-medium text-white">{f.q}</span>
                <span className={cn('w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all', isOpen ? 'bg-[#D0E36A] text-[#0B0C0A] rotate-45' : 'bg-white/5 text-white')}>
                  <Plus size={16} />
                </span>
              </button>
              {isOpen && <p className="px-6 pb-6 -mt-1 text-white/60 leading-relaxed">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Closing CTA + footer ────────────────────────────────────────────────────

function Closing() {
  return (
    <section className="px-2 md:px-3 pb-3">
      <div className="relative overflow-hidden rounded-[28px] md:rounded-[36px] dusk-sky px-6 py-20 md:py-28 text-center">
        <div className="absolute inset-x-0 bottom-0 h-1/2 hills" aria-hidden />
        <div className="relative">
          <h2 className="text-4xl md:text-6xl font-semibold text-white max-w-3xl mx-auto leading-[1.05]">
            Get your team in the loop
          </h2>
          <p className="mt-4 text-white/80 max-w-md mx-auto">Free to start. Set up your first board in under a minute.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PillCta to="/register">Create your workspace</PillCta>
            <Link to="/login" className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-[#10120E]/50 border border-[#D0E36A]/25 hover:bg-[#10120E]/70 hover:border-[#A9B97A]/50 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <footer className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
        <LoopinMark />
        <div className="flex gap-6">
          {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-white transition-colors">{n.label}</a>)}
        </div>
        <span>© {new Date().getFullYear()} Loopin</span>
      </footer>
    </section>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0B0C0A] text-white font-sans scroll-smooth">
      <Nav />
      <Hero />
      <LoopStrip />
      <Features />
      <Hub />
      <Workflow />
      <Desktop />
      <Faq />
      <Closing />
    </div>
  );
}
