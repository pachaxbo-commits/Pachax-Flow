export interface EscPosOptions {
  columnsPerLine: number
  paperWidth: '58mm' | '80mm'
  feedLinesEnd?: number
  cutSequenceHex?: string
  drawerPin?: 'pin2' | 'pin5'
  drawerOnTimeMs?: number
  drawerOffTimeMs?: number
}

// Controlled character transliteration map for ESC/POS thermal printers
const SPECIAL_CHAR_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  Á: 'A',
  É: 'E',
  Í: 'I',
  Ó: 'O',
  Ú: 'U',
  ñ: 'n',
  Ñ: 'N',
  ü: 'u',
  '¿': '',
  '¡': '',
}

export function transliterateText(text: string): string {
  if (!text) return ''
  return text.replace(/[áéíóúÁÉÍÓÚñÑüÜ¿¡]/g, (ch) => SPECIAL_CHAR_MAP[ch] || ch)
}

export function padLine(left: string, right: string, width: number): string {
  const cleanLeft = transliterateText(left)
  const cleanRight = transliterateText(right)
  const spacesCount = Math.max(1, width - (cleanLeft.length + cleanRight.length))
  return cleanLeft + ' '.repeat(spacesCount) + cleanRight
}

export function centerText(text: string, width: number): string {
  const clean = transliterateText(text)
  if (clean.length >= width) return clean.slice(0, width)
  const leftPadding = Math.floor((width - clean.length) / 2)
  return ' '.repeat(leftPadding) + clean
}

export class EscPosBuilder {
  private bytes: number[] = []

  constructor() {
    this.init()
  }

  init(): this {
    // ESC @ (Initialize printer)
    this.bytes.push(0x1b, 0x40)
    return this
  }

  alignLeft(): this {
    this.bytes.push(0x1b, 0x61, 0x00)
    return this
  }

  alignCenter(): this {
    this.bytes.push(0x1b, 0x61, 0x01)
    return this
  }

  alignRight(): this {
    this.bytes.push(0x1b, 0x61, 0x02)
    return this
  }

  bold(enable: boolean): this {
    this.bytes.push(0x1b, 0x45, enable ? 0x01 : 0x00)
    return this
  }

  doubleSize(enable: boolean): this {
    // GS ! n (0x11 = double width & height, 0x00 = normal)
    this.bytes.push(0x1d, 0x21, enable ? 0x11 : 0x00)
    return this
  }

  text(str: string): this {
    const clean = transliterateText(str)
    for (let i = 0; i < clean.length; i++) {
      this.bytes.push(clean.charCodeAt(i) & 0xff)
    }
    return this
  }

  line(str = ''): this {
    this.text(str)
    this.bytes.push(0x0a)
    return this
  }

  separator(width: number, char = '-'): this {
    this.line(char.repeat(width))
    return this
  }

  feed(lines = 3): this {
    this.bytes.push(0x1b, 0x64, lines)
    return this
  }

  cut(fullCut = true): this {
    // GS V m (0x00 full cut, 0x01 partial cut)
    this.bytes.push(0x1d, 0x56, fullCut ? 0x00 : 0x01)
    return this
  }

  kickCashDrawer(pin: 'pin2' | 'pin5' = 'pin2', t1 = 25, t2 = 250): this {
    // ESC p m t1 t2
    const m = pin === 'pin2' ? 0x00 : 0x01
    this.bytes.push(0x1b, 0x70, m, Math.min(255, t1), Math.min(255, t2))
    return this
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes)
  }
}
