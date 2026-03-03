import { apiGet, apiPost, apiDelete } from './client.js'

export async function getCategories() {
  const data = await apiGet('/categories')
  let raw = data

  if (Array.isArray(raw)) {
    // ok
  } else if (raw && Array.isArray(raw.data)) {
    raw = raw.data
  } else if (raw && Array.isArray(raw.categories)) {
    raw = raw.categories
  } else {
    raw = []
  }

  return raw.map((item) => {
    const id = item.id ?? item.category_id ?? item.categoryId
    const name = item.name ?? item.category_name ?? item.categoryName
    const type = item.type ?? item.category_type ?? item.categoryType
    return { id, name, type }
  })
}

export async function createCategory({ name, type }) {
  if (!name || !type) {
    throw new Error('Category name and type are required.')
  }
  const payload = { name, type }
  return apiPost('/categories', payload)
}

export async function deleteCategory(id) {
  if (!id) {
    throw new Error('Category id is required.')
  }
  return apiDelete(`/categories/${id}`)
}

