# Momentum App - System Architecture Overview

**Understanding How Everything Fits Together**

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER LAYER                          │
│  (React SPA - Browser/PWA)                                  │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard  │  │  Brain Dump  │  │ Momentum Maps │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
│  ┌─────────────────────────────────────────────────┐       │
│  │          Smart Reminders Calendar               │       │
│  └─────────────────────────────────────────────────┘       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ React Query + Supabase Client
                     │
┌────────────────────┼────────────────────────────────────────┐
│                    ▼        API LAYER                       │
│              Supabase Platform                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │   Database   │  │   Storage    │     │
│  │ (User Mgmt)  │  │  (Postgres)  │  │  (Files)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │          Edge Functions (Serverless)            │       │
│  │  • categorize-thought    • generate-map        │       │
│  │  • find-connections      • replan-map          │       │
│  │  • get-stuck-suggestions                       │       │
│  └─────────────────────────────────────────────────┘       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ API Calls
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  EXTERNAL SERVICES                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Gemini AI  │  │     FCM      │  │    Sentry    │     │
│  │  (Google)    │  │(Push Notif.) │  │(Error Track) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Architecture

### 1. Brain Dump Module

**Purpose:** Capture and organize random thoughts

```
User Flow:
┌─────────────┐
│  Capture    │ → User types thought
└──────┬──────┘
       ▼
┌─────────────┐
│    Save     │ → Store in DB (status: 'processing')
└──────┬──────┘
       ▼
┌─────────────┐
│ Categorize  │ → AI suggests categories
└──────┬──────┘
       ▼
┌─────────────┐
│   Display   │ → Show as card (status: 'active')
└─────────────┘
```

**Data Flow:**
```
thoughts table
    ├─→ categories (many-to-many via thought_categories)
    ├─→ clusters (many-to-many via thought_cluster_members)
    └─→ connections (AI-generated relationships)
```

**Key Operations:**
- **Create:** `CapturePanel` → `supabase.from('thoughts').insert()`
- **Categorize:** Edge Function `categorize-thought` → AI → Update thought
- **Cluster:** Background job groups related thoughts
- **Archive:** Update `status` to 'archived', set `archived_at`
- **Undo:** Restore within 12-second window using toast action

**UI Components:**
- `CapturePanel` - Main input area
- `ThoughtCard` - Individual thought display
- `ClusterCard` - Grouped thoughts with progress
- `ConnectionCard` - Related thought pairs
- `FilterPanel` - Search and category filters

---

### 2. Momentum Maps Module

**Purpose:** Break down big goals into actionable steps

```
User Flow:
┌─────────────┐
│ Enter Goal  │ → "Launch a podcast"
└──────┬──────┘
       ▼
┌─────────────┐
│ Generate    │ → AI creates plan with chunks & sub-steps
└──────┬──────┘
       ▼
┌─────────────┐
│   Display   │ → Show structured plan
└──────┬──────┘
       │
       ├─→ Mark steps complete
       ├─→ Lock chunks
       ├─→ Replan → Generate new plan around locked chunks
       └─→ Get stuck help → AI suggests next actions
```

**Data Model:**
```
momentum_maps
    └─→ chunks (one-to-many)
           └─→ sub_steps (one-to-many)

Map State Tracking:
  - acceptance_criteria: List of completion conditions
  - locked_chunks: Array of chunk IDs to preserve during replan
  - checked_steps: Array of completed sub-step IDs
```

**Key Operations:**
- **Generate:** `GoalInput` → Edge Function `generate-map` → Create map/chunks/steps
- **Replan:** Lock chunks → Edge Function `replan-map` → Show diff → Accept/Reject
- **Get Stuck:** Select chunk → Edge Function `get-stuck-suggestions` → Show suggestions
- **Complete:** Toggle sub-step checkboxes → Update progress calculation

**UI Components:**
- `GoalInput` - Initial goal entry
- `ChunkCard` - Phase/section display with sub-steps
- `FinishLinePanel` - Completion criteria
- `ImStuckModal` - Context-sensitive help
- `ReplanDiffModal` - Before/after comparison

---

### 3. Smart Reminders Module

**Purpose:** Context-aware scheduling with recurring anchors

