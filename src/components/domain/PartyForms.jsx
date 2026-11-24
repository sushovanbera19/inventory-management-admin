// Create / edit forms for customers and suppliers, each in a modal.
import { useForm, useWatch } from 'react-hook-form'
import { Building2, UserRound } from 'lucide-react'
import { Button, Input, Modal, SegmentedControl, Select, Textarea } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useCreateCustomer, useCreateSupplier, useUpdateCustomer, useUpdateSupplier } from '@/queries'

const EMAIL = { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' }
const PHONE = { value: /^[+\d][\d\s()-]{6,}$/, message: 'Enter a valid phone number' }

/** Puts server field errors (409 / 422) on the matching fields; anything else becomes a toast. */
function applyServerErrors(error, setError, toast, title) {
  if (error.fieldErrors) {
    for (const [field, message] of Object.entries(error.fieldErrors)) setError(field, { message })
  }
  toast.error(title, { description: error.message })
}

/* ======================================================================== */
/* Customer                                                                 */
/* ======================================================================== */

export function CustomerFormModal({ open, onClose, customer, onSaved, initialName }) {
  const editing = Boolean(customer)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit customer' : 'New customer'}
      description={editing ? customer.name : 'Save a buyer’s contact and delivery details.'}
      icon={<UserRound />}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form">
            {editing ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      {open && <CustomerForm key={customer?.id ?? 'new'} customer={customer} initialName={initialName} onSaved={onSaved} onClose={onClose} />}
    </Modal>
  )
}

function CustomerForm({ customer, initialName, onSaved, onClose }) {
  const toast = useToast()
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: customer?.name ?? initialName ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      company: customer?.company ?? '',
      type: customer?.type ?? 'individual',
      notes: customer?.notes ?? '',
      address: {
        line1: customer?.address?.line1 ?? '',
        line2: customer?.address?.line2 ?? '',
        city: customer?.address?.city ?? '',
        state: customer?.address?.state ?? '',
        postalCode: customer?.address?.postalCode ?? '',
        country: customer?.address?.country ?? 'India',
      },
    },
  })
  const type = useWatch({ control, name: 'type' })

  async function onSubmit(values) {
    try {
      const saved = customer ? await update.mutateAsync({ id: customer.id, data: values }) : await create.mutateAsync(values)
      toast.success(customer ? 'Customer updated' : 'Customer added', { description: saved.name })
      onSaved?.(saved)
      onClose()
    } catch (error) {
      applyServerErrors(error, setError, toast, 'Could not save the customer')
    }
  }

  return (
    <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <SegmentedControl
        aria-label="Customer type"
        value={type}
        onChange={(value) => setValue('type', value, { shouldDirty: true })}
        options={[
          { value: 'individual', label: 'Individual', icon: <UserRound /> },
          { value: 'business', label: 'Business', icon: <Building2 /> },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required autoFocus error={errors.name?.message} {...register('name', { required: 'Enter a name' })} />
        <Input label="Company" optional={type !== 'business'} required={type === 'business'} error={errors.company?.message} {...register('company', { validate: (value) => type !== 'business' || Boolean(value.trim()) || 'Enter the company name' })} />
        <Input label="Email" type="email" optional error={errors.email?.message} {...register('email', { pattern: EMAIL })} />
        <Input label="Phone" type="tel" optional error={errors.phone?.message} {...register('phone', { pattern: PHONE })} />
      </div>
      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-semibold text-fg">Delivery address</legend>
        <Input label="Address line 1" {...register('address.line1')} />
        <Input label="Address line 2" optional {...register('address.line2')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" {...register('address.city')} />
          <Input label="State" {...register('address.state')} />
          <Input label="Postal code" inputMode="numeric" {...register('address.postalCode')} />
          <Input label="Country" {...register('address.country')} />
        </div>
      </fieldset>
      <Textarea label="Notes" optional rows={2} {...register('notes')} />
    </form>
  )
}

/* ======================================================================== */
/* Supplier                                                                 */
/* ======================================================================== */

const TERMS = ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance'].map((value) => ({ value, label: value }))

export function SupplierFormModal({ open, onClose, supplier, onSaved }) {
  const editing = Boolean(supplier)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit supplier' : 'New supplier'}
      description={editing ? supplier.name : 'Who you buy stock from.'}
      icon={<Building2 />}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form">
            {editing ? 'Save changes' : 'Add supplier'}
          </Button>
        </>
      }
    >
      {open && <SupplierForm key={supplier?.id ?? 'new'} supplier={supplier} onSaved={onSaved} onClose={onClose} />}
    </Modal>
  )
}

function SupplierForm({ supplier, onSaved, onClose }) {
  const toast = useToast()
  const create = useCreateSupplier()
  const update = useUpdateSupplier()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: supplier?.name ?? '',
      contactName: supplier?.contactName ?? '',
      email: supplier?.email ?? '',
      phone: supplier?.phone ?? '',
      address: supplier?.address ?? '',
      city: supplier?.city ?? '',
      country: supplier?.country ?? 'India',
      leadTimeDays: supplier?.leadTimeDays ?? 7,
      paymentTerms: supplier?.paymentTerms ?? 'Net 30',
      status: supplier?.status ?? 'active',
      notes: supplier?.notes ?? '',
    },
  })

  async function onSubmit(values) {
    const data = { ...values, leadTimeDays: Number(values.leadTimeDays) }
    try {
      const saved = supplier ? await update.mutateAsync({ id: supplier.id, data }) : await create.mutateAsync(data)
      toast.success(supplier ? 'Supplier updated' : 'Supplier added', { description: saved.name })
      onSaved?.(saved)
      onClose()
    } catch (error) {
      applyServerErrors(error, setError, toast, 'Could not save the supplier')
    }
  }

  return (
    <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Company name" required autoFocus error={errors.name?.message} {...register('name', { required: 'Enter the supplier name' })} />
        <Input label="Contact person" optional {...register('contactName')} />
        <Input label="Email" type="email" optional error={errors.email?.message} {...register('email', { pattern: EMAIL })} />
        <Input label="Phone" type="tel" optional error={errors.phone?.message} {...register('phone', { pattern: PHONE })} />
      </div>
      <Input label="Address" optional {...register('address')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" {...register('city')} />
        <Input label="Country" {...register('country')} />
        <Input
          label="Lead time"
          type="number"
          min={0}
          suffix="days"
          hint="Days from ordering to delivery"
          error={errors.leadTimeDays?.message}
          {...register('leadTimeDays', { min: { value: 0, message: 'Cannot be negative' } })}
        />
        <Select label="Payment terms" options={TERMS} {...register('paymentTerms')} />
        <Select
          label="Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          {...register('status')}
        />
      </div>
      <Textarea label="Notes" optional rows={2} {...register('notes')} />
    </form>
  )
}
