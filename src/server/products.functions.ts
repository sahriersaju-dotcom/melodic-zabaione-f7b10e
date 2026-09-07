import { createServerFn } from '@tanstack/react-start'
import {
  ProductSchema,
  StockAdjustmentSchema,
  UpdateProductSchema,
  adjustStock,
  editProduct,
  getStockSummary,
  insertProduct,
  listMovements,
  listProducts,
  removeProduct,
} from './products.server.js'

export const getProducts = createServerFn({ method: 'GET' }).handler(async () => {
  return listProducts()
})

export const getSummary = createServerFn({ method: 'GET' }).handler(async () => {
  return getStockSummary()
})

export const createProduct = createServerFn({ method: 'POST' })
  .inputValidator(ProductSchema)
  .handler(async ({ data }) => insertProduct(data))

export const updateProduct = createServerFn({ method: 'POST' })
  .inputValidator(UpdateProductSchema)
  .handler(async ({ data }) => editProduct(data))

export const deleteProduct = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => removeProduct(data.id))

export const createStockAdjustment = createServerFn({ method: 'POST' })
  .inputValidator(StockAdjustmentSchema)
  .handler(async ({ data }) => adjustStock(data))

export const getMovements = createServerFn({ method: 'GET' })
  .inputValidator((data: { productId: number }) => data)
  .handler(async ({ data }) => listMovements(data.productId))
