// Sign-in page: an animated brand panel on the left (from 1024px) and the sign-in form on the right.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowRight, BarChart3, Boxes, CircleAlert, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, TriangleAlert, Truck, Zap } from 'lucide-react'
import { USE_MOCK } from '@/api'
import { Logo } from '@/components/brand/Logo'
import { Badge, Button, Checkbox, Input, Sparkline } from '@/components/ui'
import { APP_NAME, DEMO_CREDENTIALS } from '@/config/app'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ease, spring } from '@/lib/motion'

const YEAR = new Date().getFullYear()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TREND = [12, 18, 15, 22, 26, 24, 31, 29, 36, 41, 39, 47]

const FEATURES = [
  { icon: Boxes, title: 'Live stock levels', text: 'Every sale, delivery and count updates stock instantly.' },
  { icon: Truck, title: 'Orders end to end', text: 'From pending to delivered, with invoices ready to print.' },
  { icon: BarChart3, title: 'Reports that make sense', text: 'Revenue, best sellers and slow movers at a glance.' },
]

export default function LoginPage() {
  usePageTitle('Sign in')

  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <FormPanel />
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function BrandPanel() {
  // The preview cards drift a few pixels with the pointer (mouse only).
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const x = useSpring(pointerX, { stiffness: 80, damping: 18 })
  const y = useSpring(pointerY, { stiffness: 80, damping: 18 })
  const xFar = useTransform(x, (value) => value * 1.8)
  const yFar = useTransform(y, (value) => value * 1.8)

  function onPointerMove(event) {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 16)
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 16)
  }

  return (
    <aside
      onPointerMove={onPointerMove}
      className="force-dark relative hidden overflow-hidden bg-[#070912] text-fg lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14"
    >
      <Aurora />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative">
        <Logo size={36} nameClassName="text-xl text-white" />
      </motion.div>

      <div className="relative max-w-xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: ease.out, delay: 0.1 }}
          className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl"
        >
          Every item. Every order. <span className="text-gradient-brand">One calm workspace.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: ease.out, delay: 0.2 }}
          className="mt-5 max-w-md text-base text-fg-muted"
        >
          {APP_NAME} keeps your products, stock, purchasing and sales in one place, so you always know what you have and what to do next.
        </motion.p>

        <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.35 } } }} className="mt-9 space-y-4">
          {FEATURES.map((feature) => (
            <motion.li
              key={feature.title}
              variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: ease.out } } }}
              className="flex items-start gap-3.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-300">
                <feature.icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold text-white">{feature.title}</span>
                <span className="block text-sm text-fg-muted">{feature.text}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Floating previews of the product. */}
      <motion.div style={{ x, y }} className="pointer-events-none absolute right-10 top-24 hidden xl:block">
        <GlassCard delay={0.5} className="w-60 animate-float">
          <p className="text-xs text-fg-muted">Revenue · last 30 days</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">₹4.82L</p>
          <div className="mt-2 flex items-end justify-between">
            <Badge tone="success" size="sm">
              ↗ 18.4%
            </Badge>
            <Sparkline data={TREND} width={96} height={34} />
          </div>
        </GlassCard>
      </motion.div>
      <motion.div style={{ x: xFar, y: yFar }} className="pointer-events-none absolute right-24 top-[46%] hidden xl:block">
        <GlassCard delay={0.65} className="w-64 animate-float-slow [animation-delay:-2s]">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-warning-soft text-warning-fg">
              <TriangleAlert className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">Mechanical Keyboard TKL</p>
              <p className="text-xs text-fg-muted">4 left · reorder at 8</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
      <motion.div style={{ x, y }} className="pointer-events-none absolute bottom-28 right-12 hidden xl:block">
        <GlassCard delay={0.8} className="w-72 animate-float [animation-delay:-4s]">
          <p className="text-xs text-fg-muted">Order SO-10342</p>
          <div className="mt-2 flex items-center gap-1.5">
            {['Pending', 'Processing', 'Shipped'].map((step, index) => (
              <motion.span
                key={step}
                initial={{ opacity: 0.35 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 + index * 0.5, duration: 0.4 }}
                className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[11px] font-medium text-brand-200"
              >
                {step}
              </motion.span>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      <p className="relative text-xs text-fg-subtle">
        © {YEAR} {APP_NAME}. Inventory & order management.
      </p>
    </aside>
  )
}

function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -left-24 -top-32 size-[34rem] rounded-full bg-brand-600/40 blur-[110px] animate-aurora" />
      <div className="absolute -bottom-40 left-1/4 size-[30rem] rounded-full bg-cyan-500/20 blur-[110px] animate-aurora-reverse" />
      <div className="absolute -right-24 top-1/4 size-[26rem] rounded-full bg-fuchsia-500/25 blur-[110px] animate-aurora" />
    </div>
  )
}

