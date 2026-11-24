// Settings: profile & password, company details, appearance, notifications, and the data/backend connection.
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Building2, Check, Database, Download, Lock, LogOut, Monitor, Moon, Palette, RotateCcw, Sun, UserRound } from 'lucide-react'
import { API_BASE_URL, USE_MOCK } from '@/api'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, CopyButton, Input, PageHeader, ProgressBar, Select, Skeleton, Switch, Tabs, Textarea } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/ConfirmContext'
import { usePreferences } from '@/context/PreferencesContext'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { useQueryState } from '@/hooks/useQueryState'
import { cn } from '@/lib/cn'
import { CURRENCIES } from '@/lib/constants'
import { downloadJson } from '@/lib/csv'
import { formatCurrency } from '@/lib/format'
import { spring } from '@/lib/motion'
import { useChangePassword, useDemoInfo, useExportData, useResetDemoData, useSettings, useUpdateProfile, useUpdateSettings } from '@/queries'

const TABS = [
  { value: 'profile', label: 'Profile', icon: <UserRound /> },
  { value: 'organization', label: 'Organization', icon: <Building2 /> },
  { value: 'appearance', label: 'Appearance', icon: <Palette /> },
  { value: 'notifications', label: 'Notifications', icon: <Bell /> },
  { value: 'data', label: 'Data & API', icon: <Database /> },
]

export default function SettingsPage() {
  const [{ tab }, setQuery] = useQueryState({ tab: 'profile' })
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account, your company and how the app behaves." />
      <Tabs value={tab} onChange={(value) => setQuery({ tab: value })} items={TABS} />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
          {tab === 'profile' && <ProfileTab />}
          {tab === 'organization' && <OrganizationTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'data' && <DataTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------- Profile ------------------------------------------------------ */

function ProfileTab() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const updateProfile = useUpdateProfile()
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({ defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '', jobTitle: user?.jobTitle ?? '' } })

  async function onSubmit(values) {
    try {
      setUser(await updateProfile.mutateAsync(values))
      toast.success('Profile saved')
    } catch (error) {
      toast.error('Could not save', { description: error.message })
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card padding="none">
        <CardHeader title="Your profile" icon={<UserRound />} />
        <CardBody>
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user?.name} size="xl" />
            <div><p className="text-lg font-semibold">{user?.name}</p><Badge tone="brand" size="sm">{user?.role}</Badge></div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Full name" error={errors.name?.message} {...register('name', { required: 'Enter your name' })} />
            <Input label="Email" value={user?.email ?? ''} readOnly disabled hint="Your sign-in email can't be changed here." rightElement={<Lock className="mr-3 size-4 text-fg-subtle" />} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" {...register('phone')} />
              <Input label="Job title" {...register('jobTitle')} />
            </div>
            <div className="flex justify-end"><Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>Save profile</Button></div>
          </form>
        </CardBody>
      </Card>
      <PasswordCard />
    </div>
  )
}

const RULES = [
  { test: (value) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value) => /[A-Z]/.test(value), label: 'An uppercase letter' },
  { test: (value) => /\d/.test(value), label: 'A number' },
  { test: (value) => /[^A-Za-z0-9]/.test(value), label: 'A symbol' },
]

function PasswordCard() {
  const toast = useToast()
  const changePassword = useChangePassword()
  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirm: '' } })
  const next = useWatch({ control, name: 'newPassword' }) ?? ''
  const score = RULES.filter((rule) => rule.test(next)).length
  const strength = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score]

  async function onSubmit(values) {
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      toast.success('Password changed')
      reset()
    } catch (error) {
      if (error.fieldErrors) for (const [field, message] of Object.entries(error.fieldErrors)) setError(field, { message })
      toast.error('Could not change the password', { description: error.message })
    }
  }

  return (
    <Card padding="none">
      <CardHeader title="Change password" icon={<Lock />} />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword', { required: 'Enter your current password' })} />
          <Input label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword', { required: 'Enter a new password', minLength: { value: 8, message: 'Use at least 8 characters' } })} />
          <div>
            <div className="mb-1.5 flex justify-between text-xs"><span className="text-fg-muted">Strength</span><span className="font-medium">{next ? strength : '—'}</span></div>
            <ProgressBar value={score} max={4} tone={score < 2 ? 'danger' : score < 4 ? 'warning' : 'success'} />
            <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
              {RULES.map((rule) => {
                const ok = rule.test(next)
                return (
                  <li key={rule.label} className={cn('flex items-center gap-1.5 transition-colors', ok ? 'text-success-fg' : 'text-fg-subtle')}>
                    <motion.span animate={{ scale: ok ? [1, 1.3, 1] : 1 }} className={cn('grid size-4 place-items-center rounded-full', ok ? 'bg-success text-surface' : 'bg-surface-3')}>{ok && <Check className="size-3" strokeWidth={3} />}</motion.span>
                    {rule.label}
                  </li>
                )
              })}
            </ul>
          </div>
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm', { validate: (value, values) => value === values.newPassword || 'The passwords do not match' })} />
          {USE_MOCK && <p className="text-xs text-fg-subtle">Demo mode: the check runs, but the demo password stays the same.</p>}
          <div className="flex justify-end"><Button type="submit" loading={changePassword.isPending}>Change password</Button></div>
        </form>
      </CardBody>
    </Card>
  )
}

