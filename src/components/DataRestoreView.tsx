import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Trash2,
  Search,
  Package,
  Truck,
  User,
  FileText,
  CheckCircle2,
  Eye,
  X,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Hash,
} from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  type DeletedItemRecord,
} from '../utils/pharmacyLogic';

interface DataRestoreViewProps {
  deletedItems: DeletedItemRecord[];
  onRestoreItem: (record: DeletedItemRecord) => void;
  onRestoreAll: () => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
}

export const DataRestoreView: React.FC<DataRestoreViewProps> = ({
  deletedItems,
  onRestoreItem,
  onRestoreAll,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  const [filterType, setFilterType] = useState<
    'ALL' | 'MEDICINE' | 'SUPPLIER' | 'CUSTOMER' | 'SALE_BILL'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);

  // Selected item for the Detailed Metadata Inspection View
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    deletedItems[0]?.id || null
  );
  // Modal state when user clicks "Inspect in Popup Modal" or "Inspect Details"
  const [modalInspectItem, setModalInspectItem] = useState<DeletedItemRecord | null>(null);
  // Confirmation state before permanently deleting a single item
  const [confirmPermanentDeleteItem, setConfirmPermanentDeleteItem] =
    useState<DeletedItemRecord | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deletedItems.filter((item) => {
      if (
        filterType === 'MEDICINE' &&
        item.entityType !== 'MEDICINE' &&
        item.entityType !== 'BATCH'
      ) {
        return false;
      }
      if (filterType === 'SUPPLIER' && item.entityType !== 'SUPPLIER') return false;
      if (filterType === 'CUSTOMER' && item.entityType !== 'CUSTOMER') return false;
      if (filterType === 'SALE_BILL' && item.entityType !== 'SALE_BILL') return false;

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.entityType.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [deletedItems, filterType, searchQuery]);

  // Active item shown in the Detailed Inspector Panel
  const inspectedItem = useMemo(() => {
    if (filteredItems.length === 0) return null;
    if (selectedItemId) {
      const found = filteredItems.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return filteredItems[0];
  }, [filteredItems, selectedItemId]);

  const getTypeLabel = (type: DeletedItemRecord['entityType']) => {
    switch (type) {
      case 'MEDICINE':
        return 'Medicine & Batches';
      case 'BATCH':
        return 'Inventory Batch';
      case 'SUPPLIER':
        return 'Supplier Profile';
      case 'CUSTOMER':
        return 'Customer & Khata';
      case 'SALE_BILL':
        return 'Sales Bill';
    }
  };

  const getTypeBadgeStyle = (type: DeletedItemRecord['entityType']) => {
    switch (type) {
      case 'MEDICINE':
      case 'BATCH':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'SUPPLIER':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'CUSTOMER':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'SALE_BILL':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
  };

  const renderOriginalMetadataContent = (item: DeletedItemRecord) => {
    const batches = item.batches || [];
    const totalBatchStock = batches.reduce((s, b) => s + Number(b.quantity || 0), 0);
    const totalCostValue = batches.reduce(
      (s, b) => s + Number(b.quantity || 0) * Number(b.purchaseRate || 0),
      0
    );
    const totalMrpValue = batches.reduce(
      (s, b) => s + Number(b.quantity || 0) * Number(b.mrp || 0),
      0
    );

    return (
      <div className="space-y-4 text-xs">
        {/* Deletion Audit & Recovery Impact Summary */}
        <div className="grid sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Hash className="w-3 h-3" /> Snapshot Record ID
            </span>
            <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{item.id}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Deleted Timestamp
            </span>
            <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
              {item.deletedAt}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Integrity Status
            </span>
            <p className="font-semibold text-emerald-900 dark:text-emerald-200 mt-0.5">
              100% Original Metadata Intact
            </p>
          </div>
        </div>

        {/* 1. MEDICINE / BATCH ORIGINAL METADATA */}
        {(item.entityType === 'MEDICINE' || item.entityType === 'BATCH') && (
          <div className="space-y-4">
            {item.medicine && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Package className="w-4 h-4 text-emerald-700" />
                  Original Medicine Master Metadata
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Medicine ID</span>
                    <span className="font-mono font-bold">{item.medicine.id}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Brand Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.medicine.name}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-slate-500 block">
                      Generic Salt Composition
                    </span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                      {item.medicine.salt}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Manufacturer</span>
                    <span className="font-medium">{item.medicine.manufacturer}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Category & Schedule</span>
                    <span className="font-mono font-semibold">
                      {item.medicine.category} · Sch {item.medicine.schedule}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">HSN Code & GST</span>
                    <span className="font-mono">
                      HSN {item.medicine.hsn} ({item.medicine.gst}% GST)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Rack & Reorder Level</span>
                    <span className="font-mono font-semibold">
                      Rack {item.medicine.rack} · Min {item.medicine.reorderLevel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Pack Configuration</span>
                    <span className="font-mono">
                      {item.medicine.stripsPerBox} Strips x {item.medicine.unitsPerStrip} Units
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Last Sold Date</span>
                    <span className="font-mono">
                      {formatDateDDMMYYYY(item.medicine.lastSoldDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Total Recoverable Stock</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {totalBatchStock} Units ({batches.length} Batch{batches.length === 1 ? '' : 'es'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Stock Valuation (Cost / MRP)</span>
                    <span className="font-mono font-semibold">
                      {formatINR(totalCostValue)} / {formatINR(totalMrpValue)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {batches.length > 0 && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Original Batch Inventory Snapshot ({batches.length} Batch
                  {batches.length === 1 ? '' : 'es'})
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2 px-2.5 text-left">Batch ID</th>
                        <th className="py-2 px-2.5 text-left">Batch No & Barcode</th>
                        <th className="py-2 px-2.5 text-left">Expiry Date</th>
                        <th className="py-2 px-2.5 text-left">Purchase Date</th>
                        <th className="py-2 px-2.5 text-right">Stock Qty</th>
                        <th className="py-2 px-2.5 text-right">Pur. Rate</th>
                        <th className="py-2 px-2.5 text-right">MRP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {batches.map((b) => (
                        <tr key={b.id}>
                          <td className="py-2 px-2.5 font-mono">{b.id}</td>
                          <td className="py-2 px-2.5 font-mono font-bold">
                            {b.batchNo}{' '}
                            <span className="text-slate-400 font-normal">({b.barcode})</span>
                          </td>
                          <td className="py-2 px-2.5 font-mono">
                            {formatDateDDMMYYYY(b.expiryDate)}
                          </td>
                          <td className="py-2 px-2.5 font-mono">
                            {formatDateDDMMYYYY(b.purchaseDate)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold">
                            {b.quantity}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono">
                            {formatINR(b.purchaseRate)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold">
                            {formatINR(b.mrp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. SUPPLIER ORIGINAL METADATA */}
        {item.entityType === 'SUPPLIER' && item.supplier && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Truck className="w-4 h-4 text-amber-600" />
              Original Pharmaceutical Supplier Metadata
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block">Supplier ID</span>
                <span className="font-mono font-bold">{item.supplier.id}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Distributor / Firm Name</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {item.supplier.name}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Registered GSTIN</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {item.supplier.gstin}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Contact Phone</span>
                <span className="font-mono font-semibold">{item.supplier.phone}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Opening Ledger Balance</span>
                <span className="font-mono font-bold text-amber-600">
                  {formatINR(item.supplier.openingBalance)}
                </span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-[11px] text-slate-500 block">Full Address / Location</span>
                <span className="font-medium">{item.supplier.address}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. CUSTOMER ORIGINAL METADATA */}
        {item.entityType === 'CUSTOMER' && item.customer && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              Original Customer & Udhaar Khata Metadata
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block">Customer ID</span>
                <span className="font-mono font-bold">{item.customer.id}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Customer / Patient Name</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {item.customer.name}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Mobile Number</span>
                <span className="font-mono font-semibold">{item.customer.mobile}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Pending Udhaar Balance</span>
                <span className="font-mono font-bold text-amber-600">
                  {formatINR(item.customer.udhaarBalance)}
                </span>
              </div>
              <div className="sm:col-span-4">
                <span className="text-[11px] text-slate-500 block">Village / Address</span>
                <span className="font-medium">{item.customer.address}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. SALE BILL ORIGINAL METADATA */}
        {item.entityType === 'SALE_BILL' && item.sale && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Original Sales Invoice Metadata
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block">Invoice / Bill No</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {item.sale.id}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Date & Time</span>
                  <span className="font-mono font-semibold">
                    {formatDateDDMMYYYY(item.sale.date)} · {item.sale.time}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Customer / Patient</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.sale.customerName} ({item.sale.customerMobile})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Prescribing Doctor</span>
                  <span className="font-medium">{item.sale.doctorName || 'OTC'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Payment Mode</span>
                  <span className="font-semibold">{item.sale.paymentMode}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Taxable Subtotal</span>
                  <span className="font-mono">{formatINR(item.sale.subTotal)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">CGST + SGST</span>
                  <span className="font-mono">
                    {formatINR(item.sale.cgstTotal)} + {formatINR(item.sale.sgstTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Grand Total (Paid)</span>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatINR(item.sale.grandTotal)} (Paid: {formatINR(item.sale.paidAmount)})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white">
                Original Bill Line Items ({item.sale.items.length} Medicine
                {item.sale.items.length === 1 ? '' : 's'})
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 px-2.5 text-left">Medicine</th>
                      <th className="py-2 px-2.5 text-left">Batch & Expiry</th>
                      <th className="py-2 px-2.5 text-right">Qty</th>
                      <th className="py-2 px-2.5 text-right">MRP</th>
                      <th className="py-2 px-2.5 text-right">Disc %</th>
                      <th className="py-2 px-2.5 text-right">GST %</th>
                      <th className="py-2 px-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {item.sale.items.map((line, idx) => (
                      <tr key={`${line.batchId}-${idx}`}>
                        <td className="py-2 px-2.5 font-semibold">
                          {line.medicineName}{' '}
                          <span className="text-[10px] font-mono text-slate-500">
                            (Sch {line.schedule})
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono">
                          {line.batchNo} · Exp {formatDateDDMMYYYY(line.expiryDate)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold">{line.qty}</td>
                        <td className="py-2 px-2.5 text-right font-mono">{formatINR(line.mrp)}</td>
                        <td className="py-2 px-2.5 text-right font-mono">
                          {Number(line.discountPct || 0).toFixed(1)}%
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono">{line.gst}%</td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold">
                          {formatINR(line.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              Data Restoration & Recovery Center — Deleted Items ({deletedItems.length})
            </h2>
            <p className="text-xs text-slate-500">
              Inspect complete original metadata for each deleted Medicine, Supplier, Customer, or Sales Bill and click &ldquo;Recover&rdquo; to restore it immediately
            </p>
          </div>

          {deletedItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRestoreAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Recover All Deleted Items ({deletedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setConfirmEmptyOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Empty Trash
              </button>
            </div>
          )}
        </div>

        {/* Category Filter Tabs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            {(
              [
                { id: 'ALL', label: `All Deleted (${deletedItems.length})` },
                {
                  id: 'MEDICINE',
                  label: `Medicines & Batches (${
                    deletedItems.filter(
                      (i) => i.entityType === 'MEDICINE' || i.entityType === 'BATCH'
                    ).length
                  })`,
                },
                {
                  id: 'SUPPLIER',
                  label: `Suppliers (${
                    deletedItems.filter((i) => i.entityType === 'SUPPLIER').length
                  })`,
                },
                {
                  id: 'CUSTOMER',
                  label: `Customers (${
                    deletedItems.filter((i) => i.entityType === 'CUSTOMER').length
                  })`,
                },
                {
                  id: 'SALE_BILL',
                  label: `Sales Bills (${
                    deletedItems.filter((i) => i.entityType === 'SALE_BILL').length
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deleted items to inspect or restore..."
              className="w-full bg-transparent text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Deleted Items Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Record Type</th>
                <th className="py-2.5 px-3 text-left">Deleted Item Name</th>
                <th className="py-2.5 px-3 text-left">Complete Snapshot Summary</th>
                <th className="py-2.5 px-2 text-left">Deleted At</th>
                <th className="py-2.5 px-3 text-right">Inspect, Restore & Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        No deleted items in this category
                      </p>
                      <p className="text-[11px]">
                        Any Medicine, Batch, Supplier, Customer, or Sales Bill you delete will appear here for inspection and instant recovery.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = inspectedItem?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-semibold text-[11px] ${getTypeBadgeStyle(
                            item.entityType
                          )}`}
                        >
                          {(item.entityType === 'MEDICINE' || item.entityType === 'BATCH') && (
                            <Package className="w-3.5 h-3.5" />
                          )}
                          {item.entityType === 'SUPPLIER' && <Truck className="w-3.5 h-3.5" />}
                          {item.entityType === 'CUSTOMER' && <User className="w-3.5 h-3.5" />}
                          {item.entityType === 'SALE_BILL' && <FileText className="w-3.5 h-3.5" />}
                          {getTypeLabel(item.entityType)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {item.subtitle}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {item.deletedAt}
                      </td>
                      <td
                        className="py-2.5 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setModalInspectItem(item);
                            }}
                            aria-label={`Inspect original metadata for ${item.title}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Inspect Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onRestoreItem(item)}
                            aria-label={`Recover ${item.title}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3" /> Recover
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmPermanentDeleteItem(item)}
                            aria-label={`Permanently delete ${item.title}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-[11px] font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete Permanently
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Original Metadata Inspection View for Selected Recoverable Item */}
      {inspectedItem && (
        <div
          data-testid="recoverable-item-detail-panel"
          className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border-2 border-emerald-600/40 dark:border-emerald-500/40 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-bold text-xs ${getTypeBadgeStyle(
                    inspectedItem.entityType
                  )}`}
                >
                  {getTypeLabel(inspectedItem.entityType)}
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Original Metadata Inspector
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {inspectedItem.title}
              </h3>
              <p className="text-xs text-slate-500 font-mono">{inspectedItem.subtitle}</p>
            </div>

            {/* Quick Switcher Pills for All Filtered Items + Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onRestoreItem(inspectedItem)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Recover &ldquo;{inspectedItem.title}&rdquo; Now
              </button>
              <button
                type="button"
                onClick={() => setConfirmPermanentDeleteItem(inspectedItem)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Permanently Delete
              </button>
            </div>
          </div>

          {/* Item Selector Strip so User can click through each Recoverable Item */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              Select Item to Inspect:
            </span>
            {filteredItems.map((it) => (
              <button
                type="button"
                key={it.id}
                onClick={() => setSelectedItemId(it.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  inspectedItem.id === it.id
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {it.title}
              </button>
            ))}
          </div>

          {/* Complete Original Metadata Content */}
          {renderOriginalMetadataContent(inspectedItem)}
        </div>
      )}

      {/* Popup Modal for Detailed Metadata Inspection (when clicking "Inspect Details") */}
      {modalInspectItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Inspect Original Metadata for ${modalInspectItem.title}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-bold text-[11px] ${getTypeBadgeStyle(
                    modalInspectItem.entityType
                  )}`}
                >
                  {getTypeLabel(modalInspectItem.entityType)} — Original Metadata
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  {modalInspectItem.title}
                </h3>
                <p className="text-slate-500 font-mono">{modalInspectItem.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalInspectItem(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>

            {renderOriginalMetadataContent(modalInspectItem)}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalInspectItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Close Inspection
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = modalInspectItem;
                  setModalInspectItem(null);
                  setConfirmPermanentDeleteItem(target);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Permanently Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestoreItem(modalInspectItem);
                  setModalInspectItem(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Recover to Active Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Permanent Delete Single Item Modal */}
      {confirmPermanentDeleteItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Permanent Delete"
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3>Permanently Delete &ldquo;{confirmPermanentDeleteItem.title}&rdquo;?</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              This will permanently remove <strong>{confirmPermanentDeleteItem.title}</strong> (
              {getTypeLabel(confirmPermanentDeleteItem.entityType)}) from the Data Restoration
              Center. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPermanentDeleteItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onPermanentDelete(confirmPermanentDeleteItem.id);
                  setConfirmPermanentDeleteItem(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
              >
                Confirm Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Empty Trash Modal */}
      {confirmEmptyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Empty Trash"
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-red-600">
              Permanently Empty All Deleted Items?
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              This will permanently clear all {deletedItems.length} items from the Data Restoration
              Center.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmEmptyOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onEmptyTrash();
                  setConfirmEmptyOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Empty Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
