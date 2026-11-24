// 404: the page someone asked for does not exist.
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, LayoutDashboard, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function NotFoundPage() {
  const navigate = useNavigate()
  usePageTitle('Page not found')

  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <motion.div animate={{ y: [0, -12, 0], rotate: [-4, 4, -4] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="mx-auto grid size-24 place-items-center rounded-3xl bg-brand-soft text-brand-fg shadow-glow">
          <PackageOpen className="size-12" strokeWidth={1.5} />
        </motion.div>
        <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="mt-6 font-display text-7xl font-extrabold tracking-tight text-gradient-brand sm:text-8xl">404</motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="mt-2 text-2xl font-bold text-fg">This shelf is empty</h1>
          <p className="mx-auto mt-2 max-w-sm text-fg-muted">We looked everywhere in the warehouse but couldn’t find that page. It may have moved or never existed.</p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="secondary" leftIcon={<ArrowLeft />} onClick={() => navigate(-1)}>Go back</Button>
            <Button leftIcon={<LayoutDashboard />} to="/dashboard">Back to dashboard</Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
