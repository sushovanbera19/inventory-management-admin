// The avatar menu in the top bar: profile, settings, sign out.
import { useNavigate } from 'react-router'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { Avatar, Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  async function signOut() {
    await logout()
    toast.info('Signed out', { description: 'See you soon!' })
    navigate('/login', { replace: true })
  }

  return (
    <Dropdown
      width={240}
      trigger={
        <button type="button" aria-label="Account menu" className="rounded-full transition-transform hover:scale-105 active:scale-95">
          <Avatar name={user?.name} size="sm" />
        </button>
      }
    >
      <div className="flex items-center gap-3 px-2.5 py-2">
        <Avatar name={user?.name} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{user?.name}</p>
          <p className="truncate text-xs text-fg-subtle">{user?.email}</p>
        </div>
      </div>
      <DropdownSeparator />
      <DropdownLabel>Account</DropdownLabel>
      <DropdownItem icon={<UserRound />} to="/settings?tab=profile">
        Profile
      </DropdownItem>
      <DropdownItem icon={<Settings />} to="/settings">
        Settings
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem icon={<LogOut />} tone="danger" onSelect={signOut}>
        Sign out
      </DropdownItem>
    </Dropdown>
  )
}
