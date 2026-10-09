import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messagesApi, projectsApi, Message, Project } from '../api/client';
import { connectSocket } from '../api/socket';
import { 
  Send, Loader2, Sparkles, Bot, AlertCircle, ArrowLeft, 
  Users, MessageSquare, AtSign 
} from 'lucide-react';
import { cn } from '../utils/cn';

export function Chat() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);

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

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit('join-project', projectId);
    };

    socket.on('connect', handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    socket.on('disconnect', () => setSocketConnected(false));

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

    socket.on('new_message', handleNewMessage);
    socket.on('ai_typing', handleAiTyping);
    socket.on('message_error', handleMessageError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect');
      socket.off('new_message', handleNewMessage);
      socket.off('ai_typing', handleAiTyping);
      socket.off('message_error', handleMessageError);
    };
  }, [projectId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !projectId || !user) return;

    const socket = connectSocket();
    const content = inputText.trim();

    // Emit send_message to backend socket
    socket.emit('send_message', {
      projectId,
      senderId: user.id,
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
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#5EE6B0]/15 text-[#5EE6B0] border border-[#5EE6B0]/25 mx-0.5"
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
        <Loader2 className="animate-spin text-[#5EE6B0]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#161A1F] text-[#ECEAE4] rounded-lg text-sm border border-[rgba(255,255,255,0.08)] hover:bg-[#1C2127]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0B0D10] text-[#ECEAE4]">
      {/* Top Header */}
      <div className="h-14 border-b border-[rgba(255,255,255,0.06)] bg-[#111418] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="p-1.5 text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#161A1F] rounded-lg transition-colors"
            title="Back to board"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#5EE6B0]" />
            <h2 className="text-sm font-bold text-[#ECEAE4]">
              {project?.name ? `${project.name} • Chat` : 'Project Chat'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Socket live status */}
          <div className="flex items-center gap-1.5 text-[#5B616A]">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                socketConnected ? "bg-[#5EE6B0] shadow-[0_0_8px_#5EE6B0]" : "bg-yellow-500"
              )}
            />
            <span className="text-[11px] font-mono">
              {socketConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>

          <Link
            to={`/projects/${projectId}/members`}
            className="flex items-center gap-1.5 text-[#8A9099] hover:text-[#ECEAE4] transition-colors"
          >
            <Users size={13} />
            <span>Members</span>
          </Link>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-[#111418] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
              <Bot size={28} className="text-[#5EE6B0]" />
            </div>
            <h3 className="text-base font-bold text-[#ECEAE4]">No messages yet</h3>
            <p className="text-xs text-[#8A9099] mt-1 max-w-sm">
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
            const isAi = msg.sender?.email === 'ai@loopin.system' || msg.sender?.name?.toLowerCase() === 'ai';

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 max-w-2xl',
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                    isAi
                      ? 'bg-[#7C7FE8]/20 border border-[#7C7FE8]/40 text-[#A78BFA]'
                      : isMe
                      ? 'bg-[#5EE6B0]/20 border border-[#5EE6B0]/30 text-[#5EE6B0]'
                      : 'bg-[#1C2127] border border-[rgba(255,255,255,0.08)] text-[#8A9099]'
                  )}
                >
                  {isAi ? <Bot size={14} /> : (msg.sender?.name || 'U').charAt(0).toUpperCase()}
                </div>

                {/* Message Content */}
                <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold text-[#8A9099]">
                      {isAi ? 'Loopin AI' : isMe ? 'You' : msg.sender?.name || 'Member'}
                    </span>
                    <span className="text-[10px] text-[#5B616A] font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words border',
                      isAi
                        ? 'bg-[#16172A] border-[#7C7FE8]/30 text-[#ECEAE4] shadow-[0_0_20px_rgba(124,127,232,0.08)]'
                        : isMe
                        ? 'bg-[#122B22] border-[#5EE6B0]/30 text-[#ECEAE4]'
                        : 'bg-[#161A1F] border-[rgba(255,255,255,0.06)] text-[#ECEAE4]'
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
            <div className="bg-[#16172A] border border-[#7C7FE8]/30 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-[#A78BFA]">
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
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#111418] shrink-0">
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
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-[#161A1F] border border-[rgba(255,255,255,0.08)] text-[#8A9099] hover:text-[#A78BFA] hover:border-[#7C7FE8]/40 text-xs font-medium transition-colors shrink-0"
            title="Mention AI"
          >
            <AtSign size={13} />
            <span>ai</span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message... (use @ai for AI assistant)"
            className="flex-1 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[#ECEAE4] placeholder:text-[#5B616A] focus:outline-none focus:border-[#5EE6B0] transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-[#5EE6B0] text-black font-bold rounded-xl hover:bg-[#4CD59F] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            title="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
