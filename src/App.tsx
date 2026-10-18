/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  MoreVertical,
  Search,
  ShoppingCart,
  Package,
  Truck,
  Settings as SettingsIcon,
  User,
  Download,
  Sun,
  Moon,
  Lock,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  daysUntil,
  restoreDeletedRecord,
  type ShopSettings,
  type Medicine,
  type Batch,
  type Supplier,
  type Customer,
  type PurchaseRecord,
  type PurchaseReturnRecord,
  type SaleRecord,
  type SaleReturnRecord,
  type StockMovement,
  type DeletedItemRecord,
} from './utils/pharmacyLogic';
import {
  UPLOADED_HARYANA_LOGO,
  INITIAL_SETTINGS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_MEDICINES,
  INITIAL_BATCHES,
  INITIAL_PURCHASES,
  INITIAL_SALES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_DELETED_ITEMS,
} from './data/seedData';
import { usePWAInstall } from './hooks/usePWAInstall';
import { InvoiceModal } from './components/InvoiceModal';
import { SalesPOSView } from './components/SalesPOSView';
import { PurchasesView } from './components/PurchasesView';
import { InventoryView } from './components/InventoryView';
import { ExpiredView } from './components/ExpiredView';
import { SuppliersView, CustomersView } from './components/SuppliersAndCustomersView';
import { BillHistoryView } from './components/BillHistoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { DataRestoreView } from './components/DataRestoreView';

function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [key, state]);

  return [state, setState];
}

type TabId =
  | 'Sales'
  | 'Purchases'
  | 'Inventory'
  | 'Expired'
  | 'Suppliers'
  | 'SupplierHistory'
  | 'BillHistory'
  | 'Customers'
  | 'DataRestore'
  | 'Reports'
  | 'Alerts'
  | 'Settings'
  | 'Profile';

