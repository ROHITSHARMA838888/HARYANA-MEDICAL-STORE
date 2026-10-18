import React, { useState } from 'react';
import {
  Printer,
  Download,
  MessageSquare,
  Mail,
  Phone,
  Eye,
  X,
} from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  type SaleRecord,
  type ShopSettings,
} from '../utils/pharmacyLogic';
import { UPLOADED_HARYANA_LOGO } from '../data/seedData';

interface InvoiceModalProps {
  sale: SaleRecord;
  settings: ShopSettings;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  settings,
  onClose,
  showToast,
}) => {
  const [compareOldBill, setCompareOldBill] = useState(false);

  const handleDownloadInvoice = () => {
    const el = document.getElementById('printable-invoice-area');
    if (!el) return;
    const htmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${sale.id} - ${settings.shopName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>${el.innerHTML}</body>
</html>`;
    const blob = new Blob([htmlDocument], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sale.id}-Invoice.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Invoice ${sale.id} downloaded to device.`);
  };

  const smsBody = encodeURIComponent(
    `${settings.shopName}, Dhoha: Bill ${sale.id} dated ${formatDateDDMMYYYY(
      sale.date
    )} for ${formatINR(sale.grandTotal)} (${sale.paymentMode}). Thank you! Call: ${
      settings.phone
    }`
  );

  const emailSubject = encodeURIComponent(`Invoice ${sale.id} - ${settings.shopName}`);
  const emailBody = encodeURIComponent(
    `Dear ${sale.customerName},\n\nThank you for visiting ${settings.shopName} (Prop: ${
      settings.proprietor
    }).\nBill No: ${sale.id}\nDate: ${formatDateDDMMYYYY(sale.date)} ${
      sale.time
    }\nGrand Total: ${formatINR(sale.grandTotal)}\nPayment Mode: ${
      sale.paymentMode
    }\n\nAddress: ${settings.address}\nPhone: ${settings.phone} / ${settings.altPhone}`
  );

  const pendingUdhaar = Math.max(0, sale.grandTotal - sale.paidAmount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`PDF Invoice Viewer for ${sale.id}`}
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-auto">
        {/* Built-in Viewer Toolbar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              In-App PDF Invoice Viewer · <span className="font-mono">{sale.id}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <a
              href={`sms:${sale.customerMobile || ''}?body=${smsBody}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Share SMS
            </a>
            <a
              href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <Mail className="w-3.5 h-3.5" />
              Share Email
            </a>
            {sale.customerMobile && (
              <a
                href={`tel:${sale.customerMobile}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Customer
              </a>
            )}
            {settings.referenceBillDataUrl && (
              <button
                type="button"
                onClick={() => setCompareOldBill((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                {compareOldBill ? 'Hide Old Bill' : 'Compare Old Bill'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Invoice Viewer"
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Content Area */}
        <div
          className={`p-4 sm:p-6 max-h-[82vh] overflow-y-auto grid gap-4 ${
            compareOldBill && settings.referenceBillDataUrl ? 'md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <div
            id="printable-invoice-area"
            className="bg-white text-slate-900 p-5 rounded-lg border border-slate-300 text-xs space-y-4"
          >
            {/* Shop Identity Header */}
            <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-300 pb-4">
              <div className="flex gap-3.5 items-center">
                <img
                  src={settings.logoDataUrl || UPLOADED_HARYANA_LOGO}
                  alt="Haryana Medical Store Logo"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-contain border border-amber-400 p-0.5 shrink-0"
                />
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-emerald-900">
                    {settings.shopName}
                  </h2>
                  <p className="font-semibold text-slate-800">
                    Proprietor: {settings.proprietor}
                  </p>
                  <p className="text-[11px] text-slate-600 max-w-md">{settings.address}</p>
                  <p className="text-[11px] text-slate-700 font-medium font-mono">
                    Ph: {settings.phone} · Alt: {settings.altPhone} · {settings.email}
                  </p>
                  {(settings.gstin || settings.drugLicence) && (
                    <p className="text-[11px] font-semibold text-slate-900 mt-1 font-mono">
                      {settings.gstin && <span>GSTIN: {settings.gstin}</span>}
                      {settings.gstin && settings.drugLicence && <span> · </span>}
                      {settings.drugLicence && <span>D.L. No.: {settings.drugLicence}</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right font-mono">
                <p className="text-xs font-bold text-slate-900">
                  {settings.gstin ? 'GST Tax Invoice' : 'Retail Cash / Credit Memo'}
                </p>
                <p className="text-sm font-bold text-emerald-800 mt-1">Bill No: {sale.id}</p>
                <p className="text-[11px] text-slate-600">
                  Date: {formatDateDDMMYYYY(sale.date)} · {sale.time}
                </p>
              </div>
            </div>

            {/* Patient & Doctor Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <p className="text-[11px] text-slate-500">Patient / Customer</p>
                <p className="font-bold text-slate-900">{sale.customerName}</p>
                <p className="text-slate-700 font-mono">Mobile: {sale.customerMobile || 'N/A'}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-slate-500">Prescribed By Doctor</p>
                <p className="font-bold text-slate-900">{sale.doctorName || 'Self / OTC'}</p>
                <p className="text-slate-700">
                  Payment Mode: <span className="font-semibold">{sale.paymentMode}</span>
                </p>
              </div>
            </div>

            {/* Medicine Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">#</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Medicine Name</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Sch</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Batch</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Expiry</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">Qty</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">MRP</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">Disc%</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">GST%</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {sale.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 px-2 py-1.5">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-sans font-semibold">
                        {it.medicineName}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5">{it.schedule}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{it.batchNo}</td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        {formatDateDDMMYYYY(it.expiryDate)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right">{it.qty}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right">
                        {formatINR(it.mrp)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right">
                        {Number(it.discountPct || 0).toFixed(0)}%
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right">{it.gst}%</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-bold">
                        {formatINR(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Totals & Signatory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-300">
              <div className="space-y-1 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800">Terms & Conditions:</p>
                <p>1. Please check medicines & batch expiry before leaving the counter.</p>
                <p>2. Cut strips or opened syrup bottles cannot be returned or exchanged.</p>
                <p className="pt-4 font-bold text-slate-900">
                  Authorized Signatory — {settings.shopName}
                </p>
              </div>
              <div className="space-y-1 text-right font-mono">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Taxable SubTotal:</span>
                  <span>{formatINR(sale.subTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">CGST (6%):</span>
                  <span>{formatINR(sale.cgstTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">SGST (6%):</span>
                  <span>{formatINR(sale.sgstTotal)}</span>
                </div>
                {sale.billDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-sans">Bill Discount:</span>
                    <span>-{formatINR(sale.billDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Round Off:</span>
                  <span>{formatINR(sale.roundOff)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-400 pt-1.5 text-slate-900">
                  <span className="font-sans">Grand Total:</span>
                  <span>{formatINR(sale.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span className="font-sans">Amount Paid ({sale.paymentMode}):</span>
                  <span>{formatINR(sale.paidAmount)}</span>
                </div>
                {pendingUdhaar > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-red-600">
                    <span className="font-sans">Balance Udhaar (Credit):</span>
                    <span>{formatINR(pendingUdhaar)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {compareOldBill && settings.referenceBillDataUrl && (
            <div className="border border-slate-300 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/40 flex flex-col">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Uploaded Old Physical Bill Reference
              </p>
              <img
                src={settings.referenceBillDataUrl}
                alt="Old Bill Reference"
                referrerPolicy="no-referrer"
                className="w-full rounded object-contain max-h-[65vh]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