/* ---------- Organization ------------------------------------------------- */

function OrganizationTab() {
  const { data: settings, isLoading } = useSettings()
  if (isLoading || !settings) return <Skeleton className="h-96 rounded-2xl" />
  return <OrganizationForm key={settings.updatedAt} settings={settings} />
}

function OrganizationForm({ settings }) {
  const toast = useToast()
  const update = useUpdateSettings()
  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm({ defaultValues: settings })
  const currency = useWatch({ control, name: 'currency' })

  async function onSubmit(values) {
    try {
      await update.mutateAsync({ ...values, taxRate: Number(values.taxRate), defaultReorderLevel: Number(values.defaultReorderLevel) })
      toast.success('Company settings saved')
    } catch (error) {
      toast.error('Could not save', { description: error.message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
      <Card padding="none">
        <CardHeader title="Company" icon={<Building2 />} description="Shown on invoices and purchase orders." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input label="Company name" error={errors.companyName?.message} {...register('companyName', { required: 'Enter the company name' })} />
          <Input label="Tax ID (GSTIN)" className="font-mono" {...register('taxId')} />
          <Input label="Email" type="email" {...register('companyEmail')} />
          <Input label="Phone" {...register('companyPhone')} />
          <Textarea label="Address" rows={2} containerClassName="sm:col-span-2" {...register('companyAddress')} />
        </CardBody>
      </Card>
      <Card padding="none">
        <CardHeader title="Money & numbering" />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Currency" options={CURRENCIES} hint={`Preview: ${formatCurrency(124999.5, { currency })}`} {...register('currency')} />
          <Input label="Default tax rate" type="number" step="0.01" suffix="%" {...register('taxRate', { min: 0 })} />
          <Input label="Default reorder level" type="number" {...register('defaultReorderLevel', { min: 0 })} />
          <Input label="Order number prefix" className="font-mono" {...register('orderPrefix')} />
          <Input label="Purchase order prefix" className="font-mono" {...register('purchaseOrderPrefix')} />
          <Textarea label="Invoice notes" rows={2} containerClassName="sm:col-span-2 lg:col-span-3" {...register('invoiceNotes')} />
        </CardBody>
      </Card>
      <AnimatePresence>
        {isDirty && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring.smooth} className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-line bg-surface p-3 pl-5 shadow-pop">
            <span className="mr-auto text-sm font-medium">You have unsaved changes</span>
            <Button variant="ghost" size="sm" onClick={() => reset(settings)}>Discard</Button>
            <Button size="sm" type="submit" loading={update.isPending}>Save changes</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

/* ---------- Appearance --------------------------------------------------- */

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun, preview: 'bg-[#f5f6fb]', bar: 'bg-white', block: 'bg-[#e9ebf5]' },
  { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-[#090b13]', bar: 'bg-[#10131e]', block: 'bg-[#1e2334]' },
  { value: 'system', label: 'System', icon: Monitor, preview: 'bg-linear-to-br from-[#f5f6fb] from-50% to-[#090b13] to-50%', bar: 'bg-white/70', block: 'bg-[#7063f7]/30' },
]

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const { preferences, setPreference } = usePreferences()
  return (
    <div className="space-y-6">
      <Card padding="none">
        <CardHeader title="Theme" icon={<Palette />} />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          {THEMES.map((item) => {
            const active = theme === item.value
            return (
              <button key={item.value} type="button" onClick={(event) => setTheme(item.value, event)} aria-pressed={active}
                className={cn('relative rounded-2xl border-2 p-3 text-left transition-all', active ? 'border-brand-500 ring-4 ring-brand-500/15' : 'border-line hover:border-line-strong')}>
                <div className={cn('h-24 overflow-hidden rounded-xl p-2', item.preview)}>
                  <div className={cn('h-3 w-full rounded', item.bar)} />
                  <div className="mt-2 flex gap-2"><div className={cn('h-14 w-1/4 rounded', item.bar)} /><div className="flex-1 space-y-1.5"><div className={cn('h-4 rounded', item.block)} /><div className={cn('h-4 w-2/3 rounded', item.block)} /></div></div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm font-medium"><item.icon className="size-4" />{item.label}</div>
                {active && <motion.span layoutId="theme-check" transition={spring.snappy} className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-brand-600 text-white"><Check className="size-3.5" strokeWidth={3} /></motion.span>}
              </button>
            )
          })}
        </CardBody>
      </Card>
      <Card padding="none">
        <CardHeader title="Behaviour" />
        <CardBody className="space-y-5">
          <Switch checked={preferences.reduceMotion} onChange={(value) => setPreference('reduceMotion', value)} label="Reduce motion" description="Turn off animations and transitions." />
          <Switch checked={preferences.sidebarCollapsed} onChange={(value) => setPreference('sidebarCollapsed', value)} label="Compact sidebar" description="Show only icons in the sidebar on large screens." />
        </CardBody>
      </Card>
    </div>
  )
}

/* ---------- Notifications ------------------------------------------------ */

const NOTIFICATION_OPTIONS = [
  { key: 'lowStock', label: 'Low and out of stock', description: 'When a product falls to its reorder level or runs out.' },
  { key: 'newOrder', label: 'New orders', description: 'Every time an order is placed.' },
  { key: 'orderStatus', label: 'Order status changes', description: 'When orders are shipped, delivered or cancelled.' },
  { key: 'purchaseOrder', label: 'Purchase orders', description: 'When stock from a supplier is received.' },
  { key: 'weeklySummary', label: 'Weekly summary', description: 'A Monday recap of sales and stock (needs the backend to send e-mail).' },
]

function NotificationsTab() {
  const { data: settings } = useSettings()
  const update = useUpdateSettings()
  const toast = useToast()

  async function toggle(key, value) {
    try {
      await update.mutateAsync({ notifications: { [key]: value } })
      toast.info(value ? 'Notifications on' : 'Notifications off', { duration: 2000 })
    } catch (error) {
      toast.error('Could not save', { description: error.message })
    }
  }

  return (
    <Card padding="none">
      <CardHeader title="Notify me about" icon={<Bell />} />
      <CardBody className="divide-y divide-line py-0">
        {NOTIFICATION_OPTIONS.map((option) => (
          <div key={option.key} className="py-4">
            <Switch checked={Boolean(settings?.notifications?.[option.key])} onChange={(value) => toggle(option.key, value)} label={option.label} description={option.description} />
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

/* ---------- Data & API --------------------------------------------------- */

function DataTab() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const info = useDemoInfo()
  const reset = useResetDemoData()
  const exportData = useExportData()
  const [busy, setBusy] = useState(false)

  async function doExport() {
    setBusy(true)
    try {
      downloadJson('inventra-data.json', await exportData.mutateAsync())
      toast.success('Data exported')
    } finally {
      setBusy(false)
    }
  }

  async function doReset() {
    if (!(await confirm({ title: 'Reset demo data?', description: 'Every change you made is replaced with fresh sample data.', confirmLabel: 'Reset data' }))) return
    await reset.mutateAsync()
    toast.success('Demo data reset')
  }

  return (
    <div className="space-y-6">
      <Card padding="none">
        <CardHeader title="Backend connection" icon={<Database />} action={<Badge tone={USE_MOCK ? 'warning' : 'success'} dot pulse>{USE_MOCK ? 'Demo data' : 'Live API'}</Badge>} />
        <CardBody className="space-y-4 text-sm">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs"><span className="flex-1 truncate">{API_BASE_URL}</span><CopyButton value={API_BASE_URL} label="Copy URL" /></div>
          <ol className="list-decimal space-y-2 pl-5 text-fg-muted">
            <li>Copy <code className="rounded bg-surface-2 px-1 font-mono text-xs">.env.example</code> to <code className="rounded bg-surface-2 px-1 font-mono text-xs">.env</code> in the frontend folder.</li>
            <li>Set <code className="rounded bg-surface-2 px-1 font-mono text-xs">VITE_USE_MOCK=false</code> and <code className="rounded bg-surface-2 px-1 font-mono text-xs">VITE_API_BASE_URL</code> to your server.</li>
            <li>Restart <code className="rounded bg-surface-2 px-1 font-mono text-xs">npm run dev</code>. Every endpoint is documented at the top of each file in <code className="rounded bg-surface-2 px-1 font-mono text-xs">src/api/</code>.</li>
          </ol>
          <pre className="overflow-x-auto rounded-xl bg-[#0b0d16] p-4 text-xs text-[#d6d9f0]">{`VITE_USE_MOCK=false\nVITE_API_BASE_URL=http://localhost:8000/api`}</pre>
        </CardBody>
      </Card>

      {USE_MOCK && (
        <Card padding="none">
          <CardHeader title="Demo data" description={info.data ? `Created ${new Date(info.data.seededAt).toLocaleString()}` : undefined} action={<div className="flex gap-2"><Button variant="secondary" size="sm" leftIcon={<Download />} loading={busy} onClick={doExport}>Export JSON</Button><Button variant="danger-soft" size="sm" leftIcon={<RotateCcw />} loading={reset.isPending} onClick={doReset}>Reset</Button></div>} />
          <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(info.data?.counts ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-surface-2 p-3 text-center"><p className="text-lg font-bold tabular-nums">{value}</p><p className="text-xs capitalize text-fg-subtle">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</p></div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">Sign out</p><p className="text-sm text-fg-muted">End your session on this device.</p></div>
        <Button variant="danger-soft" leftIcon={<LogOut />} onClick={async () => { await logout(); navigate('/login', { replace: true }) }}>Sign out</Button>
      </Card>
    </div>
  )
}
