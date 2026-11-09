import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, ArrowLeft, ShoppingCart, Bluetooth, BluetoothConnected, BluetoothOff, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { ErrorState, Skeleton, Badge } from '@/components/ui';
import { request, errMsg } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, dateTime } from '@/utils/format';
import {
  isBluetoothSupported,
  getPrinterStatus,
  subscribePrinterStatus,
  scanAndConnectPrinter,
  disconnectPrinter,
  printThermalReceipt,
} from '@/utils/thermalPrinter';

const Row = ({ a, b, bold }) => (
  <div className={`flex justify-between gap-2 ${bold ? 'text-sm font-bold' : ''}`}>
    <span>{a}</span>
    <span>{b}</span>
  </div>
);

export default function Receipt() {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  const [shop, setShop] = useState({});
  const [error, setError] = useState(null);

  const [printer, setPrinter] = useState(getPrinterStatus);
  const [printing, setPrinting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [paperWidth, setPaperWidth] = useState(() => Number(localStorage.getItem('thermal_paper_width')) || 58);
  const [includeLogo, setIncludeLogo] = useState(() => localStorage.getItem('thermal_include_logo') === 'true');

  useEffect(() => subscribePrinterStatus(setPrinter), []);

  useEffect(() => {
    setTx(null); setError(null);
    Promise.all([request('get', E.TRANSACTIONS.DETAIL(id), { silent: true }), request('get', E.SETTINGS, { silent: true })])
      .then(([a, b]) => { setTx(a.data); setShop(b.data); })
      .catch((e) => setError(errMsg(e)));
  }, [id]);

  const changePaperWidth = (w) => {
    setPaperWidth(w);
    localStorage.setItem('thermal_paper_width', String(w));
  };

  const toggleLogo = (checked) => {
    setIncludeLogo(checked);
    localStorage.setItem('thermal_include_logo', String(checked));
  };

  const handleBluetoothError = (e) => {
    if (e?.name === 'NotFoundError') {
      toast('Pemindaian Bluetooth dibatalkan', { icon: 'ℹ️' });
      return;
    }
    toast.error(e?.message || 'Gagal terhubung ke printer Bluetooth');
  };

  const handleScanOnly = async () => {
    if (!isBluetoothSupported()) {
      return toast.error('Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge melalui HTTPS atau localhost.');
    }
    setScanning(true);
    try {
      const status = await scanAndConnectPrinter();
      toast.success(`Terhubung ke ${status.name}`);
    } catch (e) {
      handleBluetoothError(e);
    } finally {
      setScanning(false);
    }
  };

  const handleThermalPrint = async () => {
    if (!isBluetoothSupported()) {
      return toast.error('Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge melalui HTTPS atau localhost.');
    }
    setPrinting(true);
    try {
      if (!printer.connected) {
        await scanAndConnectPrinter();
      }
      await printThermalReceipt({ tx, shop, paperWidth, includeLogo });
      toast.success('Resi berhasil dicetak ke printer termal');
    } catch (e) {
      handleBluetoothError(e);
    } finally {
      setPrinting(false);
    }
  };

  if (error) return <div className="card"><ErrorState message={error} /></div>;
  if (!tx) return <Skeleton className="mx-auto h-96 max-w-xs" />;

  const btSupported = isBluetoothSupported();

  return (
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <Link to="/history" className="btn-ghost"><ArrowLeft size={16} /> Riwayat</Link>
        <Link to="/cashier" className="btn-ghost"><ShoppingCart size={16} /> Transaksi Baru</Link>
        <button className="btn-ghost" onClick={() => window.print()}>
          <Printer size={16} /> Cetak Browser
        </button>
        <button
          className="btn-primary"
          disabled={printing || scanning}
          onClick={handleThermalPrint}
        >
          {printing ? <Loader2 size={16} className="animate-spin" /> : <Bluetooth size={16} />}
          {printing ? 'Mencetak...' : 'Cetak Printer Termal'}
        </button>
      </div>

      {/* Thermal Printer Bluetooth Status & Options */}
      <div className="card mx-auto max-w-xl p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${printer.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
              {printer.connected ? <BluetoothConnected size={18} /> : <Bluetooth size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span>Printer Termal Bluetooth</span>
                <Badge tone={printer.connected ? 'green' : 'amber'}>
                  {printer.connected ? `Terhubung: ${printer.name}` : 'Belum terhubung'}
                </Badge>
              </div>
              <p className="text-xs text-stone-500">
                {btSupported
                  ? printer.connected
                    ? 'Siap mencetak langsung ke printer termal.'
                    : 'Klik "Cetak Printer Termal" atau "Scan Bluetooth" untuk memilih printer.'
                  : 'Web Bluetooth tidak tersedia di browser ini (gunakan Chrome/Edge via HTTPS/localhost).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn-ghost !px-3 !py-1.5 !text-xs"
              disabled={scanning || printing}
              onClick={handleScanOnly}
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {printer.connected ? 'Ganti Printer' : 'Scan Bluetooth'}
            </button>
            {printer.connected && (
              <button
                type="button"
                className="btn-ghost !px-2.5 !py-1.5 !text-xs !text-accent-600 hover:!bg-accent-50"
                title="Putuskan koneksi"
                onClick={disconnectPrinter}
              >
                <BluetoothOff size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Paper size & logo options */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-500">Ukuran Kertas:</span>
            <div className="flex rounded-lg bg-stone-100 p-0.5">
              {[58, 80].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => changePaperWidth(w)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                    paperWidth === w ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-ink'
                  }`}
                >
                  {w}mm
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 font-medium text-stone-600 select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              checked={includeLogo}
              onChange={(e) => toggleLogo(e.target.checked)}
            />
            Cetak logo di struk termal
          </label>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="mx-auto w-[320px] rounded-2xl border border-stone-200/70 bg-white p-5 font-mono text-xs leading-relaxed shadow-elevated print:w-[300px] print:rounded-none print:border-0 print:p-4 print:shadow-none">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Be Rise Salon" className="mb-2 h-14 w-auto grayscale print:grayscale" />
          <div className="text-base font-bold">{shop.salon_name || 'Be Rise Salon'}</div>
          {shop.address && <div className="text-[11px] text-stone-600">{shop.address}</div>}
          {shop.phone && <div className="text-[11px] text-stone-600">{shop.phone}</div>}
        </div>

        <hr className="my-3 border-dashed border-stone-300" />
        <Row a="No" b={tx.invoice_no} />
        <Row a="Waktu" b={dateTime(tx.created_at)} />
        <Row a="Pelanggan" b={tx.customer_name} />
        <Row a="Kasir" b={tx.cashier_name} />
        <hr className="my-3 border-dashed border-stone-300" />

        {tx.lines.map((l) => (
          <div key={l.id} className="mb-1.5">
            <div className="font-semibold">{l.item_name}</div>
            <Row a={`${l.qty} x ${rupiah(l.price)}`} b={rupiah(l.subtotal)} />
          </div>
        ))}

        <hr className="my-3 border-dashed border-stone-300" />
        <Row a="Subtotal" b={rupiah(tx.subtotal)} />
        {tx.discount > 0 && <Row a="Diskon" b={`- ${rupiah(tx.discount)}`} />}
        <div className="my-1.5 border-t border-dashed border-stone-300 pt-1.5">
          <Row a="TOTAL" b={rupiah(tx.total)} bold />
        </div>
        <Row a="Bayar" b={tx.payment_method.toUpperCase()} />
        {tx.status === 'void' && <div className="mt-2 rounded bg-stone-100 py-1 text-center font-bold">** TRANSAKSI VOID **</div>}

        <hr className="my-3 border-dashed border-stone-300" />
        <div className="text-center text-[11px] text-stone-600">{shop.receipt_footer || 'Terima kasih atas kunjungan Anda!'}</div>
      </div>
    </div>
  );
}