export default function App() {
  const [settings, setSettings] = usePersistentState<ShopSettings>(
    'hms_settings_v3',
    INITIAL_SETTINGS
  );
  const [medicines, setMedicines] = usePersistentState<Medicine[]>(
    'hms_medicines_v3',
    INITIAL_MEDICINES
  );
  const [batches, setBatches] = usePersistentState<Batch[]>(
    'hms_batches_v3',
    INITIAL_BATCHES
  );
  const [suppliers, setSuppliers] = usePersistentState<Supplier[]>(
    'hms_suppliers_v3',
    INITIAL_SUPPLIERS
  );
  const [customers, setCustomers] = usePersistentState<Customer[]>(
    'hms_customers_v3',
    INITIAL_CUSTOMERS
  );
  const [purchases, setPurchases] = usePersistentState<PurchaseRecord[]>(
    'hms_purchases_v3',
    INITIAL_PURCHASES
  );
  const [purchaseReturns, setPurchaseReturns] = usePersistentState<PurchaseReturnRecord[]>(
    'hms_purchase_returns_v3',
    []
  );
  const [sales, setSales] = usePersistentState<SaleRecord[]>(
    'hms_sales_v3',
    INITIAL_SALES
  );
  const [saleReturns, setSaleReturns] = usePersistentState<SaleReturnRecord[]>(
    'hms_sale_returns_v3',
    []
  );
  const [stockMovements, setStockMovements] = usePersistentState<StockMovement[]>(
    'hms_stock_movements_v3',
    INITIAL_STOCK_MOVEMENTS
  );
  const [deletedItems, setDeletedItems] = usePersistentState<DeletedItemRecord[]>(
    'hms_deleted_items_v4',
    INITIAL_DELETED_ITEMS
  );
  const [dismissedDeletedIds, setDismissedDeletedIds] = usePersistentState<string[]>(
    'hms_dismissed_deleted_ids_v4',
    []
  );

  // Full-screen Welcome Splash (accessible anytime) & Top Welcome Banner on launch
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  // Session & Authentication State
  const [currentUser, setCurrentUser] = usePersistentState<{
    loggedIn: boolean;
    role: 'Owner' | 'Staff';
    name: string;
  }>('hms_user_session_v3', {
    loggedIn: true,
    role: 'Owner',
    name: 'Rahul Sharma',
  });

  const [loginForm, setLoginForm] = useState({
    role: 'Owner' as 'Owner' | 'Staff',
    username: '',
    password: '',
    pin: '',
    mode: 'password' as 'password' | 'pin',
  });
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [securityAnsInput, setSecurityAnsInput] = useState('');

  // Navigation & Modal State (Navigated to Data Restoration Center)
  const [activeTab, setActiveTab] = useState<TabId>('DataRestore');
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [imageStudioOpen, setImageStudioOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [invoiceModalSale, setInvoiceModalSale] = useState<SaleRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  // In-App Update System State
  const [updateState, setUpdateState] = useState({
    available: false,
    downloading: false,
    downloaded: false,
    version: '2.5.0',
  });

  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (settings.themeColorHex) {
      root.style.setProperty('--brand-600', settings.themeColorHex);
      root.style.setProperty('--brand-700', settings.themeColorHex);
    }
  }, [settings.darkMode, settings.themeColorHex]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  };

  const logStockMovement = (
    type: StockMovement['type'],
    refId: string,
    medicineName: string,
    batchNo: string,
    qtyChange: number,
    note: string
  ) => {
    const record: StockMovement = {
      id: `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().split('T')[0],
      type,
      refId,
      medicineName,
      batchNo,
      qtyChange,
      note,
    };
    setStockMovements((prev) => [record, ...prev]);
  };

  // Automatically include both explicitly tracked deleted items AND any records from initial seed data
  // that were deleted in earlier sessions so they are always recoverable.
  const allRecoverableItems = useMemo<DeletedItemRecord[]>(() => {
    const list: DeletedItemRecord[] = [...deletedItems];

    // 1. Missing Medicines from INITIAL_MEDICINES
    INITIAL_MEDICINES.forEach((initMed) => {
      const autoId = `AUTO-DEL-MED-${initMed.id}`;
      const existsInActive = medicines.some((m) => m.id === initMed.id);
      const existsInTrash = list.some(
        (d) => d.id === autoId || (d.entityType === 'MEDICINE' && d.medicine?.id === initMed.id)
      );
      if (!existsInActive && !existsInTrash && !dismissedDeletedIds.includes(autoId)) {
        const initBatches = INITIAL_BATCHES.filter((b) => b.medicineId === initMed.id);
        list.push({
          id: autoId,
          deletedAt: 'Previously Deleted',
          entityType: 'MEDICINE',
          title: initMed.name,
          subtitle: `${initBatches.length} Batch(es) · Salt: ${initMed.salt} · Rack ${initMed.rack}`,
          medicine: initMed,
          batches: initBatches,
        });
      }
    });

    // 2. Missing Batches from INITIAL_BATCHES (where the parent medicine still exists)
    INITIAL_BATCHES.forEach((initBatch) => {
      const autoId = `AUTO-DEL-BAT-${initBatch.id}`;
      const medExists = medicines.some((m) => m.id === initBatch.medicineId);
      const batchExists = batches.some((b) => b.id === initBatch.id);
      const existsInTrash = list.some(
        (d) =>
          d.id === autoId ||
          (d.batches && d.batches.some((b) => b.id === initBatch.id))
      );
      if (medExists && !batchExists && !existsInTrash && !dismissedDeletedIds.includes(autoId)) {
        const med = medicines.find((m) => m.id === initBatch.medicineId);
        list.push({
          id: autoId,
          deletedAt: 'Previously Deleted',
          entityType: 'BATCH',
          title: `${med?.name || 'Medicine'} (Batch ${initBatch.batchNo})`,
          subtitle: `Batch ${initBatch.batchNo} · Qty: ${initBatch.quantity} · MRP: ${formatINR(initBatch.mrp)}`,
          batches: [initBatch],
        });
      }
    });

    // 3. Missing Suppliers from INITIAL_SUPPLIERS
    INITIAL_SUPPLIERS.forEach((initSup) => {
      const autoId = `AUTO-DEL-SUP-${initSup.id}`;
      const existsInActive = suppliers.some((s) => s.id === initSup.id);
      const existsInTrash = list.some(
        (d) => d.id === autoId || (d.entityType === 'SUPPLIER' && d.supplier?.id === initSup.id)
      );
      if (!existsInActive && !existsInTrash && !dismissedDeletedIds.includes(autoId)) {
        list.push({
          id: autoId,
          deletedAt: 'Previously Deleted',
          entityType: 'SUPPLIER',
          title: initSup.name,
          subtitle: `GSTIN: ${initSup.gstin} · Phone: ${initSup.phone} · ${initSup.address}`,
          supplier: initSup,
        });
      }
    });

    // 4. Missing Customers from INITIAL_CUSTOMERS
    INITIAL_CUSTOMERS.forEach((initCust) => {
      const autoId = `AUTO-DEL-CUST-${initCust.id}`;
      const existsInActive = customers.some((c) => c.id === initCust.id);
      const existsInTrash = list.some(
        (d) => d.id === autoId || (d.entityType === 'CUSTOMER' && d.customer?.id === initCust.id)
      );
      if (!existsInActive && !existsInTrash && !dismissedDeletedIds.includes(autoId)) {
        list.push({
          id: autoId,
          deletedAt: 'Previously Deleted',
          entityType: 'CUSTOMER',
          title: initCust.name,
          subtitle: `Mobile: ${initCust.mobile} · ${initCust.address} · Udhaar: ${formatINR(initCust.udhaarBalance)}`,
          customer: initCust,
        });
      }
    });

    // 5. Missing Sales Bills from INITIAL_SALES
    INITIAL_SALES.forEach((initSale) => {
      const autoId = `AUTO-DEL-SALE-${initSale.id}`;
      const existsInActive = sales.some((s) => s.id === initSale.id);
      const existsInTrash = list.some(
        (d) => d.id === autoId || (d.entityType === 'SALE_BILL' && d.sale?.id === initSale.id)
      );
      if (!existsInActive && !existsInTrash && !dismissedDeletedIds.includes(autoId)) {
        list.push({
          id: autoId,
          deletedAt: 'Previously Deleted',
          entityType: 'SALE_BILL',
          title: `Bill ${initSale.id} — ${initSale.customerName}`,
          subtitle: `${formatDateDDMMYYYY(initSale.date)} · ${initSale.items.length} item(s) · Grand Total: ${formatINR(initSale.grandTotal)}`,
          sale: initSale,
        });
      }
    });

    return list;
  }, [deletedItems, medicines, batches, suppliers, customers, sales, dismissedDeletedIds]);

  // Data Restoration Handlers
  const handleRecordDeleted = (record: DeletedItemRecord) => {
    setDeletedItems((prev) => [record, ...prev]);
  };

  const handleRestoreItem = (record: DeletedItemRecord) => {
    const nextState = restoreDeletedRecord(record, {
      medicines,
      batches,
      suppliers,
      customers,
      sales,
    });
    setMedicines(nextState.medicines);
    setBatches(nextState.batches);
    setSuppliers(nextState.suppliers);
    setCustomers(nextState.customers);
    setSales(nextState.sales);
    setDeletedItems((prev) => prev.filter((item) => item.id !== record.id));

    if (record.entityType === 'MEDICINE' && record.medicine) {
      logStockMovement(
        'ADJUSTMENT',
        record.medicine.id,
        record.medicine.name,
        (record.batches || []).map((b) => b.batchNo).join(', ') || 'ALL',
        (record.batches || []).reduce((s, b) => s + b.quantity, 0),
        `Restored Medicine ${record.medicine.name} from Data Restoration Center`
      );
    } else if (record.entityType === 'BATCH' && record.batches && record.batches[0]) {
      const restoredBatch = record.batches[0];
      logStockMovement(
        'ADJUSTMENT',
        restoredBatch.id,
        record.title,
        restoredBatch.batchNo,
        restoredBatch.quantity,
        `Restored Batch ${restoredBatch.batchNo} from Data Restoration Center`
      );
    } else if (record.entityType === 'SALE_BILL' && record.sale) {
      logStockMovement(
        'SALE',
        record.sale.id,
        record.sale.items.map((i) => i.medicineName).join(', '),
        record.sale.items.map((i) => i.batchNo).join(', '),
        -record.sale.items.reduce((s, i) => s + i.qty, 0),
        `Restored Sale Bill ${record.sale.id} from Data Restoration Center`
      );
    }

    showToast(`Restored "${record.title}" back into active records!`);
  };

  const handleRestoreAll = () => {
    if (allRecoverableItems.length === 0) return;
    let current = {
      medicines,
      batches,
      suppliers,
      customers,
      sales,
    };
    allRecoverableItems.forEach((record) => {
      current = restoreDeletedRecord(record, current);
    });
    setMedicines(current.medicines);
    setBatches(current.batches);
    setSuppliers(current.suppliers);
    setCustomers(current.customers);
    setSales(current.sales);
    const count = allRecoverableItems.length;
    setDeletedItems([]);
    showToast(`Successfully restored all ${count} deleted items!`);
  };

  const handleDeletePermanently = (id: string) => {
    const item = allRecoverableItems.find((d) => d.id === id);
    setDeletedItems((prev) => prev.filter((d) => d.id !== id));
    setDismissedDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (item) {
      showToast(`Permanently removed "${item.title}" from Trash.`, 'info');
    }
  };

  const handleClearAllDeleted = () => {
    const allIds = allRecoverableItems.map((d) => d.id);
    setDeletedItems([]);
    setDismissedDeletedIds((prev) => Array.from(new Set([...prev, ...allIds])));
    showToast('Emptied Data Restoration Trash.', 'info');
  };

  // Computed Stock & Expiry Alerts
  const alertSummary = useMemo(() => {
    const expired: Array<Batch & { medicineName: string; rack: string; days: number }> = [];
    const expiringSoon: Array<Batch & { medicineName: string; rack: string; days: number }> = [];
    const lowStock: Array<{ medicine: Medicine; validQty: number; threshold: number }> = [];

    batches.forEach((b) => {
      const med = medicines.find((m) => m.id === b.medicineId);
      if (!med) return;
      const days = daysUntil(b.expiryDate);
      if (b.quantity > 0 && days < 0) {
        expired.push({ ...b, medicineName: med.name, rack: med.rack, days });
      } else if (
        b.quantity > 0 &&
        days >= 0 &&
        days <= Number(settings.expiryAlertDays || 60)
      ) {
        expiringSoon.push({ ...b, medicineName: med.name, rack: med.rack, days });
      }
    });

    medicines.forEach((med) => {
      const validQty = batches
        .filter((b) => b.medicineId === med.id && daysUntil(b.expiryDate) >= 0)
        .reduce((sum, b) => sum + Number(b.quantity || 0), 0);
      const threshold = Number(med.reorderLevel || settings.lowStockThreshold || 25);
      if (validQty <= threshold) {
        lowStock.push({ medicine: med, validQty, threshold });
      }
    });

    return {
      expired,
      expiringSoon,
      lowStock,
      totalCount: expired.length + expiringSoon.length + lowStock.length,
    };
  }, [batches, medicines, settings.expiryAlertDays, settings.lowStockThreshold]);

  // Universal Global Search
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return null;
    return {
      medicines: medicines.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.salt.toLowerCase().includes(q) ||
          m.rack.toLowerCase().includes(q)
      ),
      customers: customers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q)
      ),
      suppliers: suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.gstin.toLowerCase().includes(q)
      ),
      sales: sales.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.doctorName.toLowerCase().includes(q)
      ),
      purchases: purchases.filter(
        (p) =>
          p.invoiceNo.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q)
      ),
      settingsMatch: ['gstin', 'drug licence', 'backup', 'dark mode', 'logo', 'password'].filter(
        (k) => k.includes(q)
      ),
    };
  }, [globalSearchQuery, medicines, customers, suppliers, sales, purchases]);

  // 3-Image Upload Studio Handler + Dominant Theme Color Extraction
  const handleReferenceImageUpload = (
    type: 'logo' | 'bill' | 'style',
    file: File | undefined
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = String(e.target?.result || '');
      if (type === 'logo') {
        setSettings((prev) => ({ ...prev, logoDataUrl: dataUrl }));
        showToast('Shop Logo updated! Applied to Top Bar and PDF Invoices.');
      } else if (type === 'bill') {
        setSettings((prev) => ({ ...prev, referenceBillDataUrl: dataUrl }));
        showToast('Old Physical Bill saved! Linked inside the In-App PDF Invoice Viewer.');
      } else if (type === 'style') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 32, 32);
            const data = ctx.getImageData(0, 0, 32, 32).data;
            let r = 0,
              g = 0,
              b = 0,
              count = 0;
            for (let i = 0; i < data.length; i += 4) {
              const br = (data[i] + data[i + 1] + data[i + 2]) / 3;
              if (br > 35 && br < 220) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
              }
            }
            if (count > 0) {
              const hex =
                '#' +
                [Math.floor(r / count), Math.floor(g / count), Math.floor(b / count)]
                  .map((x) => x.toString(16).padStart(2, '0'))
                  .join('');
              setSettings((prev) => ({
                ...prev,
                styleScreenshotDataUrl: dataUrl,
                themeColorHex: hex,
              }));
              showToast(`UI Style Screenshot analyzed! Theme accent adapted to ${hex}.`);
              return;
            }
          }
          setSettings((prev) => ({ ...prev, styleScreenshotDataUrl: dataUrl }));
          showToast('UI Style Screenshot saved!');
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  // JSON Export & Import
  const handleExportJSONBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      medicines,
      batches,
      suppliers,
      customers,
      purchases,
      purchaseReturns,
      sales,
      saleReturns,
      stockMovements,
      deletedItems,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HaryanaMedicalStore-Backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSettings((p) => ({
      ...p,
      lastBackupTime: new Date().toLocaleString('en-IN'),
    }));
    showToast('Complete Pharmacy Database exported as JSON backup!');
  };

  const handleImportJSONBackup = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || '{}'));
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.medicines) setMedicines(parsed.medicines);
        if (parsed.batches) setBatches(parsed.batches);
        if (parsed.suppliers) setSuppliers(parsed.suppliers);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.purchases) setPurchases(parsed.purchases);
        if (parsed.sales) setSales(parsed.sales);
        if (parsed.stockMovements) setStockMovements(parsed.stockMovements);
        if (parsed.deletedItems) setDeletedItems(parsed.deletedItems);
        showToast('Full Pharmacy Database restored from JSON backup!');
      } catch {
        showToast('Invalid JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Login Handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.role === 'Owner') {
      const valid =
        loginForm.mode === 'pin'
          ? loginForm.pin === settings.ownerPin
          : loginForm.username.toLowerCase() === settings.ownerUser.toLowerCase() &&
            loginForm.password === settings.ownerPass;
      if (valid) {
        setCurrentUser({ loggedIn: true, role: 'Owner', name: settings.proprietor });
        showToast(`Welcome back, ${settings.proprietor} (Owner Access)`);
      } else {
        showToast("Invalid Owner credentials! Default: user 'rahul', pass/PIN '1234'", 'error');
      }
    } else {
      const valid =
        loginForm.mode === 'pin'
          ? loginForm.pin === settings.staffPin
          : loginForm.username.toLowerCase() === settings.staffUser.toLowerCase() &&
            loginForm.password === settings.staffPass;
      if (valid) {
        setCurrentUser({ loggedIn: true, role: 'Staff', name: 'Store Staff' });
        showToast('Logged in as Staff (Purchase rates, profits & bill deletion restricted)');
      } else {
        showToast("Invalid Staff credentials! Default: user 'staff', pass/PIN '0000'", 'error');
      }
    }
  };

  if (!currentUser.loggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
          <div className="bg-emerald-800 p-6 text-white text-center">
            <img
              src={settings.logoDataUrl || UPLOADED_HARYANA_LOGO}
              alt="Haryana Medical Store Logo"
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full mx-auto bg-white p-1 shadow-md object-contain"
            />
            <h1 className="text-xl font-bold tracking-tight mt-3">{settings.shopName}</h1>
            <p className="text-xs text-emerald-100 mt-1">{settings.address}</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['Owner', 'Staff'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setLoginForm((prev) => ({ ...prev, role: r }))}
                  className={`py-2 rounded-md font-semibold transition cursor-pointer ${
                    loginForm.role === r
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {r === 'Owner' ? 'Owner (Rahul)' : 'Pharmacy Staff'}
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setLoginForm((p) => ({ ...p, mode: 'password' }))}
                className={`underline cursor-pointer ${
                  loginForm.mode === 'password' ? 'text-emerald-700 font-bold' : 'text-slate-500'
                }`}
              >
                Username & Password
              </button>
              <button
                type="button"
                onClick={() => setLoginForm((p) => ({ ...p, mode: 'pin' }))}
                className={`underline cursor-pointer ${
                  loginForm.mode === 'pin' ? 'text-emerald-700 font-bold' : 'text-slate-500'
                }`}
              >
                4-Digit PIN / Biometric
              </button>
            </div>

            {loginForm.mode === 'password' ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="login-user" className="block font-medium text-slate-600 mb-1">
                    Username
                  </label>
                  <input
                    id="login-user"
                    type="text"
                    required
                    placeholder={loginForm.role === 'Owner' ? 'rahul' : 'staff'}
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="login-pass" className="block font-medium text-slate-600 mb-1">
                    Password
                  </label>
                  <input
                    id="login-pass"
                    type="password"
                    required
                    placeholder="••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="login-pin" className="block font-medium text-slate-600 mb-1 text-center">
                  4-Digit Security PIN
                </label>
                <input
                  id="login-pin"
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={loginForm.pin}
                  onChange={(e) => setLoginForm((p) => ({ ...p, pin: e.target.value }))}
                  className="w-full py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-center text-xl tracking-widest font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold shadow-sm transition cursor-pointer"
            >
              Unlock Pharmacy POS
            </button>

            <div className="flex items-center justify-between pt-1 text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setCurrentUser({
                    loggedIn: true,
                    role: loginForm.role,
                    name: loginForm.role === 'Owner' ? settings.proprietor : 'Store Staff',
                  });
                  showToast('Biometric Unlock Verified!');
                }}
                className="text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                Fingerprint Unlock
              </button>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </form>

          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
            <span>Prop: {settings.proprietor} ({settings.phone})</span>
            <span className="font-semibold text-emerald-700">Made by Rohit Sharma</span>
          </div>
        </div>

        {forgotModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs">
              <h3 className="font-bold text-sm">Reset Owner / Staff Password</h3>
              <p className="text-slate-600">
                Security Question: <span className="font-semibold">{settings.securityQuestion}</span>
              </p>
              <input
                type="text"
                placeholder="Enter village name (e.g. Dhoha)"
                value={securityAnsInput}
                onChange={(e) => setSecurityAnsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      securityAnsInput.trim().toLowerCase() ===
                      settings.securityAnswer.toLowerCase()
                    ) {
                      setSettings((p) => ({ ...p, ownerPass: '1234', ownerPin: '1234' }));
                      showToast("Password & PIN reset to '1234'!");
                      setForgotModalOpen(false);
                    } else {
                      showToast('Incorrect security answer! Hint: Dhoha', 'error');
                    }
                  }}
                  className="w-full py-2 bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Verify & Reset to 1234
                </button>
                <a
                  href={`mailto:${settings.email}?subject=Haryana%20Medical%20Store%20Password%20Reset`}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-center rounded-lg font-semibold"
                >
                  Send Reset Link to {settings.email}
                </a>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="w-full py-1.5 text-slate-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const DashboardTabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'Sales', label: 'POS Billing' },
    { id: 'DataRestore', label: 'Data Restore', count: allRecoverableItems.length },
    { id: 'Inventory', label: 'Medicines & Inventory' },
    { id: 'Suppliers', label: 'Suppliers' },
    { id: 'BillHistory', label: 'Bill History' },
    { id: 'Customers', label: 'Customers & Udhaar' },
    { id: 'Purchases', label: 'Purchases & OCR' },
    { id: 'Expired', label: 'Expired List', count: alertSummary.expired.length },
    { id: 'SupplierHistory', label: 'Supplier History' },
    { id: 'Reports', label: 'Reports & P/L' },
    { id: 'Alerts', label: 'Alerts', count: alertSummary.totalCount },
    { id: 'Settings', label: 'Settings' },
  ];

  // Welcome Screen displayed when the app opens
  if (showWelcomeScreen) {
    return (
      <div
        data-testid="welcome-screen"
        className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6"
      >
        <div className="max-w-xl w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-10 text-center space-y-6">
          {/* Prominent Logo */}
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-2 border-4 border-amber-400 shadow-2xl flex items-center justify-center overflow-hidden">
              <img
                src={settings.logoDataUrl || UPLOADED_HARYANA_LOGO}
                alt="Haryana Medical Store Official Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-full"
              />
            </div>

            {/* Prominent, Bold Text saying 'Made by Rohit Sharma' underneath the logo */}
            <p
              data-testid="welcome-creator-credit"
              className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-300 drop-shadow-sm"
            >
              Made by Rohit Sharma
            </p>
            <div className="mt-1.5 h-1 w-24 rounded-full bg-amber-400/80" />
          </div>

          {/* Pharmacy Store Identity */}
          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-800/90 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-widest text-emerald-200">
              Complete Offline-First Pharmacy POS & Inventory System
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {settings.shopName}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium">
              Proprietor: <strong className="text-white">{settings.proprietor}</strong> ·{' '}
              {settings.address}
            </p>
            <p className="text-xs text-emerald-200/90 font-mono">
              Phone: {settings.phone}, {settings.altPhone} · Email: {settings.email}
            </p>
          </div>

          {/* Live Pharmacy Status Highlights */}
          <div className="grid grid-cols-3 gap-2.5 text-left">
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/10">
              <p className="text-[11px] text-emerald-200">Medicines & Batches</p>
              <p className="text-lg font-mono font-extrabold text-white mt-0.5">
                {medicines.length} / {batches.length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/10">
              <p className="text-[11px] text-emerald-200">Sales & Invoices</p>
              <p className="text-lg font-mono font-extrabold text-emerald-300 mt-0.5">
                {sales.length} Bills
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/10">
              <p className="text-[11px] text-emerald-200">Data Recovery</p>
              <p className="text-lg font-mono font-extrabold text-amber-300 mt-0.5">
                {allRecoverableItems.length} in Trash
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              data-testid="enter-pos-btn"
              onClick={() => setShowWelcomeScreen(false)}
              className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm sm:text-base shadow-lg transition cursor-pointer"
            >
              Enter Pharmacy POS & Dashboard
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('Inventory');
                  setShowWelcomeScreen(false);
                }}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition cursor-pointer"
              >
                Medicines & Inventory
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('DataRestore');
                  setShowWelcomeScreen(false);
                }}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 font-semibold text-xs transition cursor-pointer"
              >
                Data Restoration ({allRecoverableItems.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar: Left Shop Logo, Center Shop Name, Right Alert Badge + Three-Dot Menu */}
      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          {/* Left Corner: Shop Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setImageStudioOpen(true)}
              aria-label="Open 3-Image Brand Studio"
              className="w-10 h-10 rounded-full bg-white p-0.5 border border-amber-400 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
            >
              <img
                src={settings.logoDataUrl || UPLOADED_HARYANA_LOGO}
                alt="Haryana Medical Store Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-full"
              />
            </button>
            <span className="hidden sm:inline-block text-xs font-medium text-emerald-100 whitespace-nowrap">
              {currentUser.role} Mode
            </span>
          </div>

          {/* Center: Shop Name & Dynamic Legal Registration */}
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
              {settings.shopName}
            </h1>
            <p className="text-[11px] text-emerald-100 truncate">
              Prop: {settings.proprietor} · Dhoha, Firozpur Jhirka
              {!isOnline && ' · Offline Mode Active'}
              {settings.gstin ? ` · GSTIN: ${settings.gstin}` : ''}
              {settings.drugLicence ? ` · D.L.: ${settings.drugLicence}` : ''}
            </p>
          </div>

          {/* Right Corner: PWA Install Button + Small Red Alert Badge + Three-Dot Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => (isIOS ? setShowIOSInstallGuide(true) : install())}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('DataRestore')}
              aria-label={`Open Data Restoration Center (${allRecoverableItems.length} recoverable items)`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore ({allRecoverableItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setImageStudioOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              3-Image Setup
            </button>

            <button
              type="button"
              onClick={() => setAlertModalOpen(true)}
              aria-label={`Stock and Expiry Alerts (${alertSummary.totalCount})`}
              className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {alertSummary.totalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-mono font-bold px-1.5 rounded-full border border-white">
                  {alertSummary.totalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSideDrawerOpen(true)}
              aria-label="Open Full Menu"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Universal Global Search Bar */}
        <div className="bg-emerald-900/90 px-3 sm:px-4 py-1.5 border-t border-white/10">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center gap-2">
            <div className="relative lg:w-96 shrink-0">
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg px-3 py-1 text-slate-800 dark:text-slate-100">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  aria-label="Universal Global Search"
                  value={globalSearchQuery}
                  onFocus={() => setGlobalSearchOpen(true)}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setGlobalSearchOpen(true);
                  }}
                  placeholder="Universal Search: Medicine, Salt, Customer, Supplier, Bill No..."
                  className="w-full bg-transparent text-xs focus:outline-none"
                />
                {globalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalSearchQuery('');
                      setGlobalSearchOpen(false);
                    }}
                    aria-label="Clear Global Search"
                    className="text-xs text-slate-400 hover:text-slate-600 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Grouped Global Search Dropdown */}
              {globalSearchOpen && globalSearchResults && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto z-50 p-3 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span className="font-semibold text-slate-500">Global Search Results</span>
                    <button
                      type="button"
                      onClick={() => setGlobalSearchOpen(false)}
                      className="text-red-600 font-semibold"
                    >
                      Close
                    </button>
                  </div>

                  {globalSearchResults.medicines.length > 0 && (
                    <div>
                      <p className="font-bold text-emerald-700 mb-1">
                        Medicines ({globalSearchResults.medicines.length})
                      </p>
                      {globalSearchResults.medicines.map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setActiveTab('Inventory');
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full text-left p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex justify-between"
                        >
                          <span>
                            <span className="font-semibold">{m.name}</span> ({m.salt})
                          </span>
                          <span className="font-mono text-slate-500">Rack {m.rack}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.customers.length > 0 && (
                    <div>
                      <p className="font-bold text-emerald-700 mb-1">
                        Customers ({globalSearchResults.customers.length})
                      </p>
                      {globalSearchResults.customers.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                            setActiveTab('Customers');
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full text-left p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex justify-between"
                        >
                          <span>
                            <span className="font-semibold">{c.name}</span> ({c.mobile})
                          </span>
                          <span className="font-mono text-amber-600">
                            Udhaar: {formatINR(c.udhaarBalance)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.suppliers.length > 0 && (
                    <div>
                      <p className="font-bold text-emerald-700 mb-1">
                        Suppliers ({globalSearchResults.suppliers.length})
                      </p>
                      {globalSearchResults.suppliers.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setActiveTab('Suppliers');
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full text-left p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex justify-between"
                        >
                          <span className="font-semibold">{s.name}</span>
                          <span className="font-mono text-slate-500">{s.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.sales.length > 0 && (
                    <div>
                      <p className="font-bold text-emerald-700 mb-1">
                        Sales Bills ({globalSearchResults.sales.length})
                      </p>
                      {globalSearchResults.sales.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setInvoiceModalSale(s);
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full text-left p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex justify-between"
                        >
                          <span>
                            <span className="font-mono font-bold">{s.id}</span> — {s.customerName}
                          </span>
                          <span className="font-mono font-semibold">{formatINR(s.grandTotal)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Horizontal Navigation Bar */}
            <nav
              aria-label="Dashboard Modules"
              className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1"
            >
              {DashboardTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-emerald-900 font-bold shadow-xs'
                      : 'text-emerald-100 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1.5 font-mono font-bold text-amber-300">
                      ({tab.count})
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* In-App Update Banner (Never force-updates silently) */}
      {updateState.available && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span>
              New App Version v{updateState.version} is ready for {settings.shopName}. Active
              billing will not be interrupted.
            </span>
            <div className="flex items-center gap-2">
              {!updateState.downloaded ? (
                <button
                  type="button"
                  onClick={() => {
                    setUpdateState((p) => ({ ...p, downloading: true }));
                    window.setTimeout(
                      () =>
                        setUpdateState((p) => ({
                          ...p,
                          downloading: false,
                          downloaded: true,
                        })),
                      800
                    );
                  }}
                  className="px-3 py-1 rounded bg-slate-900 text-white font-bold cursor-pointer"
                >
                  {updateState.downloading ? 'Downloading...' : 'Download'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUpdateState({
                      available: false,
                      downloading: false,
                      downloaded: false,
                      version: '2.5.0',
                    });
                    showToast('App Update v2.5.0 Installed Successfully!');
                  }}
                  className="px-3 py-1 rounded bg-emerald-800 text-white font-bold cursor-pointer"
                >
                  Install Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setUpdateState((p) => ({ ...p, available: false }))}
                className="px-3 py-1 rounded bg-white/70 text-slate-900 font-bold cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Welcome Hero Card with Official Logo and Prominent Bold 'Made by Rohit Sharma' Underneath */}
        {showWelcomeBanner && (
          <div
            data-testid="welcome-banner"
            className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-emerald-700/60 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 border-2 border-amber-400 shadow-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={settings.logoDataUrl || UPLOADED_HARYANA_LOGO}
                    alt="Haryana Medical Store Official Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <p
                  data-testid="welcome-creator-credit"
                  className="mt-2 text-base sm:text-lg font-black tracking-tight text-amber-300 whitespace-nowrap"
                >
                  Made by Rohit Sharma
                </p>
              </div>
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-800/90 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  Welcome to {settings.shopName}
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {settings.shopName} — Pharmacy POS & Data Restoration Center
                </h2>
                <p className="text-xs text-emerald-100">
                  Proprietor: <strong>{settings.proprietor}</strong> · {settings.address} · Phone:{' '}
                  {settings.phone}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowWelcomeScreen(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                Full Welcome Screen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Sales')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                Open POS Billing
              </button>
              <button
                type="button"
                onClick={() => setShowWelcomeBanner(false)}
                aria-label="Dismiss Welcome Banner"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Sales' && (
          <SalesPOSView
            medicines={medicines}
            setMedicines={setMedicines}
            batches={batches}
            setBatches={setBatches}
            customers={customers}
            setCustomers={setCustomers}
            sales={sales}
            setSales={setSales}
            saleReturns={saleReturns}
            setSaleReturns={setSaleReturns}
            logStockMovement={logStockMovement}
            showToast={showToast}
            setInvoiceModalSale={setInvoiceModalSale}
            editingSale={editingSale}
            clearEditingSale={() => setEditingSale(null)}
            deletedItems={allRecoverableItems}
            onRecordDeleted={handleRecordDeleted}
            onRestoreItem={handleRestoreItem}
            onOpenDataRestore={() => setActiveTab('DataRestore')}
          />
        )}

        {activeTab === 'Purchases' && (
          <PurchasesView
            medicines={medicines}
            setMedicines={setMedicines}
            batches={batches}
            setBatches={setBatches}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            purchases={purchases}
            setPurchases={setPurchases}
            purchaseReturns={purchaseReturns}
            setPurchaseReturns={setPurchaseReturns}
            logStockMovement={logStockMovement}
            showToast={showToast}
          />
        )}

        {activeTab === 'Inventory' && (
          <InventoryView
            settings={settings}
            medicines={medicines}
            setMedicines={setMedicines}
            batches={batches}
            setBatches={setBatches}
            suppliers={suppliers}
            sales={sales}
            purchases={purchases}
            stockMovements={stockMovements}
            logStockMovement={logStockMovement}
            deletedItems={allRecoverableItems}
            onRecordDeleted={handleRecordDeleted}
            onRestoreItem={handleRestoreItem}
            showToast={showToast}
            userRole={currentUser.role}
          />
        )}

        {activeTab === 'Expired' && (
          <ExpiredView
            batches={batches}
            setBatches={setBatches}
            medicines={medicines}
            suppliers={suppliers}
            settings={settings}
            logStockMovement={logStockMovement}
            showToast={showToast}
          />
        )}

        {(activeTab === 'Suppliers' || activeTab === 'SupplierHistory') && (
          <SuppliersView
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            purchases={purchases}
            setPurchases={setPurchases}
            purchaseReturns={purchaseReturns}
            batches={batches}
            medicines={medicines}
            deletedItems={allRecoverableItems}
            onRecordDeleted={handleRecordDeleted}
            onRestoreItem={handleRestoreItem}
            showToast={showToast}
          />
        )}

        {activeTab === 'BillHistory' && (
          <BillHistoryView
            sales={sales}
            setSales={setSales}
            batches={batches}
            setBatches={setBatches}
            deletedItems={allRecoverableItems}
            onRecordDeleted={handleRecordDeleted}
            onRestoreItem={handleRestoreItem}
            setInvoiceModalSale={setInvoiceModalSale}
            onEditSaleInPOS={(sale) => {
              setEditingSale(sale);
              setActiveTab('Sales');
              showToast(`Loaded Bill ${sale.id} into POS Billing Counter for editing.`);
            }}
            logStockMovement={logStockMovement}
            showToast={showToast}
            userRole={currentUser.role}
          />
        )}

        {activeTab === 'Customers' && (
          <CustomersView
            customers={customers}
            setCustomers={setCustomers}
            sales={sales}
            saleReturns={saleReturns}
            deletedItems={allRecoverableItems}
            onRecordDeleted={handleRecordDeleted}
            onRestoreItem={handleRestoreItem}
            setInvoiceModalSale={setInvoiceModalSale}
            showToast={showToast}
          />
        )}

        {activeTab === 'DataRestore' && (
          <DataRestoreView
            deletedItems={allRecoverableItems}
            onRestoreItem={handleRestoreItem}
            onRestoreAll={handleRestoreAll}
            onPermanentDelete={handleDeletePermanently}
            onEmptyTrash={handleClearAllDeleted}
          />
        )}

        {activeTab === 'Reports' && (
          <ReportsView
            sales={sales}
            purchases={purchases}
            saleReturns={saleReturns}
            purchaseReturns={purchaseReturns}
            medicines={medicines}
            batches={batches}
            userRole={currentUser.role}
            showToast={showToast}
          />
        )}

        {activeTab === 'Alerts' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold">
                Stock & Expiry Alert Center ({alertSummary.totalCount})
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('Expired')}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold cursor-pointer"
              >
                Open Expired Register
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 space-y-2">
                <p className="font-bold text-red-700 dark:text-red-300">
                  Expired Batches ({alertSummary.expired.length}) — Blocked from Sale
                </p>
                {alertSummary.expired.map((b) => (
                  <div key={b.id} className="flex justify-between border-b border-red-100 dark:border-red-900/40 pb-1">
                    <span className="font-semibold">{b.medicineName} ({b.batchNo})</span>
                    <span className="font-mono">{formatDateDDMMYYYY(b.expiryDate)}</span>
                  </div>
                ))}
              </div>
              <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <p className="font-bold text-amber-700 dark:text-amber-300">
                  Expiring Within {settings.expiryAlertDays} Days ({alertSummary.expiringSoon.length})
                </p>
                {alertSummary.expiringSoon.map((b) => (
                  <div key={b.id} className="flex justify-between border-b border-amber-100 dark:border-amber-900/40 pb-1">
                    <span className="font-semibold">{b.medicineName} ({b.batchNo})</span>
                    <span className="font-mono">{b.days}d left</span>
                  </div>
                ))}
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Low Stock Medicines ({alertSummary.lowStock.length})
                </p>
                {alertSummary.lowStock.map((item) => (
                  <div key={item.medicine.id} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span className="font-semibold">{item.medicine.name} (Rack {item.medicine.rack})</span>
                    <span className="font-mono">Qty: {item.validQty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'Settings' || activeTab === 'Profile') && (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            userRole={currentUser.role}
            setUserRole={(role) => {
              setCurrentUser((prev) => ({
                ...prev,
                role,
                name: role === 'Owner' ? settings.proprietor : 'Store Staff',
              }));
              showToast(`Switched to ${role} Mode`);
            }}
            onLockPOS={() => setCurrentUser((prev) => ({ ...prev, loggedIn: false }))}
            openImageStudio={() => setImageStudioOpen(true)}
            triggerUpdateBanner={() =>
              setUpdateState({
                available: true,
                downloading: false,
                downloaded: false,
                version: '2.5.0',
              })
            }
            onExportJSONBackup={handleExportJSONBackup}
            onImportJSONBackup={handleImportJSONBackup}
            isInstallable={isInstallable}
            isInstalled={isInstalled}
            onInstallPWA={install}
            showToast={showToast}
          />
        )}
      </main>

      {/* Subtle Footer Credit */}
      <footer className="max-w-7xl w-full mx-auto px-4 py-3 flex flex-wrap justify-between items-center text-[11px] text-slate-400 border-t border-slate-200/70 dark:border-slate-800/70">
        <span>
          {settings.shopName} · Prop. {settings.proprietor} · Village Dhoha, Firozpur Jhirka
        </span>
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          Made by Rohit Sharma
        </span>
      </footer>

      {/* Bottom Quick-Access Taskbar (Purchases, Sales, Suppliers, Settings, Profile) */}
      <nav
        aria-label="Quick Access Bottom Taskbar"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-md"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 py-1">
          {(
            [
              { id: 'Sales', label: 'Sales POS', Icon: ShoppingCart },
              { id: 'Inventory', label: 'Medicines', Icon: Package },
              { id: 'DataRestore', label: `Restore (${allRecoverableItems.length})`, Icon: RotateCcw },
              { id: 'Suppliers', label: 'Suppliers', Icon: Truck },
              { id: 'Settings', label: 'Settings', Icon: SettingsIcon },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg transition cursor-pointer ${
                activeTab === id
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Slide-in Side Panel (Three-Dot Menu) */}
      {sideDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60">
          <div className="w-80 max-w-full bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-5 text-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={settings.logoDataUrl || UPLOADED_HARYANA_LOGO}
                    alt="Shop Logo"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-amber-400 object-contain"
                  />
                  <div>
                    <h3 className="font-bold text-sm">{settings.shopName}</h3>
                    <p className="text-[11px] text-slate-500">Prop: {settings.proprietor}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSideDrawerOpen(false)}
                  aria-label="Close Side Menu"
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Role Switcher */}
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Active Role:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {currentUser.role}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUser({
                        loggedIn: true,
                        role: 'Owner',
                        name: settings.proprietor,
                      });
                      showToast('Switched to Owner Mode');
                    }}
                    className={`py-1.5 rounded font-semibold cursor-pointer ${
                      currentUser.role === 'Owner'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUser({
                        loggedIn: true,
                        role: 'Staff',
                        name: 'Store Staff',
                      });
                      showToast('Switched to Staff Mode');
                    }}
                    className={`py-1.5 rounded font-semibold cursor-pointer ${
                      currentUser.role === 'Staff'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    Staff
                  </button>
                </div>
              </div>

              {/* All Modules */}
              <div className="space-y-1">
                {DashboardTabs.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id);
                      setSideDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold cursor-pointer ${
                      activeTab === t.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.count !== undefined && t.count > 0 && (
                      <span className="font-mono text-red-600 font-bold">{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* App Utilities */}
              <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowWelcomeScreen(true);
                    setSideDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-emerald-700 dark:text-emerald-400"
                >
                  <RotateCcw className="w-4 h-4" />
                  Show Welcome Screen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageStudioOpen(true);
                    setSideDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  3-Image Brand & Reference Studio
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((p) => ({ ...p, darkMode: !p.darkMode }))}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpdateState({
                      available: true,
                      downloading: false,
                      downloaded: false,
                      version: '2.5.0',
                    });
                    setSideDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Check for In-App Updates
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser({ loggedIn: false, role: 'Owner', name: '' });
                    setSideDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  Lock / Logout POS
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
              <span>Offline-First PWA</span>
              <span className="font-semibold text-emerald-700">Made by Rohit Sharma</span>
            </div>
          </div>
        </div>
      )}

      {/* 3-Image Upload & Customization Studio Modal */}
      {imageStudioOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="3-Image Reference Studio"
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold">
                  3-Image Build Reference & Brand Customization Studio
                </h2>
                <p className="text-slate-500 mt-0.5">
                  Upload your Shop Logo, Old Physical Bill Photo, and UI Style Screenshot
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImageStudioOpen(false)}
                className="p-1 rounded bg-slate-100 dark:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 text-center">
                <div>
                  <p className="font-bold text-emerald-700">1. Shop Logo (Active)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Displayed in Top Bar left corner & PDF Invoices
                  </p>
                </div>
                <img
                  src={settings.logoDataUrl || UPLOADED_HARYANA_LOGO}
                  alt="Shop Logo Preview"
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 object-contain mx-auto rounded-full border border-amber-400 p-1"
                />
                <label className="block py-2 px-3 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer">
                  Upload Shop Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleReferenceImageUpload('logo', e.target.files?.[0])}
                  />
                </label>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 text-center">
                <div>
                  <p className="font-bold text-emerald-700">2. Old Physical Bill</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Side-by-side layout reference in PDF Invoice Viewer
                  </p>
                </div>
                {settings.referenceBillDataUrl ? (
                  <img
                    src={settings.referenceBillDataUrl}
                    alt="Old Bill Preview"
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover rounded border"
                  />
                ) : (
                  <div className="h-20 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded text-slate-400">
                    No Bill Photo Yet
                  </div>
                )}
                <label className="block py-2 px-3 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer">
                  Upload Old Bill Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleReferenceImageUpload('bill', e.target.files?.[0])}
                  />
                </label>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 text-center">
                <div>
                  <p className="font-bold text-emerald-700">3. App Style Screenshot</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Extracts dominant theme accent color automatically
                  </p>
                </div>
                {settings.styleScreenshotDataUrl ? (
                  <img
                    src={settings.styleScreenshotDataUrl}
                    alt="Style Screenshot Preview"
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover rounded border"
                  />
                ) : (
                  <div className="h-20 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded text-slate-400">
                    Theme: {settings.themeColorHex}
                  </div>
                )}
                <label className="block py-2 px-3 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer">
                  Upload UI Screenshot
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleReferenceImageUpload('style', e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corner Alert Quick Modal */}
      {alertModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Stock and Expiry Alerts"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">
                Stock & Expiry Alert Summary ({alertSummary.totalCount})
              </h3>
              <button
                type="button"
                onClick={() => setAlertModalOpen(false)}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                <p className="font-bold text-red-700 dark:text-red-300 mb-1">
                  Expired Batches ({alertSummary.expired.length}) — Blocked from Sale
                </p>
                {alertSummary.expired.map((b) => (
                  <div key={b.id} className="flex justify-between py-1">
                    <span className="font-semibold">
                      {b.medicineName} (Batch {b.batchNo})
                    </span>
                    <span className="font-mono">
                      Qty {b.quantity} · Exp {formatDateDDMMYYYY(b.expiryDate)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                  Expiring Soon ({alertSummary.expiringSoon.length})
                </p>
                {alertSummary.expiringSoon.map((b) => (
                  <div key={b.id} className="flex justify-between py-1">
                    <span className="font-semibold">
                      {b.medicineName} (Batch {b.batchNo})
                    </span>
                    <span className="font-mono">{b.days} days left</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Low Stock Medicines ({alertSummary.lowStock.length})
                </p>
                {alertSummary.lowStock.map((item) => (
                  <div key={item.medicine.id} className="flex justify-between py-1">
                    <span className="font-semibold">
                      {item.medicine.name} (Rack {item.medicine.rack})
                    </span>
                    <span className="font-mono">
                      Avail: {item.validQty} (Min {item.threshold})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('Expired');
                  setAlertModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold cursor-pointer"
              >
                Open Expired Medicines Page
              </button>
              <button
                type="button"
                onClick={() => setAlertModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-5 shadow-xl space-y-3 text-xs">
            <h3 className="text-sm font-bold">Install on iPhone / iPad</h3>
            <p className="text-slate-600 dark:text-slate-300">
              1. Tap the <strong>Share</strong> button in Safari toolbar.
              <br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="w-full rounded-lg bg-emerald-700 py-2 text-white font-semibold"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Built-in PDF Invoice Viewer Modal */}
      {invoiceModalSale && (
        <InvoiceModal
          sale={invoiceModalSale}
          settings={settings}
          onClose={() => setInvoiceModalSale(null)}
          showToast={showToast}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-4 z-50 max-w-sm px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-red-600 text-white border-red-400'
              : 'bg-slate-900 text-white border-emerald-500'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
