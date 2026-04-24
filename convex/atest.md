Here's a ready-to-use prompt you can drop into Claude (or any AI coding assistant):

---

**Prompt:**

```
You are redesigning the visual layer of an existing React + shadcn/ui + Convex chat application.
Do NOT change any logic, data fetching, Convex queries/mutations, hooks, or component structure.
Only modify className values, CSS variables, Tailwind utility classes, and shadcn theme tokens.

## Design System to Apply

### Color Palette (add to your CSS :root / globals.css)
--fab-bg-deep: #f0eeff;
--fab-bg-sidebar: #e8e4fb;
--fab-bg-main: #faf9ff;
--fab-bg-card: #ffffff;
--fab-teal: #0fa896;
--fab-teal-light: #e0f6f3;
--fab-magenta: #b5204f;
--fab-magenta-light: #fcedf2;
--fab-amber: #c47d08;
--fab-amber-light: #fef3dc;
--fab-text-primary: #14112b;
--fab-text-muted: #5a5478;
--fab-text-dim: #9d99b8;
--fab-border: rgba(80, 60, 160, 0.1);
--fab-border-md: rgba(80, 60, 160, 0.15);
--fab-grid: rgba(100, 80, 200, 0.06);

Override the shadcn CSS variables to match:
--background: 248 100% 97%;         /* #f0eeff */
--foreground: 248 40% 13%;          /* #14112b */
--primary: 174 83% 36%;             /* #0fa896 teal */
--primary-foreground: 0 0% 100%;
--secondary: 248 30% 92%;           /* sidebar lavender */
--muted: 248 20% 90%;
--muted-foreground: 248 10% 46%;    /* #5a5478 */
--accent: 248 30% 88%;
--border: 248 30% 88%;
--ring: 174 83% 36%;

### Typography
- Use 'Syne' (Google Font) for headings, channel names, usernames, workspace name, and all-caps labels
- Use 'DM Sans' for body text, messages, timestamps, sidebar items
- Add to your layout:
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

### Layout Rules
Sidebar:
- bg: var(--fab-bg-sidebar), border-right: 1px solid var(--fab-border-md)
- Workspace header: flex row, logo square with bg var(--fab-magenta), rounded-lg, bold 'FL' initials
- Active channel: bg var(--fab-teal-light), left border 3px solid var(--fab-teal), text color var(--fab-teal)
- Unread badge: bg var(--fab-magenta), text white, rounded-full, text-[10px] font-bold
- Online indicator dot: 7px circle, bg var(--fab-teal)
- Section labels: text-[10px] font-bold tracking-[0.12em] uppercase, color var(--fab-text-dim), font DM Sans

Main chat area:
- bg: var(--fab-bg-main)
- Add a CSS grid background pattern using background-image with linear-gradient lines (28px spacing, var(--fab-grid) color)
- Add two soft radial gradient orbs: teal top-right, amber bottom-left (position: absolute, pointer-events: none, z-index: 0)
- All content sits at z-index: 2 above the orbs

Channel header:
- bg: rgba(255,255,255,0.75) with backdrop-filter: blur(8px)
- Left accent bar: 4px wide, 22px tall, bg var(--fab-teal), rounded-sm
- Channel title: font Syne, font-weight 800, tracking-wide, uppercase
- Search button: white bg, border var(--fab-border-md), subtle shadow

Messages:
- Message avatar: 34px × 34px, rounded-[8px] square (not circle), colored with brand palette colors cycling through [var(--fab-magenta), #534AB7, var(--fab-teal), #854F0B, #3B6D11, #185FA5]
- Username: font Syne, font-weight 700
- Timestamp: font DM Sans, color var(--fab-text-dim), text-[11px]
- Role badges:
    Admin → bg var(--fab-magenta-light), text var(--fab-magenta)
    Maker → bg var(--fab-teal-light), text var(--fab-teal)
    Designer → bg var(--fab-amber-light), text var(--fab-amber)
  All badges: text-[10px] font-bold tracking-[0.06em] uppercase, rounded-[4px], px-[7px] py-[2px]
- Highlighted text spans: bg var(--fab-teal-light), text var(--fab-teal), rounded-[3px], px-[5px], font-semibold
- Code spans: bg #f2f0ff, text #5a3fb5, font-mono, text-[12px], rounded-[4px]
- Attachment/quote blocks: white bg, border-l-[3px] border-l-[var(--fab-magenta)], rounded-r-[6px], shadow-sm, label in var(--fab-magenta) text-[11px] uppercase font-bold tracking-wider
- Reactions: white bg, border var(--fab-border-md), rounded-full, shadow-sm; active/mine state → bg var(--fab-teal-light), border var(--fab-teal), text var(--fab-teal)

Date divider:
- Horizontal line: 1px, var(--fab-border-md)
- Date pill: white bg, border var(--fab-border-md), rounded-full, text-[11px] font-semibold DM Sans

Input area:
- Container: white bg, border var(--fab-border-md), rounded-[10px], shadow-sm
- Focus state: border-[rgba(15,168,150,0.5)], ring 3px rgba(15,168,150,0.08)
- Toolbar: border-bottom 1px var(--fab-border), icon buttons 28×28 rounded-[5px]
- Send button: 32×32, rounded-[7px], bg var(--fab-teal), white icon, hover scale-105

Accent stripe (above input):
- Three colored segments: flex row, height 3px, rounded-full
  Segment 1: bg var(--fab-teal), flex 3
  Segment 2: bg var(--fab-magenta), flex 2
  Segment 3: bg var(--fab-amber), flex 2.5
  All at opacity-70

### shadcn Component Overrides
- <Button variant="default"> → apply teal background (var(--fab-teal)), white text
- <Button variant="outline"> → white bg, border var(--fab-border-md), DM Sans font, hover white + shadow
- <Avatar> → use square rounded-[8px] not circle (override border-radius)
- <Badge> → match role badge styles above based on variant prop
- <ScrollArea> → hide scrollbar track, 4px wide thumb, color var(--fab-border-md)
- <Separator> → 1px, color var(--fab-border-md)
- <Input> / <Textarea> → transparent bg, no border, DM Sans, text var(--fab-text-primary), placeholder var(--fab-text-dim)

### Fonts in Tailwind (extend tailwind.config.js)
fontFamily: {
  display: ['Syne', 'sans-serif'],
  body: ['DM Sans', 'sans-serif'],
}

Apply font-display to: workspace name, channel title, usernames, section headings
Apply font-body to: messages, timestamps, metadata, sidebar channel names

### Animation
Add a single entrance animation for new messages:
@keyframes slideIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.message-enter { animation: slideIn 0.2s ease; }

Apply this class to any element that renders a new message in the list.

## Instructions
1. Update globals.css with the CSS variables above
2. Update tailwind.config.js with font families
3. Go component by component — Sidebar, ChannelHeader, MessageList, MessageItem, MessageInput — and apply the className and style changes described above
4. Do not touch any props, event handlers, Convex hooks (useQuery, useMutation), or business logic
5. Preserve all existing aria labels and accessibility attributes
6. After each component, confirm what was changed and what logic was left untouched
```

---

A few tips for using this prompt effectively:

- **Paste it alongside your component files** so the AI has the existing code as context — it'll map the design tokens directly onto your actual classNames rather than guessing.
- **Run it one component at a time** (Sidebar → ChannelHeader → MessageItem → MessageInput) if your codebase is large, to avoid the AI drifting or touching logic mid-way.
- If you use a **custom shadcn theme file**, point the AI at it explicitly so it updates tokens in one place rather than hardcoding hex values throughout.
