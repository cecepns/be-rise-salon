/**
 * Web Bluetooth ESC/POS Thermal Printer Utility
 * Mendukung printer termal Bluetooth 58mm (32 karakter) & 80mm (48 karakter)
 */

const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE thermal printer
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Star / Epson / ESC/POS BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / generic BLE serial
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic thermal BLE printer
  '0000fff0-0000-1000-8000-00805f9b34fb', // Generic serial BLE
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / generic POS BLE
  '0000ae30-0000-1000-8000-00805f9b34fb', // Mini pocket thermal printer
  '0000af30-0000-1000-8000-00805f9b34fb',
  '0000abf0-0000-1000-8000-00805f9b34fb',
];

const PREFERRED_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000fff2-0000-1000-8000-00805f9b34fb',
];

let activeDevice = null;
let activeChar = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(getPrinterStatus()));

export const isBluetoothSupported = () =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator;

export const getPrinterStatus = () => ({
  connected: !!(activeDevice?.gatt?.connected && activeChar),
  name: activeDevice?.name || (activeDevice ? 'Printer Bluetooth' : null),
});

export const subscribePrinterStatus = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

async function findWritableChar(server) {
  const services = await server.getPrimaryServices();
  const candidates = [];

  for (const service of services) {
    try {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          candidates.push(ch);
        }
      }
    } catch {
      // Lewati service yang karakteristiknya tidak bisa dibaca
    }
  }

  if (!candidates.length) return null;
  const preferred = candidates.find((c) => PREFERRED_CHARS.includes(c.uuid.toLowerCase()));
  return preferred || candidates[0];
}

function handleDisconnect() {
  activeChar = null;
  notify();
}

/**
 * Scan perangkat Bluetooth dan sambungkan ke printer termal.
 * HARUS dipanggil langsung dari event klik pengguna (user gesture).
 */
export async function scanAndConnectPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge via HTTPS atau localhost.');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });

  if (activeDevice && activeDevice !== device) {
    activeDevice.removeEventListener('gattserverdisconnected', handleDisconnect);
    if (activeDevice.gatt?.connected) activeDevice.gatt.disconnect();
  }

  activeDevice = device;
  device.addEventListener('gattserverdisconnected', handleDisconnect);

  const server = await device.gatt.connect();
  const char = await findWritableChar(server);

  if (!char) {
    device.gatt.disconnect();
    activeDevice = null;
    activeChar = null;
    notify();
    throw new Error('Perangkat ini tidak memiliki layanan cetak Bluetooth (BLE GATT Write).');
  }

  activeChar = char;
  notify();
  return getPrinterStatus();
}

export function disconnectPrinter() {
  if (activeDevice) {
    activeDevice.removeEventListener('gattserverdisconnected', handleDisconnect);
    if (activeDevice.gatt?.connected) activeDevice.gatt.disconnect();
  }
  activeDevice = null;
  activeChar = null;
  notify();
}

async function ensureConnectedChar() {
  if (activeDevice?.gatt?.connected && activeChar) return activeChar;
  if (activeDevice?.gatt) {
    const server = await activeDevice.gatt.connect();
    const char = await findWritableChar(server);
    if (char) {
      activeChar = char;
      notify();
      return char;
    }
  }
  throw new Error('Printer belum terhubung. Silakan scan Bluetooth terlebih dahulu.');
}

