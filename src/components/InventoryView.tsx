import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  History,
  Eye,
  Edit3,
  Trash2,
  Package,
  X,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  daysUntil,
  getMedicineCompleteHistory,
  type Medicine,
  type Batch,
  type Supplier,
  type ShopSettings,
  type StockMovement,
  type SaleRecord,
  type PurchaseRecord,
  type DeletedItemRecord,
} from '../utils/pharmacyLogic';

interface InventoryViewProps {
  settings: ShopSettings;
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  batches: Batch[];
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  suppliers: Supplier[];
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  stockMovements: StockMovement[];
  logStockMovement: (
    type: StockMovement['type'],
    refId: string,
    medicineName: string,
    batchNo: string,
    qtyChange: number,
    note: string
  ) => void;
  deletedItems: DeletedItemRecord[];
  onRecordDeleted: (record: DeletedItemRecord) => void;
  onRestoreItem: (record: DeletedItemRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  userRole: 'Owner' | 'Staff';
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  settings,
  medicines,
  setMedicines,
  batches,
  setBatches,
  suppliers,
  sales,
  purchases,
  stockMovements,
  logStockMovement,
  deletedItems,
  onRecordDeleted,
  onRestoreItem,
  showToast,
  userRole,
}) => {
  const [search, setSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'OTC' | 'H' | 'H1' | 'X'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [subView, setSubView] = useState<'batches' | 'medicines' | 'movements' | 'deleted'>('batches');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Selected medicine for Complete Details & History Modal
  const [detailsMedId, setDetailsMedId] = useState<string | null>(null);

  // Edit Medicine + Batch Modal State
  const [editTarget, setEditTarget] = useState<{
    medicine: Medicine;
    batch: Batch | null;
  } | null>(null);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    medicineId: string;
    medicineName: string;
    batchId?: string;
    batchNo?: string;
  } | null>(null);

  // New Medicine + Initial Batch Form
  const [name, setName] = useState('');
  const [salt, setSalt] = useState('');
  const [mfg, setMfg] = useState('');
  const [category, setCategory] = useState('Tablet');
  const [hsn, setHsn] = useState('30049099');
  const [schedule, setSchedule] = useState<'OTC' | 'H' | 'H1' | 'X'>('H');
  const [rack, setRack] = useState('R1-A5');
  const [gst, setGst] = useState(12);
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('2028-03-31');
  const [purchaseRate, setPurchaseRate] = useState(50);
  const [mrp, setMrp] = useState(80);
  const [quantity, setQuantity] = useState(30);

  const enrichedBatches = useMemo(() => {
    return batches.map((b) => {
      const med = medicines.find((m) => m.id === b.medicineId);
      const sup = suppliers.find((s) => s.id === b.supplierId);
      const days = daysUntil(b.expiryDate);
      const minThreshold = Number(med?.reorderLevel || settings.lowStockThreshold || 25);

      let statusLabel: 'Expired' | 'Expiring Soon' | 'Low Stock' | 'Healthy' = 'Healthy';
      if (days < 0) statusLabel = 'Expired';
      else if (days <= Number(settings.expiryAlertDays || 60)) statusLabel = 'Expiring Soon';
      else if (b.quantity <= minThreshold) statusLabel = 'Low Stock';

      return {
        ...b,
        medName: med?.name || 'Unknown Medicine',
        salt: med?.salt || '',
        manufacturer: med?.manufacturer || '',
        category: med?.category || 'Tablet',
        hsn: med?.hsn || '30049099',
        schedule: med?.schedule || 'OTC',
        rack: med?.rack || '-',
        gst: med?.gst || 12,
        supplierName: sup?.name || 'Local Supplier',
        days,
        statusLabel,
      };
    });
  }, [batches, medicines, suppliers, settings]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedBatches.filter((row) => {
      if (scheduleFilter !== 'ALL' && row.schedule !== scheduleFilter) return false;
      if (statusFilter === 'EXPIRED' && row.statusLabel !== 'Expired') return false;
      if (statusFilter === 'EXPIRING' && row.statusLabel !== 'Expiring Soon') return false;
      if (statusFilter === 'LOW' && row.statusLabel !== 'Low Stock') return false;
      if (!q) return true;
      return (
        row.medName.toLowerCase().includes(q) ||
        row.salt.toLowerCase().includes(q) ||
        row.batchNo.toLowerCase().includes(q) ||
        row.rack.toLowerCase().includes(q) ||
        row.supplierName.toLowerCase().includes(q)
      );
    });
  }, [enrichedBatches, search, scheduleFilter, statusFilter]);

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      if (scheduleFilter !== 'ALL' && m.schedule !== scheduleFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.salt.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.rack.toLowerCase().includes(q)
      );
    });
  }, [medicines, search, scheduleFilter]);

  const detailsHistoryData = useMemo(() => {
    if (!detailsMedId) return null;
    return getMedicineCompleteHistory(
      detailsMedId,
      medicines,
      batches,
      sales,
      purchases,
      stockMovements
    );
  }, [detailsMedId, medicines, batches, sales, purchases, stockMovements]);

  const openEditModal = (medId: string, batchId?: string) => {
    const med = medicines.find((m) => m.id === medId);
    if (!med) return;
    const bat =
      (batchId ? batches.find((b) => b.id === batchId) : batches.find((b) => b.medicineId === medId)) ||
      null;
    setEditTarget({
      medicine: { ...med },
      batch: bat ? { ...bat } : null,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const updatedMed = editTarget.medicine;
    setMedicines((prev) => prev.map((m) => (m.id === updatedMed.id ? updatedMed : m)));

    if (editTarget.batch) {
      const updatedBatch = editTarget.batch;
      const oldBatch = batches.find((b) => b.id === updatedBatch.id);
      setBatches((prev) => prev.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
      if (oldBatch && oldBatch.quantity !== updatedBatch.quantity) {
        logStockMovement(
          'ADJUSTMENT',
          updatedBatch.id,
          updatedMed.name,
          updatedBatch.batchNo,
          updatedBatch.quantity - oldBatch.quantity,
          'Stock quantity updated via Medicine/Batch Edit'
        );
      }
    }

    setEditTarget(null);
    showToast(`Updated details for ${updatedMed.name}!`);
  };

  const handleConfirmDelete = (deleteEntireMedicine: boolean) => {
    if (!deleteTarget) return;
    const medToDelete = medicines.find((m) => m.id === deleteTarget.medicineId);
    const medBatchesToDelete = batches.filter((b) => b.medicineId === deleteTarget.medicineId);
    const nowStr = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (deleteEntireMedicine || !deleteTarget.batchId) {
      if (medToDelete) {
        onRecordDeleted({
          id: `DEL-MED-${Date.now()}`,
          deletedAt: nowStr,
          entityType: 'MEDICINE',
          title: medToDelete.name,
          subtitle: `${medBatchesToDelete.length} Batch(es) · Total Qty: ${medBatchesToDelete.reduce(
            (s, b) => s + b.quantity,
            0
          )} · Rack ${medToDelete.rack}`,
          medicine: medToDelete,
          batches: medBatchesToDelete,
        });
      }
      setMedicines((prev) => prev.filter((m) => m.id !== deleteTarget.medicineId));
      setBatches((prev) => prev.filter((b) => b.medicineId !== deleteTarget.medicineId));
      logStockMovement(
        'ADJUSTMENT',
        deleteTarget.medicineId,
        deleteTarget.medicineName,
        deleteTarget.batchNo || 'ALL',
        0,
        `Deleted Medicine ${deleteTarget.medicineName} (Moved to Data Restoration Center)`
      );
      showToast(
        `Medicine ${deleteTarget.medicineName} moved to Data Restoration Center (Recoverable anytime).`
      );
    } else {
      const targetBatchId = deleteTarget.batchId;
      const batchObj = batches.find((b) => b.id === targetBatchId);
      if (batchObj) {
        onRecordDeleted({
          id: `DEL-BAT-${Date.now()}`,
          deletedAt: nowStr,
          entityType: 'BATCH',
          title: `${deleteTarget.medicineName} (Batch ${batchObj.batchNo})`,
          subtitle: `Batch ${batchObj.batchNo} · Qty: ${batchObj.quantity} · MRP: ${formatINR(
            batchObj.mrp
          )}`,
          medicine: medToDelete,
          batches: [batchObj],
        });
      }
      const remainingForMed = batches.filter(
        (b) => b.medicineId === deleteTarget.medicineId && b.id !== targetBatchId
      );
      setBatches((prev) => prev.filter((b) => b.id !== targetBatchId));
      if (remainingForMed.length === 0) {
        setMedicines((prev) => prev.filter((m) => m.id !== deleteTarget.medicineId));
      }
      logStockMovement(
        'ADJUSTMENT',
        targetBatchId,
        deleteTarget.medicineName,
        deleteTarget.batchNo || '-',
        0,
        `Deleted Batch ${deleteTarget.batchNo} of ${deleteTarget.medicineName} (Recoverable)`
      );
      showToast(
        `Deleted Batch ${deleteTarget.batchNo} of ${deleteTarget.medicineName} (Recoverable in Data Restore).`
      );
    }
    setDeleteTarget(null);
  };

  const handleCreateMedicineBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !batchNo.trim()) {
      showToast('Medicine Name and Batch No are required.', 'error');
      return;
    }

    const medId = `MED-${Date.now()}`;
    const newMed: Medicine = {
      id: medId,
      name: name.trim(),
      salt: salt.trim() || 'Standard Composition',
      manufacturer: mfg.trim() || 'Indian Pharma Ltd',
      category: category.trim() || 'Tablet',
      hsn: hsn.trim() || '30049099',
      gst,
      schedule,
      rack: rack.trim() || 'R1-A1',
      reorderLevel: 25,
      stripsPerBox: 10,
      unitsPerStrip: 10,
      lastSoldDate: new Date().toISOString().split('T')[0],
    };

    const newBatch: Batch = {
      id: `BAT-${Date.now()}`,
      medicineId: medId,
      batchNo: batchNo.trim().toUpperCase(),
      expiryDate,
      purchaseRate,
      mrp,
      quantity,
      supplierId: suppliers[0]?.id || 'SUP-1',
      purchaseDate: new Date().toISOString().split('T')[0],
      barcode: `890${Math.floor(1000000 + Math.random() * 9000000)}`,
    };

    setMedicines((prev) => [newMed, ...prev]);
    setBatches((prev) => [newBatch, ...prev]);
    logStockMovement(
      'ADJUSTMENT',
      newBatch.id,
      newMed.name,
      newBatch.batchNo,
      quantity,
      'Opening stock added via Inventory Master'
    );

    setAddModalOpen(false);
    setName('');
    setSalt('');
    setBatchNo('');
    showToast(`Added ${newMed.name} (Batch ${newBatch.batchNo}) to Inventory!`);
  };

  const deletedMedItems = deletedItems.filter(
    (d) => d.entityType === 'MEDICINE' || d.entityType === 'BATCH'
  );

  return (
    <div className="space-y-4">
      <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="font-bold text-amber-950 dark:text-amber-200">
            Recover Deleted Medicines / Batches ({deletedMedItems.length} in Trash):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {deletedMedItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onRestoreItem(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3 h-3" /> Recover {item.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSubView('deleted')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-[11px] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Recover Deleted Medicines ({deletedMedItems.length})
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Medicines Master & Batch-Wise Stock Inventory
            </h2>
            <p className="text-xs text-slate-500">
              {medicines.length} Medicines · {batches.length} Active Batches · View complete details & history, edit, delete, or restore
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setSubView('batches')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  subView === 'batches'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Batch Inventory ({batches.length})
              </button>
              <button
                type="button"
                onClick={() => setSubView('medicines')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  subView === 'medicines'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Medicines Catalog ({medicines.length})
              </button>
              <button
                type="button"
                onClick={() => setSubView('movements')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  subView === 'movements'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Stock Movements ({stockMovements.length})
              </button>
              <button
                type="button"
                onClick={() => setSubView('deleted')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                  subView === 'deleted'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Recover Deleted ({deletedMedItems.length})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medicine / Batch
            </button>
          </div>
        </div>

        {subView !== 'movements' && subView !== 'deleted' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter medicines by brand name, salt composition, batch no, rack, or supplier..."
                className="w-full bg-transparent text-xs sm:text-sm focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                {(['ALL', 'OTC', 'H', 'H1', 'X'] as const).map((sch) => (
                  <button
                    type="button"
                    key={sch}
                    onClick={() => setScheduleFilter(sch)}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                      scheduleFilter === sch
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sch === 'ALL' ? 'All Schedules' : `Sch ${sch}`}
                  </button>
                ))}
              </div>

              {subView === 'batches' && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  {(
                    [
                      { id: 'ALL', label: 'All Status' },
                      { id: 'LOW', label: 'Low Stock' },
                      { id: 'EXPIRING', label: 'Expiring Soon' },
                      { id: 'EXPIRED', label: 'Expired' },
                    ] as const
                  ).map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                        statusFilter === st.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {subView === 'batches' && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3 text-left">Medicine & Salt</th>
                  <th className="py-2.5 px-2 text-left">Rack / Sch</th>
                  <th className="py-2.5 px-2 text-left">Batch & Barcode</th>
                  <th className="py-2.5 px-2 text-left">Supplier</th>
                  <th className="py-2.5 px-2 text-left">Expiry Date</th>
                  <th className="py-2.5 px-2 text-right">Stock Qty</th>
                  {userRole === 'Owner' && (
                    <th className="py-2.5 px-2 text-right">Pur. Rate</th>
                  )}
                  <th className="py-2.5 px-2 text-right">MRP</th>
                  <th className="py-2.5 px-2 text-left">Status</th>
                  <th className="py-2.5 px-3 text-right">Details, Edit & Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBatches.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {row.medName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {row.salt} · {row.manufacturer}
                      </p>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                      {row.rack} · Sch {row.schedule}
                    </td>
                    <td className="py-2.5 px-2 font-mono">
                      <p className="font-semibold">{row.batchNo}</p>
                      <p className="text-[10px] text-slate-400">{row.barcode}</p>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                      <p>{row.supplierName}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        Pur: {formatDateDDMMYYYY(row.purchaseDate)}
                      </p>
                    </td>
                    <td className="py-2.5 px-2 font-mono">
                      <p
                        className={
                          row.statusLabel === 'Expired'
                            ? 'text-red-600 font-bold'
                            : row.statusLabel === 'Expiring Soon'
                            ? 'text-amber-600 font-bold'
                            : ''
                        }
                      >
                        {formatDateDDMMYYYY(row.expiryDate)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {row.days < 0 ? `${Math.abs(row.days)}d ago` : `${row.days}d left`}
                      </p>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {row.quantity}
                    </td>
                    {userRole === 'Owner' && (
                      <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatINR(row.purchaseRate)}
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-right font-mono font-semibold">
                      {formatINR(row.mrp)}
                    </td>
                    <td className="py-2.5 px-2 font-medium whitespace-nowrap">
                      {row.statusLabel === 'Expired' && (
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          ⛔ Expired
                        </span>
                      )}
                      {row.statusLabel === 'Expiring Soon' && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          ⚠ Expiring Soon
                        </span>
                      )}
                      {row.statusLabel === 'Low Stock' && (
                        <span className="text-amber-700 dark:text-amber-300 font-semibold">
                          ↓ Low Stock
                        </span>
                      )}
                      {row.statusLabel === 'Healthy' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailsMedId(row.medicineId)}
                          aria-label={`View complete details and history for ${row.medName}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Details & History
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(row.medicineId, row.id)}
                          aria-label={`Edit ${row.medName} (${row.batchNo})`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              medicineId: row.medicineId,
                              medicineName: row.medName,
                              batchId: row.id,
                              batchNo: row.batchNo,
                            })
                          }
                          aria-label={`Delete ${row.medName} (${row.batchNo})`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 text-[11px] font-semibold cursor-pointer"
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
        )}

        {subView === 'medicines' && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3 text-left">Medicine Brand & Salt</th>
                  <th className="py-2.5 px-2 text-left">Category & HSN</th>
                  <th className="py-2.5 px-2 text-left">Schedule / Rack</th>
                  <th className="py-2.5 px-2 text-left">Packing</th>
                  <th className="py-2.5 px-2 text-right">Total Batches</th>
                  <th className="py-2.5 px-2 text-right">Total Stock</th>
                  <th className="py-2.5 px-2 text-left">Last Sold</th>
                  <th className="py-2.5 px-3 text-right">Details, Edit & Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredMedicines.map((med) => {
                  const medBatches = batches.filter((b) => b.medicineId === med.id);
                  const totalStock = medBatches.reduce((s, b) => s + b.quantity, 0);
                  return (
                    <tr key={med.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{med.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {med.salt} · {med.manufacturer}
                        </p>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                        {med.category} · HSN {med.hsn} ({med.gst}% GST)
                      </td>
                      <td className="py-2.5 px-2 font-mono">
                        Sch {med.schedule} · Rack {med.rack}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">
                        {med.stripsPerBox}x{med.unitsPerStrip}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">{medBatches.length}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold">{totalStock}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">
                        {formatDateDDMMYYYY(med.lastSoldDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailsMedId(med.id)}
                            aria-label={`View complete details and history for ${med.name}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Details & History
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(med.id)}
                            aria-label={`Edit ${med.name}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                medicineId: med.id,
                                medicineName: med.name,
                              })
                            }
                            aria-label={`Delete ${med.name}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 text-[11px] font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {subView === 'movements' && (
          /* Stock Movement Audit Log */
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3 text-left">Date</th>
                  <th className="py-2.5 px-2 text-left">Movement Type</th>
                  <th className="py-2.5 px-2 text-left">Reference</th>
                  <th className="py-2.5 px-3 text-left">Medicine</th>
                  <th className="py-2.5 px-2 text-left">Batch No</th>
                  <th className="py-2.5 px-2 text-right">Qty Change</th>
                  <th className="py-2.5 px-3 text-left">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stockMovements.map((sm) => (
                  <tr key={sm.id}>
                    <td className="py-2 px-3 font-mono">{formatDateDDMMYYYY(sm.date)}</td>
                    <td className="py-2 px-2 font-mono font-semibold">{sm.type}</td>
                    <td className="py-2 px-2 font-mono">{sm.refId}</td>
                    <td className="py-2 px-3 font-semibold">{sm.medicineName}</td>
                    <td className="py-2 px-2 font-mono">{sm.batchNo}</td>
                    <td
                      className={`py-2 px-2 text-right font-mono font-bold ${
                        sm.qtyChange >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {sm.qtyChange >= 0 ? `+${sm.qtyChange}` : sm.qtyChange}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{sm.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subView === 'deleted' && (
          <div className="overflow-x-auto border border-amber-300 dark:border-amber-800 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800">
                  <th className="py-2.5 px-3 text-left">Deleted Medicine / Batch</th>
                  <th className="py-2.5 px-2 text-left">Type</th>
                  <th className="py-2.5 px-2 text-left">Snapshot Details</th>
                  <th className="py-2.5 px-2 text-left">Deleted At</th>
                  <th className="py-2.5 px-3 text-right">Restore Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {deletedMedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No deleted medicines or batches in Trash.
                    </td>
                  </tr>
                ) : (
                  deletedMedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-2 font-mono">{item.entityType}</td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                        {item.subtitle}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">{item.deletedAt}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onRestoreItem(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Recover Medicine / Batch
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Medicine Details & History Modal */}
      {detailsHistoryData && detailsHistoryData.medicine && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Complete Details and History for ${detailsHistoryData.medicine.name}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-5 border border-slate-200 dark:border-slate-800 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {detailsHistoryData.medicine.name} — Complete Details & History
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Salt: <span className="font-semibold">{detailsHistoryData.medicine.salt}</span> ·
                  Manufacturer: <span className="font-semibold">{detailsHistoryData.medicine.manufacturer}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const medId = detailsHistoryData.medicine!.id;
                    setDetailsMedId(null);
                    openEditModal(medId);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Medicine
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsMedId(null)}
                  aria-label="Close Medicine Details Modal"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-bold cursor-pointer"
                >
                  Close <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Complete Medicine Master Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block">Category & Schedule</span>
                <span className="font-bold">
                  {detailsHistoryData.medicine.category} · Schedule {detailsHistoryData.medicine.schedule}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">HSN Code & GST</span>
                <span className="font-mono font-bold">
                  {detailsHistoryData.medicine.hsn} ({detailsHistoryData.medicine.gst}% GST)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Rack Location & Reorder</span>
                <span className="font-mono font-bold">
                  Rack {detailsHistoryData.medicine.rack} (Min: {detailsHistoryData.medicine.reorderLevel})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Packing & Last Sold</span>
                <span className="font-mono font-bold">
                  {detailsHistoryData.medicine.stripsPerBox}x{detailsHistoryData.medicine.unitsPerStrip} ·{' '}
                  {formatDateDDMMYYYY(detailsHistoryData.medicine.lastSoldDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Total Stock</span>
                <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                  {detailsHistoryData.totalCurrentStock} units
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Units Sold</span>
                <span className="font-mono font-extrabold text-sm">
                  {detailsHistoryData.totalUnitsSold} units
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Units Purchased</span>
                <span className="font-mono font-extrabold text-sm">
                  {detailsHistoryData.totalUnitsPurchased} units
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Active Batches</span>
                <span className="font-mono font-extrabold text-sm">
                  {detailsHistoryData.batches.length} batches
                </span>
              </div>
            </div>

            {/* Batches Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white">
                1. All Batches for {detailsHistoryData.medicine.name} ({detailsHistoryData.batches.length})
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <th className="py-2 px-3 text-left">Batch No</th>
                      <th className="py-2 px-2 text-left">Barcode</th>
                      <th className="py-2 px-2 text-left">Purchase Date</th>
                      <th className="py-2 px-2 text-left">Expiry Date</th>
                      <th className="py-2 px-2 text-right">Stock Qty</th>
                      {userRole === 'Owner' && (
                        <th className="py-2 px-2 text-right">Pur. Rate</th>
                      )}
                      <th className="py-2 px-3 text-right">MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {detailsHistoryData.batches.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2 px-3 font-bold">{b.batchNo}</td>
                        <td className="py-2 px-2 text-slate-500">{b.barcode}</td>
                        <td className="py-2 px-2">{formatDateDDMMYYYY(b.purchaseDate)}</td>
                        <td className="py-2 px-2">{formatDateDDMMYYYY(b.expiryDate)}</td>
                        <td className="py-2 px-2 text-right font-bold">{b.quantity}</td>
                        {userRole === 'Owner' && (
                          <td className="py-2 px-2 text-right">{formatINR(b.purchaseRate)}</td>
                        )}
                        <td className="py-2 px-3 text-right font-bold">{formatINR(b.mrp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales History & Purchase History Side by Side */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  2. Customer Sales History ({detailsHistoryData.salesHistory.length} Bills)
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <th className="py-1.5 px-2.5 text-left">Bill No</th>
                        <th className="py-1.5 px-2 text-left">Date</th>
                        <th className="py-1.5 px-2 text-left">Customer</th>
                        <th className="py-1.5 px-2 text-right">Qty</th>
                        <th className="py-1.5 px-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {detailsHistoryData.salesHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No sales recorded for this medicine yet.
                          </td>
                        </tr>
                      ) : (
                        detailsHistoryData.salesHistory.map((sh) => (
                          <tr key={sh.saleId}>
                            <td className="py-1.5 px-2.5 font-mono font-bold">{sh.saleId}</td>
                            <td className="py-1.5 px-2 font-mono">{formatDateDDMMYYYY(sh.date)}</td>
                            <td className="py-1.5 px-2">{sh.customerName}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold">{sh.qty}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono">
                              {formatINR(sh.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  3. Supplier Purchase History ({detailsHistoryData.purchaseHistory.length} Invoices)
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <th className="py-1.5 px-2.5 text-left">Invoice No</th>
                        <th className="py-1.5 px-2 text-left">Date</th>
                        <th className="py-1.5 px-2 text-left">Supplier</th>
                        <th className="py-1.5 px-2 text-right">Qty</th>
                        <th className="py-1.5 px-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {detailsHistoryData.purchaseHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No supplier purchase invoices recorded for this medicine yet.
                          </td>
                        </tr>
                      ) : (
                        detailsHistoryData.purchaseHistory.map((ph) => (
                          <tr key={ph.purchaseId}>
                            <td className="py-1.5 px-2.5 font-mono font-bold">{ph.invoiceNo}</td>
                            <td className="py-1.5 px-2 font-mono">{formatDateDDMMYYYY(ph.date)}</td>
                            <td className="py-1.5 px-2">{ph.supplierName}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold">{ph.qty}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono">
                              {formatINR(ph.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Stock Movement Audit Trail */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white">
                4. Stock Movement Audit Trail ({detailsHistoryData.movements.length} Events)
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-44 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <th className="py-1.5 px-2.5 text-left">Date</th>
                      <th className="py-1.5 px-2 text-left">Type</th>
                      <th className="py-1.5 px-2 text-left">Ref ID</th>
                      <th className="py-1.5 px-2 text-left">Batch</th>
                      <th className="py-1.5 px-2 text-right">Qty Change</th>
                      <th className="py-1.5 px-2.5 text-left">Audit Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {detailsHistoryData.movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          No stock movement events recorded for this medicine.
                        </td>
                      </tr>
                    ) : (
                      detailsHistoryData.movements.map((sm) => (
                        <tr key={sm.id}>
                          <td className="py-1.5 px-2.5 font-mono">{formatDateDDMMYYYY(sm.date)}</td>
                          <td className="py-1.5 px-2 font-mono font-semibold">{sm.type}</td>
                          <td className="py-1.5 px-2 font-mono">{sm.refId}</td>
                          <td className="py-1.5 px-2 font-mono">{sm.batchNo}</td>
                          <td
                            className={`py-1.5 px-2 text-right font-mono font-bold ${
                              sm.qtyChange >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {sm.qtyChange >= 0 ? `+${sm.qtyChange}` : sm.qtyChange}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-500">{sm.note}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medicine & Batch Modal */}
      {editTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit Medicine ${editTarget.medicine.name}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSaveEdit}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">
                Edit Medicine & Batch — {editTarget.medicine.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-med-name" className="block font-medium mb-1">
                  Medicine Brand Name
                </label>
                <input
                  id="edit-med-name"
                  type="text"
                  required
                  value={editTarget.medicine.name}
                  onChange={(e) =>
                    setEditTarget({
                      ...editTarget,
                      medicine: { ...editTarget.medicine, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="edit-med-salt" className="block font-medium mb-1">
                  Generic Salt / Composition
                </label>
                <input
                  id="edit-med-salt"
                  type="text"
                  value={editTarget.medicine.salt}
                  onChange={(e) =>
                    setEditTarget({
                      ...editTarget,
                      medicine: { ...editTarget.medicine, salt: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="edit-med-mfg" className="block font-medium mb-1">
                  Manufacturer
                </label>
                <input
                  id="edit-med-mfg"
                  type="text"
                  value={editTarget.medicine.manufacturer}
                  onChange={(e) =>
                    setEditTarget({
                      ...editTarget,
                      medicine: { ...editTarget.medicine, manufacturer: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="edit-med-sch" className="block font-medium mb-1">
                    Schedule
                  </label>
                  <select
                    id="edit-med-sch"
                    value={editTarget.medicine.schedule}
                    onChange={(e) =>
                      setEditTarget({
                        ...editTarget,
                        medicine: {
                          ...editTarget.medicine,
                          schedule: e.target.value as 'OTC' | 'H' | 'H1' | 'X',
                        },
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="OTC">OTC</option>
                    <option value="H">Schedule H</option>
                    <option value="H1">Schedule H1</option>
                    <option value="X">Schedule X</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-med-rack" className="block font-medium mb-1">
                    Rack / Shelf
                  </label>
                  <input
                    id="edit-med-rack"
                    type="text"
                    value={editTarget.medicine.rack}
                    onChange={(e) =>
                      setEditTarget({
                        ...editTarget,
                        medicine: { ...editTarget.medicine, rack: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
              </div>

              {editTarget.batch && (
                <>
                  <div>
                    <label htmlFor="edit-batch-no" className="block font-medium mb-1">
                      Batch Number
                    </label>
                    <input
                      id="edit-batch-no"
                      type="text"
                      required
                      value={editTarget.batch.batchNo}
                      onChange={(e) =>
                        setEditTarget({
                          ...editTarget,
                          batch: { ...editTarget.batch!, batchNo: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-batch-exp" className="block font-medium mb-1">
                      Expiry Date
                    </label>
                    <input
                      id="edit-batch-exp"
                      type="date"
                      value={editTarget.batch.expiryDate}
                      onChange={(e) =>
                        setEditTarget({
                          ...editTarget,
                          batch: { ...editTarget.batch!, expiryDate: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                    <div>
                      <label htmlFor="edit-batch-rate" className="block font-medium mb-1">
                        Purchase Rate (₹)
                      </label>
                      <input
                        id="edit-batch-rate"
                        type="number"
                        step="0.01"
                        value={editTarget.batch.purchaseRate}
                        onChange={(e) =>
                          setEditTarget({
                            ...editTarget,
                            batch: {
                              ...editTarget.batch!,
                              purchaseRate: Number(e.target.value || 0),
                            },
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-batch-mrp" className="block font-medium mb-1">
                        MRP (₹)
                      </label>
                      <input
                        id="edit-batch-mrp"
                        type="number"
                        step="0.01"
                        value={editTarget.batch.mrp}
                        onChange={(e) =>
                          setEditTarget({
                            ...editTarget,
                            batch: {
                              ...editTarget.batch!,
                              mrp: Number(e.target.value || 0),
                            },
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-batch-qty" className="block font-medium mb-1">
                        Stock Quantity
                      </label>
                      <input
                        id="edit-batch-qty"
                        type="number"
                        min={0}
                        value={editTarget.batch.quantity}
                        onChange={(e) =>
                          setEditTarget({
                            ...editTarget,
                            batch: {
                              ...editTarget.batch!,
                              quantity: Math.max(0, Number(e.target.value || 0)),
                            },
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Medicine / Batch Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Medicine or Batch"
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-red-600">
              Delete {deleteTarget.medicineName}{' '}
              {deleteTarget.batchNo ? `(Batch ${deleteTarget.batchNo})` : ''}
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Choose whether to delete only this batch or remove the entire medicine record and all
              its batches from inventory.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {deleteTarget.batchId && (
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(false)}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                >
                  Delete Batch Only
                </button>
              )}
              <button
                type="button"
                onClick={() => handleConfirmDelete(true)}
                className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Delete Entire Medicine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine / Batch Modal */}
      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add New Medicine and Batch"
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCreateMedicineBatch}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">Add New Medicine & Opening Batch</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-med-name" className="block font-medium mb-1">
                  Medicine Brand Name
                </label>
                <input
                  id="inv-med-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pantocid DSR Capsule"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="inv-med-salt" className="block font-medium mb-1">
                  Generic Salt / Composition
                </label>
                <input
                  id="inv-med-salt"
                  type="text"
                  value={salt}
                  onChange={(e) => setSalt(e.target.value)}
                  placeholder="Pantoprazole + Domperidone"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="inv-med-mfg" className="block font-medium mb-1">
                  Manufacturer Company
                </label>
                <input
                  id="inv-med-mfg"
                  type="text"
                  value={mfg}
                  onChange={(e) => setMfg(e.target.value)}
                  placeholder="Sun Pharma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="inv-med-cat" className="block font-medium mb-1">
                    Category
                  </label>
                  <input
                    id="inv-med-cat"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Tablet / Syrup"
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="inv-med-hsn" className="block font-medium mb-1">
                    HSN Code
                  </label>
                  <input
                    id="inv-med-hsn"
                    type="text"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="inv-med-sch" className="block font-medium mb-1">
                    Schedule
                  </label>
                  <select
                    id="inv-med-sch"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value as 'OTC' | 'H' | 'H1' | 'X')}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="OTC">OTC</option>
                    <option value="H">Schedule H</option>
                    <option value="H1">Schedule H1</option>
                    <option value="X">Schedule X</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="inv-med-rack" className="block font-medium mb-1">
                    Rack / Shelf
                  </label>
                  <input
                    id="inv-med-rack"
                    type="text"
                    value={rack}
                    onChange={(e) => setRack(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="inv-batch-no" className="block font-medium mb-1">
                  Batch Number
                </label>
                <input
                  id="inv-batch-no"
                  type="text"
                  required
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="PN2801"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>
              <div>
                <label htmlFor="inv-exp-date" className="block font-medium mb-1">
                  Expiry Date
                </label>
                <input
                  id="inv-exp-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label htmlFor="inv-pur-rate" className="block font-medium mb-1">
                    Purchase Rate (₹)
                  </label>
                  <input
                    id="inv-pur-rate"
                    type="number"
                    step="0.01"
                    value={purchaseRate}
                    onChange={(e) => setPurchaseRate(Number(e.target.value || 0))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="inv-mrp" className="block font-medium mb-1">
                    MRP (₹)
                  </label>
                  <input
                    id="inv-mrp"
                    type="number"
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value || 0))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="inv-qty" className="block font-medium mb-1">
                    Opening Qty
                  </label>
                  <input
                    id="inv-qty"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold"
              >
                Save Medicine & Batch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
