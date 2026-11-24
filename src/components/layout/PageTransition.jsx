// Animates between pages: the old page fades out quickly, the new one rises in.
// useOutlet() keeps the leaving page on screen while it animates out.
import { useLocation, useOutlet } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { pageTransition } from '@/lib/motion'

export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        // Plain objects, not variant names: names would also start every Card / StaggerItem inside.
        initial={pageTransition.hidden}
        animate={pageTransition.show}
        exit={pageTransition.exit}
        onAnimationStart={(definition) => definition === pageTransition.show && window.scrollTo({ top: 0 })}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}