```
User Flow:
┌─────────────┐
│Create Anchor│ → "Work: Mon-Fri 9-5"
└──────┬──────┘
       ▼
┌─────────────┐
│Add Reminder │ → "Pack lunch 30 min before Work"
└──────┬──────┘
       ▼
┌─────────────┐
│ NL Parsing  │ → AI extracts: anchor="Work", offset=-30
└──────┬──────┘
       ▼
┌─────────────┐
│  Schedule   │ → Calculate trigger times (8:30 AM Mon-Fri)
└──────┬──────┘
       ▼
┌─────────────┐
│   Deliver   │ → Cron job sends push notification
└─────────────┘
```

**Data Model:**
```
anchors (recurring schedule blocks)
    ├─ title: "Work"
    ├─ days: [1,2,3,4,5] (Mon-Fri)
    ├─ start_time: 09:00
    └─ end_time: 17:00

smart_reminders (contextual notifications)
    ├─ anchor_id: → links to anchor
    ├─ offset_minutes: -30 (30 min before)
    ├─ message: "Pack lunch"
    └─ status: 'active' | 'snoozed' | 'done'

dnd_windows (do not disturb)
    ├─ start_time: 23:00
    └─ end_time: 07:00
```

**Calculation Logic:**
```typescript
// For each day in anchor.days:
triggerTime = anchor.start_time + reminder.offset_minutes

// Check DND conflict:
if (triggerTime within dnd_window) {
  triggerTime = dnd_window.end_time
}

// Schedule notification for triggerTime
```

**Key Operations:**
- **Create Anchor:** Calendar UI → `anchors` table
- **Create Reminder (NL):** Chat input → Edge Function → Parse → Create reminder
- **Schedule:** Cron job queries due reminders → Send via FCM
- **Snooze:** Update `snooze_until` → Reschedule notification
- **DND:** Check before sending → Postpone to DND end time

**UI Components:**
- `WeeklyCalendar` - Grid view of week
- `AnchorBlock` - Draggable schedule block
- `ReminderList` - Attached reminders per anchor
- `DNDPanel` - Quiet hours configuration
- `AIChat` - Natural language reminder creation

---

## 🔐 Security Model

### Row Level Security (RLS) Policies

Every table has RLS enabled with user-scoped access:

```sql
-- Example policy for thoughts table
CREATE POLICY "Users can manage own thoughts"
  ON public.thoughts FOR ALL
  USING (auth.uid() = user_id);

-- Example policy for chunks (nested ownership)
CREATE POLICY "Users can manage chunks for own maps"
  ON public.chunks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE id = chunks.momentum_map_id
      AND user_id = auth.uid()
    )
  );
```

**Key Principles:**
1. **User Isolation:** Every record scoped to `user_id`
2. **No Public Access:** All tables private by default
3. **Nested Permissions:** Child records inherit parent access
4. **No Admin Override:** Even admins can't access user data

### Authentication Flow

```
1. User Sign-Up/Login → Supabase Auth
2. Create Session → JWT token issued
3. Auto-Create Profile → Trigger creates profile record
4. Client Requests → JWT sent in header
5. RLS Check → Database verifies user_id matches JWT
6. Response → Only user's data returned
```

---

## 🤖 AI Integration Architecture

### Edge Functions (Serverless)

Located in: `supabase/functions/`

**1. categorize-thought**
```typescript
Input:  { content: string }
Output: { categories: string[] }

Prompt: "Analyze this thought and suggest 2-4 categories..."
Model:  gemini-2.5-flash
Cache:  5 minutes per unique content
```

**2. find-connections**
```typescript
Input:  { thoughts: Thought[] }
Output: { connections: Connection[], duplicates: Pair[] }

Process:
  1. Batch thoughts (max 50)
  2. Send to AI for semantic analysis
  3. Calculate similarity scores
  4. Filter by threshold (>0.8 = duplicate, >0.6 = connection)
```

**3. generate-map**
```typescript
Input:  { goal: string }
Output: { chunks: Chunk[], acceptance_criteria: string[] }

Prompt: "Break down this goal into 3-9 chunks..."
Model:  gemini-2.5-flash
Validation: Ensure output matches schema (Zod)
```

**4. replan-map**
```typescript
Input:  { goal: string, locked_chunks: Chunk[] }
Output: { chunks: Chunk[], acceptance_criteria: string[] }

Process:
  1. Include locked chunks in prompt
  2. Generate new plan around them
  3. Create diff for user review
  4. Apply only if accepted
```

**5. get-stuck-suggestions**
```typescript
Input:  { goal: string, chunk: Chunk }
Output: { suggestions: string[] }

Prompt: "The user is stuck on this chunk. Suggest 2-3 actions..."
Fallback: Hardcoded generic suggestions if AI fails
```

