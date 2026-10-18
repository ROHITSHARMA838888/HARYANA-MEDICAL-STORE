import React, { useState } from 'react';
import {
  Phone,
  MessageSquare,
  Plus,
  IndianRupee,
  FileText,
  Eye,
  Edit3,
  Trash2,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  type Supplier,
  type PurchaseRecord,
  type PurchaseReturnRecord,
  type Customer,
  type SaleRecord,
  type SaleReturnRecord,
  type Batch,
  type Medicine,
  type DeletedItemRecord,
} from '../utils/pharmacyLogic';

interface SuppliersViewProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: PurchaseRecord[];
  setPurchases: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>;
  purchaseReturns: PurchaseReturnRecord[];
  batches: Batch[];
  medicines: Medicine[];
  deletedItems: DeletedItemRecord[];
  onRecordDeleted: (record: DeletedItemRecord) => void;
  onRestoreItem: (record: DeletedItemRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  setSuppliers,
  purchases,
  setPurchases,
  purchaseReturns,
  batches,
  medicines,
  deletedItems,
  onRecordDeleted,
  onRestoreItem,
  showToast,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');

  // Complete Details & History Modal State
  const [detailsSupplierId, setDetailsSupplierId] = useState<string | null>(null);

  // Edit Supplier Modal State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Delete Supplier Confirmation Modal State
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newSup: Supplier = {
      id: `SUP-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '9812000000',
      gstin: gstin.trim() || '06AAACH0000A1Z5',
      address: address.trim() || 'Haryana',
      openingBalance: 0,
    };
    setSuppliers((prev) => [...prev, newSup]);
    setName('');
    setPhone('');
    setGstin('');
    setAddress('');
    showToast(`Supplier ${newSup.name} added!`);
  };

  const handleSaveEditSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setSuppliers((prev) =>
      prev.map((s) => (s.id === editingSupplier.id ? editingSupplier : s))
    );
    showToast(`Updated supplier ${editingSupplier.name}!`);
    setEditingSupplier(null);
  };

  const handleConfirmDeleteSupplier = () => {
    if (!deletingSupplier) return;
    onRecordDeleted({
      id: `DEL-SUP-${Date.now()}`,
      deletedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      entityType: 'SUPPLIER',
      title: deletingSupplier.name,
      subtitle: `GSTIN: ${deletingSupplier.gstin} · Phone: ${deletingSupplier.phone} · ${deletingSupplier.address}`,
      supplier: deletingSupplier,
    });
    setSuppliers((prev) => prev.filter((s) => s.id !== deletingSupplier.id));
    showToast(
      `Supplier ${deletingSupplier.name} moved to Data Restoration Center (Recoverable anytime).`
    );
    setDeletingSupplier(null);
  };

  const handleSettlePurchase = (purchaseId: string) => {
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === purchaseId
          ? { ...p, paidAmount: p.grandTotal, paymentStatus: 'Paid' }
          : p
      )
    );
    showToast('Supplier bill marked as Paid in Full!');
  };

  const selectedSupplier = suppliers.find((s) => s.id === detailsSupplierId) || null;
  const deletedSuppliers = deletedItems.filter((d) => d.entityType === 'SUPPLIER');

  return (
    <div className="space-y-6">
      <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 sm:px-4 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-amber-950 dark:text-amber-200">
              Recover Deleted Suppliers ({deletedSuppliers.length} in Trash):
            </span>
          </div>
          {deletedSuppliers.length === 0 && (
            <span className="text-slate-500">
              No deleted suppliers in Trash — any supplier you delete will appear here for instant recovery.
            </span>
          )}
        </div>
        {deletedSuppliers.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {deletedSuppliers.map((item) => (
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Recover Supplier
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Supplier & Directory */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Pharmaceutical Suppliers & Distributors ({suppliers.length})
            </h2>
            <p className="text-xs text-slate-500">
              Manage distributors, view complete purchase & batch history, edit details, or delete records
            </p>
          </div>
        </div>

        <form onSubmit={handleAddSupplier} className="grid sm:grid-cols-5 gap-2.5 text-xs">
          <input
            type="text"
            required
            placeholder="Supplier Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
          />
          <input
            type="text"
            placeholder="GSTIN (e.g. 06AABCM...)"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
          />
          <input
            type="text"
            placeholder="City / Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </button>
        </form>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Supplier Name</th>
                <th className="py-2.5 px-2 text-left">GSTIN</th>
                <th className="py-2.5 px-2 text-left">Phone</th>
                <th className="py-2.5 px-2 text-left">Address</th>
                <th className="py-2.5 px-2 text-right">Total Purchased</th>
                <th className="py-2.5 px-2 text-right">Payable Balance</th>
                <th className="py-2.5 px-3 text-right">Details, Edit, Delete & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {suppliers.map((s) => {
                const supPurchases = purchases.filter((p) => p.supplierId === s.id);
                const totalPur = supPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
                const totalPaid = supPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
                const payable = Math.max(0, totalPur - totalPaid + Number(s.openingBalance || 0));

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="py-2.5 px-2 font-mono">{s.gstin}</td>
                    <td className="py-2.5 px-2 font-mono">{s.phone}</td>
                    <td className="py-2.5 px-2 text-slate-500">{s.address}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatINR(totalPur)}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold">
                      {payable > 0 ? (
                        <span className="text-amber-600">{formatINR(payable)}</span>
                      ) : (
                        <span className="text-emerald-700">Settled</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailsSupplierId(s.id)}
                          aria-label={`View complete details and history for ${s.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Details & History
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSupplier({ ...s })}
                          aria-label={`Edit supplier ${s.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSupplier(s)}
                          aria-label={`Delete supplier ${s.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 text-[11px] font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <a
                          href={`tel:${s.phone}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <a
                          href={`sms:${s.phone}?body=${encodeURIComponent(
                            `Haryana Medical Store, Dhoha: Order / account inquiry for ${s.name}.`
                          )}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                        >
                          <MessageSquare className="w-3 h-3" /> SMS
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Purchase & Payment History */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Supplier Purchase Ledger & Debit Notes ({purchases.length} Invoices · {purchaseReturns.length} Returns)
        </h3>
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 px-3 text-left">Invoice No</th>
                <th className="py-2 px-2 text-left">Supplier</th>
                <th className="py-2 px-2 text-left">Date</th>
                <th className="py-2 px-2 text-right">Grand Total</th>
                <th className="py-2 px-2 text-right">Paid</th>
                <th className="py-2 px-2 text-right">Pending</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {purchases.map((p) => {
                const due = Math.max(0, p.grandTotal - p.paidAmount);
                return (
                  <tr key={p.id}>
                    <td className="py-2 px-3 font-semibold">{p.invoiceNo}</td>
                    <td className="py-2 px-2 font-sans">{p.supplierName}</td>
                    <td className="py-2 px-2">{formatDateDDMMYYYY(p.date)}</td>
                    <td className="py-2 px-2 text-right">{formatINR(p.grandTotal)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700">
                      {formatINR(p.paidAmount)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-amber-600">
                      {formatINR(due)}
                    </td>
                    <td className="py-2 px-3 text-right font-sans">
                      {due > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSettlePurchase(p.id)}
                          className="px-2.5 py-1 rounded bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-slate-400">Paid</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Complete Details & History Modal */}
      {selectedSupplier && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Complete Details and History for ${selectedSupplier.name}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          {(() => {
            const supPurchases = purchases.filter((p) => p.supplierId === selectedSupplier.id);
            const supReturns = purchaseReturns.filter((r) => r.supplierId === selectedSupplier.id);
            const supBatches = batches.filter((b) => b.supplierId === selectedSupplier.id);
            const totalPur = supPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
            const totalPaid = supPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
            const netPayable = Math.max(
              0,
              totalPur - totalPaid + Number(selectedSupplier.openingBalance || 0)
            );

            return (
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-5 border border-slate-200 dark:border-slate-800 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {selectedSupplier.name} — Complete Supplier Details & History
                    </h3>
                    <p className="text-slate-500 font-mono mt-0.5">
                      Supplier ID: {selectedSupplier.id} · GSTIN: {selectedSupplier.gstin} · Phone:{' '}
                      {selectedSupplier.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sup = selectedSupplier;
                        setDetailsSupplierId(null);
                        setEditingSupplier({ ...sup });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Supplier
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsSupplierId(null)}
                      aria-label="Close Supplier Details Modal"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-bold cursor-pointer"
                    >
                      Close <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Supplier Profile & Ledger Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block">City / Address</span>
                    <span className="font-bold">{selectedSupplier.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Purchased</span>
                    <span className="font-mono font-extrabold text-sm">{formatINR(totalPur)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Paid</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                      {formatINR(totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Net Payable Balance</span>
                    <span className="font-mono font-extrabold text-sm text-amber-600">
                      {formatINR(netPayable)}
                    </span>
                  </div>
                </div>

                {/* 1. Purchase Invoices History */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    1. Purchase Invoices History ({supPurchases.length})
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <th className="py-2 px-3 text-left">Invoice No</th>
                          <th className="py-2 px-2 text-left">Date</th>
                          <th className="py-2 px-2 text-left">Items Purchased</th>
                          <th className="py-2 px-2 text-right">Grand Total</th>
                          <th className="py-2 px-2 text-right">Paid</th>
                          <th className="py-2 px-3 text-right">Pending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {supPurchases.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-400">
                              No purchase invoices recorded for this supplier.
                            </td>
                          </tr>
                        ) : (
                          supPurchases.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 px-3 font-mono font-bold">{p.invoiceNo}</td>
                              <td className="py-2 px-2 font-mono">{formatDateDDMMYYYY(p.date)}</td>
                              <td className="py-2 px-2">
                                {p.items.map((i) => `${i.medicineName} (${i.qty})`).join(', ')}
                              </td>
                              <td className="py-2 px-2 text-right font-mono">
                                {formatINR(p.grandTotal)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-emerald-700">
                                {formatINR(p.paidAmount)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                                {formatINR(Math.max(0, p.grandTotal - p.paidAmount))}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Supplied Batches & Debit Notes */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      2. Supplied Medicine Batches ({supBatches.length})
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                      <table className="w-full text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <th className="py-1.5 px-2.5 text-left">Medicine</th>
                            <th className="py-1.5 px-2 text-left">Batch</th>
                            <th className="py-1.5 px-2 text-left">Expiry</th>
                            <th className="py-1.5 px-2.5 text-right">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {supBatches.map((b) => {
                            const med = medicines.find((m) => m.id === b.medicineId);
                            return (
                              <tr key={b.id}>
                                <td className="py-1.5 px-2.5 font-sans font-semibold">
                                  {med?.name || b.medicineId}
                                </td>
                                <td className="py-1.5 px-2">{b.batchNo}</td>
                                <td className="py-1.5 px-2">{formatDateDDMMYYYY(b.expiryDate)}</td>
                                <td className="py-1.5 px-2.5 text-right font-bold">{b.quantity}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      3. Supplier Returns / Debit Notes ({supReturns.length})
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <th className="py-1.5 px-2.5 text-left">Date</th>
                            <th className="py-1.5 px-2 text-left">Medicine & Batch</th>
                            <th className="py-1.5 px-2 text-right">Qty</th>
                            <th className="py-1.5 px-2.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {supReturns.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-400">
                                No debit notes or returns recorded for this supplier.
                              </td>
                            </tr>
                          ) : (
                            supReturns.map((r) => (
                              <tr key={r.id}>
                                <td className="py-1.5 px-2.5 font-mono">
                                  {formatDateDDMMYYYY(r.date)}
                                </td>
                                <td className="py-1.5 px-2">
                                  {r.medicineName} ({r.batchNo})
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono">{r.qty}</td>
                                <td className="py-1.5 px-2.5 text-right font-mono">
                                  {formatINR(r.amount)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit Supplier ${editingSupplier.name}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveEditSupplier}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">Edit Supplier — {editingSupplier.name}</h3>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-slate-400"
              >
                ✕
              </button>
            </div>
            <div>
              <label htmlFor="edit-sup-name" className="block font-medium mb-1">
                Supplier Name
              </label>
              <input
                id="edit-sup-name"
                type="text"
                required
                value={editingSupplier.name}
                onChange={(e) =>
                  setEditingSupplier({ ...editingSupplier, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="edit-sup-phone" className="block font-medium mb-1">
                Phone Number
              </label>
              <input
                id="edit-sup-phone"
                type="tel"
                value={editingSupplier.phone}
                onChange={(e) =>
                  setEditingSupplier({ ...editingSupplier, phone: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div>
              <label htmlFor="edit-sup-gstin" className="block font-medium mb-1">
                GSTIN
              </label>
              <input
                id="edit-sup-gstin"
                type="text"
                value={editingSupplier.gstin}
                onChange={(e) =>
                  setEditingSupplier({ ...editingSupplier, gstin: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div>
              <label htmlFor="edit-sup-addr" className="block font-medium mb-1">
                City / Address
              </label>
              <input
                id="edit-sup-addr"
                type="text"
                value={editingSupplier.address}
                onChange={(e) =>
                  setEditingSupplier({ ...editingSupplier, address: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {deletingSupplier && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Supplier"
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-red-600">
              Delete Supplier — {deletingSupplier.name}?
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to remove <span className="font-semibold">{deletingSupplier.name}</span> from the supplier directory?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSupplier}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomersViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: SaleRecord[];
  saleReturns: SaleReturnRecord[];
  deletedItems: DeletedItemRecord[];
  onRecordDeleted: (record: DeletedItemRecord) => void;
  onRestoreItem: (record: DeletedItemRecord) => void;
  setInvoiceModalSale: (sale: SaleRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  setCustomers,
  sales,
  saleReturns,
  deletedItems,
  onRecordDeleted,
  onRestoreItem,
  setInvoiceModalSale,
  showToast,
}) => {
  // Add Customer Form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustUdhaar, setNewCustUdhaar] = useState('');

  // Receive Udhaar Payment Modal State
  const [receiveCustomerId, setReceiveCustomerId] = useState<string | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<string>('');

  // Complete Customer Details & History Modal State
  const [detailsCustomerId, setDetailsCustomerId] = useState<string | null>(null);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Delete Customer Confirmation Modal State
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const totalUdhaar = customers.reduce((s, c) => s + Number(c.udhaarBalance || 0), 0);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created: Customer = {
      id: `CUST-${Date.now()}`,
      name: newCustName.trim(),
      mobile: newCustMobile.trim() || '9813400000',
      address: newCustAddress.trim() || 'Dhoha, Firozpur Jhirka',
      udhaarBalance: Math.max(0, Number(newCustUdhaar || 0)),
    };
    setCustomers((prev) => [...prev, created]);
    setNewCustName('');
    setNewCustMobile('');
    setNewCustAddress('');
    setNewCustUdhaar('');
    showToast(`Customer ${created.name} added!`);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setCustomers((prev) =>
      prev.map((c) => (c.id === editingCustomer.id ? editingCustomer : c))
    );
    showToast(`Updated customer ${editingCustomer.name}!`);
    setEditingCustomer(null);
  };

  const handleConfirmDeleteCustomer = () => {
    if (!deletingCustomer) return;
    onRecordDeleted({
      id: `DEL-CUST-${Date.now()}`,
      deletedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      entityType: 'CUSTOMER',
      title: deletingCustomer.name,
      subtitle: `Mobile: ${deletingCustomer.mobile} · ${deletingCustomer.address} · Udhaar: ${formatINR(
        deletingCustomer.udhaarBalance
      )}`,
      customer: deletingCustomer,
    });
    setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
    showToast(
      `Customer ${deletingCustomer.name} moved to Data Restoration Center (Recoverable anytime).`
    );
    setDeletingCustomer(null);
  };

  const handleReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveCustomerId) return;
    const amt = Math.max(0, Number(receiveAmount || 0));
    if (amt <= 0) return;

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === receiveCustomerId
          ? { ...c, udhaarBalance: Math.max(0, Number(c.udhaarBalance || 0) - amt) }
          : c
      )
    );
    setReceiveCustomerId(null);
    setReceiveAmount('');
    showToast(`Received ${formatINR(amt)} towards customer Udhaar balance!`);
  };

  const selectedCustomer = customers.find((c) => c.id === detailsCustomerId) || null;
  const deletedCustomers = deletedItems.filter((d) => d.entityType === 'CUSTOMER');

  return (
    <div className="space-y-5">
      <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 sm:px-4 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-amber-950 dark:text-amber-200">
              Recover Deleted Customers ({deletedCustomers.length} in Trash):
            </span>
          </div>
          {deletedCustomers.length === 0 && (
            <span className="text-slate-500">
              No deleted customers in Trash — any customer you delete will appear here for instant recovery.
            </span>
          )}
        </div>
        {deletedCustomers.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {deletedCustomers.map((item) => (
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Recover Customer
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
              Customers & Udhaar (Credit) Khata Ledger ({customers.length})
            </h2>
            <p className="text-xs text-slate-500">
              View complete customer details & bill history, edit or delete customer profiles, and settle Udhaar balances
            </p>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="font-sans text-slate-500">Total Pending Udhaar: </span>
            <span className="font-bold text-amber-600 text-sm">{formatINR(totalUdhaar)}</span>
          </div>
        </div>

        {/* Add New Customer Form */}
        <form onSubmit={handleAddCustomer} className="grid sm:grid-cols-5 gap-2.5 text-xs">
          <input
            type="text"
            required
            placeholder="Customer Name"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <input
            type="tel"
            placeholder="Mobile Number"
            value={newCustMobile}
            onChange={(e) => setNewCustMobile(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
          />
          <input
            type="text"
            placeholder="Village / Address"
            value={newCustAddress}
            onChange={(e) => setNewCustAddress(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <input
            type="number"
            min={0}
            placeholder="Opening Udhaar (₹)"
            value={newCustUdhaar}
            onChange={(e) => setNewCustUdhaar(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Customer
          </button>
        </form>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Customer Name</th>
                <th className="py-2.5 px-2 text-left">Mobile</th>
                <th className="py-2.5 px-2 text-left">Address</th>
                <th className="py-2.5 px-2 text-left">Recent Bills</th>
                <th className="py-2.5 px-2 text-right">Pending Udhaar</th>
                <th className="py-2.5 px-3 text-right">Details, Edit, Delete & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {customers.map((c) => {
                const custBills = sales.filter(
                  (s) =>
                    s.customerId === c.id ||
                    s.customerName.toLowerCase() === c.name.toLowerCase()
                );

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {c.name}
                    </td>
                    <td className="py-2.5 px-2 font-mono">{c.mobile}</td>
                    <td className="py-2.5 px-2 text-slate-500">{c.address}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {custBills.map((b) => (
                          <button
                            type="button"
                            key={b.id}
                            onClick={() => setInvoiceModalSale(b)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 font-mono text-[11px] cursor-pointer"
                          >
                            <FileText className="w-3 h-3" /> {b.id}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold">
                      {c.udhaarBalance > 0 ? (
                        <span className="text-amber-600">{formatINR(c.udhaarBalance)}</span>
                      ) : (
                        <span className="text-emerald-700">₹0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailsCustomerId(c.id)}
                          aria-label={`View complete details and history for ${c.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Details & History
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCustomer({ ...c })}
                          aria-label={`Edit customer ${c.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCustomer(c)}
                          aria-label={`Delete customer ${c.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 text-[11px] font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        {c.udhaarBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceiveCustomerId(c.id);
                              setReceiveAmount(String(c.udhaarBalance));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            <IndianRupee className="w-3 h-3" /> Receive Cash
                          </button>
                        )}
                        <a
                          href={`tel:${c.mobile}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <a
                          href={`sms:${c.mobile}?body=${encodeURIComponent(
                            `Haryana Medical Store, Dhoha: Dear ${c.name}, your pending Udhaar balance is ${formatINR(
                              c.udhaarBalance
                            )}. Kindly settle at your convenience.`
                          )}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                        >
                          <MessageSquare className="w-3 h-3" /> SMS
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Complete Details & History Modal */}
      {selectedCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Complete Details and History for ${selectedCustomer.name}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          {(() => {
            const custSales = sales.filter(
              (s) =>
                s.customerId === selectedCustomer.id ||
                s.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()
            );
            const custSaleIds = new Set(custSales.map((s) => s.id));
            const custReturns = saleReturns.filter(
              (r) =>
                custSaleIds.has(r.saleId) ||
                r.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()
            );
            const totalBilled = custSales.reduce((sum, s) => sum + s.grandTotal, 0);
            const totalPaid = custSales.reduce((sum, s) => sum + s.paidAmount, 0);

            return (
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-5 border border-slate-200 dark:border-slate-800 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {selectedCustomer.name} — Complete Customer Profile & Purchase History
                    </h3>
                    <p className="text-slate-500 font-mono mt-0.5">
                      Customer ID: {selectedCustomer.id} · Mobile: {selectedCustomer.mobile} ·
                      Address: {selectedCustomer.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cust = selectedCustomer;
                        setDetailsCustomerId(null);
                        setEditingCustomer({ ...cust });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsCustomerId(null)}
                      aria-label="Close Customer Details Modal"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-bold cursor-pointer"
                    >
                      Close <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Customer Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block">Total Bills Count</span>
                    <span className="font-mono font-extrabold text-sm">{custSales.length} bills</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Lifetime Billed Value</span>
                    <span className="font-mono font-extrabold text-sm">{formatINR(totalBilled)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Paid on Bills</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                      {formatINR(totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Pending Udhaar</span>
                    <span className="font-mono font-extrabold text-sm text-amber-600">
                      {formatINR(selectedCustomer.udhaarBalance)}
                    </span>
                  </div>
                </div>

                {/* 1. Complete Sales Bills History */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    1. Complete Sales Bills History ({custSales.length})
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <th className="py-2 px-3 text-left">Bill No</th>
                          <th className="py-2 px-2 text-left">Date & Time</th>
                          <th className="py-2 px-2 text-left">Doctor</th>
                          <th className="py-2 px-2 text-left">Medicines Purchased</th>
                          <th className="py-2 px-2 text-left">Payment Mode</th>
                          <th className="py-2 px-2 text-right">Grand Total</th>
                          <th className="py-2 px-3 text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {custSales.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-slate-400">
                              No sales bills recorded for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          custSales.map((s) => (
                            <tr key={s.id}>
                              <td className="py-2 px-3 font-mono font-bold">{s.id}</td>
                              <td className="py-2 px-2 font-mono">
                                {formatDateDDMMYYYY(s.date)} · {s.time}
                              </td>
                              <td className="py-2 px-2">{s.doctorName}</td>
                              <td className="py-2 px-2">
                                {s.items
                                  .map((i) => `${i.medicineName} (${i.batchNo} x${i.qty})`)
                                  .join(', ')}
                              </td>
                              <td className="py-2 px-2 font-semibold">{s.paymentMode}</td>
                              <td className="py-2 px-2 text-right font-mono font-bold">
                                {formatINR(s.grandTotal)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailsCustomerId(null);
                                    setInvoiceModalSale(s);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> View PDF
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Customer Medicine Returns History */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    2. Customer Sales Returns History ({custReturns.length})
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <th className="py-2 px-3 text-left">Return ID</th>
                          <th className="py-2 px-2 text-left">Original Bill</th>
                          <th className="py-2 px-2 text-left">Date</th>
                          <th className="py-2 px-2 text-left">Medicine & Batch</th>
                          <th className="py-2 px-2 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Refund Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {custReturns.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-400">
                              No medicine returns recorded for this customer.
                            </td>
                          </tr>
                        ) : (
                          custReturns.map((r) => (
                            <tr key={r.id}>
                              <td className="py-2 px-3 font-mono font-bold">{r.id}</td>
                              <td className="py-2 px-2 font-mono">{r.saleId}</td>
                              <td className="py-2 px-2 font-mono">{formatDateDDMMYYYY(r.date)}</td>
                              <td className="py-2 px-2">
                                {r.medicineName} ({r.batchNo}) — {r.reason}
                              </td>
                              <td className="py-2 px-2 text-right font-mono">{r.qty}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {formatINR(r.refundAmount)}
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
          })()}
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit Customer ${editingCustomer.name}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveEditCustomer}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">Edit Customer — {editingCustomer.name}</h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400"
              >
                ✕
              </button>
            </div>
            <div>
              <label htmlFor="edit-cust-name" className="block font-medium mb-1">
                Customer Name
              </label>
              <input
                id="edit-cust-name"
                type="text"
                required
                value={editingCustomer.name}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="edit-cust-mobile" className="block font-medium mb-1">
                Mobile Number
              </label>
              <input
                id="edit-cust-mobile"
                type="tel"
                value={editingCustomer.mobile}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, mobile: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div>
              <label htmlFor="edit-cust-addr" className="block font-medium mb-1">
                Village / Address
              </label>
              <input
                id="edit-cust-addr"
                type="text"
                value={editingCustomer.address}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, address: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="edit-cust-udhaar" className="block font-medium mb-1">
                Pending Udhaar Balance (₹)
              </label>
              <input
                id="edit-cust-udhaar"
                type="number"
                min={0}
                value={editingCustomer.udhaarBalance}
                onChange={(e) =>
                  setEditingCustomer({
                    ...editingCustomer,
                    udhaarBalance: Math.max(0, Number(e.target.value || 0)),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deletingCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Customer"
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-red-600">
              Delete Customer — {deletingCustomer.name}?
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to remove <span className="font-semibold">{deletingCustomer.name}</span> from the customer ledger?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {receiveCustomerId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Receive Udhaar Payment"
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleReceivePayment}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
          >
            <h3 className="font-bold text-sm">Receive Udhaar (Credit) Payment</h3>
            <div>
              <label htmlFor="udhaar-amt-input" className="block font-medium mb-1">
                Amount Received (₹)
              </label>
              <input
                id="udhaar-amt-input"
                type="number"
                min={1}
                required
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiveCustomerId(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold"
              >
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
