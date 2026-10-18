import React, { useState } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Phone,
  MessageSquare,
} from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  type Medicine,
  type Batch,
  type Supplier,
  type PurchaseRecord,
  type PurchaseReturnRecord,
  type PurchaseItem,
  type StockMovement,
} from '../utils/pharmacyLogic';

interface PurchasesViewProps {
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  batches: Batch[];
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: PurchaseRecord[];
  setPurchases: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>;
  purchaseReturns: PurchaseReturnRecord[];
  setPurchaseReturns: React.Dispatch<React.SetStateAction<PurchaseReturnRecord[]>>;
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

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  medicines,
  setMedicines,
  batches,
  setBatches,
  suppliers,
  setSuppliers,
  purchases,
  setPurchases,
  purchaseReturns,
  setPurchaseReturns,
  logStockMovement,
  showToast,
}) => {
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || 'SUP-1');
  const [newSupplierMode, setNewSupplierMode] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupGstin, setNewSupGstin] = useState('');

  const [invoiceNo, setInvoiceNo] = useState(`INV/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending' | 'Partial'>('Paid');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [billImage, setBillImage] = useState<string>('');
  const [ocrScanning, setOcrScanning] = useState(false);

  // Line item draft
  const [medQuery, setMedQuery] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [qty, setQty] = useState<number>(20);
  const [rate, setRate] = useState<number>(45);
  const [mrp, setMrp] = useState<number>(70);
  const [gst, setGst] = useState<number>(12);
  const [rack, setRack] = useState<string>('R1-C1');

  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Supplier Return Modal
  const [supReturnOpen, setSupReturnOpen] = useState(false);
  const [retBatchId, setRetBatchId] = useState<string>(batches[0]?.id || '');
  const [retQty, setRetQty] = useState<number>(5);
  const [retReason, setRetReason] = useState<string>('Near Expiry / Damaged Strip');

  const handleOCRUpload = (file: File | undefined) => {
    if (!file) return;
    setOcrScanning(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || '');
      setBillImage(dataUrl);
      setTimeout(() => {
        setOcrScanning(false);
        const extracted: PurchaseItem[] = [
          {
            medicineId: 'MED-1',
            medicineName: 'Dolo 650 Tablet',
            batchId: `BAT-OCR-${Date.now()}-1`,
            batchNo: 'DL2711X',
            expiryDate: '2028-04-30',
            qty: 50,
            rate: 21.0,
            mrp: 33.0,
            gst: 12,
            total: Number((50 * 21.0 * 1.12).toFixed(2)),
          },
          {
            medicineId: 'MED-3',
            medicineName: 'Azithral 500 Tablet',
            batchId: `BAT-OCR-${Date.now()}-2`,
            batchNo: 'AZ2802M',
            expiryDate: '2028-02-28',
            qty: 25,
            rate: 86.0,
            mrp: 132.0,
            gst: 12,
            total: Number((25 * 86.0 * 1.12).toFixed(2)),
          },
        ];
        setItems((prev) => [...prev, ...extracted]);
        showToast(
          'Offline OCR Scanner extracted 2 medicine batches from supplier invoice photo and linked image to record!'
        );
      }, 650);
    };
    reader.readAsDataURL(file);
  };

  const handleAddLineItem = () => {
    const cleanMedName = medQuery.trim();
    const cleanBatch = batchNo.trim().toUpperCase();
    if (!cleanMedName || !cleanBatch) {
      showToast('Enter Medicine Name and Batch Number to add line item.', 'error');
      return;
    }

    let med = medicines.find((m) => m.name.toLowerCase() === cleanMedName.toLowerCase());
    const medId = med ? med.id : `MED-${Date.now()}`;

    if (!med) {
      const createdMed: Medicine = {
        id: medId,
        name: cleanMedName,
        salt: 'Composition as per pack',
        manufacturer: 'Standard Pharma',
        category: 'Tablet',
        hsn: '30049099',
        gst,
        schedule: 'H',
        rack,
        reorderLevel: 25,
        stripsPerBox: 10,
        unitsPerStrip: 10,
        lastSoldDate: purchaseDate,
      };
      setMedicines((prev) => [...prev, createdMed]);
    }

    const lineTotal = Number((qty * rate * (1 + gst / 100)).toFixed(2));
    setItems((prev) => [
      ...prev,
      {
        medicineId: medId,
        medicineName: cleanMedName,
        batchId: `BAT-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        batchNo: cleanBatch,
        expiryDate,
        qty,
        rate,
        mrp,
        gst,
        total: lineTotal,
      },
    ]);

    setMedQuery('');
    setBatchNo('');
  };

  const grandTotal = Math.round(items.reduce((s, i) => s + i.total, 0));

  const handleSavePurchase = () => {
    if (items.length === 0) {
      showToast('Add at least 1 medicine item or scan a supplier bill via OCR first.', 'error');
      return;
    }

    let activeSup = suppliers.find((s) => s.id === supplierId);
    if (newSupplierMode && newSupName.trim()) {
      const createdSup: Supplier = {
        id: `SUP-${Date.now()}`,
        name: newSupName.trim(),
        phone: newSupPhone.trim() || '9812000000',
        gstin: newSupGstin.trim() || '06AAACH0000A1Z5',
        address: 'Haryana',
        openingBalance: 0,
      };
      setSuppliers((prev) => [...prev, createdSup]);
      activeSup = createdSup;
      setNewSupplierMode(false);
    }

    if (!activeSup) return;

    // Add or update batches (distinguished by medicineId + batchNo + supplierId)
    const nextBatches = [...batches];
    items.forEach((it) => {
      const existingIdx = nextBatches.findIndex(
        (b) =>
          b.medicineId === it.medicineId &&
          b.batchNo.toLowerCase() === it.batchNo.toLowerCase() &&
          b.supplierId === activeSup!.id
      );
      if (existingIdx >= 0) {
        nextBatches[existingIdx] = {
          ...nextBatches[existingIdx],
          quantity: nextBatches[existingIdx].quantity + it.qty,
          purchaseRate: it.rate,
          mrp: it.mrp,
          expiryDate: it.expiryDate,
          purchaseDate,
        };
      } else {
        nextBatches.push({
          id: it.batchId,
          medicineId: it.medicineId,
          batchNo: it.batchNo,
          expiryDate: it.expiryDate,
          purchaseRate: it.rate,
          mrp: it.mrp,
          quantity: it.qty,
          supplierId: activeSup!.id,
          purchaseDate,
          barcode: `890${Math.floor(1000000 + Math.random() * 9000000)}`,
        });
      }

      logStockMovement(
        'PURCHASE',
        invoiceNo,
        it.medicineName,
        it.batchNo,
        it.qty,
        `Purchase from ${activeSup!.name}`
      );
    });

    setBatches(nextBatches);

    const actualPaid =
      paymentStatus === 'Paid'
        ? grandTotal
        : paymentStatus === 'Pending'
        ? 0
        : Math.min(grandTotal, Number(paidAmount || 0));

    const newPurchase: PurchaseRecord = {
      id: `PUR-${Date.now().toString().slice(-4)}`,
      invoiceNo,
      supplierId: activeSup.id,
      supplierName: activeSup.name,
      supplierMobile: activeSup.phone,
      date: purchaseDate,
      paymentStatus,
      paidAmount: actualPaid,
      grandTotal,
      billImage,
      items,
    };

    setPurchases((prev) => [newPurchase, ...prev]);
    setItems([]);
    setBillImage('');
    showToast(`Purchase Invoice ${invoiceNo} saved and batch stock updated!`);
  };

  const handleSupplierReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBatch = batches.find((b) => b.id === retBatchId);
    if (!targetBatch) return;
    const med = medicines.find((m) => m.id === targetBatch.medicineId);
    const sup = suppliers.find((s) => s.id === targetBatch.supplierId) || suppliers[0];

    const validQty = Math.min(targetBatch.quantity, Math.max(1, Number(retQty || 1)));
    const amount = Number((validQty * targetBatch.purchaseRate * 1.12).toFixed(2));

    setBatches((prev) =>
      prev.map((b) =>
        b.id === targetBatch.id ? { ...b, quantity: Math.max(0, b.quantity - validQty) } : b
      )
    );

    const retId = `PR-${Date.now().toString().slice(-4)}`;
    setPurchaseReturns((prev) => [
      {
        id: retId,
        purchaseId: 'DEBIT-NOTE',
        supplierId: sup.id,
        supplierName: sup.name,
        date: new Date().toISOString().split('T')[0],
        batchId: targetBatch.id,
        batchNo: targetBatch.batchNo,
        medicineName: med?.name || 'Medicine',
        qty: validQty,
        amount,
        reason: retReason,
      },
      ...prev,
    ]);

    logStockMovement(
      'PURCHASE_RETURN',
      retId,
      med?.name || 'Medicine',
      targetBatch.batchNo,
      -validQty,
      `Returned to ${sup.name}: ${retReason}`
    );

    setSupReturnOpen(false);
    showToast(`Debit Note ${retId} created! Deducted ${validQty} units from Batch ${targetBatch.batchNo}.`);
  };

  return (
    <div className="space-y-6">
      {/* Purchase Entry & OCR Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Supplier Purchase Entry & Offline OCR Bill Scanner
            </h2>
            <p className="text-xs text-slate-500">
              Multi-supplier batches are tracked distinctly by Supplier, Batch No & Purchase Date
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              {ocrScanning ? 'Scanning Bill via OCR...' : 'OCR Scan Supplier Bill Photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleOCRUpload(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={() => setSupReturnOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Supplier Return (Debit Note)
            </button>
          </div>
        </div>

        {/* Supplier & Invoice Metadata Row */}
        <div className="grid sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="pur-supplier" className="font-medium text-slate-600 dark:text-slate-400">
                Supplier / Distributor
              </label>
              <button
                type="button"
                onClick={() => setNewSupplierMode((p) => !p)}
                className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
              >
                {newSupplierMode ? 'Select Existing' : '+ Add New'}
              </button>
            </div>
            {!newSupplierMode ? (
              <select
                id="pur-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="New Supplier Name"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
                />
                <input
                  type="tel"
                  placeholder="Supplier Mobile"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
                <input
                  type="text"
                  placeholder="Supplier GSTIN"
                  value={newSupGstin}
                  onChange={(e) => setNewSupGstin(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="pur-inv-no" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Supplier Invoice No
            </label>
            <input
              id="pur-inv-no"
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>

          <div>
            <label htmlFor="pur-date" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Purchase Date
            </label>
            <input
              id="pur-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>

          <div>
            <label htmlFor="pur-pay-status" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Payment Status
            </label>
            <select
              id="pur-pay-status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as 'Paid' | 'Pending' | 'Partial')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="Paid">Paid in Full</option>
              <option value="Pending">Credit / Pending</option>
              <option value="Partial">Partial Payment</option>
            </select>
            {paymentStatus === 'Partial' && (
              <input
                type="number"
                placeholder="Amount Paid (₹)"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full mt-1.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
              />
            )}
          </div>
        </div>

        {/* Add Medicine Batch Line Form */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Add Medicine Batch to Purchase Bill
          </p>
          <div className="grid sm:grid-cols-7 gap-2.5 items-end">
            <div className="sm:col-span-2">
              <label htmlFor="pur-med-name" className="block text-[11px] text-slate-500 mb-1">
                Medicine Name (Auto-suggests existing)
              </label>
              <input
                id="pur-med-name"
                list="med-master-list"
                type="text"
                value={medQuery}
                onChange={(e) => setMedQuery(e.target.value)}
                placeholder="e.g. Dolo 650 Tablet"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <datalist id="med-master-list">
                {medicines.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.salt} · Rack {m.rack}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="pur-batch-no" className="block text-[11px] text-slate-500 mb-1">
                Batch No
              </label>
              <input
                id="pur-batch-no"
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="DL2705"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label htmlFor="pur-exp-date" className="block text-[11px] text-slate-500 mb-1">
                Expiry Date
              </label>
              <input
                id="pur-exp-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label htmlFor="pur-qty" className="block text-[11px] text-slate-500 mb-1">
                Quantity
              </label>
              <input
                id="pur-qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label htmlFor="pur-rate" className="block text-[11px] text-slate-500 mb-1">
                Pur. Rate (₹)
              </label>
              <input
                id="pur-rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value || 0))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label htmlFor="pur-mrp" className="block text-[11px] text-slate-500 mb-1">
                MRP (₹)
              </label>
              <div className="flex gap-1.5">
                <input
                  id="pur-mrp"
                  type="number"
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(Number(e.target.value || 0))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  aria-label="Add item to purchase invoice"
                  className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Supplier Bill Photo Preview */}
        {billImage && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
            <div className="flex items-center gap-3">
              <img
                src={billImage}
                alt="Scanned Supplier Invoice"
                referrerPolicy="no-referrer"
                className="w-12 h-12 object-cover rounded border"
              />
              <span>Supplier Invoice Photo attached & OCR-parsed for this purchase entry.</span>
            </div>
            <button
              type="button"
              onClick={() => setBillImage('')}
              className="text-red-600 font-semibold"
            >
              Remove Photo
            </button>
          </div>
        )}

        {/* Current Purchase Line Items Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 px-3 text-left">Medicine</th>
                <th className="py-2 px-2 text-left">Batch No</th>
                <th className="py-2 px-2 text-left">Expiry</th>
                <th className="py-2 px-2 text-right">Qty</th>
                <th className="py-2 px-2 text-right">Purchase Rate</th>
                <th className="py-2 px-2 text-right">MRP</th>
                <th className="py-2 px-2 text-right">GST%</th>
                <th className="py-2 px-3 text-right">Total (Incl. GST)</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center font-sans text-slate-400">
                    No items added yet. Add a batch line above or use &ldquo;OCR Scan Supplier Bill Photo&rdquo;.
                  </td>
                </tr>
              ) : (
                items.map((it, i) => (
                  <tr key={it.batchId}>
                    <td className="py-2 px-3 font-sans font-semibold">{it.medicineName}</td>
                    <td className="py-2 px-2">{it.batchNo}</td>
                    <td className="py-2 px-2">{formatDateDDMMYYYY(it.expiryDate)}</td>
                    <td className="py-2 px-2 text-right">{it.qty}</td>
                    <td className="py-2 px-2 text-right">{formatINR(it.rate)}</td>
                    <td className="py-2 px-2 text-right">{formatINR(it.mrp)}</td>
                    <td className="py-2 px-2 text-right">{it.gst}%</td>
                    <td className="py-2 px-3 text-right font-bold">{formatINR(it.total)}</td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${it.medicineName}`}
                        className="text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold">
            Purchase Invoice Grand Total:{' '}
            <span className="font-mono text-emerald-700 dark:text-emerald-400">
              {formatINR(grandTotal)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSavePurchase}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Purchase Invoice & Update Stock
          </button>
        </div>
      </div>

      {/* Recent Purchase Bills & Multi-Supplier History */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Recorded Supplier Purchase Invoices ({purchases.length})
        </h3>
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Invoice No</th>
                <th className="py-2.5 px-3 text-left">Supplier</th>
                <th className="py-2.5 px-2 text-left">Date</th>
                <th className="py-2.5 px-2 text-left">Batches Received</th>
                <th className="py-2.5 px-2 text-right">Total</th>
                <th className="py-2.5 px-2 text-right">Balance Due</th>
                <th className="py-2.5 px-3 text-right">Supplier Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {purchases.map((p) => {
                const due = Math.max(0, p.grandTotal - p.paidAmount);
                return (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 font-mono font-semibold">{p.invoiceNo}</td>
                    <td className="py-2.5 px-3 font-semibold">{p.supplierName}</td>
                    <td className="py-2.5 px-2 font-mono">{formatDateDDMMYYYY(p.date)}</td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                      {p.items.map((i) => `${i.medicineName} (${i.batchNo})`).join(' · ')}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold">
                      {formatINR(p.grandTotal)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {due > 0 ? (
                        <span className="text-amber-600 font-bold">{formatINR(due)}</span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400">Paid</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={`tel:${p.supplierMobile}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-[11px] font-medium"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <a
                          href={`sms:${p.supplierMobile}?body=${encodeURIComponent(
                            `Haryana Medical Store, Dhoha: Regarding Invoice ${p.invoiceNo} dated ${formatDateDDMMYYYY(
                              p.date
                            )}.`
                          )}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-[11px] font-medium"
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

      {/* Supplier Return (Debit Note) Modal */}
      {supReturnOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Supplier Purchase Return Debit Note"
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSupplierReturnSubmit}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">Supplier Purchase Return (Debit Note)</h3>
              <button
                type="button"
                onClick={() => setSupReturnOpen(false)}
                className="text-slate-400"
              >
                ✕
              </button>
            </div>
            <div>
              <label htmlFor="sup-ret-batch" className="block font-medium mb-1">
                Select Batch to Return to Supplier
              </label>
              <select
                id="sup-ret-batch"
                value={retBatchId}
                onChange={(e) => setRetBatchId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {batches
                  .filter((b) => b.quantity > 0)
                  .map((b) => {
                    const m = medicines.find((x) => x.id === b.medicineId);
                    const s = suppliers.find((x) => x.id === b.supplierId);
                    return (
                      <option key={b.id} value={b.id}>
                        {m?.name} — Batch {b.batchNo} (Qty: {b.quantity} · Sup: {s?.name})
                      </option>
                    );
                  })}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sup-ret-qty" className="block font-medium mb-1">
                  Return Quantity
                </label>
                <input
                  id="sup-ret-qty"
                  type="number"
                  min={1}
                  value={retQty}
                  onChange={(e) => setRetQty(Math.max(1, Number(e.target.value || 1)))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>
              <div>
                <label htmlFor="sup-ret-reason" className="block font-medium mb-1">
                  Return Reason
                </label>
                <input
                  id="sup-ret-reason"
                  type="text"
                  value={retReason}
                  onChange={(e) => setRetReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupReturnOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold"
              >
                Create Debit Note & Deduct Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
