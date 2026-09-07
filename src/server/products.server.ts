import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { products, stockMovements } from '../../db/schema.js'

export async function listProducts() {
  return db.select().from(products).orderBy(products.name)
}

export async function getStockSummary() {
  const rows = await db.select().from(products)
  const totalItems = rows.length
  const totalUnits = rows.reduce((sum, p) => sum + p.quantity, 0)
  const totalValue = rows.reduce(
    (sum, p) => sum + p.quantity * Number(p.price),
    0,
  )
  const lowStock = rows.filter((p) => p.quantity <= p.reorderLevel)
  return { totalItems, totalUnits, totalValue, lowStock }
}

export const ProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.string().max(100).default(''),
  price: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().nonnegative().default(0),
  reorderLevel: z.coerce.number().int().nonnegative().default(0),
})

export async function insertProduct(data: z.infer<typeof ProductSchema>) {
  const [product] = await db
    .insert(products)
    .values({
      sku: data.sku,
      name: data.name,
      category: data.category,
      price: data.price.toFixed(2),
      quantity: data.quantity,
      reorderLevel: data.reorderLevel,
    })
    .returning()
  return product
}

export const UpdateProductSchema = ProductSchema.extend({
  id: z.coerce.number().int().positive(),
})

export async function editProduct(data: z.infer<typeof UpdateProductSchema>) {
  const { id, ...rest } = data
  const [product] = await db
    .update(products)
    .set({
      sku: rest.sku,
      name: rest.name,
      category: rest.category,
      price: rest.price.toFixed(2),
      reorderLevel: rest.reorderLevel,
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, id))
    .returning()
  return product
}

export async function removeProduct(id: number) {
  await db.delete(stockMovements).where(eq(stockMovements.productId, id))
  await db.delete(products).where(eq(products.id, id))
  return { success: true }
}

export const StockAdjustmentSchema = z.object({
  productId: z.coerce.number().int().positive(),
  type: z.enum(['in', 'out']),
  quantity: z.coerce.number().int().positive(),
  note: z.string().max(200).default(''),
})

export async function adjustStock(data: z.infer<typeof StockAdjustmentSchema>) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, data.productId))

  if (!product) {
    throw new Error('Product not found')
  }

  const delta = data.type === 'in' ? data.quantity : -data.quantity
  const newQuantity = product.quantity + delta

  if (newQuantity < 0) {
    throw new Error('Stock cannot go below zero')
  }

  await db
    .update(products)
    .set({ quantity: newQuantity, updatedAt: sql`now()` })
    .where(eq(products.id, data.productId))

  await db.insert(stockMovements).values({
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    note: data.note,
  })

  return { success: true, quantity: newQuantity }
}

export async function listMovements(productId: number) {
  return db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .orderBy(sql`${stockMovements.createdAt} desc`)
    .limit(20)
}
