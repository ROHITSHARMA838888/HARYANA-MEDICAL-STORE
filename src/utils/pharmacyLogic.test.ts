import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateDDMMYYYY,
  daysUntil,
  generateNextSaleBillId,
  getMedicineCompleteHistory,
  restoreDeletedRecord,
  selectFEFOBatches,
  calculateCartTotals,
  calculateProfitAndLoss,
  type Batch,
  type CartItem,
  type Customer,
  type DeletedItemRecord,
  type Medicine,
  type PurchaseRecord,
  type SaleRecord,
  type StockMovement,
  type Supplier,
} from './pharmacyLogic.ts';

const refDate = new Date('2026-10-18T10:00:00Z');

test('generateNextSaleBillId generates collision-free sequential bill numbers', () => {
  assert.equal(generateNextSaleBillId([], 2026), 'HMS-2026-001');
  const existing = [
    { id: 'HMS-2026-001' } as SaleRecord,
    { id: 'HMS-2026-004' } as SaleRecord,
  ];
  assert.equal(generateNextSaleBillId(existing, 2026), 'HMS-2026-005');
});

const sampleBatches: Batch[] = [
  {
    id: 'B1',
    medicineId: 'M1',
    batchNo: 'DL2801',
    expiryDate: '2028-01-31',
    purchaseRate: 22,
    mrp: 33,
    quantity: 90,
    supplierId: 'SUP-2',
    purchaseDate: '2026-10-02',
    barcode: '8901002',
  },
  {
    id: 'B2',
    medicineId: 'M1',
    batchNo: 'DL2703',
    expiryDate: '2027-03-31',
    purchaseRate: 21.5,
    mrp: 33,
    quantity: 65,
    supplierId: 'SUP-1',
    purchaseDate: '2026-09-10',
    barcode: '8901001',
  },
  {
    id: 'B3',
    medicineId: 'M14',
    batchNo: 'BT2409X',
    expiryDate: '2026-09-30',
    purchaseRate: 85,
    mrp: 135,
    quantity: 8,
    supplierId: 'SUP-1',
    purchaseDate: '2025-11-10',
    barcode: '8901015',
  },
];

test('formatDateDDMMYYYY formats ISO dates into Indian DD/MM/YYYY format', () => {
  assert.equal(formatDateDDMMYYYY('2026-10-18'), '18/10/2026');
  assert.equal(formatDateDDMMYYYY('2027-03-31'), '31/03/2027');
});

test('selectFEFOBatches picks earliest non-expired batch and blocks expired batches', () => {
  const m1Result = selectFEFOBatches('M1', sampleBatches, refDate);
  assert.equal(m1Result.chosenBatch?.batchNo, 'DL2703');
  assert.equal(m1Result.validBatches.length, 2);

  const expiredMedResult = selectFEFOBatches('M14', sampleBatches, refDate);
  assert.equal(expiredMedResult.chosenBatch, null);
  assert.equal(expiredMedResult.expiredBatches.length, 1);
  assert.ok(daysUntil(expiredMedResult.expiredBatches[0].expiryDate, refDate) < 0);
});

test('calculateCartTotals computes GST, discounts, round-off, and below-cost flag accurately', () => {
  const cart: CartItem[] = [
    {
      medicineId: 'M1',
      medicineName: 'Dolo 650 Tablet',
      schedule: 'OTC',
      batchId: 'B2',
      batchNo: 'DL2703',
      expiryDate: '2027-03-31',
      availableQty: 65,
      qty: 2,
      mrp: 33,
      purchaseRate: 21.5,
      discountPct: 0,
      gst: 12,
    },
  ];

  const totals = calculateCartTotals(cart, 0);
  assert.equal(totals.grandTotal, 66);
  assert.equal(totals.hasBelowCostItem, false);
  assert.equal(totals.cgstTotal + totals.sgstTotal + totals.subTotal, 66);

  // Test selling below purchase price triggers belowCost warning flag
  const discountedTotals = calculateCartTotals([{ ...cart[0], discountPct: 50 }], 0);
  assert.equal(discountedTotals.hasBelowCostItem, true);
});

