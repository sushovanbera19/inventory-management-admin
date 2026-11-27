// Categories: colour-coded groups of products, with their size and stock value.
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { motion } from 'motion/react'
import { Check, Ellipsis, Eye, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { Button, Card, Dropdown, DropdownItem, DropdownSeparator, EmptyState, IconButton, Input, Modal, PageHeader, SearchInput, Select, Skeleton, Stagger, Textarea } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { CATEGORY_COLORS, categoryHex } from '@/lib/constants'
import { spring } from '@/lib/motion'
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/queries'
import { categoriesApi } from '../../api/categories.js'
import { getImageUrl } from '../../api/config.js'

export default function CategoriesPage() {
  const [query, setQuery] = useQueryState({ search: '', sortBy: 'name', new: '' })
  const [form, setForm] = useState(query.new ? { category: null } : null)
  const [isUploading, setIsUploading] = useState(false)
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const { data, isLoading } = useCategories({ search: query.search, sortBy: query.sortBy })
  const remove = useDeleteCategory()
  // const rows = data?.data ?? []
  const rows = Array.isArray(data)
    ? data
    : data?.data ?? []
  const totalValue = rows.reduce((sum, row) => sum + row.stockValue, 0) || 1

  function closeForm() {
    setForm(null)
    if (query.new) setQuery({ new: '' })
  }

  async function deleteCategory(category) {
    if (!(await confirm({ title: `Delete ${category.name}?`, description: 'Only empty categories can be deleted.', confirmLabel: 'Delete' }))) return
    try {
      await remove.mutateAsync(category.id)
      toast.success('Category deleted')
    } catch (error) {
      toast.error('Could not delete', { description: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Group products to filter, report and restock faster." actions={<Button leftIcon={<Plus />} onClick={() => setForm({ category: null })}>Add category</Button>} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={query.search} onChange={(search) => setQuery({ search })} placeholder="Search categories…" className="sm:w-72" />
        <Select size="md" aria-label="Sort" className="sm:ml-auto sm:w-52" value={query.sortBy} onChange={(event) => setQuery({ sortBy: event.target.value })} options={[{ value: 'name', label: 'Name' }, { value: 'productCount', label: 'Most products' }, { value: 'stockValue', label: 'Highest stock value' }]} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-48 rounded-2xl" />)}</div>
      ) : rows.length ? (
        <Stagger stagger={0.05} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((category) => {
            const color = categoryHex(category.color)
            return (
              <Card key={category.id} hover className="relative overflow-hidden">
                <span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: color }} />
                <div className="relative flex items-start justify-between">
                  {category.imageUrl ? (
                    <img
                      src={getImageUrl(category.imageUrl)}
                      alt={category.name}
                      className="size-14 rounded-xl border border-line object-cover shadow-card transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="grid size-11 place-items-center rounded-xl" style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
                      <Tags className="size-5" />
                    </span>
                  )}
                  <Dropdown trigger={<IconButton label="Actions" size="sm" tooltip={false}><Ellipsis /></IconButton>}>
                    <DropdownItem icon={<Eye />} to={`/products?categoryId=${category.id}`}>View products</DropdownItem>
                    <DropdownItem icon={<Pencil />} onSelect={() => setForm({ category })}>Edit</DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem icon={<Trash2 />} tone="danger" onSelect={() => deleteCategory(category)}>Delete</DropdownItem>
                  </Dropdown>
                </div>
                <h3 className="relative mt-4 font-semibold text-fg">{category.name}</h3>
                <p className="relative mt-1 line-clamp-2 min-h-10 text-sm text-fg-muted">{category.description || 'No description'}</p>
                <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                  {[['Products', category.productCount], ['Units', fmt.formatNumber(category.totalUnits)], ['Value', fmt.formatCompactCurrency(category.stockValue)]].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-surface-2 py-2">
                      <p className="text-sm font-semibold tabular-nums text-fg">{value}</p>
                      <p className="text-[11px] text-fg-subtle">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3" title="Share of total stock value">
                  <motion.div className="h-full origin-left rounded-full" style={{ backgroundColor: color }} initial={{ scaleX: 0 }} animate={{ scaleX: category.stockValue / totalValue }} transition={{ duration: 0.8, delay: 0.2 }} />
                </div>
              </Card>
            )
          })}
        </Stagger>
      ) : (
        <EmptyState icon={<Tags />} title={query.search ? 'No categories match' : 'No categories yet'} description="Categories keep your catalogue tidy." action={<Button leftIcon={<Plus />} onClick={() => setForm({ category: null })}>Add category</Button>} />
      )}

      <Modal open={Boolean(form)} onClose={closeForm} title={form?.category ? 'Edit category' : 'New category'} icon={<Tags />}
        footer={<><Button variant="secondary" onClick={closeForm}>Cancel</Button><Button
          type="submit"
          form="category-form"
          disabled={isUploading}
        >
          {isUploading
            ? 'Uploading...'
            : form?.category
              ? 'Save changes'
              : 'Add category'}
        </Button></>}>
        {form && (
          <CategoryForm
            key={form.category?.id ?? 'new'}
            category={form.category}
            onDone={closeForm}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        )}
      </Modal>
    </div>
  )
}

