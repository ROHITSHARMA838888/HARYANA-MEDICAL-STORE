export interface ShopSettings {
  shopName: string;
  tagline: string;
  proprietor: string;
  address: string;
  phone: string;
  altPhone: string;
  email: string;
  gstin: string;
  drugLicence: string;
  lowStockThreshold: number;
  expiryAlertDays: number;
  darkMode: boolean;
  autoBackup: boolean;
  lastBackupTime: string;
  logoDataUrl: string;
  referenceBillDataUrl: string;
  styleScreenshotDataUrl: string;
  themeColorHex: string;
  onboardingCompleted: boolean;
  ownerUser: string;
  ownerPass: string;
  ownerPin: string;
  staffUser: string;
  staffPass: string;
  staffPin: string;
  securityQuestion: string;
  securityAnswer: string;
}

export interface Supplier {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  address: string;
  openingBalance: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  udhaarBalance: number;
}

export interface Medicine {
  id: string;
  name: string;
  salt: string;
  manufacturer: string;
  category: string;
  hsn: string;
  gst: number;
  schedule: 'OTC' | 'H' | 'H1' | 'X';
  rack: string;
  reorderLevel: number;
  stripsPerBox: number;
  unitsPerStrip: number;
  lastSoldDate: string;
}

export interface Batch {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string; // YYYY-MM-DD
  purchaseRate: number;
  mrp: number;
  quantity: number;
  supplierId: string;
  purchaseDate: string;
  barcode: string;
}

export interface PurchaseItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  qty: number;
  rate: number;
  mrp: number;
  gst: number;
  total: number;
}

export interface PurchaseRecord {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  supplierMobile: string;
  date: string;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  paidAmount: number;
  grandTotal: number;
  billImage: string;
  items: PurchaseItem[];
}

export interface PurchaseReturnRecord {
  id: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  batchId: string;
  batchNo: string;
  medicineName: string;
  qty: number;
  amount: number;
  reason: string;
}

export interface CartItem {
  medicineId: string;
  medicineName: string;
  schedule: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  availableQty: number;
  qty: number;
  mrp: number;
  purchaseRate: number;
  discountPct: number;
  gst: number;
  priceAfterDisc?: number;
  total?: number;
  belowCost?: boolean;
}

export interface SaleRecord {
  id: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  doctorName: string;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Udhaar';
  paidAmount: number;
  billDiscount: number;
  subTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  roundOff: number;
  grandTotal: number;
  items: Required<Pick<CartItem, 'medicineId' | 'medicineName' | 'schedule' | 'batchId' | 'batchNo' | 'expiryDate' | 'qty' | 'mrp' | 'purchaseRate' | 'discountPct' | 'gst' | 'total'>>[];
}

export interface SaleReturnRecord {
  id: string;
  saleId: string;
  customerName: string;
  date: string;
  batchId: string;
  batchNo: string;
  medicineName: string;
  qty: number;
  refundAmount: number;
  reason: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'PURCHASE' | 'SALE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'EXPIRED_RETURN' | 'ADJUSTMENT';
  refId: string;
  medicineName: string;
  batchNo: string;
  qtyChange: number;
  note: string;
}

export interface DeletedItemRecord {
  id: string;
  deletedAt: string;
  entityType: 'MEDICINE' | 'BATCH' | 'SUPPLIER' | 'CUSTOMER' | 'SALE_BILL';
  title: string;
  subtitle: string;
  medicine?: Medicine;
  batches?: Batch[];
  supplier?: Supplier;
  customer?: Customer;
  sale?: SaleRecord;
}

export function restoreDeletedRecord(
  record: DeletedItemRecord,
  state: {
    medicines: Medicine[];
    batches: Batch[];
    suppliers: Supplier[];
    customers: Customer[];
    sales: SaleRecord[];
  }
) {
  let medicines = [...state.medicines];
  let batches = [...state.batches];
  let suppliers = [...state.suppliers];
  let customers = [...state.customers];
  let sales = [...state.sales];

  if (record.entityType === 'MEDICINE' || record.entityType === 'BATCH') {
    if (record.medicine && !medicines.some((m) => m.id === record.medicine!.id)) {
      medicines = [record.medicine, ...medicines];
    }
    if (record.batches && record.batches.length > 0) {
      const existingIds = new Set(batches.map((b) => b.id));
      const toRestore = record.batches.filter((b) => !existingIds.has(b.id));
      batches = [...toRestore, ...batches];
    }
  } else if (record.entityType === 'SUPPLIER' && record.supplier) {
    if (!suppliers.some((s) => s.id === record.supplier!.id)) {
      suppliers = [record.supplier, ...suppliers];
    }
  } else if (record.entityType === 'CUSTOMER' && record.customer) {
    if (!customers.some((c) => c.id === record.customer!.id)) {
      customers = [record.customer, ...customers];
    }
  } else if (record.entityType === 'SALE_BILL' && record.sale) {
    if (!sales.some((s) => s.id === record.sale!.id)) {
      sales = [record.sale, ...sales];
      batches = batches.map((b) => {
        const soldItem = record.sale!.items.find((i) => i.batchId === b.id);
        return soldItem ? { ...b, quantity: Math.max(0, b.quantity - soldItem.qty) } : b;
      });
    }
  }

  return { medicines, batches, suppliers, customers, sales };
}