test('calculateProfitAndLoss separates gross operating profit and expired stock loss', () => {
  const sales: SaleRecord[] = [
    {
      id: 'HMS-1',
      date: '2026-10-17',
      time: '10:00 AM',
      customerId: 'CUST-1',
      customerName: 'Walk-in',
      customerMobile: '9813400001',
      doctorName: 'Self',
      paymentMode: 'Cash',
      paidAmount: 1000,
      billDiscount: 0,
      subTotal: 892.86,
      cgstTotal: 53.57,
      sgstTotal: 53.57,
      roundOff: 0,
      grandTotal: 1000,
      items: [
        {
          medicineId: 'M1',
          medicineName: 'Dolo 650',
          schedule: 'OTC',
          batchId: 'B2',
          batchNo: 'DL2703',
          expiryDate: '2027-03-31',
          qty: 10,
          mrp: 100,
          purchaseRate: 60,
          discountPct: 0,
          gst: 12,
          total: 1000,
        },
      ],
    },
  ];

  const pnl = calculateProfitAndLoss(sales, [], sampleBatches, refDate);
  assert.equal(pnl.grossOperatingProfit, 400); // 1000 revenue - 600 COGS
  assert.equal(pnl.expiredStockLossAtCost, 680); // 8 units * Rs.85 purchaseRate
  assert.equal(pnl.netProfitAfterExpiryLoss, -280);
});

test('getMedicineCompleteHistory aggregates batches, sales, purchases, and movements for a medicine', () => {
  const medicines: Medicine[] = [
    {
      id: 'M1',
      name: 'Dolo 650 Tablet',
      salt: 'Paracetamol 650mg',
      manufacturer: 'Micro Labs',
      category: 'Tablet',
      hsn: '30049099',
      gst: 12,
      schedule: 'OTC',
      rack: 'R1-A1',
      reorderLevel: 30,
      stripsPerBox: 10,
      unitsPerStrip: 15,
      lastSoldDate: '2026-10-17',
    },
  ];
  const sales: SaleRecord[] = [
    {
      id: 'HMS-2026-001',
      date: '2026-10-17',
      time: '10:00 AM',
      customerId: 'CUST-1',
      customerName: 'Ramesh',
      customerMobile: '9813400001',
      doctorName: 'Self',
      paymentMode: 'Cash',
      paidAmount: 66,
      billDiscount: 0,
      subTotal: 58.92,
      cgstTotal: 3.54,
      sgstTotal: 3.54,
      roundOff: 0,
      grandTotal: 66,
      items: [
        {
          medicineId: 'M1',
          medicineName: 'Dolo 650 Tablet',
          schedule: 'OTC',
          batchId: 'B2',
          batchNo: 'DL2703',
          expiryDate: '2027-03-31',
          qty: 2,
          mrp: 33,
          purchaseRate: 21.5,
          discountPct: 0,
          gst: 12,
          total: 66,
        },
      ],
    },
  ];
  const purchases: PurchaseRecord[] = [
    {
      id: 'PUR-1',
      invoiceNo: 'INV-101',
      supplierId: 'SUP-1',
      supplierName: 'Mewat Pharma',
      supplierMobile: '9812011223',
      date: '2026-09-10',
      paymentStatus: 'Paid',
      paidAmount: 2150,
      grandTotal: 2150,
      billImage: '',
      items: [
        {
          medicineId: 'M1',
          medicineName: 'Dolo 650 Tablet',
          batchId: 'B2',
          batchNo: 'DL2703',
          expiryDate: '2027-03-31',
          qty: 100,
          rate: 21.5,
          mrp: 33,
          gst: 12,
          total: 2150,
        },
      ],
    },
  ];
  const movements: StockMovement[] = [
    {
      id: 'SM-1',
      date: '2026-10-17',
      type: 'SALE',
      refId: 'HMS-2026-001',
      medicineName: 'Dolo 650 Tablet',
      batchNo: 'DL2703',
      qtyChange: -2,
      note: 'Sold to Ramesh',
    },
  ];

  const history = getMedicineCompleteHistory('M1', medicines, sampleBatches, sales, purchases, movements);
  assert.equal(history.totalCurrentStock, 155); // 90 + 65
  assert.equal(history.totalUnitsSold, 2);
  assert.equal(history.totalUnitsPurchased, 100);
  assert.equal(history.salesHistory.length, 1);
  assert.equal(history.purchaseHistory.length, 1);
  assert.equal(history.movements.length, 1);
});

