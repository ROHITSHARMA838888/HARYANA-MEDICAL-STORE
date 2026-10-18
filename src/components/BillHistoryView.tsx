import React, { useState } from 'react';
import { FileText, Edit3, Trash2, Search, RotateCcw } from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  type SaleRecord,
  type Batch,
  type StockMovement,
  type DeletedItemRecord,
} from '../utils/pharmacyLogic';

interface BillHistoryViewProps {
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  batches: Batch[];
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  deletedItems: DeletedItemRecord[];
  onRecordDeleted: (record: DeletedItemRecord) => void;
  onRestoreItem: (record: DeletedItemRecord) => void;
  setInvoiceModalSale: (sale: SaleRecord) => void;
  onEditSaleInPOS: (sale: SaleRecord) => void;
  logStockMovement: (
    type: StockMovement['type'],
    refId: string,
    medicineName: string,
    batchNo: string,
    qtyChange: number,
    note: string
  ) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  userRole: 'Owner' | 'Staff';
}

export const BillHistoryView: React.FC<BillHistoryViewProps> = ({
  sales,
  setSales,
  setBatches,
  deletedItems,
  onRecordDeleted,
  onRestoreItem,
  setInvoiceModalSale,
  onEditSaleInPOS,
  logStockMovement,
  showToast,
  userRole,
}) => {
  const [query, setQuery] = useState('');

  const filteredSales = sales.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.id.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.customerMobile.includes(q) ||
      s.doctorName.toLowerCase().includes(q)
    );
  });

  const handleDeleteSale = (sale: SaleRecord) => {
    if (userRole !== 'Owner') {
      showToast('Restricted: Only Owner (Rahul Sharma) can delete sales bills.', 'error');
      return;
    }

    onRecordDeleted({
      id: `DEL-SALE-${Date.now()}`,
      deletedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      entityType: 'SALE_BILL',
      title: `Bill ${sale.id} — ${sale.customerName}`,
      subtitle: `${formatDateDDMMYYYY(sale.date)} · ${sale.items.length} item(s) · Grand Total: ${formatINR(
        sale.grandTotal
      )}`,
      sale,
    });

    // Restore batch quantities
    setBatches((prev) =>
      prev.map((b) => {
        const soldItem = sale.items.find((i) => i.batchId === b.id);
        return soldItem ? { ...b, quantity: b.quantity + soldItem.qty } : b;
      })
    );

    setSales((prev) => prev.filter((s) => s.id !== sale.id));
    logStockMovement(
      'ADJUSTMENT',
      sale.id,
      sale.items.map((i) => i.medicineName).join(', '),
      sale.items.map((i) => i.batchNo).join(', '),
      sale.items.reduce((sum, i) => sum + i.qty, 0),
      `Deleted Bill ${sale.id} and restored batch stock (Recoverable)`
    );
    showToast(`Deleted Bill ${sale.id} (Recoverable in Data Restoration Center).`);
  };

  const deletedBills = deletedItems.filter((d) => d.entityType === 'SALE_BILL');

  return (
    <div className="space-y-4">
      <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 sm:px-4 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-amber-950 dark:text-amber-200">
              Recover Deleted Sales Bills ({deletedBills.length} in Trash):
            </span>
          </div>
          {deletedBills.length === 0 && (
            <span className="text-slate-500">
              No deleted sales bills in Trash — any bill you delete will appear here for instant recovery.
            </span>
          )}
        </div>
        {deletedBills.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {deletedBills.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRestoreItem(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore Sale Bill
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Sales Bill History & Invoice Archive ({sales.length})
            </h2>
            <p className="text-xs text-slate-500">
              Click &ldquo;PDF Invoice&rdquo; to open the built-in viewer, or &ldquo;Edit Bill&rdquo; to modify items in POS
            </p>
          </div>
          <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Bill No, Patient, Mobile, or Doctor..."
              className="w-full bg-transparent text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Bill No</th>
                <th className="py-2.5 px-2 text-left">Date & Time</th>
                <th className="py-2.5 px-3 text-left">Customer / Doctor</th>
                <th className="py-2.5 px-2 text-left">Medicines Sold</th>
                <th className="py-2.5 px-2 text-left">Mode</th>
                <th className="py-2.5 px-2 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {s.id}
                  </td>
                  <td className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                    {formatDateDDMMYYYY(s.date)} · {s.time}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{s.customerName}</p>
                    <p className="text-[11px] text-slate-500">
                      {s.customerMobile} · {s.doctorName}
                    </p>
                  </td>
                  <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                    {s.items.map((i) => `${i.medicineName} (x${i.qty})`).join(' · ')}
                  </td>
                  <td className="py-2.5 px-2 font-medium">{s.paymentMode}</td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatINR(s.grandTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInvoiceModalSale(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <FileText className="w-3 h-3" /> PDF Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditSaleInPOS(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-medium cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit Bill
                      </button>
                      {userRole === 'Owner' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSale(s)}
                          aria-label={`Delete Bill ${s.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 text-[11px] font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
