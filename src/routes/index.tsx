import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  DollarSign,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  createProduct,
  createStockAdjustment,
  deleteProduct,
  getProducts,
  getSummary,
  updateProduct,
} from '../server/products.functions'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [products, summary] = await Promise.all([getProducts(), getSummary()])
    return { products, summary }
  },
  component: Home,
})

type Product = Awaited<ReturnType<typeof getProducts>>[number]

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

function Home() {
  const { products, summary } = Route.useLoaderData()
  const router = useRouter()

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [stockModal, setStockModal] = useState<{
    product: Product
    type: 'in' | 'out'
  } | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [products, search])

  async function refresh() {
    await router.invalidate()
  }

  async function handleProductSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const payload = {
      sku: String(form.get('sku') ?? ''),
      name: String(form.get('name') ?? ''),
      category: String(form.get('category') ?? ''),
      price: Number(form.get('price') ?? 0),
      quantity: Number(form.get('quantity') ?? 0),
      reorderLevel: Number(form.get('reorderLevel') ?? 0),
    }
    try {
      if (editingProduct) {
        await updateProduct({ data: { ...payload, id: editingProduct.id } })
      } else {
        await createProduct({ data: payload })
      }
      setProductModalOpen(false)
      setEditingProduct(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    await deleteProduct({ data: { id: product.id } })
    await refresh()
  }

  async function handleStockSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!stockModal) return
    setError('')
    const form = new FormData(e.currentTarget)
    try {
      await createStockAdjustment({
        data: {
          productId: stockModal.product.id,
          type: stockModal.type,
          quantity: Number(form.get('quantity') ?? 0),
          note: String(form.get('note') ?? ''),
        },
      })
      setStockModal(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Manager</h1>
            <p className="text-gray-500 mt-1">
              Enter products and keep stock levels up to date.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null)
              setError('')
              setProductModalOpen(true)
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Package}
            color="bg-blue-500"
            title="Total SKUs"
            value={String(summary.totalItems)}
          />
          <StatCard
            icon={Boxes}
            color="bg-emerald-500"
            title="Total Units"
            value={summary.totalUnits.toLocaleString()}
          />
          <StatCard
            icon={DollarSign}
            color="bg-violet-500"
            title="Inventory Value"
            value={currency(summary.totalValue)}
          />
          <StatCard
            icon={AlertTriangle}
            color="bg-amber-500"
            title="Low Stock Alerts"
            value={String(summary.lowStock.length)}
          />
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or category..."
            className="w-full sm:w-96 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Product table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">SKU</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium text-right">Price</th>
                  <th className="px-6 py-3 font-medium text-right">Stock</th>
                  <th className="px-6 py-3 font-medium text-right">Reorder At</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                      No products yet. Add your first product to get started.
                    </td>
                  </tr>
                )}
                {filtered.map((product) => {
                  const isLow = product.quantity <= product.reorderLevel
                  return (
                    <tr key={product.id} className={isLow ? 'bg-amber-50' : undefined}>
                      <td className="px-6 py-3 font-mono text-gray-700">{product.sku}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-3 text-gray-500">{product.category || '—'}</td>
                      <td className="px-6 py-3 text-right text-gray-700">
                        {currency(Number(product.price))}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span
                          className={
                            isLow
                              ? 'inline-flex items-center gap-1 text-amber-700 font-semibold'
                              : 'font-semibold text-gray-900'
                          }
                        >
                          {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
                          {product.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        {product.reorderLevel}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Stock in"
                            onClick={() => {
                              setError('')
                              setStockModal({ product, type: 'in' })
                            }}
                            className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600"
                          >
                            <ArrowUpCircle className="w-4.5 h-4.5" />
                          </button>
                          <button
                            title="Stock out"
                            onClick={() => {
                              setError('')
                              setStockModal({ product, type: 'out' })
                            }}
                            className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600"
                          >
                            <ArrowDownCircle className="w-4.5 h-4.5" />
                          </button>
                          <button
                            title="Edit product"
                            onClick={() => {
                              setEditingProduct(product)
                              setError('')
                              setProductModalOpen(true)
                            }}
                            className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete product"
                            onClick={() => handleDelete(product)}
                            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product create/edit modal */}
      {productModalOpen && (
        <Modal
          title={editingProduct ? 'Edit Product' : 'New Product'}
          onClose={() => setProductModalOpen(false)}
        >
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="SKU">
                <input
                  name="sku"
                  required
                  defaultValue={editingProduct?.sku}
                  className="input"
                />
              </Field>
              <Field label="Name">
                <input
                  name="name"
                  required
                  defaultValue={editingProduct?.name}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Category">
              <input
                name="category"
                defaultValue={editingProduct?.category}
                className="input"
              />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Price ($)">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={editingProduct ? Number(editingProduct.price) : 0}
                  className="input"
                />
              </Field>
              <Field label="Quantity">
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  required
                  disabled={Boolean(editingProduct)}
                  defaultValue={editingProduct?.quantity ?? 0}
                  className="input disabled:bg-gray-100 disabled:text-gray-400"
                />
              </Field>
              <Field label="Reorder At">
                <input
                  name="reorderLevel"
                  type="number"
                  min="0"
                  required
                  defaultValue={editingProduct?.reorderLevel ?? 0}
                  className="input"
                />
              </Field>
            </div>
            {editingProduct && (
              <p className="text-xs text-gray-400">
                Use the stock in/out actions on the table to change quantity.
              </p>
            )}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stock adjustment modal */}
      {stockModal && (
        <Modal
          title={`${stockModal.type === 'in' ? 'Stock In' : 'Stock Out'} — ${stockModal.product.name}`}
          onClose={() => setStockModal(null)}
        >
          <form onSubmit={handleStockSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">
              Current stock: <span className="font-semibold text-gray-900">{stockModal.product.quantity}</span>
            </p>
            <Field label="Quantity">
              <input
                name="quantity"
                type="number"
                min="1"
                required
                autoFocus
                className="input"
              />
            </Field>
            <Field label="Note (optional)">
              <input name="note" className="input" placeholder="e.g. purchase order #123" />
            </Field>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStockModal(null)}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={
                  stockModal.type === 'in'
                    ? 'px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium'
                    : 'px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium'
                }
              >
                Confirm
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  color,
  title,
  value,
}: {
  icon: typeof Package
  color: string
  title: string
  value: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