test('restoreDeletedRecord recovers deleted medicines, batches, suppliers, customers, and sales bills', () => {
  const deletedMedRecord: DeletedItemRecord = {
    id: 'DEL-1',
    deletedAt: '18/10/2026, 09:00 AM',
    entityType: 'MEDICINE',
    title: 'Cetirizine 10mg Tablet',
    subtitle: 'Batch CZ2701 (40 strips)',
    medicine: {
      id: 'MED-99',
      name: 'Cetirizine 10mg Tablet',
      salt: 'Cetirizine Hydrochloride 10mg',
      manufacturer: 'Cipla Ltd',
      category: 'Tablet',
      hsn: '30049099',
      gst: 12,
      schedule: 'H',
      rack: 'R2-C1',
      reorderLevel: 25,
      stripsPerBox: 10,
      unitsPerStrip: 10,
      lastSoldDate: '2026-10-10',
    },
    batches: [
      {
        id: 'BAT-99',
        medicineId: 'MED-99',
        batchNo: 'CZ2701',
        expiryDate: '2027-08-31',
        purchaseRate: 12,
        mrp: 21,
        quantity: 40,
        supplierId: 'SUP-1',
        purchaseDate: '2026-09-01',
        barcode: '8901999',
      },
    ],
  };

  const afterMedRestore = restoreDeletedRecord(deletedMedRecord, {
    medicines: [],
    batches: [],
    suppliers: [],
    customers: [],
    sales: [],
  });
  assert.equal(afterMedRestore.medicines.length, 1);
  assert.equal(afterMedRestore.batches.length, 1);
  assert.equal(afterMedRestore.medicines[0].name, 'Cetirizine 10mg Tablet');

  const deletedSupRecord: DeletedItemRecord = {
    id: 'DEL-2',
    deletedAt: '18/10/2026, 09:05 AM',
    entityType: 'SUPPLIER',
    title: 'Apex Pharma Agency',
    subtitle: 'GSTIN: 06AAACA1111B1Z2',
    supplier: {
      id: 'SUP-99',
      name: 'Apex Pharma Agency',
      gstin: '06AAACA1111B1Z2',
      phone: '9812099999',
      address: 'Alwar Road, Nuh',
      openingBalance: 0,
    },
  };
  const afterSupRestore = restoreDeletedRecord(deletedSupRecord, afterMedRestore);
  assert.equal(afterSupRestore.suppliers.length, 1);
  assert.equal(afterSupRestore.suppliers[0].name, 'Apex Pharma Agency');

  const deletedCustRecord: DeletedItemRecord = {
    id: 'DEL-3',
    deletedAt: '18/10/2026, 09:10 AM',
    entityType: 'CUSTOMER',
    title: 'Salim Ahmed',
    subtitle: 'Udhaar: ₹350.00',
    customer: {
      id: 'CUST-99',
      name: 'Salim Ahmed',
      mobile: '9813499999',
      address: 'Dhoha',
      udhaarBalance: 350,
    },
  };
  const afterCustRestore = restoreDeletedRecord(deletedCustRecord, afterSupRestore);
  assert.equal(afterCustRestore.customers.length, 1);
  assert.equal(afterCustRestore.customers[0].udhaarBalance, 350);
});
