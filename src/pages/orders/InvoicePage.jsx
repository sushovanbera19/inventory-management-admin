// Printable tax invoice for one order (shown without the app's sidebar and top bar).
import { useParams } from 'react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { AddressBlock } from '@/components/domain'
import { Button, PageLoader } from '@/components/ui'
import { useFormatters } from '@/hooks/useFormatters'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/cn'
import { PAYMENT_METHODS } from '@/lib/constants'
import { useOrder, useSettings } from '@/queries'
import { DetailError } from '../shared/DetailStates.jsx'

const STAMP = { paid: 'border-success text-success', unpaid: 'border-warning text-warning', refunded: 'border-fg-subtle text-fg-subtle' }

export default function InvoicePage() {
  const { orderId } = useParams()
  const { data: order, isLoading, error, refetch } = useOrder(orderId)
  const { data: settings } = useSettings()
  const fmt = useFormatters()
  usePageTitle(order ? `Invoice ${order.orderNumber}` : 'Invoice')

  if (isLoading) return <PageLoader fullScreen label="Preparing invoice…" />
  if (error || !order) return <div className="p-8"><DetailError error={error} onRetry={refetch} what="Order" backTo="/orders" /></div>

  return (
    <div className="app-backdrop min-h-dvh pb-12 print:bg-white print:p-0">
      <div className="glass sticky top-0 z-10 border-b border-line print:hidden">
        <div className="mx-auto flex h-14 max-w-[820px] items-center justify-between px-4">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft />} to={`/orders/${order.id}`}>Back to order</Button>
          <Button size="sm" leftIcon={<Printer />} onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <article className="force-light relative mx-auto mt-8 max-w-[820px] overflow-hidden bg-white p-6 text-[#101327] shadow-raised sm:rounded-2xl sm:p-10 print:mt-0 print:max-w-none print:p-0 print:shadow-none">
        <div className={cn('pointer-events-none absolute right-8 top-28 rotate-[-14deg] rounded-xl border-4 px-4 py-1 text-2xl font-black uppercase tracking-widest opacity-25', STAMP[order.paymentStatus])}>
          {order.paymentStatus}
        </div>

        <header className="flex flex-col justify-between gap-6 sm:flex-row">
          <div className="flex gap-3">
            <LogoMark size={44} />
            <div className="text-sm">
              <p className="text-lg font-bold">{settings?.companyName}</p>
              <p className="max-w-64 text-[#565c75]">{settings?.companyAddress}</p>
              <p className="text-[#565c75]">{settings?.companyEmail} · {settings?.companyPhone}</p>
              {settings?.taxId && <p className="text-[#565c75]">GSTIN {settings.taxId}</p>}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-display text-2xl font-bold tracking-tight">TAX INVOICE</p>
            <p className="mt-1 text-sm text-[#565c75]">Invoice no. <span className="font-mono font-semibold text-[#101327]">{order.orderNumber}</span></p>
            <p className="text-sm text-[#565c75]">Date {fmt.formatDate(order.createdAt)}</p>
          </div>
        </header>

        <section className="mt-8 grid gap-6 rounded-xl bg-[#f5f6fb] p-5 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#878da6]">Bill to</p>
            <p className="font-semibold">{order.customer.name}</p>
            {order.customer.company && <p className="text-sm text-[#565c75]">{order.customer.company}</p>}
            <p className="text-sm text-[#565c75]">{order.customer.email}</p>
            <p className="text-sm text-[#565c75]">{order.customer.phone}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#878da6]">Ship to</p>
            <AddressBlock address={order.shippingAddress} name={order.shippingAddress?.name} className="text-[#565c75] [&_span.font-medium]:text-[#101327]" />
          </div>
        </section>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#101327] text-left text-xs uppercase tracking-wide">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Unit price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={item.id} className="break-inside-avoid border-b border-[#e5e7f1]">
                <td className="py-3 pr-2 text-[#878da6]">{index + 1}</td>
                <td className="py-3 pr-2"><p className="font-medium">{item.name}</p><p className="font-mono text-xs text-[#878da6]">{item.sku}</p></td>
                <td className="py-3 pr-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-3 pr-2 text-right tabular-nums">{fmt.formatCurrency(item.unitPrice)}</td>
                <td className="py-3 text-right font-medium tabular-nums">{fmt.formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex flex-col justify-between gap-6 sm:flex-row">
          <div className="text-sm text-[#565c75]">
            <p><span className="font-semibold text-[#101327]">Payment method:</span> {PAYMENT_METHODS[order.paymentMethod]?.label}</p>
            {settings?.invoiceNotes && <p className="mt-3 max-w-sm">{settings.invoiceNotes}</p>}
          </div>
          <dl className="w-full space-y-1.5 text-sm sm:w-72">
            <Row label="Subtotal" value={fmt.formatCurrency(order.subtotal)} />
            {order.discountAmount > 0 && <Row label="Discount" value={`− ${fmt.formatCurrency(order.discountAmount)}`} />}
            <Row label={`Tax (${order.taxRate}%)`} value={fmt.formatCurrency(order.taxAmount)} />
            <Row label="Shipping" value={fmt.formatCurrency(order.shippingFee)} />
            <div className="flex justify-between border-t-2 border-[#101327] pt-2 text-base font-bold">
              <dt>Grand total</dt>
              <dd className="tabular-nums">{fmt.formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-12 border-t border-[#e5e7f1] pt-4 text-center text-xs text-[#878da6]">
          This is a computer-generated invoice and does not need a signature.
        </footer>
      </article>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-[#565c75]">
      <dt>{label}</dt>
      <dd className="tabular-nums text-[#101327]">{value}</dd>
    </div>
  )
}
