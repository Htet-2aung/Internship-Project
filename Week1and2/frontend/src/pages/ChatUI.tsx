import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuthStore } from '../store/useAuthStore';

interface ChatSession { id: number; title: string; }
interface ChatMessage { id: number; content: string; role: 'user' | 'assistant'; }
interface Profile { email: string; }
type IconName = 'menu' | 'plus' | 'search' | 'edit' | 'trash' | 'send' | 'spark' | 'settings' | 'logout' | 'close' | 'chevron';

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    menu: 'M4 6h16M4 12h16M4 18h16', plus: 'M12 5v14M5 12h14', search: 'm21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z',
    edit: 'm12 20 9-9-3-3-9 9-1 4 4-1ZM14 6l3 3', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', send: 'm22 2-7 20-4-9-9-4 20-7Z',
    spark: 'm12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2L12 3ZM19 16l-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6L19 16Z',
    settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8.1-3.2a6.8 6.8 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-1.7-1L15.7 3h-4l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a6.8 6.8 0 0 0 0 2L5.3 14l2 3.4 2.3-1a7.7 7.7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.6.1-1Z',
    logout: 'M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6', close: 'M6 6l12 12M18 6 6 18', chevron: 'm6 9 6 6 6-6',
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function ChatUI() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [thinkingPhase, setThinkingPhase] = useState('Reading your question');
  const [saveHistory, setSaveHistory] = useState(localStorage.getItem('save_history') !== 'false');
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get<ChatSession[]>('/chat/sessions');
        if (response.data.length) { setSessions(response.data); setActiveSessionId(response.data[0].id); }
        else { const created = await api.post<ChatSession>('/chat/sessions', { title: 'New conversation' }); setSessions([created.data]); setActiveSessionId(created.data.id); }
      } catch { setError('Your conversations could not be loaded.'); } finally { setIsLoading(false); }
    };
    void loadSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId === null) return;
    api.get<ChatMessage[]>(`/chat/sessions/${activeSessionId}/messages`).then((response) => setMessages(response.data)).catch(() => setError('This conversation could not be loaded.'));
  }, [activeSessionId]);

  useEffect(() => {
    if (!isSending) return;
    const phases = ['Reading your question', 'Searching your knowledge base', 'Composing a grounded answer'];
    let phaseIndex = 0;
    setThinkingPhase(phases[phaseIndex]);
    const timer = window.setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setThinkingPhase(phases[phaseIndex]);
    }, 900);
    return () => window.clearInterval(timer);
  }, [isSending]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => document.getElementById('conversation-search')?.focus(), 0);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const openProfile = async () => {
    try { const response = await api.get<Profile>('/auth/me'); setProfile(response.data); setProfileOpen((open) => !open); }
    catch { setError('Your profile could not be loaded.'); }
  };
  const handleLogout = () => { logout(); navigate('/login'); };
  const handleCreateChat = async () => {
    try { const response = await api.post<ChatSession>('/chat/sessions', { title: 'New conversation' }); setSessions((current) => [response.data, ...current]); setActiveSessionId(response.data.id); setMessages([]); setMobileNavOpen(false); }
    catch { setError('A new conversation could not be created.'); }
  };
  const handleRenameChat = async (session: ChatSession) => {
    const title = window.prompt('Rename conversation', session.title)?.trim();
    if (!title || title === session.title) return;
    try { const response = await api.patch<ChatSession>(`/chat/sessions/${session.id}`, { title }); setSessions((current) => current.map((item) => item.id === session.id ? response.data : item)); }
    catch { setError('This conversation could not be renamed.'); }
  };
  const handleDeleteChat = async (id: number) => {
    try {
      await api.delete(`/chat/sessions/${id}`);
      const remaining = sessions.filter((session) => session.id !== id);
      if (remaining.length) { setSessions(remaining); if (activeSessionId === id) setActiveSessionId(remaining[0].id); }
      else await handleCreateChat();
    } catch { setError('This conversation could not be deleted.'); }
  };
  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || activeSessionId === null || isSending) return;
    setInput(''); setError(''); setIsSending(true);
    try {
      const response = await api.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(`/chat/sessions/${activeSessionId}/messages`, { content });
      setMessages((current) => [...current, response.data.userMessage, response.data.assistantMessage]);
      setSessions((current) => current.map((session) => session.id === activeSessionId && session.title === 'New conversation' ? { ...session, title: content.slice(0, 32) } : session));
    } catch { setError('Your message could not be sent.'); } finally { setIsSending(false); }
  };
  const toggleHistory = () => { const next = !saveHistory; setSaveHistory(next); localStorage.setItem('save_history', String(next)); };
  const visibleSessions = sessions.filter((session) => session.title.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="chat-shell">
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`chat-sidebar ${mobileNavOpen ? 'chat-sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><Icon name="spark" /></div><span>ChaiGPT</span><button className="mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><Icon name="close" /></button></div>
        <button className="new-chat-button" onClick={() => void handleCreateChat()}><span><Icon name="plus" /> New conversation</span><kbd>⌘ K</kbd></button>
        <div className="sidebar-label">Library</div>
        {searchOpen ? <div className="search-field"><Icon name="search" /><input id="conversation-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search conversations" autoFocus /><button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} aria-label="Close search"><Icon name="close" /></button></div> : <button className="search-button" onClick={() => setSearchOpen(true)}><Icon name="search" /> Search conversations <kbd>⌘ K</kbd></button>}
        <div className="conversation-list">
          <div className="sidebar-label">Recent</div>
          {isLoading && <p className="sidebar-empty">Loading conversations...</p>}
          {!isLoading && !sessions.length && <p className="sidebar-empty">Your conversations will appear here.</p>}
          {!isLoading && searchQuery && !visibleSessions.length && <p className="sidebar-empty">No conversations match “{searchQuery}”.</p>}
          {visibleSessions.map((session) => <div key={session.id} className={`conversation-row ${activeSessionId === session.id ? 'conversation-active' : ''}`} onClick={() => { setActiveSessionId(session.id); setMobileNavOpen(false); }}><span className="conversation-dot" /><span className="conversation-title">{session.title}</span><span className="conversation-actions"><button onClick={(event) => { event.stopPropagation(); void handleRenameChat(session); }} aria-label="Rename conversation"><Icon name="edit" /></button><button onClick={(event) => { event.stopPropagation(); void handleDeleteChat(session.id); }} aria-label="Delete conversation"><Icon name="trash" /></button></span></div>)}
        </div>
        <div className="sidebar-footer"><div className="sidebar-note"><span className="status-pip" /> Private workspace</div><button className="profile-card" onClick={() => void openProfile()}><span className="avatar avatar-small">{profile?.email?.[0]?.toUpperCase() || 'U'}</span><span className="profile-card-copy"><strong>{profile?.email?.split('@')[0] || 'Your account'}</strong><small>Personal space</small></span><Icon name="chevron" /></button></div>
      </aside>

      <main className="chat-main">
        <header className="chat-header"><div className="header-left"><button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button><div><span className="eyebrow">Private workspace</span><h1>Ask ChaiGPT</h1></div></div><div className="header-actions"><span className="online-status"><span className="status-pip" /> Ready</span><button className="header-icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Icon name="settings" /></button><button className="avatar" onClick={() => void openProfile()} aria-label="Open profile">{profile?.email?.[0]?.toUpperCase() || 'U'}</button></div></header>
        {error && <div className="error-banner">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" /></button></div>}
        <section className="message-scroll"><div className="message-column">
          {!messages.length && !isLoading && <div className="welcome-block"><div className="welcome-orbit"><Icon name="spark" /></div><span className="eyebrow">Your thinking companion</span><h2>What are you exploring<br /><em>today?</em></h2><p>Ask a question, bring a document to life, or pick up where you left off.</p><div className="prompt-grid"><button onClick={() => setInput('Explain retrieval augmented generation in simple terms')}><span>Explain something</span><small>RAG, React, or anything curious</small></button><button onClick={() => setInput('Help me plan my next project')}><span>Plan a project</span><small>Turn a blank page into a path</small></button></div></div>}
          {messages.map((message) => <article key={message.id} className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}><div className="message-avatar">{message.role === 'user' ? 'U' : <Icon name="spark" />}</div><div className="message-body"><div className="message-meta"><strong>{message.role === 'user' ? 'You' : 'ChaiGPT'}</strong><span>{message.role === 'assistant' ? 'Retrieved answer' : 'Just now'}</span></div><p>{message.content}</p></div></article>)}
          {isSending && <article className="message message-assistant"><div className="message-avatar thinking-avatar"><Icon name="spark" /></div><div className="message-body"><div className="message-meta"><strong>ChaiGPT</strong><span>Thinking</span></div><div className="thinking-status"><span className="thinking-dots"><i /><i /><i /></span>{thinkingPhase}</div></div></article>}
        </div></section>
        <div className="composer-wrap"><form className="composer" onSubmit={handleSendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask anything..." rows={1} disabled={isSending} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSendMessage(event); } }} /><button className="send-button" type="submit" disabled={!input.trim() || isSending} aria-label="Send message"><Icon name="send" /></button></form><div className="composer-meta"><span><Icon name="spark" /> Grounded in your knowledge base</span><span>Enter to send · Shift + Enter for new line</span></div></div>
      </main>

      {profileOpen && <div className="popover profile-popover"><div className="popover-heading"><span className="avatar">{profile?.email?.[0]?.toUpperCase() || 'U'}</span><div><strong>{profile?.email || 'Your profile'}</strong><small>Personal workspace</small></div></div><button className="popover-item" onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}><Icon name="settings" /><span>Settings</span><Icon name="chevron" /></button><button className="popover-item popover-danger" onClick={handleLogout}><Icon name="logout" /><span>Log out</span></button></div>}
      {settingsOpen && <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}><section className="settings-modal" onClick={(event) => event.stopPropagation()}><div className="settings-title"><div><span className="eyebrow">Preferences</span><h2>Settings</h2></div><button onClick={() => setSettingsOpen(false)} aria-label="Close settings"><Icon name="close" /></button></div><div className="settings-row"><div><strong>Save conversation history</strong><p>Keep your chats available in your private library.</p></div><button className={`toggle ${saveHistory ? 'toggle-on' : ''}`} onClick={toggleHistory} aria-label="Toggle conversation history"><span /></button></div><div className="settings-row"><div><strong>Knowledge grounding</strong><p>ChaiGPT uses retrieved workspace context for answers.</p></div><span className="settings-badge">Active</span></div><button className="settings-close" onClick={() => setSettingsOpen(false)}>Done</button></section></div>}
    </div>
  );
}
