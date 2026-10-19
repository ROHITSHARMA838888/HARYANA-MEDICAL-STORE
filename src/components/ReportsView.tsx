import React, { useState, useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import {
  formatINR,
  formatDateDDMMYYYY,
  daysUntil,
  calculateProfitAndLoss,
  type SaleRecord,
  type PurchaseRecord,
  type SaleReturnRecord,
  type PurchaseReturnRecord,
  type Medicine,
  type Batch,
} from '../utils/pharmacyLogic';

interface ReportsViewProps {
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  saleReturns: SaleReturnRecord[];
  purchaseReturns: PurchaseReturnRecord[];
  medicines: Medicine[];
  batches: Batch[];
  userRole: 'Owner' | 'Staff';
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  purchases,
  saleReturns,
  purchaseReturns,
  medicines,
  batches,
  userRole,
  showToast,
}) => {
  const [activeReport, setActiveReport] = useState<'pnl' | 'gst' | 'valuation' | 'deadstock'>('pnl');

  const pnl = useMemo(
    () => calculateProfitAndLoss(sales, saleReturns, batches),
    [sales, saleReturns, batches]
  );

  const totalPurchasesVal = purchases.reduce((s, p) => s + p.grandTotal, 0);
  const totalPurchaseReturnsVal = purchaseReturns.reduce((s, r) => s + r.amount, 0);

  const stockValuation = useMemo(() => {
    const validBatches = batches.filter((b) => b.quantity > 0 && daysUntil(b.expiryDate) >= 0);
    const totalUnits = validBatches.reduce((s, b) => s + b.quantity, 0);
    const costValue = validBatches.reduce((s, b) => s + b.quantity * b.purchaseRate, 0);
    const mrpValue = validBatches.reduce((s, b) => s + b.quantity * b.mrp, 0);
    return { totalUnits, costValue, mrpValue, potentialMargin: mrpValue - costValue };
  }, [batches]);

  const gstSummary = useMemo(() => {
    const outputCgst = sales.reduce((s, x) => s + x.cgstTotal, 0);
    const outputSgst = sales.reduce((s, x) => s + x.sgstTotal, 0);
    const taxableSales = sales.reduce((s, x) => s + x.subTotal, 0);
    const inputGst = purchases.reduce((s, p) => s + (p.grandTotal - p.grandTotal / 1.12), 0);
    return {
      taxableSales,
      outputCgst,
      outputSgst,
      totalOutputGst: outputCgst + outputSgst,
      inputGst,
      netGstPayable: Math.max(0, outputCgst + outputSgst - inputGst),
    };
  }, [sales, purchases]);

  const deadStockMeds = useMemo(() => {
    return medicines.filter((m) => {
      const daysSinceSold = Math.abs(daysUntil(m.lastSoldDate));
      return daysSinceSold > 60;
    });
  }, [medicines]);

  const handleExportCSV = () => {
    let csv = '';
    if (activeReport === 'pnl') {
      csv = [
        'Metric,Amount (INR)',
        `Gross Sales Revenue,${pnl.totalSalesRevenue}`,
        `Customer Returns Refunded,${pnl.totalReturnsRefunded}`,
        `Net Sales Revenue,${pnl.netSalesRevenue}`,
        `Cost of Goods Sold (COGS),${pnl.totalCOGS}`,
        `Gross Operating Profit,${pnl.grossOperatingProfit}`,
        `Expired Stock Loss (At Purchase Cost),${pnl.expiredStockLossAtCost}`,
        `Net Profit After Expiry Loss,${pnl.netProfitAfterExpiryLoss}`,
      ].join('\n');
    } else if (activeReport === 'gst') {
      csv = [
        'Bill No,Date,Customer,Taxable Value,CGST (6%),SGST (6%),Grand Total',
        ...sales.map(
          (s) =>
            `${s.id},${formatDateDDMMYYYY(s.date)},"${s.customerName}",${s.subTotal},${
              s.cgstTotal
            },${s.sgstTotal},${s.grandTotal}`
        ),
      ].join('\n');
    } else {
      csv = [
        'Batch No,Medicine ID,Expiry Date,Quantity,Purchase Rate,MRP',
        ...batches.map(
          (b) =>
            `${b.batchNo},${b.medicineId},${b.expiryDate},${b.quantity},${b.purchaseRate},${b.mrp}`
        ),
      ].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HaryanaMedical-${activeReport}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${activeReport.toUpperCase()} Report as CSV!`);
  };

  // Max value for SVG bar chart scaling
  const chartMax = Math.max(
    1000,
    pnl.totalSalesRevenue,
    totalPurchasesVal,
    pnl.grossOperatingProfit,
    pnl.expiredStockLossAtCost
  );

  return (
    <div className="space-y-5">
      {/* Top Report Selector & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Financial Reports, GST Summary & P/L Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Includes separate Expired Stock Loss breakout in Profit & Loss statement
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          {(
            [
              { id: 'pnl', label: 'Profit & Loss + Expiry Loss' },
              { id: 'gst', label: 'GST Tax Summary (CGST/SGST)' },
              { id: 'valuation', label: 'Stock Valuation Report' },
              { id: 'deadstock', label: 'Dead / Slow-Moving Stock' },
            ] as const
          ).map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                activeReport === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive SVG Financial Overview Chart */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Visual Comparison: Sales vs Purchases vs Operating Profit vs Expired Stock Loss
          </p>
          <svg viewBox="0 0 600 160" className="w-full h-40 overflow-visible">
            {[
              {
                label: 'Gross Sales',
                val: pnl.totalSalesRevenue,
                color: '#15803d',
                x: 40,
              },
              {
                label: 'Purchases',
                val: totalPurchasesVal,
                color: '#0284c7',
                x: 180,
              },
              {
                label: 'Operating Profit',
                val: Math.max(0, pnl.grossOperatingProfit),
                color: '#16a34a',
                x: 320,
              },
              {
                label: 'Expired Loss',
                val: pnl.expiredStockLossAtCost,
                color: '#dc2626',
                x: 460,
              },
            ].map((bar) => {
              const barH = Math.max(8, Math.round((bar.val / chartMax) * 105));
              const y = 125 - barH;
              return (
                <g key={bar.label}>
                  <rect
                    x={bar.x}
                    y={y}
                    width={85}
                    height={barH}
                    rx={6}
                    fill={bar.color}
                  />
                  <text
                    x={bar.x + 42}
                    y={y - 6}
                    textAnchor="middle"
                    className="text-[11px] font-mono font-bold fill-slate-800 dark:fill-slate-200"
                  >
                    {formatINR(bar.val)}
                  </text>
                  <text
                    x={bar.x + 42}
                    y={145}
                    textAnchor="middle"
                    className="text-[11px] font-semibold fill-slate-600 dark:fill-slate-400"
                  >
                    {bar.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Report Details Section */}
        {activeReport === 'pnl' && (
          <div className="space-y-4">
            {userRole !== 'Owner' ? (
              <div className="p-6 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                Profit margins and purchase cost breakdowns are restricted in Staff Mode. Switch to
                Owner Mode (Rahul Sharma) to inspect full P&L margins.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-sans text-slate-500">Net Sales Revenue</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {formatINR(pnl.netSalesRevenue)}
                  </p>
                  <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                    After {formatINR(pnl.totalReturnsRefunded)} customer returns
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-sans text-slate-500">Gross Operating Profit</p>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatINR(pnl.grossOperatingProfit)}
                  </p>
                  <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                    COGS: {formatINR(pnl.totalCOGS)}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20">
                  <p className="font-sans text-red-700 dark:text-red-300 font-semibold">
                    Expired Stock Loss (Breakout)
                  </p>
                  <p className="text-base font-bold text-red-600 mt-1">
                    -{formatINR(pnl.expiredStockLossAtCost)}
                  </p>
                  <p className="font-sans text-[11px] text-red-600/80 mt-0.5">
                    {pnl.expiredBatchCount} expired batch(es) · MRP value {formatINR(pnl.expiredStockMrpValue)}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-sans text-slate-500">Net Profit (After Expiry Loss)</p>
                  <p
                    className={`text-base font-bold mt-1 ${
                      pnl.netProfitAfterExpiryLoss >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {formatINR(pnl.netProfitAfterExpiryLoss)}
                  </p>
                  <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                    Purchase Returns: {formatINR(totalPurchaseReturnsVal)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeReport === 'gst' && (
          <div className="grid sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Taxable Sales Value</p>
              <p className="text-base font-bold mt-1">{formatINR(gstSummary.taxableSales)}</p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Output CGST (6%) + SGST (6%)</p>
              <p className="text-base font-bold mt-1">{formatINR(gstSummary.totalOutputGst)}</p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Input GST Credit (Purchases)</p>
              <p className="text-base font-bold text-emerald-700 mt-1">
                {formatINR(gstSummary.inputGst)}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Net GST Payable</p>
              <p className="text-base font-bold text-amber-600 mt-1">
                {formatINR(gstSummary.netGstPayable)}
              </p>
            </div>
          </div>
        )}

        {activeReport === 'valuation' && (
          <div className="grid sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Total Salable Units</p>
              <p className="text-base font-bold mt-1">{stockValuation.totalUnits} Strips/Bottles</p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Stock Value at Purchase Cost</p>
              <p className="text-base font-bold mt-1">{formatINR(stockValuation.costValue)}</p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Stock Value at Retail MRP</p>
              <p className="text-base font-bold text-emerald-700 mt-1">
                {formatINR(stockValuation.mrpValue)}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-sans text-slate-500">Projected Retail Margin</p>
              <p className="text-base font-bold text-emerald-700 mt-1">
                {formatINR(stockValuation.potentialMargin)}
              </p>
            </div>
          </div>
        )}

        {activeReport === 'deadstock' && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-3 text-left">Medicine</th>
                  <th className="py-2 px-2 text-left">Salt</th>
                  <th className="py-2 px-2 text-left">Rack</th>
                  <th className="py-2 px-3 text-left">Last Sold Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {deadStockMeds.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Medicine" className="py-2 px-3 font-semibold">{m.name}</td>
                    <td data-label="Salt" className="py-2 px-2 text-slate-500">{m.salt}</td>
                    <td data-label="Rack" className="py-2 px-2 font-mono">{m.rack}</td>
                    <td data-label="Last Sold Date" className="py-2 px-3 font-mono text-amber-600">
                      {formatDateDDMMYYYY(m.lastSoldDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