async function writeBytes(bytes) {
  const char = await ensureConnectedChar();
  const useWithoutResp = !!char.properties.writeWithoutResponse;
  const chunkSize = useWithoutResp ? 20 : 64;
  const delayMs = useWithoutResp ? 20 : 10;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    if (useWithoutResp && char.writeValueWithoutResponse) {
      await char.writeValueWithoutResponse(chunk);
    } else if (char.writeValueWithResponse) {
      await char.writeValueWithResponse(chunk);
    } else {
      await char.writeValue(chunk);
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/* ---------- ESC/POS Builder ---------- */

const sanitizeAscii = (str) =>
  String(str ?? '')
    .replace(/[×]/g, 'x')
    .replace(/[−–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\n]/g, '');

const encodeText = (str) => {
  const clean = sanitizeAscii(str);
  const out = new Uint8Array(clean.length);
  for (let i = 0; i < clean.length; i++) out[i] = clean.charCodeAt(i);
  return out;
};

class EscPosBuilder {
  constructor(cols = 32) {
    this.cols = cols;
    this.parts = [];
  }

  raw(bytes) {
    this.parts.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    return this;
  }

  init() { return this.raw([0x1b, 0x40]); }
  align(pos) { return this.raw([0x1b, 0x61, pos === 'center' ? 1 : pos === 'right' ? 2 : 0]); }
  bold(on) { return this.raw([0x1b, 0x45, on ? 1 : 0]); }
  size(mode = 'normal') {
    const code = mode === 'large' ? 0x11 : mode === 'tall' ? 0x01 : mode === 'wide' ? 0x10 : 0x00;
    return this.raw([0x1d, 0x21, code]);
  }
  text(str) { return this.raw(encodeText(str)); }
  line(str = '') { return this.text(str + '\n'); }
  hr(ch = '-') { return this.line(ch.repeat(this.cols)); }
  feed(n = 3) { return this.raw([0x1b, 0x64, n]); }
  cut() { return this.raw([0x1d, 0x56, 0x42, 0x00]); }

  lr(left, right) {
    const l = sanitizeAscii(left);
    const r = sanitizeAscii(right);
    const space = this.cols - l.length - r.length;
    if (space >= 1) return this.line(l + ' '.repeat(space) + r);
    // Jika teks kiri terlalu panjang, pecah baris
    const maxL = Math.max(this.cols - r.length - 1, 1);
    if (l.length > maxL && r.length < this.cols - 2) {
      this.line(l);
      return this.line(' '.repeat(Math.max(this.cols - r.length, 0)) + r);
    }
    return this.line(`${l} ${r}`);
  }

  toUint8Array() {
    const total = this.parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of this.parts) {
      out.set(p, offset);
      offset += p.length;
    }
    return out;
  }
}

async function imageToEscPosRaster(src, maxWidth = 192) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Gagal memuat gambar logo'));
    el.src = src;
  });

  const width = Math.min(maxWidth, Math.floor(maxWidth / 8) * 8);
  const scale = width / img.width;
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = Math.ceil(width / 8);
  const raster = new Uint8Array(8 + bytesPerRow * height);

  // GS v 0 m xL xH yL yH
  raster[0] = 0x1d;
  raster[1] = 0x76;
  raster[2] = 0x30;
  raster[3] = 0x00;
  raster[4] = bytesPerRow & 0xff;
  raster[5] = (bytesPerRow >> 8) & 0xff;
  raster[6] = height & 0xff;
  raster[7] = (height >> 8) & 0xff;

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < bytesPerRow; xByte++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        if (x < width) {
          const idx = (y * width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum < 175) byte |= 1 << (7 - bit);
        }
      }
      raster[8 + y * bytesPerRow + xByte] = byte;
    }
  }

  return raster;
}

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const fmtDate = (s) => {
  if (!s) return '-';
  return new Date(String(s).replace(' ', 'T')).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Cetak resi transaksi ke printer termal Bluetooth yang sudah terhubung.
 */
export async function printThermalReceipt({ tx, shop = {}, paperWidth = 58, includeLogo = false }) {
  const cols = paperWidth === 80 ? 48 : 32;
  const b = new EscPosBuilder(cols);

  b.init();
  b.align('center');

  if (includeLogo) {
    try {
      const logoBytes = await imageToEscPosRaster('/logo.png', paperWidth === 80 ? 256 : 184);
      b.raw(logoBytes).line('');
    } catch {
      // Fallback ke header teks jika gambar gagal diproses
    }
  }

  b.bold(true).size('tall').line(shop.salon_name || 'Be Rise Salon').size('normal').bold(false);
  if (shop.address) b.line(shop.address);
  if (shop.phone) b.line(shop.phone);

  b.align('left');
  b.hr('-');
  b.lr('No', tx.invoice_no);
  b.lr('Waktu', fmtDate(tx.created_at));
  b.lr('Pelanggan', tx.customer_name || 'Umum');
  b.lr('Kasir', tx.cashier_name || '-');
  b.hr('-');

  for (const l of tx.lines || []) {
    b.bold(true).line(l.item_name).bold(false);
    b.lr(`${l.qty} x ${fmtRp(l.price)}`, fmtRp(l.subtotal));
  }

  b.hr('-');
  b.lr('Subtotal', fmtRp(tx.subtotal));
  if (Number(tx.discount) > 0) {
    b.lr('Diskon', `- ${fmtRp(tx.discount)}`);
  }
  if (Number(tx.tax) > 0) {
    b.lr('PPN', `+ ${fmtRp(tx.tax)}`);
  }
  if (Number(tx.extra_fee) > 0) {
    b.lr(tx.extra_fee_note || 'Biaya Tambahan', `+ ${fmtRp(tx.extra_fee)}`);
  }
  b.bold(true).size('tall').lr('TOTAL', fmtRp(tx.total)).size('normal').bold(false);
  b.lr('Dibayar', fmtRp(tx.paid_amount != null ? tx.paid_amount : tx.total));

  const remaining = Math.max(Number(tx.total) - Number(tx.paid_amount || 0), 0);
  if (remaining > 0) {
    b.bold(true).lr('SISA', fmtRp(remaining)).bold(false);
  }

  b.lr('Metode', String(tx.payment_method || 'cash').toUpperCase());

  const statusLabel =
    tx.status === 'paid'
      ? 'LUNAS (SELESAI)'
      : tx.status === 'partial'
      ? 'BELUM LUNAS'
      : tx.status === 'void'
      ? 'DIBATALKAN (VOID)'
      : 'BELUM BAYAR';
  b.lr('Status', statusLabel);

  if (tx.status === 'void') {
    b.align('center').bold(true).line('').line('** TRANSAKSI DIBATALKAN **').bold(false).align('left');
  }

  b.hr('-');
  b.align('center').line(shop.receipt_footer || 'Terima kasih atas kunjungan Anda!');
  b.feed(4).cut();

  await writeBytes(b.toUint8Array());
}