function GlassCard({ delay, className, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring.gentle, delay }}>
      <div className={`rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-xl ${className}`}>{children}</div>
    </motion.div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function FormPanel() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: USE_MOCK ? DEMO_CREDENTIALS.email : '',
      password: USE_MOCK ? DEMO_CREDENTIALS.password : '',
      remember: true,
    },
  })

  async function onSubmit(values) {
    setFormError('')
    try {
      const user = await login(values)
      setSuccess(true)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      const to = location.state?.from?.pathname ? `${location.state.from.pathname}${location.state.from.search ?? ''}` : '/dashboard'
      setTimeout(() => navigate(to, { replace: true }), 550)
    } catch (error) {
      setFormError(error.status === 401 ? 'That email and password don’t match. Check them and try again.' : error.message)
      setShakeKey((key) => key + 1)
    }
  }

  function fillDemo() {
    setValue('email', DEMO_CREDENTIALS.email, { shouldValidate: true })
    setValue('password', DEMO_CREDENTIALS.password, { shouldValidate: true })
    setFormError('')
  }

  return (
    <main className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-8">
      {/* A small aurora strip behind the logo on phones and tablets. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden lg:hidden">
        <div className="absolute -top-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[90px]" />
      </div>

      <div className="relative w-full max-w-[420px]">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex justify-center lg:hidden">
          <Logo size={40} nameClassName="text-2xl" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out }}>
          <h2 className="font-display text-[28px] font-bold tracking-tight text-fg">Welcome back</h2>
          <p className="mt-1.5 text-fg-muted">Sign in to manage your stock and orders.</p>
        </motion.div>

        <motion.form
          key={shakeKey}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          initial={shakeKey ? { x: 0 } : { opacity: 0, y: 16 }}
          animate={shakeKey ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0 }}
          transition={shakeKey ? { duration: 0.45 } : { duration: 0.5, ease: ease.out, delay: 0.08 }}
          className="mt-8 space-y-4"
        >
          <AnimatePresence>
            {formError && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger-fg">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  {formError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register('email', { required: 'Enter your email', pattern: { value: EMAIL, message: 'Enter a valid email address' } })}
          />

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              {...register('password', { required: 'Enter your password' })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Checkbox label="Keep me signed in" {...register('remember')} />
            <button
              type="button"
              onClick={() => toast.info('Password reset', { description: 'Resetting a password arrives together with the backend.' })}
              className="text-sm font-medium text-brand-fg underline-offset-2 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={success}
            rightIcon={!isSubmitting && !success ? <ArrowRight /> : undefined}
            className="mt-2"
          >
            <AnimatePresence mode="wait" initial={false}>
              {success ? (
                <motion.span key="done" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
                  </svg>
                  Signed in
                </motion.span>
              ) : (
                <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Sign in
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.form>

        {USE_MOCK && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-8 rounded-2xl border border-dashed border-brand-500/40 bg-brand-soft/40 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-fg">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">Demo account</p>
                <p className="mt-0.5 text-xs text-fg-muted">The app runs on sample data until your backend is connected.</p>
                <dl className="mt-2.5 space-y-1 font-mono text-xs">
                  <div className="flex gap-2">
                    <dt className="w-16 text-fg-subtle">Email</dt>
                    <dd className="truncate text-fg">{DEMO_CREDENTIALS.email}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 text-fg-subtle">Password</dt>
                    <dd className="text-fg">{DEMO_CREDENTIALS.password}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <Button variant="soft" size="sm" fullWidth leftIcon={<KeyRound />} onClick={fillDemo} className="mt-3">
              Use demo account
            </Button>
          </motion.div>
        )}

        <p className="mt-8 flex items-center justify-center gap-4 text-xs text-fg-subtle">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Secure sign-in
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3.5" /> Fast & responsive
          </span>
        </p>
      </div>
    </main>
  )
}
