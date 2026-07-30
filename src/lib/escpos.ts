import type { Order } from '../types'

/**
 * Ticket como comandos ESC/POS, enviado a RawBT.
 *
 * Imprimir la pagina desde el navegador manda una IMAGEN a la impresora, y por eso no se puede
 * cortar el papel: el corte no es parte de la imagen, es un comando. Aca se arma el ticket como
 * comandos de impresora (igual que hace Loyverse) y se le pasa a RawBT directamente. Con eso
 * salen las tres cosas que faltaban: corte automatico, impresion sin dialogo y control del
 * formato desde el codigo.
 *
 * Formato del enlace, tomado de la libreria escpos-php (mike42):
 *   intent:base64,<datos>#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;
 */

/** Papel de 80 mm: 48 caracteres por linea en la tipografia normal. */
export const ANCHO_TICKET = 48

const ESC = 0x1b
const GS = 0x1d

/**
 * Las impresoras no entienden UTF-8: usan tablas de un byte. Se elige CP850, que tiene las
 * vocales acentuadas y la ñ (importante: hay productos como "Piña"). Sin esto salen simbolos
 * raros en vez de las tildes.
 */
const CP850: Record<string, number> = {
  'á': 0xa0, 'é': 0x82, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3,
  'Á': 0xb5, 'É': 0x90, 'Í': 0xd6, 'Ó': 0xe0, 'Ú': 0xe9,
  'ñ': 0xa4, 'Ñ': 0xa5, 'ü': 0x81, 'Ü': 0x9a,
  '¿': 0xa8, '¡': 0xad, '°': 0xf8, 'º': 0xa7, 'ª': 0xa6,
}

function codificar(texto: string): number[] {
  const bytes: number[] = []
  for (const caracter of texto) {
    const mapeado = CP850[caracter]
    if (mapeado !== undefined) {
      bytes.push(mapeado)
      continue
    }
    const codigo = caracter.charCodeAt(0)
    // Cualquier cosa fuera de la tabla se reemplaza por un espacio en vez de imprimir basura.
    bytes.push(codigo < 128 ? codigo : 0x20)
  }
  return bytes
}

class Ticket {
  private bytes: number[] = []

  iniciar() {
    this.bytes.push(ESC, 0x40) // ESC @ : reinicia la impresora
    this.bytes.push(ESC, 0x74, 0x02) // ESC t 2 : tabla de caracteres CP850
    return this
  }

  alinear(donde: 'izquierda' | 'centro' | 'derecha') {
    const valor = donde === 'centro' ? 1 : donde === 'derecha' ? 2 : 0
    this.bytes.push(ESC, 0x61, valor)
    return this
  }

  negrita(activar: boolean) {
    this.bytes.push(ESC, 0x45, activar ? 1 : 0)
    return this
  }

  /** Letra al doble de alto y ancho, para el numero de pedido. */
  doble(activar: boolean) {
    this.bytes.push(GS, 0x21, activar ? 0x11 : 0x00)
    return this
  }

  linea(texto = '') {
    this.bytes.push(...codificar(texto), 0x0a)
    return this
  }

  separador(caracter = '-') {
    return this.linea(caracter.repeat(ANCHO_TICKET))
  }

  /** Texto a la izquierda y valor a la derecha, rellenando el medio con espacios. */
  filaDoble(izquierda: string, derecha: string) {
    const espacio = ANCHO_TICKET - derecha.length
    const recortada = izquierda.length > espacio ? izquierda.slice(0, Math.max(0, espacio - 1)) : izquierda
    const relleno = ' '.repeat(Math.max(1, ANCHO_TICKET - recortada.length - derecha.length))
    return this.linea(`${recortada}${relleno}${derecha}`)
  }

  /** Parte un texto largo en varias lineas sin cortar palabras al medio. */
  parrafo(texto: string, sangria = 0) {
    const disponible = ANCHO_TICKET - sangria
    const palabras = texto.split(/\s+/).filter(Boolean)
    let actual = ''
    for (const palabra of palabras) {
      if (actual && (actual + ' ' + palabra).length > disponible) {
        this.linea(' '.repeat(sangria) + actual)
        actual = palabra
      } else {
        actual = actual ? `${actual} ${palabra}` : palabra
      }
    }
    if (actual) this.linea(' '.repeat(sangria) + actual)
    return this
  }

  avanzar(lineas = 1) {
    this.bytes.push(ESC, 0x64, lineas)
    return this
  }

  /** Avanza hasta la cuchilla y corta. Es lo que faltaba imprimiendo desde el navegador. */
  cortar() {
    this.bytes.push(GS, 0x56, 0x42, 0x00)
    return this
  }

  aBase64() {
    const datos = new Uint8Array(this.bytes)
    let binario = ''
    const bloque = 0x8000
    for (let i = 0; i < datos.length; i += bloque) {
      binario += String.fromCharCode(...datos.subarray(i, i + bloque))
    }
    return btoa(binario)
  }
}

function precio(valor: number) {
  return `Bs ${valor}`
}

function describirEntrega(order: Order) {
  if (order.fulfillmentType === 'table') return `Mesa: ${order.tableInfo || 'N/D'}`
  if (order.fulfillmentType === 'pickup') return 'Retiro en Local'
  return 'Delivery'
}

