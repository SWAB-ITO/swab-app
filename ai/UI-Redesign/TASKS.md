# Sequential Task List
**Version:** 1.0.0
**Total Tasks:** 45
**Estimated Duration:** 6-8 hours

---

## How to Use This File

1. Execute tasks in order (don't skip)
2. Check off each task as completed
3. Test after each task
4. Commit after each section
5. If a task fails, fix before proceeding

---

## PHASE 1: FOUNDATION

### Section 1.1: Design Tokens (30 min)

**Task 1.1.1** - Create design tokens file
- [ ] Create `src/lib/design-tokens.ts`
- [ ] Export semantic color tokens
- [ ] Export spacing scale
- [ ] Export typography scale
- [ ] Export icon sizes
- [ ] Add JSDoc comments

**Task 1.1.2** - Update Tailwind config
- [ ] Open `tailwind.config.ts`
- [ ] Add semantic color tokens to theme.extend.colors
- [ ] Add success colors (bg, text, border)
- [ ] Add warning colors (bg, text, border)
- [ ] Add error colors (bg, text, border)
- [ ] Add info colors (bg, text, border)
- [ ] Test: `npm run dev` compiles without errors

**Task 1.1.3** - Add typography utilities
- [ ] Open `src/app/globals.css`
- [ ] Add @layer utilities section (if not exists)
- [ ] Add `.text-display` utility
- [ ] Add `.text-h1`, `.text-h2`, `.text-h3` utilities
- [ ] Add `.text-body-lg`, `.text-body`, `.text-body-sm`, `.text-caption` utilities
- [ ] Test: Apply class to element, verify styling

---

### Section 1.2: Extend Badge Component (15 min)

**Task 1.2.1** - Add semantic variants to Badge
- [ ] Open `src/components/ui/badge.tsx`
- [ ] Add `success` variant to badgeVariants
- [ ] Add `warning` variant to badgeVariants
- [ ] Add `error` variant to badgeVariants
- [ ] Add `info` variant to badgeVariants
- [ ] Use semantic color tokens from Tailwind
- [ ] Test: Render each variant, verify colors

**Task 1.2.2** - Add size variants to Badge (optional)
- [ ] Add size to variants
- [ ] Add `sm`, `md` (default), `lg` sizes
- [ ] Test: Render each size, verify sizing

**Checkpoint:** Commit "feat: add design tokens and extend Badge component"

---

## PHASE 2: CORE COMPOSITE COMPONENTS

### Section 2.1: StatusBadge Component (30 min)

**Task 2.1.1** - Create StatusBadge component file
- [ ] Create `src/components/composite/` directory
- [ ] Create `src/components/composite/status-badge.tsx`
- [ ] Add TypeScript interface: `StatusBadgeProps`
- [ ] Define status prop: 'pending' | 'running' | 'completed' | 'failed'
- [ ] Define severity prop: 'info' | 'warning' | 'error' | 'critical'
- [ ] Add size prop: 'sm' | 'md' | 'lg'

**Task 2.1.2** - Implement status mappings
- [ ] Create status config object
- [ ] Map 'pending' → gray color, Clock icon
- [ ] Map 'running' → blue color, Loader icon (animated)
- [ ] Map 'completed' → green color, CheckCircle icon
- [ ] Map 'failed' → red color, XCircle icon

**Task 2.1.3** - Implement severity mappings
- [ ] Create severity config object
- [ ] Map 'info' → blue color, Info icon
- [ ] Map 'warning' → yellow color, AlertTriangle icon
- [ ] Map 'error' → orange color, AlertCircle icon
- [ ] Map 'critical' → red color, AlertOctagon icon

**Task 2.1.4** - Render component
- [ ] Import Badge from ui/badge
- [ ] Import icons from lucide-react
- [ ] Render Badge with appropriate variant
- [ ] Render icon with appropriate size
- [ ] Render label text
- [ ] Add JSDoc comments with examples

**Task 2.1.5** - Test StatusBadge
- [ ] Test all status values render correctly
- [ ] Test all severity values render correctly
- [ ] Test size prop works
- [ ] Test className prop works (passthrough)

**Checkpoint:** Commit "feat: add StatusBadge component"

---

### Section 2.2: ConsoleOutput Component (45 min)

**Task 2.2.1** - Create ConsoleOutput component file
- [ ] Create `src/components/composite/console-output.tsx`
- [ ] Add TypeScript interface: `ConsoleOutputProps`
- [ ] Add props: lines (string[]), loading (boolean)
- [ ] Add props: maxHeight (string), showCopy (boolean)
- [ ] Add props: showClear (boolean), onClear (function)

**Task 2.2.2** - Implement base structure
- [ ] Create Card wrapper
- [ ] Add header with title/buttons area
- [ ] Add scrollable content area
- [ ] Add ref for scroll container
- [ ] Style with monospace font, dark background

**Task 2.2.3** - Implement auto-scroll
- [ ] Add useEffect for scroll behavior
- [ ] Scroll to bottom when lines change
- [ ] Only scroll if user is near bottom (smart scroll)

**Task 2.2.4** - Implement copy button
- [ ] Add Copy button to header
- [ ] Implement copy to clipboard functionality
- [ ] Show toast/feedback on copy success
- [ ] Hide button if showCopy is false

**Task 2.2.5** - Implement clear button
- [ ] Add Clear button to header
- [ ] Call onClear when clicked
- [ ] Hide button if showClear is false

**Task 2.2.6** - Implement loading state
- [ ] Add pulsing cursor if loading is true
- [ ] Add to last line of output
- [ ] Animate cursor (CSS animation)

**Task 2.2.7** - Test ConsoleOutput
- [ ] Test lines render correctly
- [ ] Test auto-scroll works
- [ ] Test copy button works
- [ ] Test clear button works
- [ ] Test loading cursor animates
- [ ] Test maxHeight prop works

**Checkpoint:** Commit "feat: add ConsoleOutput component"

---

### Section 2.3: StatCard Component (45 min)

**Task 2.3.1** - Create StatCard component file
- [ ] Create `src/components/composite/stat-card.tsx`
- [ ] Add TypeScript interface: `StatCardProps`
- [ ] Add props: title, value, description, icon
- [ ] Add props: colorScheme, loading, onClick, trend

**Task 2.3.2** - Implement base layout
- [ ] Create Card wrapper
- [ ] Add CardHeader with flex layout
- [ ] Position icon in top-right
- [ ] Add title in top-left

**Task 2.3.3** - Implement value display
- [ ] Add CardContent section
- [ ] Display value (large, bold)
- [ ] Apply color based on colorScheme
- [ ] Display description (small, muted)

**Task 2.3.4** - Implement trend indicator (optional)
- [ ] Check if trend prop provided
- [ ] Display trend value with arrow (up/down)
- [ ] Display trend label
- [ ] Color based on direction

**Task 2.3.5** - Implement loading state
- [ ] Import Skeleton component
- [ ] If loading is true, show Skeleton for value
- [ ] Keep title/description visible

**Task 2.3.6** - Implement click handler
- [ ] Add onClick to Card
- [ ] Add hover state if onClick provided
- [ ] Add cursor-pointer if clickable

**Task 2.3.7** - Test StatCard
- [ ] Test all props render correctly
- [ ] Test all color schemes apply properly
- [ ] Test loading state shows Skeleton
- [ ] Test trend indicator displays (if present)
- [ ] Test onClick fires correctly
- [ ] Test hover states

**Checkpoint:** Commit "feat: add StatCard component"

---

### Section 2.4: Refactor Home Page (30 min)

**Task 2.4.1** - Update Home page imports
- [ ] Open `src/app/page.tsx`
- [ ] Import StatCard from composite/stat-card
- [ ] Import Skeleton if needed

**Task 2.4.2** - Replace first stat card (Total Mentors)
- [ ] Replace Card structure (lines 52-65) with StatCard
- [ ] Pass title="Total Mentors"
- [ ] Pass value={stats?.totalMentors || 0}
- [ ] Pass description="Active in the program"
- [ ] Pass icon={Users}
- [ ] Pass loading={loading}
- [ ] Pass colorScheme="default"

**Task 2.4.3** - Replace second stat card (Need Fundraising)
- [ ] Replace Card structure (lines 67-80) with StatCard
- [ ] Pass title="Need Fundraising"
- [ ] Pass value={stats?.needFundraising || 0}
- [ ] Pass description="Require fundraising support"
- [ ] Pass icon={DollarSign}
- [ ] Pass loading={loading}
- [ ] Pass colorScheme="warning"

**Task 2.4.4** - Replace third stat card (Need Pages)
- [ ] Replace Card structure (lines 82-95) with StatCard
- [ ] Pass title="Need Pages"
- [ ] Pass value={stats?.needPages || 0}
- [ ] Pass description="Missing fundraising pages"
- [ ] Pass icon={FileText}
- [ ] Pass loading={loading}
- [ ] Pass colorScheme="warning"

**Task 2.4.5** - Replace fourth stat card (Need Training)
- [ ] Replace Card structure (lines 97-110) with StatCard
- [ ] Pass title="Need Training"
- [ ] Pass value={stats?.needTraining || 0}
- [ ] Pass description="Training signup needed"
- [ ] Pass icon={GraduationCap}
- [ ] Pass loading={loading}
- [ ] Pass colorScheme="info"

**Task 2.4.6** - Test Home page
- [ ] Verify page loads without errors
- [ ] Verify all stats display correctly
- [ ] Verify loading states work
- [ ] Verify colors match design
- [ ] Verify mobile layout works

**Checkpoint:** Commit "refactor: use StatCard component on Home page"

---

### Section 2.5: Refactor Sync Page (45 min)

**Task 2.5.1** - Update Sync page imports
- [ ] Open `src/app/sync/page.tsx`
- [ ] Import StatusBadge from composite/status-badge
- [ ] Import ConsoleOutput from composite/console-output

**Task 2.5.2** - Replace getSyncStatusBadge function
- [ ] Remove getSyncStatusBadge function (lines 198-209)
- [ ] Replace all calls with <StatusBadge status={log.status} />
- [ ] Update line 404 to use StatusBadge

**Task 2.5.3** - Replace getSeverityBadge function
- [ ] Remove getSeverityBadge function (lines 211-221)
- [ ] Replace all calls with <StatusBadge severity={error.severity} />
- [ ] Update line 459 to use StatusBadge

**Task 2.5.4** - Replace Periodic Sync console output
- [ ] Replace div (lines 331-336) with ConsoleOutput
- [ ] Pass lines={syncOutput}
- [ ] Pass loading={syncRunning}
- [ ] Pass showCopy={true}
- [ ] Pass showClear={true}
- [ ] Pass onClear={() => setSyncOutput([])}

**Task 2.5.5** - Replace CSV Upload console output
- [ ] Replace div (lines 375-380) with ConsoleOutput
- [ ] Pass lines={uploadOutput}
- [ ] Pass loading={csvUploading}
- [ ] Pass showCopy={true}
- [ ] Pass showClear={true}
- [ ] Pass onClear={() => setUploadOutput([])}

**Task 2.5.6** - Test Sync page
- [ ] Verify page loads without errors
- [ ] Verify status badges display correctly
- [ ] Verify console outputs work
- [ ] Verify copy button works
- [ ] Verify clear button works
- [ ] Verify sync functionality still works
- [ ] Verify CSV upload still works

**Checkpoint:** Commit "refactor: use StatusBadge and ConsoleOutput on Sync page"

---

## PHASE 3: ADVANCED COMPOSITE COMPONENTS

### Section 3.1: Checklist Component (45 min)

**Task 3.1.1** - Create Checklist component file
- [ ] Create `src/components/composite/checklist.tsx`
- [ ] Add TypeScript interface: `ChecklistItem`
- [ ] Add fields: id, label, description (optional), completed
- [ ] Add TypeScript interface: `ChecklistProps`
- [ ] Add props: items, title (optional), showProgress (optional)

**Task 3.1.2** - Implement base structure
- [ ] Create container div
- [ ] Add title if provided
- [ ] Add progress bar if showProgress is true
- [ ] Calculate completion percentage

**Task 3.1.3** - Implement checklist items
- [ ] Map over items array
- [ ] Render CheckCircle icon if completed
- [ ] Render Circle icon if not completed
- [ ] Apply green color to completed items
- [ ] Apply gray color to incomplete items
- [ ] Render label and description

**Task 3.1.4** - Implement progress bar
- [ ] Calculate completed count vs total
- [ ] Display "X/Y" counter
- [ ] Display progress bar
- [ ] Animate progress bar

**Task 3.1.5** - Test Checklist
- [ ] Test items render correctly
- [ ] Test icons display based on completion
- [ ] Test progress bar calculates correctly
- [ ] Test styling applies correctly

**Checkpoint:** Commit "feat: add Checklist component"

---

### Section 3.2: StatusCard Component (45 min)

**Task 3.2.1** - Create StatusCard component file
- [ ] Create `src/components/composite/status-card.tsx`
- [ ] Add TypeScript interface: `StatusMetric`
- [ ] Add fields: label, value, timestamp (optional), status (optional)
- [ ] Add TypeScript interface: `StatusCardProps`
- [ ] Add props: title, configured, configuredAt, metrics

**Task 3.2.2** - Implement base structure
- [ ] Create Card wrapper
- [ ] Add CardHeader with title and badge
- [ ] Add configured badge (Active/Inactive)
- [ ] Display configuredAt timestamp

**Task 3.2.3** - Implement metrics grid
- [ ] Create CardContent
- [ ] Add "Last Sync Times:" label
- [ ] Map over metrics array
- [ ] Display each metric in grid (label, value)
- [ ] Add status indicator per metric if provided

**Task 3.2.4** - Implement timestamp formatting
- [ ] Create helper function for relative time
- [ ] Format timestamps (2 hours ago, Yesterday, etc.)
- [ ] Use in metrics display

**Task 3.2.5** - Test StatusCard
- [ ] Test configured badge displays
- [ ] Test metrics render in grid
- [ ] Test status indicators show per metric
- [ ] Test timestamps format correctly

**Checkpoint:** Commit "feat: add StatusCard component"

---

### Section 3.3: FormSelector Component (60 min)

**Task 3.3.1** - Create FormSelector component file
- [ ] Create `src/components/composite/form-selector.tsx`
- [ ] Add TypeScript interface: `FormOption`
- [ ] Add fields: id, title, count, status (optional), category (optional)
- [ ] Add TypeScript interface: `FormSelectorProps`
- [ ] Add props: label, placeholder, options, value, onChange
- [ ] Add props: loading, groupBy, searchable, required, error, description

**Task 3.3.2** - Implement base structure
- [ ] Import Select components from ui/select
- [ ] Import Label from ui/label
- [ ] Create container div
- [ ] Add Label with required indicator (*)

**Task 3.3.3** - Implement Select component
- [ ] Wrap shadcn Select
- [ ] Add SelectTrigger
- [ ] Add SelectValue with placeholder
- [ ] Add SelectContent

**Task 3.3.4** - Implement options rendering
- [ ] If groupBy is provided, group options
- [ ] Use SelectGroup and SelectLabel for groups
- [ ] Map over options
- [ ] Render SelectItem for each option
- [ ] Display title and count badge

**Task 3.3.5** - Implement search (if searchable)
- [ ] Add search input in SelectContent
- [ ] Filter options based on search query
- [ ] Update displayed options

**Task 3.3.6** - Implement states
- [ ] Add loading state (spinner in trigger)
- [ ] Add error state (red border + error message)
- [ ] Add disabled state

**Task 3.3.7** - Test FormSelector
- [ ] Test options render correctly
- [ ] Test search filters options
- [ ] Test groups display properly
- [ ] Test badges show counts
- [ ] Test loading state works
- [ ] Test error state displays
- [ ] Test selection works

**Checkpoint:** Commit "feat: add FormSelector component"

---

### Section 3.4: FileUpload Component (45 min)

**Task 3.4.1** - Create FileUpload component file
- [ ] Create `src/components/composite/file-upload.tsx`
- [ ] Add TypeScript interface: `FileUploadProps`
- [ ] Add props: accept, maxSize, onChange, onError
- [ ] Add props: uploading, uploadedFile, uploadStatus, errorMessage

**Task 3.4.2** - Implement drag-and-drop area
- [ ] Create container div with dashed border
- [ ] Add onDragOver handler
- [ ] Add onDrop handler
- [ ] Add visual feedback on drag
- [ ] Style drop zone

**Task 3.4.3** - Implement click-to-upload
- [ ] Add hidden file input
- [ ] Add label for file input
- [ ] Style label as clickable area
- [ ] Display upload icon and text

**Task 3.4.4** - Implement file validation
- [ ] Validate file type (accept prop)
- [ ] Validate file size (maxSize prop)
- [ ] Call onError if validation fails
- [ ] Call onChange if validation passes

**Task 3.4.5** - Implement upload states
- [ ] Show uploading state (progress or spinner)
- [ ] Show success state (checkmark + file info)
- [ ] Show error state (error message)
- [ ] Allow remove file button

**Task 3.4.6** - Test FileUpload
- [ ] Test drag-and-drop works
- [ ] Test click upload works
- [ ] Test file validation fires
- [ ] Test upload states display
- [ ] Test remove file works

**Checkpoint:** Commit "feat: add FileUpload component"

---

## PHASE 4: FEATURE COMPONENTS & PAGE REFACTORING

### Section 4.1: SyncActionCard Component (60 min)

**Task 4.1.1** - Create SyncActionCard component file
- [ ] Create `src/components/features/sync/` directory
- [ ] Create `src/components/features/sync/sync-action-card.tsx`
- [ ] Add TypeScript interface: `SyncActionCardProps`
- [ ] Add props: title, description, icon, actionLabel, onAction
- [ ] Add props: output, running, disabled, tier

**Task 4.1.2** - Implement base structure
- [ ] Import Card from ui/card
- [ ] Import Button from ui/button
- [ ] Import ConsoleOutput from composite/console-output
- [ ] Create Card wrapper

**Task 4.1.3** - Implement card header
- [ ] Add CardHeader
- [ ] Display icon and title
- [ ] Add tier badge if provided
- [ ] Add description

**Task 4.1.4** - Implement action button
- [ ] Add CardContent
- [ ] Add Button with actionLabel
- [ ] Show loading state if running
- [ ] Disable if disabled prop or running
- [ ] Call onAction when clicked

**Task 4.1.5** - Implement console output area
- [ ] Add ConsoleOutput below button
- [ ] Only show if output.length > 0
- [ ] Pass output lines
- [ ] Pass loading state
- [ ] Add copy/clear buttons

**Task 4.1.6** - Test SyncActionCard
- [ ] Test card renders correctly
- [ ] Test button fires action
- [ ] Test loading state works
- [ ] Test console output shows/hides
- [ ] Test tier badge displays

**Checkpoint:** Commit "feat: add SyncActionCard component"

---

### Section 4.2: Refactor Sync Page with SyncActionCard (30 min)

**Task 4.2.1** - Update Sync page imports
- [ ] Import SyncActionCard from features/sync/sync-action-card

**Task 4.2.2** - Replace Periodic Sync card
- [ ] Replace Card structure (lines 300-338) with SyncActionCard
- [ ] Pass title="Periodic Sync"
- [ ] Pass description="Sync from APIs: Jotform + Givebutter + ETL"
- [ ] Pass icon={RefreshCw}
- [ ] Pass actionLabel="Run Periodic Sync"
- [ ] Pass onAction={handlePeriodicSync}
- [ ] Pass output={syncOutput}
- [ ] Pass running={syncRunning}
- [ ] Pass tier="Tier 2"

**Task 4.2.3** - Replace CSV Upload card
- [ ] Replace Card structure (lines 340-383) with SyncActionCard
- [ ] Pass title="CSV Upload"
- [ ] Pass description="Upload Givebutter export → match contacts"
- [ ] Pass icon={Upload}
- [ ] Pass actionLabel="Upload CSV"
- [ ] Pass onAction={handleFileUpload}
- [ ] Pass output={uploadOutput}
- [ ] Pass running={csvUploading}
- [ ] Pass tier="Tier 3"
- [ ] Embed FileUpload component in custom slot

**Task 4.2.4** - Test Sync page
- [ ] Verify page loads without errors
- [ ] Verify sync action cards work
- [ ] Verify periodic sync works
- [ ] Verify CSV upload works
- [ ] Verify console outputs work

**Checkpoint:** Commit "refactor: use SyncActionCard on Sync page"

---

### Section 4.3: ConfigWizard Component (120 min)

**Task 4.3.1** - Create ConfigWizard component file
- [ ] Create `src/components/features/config/` directory
- [ ] Create `src/components/features/config/config-wizard.tsx`
- [ ] Add TypeScript interface: `WizardStep`
- [ ] Add fields: id, title, description, component, validate (optional)
- [ ] Add TypeScript interface: `ConfigWizardProps`
- [ ] Add props: steps, currentStep, onStepChange, onComplete

**Task 4.3.2** - Implement base structure
- [ ] Create Card wrapper
- [ ] Add CardHeader with title
- [ ] Add step indicator section
- [ ] Add content section
- [ ] Add navigation section (Back/Next)

**Task 4.3.3** - Implement step indicator
- [ ] Display all steps horizontally
- [ ] Show step number and title
- [ ] Style completed steps (green checkmark)
- [ ] Style current step (highlight)
- [ ] Style pending steps (gray)
- [ ] Add progress bar below

**Task 4.3.4** - Implement step content
- [ ] Render current step's component
- [ ] Pass props to step component
- [ ] Handle step component state

**Task 4.3.5** - Implement navigation
- [ ] Add Back button (disabled on first step)
- [ ] Add Next button (or Complete on last step)
- [ ] Validate current step before advancing
- [ ] Call onStepChange when navigating
- [ ] Call onComplete on last step

**Task 4.3.6** - Implement keyboard navigation
- [ ] Listen for ArrowLeft (go back)
- [ ] Listen for ArrowRight (go next)
- [ ] Listen for Enter (submit current step)

**Task 4.3.7** - Implement state persistence
- [ ] Save wizard state to localStorage
- [ ] Restore state on mount
- [ ] Clear state on complete

**Task 4.3.8** - Test ConfigWizard
- [ ] Test steps render correctly
- [ ] Test navigation works (Back/Next)
- [ ] Test validation blocks progression
- [ ] Test progress bar updates
- [ ] Test keyboard nav works
- [ ] Test state persists

**Checkpoint:** Commit "feat: add ConfigWizard component"

---

### Section 4.4: Refactor Settings Page with ConfigWizard (120 min)

**Task 4.4.1** - Create step components directory
- [ ] Create `src/components/features/config/steps/` directory
- [ ] Plan 4 step components: ConfigStep, FormsStep, UploadStep, SyncStep

**Task 4.4.2** - Create ConfigStep component
- [ ] Create `config-step.tsx`
- [ ] Extract API key configuration logic (lines 528-639)
- [ ] Use FormSelector for dropdowns
- [ ] Use StatusCard for config status
- [ ] Add Test API Connections button
- [ ] Return validation function (checks if APIs configured)

**Task 4.4.3** - Create FormsStep component
- [ ] Create `forms-step.tsx`
- [ ] Extract form selection logic (lines 642-757)
- [ ] Use FormSelector for Jotform forms
- [ ] Use FormSelector for Givebutter campaign
- [ ] Add "Discover Forms" button
- [ ] Return validation function (checks if forms selected)

**Task 4.4.4** - Create UploadStep component
- [ ] Create `upload-step.tsx`
- [ ] Extract CSV upload logic (lines 759-836)
- [ ] Use FileUpload component
- [ ] Show upload status
- [ ] Return validation function (checks if file uploaded)

**Task 4.4.5** - Create SyncStep component
- [ ] Create `sync-step.tsx`
- [ ] Extract sync logic (lines 838-941)
- [ ] Use Checklist for pre-sync checklist
- [ ] Add Save Config button
- [ ] Add Run Sync button
- [ ] Show sync progress
- [ ] Return validation function (checks if sync completed)

**Task 4.4.6** - Update Settings page with ConfigWizard
- [ ] Open `src/app/settings/page.tsx`
- [ ] Import ConfigWizard
- [ ] Import step components
- [ ] Replace tabs (lines 490-942) with ConfigWizard
- [ ] Define steps array
- [ ] Add currentStep state
- [ ] Add onStepChange handler
- [ ] Add onComplete handler

**Task 4.4.7** - Reduce state complexity
- [ ] Consolidate related state variables
- [ ] Move step-specific state into step components
- [ ] Target: reduce from 27 to ~8 state variables

**Task 4.4.8** - Test Settings page
- [ ] Verify wizard renders correctly
- [ ] Verify all steps work
- [ ] Verify navigation works
- [ ] Verify validation works
- [ ] Verify state persists
- [ ] Verify sync works end-to-end

**Checkpoint:** Commit "refactor: use ConfigWizard on Settings page"

---

### Section 4.5: SyncLogList Component (45 min)

**Task 4.5.1** - Create SyncLogList component file
- [ ] Create `src/components/features/sync/sync-log-list.tsx`
- [ ] Add TypeScript interface: `SyncLog` (import from types)
- [ ] Add TypeScript interface: `SyncLogListProps`
- [ ] Add props: logs, loading, emptyMessage, maxVisible

**Task 4.5.2** - Implement base structure
- [ ] Create Card wrapper
- [ ] Add CardHeader with title
- [ ] Add filters section (All, Completed, Failed)
- [ ] Add logs list section

**Task 4.5.3** - Implement filters
- [ ] Add filter state (all, completed, failed)
- [ ] Filter logs based on selected filter
- [ ] Style active filter

**Task 4.5.4** - Implement log items
- [ ] Map over logs
- [ ] Display sync type
- [ ] Display StatusBadge
- [ ] Display timestamps
- [ ] Display duration and record counts
- [ ] Make error details expandable

**Task 4.5.5** - Implement states
- [ ] Add loading skeleton
- [ ] Add empty state
- [ ] Add pagination (optional, if > maxVisible)

**Task 4.5.6** - Test SyncLogList
- [ ] Test logs render correctly
- [ ] Test filters work
- [ ] Test error details expand
- [ ] Test loading state shows
- [ ] Test empty state shows

**Checkpoint:** Commit "feat: add SyncLogList component"

---

### Section 4.6: Refactor Sync Page with SyncLogList (15 min)

**Task 4.6.1** - Update Sync page imports
- [ ] Import SyncLogList from features/sync/sync-log-list

**Task 4.6.2** - Replace sync logs section
- [ ] Replace Card structure (lines 386-438) with SyncLogList
- [ ] Pass logs={syncLogs}
- [ ] Pass loading={loadingSyncLogs}
- [ ] Pass maxVisible={10}

**Task 4.6.3** - Replace errors section (optional)
- [ ] Create ErrorList component (similar to SyncLogList)
- [ ] Replace errors section (lines 440-476)

**Task 4.6.4** - Test Sync page
- [ ] Verify logs display correctly
- [ ] Verify filters work
- [ ] Verify errors display correctly
- [ ] Verify no regressions

**Checkpoint:** Commit "refactor: use SyncLogList on Sync page"

---

## PHASE 5: POLISH & OPTIMIZATION

### Section 5.1: Accessibility Audit (30 min)

**Task 5.1.1** - Run Lighthouse audit
- [ ] Open Chrome DevTools
- [ ] Run Lighthouse audit on Home page
- [ ] Run Lighthouse audit on Sync page
- [ ] Run Lighthouse audit on Settings page
- [ ] Record accessibility scores

**Task 5.1.2** - Fix contrast issues
- [ ] Review flagged color contrast issues
- [ ] Update colors to meet WCAG AA standards
- [ ] Re-test with Lighthouse

**Task 5.1.3** - Add missing ARIA labels
- [ ] Review all buttons without text
- [ ] Add aria-label attributes
- [ ] Review form inputs
- [ ] Add aria-describedby for hints/errors

**Task 5.1.4** - Test keyboard navigation
- [ ] Tab through entire application
- [ ] Verify focus indicators visible
- [ ] Verify all interactive elements reachable
- [ ] Verify tab order logical

**Task 5.1.5** - Test with screen reader
- [ ] Use NVDA (Windows) or VoiceOver (Mac)
- [ ] Navigate through Home page
- [ ] Navigate through Settings wizard
- [ ] Complete sync operation
- [ ] Verify announcements clear and helpful

**Checkpoint:** Commit "a11y: improve accessibility (Lighthouse score 95+)"

---

### Section 5.2: Mobile Optimization (30 min)

**Task 5.2.1** - Test on mobile viewport
- [ ] Open Chrome DevTools (mobile view)
- [ ] Test iPhone SE (smallest screen)
- [ ] Test iPhone 12 Pro (mid-size)
- [ ] Test iPad (tablet)

**Task 5.2.2** - Fix layout issues
- [ ] Fix grid breakpoints if needed
- [ ] Fix text sizes (min 16px for inputs)
- [ ] Fix touch targets (min 44x44px)
- [ ] Fix overflow issues

**Task 5.2.3** - Optimize mobile interactions
- [ ] Test form inputs (no zoom)
- [ ] Test scroll behavior
- [ ] Test bottom nav positioning
- [ ] Test modals/dialogs

**Checkpoint:** Commit "mobile: optimize for mobile devices"

---

### Section 5.3: Animation Improvements (15 min)

**Task 5.3.1** - Add transition utilities
- [ ] Open `globals.css`
- [ ] Add smooth transition classes
- [ ] Add animation classes

**Task 5.3.2** - Apply animations
- [ ] Add transitions to buttons (hover, active)
- [ ] Add transitions to cards (hover)
- [ ] Add fade-in to page loads
- [ ] Add slide-in to modals/dialogs

**Task 5.3.3** - Respect reduced motion
- [ ] Add prefers-reduced-motion media query
- [ ] Disable animations if preference set

**Checkpoint:** Commit "feat: add smooth animations and transitions"

---

### Section 5.4: Performance Optimization (30 min)

**Task 5.4.1** - Run Lighthouse performance audit
- [ ] Open Chrome DevTools
- [ ] Run Lighthouse performance audit
- [ ] Record performance score
- [ ] Review suggestions

**Task 5.4.2** - Optimize bundle size
- [ ] Run webpack bundle analyzer (if available)
- [ ] Check for duplicate dependencies
- [ ] Check for unused code
- [ ] Lazy load components if needed

**Task 5.4.3** - Optimize re-renders
- [ ] Review component re-render behavior
- [ ] Add React.memo to expensive components
- [ ] Use useMemo for expensive calculations
- [ ] Use useCallback for event handlers

**Task 5.4.4** - Test performance
- [ ] Re-run Lighthouse audit
- [ ] Verify performance score 90+
- [ ] Test on slow 3G network
- [ ] Test with CPU throttling

**Checkpoint:** Commit "perf: optimize performance (Lighthouse score 90+)"

---

### Section 5.5: Documentation (30 min)

**Task 5.5.1** - Update README
- [ ] Document new component library
- [ ] Add component usage examples
- [ ] Add design system docs link
- [ ] Add contribution guidelines

**Task 5.5.2** - Create component docs
- [ ] Create `COMPONENTS.md` in root
- [ ] Document all composite components
- [ ] Add usage examples for each
- [ ] Add props tables

**Task 5.5.3** - Update ai/UI-Redesign
- [ ] Mark all tasks as completed
- [ ] Add lessons learned
- [ ] Document any deviations from plan

**Checkpoint:** Commit "docs: update documentation"

---

## FINAL VERIFICATION

**Task FINAL.1** - Run full regression test
- [ ] Test Home page (stats load, links work)
- [ ] Test Sync page (sync works, upload works)
- [ ] Test Settings page (wizard works end-to-end)
- [ ] Test mobile views (all pages)
- [ ] Test keyboard navigation (all pages)

**Task FINAL.2** - Run all audits
- [ ] Lighthouse audit (all pages)
- [ ] Accessibility score 95+ on all pages
- [ ] Performance score 90+ on all pages
- [ ] Best Practices score 90+ on all pages

**Task FINAL.3** - Review metrics
- [ ] Count total components (target: 18)
- [ ] Count lines per page (target: 150-300)
- [ ] Count state variables in Settings (target: <10)
- [ ] Measure bundle size (target: <+10% from baseline)

**Task FINAL.4** - Create final summary
- [ ] Document what was accomplished
- [ ] Document metrics achieved
- [ ] Document known issues (if any)
- [ ] Document next steps (if any)

**Final Checkpoint:** Commit "chore: UI redesign complete"

---

## Summary

**Total Tasks:** 45 main tasks + 150+ subtasks
**Estimated Time:** 6-8 hours
**Expected Outcomes:**
- 10 new reusable components
- 3 refactored pages
- 80% reduction in code duplication
- 95+ accessibility score
- 90+ performance score
- Effortlessly simple, intuitive interface

**Ready to begin!** 🚀
