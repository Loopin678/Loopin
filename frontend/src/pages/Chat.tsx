import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messagesApi, projectsApi, Message, Project } from '../api/client';
import { useBoardStore } from '../store/boardStore';
import { connectSocket } from '../api/socket';
import { 
  Send, Loader2, Sparkles, Bot, AlertCircle, ArrowLeft, 
  Users, MessageSquare, AtSign 
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Avatar } from '../components/common/Avatar';

export function Chat() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);

  const {
    onlineUserIds,
    setPresenceSnapshot,
    setUserOnline,
    setUserOffline,
    clearPresence,
  } = useBoardStore();

  const [inputText, setInputText] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [sendError, setSendError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError('');

    // 1. Fetch project details
    projectsApi.get(projectId).then(setProject).catch(() => {});

    // 2. Fetch message history
    messagesApi.list(projectId)
      .then(data => {
        setMessages(data);
        setLoading(false);
        setTimeout(() => scrollToBottom('auto'), 100);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to load messages');
        setLoading(false);
      });

    // 3. Setup Socket.IO
    const socket = connectSocket();

    // The server ignores duplicate joins and just re-sends the presence snapshot,
    // so it is safe to emit on every mount and on every (re)connect.
    const join = () => socket.emit('join-project', projectId);

    const handleConnect = () => {
      setSocketConnected(true);
      join();
    };
    const handleDisconnect = () => setSocketConnected(false);

    // Real-time message receiver
    const handleNewMessage = (msg: Message) => {
      if (msg.projectId === projectId) {
        setMessages(prev => {
          // Avoid duplicate messages if already present
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    };

    // AI typing indicator
    const handleAiTyping = (isTyping: boolean) => {
      setAiTyping(isTyping);
      if (isTyping) {
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    };

    // Socket error
    const handleMessageError = (data: { error: string }) => {
      setSendError(data.error || 'Failed to send message');
      setTimeout(() => setSendError(''), 4000);
    };

    // The server dropped a message because too many were sent too quickly
    const handleRateLimited = () => {
      setSendError("You're sending messages too fast. Please slow down.");
      setTimeout(() => setSendError(''), 4000);
    };

    // A teammate changed their name or username: update it on the messages already on screen
    const handleProfileUpdated = (data: { userId?: string; name?: string; username?: string | null }) => {
      if (!data?.userId || !data.name) return;
      const userId = data.userId;
      const name = data.name;
      const username = data.username ?? null;

      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === userId && m.sender ? { ...m, sender: { ...m.sender, name, username } } : m
        )
      );
    };

    // Presence handlers
    const handleSnapshot = (data: { onlineUserIds: string[] }) => {
      setPresenceSnapshot(data?.onlineUserIds ?? []);
    };
    const handleOnline = (data: { userId: string }) => {
      if (data?.userId) setUserOnline(data.userId);
    };
    const handleOffline = (data: { userId: string }) => {
      if (data?.userId) setUserOffline(data.userId);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('ai_typing', handleAiTyping);
    socket.on('message_error', handleMessageError);
    socket.on('rate_limited', handleRateLimited);
    socket.on('profile:updated', handleProfileUpdated);
    socket.on('presence:snapshot', handleSnapshot);
    socket.on('presence:online', handleOnline);
    socket.on('presence:offline', handleOffline);

    // Already connected (e.g. navigated here from the board)
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('ai_typing', handleAiTyping);
      socket.off('message_error', handleMessageError);
      socket.off('rate_limited', handleRateLimited);
      socket.off('profile:updated', handleProfileUpdated);
      socket.off('presence:snapshot', handleSnapshot);
      socket.off('presence:online', handleOnline);
      socket.off('presence:offline', handleOffline);
      clearPresence();
    };
  }, [projectId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !projectId || !user) return;

    const socket = connectSocket();
    const content = inputText.trim();

    // Emit send_message to backend socket
    // The server knows who we are from the login cookie, so no sender id is sent
    socket.emit('send_message', {
      projectId,
      content,
    });

    setInputText('');
  };

  const handleInsertAiMention = () => {
    setInputText(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} @ai ` : '@ai ';
    });
  };

  const formatContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.toLowerCase() === '@ai') {
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-[#7C7FE8]/20 text-[#A78BFA] border border-[#7C7FE8]/30 mx-0.5"
          >
            <Sparkles size={11} /> @ai
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#D0E36A]/15 text-[#D0E36A] border border-[#D0E36A]/25 mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D0E36A]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#1B1E19] text-[#F4F5EF] rounded-lg text-sm border border-[rgba(255,255,255,0.08)] hover:bg-[#23271F]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0B0C0A] text-[#F4F5EF]">
      {/* Top Header */}
      <div className="mx-3 md:mx-4 mb-2 rounded-[22px] border border-white/5 bg-gradient-to-r from-[#1F2A0E]/70 via-[#151713] to-[#151713] px-3 md:px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 animate-rise">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="w-9 h-9 flex items-center justify-center text-[#A1A69B] hover:text-[#0B0C0A] hover:bg-[#D0E36A] bg-white/5 rounded-full transition-colors"
            title="Back to board"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-[#D0E36A] text-[#0B0C0A] flex items-center justify-center"><MessageSquare size={16} /></span>
            <h2 className="font-display text-base md:text-lg font-semibold text-[#F4F5EF] truncate">
              {project?.name ? `${project.name} • Chat` : 'Project Chat'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Socket live status */}
          <div className={cn(
            'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border',
            socketConnected ? 'text-[#D0E36A] bg-[#D0E36A]/10 border-[#D0E36A]/25' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25'
          )}>
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                socketConnected ? "bg-[#D0E36A] animate-pulse-glow" : "bg-yellow-500 animate-pulse"
              )}
            />
            <span className="text-[11px] font-semibold">
              {socketConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>

          <Link
            to={`/projects/${projectId}/members`}
            className="flex items-center gap-1.5 text-[#A1A69B] hover:text-[#F4F5EF] transition-colors"
          >
            <Users size={13} />
            <span>Members</span>
            {onlineUserIds.size > 0 && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono text-[#D0E36A] bg-[#D0E36A]/10 border border-[#D0E36A]/20"
                title={`${onlineUserIds.size} member${onlineUserIds.size > 1 ? 's' : ''} online`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D0E36A] animate-pulse" />
                {onlineUserIds.size}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-14 h-14 rounded-[24px] bg-[#151713] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
              <Bot size={28} className="text-[#D0E36A]" />
            </div>
            <h3 className="text-base font-bold text-[#F4F5EF]">No messages yet</h3>
            <p className="text-xs text-[#A1A69B] mt-1 max-w-sm">
              Start the conversation with your team, or mention <span className="text-[#A78BFA] font-mono font-semibold">@ai</span> to trigger an AI response.
            </p>
            <button
              onClick={handleInsertAiMention}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C7FE8]/15 border border-[#7C7FE8]/30 text-[#A78BFA] text-xs font-semibold hover:bg-[#7C7FE8]/25 transition-colors"
            >
              <Sparkles size={13} /> Ask @ai something
            </button>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user?.id;
            const isAi = msg.sender?.username === 'ai';

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 max-w-2xl',
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                {/* Avatar with presence */}
                <div className="relative shrink-0 mt-0.5">
                  {isAi ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#7C7FE8]/20 border border-[#7C7FE8]/40 text-[#A78BFA]">
                      <Bot size={14} />
                    </div>
                  ) : (
                    <Avatar userId={msg.senderId} name={msg.sender?.name ?? 'Member'} size="sm" />
                  )}
                  {!isAi && (
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0B0C0A]",
                        (onlineUserIds.has(msg.senderId) || (msg.sender?.id ? onlineUserIds.has(msg.sender.id) : false))
                          ? "bg-[#D0E36A]"
                          : "bg-[#6E7268]"
                      )}
                      title={(onlineUserIds.has(msg.senderId) || (msg.sender?.id ? onlineUserIds.has(msg.sender.id) : false)) ? "Online" : "Offline"}
                    />
                  )}
                </div>

                {/* Message Content */}
                <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold text-[#A1A69B]">
                      {isAi ? 'Loopin AI' : isMe ? 'You' : msg.sender?.name || 'Member'}
                    </span>
                    {!isAi && !isMe && msg.sender?.username && (
                      <span className="text-[10px] text-[#6E7268] font-mono">@{msg.sender.username}</span>
                    )}
                    <span className="text-[10px] text-[#6E7268] font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words border',
                      isAi
                        ? 'bg-[#1D2119] border-[#7C7FE8]/30 text-[#F4F5EF] shadow-[0_0_20px_rgba(124,127,232,0.08)]'
                        : isMe
                        ? 'bg-[#262C14] border-[#D0E36A]/30 text-[#F4F5EF]'
                        : 'bg-[#1B1E19] border-[rgba(255,255,255,0.06)] text-[#F4F5EF]'
                    )}
                  >
                    {formatContent(msg.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* AI Typing Indicator */}
        {aiTyping && (
          <div className="flex items-center gap-3 mr-auto">
            <div className="w-8 h-8 rounded-full bg-[#7C7FE8]/20 border border-[#7C7FE8]/40 flex items-center justify-center text-[#A78BFA]">
              <Bot size={14} />
            </div>
            <div className="bg-[#1D2119] border border-[#7C7FE8]/30 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-[#A78BFA]">
              <Sparkles size={13} className="animate-pulse" />
              <span>AI is thinking...</span>
              <div className="flex gap-1 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#151713] shrink-0">
        {sendError && (
          <div className="mb-2 flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-1.5">
            <AlertCircle size={13} />
            <span>{sendError}</span>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Quick AI mention tag button */}
          <button
            type="button"
            onClick={handleInsertAiMention}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] text-[#A1A69B] hover:text-[#A78BFA] hover:border-[#7C7FE8]/40 text-xs font-medium transition-colors shrink-0"
            title="Mention AI"
          >
            <AtSign size={13} />
            <span>ai</span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Message your team... (@username to mention, @ai for the assistant)"
            className="flex-1 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[#F4F5EF] placeholder:text-[#6E7268] focus:outline-none focus:border-[#D0E36A] transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-[#D0E36A] text-black font-bold rounded-xl hover:bg-[#BED158] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            title="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
