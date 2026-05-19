# Host Admin Console · Tenant Management — Tailwind Rebuild Prompt

Use this document to rebuild the **Host Admin Console (Dev/Super-Admin view)** in a new React + Tailwind CSS project ("Patient IQ App"). Everything below is sourced directly from the existing codebase.

---

## 1. What This Page Is

The Host Admin Console is a **super-admin / "dev-role" view** accessible only to the platform owner (not tenant admins). It sits inside a multi-tenant SaaS app for optical clinics. Its responsibilities:

1. **Tenant list** — see all registered clinics with their status, session count, and user count
2. **Create tenant** — onboard a new clinic with account code, name, address, admin email, CSR email, admin PIN, CSR PIN
3. **Emulation** — impersonate any tenant as admin (for support/debugging)
4. **Suspend / Activate tenants** — toggle tenant status
5. **Emulation log** — audit table of who emulated which tenant and when
6. **Change admin password** — update the dev/host account password

---

## 2. Visual Design System

### Color Palette (translate to Tailwind custom colors or use equivalents)

```
Background (page):   #0f172a  → slate-900
Card background:     #1e293b  → slate-800
Border:              #334155  → slate-700
Text primary:        #F8FAFC  → slate-50
Text secondary:      #94A3B8  → slate-400
Text muted:          #64748B  → slate-500
Input background:    #0f172a  → slate-900
Input border:        #334155  → slate-700
Input focus border:  #4477FF  → blue-500 (custom)
Tenant row bg:       #0f172a  → slate-900
Tenant row hover:    border → #4477FF

Header gradient:     linear-gradient(135deg, #1e293b, #0f172a)
ADMIN badge:         bg #1d4ed8 (blue-700) text white

Status — active:     bg #065F46 text #D1FAE5  → emerald-900/emerald-100
Status — suspended:  bg #92400E text #FEF3C7  → amber-800/amber-100
Status — disabled:   bg #991B1B text #FEE2E2  → red-900/red-100

Button — emulate:    bg #1d4ed8 border #3b82f6 text white → blue-700
Button — emulate hover: bg #2563eb → blue-600
Button — danger:     bg #7f1d1d border #991b1b text #fca5a5 → red-900
Button — danger hover: bg #991b1b text white → red-800
Button — default:    bg #334155 border #475569 text #CBD5E1 → slate-700
Button — submit:     bg #1d4ed8 text white → blue-700
Button — submit hover: bg #2563eb → blue-600
```

### Typography
- Font: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif`  
  → In Tailwind: `font-sans` (set in base config)
- Page heading: `text-[19px] font-extrabold text-slate-50`
- Page subheading: `text-[12px] text-slate-500 mt-0.5`
- Card section heading: `text-[13px] font-bold text-slate-400 uppercase tracking-[0.07em] mb-3`
- Tenant name: `text-[14px] font-semibold text-slate-100`
- Tenant meta: `text-[11px] text-slate-500 mt-0.5`

### Spacing / Radius
- Page padding: `px-4 pb-20 pt-4` (16px sides, 80px bottom for mode strip)
- Card border-radius: `rounded-[20px]` (var --radius-lg = 20px)
- Card padding: `p-4` (16px 18px)
- Card gap: `mb-2.5` between cards
- Input border-radius: `rounded-lg` (8px)
- Button border-radius: `rounded-lg` (8px)

---

## 3. Page Layout (HTML Structure)

```
<div id="dev-view">                          ← min-h-screen bg-slate-900 px-4 pb-20 pt-4
  <div class="dev-header">                   ← header card
    <div>
      <h1>🛠 Admin Console</h1>
      <p>Patient Smart App — Tenant Management</p>
    </div>
    <span class="admin-badge">ADMIN</span>   ← blue pill badge
  </div>

  <div class="dev-card">                     ← Tenants list card
    <h3>Tenants</h3>
    <div id="devTenantList">                 ← dynamically rendered tenant rows
      <!-- see Tenant Row below -->
    </div>
  </div>

  <div class="dev-card">                     ← Create New Tenant card
    <h3>Create New Tenant</h3>
    <!-- 7 inputs + submit button — see inputs below -->
  </div>

  <div class="dev-card">                     ← Emulation Log card
    <h3>Emulation Log</h3>
    <div id="devEmulationLog">               ← dynamically rendered table
    </div>
  </div>

  <div class="dev-card">                     ← Change Password card
    <h3>Change Admin Password</h3>
    <!-- error div, 3 password inputs, submit button -->
  </div>
