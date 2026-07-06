import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '../lib/format'
import type { CatalogCategory, CatalogCategoryInput, CatalogProductInput, Product, ProductExtra, ProductOption, RepositoryStatus } from '../types'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

function isImageUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')
}

function parseExtras(raw: string): ProductExtra[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, priceRaw] = line.split('|').map((segment) => segment.trim())
      return {
        id: crypto.randomUUID() + index,
        name,
        price: Number(priceRaw ?? 0) || 0,
      }
    })
}

function parseOptions(raw: string): ProductOption[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: `${label}-${index}`,
      label,
    }))
}

function extrasToText(extras?: ProductExtra[]) {
  return (extras ?? []).map((extra) => `${extra.name}|${extra.price}`).join('\n')
}

function optionsToText(options?: ProductOption[]) {
  return (options ?? []).map((option) => option.label).join('\n')
}

function emptyCategoryForm(): CatalogCategoryInput {
  return { name: '', subtitle: '', emoji: 'TAG' }
}

function emptyProductForm(categoryId = '') {
  return {
    categoryId,
    name: '',
    description: '',
    price: '',
    image: '🍔',
    badge: '',
    extrasText: '',
    optionsText: '',
  }
}

export function AdminView({
  categories,
  products,
  status,
  onInitializeDemoCatalog,
  onCreateCategory,
  onUpdateCategory,
  onSetCategoryVisibility,
  onSetCategoryActive,
  onDeleteCategory,
  onMoveCategory,
  onCreateProduct,
  onUpdateProduct,
  onSetProductVisibility,
  onSetProductActive,
  onSetProductAvailability,
  onDeleteProduct,
  onMoveProduct,
}: {
  categories: CatalogCategory[]
  products: Product[]
  status: RepositoryStatus
  onInitializeDemoCatalog: () => Promise<boolean>
  onCreateCategory: (input: CatalogCategoryInput) => Promise<void>
  onUpdateCategory: (categoryId: string, updates: Partial<CatalogCategoryInput>) => Promise<void>
  onSetCategoryVisibility: (categoryId: string, isVisible: boolean) => Promise<void>
  onSetCategoryActive: (categoryId: string, isActive: boolean) => Promise<void>
  onDeleteCategory: (categoryId: string) => Promise<void>
  onMoveCategory: (categoryId: string, direction: 'up' | 'down') => Promise<void>
  onCreateProduct: (input: CatalogProductInput) => Promise<void>
  onUpdateProduct: (productId: string, updates: Partial<CatalogProductInput>) => Promise<void>
  onSetProductVisibility: (productId: string, isVisible: boolean) => Promise<void>
  onSetProductActive: (productId: string, isActive: boolean) => Promise<void>
  onSetProductAvailability: (productId: string, availability: Product['availability']) => Promise<void>
  onDeleteProduct: (productId: string) => Promise<void>
  onMoveProduct: (productId: string, direction: 'up' | 'down') => Promise<void>
}) {
  // Silenciar advertencias de TypeScript para props no utilizadas requeridas por el padre
  if (false as boolean) {
    console.log(onInitializeDemoCatalog, onSetProductActive)
  }

  const orderedCategories = useMemo(() => [...categories].sort((left, right) => left.sortOrder - right.sortOrder), [categories])
  const orderedProducts = useMemo(() => [...products].sort((left, right) => left.sortOrder - right.sortOrder), [products])
  const [categoryForm, setCategoryForm] = useState<CatalogCategoryInput>(emptyCategoryForm())
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState(() => emptyProductForm(orderedCategories[0]?.id ?? ''))
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  
  // Estados para pestañas y formularios
  const [activeAdminTab, setActiveAdminTab] = useState<'products' | 'categories'>('products')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  useEffect(() => {
    if (!productForm.categoryId && orderedCategories.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductForm((current) => ({
        ...current,
        categoryId: orderedCategories[0].id,
      }))
    }
  }, [orderedCategories, productForm.categoryId])
  const [confirmState, setConfirmState] = useState<null | {
    title: string
    body: string
    confirmLabel: string
    tone?: 'primary' | 'success'
    onConfirm: () => Promise<void>
  }>(null)

  const groupedProducts = orderedCategories.map((category) => ({
    category,
    products: orderedProducts.filter((product) => product.categoryId === category.id),
  }))

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategoryForm())
    setEditingCategoryId(null)
  }

  const resetProductForm = () => {
    setProductForm(emptyProductForm(orderedCategories[0]?.id ?? ''))
    setEditingProductId(null)
  }

  const openConfirm = (config: NonNullable<typeof confirmState>) => setConfirmState(config)

  return (
    <section className="space-y-5">
      <Panel className="border-white/80 bg-white/68 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Administracion</p>
            <h2 className="mt-2 font-serif text-4xl text-ink">Catalogo premium editable sin tocar codigo</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Crea, ordena, oculta y reactiva categorias o productos. Los cambios se reflejan al instante en Caja.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/80 bg-panel/90 p-4 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Sincronizacion catalogo</div>
            <div className="mt-2 text-lg font-semibold text-ink">{status.label}</div>
            <div className="mt-1 text-sm text-muted">{status.detail}</div>
          </div>
        </div>
      </Panel>      {/* Selector de Pestañas de Administración */}
      <div className="flex gap-2 bg-white/60 p-1.5 rounded-2xl border border-white/80 shadow-insetSoft max-w-md">
        <button
          type="button"
          className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider transition ${
            activeAdminTab === 'products'
              ? 'bg-ink text-white shadow-card'
              : 'text-muted hover:text-ink'
          }`}
          onClick={() => {
            setActiveAdminTab('products')
            resetProductForm()
            setShowProductForm(false)
          }}
        >
          PRODUCTOS
        </button>
        <button
          type="button"
          className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider transition ${
            activeAdminTab === 'categories'
              ? 'bg-ink text-white shadow-card'
              : 'text-muted hover:text-ink'
          }`}
          onClick={() => {
            setActiveAdminTab('categories')
            resetCategoryForm()
            setShowCategoryForm(false)
          }}
        >
          CATEGORÍAS
        </button>
      </div>

      {/* PESTAÑA: PRODUCTOS */}
      {activeAdminTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-ink">Catálogo de Productos</h3>
              <p className="text-xs text-muted">Añade, edita, ordena y cambia la disponibilidad del menú.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                resetProductForm()
                setShowProductForm(!showProductForm)
              }}
            >
              <Plus size={14} />
              {showProductForm ? 'Cerrar Formulario' : 'Nuevo Producto'}
            </Button>
          </div>

          {/* Formulario de Producto (Crear / Editar) */}
          {(showProductForm || editingProductId) && (
            <Panel className="bg-white p-5 border border-line rounded-2xl max-w-2xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-sm font-black text-ink uppercase tracking-wider">
                {editingProductId ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Nombre</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. Classic Cheese"
                    value={productForm.name}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, name: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Precio (Bs)</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. 45"
                    value={productForm.price}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, price: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Categoría</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    value={productForm.categoryId}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, categoryId: event.target.value }))}
                  >
                    {orderedCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Visual (Emoji o Imagen URL)</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. 🍔 o http://..."
                    value={productForm.image}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, image: event.target.value }))}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Descripción Corta</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. Doble carne, doble queso cheddar fundido"
                    value={productForm.description}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, description: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Etiqueta (Badge - Opcional)</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. Recomendado, Hot"
                    value={productForm.badge}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, badge: event.target.value }))}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Ingredientes Adicionales / Extras (Uno por línea)</span>
                  <textarea
                    className="mt-1 w-full min-h-16 rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent font-mono"
                    placeholder="Formato: Nombre|Precio (ej: Bacon|5 o Queso Cheddar|3)"
                    value={productForm.extrasText}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, extrasText: event.target.value }))}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Opciones de Preparación / Modificadores (Uno por línea)</span>
                  <textarea
                    className="mt-1 w-full min-h-16 rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent font-mono"
                    placeholder="Formato: Nombre opción (ej: Sin Cebolla o Té de Limón)"
                    value={productForm.optionsText}
                    onChange={(event) => setProductForm((curr) => ({ ...curr, optionsText: event.target.value }))}
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!productForm.name.trim() || !productForm.price.trim()) return

                    const payload = {
                      categoryId: productForm.categoryId,
                      name: productForm.name.trim(),
                      description: productForm.description.trim(),
                      price: Number(productForm.price) || 0,
                      image: productForm.image || '🍔',
                      badge: productForm.badge,
                      extras: parseExtras(productForm.extrasText),
                      options: parseOptions(productForm.optionsText),
                    }

                    if (editingProductId) {
                      await onUpdateProduct(editingProductId, payload)
                    } else {
                      await onCreateProduct(payload)
                    }

                    resetProductForm()
                    setShowProductForm(false)
                  }}
                >
                  {editingProductId ? 'Guardar Cambios' : 'Crear Producto'}
                </Button>
                <Button
                  size="sm"
                  tone="secondary"
                  onClick={() => {
                    resetProductForm()
                    setShowProductForm(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </Panel>
          )}

          {/* Listado de Productos agrupados por Categoría */}
          <div className="space-y-4">
            {groupedProducts.map(({ category, products: groupProducts }) => (
              <div key={category.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-line pb-2">
                  <span className="text-sm font-black text-ink">{category.emoji} {category.name.toUpperCase()}</span>
                  <span className="text-[10px] text-muted font-bold bg-panel px-2 py-0.5 rounded">{groupProducts.length} productos</span>
                </div>

                <div className="divide-y divide-line">
                  {groupProducts.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted font-medium">No hay productos en esta categoría.</div>
                  ) : (
                    groupProducts.map((product) => (
                      <div key={product.id} className="py-3 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3">
                          {isImageUrl(product.image) ? (
                            <img alt={product.name} className="h-11 w-11 rounded-lg object-cover shrink-0" src={product.image} />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accentWash text-xl shrink-0">{product.image}</div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-ink">{product.name}</div>
                            <div className="text-[10px] text-muted line-clamp-1">{product.description || 'Sin descripción'}</div>
                            <div className="text-xs font-black text-amber-500 mt-0.5">{formatCurrency(product.price)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                            onClick={() => onMoveProduct(product.id, 'up')}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                            onClick={() => onMoveProduct(product.id, 'down')}
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                            onClick={() => {
                              setEditingProductId(product.id)
                              setProductForm({
                                categoryId: product.categoryId,
                                name: product.name,
                                description: product.description ?? '',
                                price: String(product.price),
                                image: product.image,
                                badge: product.badge ?? '',
                                extrasText: extrasToText(product.extras),
                                optionsText: optionsToText(product.options),
                              })
                              setShowProductForm(true)
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                            onClick={() => onSetProductVisibility(product.id, !product.isVisible)}
                          >
                            {product.isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            type="button"
                            className={`p-1.5 border rounded-lg transition ${
                              product.availability === 'soldout'
                                ? 'bg-red-50 border-red-200 text-red-600'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}
                            onClick={() =>
                              openConfirm({
                                title: product.availability === 'soldout' ? 'Marcar disponible' : 'Marcar agotado',
                                body: `El producto ${product.name} cambiará su disponibilidad inmediata.`,
                                confirmLabel: product.availability === 'soldout' ? 'Habilitar' : 'Agotar',
                                onConfirm: () => onSetProductAvailability(product.id, product.availability === 'soldout' ? 'available' : 'soldout'),
                              })
                            }
                          >
                            <Power size={12} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition"
                            onClick={() =>
                              openConfirm({
                                title: 'Eliminar producto',
                                body: `¿Está seguro de eliminar ${product.name}?`,
                                confirmLabel: 'Eliminar',
                                onConfirm: () => onDeleteProduct(product.id),
                              })
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: CATEGORÍAS */}
      {activeAdminTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-ink">Categorías de Menú</h3>
              <p className="text-xs text-muted">Añade, edita, ordena y controla la visualización de las categorías.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                resetCategoryForm()
                setShowCategoryForm(!showCategoryForm)
              }}
            >
              <Plus size={14} />
              {showCategoryForm ? 'Cerrar Formulario' : 'Nueva Categoría'}
            </Button>
          </div>

          {/* Formulario de Categoría */}
          {(showCategoryForm || editingCategoryId) && (
            <Panel className="bg-white p-5 border border-line rounded-2xl max-w-md space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-sm font-black text-ink uppercase tracking-wider">
                {editingCategoryId ? 'Editar Categoría' : 'Crear Nueva Categoría'}
              </h4>
              <div className="grid gap-3">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Nombre</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. Raza Brangus"
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm((curr) => ({ ...curr, name: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Subtítulo</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. Hamburguesas premium de raza"
                    value={categoryForm.subtitle}
                    onChange={(event) => setCategoryForm((curr) => ({ ...curr, subtitle: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Emoji o Clave de Icono</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    placeholder="Ej. 🍔"
                    value={categoryForm.emoji}
                    onChange={(event) => setCategoryForm((curr) => ({ ...curr, emoji: event.target.value || 'TAG' }))}
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!categoryForm.name.trim()) return

                    if (editingCategoryId) {
                      await onUpdateCategory(editingCategoryId, categoryForm)
                    } else {
                      await onCreateCategory(categoryForm)
                    }

                    resetCategoryForm()
                    setShowCategoryForm(false)
                  }}
                >
                  {editingCategoryId ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
                <Button
                  size="sm"
                  tone="secondary"
                  onClick={() => {
                    resetCategoryForm()
                    setShowCategoryForm(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </Panel>
          )}

          {/* Listado de Categorías */}
          <div className="space-y-3">
            {orderedCategories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-8 text-center text-xs text-muted font-semibold bg-white/40">
                No hay categorías de menú creadas.
              </div>
            ) : (
              orderedCategories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accentWash text-xl shrink-0">
                      {category.emoji}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">{category.name}</div>
                      <div className="text-[10px] text-muted">{category.subtitle || 'Sin subtítulo'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                      onClick={() => onMoveCategory(category.id, 'up')}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                      onClick={() => onMoveCategory(category.id, 'down')}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                      onClick={() => {
                        setEditingCategoryId(category.id)
                        setCategoryForm({
                          name: category.name,
                          subtitle: category.subtitle ?? '',
                          emoji: category.emoji,
                        })
                        setShowCategoryForm(true)
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 border border-line rounded-lg text-muted hover:text-ink transition hover:bg-panel"
                      onClick={() => onSetCategoryVisibility(category.id, !category.isVisible)}
                    >
                      {category.isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      type="button"
                      className={`p-1.5 border rounded-lg transition ${
                        category.isActive
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-red-50 border-red-200 text-red-600'
                      }`}
                      onClick={() =>
                        openConfirm({
                          title: category.isActive ? 'Desactivar categoría' : 'Activar categoría',
                          body: `La categoría ${category.name} cambiará su estado operativo.`,
                          confirmLabel: category.isActive ? 'Desactivar' : 'Activar',
                          onConfirm: () => onSetCategoryActive(category.id, !category.isActive),
                        })
                      }
                    >
                      <Power size={12} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition"
                      onClick={() =>
                        openConfirm({
                          title: 'Eliminar categoría',
                          body: `Se eliminará ${category.name} junto con sus productos asociados.`,
                          confirmLabel: 'Eliminar',
                          onConfirm: () => onDeleteCategory(category.id),
                        })
                      }
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        body={confirmState?.body ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirmar'}
        tone={confirmState?.tone ?? 'primary'}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) {
            return
          }

          await confirmState.onConfirm()
          setConfirmState(null)
        }}
      />
    </section>
  )
}