### AI Best Practices

**Cost Control:**
- Cache responses for 5 minutes
- Rate limit: 10 requests/minute per user
- Use smaller model (flash) for simple tasks
- Batch operations where possible

**Quality Assurance:**
- Validate outputs with Zod schemas
- Implement retry logic (3 attempts)
- Provide fallbacks for failures
- Log unusual outputs for review

**Security:**
- Sanitize user inputs
- Never expose API keys client-side
- Run all AI calls server-side (Edge Functions)
- Validate authentication on every request

---

## 🗄️ Database Schema Overview

### Core Tables

```
profiles (user data)
    └─ Extended from auth.users

categories (thought tags)
    └─ Owned by user

thoughts (brain dump entries)
    ├─→ user_id
    ├─→ category_id (will become many-to-many)
    └─ status: 'active' | 'archived'

clusters (grouped thoughts)
    └─→ members (via thought_cluster_members)

momentum_maps (AI-generated plans)
    ├─ goal, acceptance_criteria
    └─→ chunks

chunks (plan phases)
    ├─ title, status, sort_order
    └─→ sub_steps

sub_steps (actionable tasks)
    ├─ title, is_completed
    └─ sort_order

anchors (recurring schedule blocks)
    ├─ day_of_week, start_time, end_time
    └─→ smart_reminders

smart_reminders (contextual notifications)
    ├─ offset_minutes, message
    ├─ status, success_history
    └─ trigger_type

dnd_windows (do not disturb)
    └─ start_time, end_time, is_recurring
```

### Key Relationships

```
User (1) ─→ (Many) Thoughts
User (1) ─→ (Many) Categories
User (1) ─→ (Many) Clusters
User (1) ─→ (Many) Momentum Maps
User (1) ─→ (Many) Anchors
User (1) ─→ (Many) Smart Reminders

Thought (Many) ←→ (Many) Categories [via thought_categories]
Thought (Many) ←→ (Many) Clusters [via thought_cluster_members]

Momentum Map (1) ─→ (Many) Chunks
Chunk (1) ─→ (Many) Sub-Steps

Anchor (1) ─→ (Many) Smart Reminders
```

---

## 🔄 State Management Strategy

### Client-Side State (React)

**Per-Component State** (`useState`)
- Form inputs
- Modal open/closed
- UI-only state

**Shared State** (Reducers)
- `brainDumpReducer`: Select mode, bulk actions, filters
- `momentumMapsReducer`: Locked chunks, stuck modal, replan state

**Server State** (React Query)
- All database data
- Automatic caching
- Background refetching
- Optimistic updates

### State Flow Example

```typescript
// 1. User checks a sub-step
onClick() → dispatch({ type: 'TOGGLE_SUBSTEP', id })

// 2. Reducer updates local state optimistically
reducer() → return { ...state, checked: [...state.checked, id] }

// 3. Mutation sent to database
useMutation() → supabase.from('sub_steps').update({ is_completed: true })

// 4. React Query refetches on success
onSuccess() → queryClient.invalidateQueries(['momentum-maps'])

// 5. UI reflects confirmed state
```

---

## 🚀 Deployment Architecture

### Recommended Setup

```
┌─────────────────────────────────────────────────────┐
│                  CLOUDFLARE DNS                     │
│              momentum.app → CNAME                   │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│                 VERCEL HOSTING                      │
│  ┌────────────────────────────────────────────┐    │
│  │   Frontend (React SPA)                     │    │
│  │   - Automatic HTTPS                        │    │
│  │   - CDN distribution                       │    │
│  │   - Edge caching                           │    │
│  └────────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│             SUPABASE PLATFORM                       │
│  ┌─────────────────────────────────────────────┐   │
│  │  Database (Postgres) - us-west-1          │   │
│  │  Auth & User Management                   │   │
│  │  Edge Functions (Deno)                    │   │
│  │  Storage (for future avatar uploads)      │   │
│  └─────────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│         MONITORING & EXTERNAL SERVICES              │
│  • Sentry (Error Tracking)                         │
│  • Google Cloud (Gemini AI)                        │
│  • Firebase (Push Notifications)                   │
│  • Supabase Analytics                              │
└─────────────────────────────────────────────────────┘
```

### Environments

**Development**
- Local: `npm run dev` → localhost:5173
- Database: Supabase local instance or dev project