export function formatINR(num: number | string | undefined | null): string {
  const n = Number(num || 0);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateDDMMYYYY(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function daysUntil(dateStr: string | undefined | null, referenceDate?: Date): number {
  if (!dateStr) return 9999;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 9999;
  target.setHours(23, 59, 59, 999);
  const now = referenceDate ? new Date(referenceDate) : new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateNextSaleBillId(sales: SaleRecord[], year?: number): string {
  const yr = year ?? new Date().getFullYear();
  const prefix = `HMS-${yr}-`;
  let maxSeq = 0;
  for (const s of sales) {
    const match = s.id.match(/HMS-\d{4}-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeq = Math.max(maxSeq + 1, sales.length + 1);
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

export function getMedicineCompleteHistory(
  medicineId: string,
  medicines: Medicine[],
  batches: Batch[],
  sales: SaleRecord[],
  purchases: PurchaseRecord[],
  stockMovements: StockMovement[]
) {
  const medicine = medicines.find((m) => m.id === medicineId) || null;
  const medBatches = batches.filter((b) => b.medicineId === medicineId);
  const batchIds = new Set(medBatches.map((b) => b.id));
  const batchNos = new Set(medBatches.map((b) => b.batchNo.toLowerCase()));

  const salesHistory = sales
    .filter((s) =>
      s.items.some((it) => it.medicineId === medicineId || batchIds.has(it.batchId))
    )
    .map((s) => {
      const matchedItems = s.items.filter(
        (it) => it.medicineId === medicineId || batchIds.has(it.batchId)
      );
      const totalQty = matchedItems.reduce((sum, i) => sum + i.qty, 0);
      const totalAmount = matchedItems.reduce((sum, i) => sum + i.total, 0);
      return {
        saleId: s.id,
        date: s.date,
        time: s.time,
        customerName: s.customerName,
        paymentMode: s.paymentMode,
        batches: matchedItems.map((i) => i.batchNo).join(', '),
        qty: totalQty,
        amount: Number(totalAmount.toFixed(2)),
      };
    });

  const purchaseHistory = purchases
    .filter((p) =>
      p.items.some(
        (it) =>
          it.medicineId === medicineId ||
          batchIds.has(it.batchId) ||
          (medicine && it.medicineName.toLowerCase() === medicine.name.toLowerCase())
      )
    )
    .map((p) => {
      const matchedItems = p.items.filter(
        (it) =>
          it.medicineId === medicineId ||
          batchIds.has(it.batchId) ||
          (medicine && it.medicineName.toLowerCase() === medicine.name.toLowerCase())
      );
      const totalQty = matchedItems.reduce((sum, i) => sum + i.qty, 0);
      const totalAmount = matchedItems.reduce((sum, i) => sum + i.total, 0);
      return {
        purchaseId: p.id,
        invoiceNo: p.invoiceNo,
        date: p.date,
        supplierName: p.supplierName,
        batches: matchedItems.map((i) => i.batchNo).join(', '),
        qty: totalQty,
        amount: Number(totalAmount.toFixed(2)),
      };
    });

  const movements = stockMovements.filter(
    (sm) =>
      (medicine && sm.medicineName.toLowerCase().includes(medicine.name.toLowerCase())) ||
      batchNos.has(sm.batchNo.toLowerCase())
  );

  const totalCurrentStock = medBatches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  const totalUnitsSold = salesHistory.reduce((sum, s) => sum + s.qty, 0);
  const totalUnitsPurchased = purchaseHistory.reduce((sum, p) => sum + p.qty, 0);

  return {
    medicine,
    batches: medBatches,
    salesHistory,
    purchaseHistory,
    movements,
    totalCurrentStock,
    totalUnitsSold,
    totalUnitsPurchased,
  };
}

export function selectFEFOBatches(
  medicineId: string,
  batches: Batch[],
  referenceDate?: Date
): { validBatches: Batch[]; expiredBatches: Batch[]; chosenBatch: Batch | null } {
  const medBatches = batches
    .filter((b) => b.medicineId === medicineId && b.quantity > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const validBatches = medBatches.filter((b) => daysUntil(b.expiryDate, referenceDate) >= 0);
  const expiredBatches = medBatches.filter((b) => daysUntil(b.expiryDate, referenceDate) < 0);

  return {
    validBatches,
    expiredBatches,
    chosenBatch: validBatches.length > 0 ? validBatches[0] : null,
  };
}

export function calculateCartTotals(cart: CartItem[], billDiscount: number = 0) {
  let grossTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let hasBelowCostItem = false;

  const computedItems = cart.map((it) => {
    const discPct = Math.min(100, Math.max(0, Number(it.discountPct || 0)));
    const priceAfterDisc = it.mrp * (1 - discPct / 100);
    const belowCost = priceAfterDisc < it.purchaseRate;
    if (belowCost) hasBelowCostItem = true;

    const lineTotal = priceAfterDisc * it.qty;
    const gstRate = Number(it.gst || 12);
    const taxableLine = lineTotal / (1 + gstRate / 100);
    const lineTax = lineTotal - taxableLine;

    grossTotal += lineTotal;
    cgstTotal += lineTax / 2;
    sgstTotal += lineTax / 2;

    return {
      ...it,
      discountPct: discPct,
      priceAfterDisc: Number(priceAfterDisc.toFixed(2)),
      total: Number(lineTotal.toFixed(2)),
      belowCost,
    };
  });

  const cleanBillDiscount = Math.max(0, Number(billDiscount || 0));
  const afterBillDiscount = Math.max(0, grossTotal - cleanBillDiscount);
  const grandTotal = Math.round(afterBillDiscount);
  const roundOff = Number((grandTotal - afterBillDiscount).toFixed(2));
  const roundedCgst = Number(cgstTotal.toFixed(2));
  const roundedSgst = Number(sgstTotal.toFixed(2));
  const subTotal = Number(Math.max(0, grossTotal - roundedCgst - roundedSgst).toFixed(2));

  return {
    items: computedItems,
    subTotal,
    cgstTotal: roundedCgst,
    sgstTotal: roundedSgst,
    billDiscount: cleanBillDiscount,
    roundOff,
    grandTotal,
    hasBelowCostItem,
  };
}

export function calculateProfitAndLoss(
  sales: SaleRecord[],
  saleReturns: SaleReturnRecord[],
  batches: Batch[],
  referenceDate?: Date
) {
  let totalSalesRevenue = 0;
  let totalCOGS = 0;
  let totalDiscountsGiven = 0;

  for (const sale of sales) {
    totalSalesRevenue += Number(sale.grandTotal || 0);
    totalDiscountsGiven += Number(sale.billDiscount || 0);
    for (const item of sale.items) {
      totalCOGS += Number(item.purchaseRate || 0) * Number(item.qty || 0);
    }
  }

  const totalReturnsRefunded = saleReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  const netSalesRevenue = Math.max(0, totalSalesRevenue - totalReturnsRefunded);
  const grossOperatingProfit = netSalesRevenue - totalCOGS;

  // Expired stock loss breakout (cost of currently held expired inventory)
  const expiredBatches = batches.filter(
    (b) => b.quantity > 0 && daysUntil(b.expiryDate, referenceDate) < 0
  );
  const expiredStockLossAtCost = expiredBatches.reduce(
    (sum, b) => sum + Number(b.purchaseRate || 0) * Number(b.quantity || 0),
    0
  );
  const expiredStockMrpValue = expiredBatches.reduce(
    (sum, b) => sum + Number(b.mrp || 0) * Number(b.quantity || 0),
    0
  );

  const netProfitAfterExpiryLoss = grossOperatingProfit - expiredStockLossAtCost;

  return {
    totalSalesRevenue: Number(totalSalesRevenue.toFixed(2)),
    totalReturnsRefunded: Number(totalReturnsRefunded.toFixed(2)),
    netSalesRevenue: Number(netSalesRevenue.toFixed(2)),
    totalCOGS: Number(totalCOGS.toFixed(2)),
    totalDiscountsGiven: Number(totalDiscountsGiven.toFixed(2)),
    grossOperatingProfit: Number(grossOperatingProfit.toFixed(2)),
    expiredStockLossAtCost: Number(expiredStockLossAtCost.toFixed(2)),
    expiredStockMrpValue: Number(expiredStockMrpValue.toFixed(2)),
    expiredBatchCount: expiredBatches.length,
    netProfitAfterExpiryLoss: Number(netProfitAfterExpiryLoss.toFixed(2)),
  };
}