function listarExtras(extras: Array<{ name: string }>) {
  const cuenta = new Map<string, number>()
  extras.forEach((extra) => cuenta.set(extra.name, (cuenta.get(extra.name) ?? 0) + 1))
  return Array.from(cuenta.entries())
    .map(([nombre, veces]) => (veces > 1 ? `${nombre} (x${veces})` : nombre))
    .join(', ')
}

function encabezado(t: Ticket, order: Order, titulo?: string) {
  t.alinear('centro')
  if (titulo) t.negrita(true).linea(titulo).negrita(false)
  t.doble(true).negrita(true).linea(order.displayNumber).negrita(false).doble(false)
  t.alinear('izquierda').separador()
  t.linea(`Fecha:   ${new Date(order.createdAt).toLocaleString('es-BO')}`)
  t.linea(`Cliente: ${order.customerName || 'Cliente General'}`)
  t.linea(`Entrega: ${describirEntrega(order)}`)
  if (order.customerPhone) t.linea(`Telefono: ${order.customerPhone}`)
  if (order.fulfillmentType === 'delivery' && order.deliveryAddress) {
    t.parrafo(`Direccion: ${order.deliveryAddress}`)
  }
  t.separador()
}

/** El que se lleva el cliente: con precios y total. */
export function ticketClienteBase64(order: Order) {
  const t = new Ticket().iniciar()
  encabezado(t, order)

  order.items.forEach((item) => {
    t.filaDoble(`${item.quantity}x ${item.name}`, precio(item.lineTotal))
    if (item.modifiers.extras.length) t.parrafo(`+ ${listarExtras(item.modifiers.extras)}`, 3)
    if (item.modifiers.options.length) t.parrafo(`+ ${item.modifiers.options.join(', ')}`, 3)
    if (item.modifiers.note) t.parrafo(`Obs: ${item.modifiers.note}`, 3)
  })

  t.separador()
  t.negrita(true).filaDoble('TOTAL', precio(order.total)).negrita(false)
  t.linea(`Pago:   ${order.payment?.method === 'qr' ? 'QR' : order.payment?.method === 'mixed' ? 'Mixto' : 'Efectivo'}`)
  t.linea(`Estado: ${order.paymentStatus === 'paid' ? 'PAGADO' : order.paymentStatus === 'gift' ? 'REGALO' : 'PENDIENTE DE PAGO'}`)
  t.separador()
  t.alinear('centro').linea('Gracias por su preferencia!')
  t.avanzar(3).cortar()

  return t.aBase64()
}

/** El de cocina: sin precios, con los extras y las observaciones bien visibles. */
export function ticketCocinaBase64(order: Order) {
  const t = new Ticket().iniciar()
  encabezado(t, order, 'COCINA')

  order.items.forEach((item) => {
    t.doble(true).negrita(true).linea(`${item.quantity}x ${item.name}`).negrita(false).doble(false)
    if (item.modifiers.extras.length) t.parrafo(`EXTRAS: ${listarExtras(item.modifiers.extras)}`, 3)
    if (item.modifiers.options.length) t.parrafo(`OPCION: ${item.modifiers.options.join(', ')}`, 3)
    if (item.modifiers.note) {
      t.negrita(true).parrafo(`** ${item.modifiers.note.toUpperCase()} **`, 3).negrita(false)
    }
    t.linea()
  })

  t.separador()
  t.avanzar(3).cortar()

  return t.aBase64()
}

/**
 * Manda el ticket a RawBT. Devuelve false si el navegador no pudo abrir la app, para que quien
 * llame pueda caer a la impresion normal del navegador.
 */
export function enviarARawBt(base64: string) {
  try {
    // El base64 va TAL CUAL, sin codificar. Se probo codificandolo (por miedo a que el "+" se
    // leyera como espacio) y RawBT respondio "Wrong base64": la direccion de un intent no se
    // interpreta como formulario, asi que el "+" viaja bien y codificarlo es justamente lo que
    // rompe los datos. Es la misma forma que usa la libreria escpos-php.
    const enlace = `intent:base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`

    // Se dispara desde un marco oculto en vez de cambiar la direccion de la pagina. Navegando
    // directo, el navegador descarga la pagina para abrir la app y al volver la recarga: por eso
    // el sistema insistia en abrir RawBT una y otra vez.
    const marco = document.createElement('iframe')
    marco.style.display = 'none'
    marco.src = enlace
    document.body.appendChild(marco)
    window.setTimeout(() => marco.remove(), 3000)
    return true
  } catch {
    return false
  }
}

/** RawBT es una app de Android; en PC no existe y hay que imprimir por el navegador. */
export function esAndroid() {
  return /android/i.test(navigator.userAgent)
}

const CLAVE_MODO = 'modo-impresion'

export type ModoImpresion = 'rawbt' | 'navegador'

export function modoImpresion(): ModoImpresion {
  try {
    const guardado = window.localStorage.getItem(CLAVE_MODO)
    if (guardado === 'rawbt' || guardado === 'navegador') return guardado
  } catch {
    // Sin acceso al almacenamiento se decide por el dispositivo.
  }
  // Por defecto, la impresion del navegador: es la que esta comprobada que funciona. RawBT se
  // activa a mano desde el interruptor, para que un problema con esa app no deje al local sin
  // imprimir.
  return 'navegador'
}

export function guardarModoImpresion(modo: ModoImpresion) {
  try {
    window.localStorage.setItem(CLAVE_MODO, modo)
  } catch {
    // Si no se puede guardar, igual funciona: solo no se recuerda al recargar.
  }
}