</div>
```

---

## 4. Component Specs

### 4.1 Header Card
```html
<div class="
  flex items-center justify-between
  bg-gradient-to-br from-slate-800 to-slate-900
  border border-slate-700
  rounded-[20px] p-5 mb-4
">
  <div>
    <h1 class="text-[19px] font-extrabold text-slate-50">🛠 Admin Console</h1>
    <p class="text-[12px] text-slate-500 mt-0.5">Patient Smart App — Tenant Management</p>
  </div>
  <span class="
    bg-blue-700 text-white
    rounded-full px-3 py-1
    text-[10px] font-bold tracking-[0.08em]
  ">ADMIN</span>
</div>
```

### 4.2 Dev Card (wrapper for each section)
```html
<div class="
  bg-slate-800 border border-slate-700
  rounded-[20px] px-[18px] py-4 mb-2.5
">
  <h3 class="text-[13px] font-bold text-slate-400 uppercase tracking-[0.07em] mb-3">
    Section Title
  </h3>
  <!-- content -->
</div>
```

### 4.3 Tenant Row
```html
<div class="
  flex items-center justify-between
  bg-slate-900 border border-slate-700
  rounded-[10px] px-[13px] py-[11px] mb-[7px]
  cursor-pointer transition-colors
  hover:border-blue-500
">
  <div>
    <div class="text-[14px] font-semibold text-slate-100">Clinic Name</div>
    <div class="text-[11px] text-slate-500 mt-0.5">
      account-code · 42 records · 2 users
    </div>
  </div>
  <div class="flex items-center gap-1.5">
    <!-- Status badge -->
    <span class="status-badge">active</span>
    <!-- Emulate button -->
    <button class="dev-btn emulate">Emulate</button>
    <!-- Suspend or Activate button -->
    <button class="dev-btn danger">Suspend</button>
  </div>
</div>
```

### 4.4 Status Badge Classes
| Status | Tailwind |
|--------|----------|
| `active` | `bg-emerald-900 text-emerald-100 rounded-full px-2 py-0.5 text-[10px] font-bold` |
| `suspended` | `bg-amber-800 text-amber-100 rounded-full px-2 py-0.5 text-[10px] font-bold` |
| `disabled` | `bg-red-900 text-red-100 rounded-full px-2 py-0.5 text-[10px] font-bold` |

### 4.5 Action Buttons
```html
<!-- Default button -->
<button class="
  bg-slate-700 border border-slate-600 text-slate-300
  rounded-lg px-2.5 py-[5px] text-[11px] font-semibold
  cursor-pointer whitespace-nowrap
  hover:bg-slate-600 hover:text-white transition-all
">Activate</button>

<!-- Emulate button (blue) -->
<button class="
  bg-blue-700 border border-blue-500 text-white
  rounded-lg px-2.5 py-[5px] text-[11px] font-semibold
  cursor-pointer whitespace-nowrap
  hover:bg-blue-600 transition-all
">Emulate</button>

<!-- Danger button (red) -->
<button class="
  bg-red-900 border border-red-800 text-red-300
  rounded-lg px-2.5 py-[5px] text-[11px] font-semibold
  cursor-pointer whitespace-nowrap
  hover:bg-red-800 hover:text-white transition-all
">Suspend</button>

<!-- Submit button (full width) -->
<button class="
  w-full bg-blue-700 text-white border-none
  rounded-lg px-[18px] py-2.5 text-[13px] font-bold
  cursor-pointer hover:bg-blue-600 transition-colors
">+ Create Tenant</button>
```

### 4.6 Text Inputs
```html
<input
  type="text"
  placeholder="Account code (e.g. trinidad-branch-3)"
  class="
    w-full bg-slate-900 border border-slate-700 text-slate-100
    rounded-lg px-[11px] py-[9px] text-[13px] font-sans
    outline-none mb-2
    placeholder:text-slate-600
    focus:border-blue-500 transition-colors
  "
/>
```

### 4.7 Create Tenant Form — All Fields
```
1. Account code          type="text"     placeholder="Account code (e.g. trinidad-branch-3)"
2. Clinic name           type="text"     placeholder="Clinic name (e.g. Demo Clinic — North)"
3. Store address         type="text"     placeholder="Store address (optional)"
4. Admin email           type="email"    placeholder="Admin email"
5. CSR email             type="email"    placeholder="CSR email"
6. Admin PIN             type="text"     placeholder="Admin PIN (4 digits)"   maxLength={4}
7. CSR PIN               type="text"     placeholder="CSR PIN (4 digits)"     maxLength={4}
```
Inputs 6 and 7 are in a 2-column grid side by side:
```html
<div class="grid grid-cols-2 gap-2">
  <!-- admin pin input -->
  <!-- csr pin input -->
