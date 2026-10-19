import React, { useState, useMemo } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Hash,
  FileText,
} from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  daysUntil,
  generateNextSaleBillId,
  selectFEFOBatches,
  calculateCartTotals,
  type Medicine,
  type Batch,
  type Customer,
  type SaleRecord,
  type SaleReturnRecord,
  type CartItem,
  type StockMovement,
  type DeletedItemRecord,
} from '../utils/pharmacyLogic';

interface SalesPOSViewProps {
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  batches: Batch[];
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  saleReturns: SaleReturnRecord[];
  setSaleReturns: React.Dispatch<React.SetStateAction<SaleReturnRecord[]>>;
  logStockMovement: (
    type: StockMovement['type'],
    refId: string,
    medicineName: string,
    batchNo: string,
    qtyChange: number,
    note: string
  ) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setInvoiceModalSale: (sale: SaleRecord) => void;
  editingSale: SaleRecord | null;
  clearEditingSale: () => void;
  deletedItems: DeletedItemRecord[];
  onRecordDeleted: (record: DeletedItemRecord) => void;
  onRestoreItem: (record: DeletedItemRecord) => void;
  onOpenDataRestore: () => void;
}

export const SalesPOSView: React.FC<SalesPOSViewProps> = ({
  medicines,
  setMedicines,
  batches,
  setBatches,
  customers,
  setCustomers,
  sales,
  setSales,
  setSaleReturns,
  logStockMovement,
  showToast,
  setInvoiceModalSale,
  editingSale,
  clearEditingSale,
  deletedItems,
  onRecordDeleted,
  onRestoreItem,
  onOpenDataRestore,
}) => {
  const [medSearch, setMedSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (editingSale) {
      return editingSale.items.map((it) => {
        const b = batches.find((x) => x.id === it.batchId);
        return {
          ...it,
          availableQty: (b?.quantity || 0) + it.qty,
        };
      });
    }
    return [];
  });

  const [customerName, setCustomerName] = useState(
    editingSale ? editingSale.customerName : 'Walk-in Customer'
  );
  const [customerMobile, setCustomerMobile] = useState(
    editingSale ? editingSale.customerMobile : '9813400001'
  );
  const [doctorName, setDoctorName] = useState(editingSale ? editingSale.doctorName : '');
  const [billDiscount, setBillDiscount] = useState<number>(
    editingSale ? editingSale.billDiscount : 0
  );
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Udhaar'>(
    editingSale ? editingSale.paymentMode : 'Cash'
  );
  const [paidAmount, setPaidAmount] = useState<string>(
    editingSale ? String(editingSale.paidAmount) : ''
  );

  // Below-cost confirmation modal (avoids window.confirm)
  const [belowCostConfirmOpen, setBelowCostConfirmOpen] = useState(false);

  // Customer Return Modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedReturnSaleId, setSelectedReturnSaleId] = useState<string>(
    sales[0]?.id || ''
  );
  const [returnItemBatchId, setReturnItemBatchId] = useState<string>('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>('Doctor changed prescription');

  // Sync when editingSale prop changes
  React.useEffect(() => {
    if (editingSale) {
      setCart(
        editingSale.items.map((it) => {
          const b = batches.find((x) => x.id === it.batchId);
          return {
            ...it,
            availableQty: (b?.quantity || 0) + it.qty,
          };
        })
      );
      setCustomerName(editingSale.customerName);
      setCustomerMobile(editingSale.customerMobile);
      setDoctorName(editingSale.doctorName);
      setBillDiscount(editingSale.billDiscount);
      setPaymentMode(editingSale.paymentMode);
      setPaidAmount(String(editingSale.paidAmount));
    }
  }, [editingSale, batches]);

  const addMedicineToCart = (med: Medicine, preferredBatch?: Batch) => {
    const fefo = selectFEFOBatches(med.id, batches);
    if (fefo.validBatches.length === 0) {
      if (fefo.expiredBatches.length > 0) {
        showToast(
          `Blocked: All available stock of ${med.name} is EXPIRED (${formatDateDDMMYYYY(
            fefo.expiredBatches[0].expiryDate
          )}). Cannot sell!`,
          'error'
        );
      } else {
        showToast(`Out of Stock: ${med.name} has 0 valid quantity available.`, 'error');
      }
      return;
    }

    const chosenBatch =
      preferredBatch && daysUntil(preferredBatch.expiryDate) >= 0
        ? preferredBatch
        : fefo.chosenBatch!;

    const existingIdx = cart.findIndex((c) => c.batchId === chosenBatch.id);
    if (existingIdx >= 0) {
      const currentQty = cart[existingIdx].qty;
      if (currentQty + 1 > chosenBatch.quantity) {
        showToast(
          `Blocked: Cannot exceed available batch stock (${chosenBatch.quantity} units)!`,
          'error'
        );
        return;
      }
      const next = [...cart];
      next[existingIdx].qty += 1;
      setCart(next);
    } else {
      setCart((prev) => [
        ...prev,
        {
          medicineId: med.id,
          medicineName: med.name,
          schedule: med.schedule,
          batchId: chosenBatch.id,
          batchNo: chosenBatch.batchNo,
          expiryDate: chosenBatch.expiryDate,
          availableQty: chosenBatch.quantity,
          qty: 1,
          mrp: chosenBatch.mrp,
          purchaseRate: chosenBatch.purchaseRate,
          discountPct: 0,
          gst: med.gst,
        },
      ]);
    }
    setMedSearch('');
  };

  const handleBarcodeScan = (code: string) => {
    setBarcodeInput(code);
    const trimmed = code.trim();
    if (!trimmed) return;
    const foundBatch = batches.find((b) => b.barcode === trimmed);
    if (foundBatch) {
      const med = medicines.find((m) => m.id === foundBatch.medicineId);
      if (med) {
        if (daysUntil(foundBatch.expiryDate) < 0) {
          showToast(
            `Blocked: Scanned batch ${foundBatch.batchNo} of ${med.name} is EXPIRED!`,
            'error'
          );
        } else {
          addMedicineToCart(med, foundBatch);
          showToast(`Scanned ${med.name} (Batch ${foundBatch.batchNo})`);
        }
        setBarcodeInput('');
      }
    }
  };

  const totals = useMemo(() => calculateCartTotals(cart, billDiscount), [cart, billDiscount]);

  const nextBillNumber = useMemo(
    () => (editingSale ? editingSale.id : generateNextSaleBillId(sales, 2026)),
    [editingSale, sales]
  );

  const lastBillNumber = sales[0]?.id || 'None';

  const matchedCustomers = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    if (!q || q === 'walk-in customer') return [];
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q)
    );
  }, [customerName, customers]);

  const executeSaleCommit = () => {
    setBelowCostConfirmOpen(false);
    const today = new Date().toISOString().split('T')[0];

    // If editing an existing sale, first restore its previous batch quantities
    let workingBatches = [...batches];
    if (editingSale) {
      workingBatches = workingBatches.map((b) => {
        const oldItem = editingSale.items.find((i) => i.batchId === b.id);
        return oldItem ? { ...b, quantity: b.quantity + oldItem.qty } : b;
      });
    }

    // Deduct new quantities
    workingBatches = workingBatches.map((b) => {
      const cartItem = totals.items.find((c) => c.batchId === b.id);
      if (!cartItem) return b;
      return { ...b, quantity: Math.max(0, b.quantity - cartItem.qty) };
    });
    setBatches(workingBatches);

    // Update lastSoldDate on sold medicines
    const soldMedIds = new Set(totals.items.map((i) => i.medicineId));
    setMedicines((prev) =>
      prev.map((m) => (soldMedIds.has(m.id) ? { ...m, lastSoldDate: today } : m))
    );

    // Handle Customer & Udhaar Balance
    const cleanName = customerName.trim() || 'Walk-in Customer';
    const cleanMobile = customerMobile.trim() || '';
    const existingCust = customers.find(
      (c) =>
        c.name.toLowerCase() === cleanName.toLowerCase() ||
        (cleanMobile && c.mobile === cleanMobile)
    );

    const actualPaid =
      paymentMode === 'Udhaar'
        ? Math.min(totals.grandTotal, Math.max(0, Number(paidAmount || 0)))
        : totals.grandTotal;
    const creditAdded = Math.max(0, totals.grandTotal - actualPaid);

    let customerId = existingCust ? existingCust.id : `CUST-${Date.now()}`;
    if (existingCust) {
      if (creditAdded > 0) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === existingCust.id
              ? { ...c, udhaarBalance: Number(c.udhaarBalance || 0) + creditAdded }
              : c
          )
        );
      }
    } else {
      setCustomers((prev) => [
        ...prev,
        {
          id: customerId,
          name: cleanName,
          mobile: cleanMobile,
          address: 'Dhoha / Local',
          udhaarBalance: creditAdded,
        },
      ]);
    }

    const billId = nextBillNumber;

    const saleRecord: SaleRecord = {
      id: billId,
      date: today,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerId,
      customerName: cleanName,
      customerMobile: cleanMobile,
      doctorName: doctorName.trim() || 'Self / OTC',
      paymentMode,
      paidAmount: actualPaid,
      billDiscount: totals.billDiscount,
      subTotal: totals.subTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      items: totals.items.map((it) => ({
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        schedule: it.schedule,
        batchId: it.batchId,
        batchNo: it.batchNo,
        expiryDate: it.expiryDate,
        qty: it.qty,
        mrp: it.mrp,
        purchaseRate: it.purchaseRate,
        discountPct: it.discountPct,
        gst: it.gst,
        total: it.total!,
      })),
    };

    if (editingSale) {
      setSales((prev) => prev.map((s) => (s.id === editingSale.id ? saleRecord : s)));
      logStockMovement(
        'ADJUSTMENT',
        billId,
        totals.items.map((i) => i.medicineName).join(', '),
        totals.items.map((i) => i.batchNo).join(', '),
        0,
        `Edited Bill ${billId} for ${cleanName}`
      );
      clearEditingSale();
    } else {
      setSales((prev) => [saleRecord, ...prev]);
      totals.items.forEach((it) => {
        logStockMovement(
          'SALE',
          billId,
          it.medicineName,
          it.batchNo,
          -it.qty,
          `Sold to ${cleanName} (${paymentMode})`
        );
      });
    }

    setCart([]);
    setBillDiscount(0);
    setPaidAmount('');
    setInvoiceModalSale(saleRecord);
    showToast(`Bill ${billId} saved automatically! Opening built-in PDF Invoice Viewer.`);
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      showToast('Please add at least 1 medicine to the bill first.', 'error');
      return;
    }
    if (totals.hasBelowCostItem) {
      setBelowCostConfirmOpen(true);
      return;
    }
    executeSaleCommit();
  };

  const handleCustomerReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSale = sales.find((s) => s.id === selectedReturnSaleId);
    if (!targetSale) return;
    const targetItem =
      targetSale.items.find((i) => i.batchId === returnItemBatchId) || targetSale.items[0];
    if (!targetItem) return;

    const validQty = Math.min(targetItem.qty, Math.max(1, Number(returnQty || 1)));
    const refundAmount = Number(((targetItem.total / targetItem.qty) * validQty).toFixed(2));

    // Restore batch stock automatically
    setBatches((prev) =>
      prev.map((b) =>
        b.id === targetItem.batchId ? { ...b, quantity: b.quantity + validQty } : b
      )
    );

    const returnId = `SR-${Date.now().toString().slice(-4)}`;
    setSaleReturns((prev) => [
      {
        id: returnId,
        saleId: targetSale.id,
        customerName: targetSale.customerName,
        date: new Date().toISOString().split('T')[0],
        batchId: targetItem.batchId,
        batchNo: targetItem.batchNo,
        medicineName: targetItem.medicineName,
        qty: validQty,
        refundAmount,
        reason: returnReason,
      },
      ...prev,
    ]);

    logStockMovement(
      'SALE_RETURN',
      returnId,
      targetItem.medicineName,
      targetItem.batchNo,
      validQty,
      `Customer Return from Bill ${targetSale.id}: ${returnReason}`
    );

    setReturnModalOpen(false);
    showToast(
      `Return processed! +${validQty} units of ${targetItem.medicineName} restored to Batch ${targetItem.batchNo}.`
    );
  };

  const searchMatches = useMemo(() => {
    const q = medSearch.trim().toLowerCase();
    if (!q) return [];
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.salt.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.rack.toLowerCase().includes(q)
    );
  }, [medSearch, medicines]);

  const deletedSaleBills = useMemo(
    () => deletedItems.filter((d) => d.entityType === 'SALE_BILL'),
    [deletedItems]
  );

  const handleDeleteSaleBill = (sale: SaleRecord) => {
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
    showToast(`Deleted Bill ${sale.id}! Click 'Restore' below or in Data Restore to recover it.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Top Full-Width Quick Restore Bar for Medicines, Suppliers, Sale Records & Customers */}
      <div className="lg:col-span-12 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="font-bold text-amber-950 dark:text-amber-200">
            Data Restoration & Deleted Records ({deletedItems.length} Recoverable):
          </span>
          <span className="hidden sm:inline text-amber-800 dark:text-amber-300">
            Recover deleted Medicines, Suppliers, Sale Bills & Customers anytime
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {deletedItems.slice(0, 3).map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onRestoreItem(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Restore {item.title}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenDataRestore}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-[11px] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Open Full Data Restore ({deletedItems.length})
          </button>
        </div>
      </div>

      {/* Left 8 Columns: Medicine Search, Barcode & Active Cart Table */}
      <div className="lg:col-span-8 min-w-0 bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingSale ? `Editing Bill ${editingSale.id}` : 'POS Billing Counter (FEFO Auto-Batch)'}
              </h2>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-mono tabular-nums text-xs font-bold">
                <Hash className="w-3.5 h-3.5" />
                Auto Bill No: {nextBillNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatic sequential bill numbering active (Last Bill: <span className="font-mono font-semibold">{lastBillNumber}</span>) · Expired stock strictly blocked
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editingSale && (
              <button
                type="button"
                onClick={() => {
                  clearEditingSale();
                  setCart([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => setReturnModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Customer Return
            </button>
          </div>
        </div>

        {/* Search & Barcode Row */}
        <div className="grid sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <label htmlFor="pos-med-search" className="sr-only">
              Search Medicine by Brand or Salt
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 focus-within:border-emerald-600">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                id="pos-med-search"
                type="text"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                placeholder="Search medicine by brand, generic salt, or rack (e.g. Dolo, Paracetamol, Azithral)..."
                className="w-full bg-transparent text-xs sm:text-sm focus:outline-none"
              />
              {medSearch && (
                <button
                  type="button"
                  onClick={() => setMedSearch('')}
                  aria-label="Clear medicine search"
                  className="text-sm font-bold text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {searchMatches.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-72 overflow-y-auto z-30 divide-y divide-slate-100 dark:divide-slate-800">
                {searchMatches.map((med) => {
                  const fefo = selectFEFOBatches(med.id, batches);
                  const totalValidQty = fefo.validBatches.reduce((s, b) => s + b.quantity, 0);
                  const isExpiredOnly = totalValidQty === 0 && fefo.expiredBatches.length > 0;

                  return (
                    <button
                      type="button"
                      key={med.id}
                      onClick={() => addMedicineToCart(med)}
                      className="w-full text-left p-3 hover:bg-emerald-50/70 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {med.name}
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            Sch {med.schedule} · Rack {med.rack}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">{med.salt} · {med.manufacturer}</p>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        {fefo.chosenBatch ? (
                          <>
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              {formatINR(fefo.chosenBatch.mrp)} · +Add FEFO
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Batch {fefo.chosenBatch.batchNo} · Exp{' '}
                              {formatDateDDMMYYYY(fefo.chosenBatch.expiryDate)} · Qty {totalValidQty}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-bold text-red-600">
                            {isExpiredOnly ? 'EXPIRED STOCK (Blocked)' : 'Out of Stock (0)'}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="pos-barcode-input" className="sr-only">
              Scan or Enter Barcode
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <Barcode className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                id="pos-barcode-input"
                type="text"
                value={barcodeInput}
                onChange={(e) => handleBarcodeScan(e.target.value)}
                placeholder="Barcode (e.g. 8901111001)"
                className="w-full bg-transparent text-xs sm:text-sm font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Tap Popular Medicines Strip (Wraps cleanly on Android mobile) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">Quick Add:</span>
          {medicines.slice(0, 6).map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => addMedicineToCart(m)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95"
            >
              + {m.name}
            </button>
          ))}
        </div>

        {/* Cart Items Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Medicine</th>
                <th className="py-2.5 px-2 text-left">FEFO Batch</th>
                <th className="py-2.5 px-2 text-left">Expiry</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-2 text-right">MRP</th>
                <th className="py-2.5 px-2 text-center">Disc%</th>
                <th className="py-2.5 px-2 text-center">GST%</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
                <th className="py-2.5 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {totals.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Cart is empty. Search a medicine above or use a Quick Add button to begin billing.
                  </td>
                </tr>
              ) : (
                totals.items.map((item, idx) => {
                  const medBatches = batches.filter(
                    (b) =>
                      b.medicineId === item.medicineId &&
                      b.quantity > 0 &&
                      daysUntil(b.expiryDate) >= 0
                  );

                  return (
                    <tr key={item.batchId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.medicineName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Sch {item.schedule} · GST {item.gst}%
                          {item.belowCost && (
                            <span className="ml-2 text-amber-600 font-semibold">
                              ⚠ Below Cost ({formatINR(item.purchaseRate)})
                            </span>
                          )}
                        </p>
                      </td>
                      <td data-label="FEFO Batch" className="py-2.5 px-2 font-mono">
                        {medBatches.length > 1 ? (
                          <select
                            aria-label={`Select batch for ${item.medicineName}`}
                            value={item.batchId}
                            onChange={(e) => {
                              const newBatch = medBatches.find((b) => b.id === e.target.value);
                              if (!newBatch) return;
                              const next = [...cart];
                              next[idx] = {
                                ...next[idx],
                                batchId: newBatch.id,
                                batchNo: newBatch.batchNo,
                                expiryDate: newBatch.expiryDate,
                                availableQty: newBatch.quantity,
                                mrp: newBatch.mrp,
                                purchaseRate: newBatch.purchaseRate,
                                qty: Math.min(next[idx].qty, newBatch.quantity),
                              };
                              setCart(next);
                            }}
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
                          >
                            {medBatches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.batchNo} ({b.quantity})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{item.batchNo}</span>
                        )}
                      </td>
                      <td data-label="Expiry Date" className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                        {formatDateDDMMYYYY(item.expiryDate)}
                      </td>
                      <td data-label="Quantity" className="py-2.5 px-2 text-center font-mono">
                        <input
                          type="number"
                          min={1}
                          max={item.availableQty}
                          aria-label={`Quantity for ${item.medicineName}`}
                          value={item.qty}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value || 1));
                            if (val > item.availableQty) {
                              showToast(
                                `Max available stock in batch ${item.batchNo} is ${item.availableQty}`,
                                'error'
                              );
                              return;
                            }
                            const next = [...cart];
                            next[idx].qty = val;
                            setCart(next);
                          }}
                          className="w-20 sm:w-16 text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-1"
                        />
                      </td>
                      <td data-label="MRP" className="py-2.5 px-2 text-right font-mono">{formatINR(item.mrp)}</td>
                      <td data-label="Discount %" className="py-2.5 px-2 text-center font-mono">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          aria-label={`Discount percentage for ${item.medicineName}`}
                          value={item.discountPct}
                          onChange={(e) => {
                            const next = [...cart];
                            next[idx].discountPct = Math.min(
                              100,
                              Math.max(0, Number(e.target.value || 0))
                            );
                            setCart(next);
                          }}
                          className="w-20 sm:w-14 text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-1"
                        />
                      </td>
                      <td data-label="GST %" className="py-2.5 px-2 text-center font-mono">
                        <select
                          aria-label={`GST percentage for ${item.medicineName}`}
                          value={item.gst}
                          onChange={(e) => {
                            const next = [...cart];
                            next[idx].gst = Number(e.target.value);
                            setCart(next);
                          }}
                          className="bg-emerald-50 dark:bg-slate-800 border border-emerald-500/60 rounded-lg px-2 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td data-label="Line Total" className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatINR(item.total)}
                      </td>
                      <td data-label="Action" className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                          aria-label={`Remove ${item.medicineName} from bill`}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right 4 Columns: Customer Details, Payment Mode & Checkout Summary */}
      <div className="lg:col-span-4 min-w-0 bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Customer & Checkout
          </h3>
          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
            #{nextBillNumber}
          </span>
        </div>

        {/* Automatic Bill Number Display Field */}
        <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="block font-semibold text-emerald-900 dark:text-emerald-200">
              Automatic Bill Number (Sales)
            </span>
            <span className="text-[11px] text-slate-500">
              Auto-increments sequentially on checkout
            </span>
          </div>
          <span
            data-testid="auto-bill-number"
            className="font-mono text-xs sm:text-sm font-extrabold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-700 whitespace-nowrap shrink-0"
          >
            {nextBillNumber}
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="relative">
            <label htmlFor="pos-cust-name" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Customer / Patient Name
            </label>
            <input
              id="pos-cust-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer or type name"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            {matchedCustomers.length > 0 && (
              <div className="mt-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                {matchedCustomers.slice(0, 3).map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setCustomerName(c.name);
                      setCustomerMobile(c.mobile);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-700 flex justify-between items-center text-[11px]"
                  >
                    <span className="font-semibold">{c.name} ({c.mobile})</span>
                    <span className="font-mono text-amber-600">
                      Udhaar: {formatINR(c.udhaarBalance)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="pos-cust-mobile" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Mobile Number
              </label>
              <input
                id="pos-cust-mobile"
                type="tel"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="98134XXXXX"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div>
              <label htmlFor="pos-doc-name" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Doctor Name
              </label>
              <input
                id="pos-doc-name"
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. Verma / OTC"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
              />
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <span className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Payment Mode
            </span>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['Cash', 'UPI', 'Card', 'Udhaar'] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {paymentMode === 'Udhaar' && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
              <label htmlFor="pos-paid-amount" className="block font-semibold text-amber-800 dark:text-amber-300">
                Partial Cash Received Now (₹)
              </label>
              <input
                id="pos-paid-amount"
                type="number"
                min={0}
                max={totals.grandTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-mono"
              />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                 Udhaar Added to Ledger:{' '}
                {formatINR(Math.max(0, totals.grandTotal - Number(paidAmount || 0)))}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="pos-bill-discount" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Extra Bill Discount (₹)
            </label>
            <input
              id="pos-bill-discount"
              type="number"
              min={0}
              value={billDiscount}
              onChange={(e) => setBillDiscount(Math.max(0, Number(e.target.value || 0)))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>

          {/* Bill Breakdown */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-sans">Taxable SubTotal:</span>
              <span>{formatINR(totals.subTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-sans">CGST (6%):</span>
              <span>{formatINR(totals.cgstTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-sans">SGST (6%):</span>
              <span>{formatINR(totals.sgstTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-sans">Round Off:</span>
              <span>{formatINR(totals.roundOff)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700 pt-2">
              <span className="font-sans">Grand Total:</span>
              <span className="text-emerald-700 dark:text-emerald-400">
                {formatINR(totals.grandTotal)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckoutClick}
            className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {editingSale
              ? `Update Sale (${nextBillNumber}) & View Invoice`
              : `Complete Sale (${nextBillNumber}) & Generate Invoice`}
          </button>
        </div>
      </div>

      {/* Bottom Full-Width Section: Recent Sales Bills & Deleted Sale Records (Restore) */}
      <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Sales Bills ({sales.length}) & Deleted Sale Records Restore ({deletedSaleBills.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              View PDF Invoices, delete sales bills, or immediately restore deleted sale records
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDataRestore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-400/50 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            View All Deleted Records ({deletedItems.length})
          </button>
        </div>

        {/* Deleted Sales Bills Restore Box */}
        {deletedSaleBills.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                Deleted Sale Records Ready to Restore ({deletedSaleBills.length})
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {deletedSaleBills.map((item) => (
                <div
                  key={item.id}
                  className="min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white break-words">{item.title}</p>
                    <p className="text-[11px] text-slate-500 break-words">{item.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestoreItem(item)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer shadow-xs w-full sm:w-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Recover Sale Bill
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Sales Bills Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 px-3 text-left">Bill No</th>
                <th className="py-2 px-2 text-left">Date & Time</th>
                <th className="py-2 px-3 text-left">Customer / Doctor</th>
                <th className="py-2 px-2 text-left">Items</th>
                <th className="py-2 px-2 text-left">Mode</th>
                <th className="py-2 px-2 text-right">Grand Total</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {s.id}
                  </td>
                  <td data-label="Date & Time" className="py-2 px-2 font-mono text-slate-500">
                    {formatDateDDMMYYYY(s.date)} · {s.time}
                  </td>
                  <td data-label="Customer" className="py-2 px-3">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {s.customerName}
                    </span>{' '}
                    <span className="text-slate-500">({s.doctorName})</span>
                  </td>
                  <td data-label="Medicines" className="py-2 px-2 text-slate-600 dark:text-slate-300">
                    {s.items.map((i) => `${i.medicineName} (x${i.qty})`).join(', ')}
                  </td>
                  <td data-label="Payment" className="py-2 px-2">{s.paymentMode}</td>
                  <td data-label="Grand Total" className="py-2 px-2 text-right font-mono font-bold">
                    {formatINR(s.grandTotal)}
                  </td>
                  <td data-label="Actions" className="py-2 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInvoiceModalSale(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <FileText className="w-3 h-3" /> Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSaleBill(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[11px] font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Below-Purchase-Price Confirmation Modal */}
      {belowCostConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Below Purchase Rate Warning"
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Selling Below Purchase Rate Warning</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              One or more items in this bill have a discounted price lower than their purchase cost
              rate. Do you still want to proceed and generate the invoice?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBelowCostConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Adjust Discount
              </button>
              <button
                type="button"
                onClick={executeSaleCommit}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Return Modal */}
      {returnModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Process Customer Medicine Return"
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCustomerReturnSubmit}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">Customer Medicine Return (Restores Batch Stock)</h3>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label htmlFor="ret-sale-select" className="block font-medium mb-1">
                Select Original Sales Bill
              </label>
              <select
                id="ret-sale-select"
                value={selectedReturnSaleId}
                onChange={(e) => {
                  setSelectedReturnSaleId(e.target.value);
                  const found = sales.find((s) => s.id === e.target.value);
                  if (found && found.items[0]) {
                    setReturnItemBatchId(found.items[0].batchId);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {sales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.customerName} ({formatDateDDMMYYYY(s.date)})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const targetSale = sales.find((s) => s.id === selectedReturnSaleId);
              if (!targetSale) return null;
              return (
                <>
                  <div>
                    <label htmlFor="ret-med-select" className="block font-medium mb-1">
                      Select Medicine Item to Return
                    </label>
                    <select
                      id="ret-med-select"
                      value={returnItemBatchId || targetSale.items[0]?.batchId || ''}
                      onChange={(e) => setReturnItemBatchId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {targetSale.items.map((it) => (
                        <option key={it.batchId} value={it.batchId}>
                          {it.medicineName} (Batch {it.batchNo} · Sold Qty: {it.qty})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ret-qty-input" className="block font-medium mb-1">
                        Return Quantity
                      </label>
                      <input
                        id="ret-qty-input"
                        type="number"
                        min={1}
                        value={returnQty}
                        onChange={(e) => setReturnQty(Math.max(1, Number(e.target.value || 1)))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-reason-input" className="block font-medium mb-1">
                        Reason
                      </label>
                      <input
                        id="ret-reason-input"
                        type="text"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                      />
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold"
              >
                Confirm Return & Restore Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
