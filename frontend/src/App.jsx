import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, Bot, BookOpen, CalendarDays, Check, ChevronRight,
  CircleHelp, Clock3, FileText, GraduationCap, LayoutDashboard, Menu,
  MessageCircle, Plus, Search, Send, ShieldCheck, Sparkles, Users, X,
  ListTodo, PackageSearch, CalendarCheck, WandSparkles
} from "lucide-react";

const starterTasks = [
  { id: 1, title: "Engineering Chemistry assignment", subject: "Chemistry", dueDate: "2026-10-12", done: false },
  { id: 2, title: "Revise Python loops and functions", subject: "CSEC prep", dueDate: "2026-10-13", done: false },
  { id: 3, title: "Register for robotics club orientation", subject: "Campus", dueDate: "2026-10-15", done: true },
];
const starterPosts = [
  { id: 1, type: "Lost", title: "Black calculator pouch", description: "Last seen near the library study area.", tag: "Lost & Found" },
  { id: 2, type: "Borrow", title: "Can lend a drawing board", description: "Available this week. Message me on campus.", tag: "Borrow" },
  { id: 3, type: "Found", title: "Found a water bottle", description: "Found near an academic block. Describe it to claim.", tag: "Lost & Found" },
];
const navItems = [
  ["Overview", LayoutDashboard], ["My tasks", ListTodo], ["AI mentor", Bot],
  ["Assignment AI", FileText], ["Community", Users]
];
const readStore = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};
const prettyDate = (value) => {
  if (!value) return "Date not confirmed";
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function App() {
  const [page, setPage] = useState("Overview");
  const [tasks, setTasks] = useState(() => readStore("campusai-tasks", starterTasks));
  const [posts, setPosts] = useState(() => readStore("campusai-posts", starterPosts));
  const [aiStatus, setAiStatus] = useState("Checking AI…");
  const [mentorQuestion, setMentorQuestion] = useState("");
  const [mentorAnswer, setMentorAnswer] = useState("");
  const [mentorBusy, setMentorBusy] = useState(false);
  const [notice, setNotice] = useState("Engineering Chemistry assignment: Prepare a 2-page note on IR spectroscopy. Submit by 18 October 2026.");
  const [extracted, setExtracted] = useState(null);
  const [extractBusy, setExtractBusy] = useState(false);
  const [postType, setPostType] = useState("Lost");
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { localStorage.setItem("campusai-tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("campusai-posts", JSON.stringify(posts)); }, [posts]);
  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(d => {
      setAiStatus(d.aiConfigured ? `AI connected · ${d.model}` : "Demo mode · add HF token for live AI");
    }).catch(() => setAiStatus("Backend offline · start Flask on port 5000"));
  }, []);

  const openTasks = tasks.filter(t => !t.done);
  const upcoming = useMemo(() => [...tasks].filter(t => !t.done).sort((a,b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")), [tasks]);
  const filteredPosts = posts.filter(p => `${p.title} ${p.description} ${p.type}`.toLowerCase().includes(query.toLowerCase()));

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }
  function toggleTask(id) {
    setTasks(old => old.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
  function addTask(task) {
    setTasks(old => [{ ...task, id: Date.now(), done: false }, ...old]);
    setExtracted(null);
    setPage("My tasks");
    notify("Task added to your planner");
  }
  async function askMentor(e) {
    e.preventDefault();
    if (!mentorQuestion.trim()) return;
    setMentorBusy(true); setMentorAnswer("");
    try {
      const res = await fetch("/api/mentor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: mentorQuestion })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setMentorAnswer(data.answer);
    } catch (err) {
      setMentorAnswer(`${err.message}\n\nDemo fallback: Start by listing your top three priorities, confirm official college details from trusted sources, and break each task into a 25-minute work session.`);
    } finally { setMentorBusy(false); }
  }
  async function extractNotice(e) {
    e.preventDefault();
    if (!notice.trim()) return;
    setExtractBusy(true); setExtracted(null);
    try {
      const res = await fetch("/api/extract-assignment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notice })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setExtracted(data.task);
    } catch (err) {
      // A clear offline fallback keeps the demo usable if inference is unavailable.
      const match = notice.match(/(?:by|before|deadline[:\s]+|submit on)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
      const months = { january:"01", february:"02", march:"03", april:"04", may:"05", june:"06", july:"07", august:"08", september:"09", october:"10", november:"11", december:"12" };
      const dueDate = match ? `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2,"0")}` : "";
      setExtracted({
        title: notice.toLowerCase().includes("chemistry") ? "Engineering Chemistry assignment" : "Assignment from notice",
        subject: notice.toLowerCase().includes("chemistry") ? "Engineering Chemistry" : "Review required",
        dueDate,
        details: notice.slice(0, 220)
      });
      notify("Offline fallback used — verify every field");
    } finally { setExtractBusy(false); }
  }
  function createPost(e) {
    e.preventDefault();
    if (!postTitle.trim() || !postDescription.trim()) return;
    setPosts(old => [{ id: Date.now(), type: postType, title: postTitle.trim(), description: postDescription.trim(), tag: postType === "Borrow" ? "Borrow & Share" : "Lost & Found" }, ...old]);
    setPostTitle(""); setPostDescription("");
    notify("Community post published");
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={23}/></div><div><b>Campus<span>AI</span></b><small>STUDENT COMPANION</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{navItems.map(([name, Icon]) => <button key={name} onClick={() => setPage(name)} className={`nav-item ${page === name ? "active" : ""}`}><Icon size={18}/><span>{name}</span>{name === "My tasks" && <em>{openTasks.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-icon"><CircleHelp size={18}/></div><div><b>CampusAI MVP</b><small>Built for students, by students.</small></div></div>
      <div className="profile"><div className="avatar">S</div><div className="profile-copy"><b>Student User</b><small>First-year student</small></div><span className="online-dot"/></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb"><span>Workspace</span><ChevronRight size={14}/><b>{page}</b></div><div className="top-actions"><div className="status-pill"><span className="status-dot"/>{aiStatus}</div><button className="icon-button" title="Search"><Search size={18}/></button><div className="avatar small">S</div></div></header>
      <div className="content">
        {page === "Overview" && <Overview tasks={tasks} upcoming={upcoming} openTasks={openTasks} setPage={setPage} toggleTask={toggleTask} />}
        {page === "My tasks" && <Tasks tasks={tasks} toggleTask={toggleTask} addTask={addTask} />}
        {page === "AI mentor" && <section className="page-section"><PageHeading eyebrow="YOUR PERSONAL GUIDE" title="Ask your campus mentor." subtitle="Get practical, beginner-friendly advice for college life, studies, clubs and productivity." icon={Bot}/><div className="mentor-layout"><div className="panel mentor-panel"><div className="panel-heading"><div className="icon-tile purple"><Sparkles size={19}/></div><div><b>CampusAI Mentor</b><small>Powered by an open-weight language model</small></div><span className="live-tag">AI ASSISTANT</span></div><div className="chat-intro"><div className="bot-orb"><Bot size={28}/></div><h3>Hey there, student 👋</h3><p>What can I help you figure out today?</p></div><div className="suggestions">{["How do I manage my first semester?","Make me a 3-day study plan","How can I prepare for a club interview?"].map(s=><button key={s} onClick={()=>setMentorQuestion(s)}>{s}<ArrowUpRight size={14}/></button>)}</div><form onSubmit={askMentor} className="chat-form"><textarea value={mentorQuestion} onChange={e=>setMentorQuestion(e.target.value)} placeholder="Ask anything about college life…" rows="3"/><button className="primary-button" disabled={mentorBusy || !mentorQuestion.trim()}>{mentorBusy ? "Thinking…" : "Ask mentor"} <Send size={16}/></button></form>{mentorAnswer && <div className="answer-box"><b><Sparkles size={15}/> Mentor's answer</b><p>{mentorAnswer}</p></div>}</div><div className="panel tips-panel"><h3><ShieldCheck size={18}/> A helpful reminder</h3><p>AI can make mistakes. Verify official dates, policies and contact information with your college.</p><div className="tip-row"><Check size={16}/> Use clear questions</div><div className="tip-row"><Check size={16}/> Ask for steps and examples</div><div className="tip-row"><Check size={16}/> Don't share passwords or private data</div></div></div></section>}
        {page === "Assignment AI" && <section className="page-section"><PageHeading eyebrow="LESS ADMIN, MORE LEARNING" title="Turn notices into action." subtitle="Paste an assignment announcement and let AI structure the details for your planner." icon={WandSparkles}/><div className="extract-layout"><form className="panel extract-form" onSubmit={extractNotice}><label>Assignment notice</label><textarea value={notice} onChange={e=>setNotice(e.target.value)} rows="7" placeholder="Paste your assignment message here…"/><div className="privacy-note"><ShieldCheck size={16}/> Demo tip: use public or sample notices, not private student data.</div><button className="primary-button full" disabled={extractBusy || !notice.trim()}>{extractBusy ? "Extracting details…" : "Extract assignment details"} <Sparkles size={16}/></button></form><div className="panel result-panel"><div className="result-top"><div className="icon-tile blue"><FileText size={20}/></div><div><b>Extracted task</b><small>Review before adding</small></div></div>{extracted ? <><div className="field"><small>TASK TITLE</small><b>{extracted.title}</b></div><div className="field"><small>SUBJECT</small><b>{extracted.subject}</b></div><div className="field"><small>DUE DATE</small><b>{prettyDate(extracted.dueDate)}</b></div><div className="field"><small>SUMMARY</small><p>{extracted.details}</p></div><div className="warning-note">Please verify the date and details before saving.</div><button className="primary-button full" onClick={()=>addTask({title:extracted.title,subject:extracted.subject,dueDate:extracted.dueDate,details:extracted.details})}>Confirm & add to tasks <Check size={16}/></button></> : <div className="empty-result"><div className="empty-art"><FileText size={30}/></div><b>Your extracted details will appear here</b><p>AI will identify the task, subject, due date and summary.</p></div>}</div></div></section>}
        {page === "Community" && <section className="page-section"><PageHeading eyebrow="STUDENT-TO-STUDENT" title="Your campus, connected." subtitle="Share useful things, help someone find a lost item, or borrow what you need." icon={Users}/><div className="community-layout"><form className="panel post-form" onSubmit={createPost}><h3><Plus size={18}/> Create a post</h3><label>Post category</label><select value={postType} onChange={e=>setPostType(e.target.value)}><option>Lost</option><option>Found</option><option>Borrow</option></select><label>Title</label><input value={postTitle} onChange={e=>setPostTitle(e.target.value)} placeholder="e.g. Found a calculator"/><label>Details</label><textarea value={postDescription} onChange={e=>setPostDescription(e.target.value)} rows="3" placeholder="Add useful details…"/><button className="primary-button full" disabled={!postTitle.trim() || !postDescription.trim()}>Publish post <ArrowUpRight size={16}/></button><small className="muted">Demo posts are saved in this browser only.</small></form><div className="community-feed"><div className="feed-toolbar"><div><b>Campus feed</b><small>{filteredPosts.length} posts</small></div><div className="searchbox"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search posts"/></div></div>{filteredPosts.map((p,i)=><article className="post-card" key={p.id}><div className={`post-icon tone-${i%3}`}>{p.type === "Borrow" ? <PackageSearch size={20}/> : <Search size={20}/>}</div><div className="post-copy"><div className="post-meta"><span>{p.tag}</span><span>·</span><span>Community</span></div><h3>{p.title}</h3><p>{p.description}</p><span className={`type-label ${p.type.toLowerCase()}`}>{p.type}</span></div></article>)}{filteredPosts.length===0 && <div className="empty-result">No posts match your search.</div>}</div></div></section>}
      </div>
      <footer className="footer"><span>© 2026 CampusAI · Hackathon MVP</span><span><span className="status-dot"/> Student-first by design</span></footer>
    </main>
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, icon: Icon }) {
  return <div className="page-heading"><div className="heading-icon"><Icon size={22}/></div><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
function Overview({ tasks, upcoming, openTasks, setPage, toggleTask }) {
  const completed = tasks.filter(t => t.done).length;
  return <section className="page-section">
    <div className="welcome-row"><div><div className="eyebrow">SATURDAY, OCTOBER 10, 2026</div><h1>Make today count, Student <span>✦</span></h1><p>Your college life, a little more organized.</p></div><button className="primary-button" onClick={()=>setPage("My tasks")}><Plus size={17}/> Add a task</button></div>
    <div className="hero-banner"><div className="hero-glow"/><div className="hero-content"><div className="hero-kicker"><Sparkles size={14}/> YOUR PERSONAL CAMPUS COMPANION</div><h2>Less chaos.<br/><span>More campus life.</span></h2><p>Keep your deadlines in check, get unstuck with AI, and stay connected to your campus.</p><button className="hero-button" onClick={()=>setPage("AI mentor")}>Meet your AI mentor <ArrowUpRight size={16}/></button></div><div className="hero-graphic"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-core"><GraduationCap size={42}/></div><div className="float-card float-one"><CalendarCheck size={16}/><span>Deadlines<br/><b>Under control</b></span></div><div className="float-card float-two"><Sparkles size={16}/><span>CampusAI<br/><b>Ready to help</b></span></div><div className="spark s1">✦</div><div className="spark s2">✧</div></div></div>
    <div className="stats-grid"><Stat icon={ListTodo} label="Open tasks" value={openTasks.length} hint="Keep the momentum" color="violet"/><Stat icon={CalendarDays} label="Upcoming deadlines" value={upcoming.length} hint="Stay one step ahead" color="blue"/><Stat icon={Check} label="Tasks completed" value={completed} hint="Progress adds up" color="green"/><Stat icon={Activity} label="Campus posts" value={3} hint="Community activity" color="orange"/></div>
    <div className="dashboard-grid"><div className="panel task-panel"><div className="panel-heading"><div><h3>Up next</h3><small>Your next priorities</small></div><button className="text-button" onClick={()=>setPage("My tasks")}>View all <ChevronRight size={15}/></button></div>{upcoming.slice(0,4).map(t=><div className="task-row" key={t.id}><button className={`check-circle ${t.done?"checked":""}`} onClick={()=>toggleTask(t.id)} aria-label="Toggle task">{t.done && <Check size={13}/>}</button><div className="task-details"><b className={t.done?"done":""}>{t.title}</b><small>{t.subject || "Personal task"}</small></div><span className={`due-pill ${t.dueDate && t.dueDate <= "2026-10-12" && !t.done?"soon":""}`}>{prettyDate(t.dueDate)}</span></div>)}{upcoming.length===0 && <p className="muted">You're all caught up.</p>}</div><div className="panel quick-panel"><div className="panel-heading"><div><h3>Quick actions</h3><small>What do you need today?</small></div></div><QuickAction icon={Bot} title="Ask your AI mentor" desc="Get unstuck, faster" onClick={()=>setPage("AI mentor")} color="purple"/><QuickAction icon={FileText} title="Scan an assignment" desc="Turn notices into tasks" onClick={()=>setPage("Assignment AI")} color="blue"/><QuickAction icon={Users} title="Open campus community" desc="Find, share and borrow" onClick={()=>setPage("Community")} color="green"/></div></div>
    <div className="bottom-note"><div className="note-icon"><ShieldCheck size={19}/></div><div><b>Student-first, always.</b><p>CampusAI is a student-built prototype. Verify official information with your college, and keep private details private.</p></div><span className="note-badge">BUILT FOR CAMPUS</span></div>
  </section>;
}
function Stat({ icon: Icon, label, value, hint, color }) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}><Icon size={18}/></div><div className="stat-copy"><small>{label}</small><strong>{value}</strong><span>{hint}</span></div><ArrowUpRight className="stat-arrow" size={16}/></div>;
}
function QuickAction({ icon: Icon, title, desc, onClick, color }) {
  return <button className="quick-action" onClick={onClick}><div className={`quick-icon ${color}`}><Icon size={18}/></div><div><b>{title}</b><small>{desc}</small></div><ChevronRight size={17}/></button>;
}
function Tasks({ tasks, toggleTask, addTask }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  function submit(e) { e.preventDefault(); if (!title.trim()) return; addTask({ title: title.trim(), subject: subject.trim() || "Personal", dueDate }); setTitle(""); setSubject(""); setDueDate(""); }
  return <section className="page-section"><PageHeading eyebrow="YOUR PERSONAL PLANNER" title="Stay on top of it all." subtitle="Your tasks live here. Check them off as you make progress." icon={ListTodo}/><form className="panel add-task-form" onSubmit={submit}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What do you need to do?" required/><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject (optional)"/><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/><button className="primary-button" disabled={!title.trim()}><Plus size={16}/> Add task</button></form><div className="panel all-tasks"><div className="panel-heading"><div><h3>All tasks</h3><small>{tasks.filter(t=>!t.done).length} remaining · {tasks.filter(t=>t.done).length} completed</small></div></div>{tasks.map(t=><div className="task-row" key={t.id}><button className={`check-circle ${t.done?"checked":""}`} onClick={()=>toggleTask(t.id)}>{t.done && <Check size={13}/>}</button><div className="task-details"><b className={t.done?"done":""}>{t.title}</b><small>{t.subject || "Personal task"}</small></div><span className="due-pill">{prettyDate(t.dueDate)}</span></div>)}</div></section>;
}