</div>
<div class="mt-2">
  <button>+ Create Tenant</button>
</div>
```

### 4.8 Emulation Log Table
```html
<table class="w-full text-[11px] border-collapse">
  <thead>
    <tr class="text-slate-500 border-b border-slate-700">
      <th class="text-left py-1">Dev</th>
      <th class="text-left py-1">Tenant</th>
      <th class="text-left py-1">Started</th>
      <th class="text-left py-1">Ended</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-slate-800 text-slate-400">
      <td class="py-[5px]">dev_username</td>
      <td>Tenant Name</td>
      <td>5/19/2026, 2:34 PM</td>
      <td>3:12 PM</td>  <!-- or — if still active -->
    </tr>
  </tbody>
</table>
```

### 4.9 Change Password Form
```html
<div id="changePwError" class="hidden text-red-400 text-[0.85rem] mb-2.5"></div>
<input type="password" placeholder="Current password"     class="[same as dev-input]" />
<input type="password" placeholder="New password (min 8 characters)" class="[same]" />
<input type="password" placeholder="Confirm new password" class="[same]" />
<button class="[same as dev-submit]">Update Password</button>
```

### 4.10 Empty / Loading States
```html
<!-- Loading -->
<div class="text-slate-500 text-center py-5">Loading...</div>

<!-- Error -->
<div class="text-red-400 text-center py-3">Failed to load tenants</div>

<!-- No tenants -->
<div class="text-slate-500 text-center py-5">No tenants yet. Create one below.</div>

<!-- No emulation logs -->
<div class="text-slate-500 text-center py-3">No emulation sessions yet.</div>
```

---

## 5. API Contracts

All requests use `Authorization: Bearer <token>` header. Token stored in `localStorage` as `ps_token`.

### GET `/api/dev/tenants`
Returns array of tenants:
```ts
{
  id: number
  account_code: string
  name: string
  address: string
  status: 'active' | 'suspended' | 'disabled'
  session_count: number   // active (non-deleted) sessions
  user_count: number      // active users
  created_at: number      // unix timestamp
}[]
```

### POST `/api/dev/tenants`
Create tenant. Body:
```ts
{
  accountCode: string   // required, unique slug
  name: string          // required
  address?: string
  adminEmail: string    // required, must contain @
  csrEmail: string      // required, must contain @
  adminPin: string      // required, exactly 4 digits
  csrPin: string        // required, exactly 4 digits
  welcomeMsg?: string
  primaryColor?: string // hex, default '#003087'
  accentColor?: string  // hex, default '#CC0000'
}
```
Returns `201 { id: number, accountCode: string }`.  
Error `409` if accountCode already exists.

### PATCH `/api/dev/tenants/:id/status`
Body: `{ status: 'active' | 'suspended' | 'disabled' }`  
Returns `{ ok: true }`

### POST `/api/dev/tenants/:id/emulate`
Returns `{ token: string, tenant: { id, name, primaryColor, accentColor, welcomeMsg } }`  
Save dev token to `localStorage('ps_dev_token')`, set new token, reload.

### GET `/api/dev/emulation-log`
Returns last 100 entries:
```ts
{
  dev_username: string
  tenant_name: string
  started_at: number    // unix seconds
  ended_at: number | null
}[]
```

### PATCH `/api/auth/admin-change-password`
Body: `{ currentPassword: string, newPassword: string }`  
Returns `{ ok: true }` or `400` error.

---

## 6. Business Logic / Validation

### Create Tenant validation (front-end)
```
- All fields except address are required → toast "Fill in all required fields"
- adminEmail and csrEmail must contain "@" → toast "Enter valid emails"
- adminPin and csrPin must match /^\d{4}$/ → toast "PINs must be exactly 4 digits"
```

### Change Password validation (front-end)
```
- All 3 fields required → show inline error "All fields required."
- newPassword === confirmPassword → "New passwords do not match."
- newPassword.length >= 8 → "New password must be at least 8 characters."
```

### Emulate flow
```
1. confirm("Emulate '{tenantName}'? You'll have full admin access to this tenant.")
2. POST /api/dev/tenants/:id/emulate
3. localStorage.setItem('ps_dev_token', currentToken)
4. setToken(data.token)
5. window.location.reload()
```
To exit emulation (shown via a yellow top banner):
```
1. POST /api/auth/emulate-end  
2. devToken = localStorage.getItem('ps_dev_token')
3. localStorage.removeItem('ps_dev_token')
4. setToken(devToken)
5. window.location.reload()
```

### Status toggle
- If tenant.status === 'active' → show "Suspend" button (danger), clicking sends status: 'suspended'
- If tenant.status !== 'active' → show "Activate" button (default), clicking sends status: 'active'

---

## 7. Emulation Banner (shown when emulating a tenant)

This is a **fixed top bar** (z-index 2000) shown app-wide when the JWT contains `isEmulation: true`:

```html
<div class="
  fixed top-0 left-0 right-0 z-[2000]
  bg-amber-400 text-stone-900
  flex items-center justify-between
  px-4 py-2 text-[13px] font-bold