function CategoryForm({ category, onDone, isUploading, setIsUploading }) {
  const toast = useToast()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = useForm({
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '', color: category?.color ?? 'indigo' },
  })
  const color = useWatch({ control, name: 'color' })
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(
    getImageUrl(category?.imageUrl)
  )
  // const [imagePreview, setImagePreview] = useState(category?.imageUrl ?? '')
  // const [isUploading, setIsUploading] = useState(false)

  // async function onSubmit(values) {
  //   try {
  //     setIsUploading(true)

  //     const categoryData = { ...values }

  //     if (selectedImage) {
  //       const uploadResult = await categoriesApi.uploadImage(selectedImage)
  //       categoryData.imageUrl = uploadResult.imageUrl
  //     }

  //     const saved = category
  //       ? await update.mutateAsync({
  //         id: category.id,
  //         data: categoryData,
  //       })
  //       : await create.mutateAsync(categoryData)

  //     toast.success(category ? 'Category updated' : 'Category added', {
  //       description: saved.name,
  //     })

  //     onDone()
  //   } catch (error) {
  //     if (error.fieldErrors?.name) {
  //       setError('name', { message: error.fieldErrors.name })
  //     }

  //     toast.error('Could not save', { description: error.message })
  //   } finally {
  //     setIsUploading(false)
  //   }
  // }
  async function onSubmit(values) {
    try {
      setIsUploading(true)

      const categoryData = { ...values }

      console.log("1. Form values:", values)

      if (selectedImage) {
        console.log("2. Uploading image:", selectedImage)

        const uploadResult = await categoriesApi.uploadImage(selectedImage)

        console.log("3. Image upload response:", uploadResult)

        categoryData.imageUrl = uploadResult.imageUrl
      }

      console.log("4. Final category data:", categoryData)

      const saved = category
        ? await update.mutateAsync({
          id: category.id,
          data: categoryData,
        })
        : await create.mutateAsync(categoryData)

      console.log("5. Category saved:", saved)

      console.log("SAVED CATEGORY RESPONSE:", JSON.stringify(saved, null, 2))

      console.log("MOCK MODE:", import.meta.env.VITE_USE_MOCK)

      console.log("API BASE URL:", import.meta.env.VITE_API_BASE_URL)


      toast.success(category ? 'Category updated' : 'Category added', {
        description: saved.name,
      })

      onDone()

    } catch (error) {
      console.error("CATEGORY SAVE ERROR:", error)

      if (error.fieldErrors?.name) {
        setError('name', { message: error.fieldErrors.name })
      }

      toast.error('Could not save', { description: error.message })

    } finally {
      setIsUploading(false)
    }
  }
  return (
    <form id="category-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Name" required autoFocus error={errors.name?.message} {...register('name', { required: 'Enter a name' })} />
      <Textarea label="Description" optional rows={2} {...register('description')} />
      <div>
        <p className="mb-2 text-sm font-medium text-fg">Category Image</p>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface-2 p-5 text-center transition-colors hover:border-primary">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Category preview"
              className="mb-3 size-24 rounded-xl object-cover shadow-card"
            />
          ) : (
            <div className="mb-3 grid size-12 place-items-center rounded-xl bg-surface-3">
              <Tags className="size-6 text-fg-muted" />
            </div>
          )}

          <span className="text-sm font-medium text-fg">
            {selectedImage ? selectedImage.name : 'Choose category image'}
          </span>

          <span className="mt-1 text-xs text-fg-muted">
            JPG, PNG, WEBP or GIF · Maximum 5 MB
          </span>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                setSelectedImage(file)
                setImagePreview(URL.createObjectURL(file))
              }
            }}
          />
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-fg">Colour</p>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Colour">
          {Object.entries(CATEGORY_COLORS).map(([key, meta]) => (
            <button key={key} type="button" role="radio" aria-checked={color === key} aria-label={meta.label} onClick={() => setValue('color', key)}
              className="relative grid size-9 place-items-center rounded-full transition-transform hover:scale-110" style={{ backgroundColor: meta.hex }}>
              {color === key && (
                <motion.span layoutId="swatch-ring" transition={spring.snappy} className="absolute -inset-1 rounded-full border-2" style={{ borderColor: meta.hex }}>
                  <Check className="absolute inset-0 m-auto size-4 text-white" />
                </motion.span>
              )}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
