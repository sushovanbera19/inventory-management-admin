// Sun / moon button that switches between the light and dark theme.
import { AnimatePresence, motion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return (
    <IconButton label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={(event) => toggleTheme(event)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ rotate: -90, scale: 0, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="grid place-items-center"
        >
          {dark ? <Moon /> : <Sun />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  )
}