**Staging**
- Vercel preview deployment
- Separate Supabase project
- Test data seeded

**Production**
- Vercel production domain
- Production Supabase project
- Real user data
- Monitoring enabled

---

## 📊 Performance Considerations

### Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load routes
const BrainDump = lazy(() => import('./pages/BrainDump'));
const MomentumMaps = lazy(() => import('./pages/MomentumMaps'));
```

**React Query Caching:**
```typescript
// Cache thoughts for 5 minutes
useQuery({
  queryKey: ['thoughts', 'active'],
  queryFn: fetchActiveThoughts,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Optimistic Updates:**
```typescript
// Update UI immediately, sync with DB in background
mutate(newData, {
  onMutate: async (newData) => {
    // Update cache optimistically
    queryClient.setQueryData(['thoughts'], (old) => [...old, newData]);
  },
});
```

### Database Optimization

**Critical Indexes:**
```sql
-- Already in schema:
CREATE INDEX idx_thoughts_user_status ON thoughts(user_id, status);
CREATE INDEX idx_thoughts_category ON thoughts(category_id);

-- To add:
CREATE INDEX idx_thoughts_created_at ON thoughts(created_at DESC);
CREATE INDEX idx_smart_reminders_trigger_time ON smart_reminders(trigger_time)
  WHERE is_completed = false;
```

**Query Optimization:**
```typescript
// Use select to limit columns
const { data } = await supabase
  .from('thoughts')
  .select('id, title, status, created_at') // Only needed columns
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50); // Paginate
```

---

## 🧪 Testing Strategy

### Test Pyramid

```
       ┌────────────┐
       │    E2E     │ ← Few, critical user flows
       ├────────────┤
       │Integration │ ← Moderate, key interactions
       ├────────────┤
       │   Unit     │ ← Many, all logic functions
       └────────────┘
```

**Unit Tests (Jest + React Testing Library)**
- All utility functions
- Reducers
- Custom hooks
- Data transformations

**Integration Tests**
- API integrations
- Supabase operations
- Edge Function responses
- Auth flows

**E2E Tests (Playwright)**
- User signup and login
- Create and archive thought
- Generate momentum map
- Create and complete reminder

---

## 🔍 Monitoring & Observability

### Key Metrics to Track

**Technical Metrics:**
- Error rate (target: <1%)
- API response time (target: <200ms p95)
- Page load time (target: <2s)
- Database query time (target: <50ms p95)
- Edge Function execution time

**User Metrics:**
- Daily active users (DAU)
- Thoughts captured per day
- Maps completed
- Reminders triggered
- User retention (day 7, day 30)

**Business Metrics:**
- New signups
- Conversion rate (signup → active use)
- Feature adoption
- User satisfaction (NPS)

---

## 🛠️ Development Workflow

### Recommended Git Flow

```
main (production)
  └─ staging (pre-production testing)
       └─ develop (integration branch)
            ├─ feature/brain-dump-clusters
            ├─ feature/smart-reminders
            ├─ bugfix/auth-redirect
            └─ hotfix/critical-security
```

### Pull Request Checklist

- [ ] Code follows TypeScript style guide
- [ ] Tests added/updated
- [ ] No console.logs in production code
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Tested locally
- [ ] Deploy preview reviewed
- [ ] No breaking changes (or documented)

---

## 📚 Key Files Reference

### Configuration
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript settings
- `tailwind.config.ts` - Design system
- `.env` - Environment variables (DON'T COMMIT!)

### Core Application
- `src/App.tsx` - Root component, routing
- `src/integrations/supabase/client.ts` - Supabase setup
- `src/hooks/` - Reusable logic
- `src/reducers/` - State management

### Database
- `supabase/migrations/` - Schema definitions
- `supabase/functions/` - Edge Functions (AI)

### Documentation
- `README.md` - Quick start
- `PRODUCTION_READINESS_CHECKLIST.md` - Full task list
- `IMPLEMENTATION_ORDER.md` - Quick reference
- `ARCHITECTURE_OVERVIEW.md` - This file

---

## 🎯 Next Steps

Now that you understand the architecture:

1. **Review the Implementation Order** → [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md)
2. **Start with Week 1 tasks** → Security foundation
3. **Fix database schema** → Week 2 priority
4. **Build one module at a time** → Don't skip around
5. **Test as you go** → Don't leave testing for the end

---

**Questions?** Review the detailed specifications in the documentation folder or create an issue.

**Last Updated:** October 21, 2025
