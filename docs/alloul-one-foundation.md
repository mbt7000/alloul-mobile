# Alloul One — Product Architecture + Visual Identity (Glass)

هذه الوثيقة هي الأساس المعماري والبصري لتطبيق Alloul One. الهدف: منصة عالمية ذكية تخدم الشركات والإعلام والمجتمع المهني بواجهات موبايل راقية، حديثة، وذات طابع زجاجي (Glassmorphism) محسوب.

---

## 1) Product Architecture (High-Level)

### Core Modes
- Public Mode: شبكة مهنية عامة، محتوى، فرص، اكتشاف.
- Company Mode: مساحة عمل داخلية للشركات (مشاريع، فرق، اجتماعات، مهام، هاند أوفر).
- AI Layer: ذكاء تشغيلي مدمج عبر كل الشاشات.

### Navigation Map (Concept)
- App Shell: Drawer + Bottom Tabs + Stacks
- Mode Switcher: داخل Drawer + Top-level toggle
- AI Access: زر ثابت/اختصار في كل Mode + شاشة Chat

---

## 2) Screen Map (First Release)

### Public Mode
- Home (Landing)
- Feed
- Discover
- Opportunities
- Company Profile
- User Profile
- Notifications
- Search

### Company Mode
- Dashboard
- Teams
- Projects
- Project Detail
- Meetings
- Tasks
- Documents
- Handover Studio
- Knowledge Base
- Reports
- Settings & Permissions

### AI Layer
- AI Assistant (Chat)
- Contextual AI Summary Drawer
- AI Recommendations Panel

---

## 3) User Flows (Core)

### Onboarding
- Intro → Auth → Role/Company selection → Mode preference → First experience

### Public Flow
- Feed → Discover → Profile/Company → Opportunity → Action

### Company Flow
- Dashboard → Teams/Projects → Detail → Handover/Docs → AI Summary

### AI Flow
- Contextual Prompt → Summary/Answer → Action Suggestions → Link to source

---

## 4) Information Architecture

### Primary Sections
- Public
  - Home
  - Feed
  - Discover
  - Opportunities
  - Profiles (User/Company)
- Company
  - Dashboard
  - Teams
  - Projects
  - Meetings
  - Tasks
  - Documents
  - Handover Studio
  - Knowledge Base
  - Reports
  - Settings
- AI
  - Assistant
  - Summaries
  - Recommendations

---

## 5) Mobile UX Structure

### Navigation Structure
- Bottom Tabs (4): Public / Discover / Notifications / Profile
- Drawer: Mode Switcher + Deep navigation
- Stack: Detail screens (Project, Profile, Opportunity)

### Mode Switching
- Global switch with visible state and brand indicator
- Locked Company Mode if user not a member (Upsell gate)

### States
- Empty: calm + informative + CTA
- Loading: skeleton cards
- Error: gentle and recoverable

---

## 6) Visual Identity (Glass Direction)

### Visual Tone
- Premium, futuristic, calm, enterprise-grade
- Glass surfaces, subtle gradients, floating cards
- High contrast typography with soft neon accents

### Palette (Proposed)
- Base: Midnight (#070A12), Void (#0B111B)
- Glass: Frost (#FFFFFF14), Frost Strong (#FFFFFF1F)
- Accents: Neon Cyan (#38E8FF), Cobalt (#4C6FFF), Signal Lime (#B7FF4F), Ember (#FF7A59)
- Text: Primary (#F5F7FB), Secondary (#A8B3C7), Muted (#6C768A)

### Typography (Proposed)
- Headings: Sora (600/700)
- Body: Manrope (400/500)
- Numbers/Badges: Space Grotesk (500)

### Spacing + Radii
- 4pt grid
- Radii: 12, 16, 20, 28 (glass cards)

### Glass Cards
- Background: Frost with alpha
- Border: thin, bright edge
- Soft glow shadow

---

## 7) Component Architecture

- GlassCard
- StatPill
- AIContextCard
- ProjectCard
- TeamCard
- HandoverCard
- DocRow
- ProfileHeader
- OpportunityCard

---

## 8) Data Model (Core)

- User: id, name, title, bio, avatar, followers, companyIds
- Company: id, name, brand, teams, projects
- Team: id, name, members, roles
- Project: id, title, status, owner, timeline, files, meetings
- Task: id, title, status, owner, dueDate
- Meeting: id, agenda, notes, attendees
- Handover: id, fromUser, toUser, risks, readiness
- Document: id, title, type, linkedContext
- KnowledgeEntry: id, title, body, tags
- Opportunity: id, type, title, companyId
- Notification: id, type, message, read

---

## 9) Implementation Plan

### Folder Structure (Proposed)
- src/theme
  - colors.ts, typography.ts, spacing.ts, radii.ts, glass.ts, shadows.ts
- src/components
  - glass, cards, lists, ai
- src/navigation
  - root, public, company, ai
- src/screens
  - public, company, ai, auth
- src/data
  - mocks, models
- src/services
  - api, auth, ai

### Phase 1
- Design system
- App shell + navigation
- Onboarding + mode switch

---

## Notes
- هذا المستند هو الأساس. سيتم تحويله إلى تطبيق فعلي تدريجيا.
- الهوية الزجاجية ستستخدم باحتراف لتجنب التشويش البصري.