">
  🟡 Emulating: <strong>Tenant Name</strong>
  <button class="
    bg-black/15 border-none rounded-md
    px-3 py-[5px] text-[12px] font-bold cursor-pointer text-stone-900
  ">Exit Emulation</button>
</div>
```

---

## 8. Mode Strip (global navigation bar — fixed bottom)

This is a **fixed bottom bar** that switches between views (Patient / CSR / Admin / Dev). Shown for all authenticated users, tabs depend on role.

```html
<div class="
  fixed bottom-0 left-0 right-0 z-[999]
  bg-black/75 backdrop-blur-md
  flex justify-center gap-1 px-4 pt-2 pb-2.5
">
  <button class="mode-btn active">👁 Patient</button>
  <button class="mode-btn">🩺 CSR</button>
  <button class="mode-btn">📊 Admin</button>
  <button class="mode-btn">🛠 Dev</button>
</div>

<!-- mode-btn base: -->
bg-white/10 border border-white/15 text-white/60
rounded-full px-3.5 py-1.5 text-[11px] font-semibold
cursor-pointer tracking-[0.03em] transition-all

<!-- mode-btn active/hover: -->
bg-white/20 text-white border-white/35
```

---

## 9. React Component Architecture (recommended)

```
<HostAdminConsolePage>
  ├── <DevHeader />                    ← gradient header card
  ├── <TenantsCard>
  │     ├── loading / error / empty state
  │     └── <TenantRow key={t.id} /> × N
  │           ├── <StatusBadge status={t.status} />
  │           ├── <EmulateButton onClick={handleEmulate} />
  │           └── <StatusToggleButton status={t.status} onClick={handleStatusChange} />
  ├── <CreateTenantCard>
  │     └── <CreateTenantForm onSuccess={refetchTenants} />
  ├── <EmulationLogCard>
  │     └── <EmulationLogTable rows={logRows} />
  └── <ChangePasswordCard />
```

### State
```ts
const [tenants, setTenants] = useState<Tenant[]>([])
const [logRows, setLogRows] = useState<EmulationLog[]>([])
const [loading, setLoading] = useState(true)
const [createForm, setCreateForm] = useState({
  code: '', name: '', address: '',
  adminEmail: '', csrEmail: '',
  adminPin: '', csrPin: ''
})
const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
const [pwError, setPwError] = useState('')
```

---

## 10. Full Tailwind Config Additions

If using a custom Tailwind config, add these to `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      'ps-navy': '#003087',
      'ps-red': '#CC0000',
      'dev-bg': '#0f172a',
      'dev-card': '#1e293b',
      'dev-border': '#334155',
      'dev-input-focus': '#4477FF',
    },
    borderRadius: {
      'card': '20px',
      'card-xl': '28px',
    },
    backgroundImage: {
      'dev-header': 'linear-gradient(135deg, #1e293b, #0f172a)',
    }
  }
}
```

---

## 11. Key Differences From Existing Implementation

| Existing (Vanilla JS) | Rebuild target (React + Tailwind) |
|---|---|
| `renderDevHTML()` returns HTML string | JSX components |
| `document.getElementById` mutations | React state + props |
| Global `api` module | Custom hook `useApi()` or React Query |
| `confirm()` for destructive actions | Modal / AlertDialog component |
| Inline styles everywhere | Tailwind utility classes |
| No loading states shown | Skeleton loaders or spinner |
| `showToast()` vanilla function | Sonner / react-hot-toast |

---

## 12. Accessibility / UX Notes

- All buttons should have `type="button"` to prevent accidental form submission
- Emulate and Suspend/Activate are destructive — use a confirmation dialog (not `window.confirm`)
- PINs: use `inputMode="numeric"` and `pattern="\d{4}"` for mobile keyboards
- Emulation log timestamps should use `toLocaleString()` / `toLocaleTimeString()` for local time
- The page has `padding-bottom: 80px` to avoid content being hidden behind the fixed mode strip
- The entire page scrolls; no inner scrollable containers except the tenant list on desktop
