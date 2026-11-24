// "New" button in the top bar: shortcuts to create an order, product, customer and more.
import { Plus } from 'lucide-react'
import { Button, Dropdown, DropdownItem, DropdownLabel, IconButton } from '@/components/ui'
import { QUICK_ACTIONS } from '@/config/navigation'

export function QuickCreateMenu() {
  const items = QUICK_ACTIONS.map((action) => {
    const Icon = action.icon
    return (
      <DropdownItem key={action.to} icon={<Icon />} to={action.to} className="h-auto py-2">
        <span className="block font-medium">{action.label}</span>
        <span className="block truncate text-xs text-fg-subtle">{action.description}</span>
      </DropdownItem>
    )
  })

  return (
    <>
      <span className="hidden sm:inline-flex">
        <Dropdown width={272} trigger={<Button size="sm" leftIcon={<Plus />}>New</Button>}>
          <DropdownLabel>Create</DropdownLabel>
          {items}
        </Dropdown>
      </span>
      <span className="inline-flex sm:hidden">
        <Dropdown width={272} trigger={<IconButton label="Create new" variant="primary" size="sm"><Plus /></IconButton>}>
          <DropdownLabel>Create</DropdownLabel>
          {items}
        </Dropdown>
      </span>
    </>
  )
}
