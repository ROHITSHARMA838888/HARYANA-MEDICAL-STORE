import React from 'react';
import { Phone, MessageSquare, RotateCcw, Trash2 } from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  daysUntil,
  type Batch,
  type Medicine,
  type Supplier,
  type ShopSettings,
  type StockMovement,
} from '../utils/pharmacyLogic';

interface ExpiredViewProps {
  batches: Batch[];
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  medicines: Medicine[];
  suppliers: Supplier[];
  settings: ShopSettings;
  logStockMovement: (
    type: StockMovement['type'],
    refId: string,
    medicineName: string,
    batchNo: string,
    qtyChange: number,
    note: string
  ) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExpiredView: React.FC<ExpiredViewProps> = ({
  batches,
  setBatches,
  medicines,
  suppliers,
  settings,
  logStockMovement,
  showToast,
}) => {
  const expiredList = batches
    .filter((b) => b.quantity > 0 && daysUntil(b.expiryDate) < 0)
    .map((b) => {
      const med = medicines.find((m) => m.id === b.medicineId);
      const sup = suppliers.find((s) => s.id === b.supplierId);
      return {
        ...b,
        medName: med?.name || 'Medicine',
        rack: med?.rack || '-',
        supName: sup?.name || 'Supplier',
        supPhone: sup?.phone || '',
        days: daysUntil(b.expiryDate),
        costValue: b.quantity * b.purchaseRate,
      };
    });

  const expiringSoonList = batches
    .filter((b) => {
      const d = daysUntil(b.expiryDate);
      return b.quantity > 0 && d >= 0 && d <= Number(settings.expiryAlertDays || 60);
    })
    .map((b) => {
      const med = medicines.find((m) => m.id === b.medicineId);
      const sup = suppliers.find((s) => s.id === b.supplierId);
      return {
        ...b,
        medName: med?.name || 'Medicine',
        rack: med?.rack || '-',
        supName: sup?.name || 'Supplier',
        supPhone: sup?.phone || '',
        days: daysUntil(b.expiryDate),
        costValue: b.quantity * b.purchaseRate,
      };
    });

  const handleReturnExpiredToSupplier = (
    batchId: string,
    medName: string,
    batchNo: string,
    qty: number,
    supName: string
  ) => {
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, quantity: 0 } : b)));
    logStockMovement(
      'EXPIRED_RETURN',
      `EXP-RET-${Date.now().toString().slice(-4)}`,
      medName,
      batchNo,
      -qty,
      `Returned expired/near-expiry batch to ${supName}`
    );
    showToast(
      `Returned ${qty} units of ${medName} (Batch ${batchNo}) to ${supName} and deducted from stock.`
    );
  };

  const totalExpiredCost = expiredList.reduce((s, b) => s + b.costValue, 0);

  return (
    <div className="space-y-5">
      {/* Strictly Blocked Expired Stock Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
              Expired Medicines Register ({expiredList.length} Batches)
            </h2>
            <p className="text-xs text-slate-500">
              Automatically blocked from POS sale · Return to supplier or mark disposed to clear shelf
            </p>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-slate-500 font-sans">Total Blocked Expired Cost: </span>
            <span className="font-bold text-red-600">{formatINR(totalExpiredCost)}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Medicine</th>
                <th className="py-2.5 px-2 text-left">Batch & Rack</th>
                <th className="py-2.5 px-2 text-left">Expired On</th>
                <th className="py-2.5 px-2 text-left">Supplier</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Loss Value (Cost)</th>
                <th className="py-2.5 px-3 text-right">Supplier Return Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {expiredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No expired batches currently on the shelf.
                  </td>
                </tr>
              ) : (
                expiredList.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {b.medName}
                    </td>
                    <td className="py-2.5 px-2 font-mono">
                      {b.batchNo} · Rack {b.rack}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-red-600 font-bold">
                      {formatDateDDMMYYYY(b.expiryDate)} ({Math.abs(b.days)}d ago)
                    </td>
                    <td className="py-2.5 px-2">{b.supName}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold">{b.quantity}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-red-600">
                      {formatINR(b.costValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleReturnExpiredToSupplier(
                              b.id,
                              b.medName,
                              b.batchNo,
                              b.quantity,
                              b.supName
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Return to Supplier
                        </button>
                        {b.supPhone && (
                          <a
                            href={`sms:${b.supPhone}?body=${encodeURIComponent(
                              `${settings.shopName}, Dhoha: Expiry return reminder for ${b.medName} (Batch ${b.batchNo}, Qty ${b.quantity}, Exp ${formatDateDDMMYYYY(
                                b.expiryDate
                              )}).`
                            )}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                          >
                            <MessageSquare className="w-3 h-3" /> SMS
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Near-Expiry Supplier Return Reminders */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-amber-600 dark:text-amber-400">
            Expiring Within {settings.expiryAlertDays} Days — Supplier Return Reminders ({expiringSoonList.length})
          </h3>
          <p className="text-xs text-slate-500">
            Prioritized first by FEFO in POS · Return unsold slow-moving stock to supplier before expiry
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Medicine</th>
                <th className="py-2.5 px-2 text-left">Batch & Rack</th>
                <th className="py-2.5 px-2 text-left">Expiry Date</th>
                <th className="py-2.5 px-2 text-left">Supplier</th>
                <th className="py-2.5 px-2 text-right">Stock Qty</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {expiringSoonList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No batches expiring within {settings.expiryAlertDays} days.
                  </td>
                </tr>
              ) : (
                expiringSoonList.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 px-3 font-semibold">{b.medName}</td>
                    <td className="py-2.5 px-2 font-mono">
                      {b.batchNo} · Rack {b.rack}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-amber-600 font-bold">
                      {formatDateDDMMYYYY(b.expiryDate)} ({b.days}d left)
                    </td>
                    <td className="py-2.5 px-2">{b.supName}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold">{b.quantity}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleReturnExpiredToSupplier(
                              b.id,
                              b.medName,
                              b.batchNo,
                              b.quantity,
                              b.supName
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Return Batch
                        </button>
                        {b.supPhone && (
                          <a
                            href={`tel:${b.supPhone}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
