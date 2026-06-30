import { ArrowDown, ArrowUp, Eye, EyeOff, PackageOpen, Pencil, Plus, Power, Trash2 } from 'lucide-react'
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
  const orderedCategories = useMemo(() => [...categories].sort((left, right) => left.sortOrder - right.sortOrder), [categories])
  const orderedProducts = useMemo(() => [...products].sort((left, right) => left.sortOrder - right.sortOrder), [products])
  const [categoryForm, setCategoryForm] = useState<CatalogCategoryInput>(emptyCategoryForm())
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState(() => emptyProductForm(orderedCategories[0]?.id ?? ''))
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

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
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <Panel className="border-white/85 bg-white/78 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-ink">Categorias</h3>
              <p className="text-sm text-muted">Orden simple, visibilidad y activacion en un solo panel.</p>
            </div>
            <div className="rounded-full bg-accentWash px-3 py-2 text-xs font-semibold text-accent">{orderedCategories.length} activas</div>
          </div>

          {orderedCategories.length === 0 && orderedProducts.length === 0 ? (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-lineStrong bg-canvas/55 p-5">
              <div className="text-sm font-semibold text-ink">Firestore todavia no tiene catalogo.</div>
              <p className="mt-2 text-sm leading-7 text-muted">
                Puedes inicializar una sola vez los datos demo actuales. No sobrescribira datos si ya existen categorias o productos.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() =>
                    openConfirm({
                      title: 'Inicializar catalogo demo',
                      body: 'Se cargaran las categorias y productos demo solo si Firestore sigue vacio.',
                      confirmLabel: 'Inicializar catalogo',
                      tone: 'success',
                      onConfirm: async () => {
                        await onInitializeDemoCatalog()
                      },
                    })
                  }
                >
                  <Plus size={16} />
                  Inicializar catalogo
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {orderedCategories.map((category) => (
              <div key={category.id} className="rounded-[1.4rem] border border-line bg-panel/75 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accentWash text-sm font-bold tracking-[0.18em] text-accent">
                      {category.emoji}
                    </div>
                    <div>
                      <div className="font-semibold text-ink">{category.name}</div>
                      <div className="text-sm text-muted">{category.subtitle || 'Sin subtitulo'}</div>
                      <div className="mt-1 text-xs text-muted">
                        {category.isActive ? 'Activa' : 'Desactivada'} / {category.isVisible ? 'Visible' : 'Oculta'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" tone="secondary" onClick={() => onMoveCategory(category.id, 'up')}>
                      <ArrowUp size={14} />
                    </Button>
                    <Button size="sm" tone="secondary" onClick={() => onMoveCategory(category.id, 'down')}>
                      <ArrowDown size={14} />
                    </Button>
                    <Button
                      size="sm"
                      tone="secondary"
                      onClick={() => {
                        setEditingCategoryId(category.id)
                        setCategoryForm({
                          name: category.name,
                          subtitle: category.subtitle ?? '',
                          emoji: category.emoji,
                        })
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button size="sm" tone="secondary" onClick={() => onSetCategoryVisibility(category.id, !category.isVisible)}>
                      {category.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      size="sm"
                      tone="secondary"
                      onClick={() =>
                        openConfirm({
                          title: category.isActive ? 'Desactivar categoria' : 'Activar categoria',
                          body: `La categoria ${category.name} cambiara su estado operativo.`,
                          confirmLabel: category.isActive ? 'Desactivar' : 'Activar',
                          onConfirm: () => onSetCategoryActive(category.id, !category.isActive),
                        })
                      }
                    >
                      <Power size={14} />
                    </Button>
                    <Button
                      size="sm"
                      tone="secondary"
                      onClick={() =>
                        openConfirm({
                          title: 'Eliminar categoria',
                          body: `Se eliminara ${category.name} junto con sus productos asociados.`,
                          confirmLabel: 'Eliminar',
                          onConfirm: () => onDeleteCategory(category.id),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {editingCategoryId ? 'Editar categoria' : 'Nueva categoria'}
            </div>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Nombre"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Subtitulo"
                value={categoryForm.subtitle}
                onChange={(event) => setCategoryForm((current) => ({ ...current, subtitle: event.target.value }))}
              />
              <input
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Emoji o clave corta"
                value={categoryForm.emoji}
                onChange={(event) => setCategoryForm((current) => ({ ...current, emoji: event.target.value || 'TAG' }))}
              />
              <div className="flex gap-3">
                <Button
                  onClick={async () => {
                    if (!categoryForm.name.trim()) {
                      return
                    }

                    if (editingCategoryId) {
                      await onUpdateCategory(editingCategoryId, categoryForm)
                    } else {
                      await onCreateCategory(categoryForm)
                    }

                    resetCategoryForm()
                  }}
                >
                  {editingCategoryId ? <Pencil size={16} /> : <Plus size={16} />}
                  {editingCategoryId ? 'Guardar categoria' : 'Crear categoria'}
                </Button>
                {(editingCategoryId || categoryForm.name || categoryForm.subtitle) ? (
                  <Button tone="secondary" onClick={resetCategoryForm}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="border-white/85 bg-white/78 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-ink">Productos</h3>
              <p className="text-sm text-muted">Disponibilidad, agotado rapido, extras y modificadores desde un mismo lugar.</p>
            </div>
            <div className="rounded-full bg-accentWash px-3 py-2 text-xs font-semibold text-accent">{orderedProducts.length} productos</div>
          </div>

          <div className="mt-5 space-y-5">
            {groupedProducts.map(({ category, products: groupProducts }) => (
              <div key={category.id} className="rounded-[1.6rem] border border-line bg-panel/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{category.emoji}</div>
                    <div className="text-lg font-semibold text-ink">{category.name}</div>
                  </div>
                  <div className="text-sm text-muted">{groupProducts.length} productos</div>
                </div>

                <div className="space-y-3">
                  {groupProducts.map((product) => (
                    <div key={product.id} className="rounded-[1.35rem] border border-line bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {isImageUrl(product.image) ? (
                            <img alt={product.name} className="h-16 w-16 rounded-[1rem] object-cover" src={product.image} />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-[1rem] bg-accentWash text-3xl">{product.image}</div>
                          )}
                          <div>
                            <div className="font-semibold text-ink">{product.name}</div>
                            <div className="mt-1 text-sm text-muted">{product.description || 'Sin descripcion'}</div>
                            <div className="mt-2 text-sm font-semibold text-ink">{formatCurrency(product.price)}</div>
                            <div className="mt-2 text-xs text-muted">
                              {product.availability === 'soldout' ? 'Agotado' : 'Disponible'} / {product.isVisible ? 'Visible' : 'Oculto'} /{' '}
                              {product.isActive ? 'Activo' : 'Desactivado'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" tone="secondary" onClick={() => onMoveProduct(product.id, 'up')}>
                            <ArrowUp size={14} />
                          </Button>
                          <Button size="sm" tone="secondary" onClick={() => onMoveProduct(product.id, 'down')}>
                            <ArrowDown size={14} />
                          </Button>
                          <Button
                            size="sm"
                            tone="secondary"
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
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button size="sm" tone="secondary" onClick={() => onSetProductVisibility(product.id, !product.isVisible)}>
                            {product.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </Button>
                          <Button
                            size="sm"
                            tone="secondary"
                            onClick={() =>
                              openConfirm({
                                title: product.availability === 'soldout' ? 'Marcar disponible' : 'Marcar agotado',
                                body: `El producto ${product.name} ${product.availability === 'soldout' ? 'volvera a Caja' : 'dejara de mostrarse en Caja temporalmente'}.`,
                                confirmLabel: product.availability === 'soldout' ? 'Disponible' : 'Agotado',
                                tone: 'success',
                                onConfirm: () => onSetProductAvailability(product.id, product.availability === 'soldout' ? 'available' : 'soldout'),
                              })
                            }
                          >
                            <PackageOpen size={14} />
                            {product.availability === 'soldout' ? 'Disponible' : 'Agotado'}
                          </Button>
                          <Button
                            size="sm"
                            tone="secondary"
                            onClick={() =>
                              openConfirm({
                                title: product.isActive ? 'Desactivar producto' : 'Activar producto',
                                body: `${product.name} cambiara su estado operativo.`,
                                confirmLabel: product.isActive ? 'Desactivar' : 'Activar',
                                onConfirm: () => onSetProductActive(product.id, !product.isActive),
                              })
                            }
                          >
                            <Power size={14} />
                          </Button>
                          <Button
                            size="sm"
                            tone="secondary"
                            onClick={() =>
                              openConfirm({
                                title: 'Eliminar producto',
                                body: `Se eliminara ${product.name} del catalogo.`,
                                confirmLabel: 'Eliminar',
                                onConfirm: () => onDeleteProduct(product.id),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {groupProducts.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-lineStrong bg-canvas/55 p-4 text-center text-sm text-muted">
                      Sin productos cargados en esta categoria.
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {editingProductId ? 'Editar producto' : 'Nuevo producto'}
            </div>
            <div className="mt-4 grid gap-3">
              <select
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                value={productForm.categoryId}
                onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}
              >
                {orderedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Nombre"
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Precio"
                inputMode="decimal"
                value={productForm.price}
                onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
              />
              <input
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Emoji o URL de imagen"
                value={productForm.image}
                onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))}
              />
              <input
                className="rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Badge opcional"
                value={productForm.badge}
                onChange={(event) => setProductForm((current) => ({ ...current, badge: event.target.value }))}
              />
              <textarea
                className="min-h-20 rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Descripcion corta"
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
              />
              <textarea
                className="min-h-20 rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder={'Extras con precio, una linea por item. Ej:\nQueso extra|5\nTocino|8'}
                value={productForm.extrasText}
                onChange={(event) => setProductForm((current) => ({ ...current, extrasText: event.target.value }))}
              />
              <textarea
                className="min-h-20 rounded-[1rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder={'Modificadores sin costo, una linea por item. Ej:\nSin cebolla\nCortar a la mitad'}
                value={productForm.optionsText}
                onChange={(event) => setProductForm((current) => ({ ...current, optionsText: event.target.value }))}
              />
              <div className="flex gap-3">
                <Button
                  onClick={async () => {
                    if (!productForm.name.trim() || !productForm.categoryId) {
                      return
                    }

                    const payload: CatalogProductInput = {
                      categoryId: productForm.categoryId,
                      name: productForm.name,
                      description: productForm.description,
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
                  }}
                >
                  {editingProductId ? <Pencil size={16} /> : <Plus size={16} />}
                  {editingProductId ? 'Guardar producto' : 'Crear producto'}
                </Button>
                {(editingProductId || productForm.name || productForm.description) ? (
                  <Button tone="secondary" onClick={resetProductForm}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>
      </div>

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
