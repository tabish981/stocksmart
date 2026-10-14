import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X, Printer, Download, Receipt, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const InvoiceModal = ({ isOpen, onClose, sale, store }) => {
  const [layoutMode, setLayoutMode] = useState('a4'); // 'a4' or 'thermal'

  if (!isOpen || !sale) return null;

  const currentStore = store || sale.store;
  const currencySymbol = currentStore?.currency?.symbol || '₹';

  // Handle PDF Download with jsPDF
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF();

      // Header Banner
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(currentStore?.name || 'StockSmart Store', 14, 20);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const addressLine = `${currentStore?.address?.street || ''}, ${currentStore?.address?.city || ''} ${currentStore?.address?.state || ''}`;
      doc.text(addressLine, 14, 26);
      doc.text(`Phone: ${currentStore?.phone || '-'} | GSTIN: ${currentStore?.gstin || 'N/A'}`, 14, 31);

      // Invoice Info Right Aligned
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text('TAX INVOICE', 140, 20);

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`Invoice No: ${sale.invoiceNumber}`, 140, 26);
      doc.text(`Date: ${formatDateTime(sale.saleDate)}`, 140, 31);
      doc.text(`Payment: ${sale.paymentMethod.toUpperCase()}`, 140, 36);

      // Customer Bill To
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 42, 196, 42);

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Billed To:', 14, 48);

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(sale.customerName || 'Walk-in Customer', 14, 54);
      if (sale.customerPhone) doc.text(`Phone: ${sale.customerPhone}`, 14, 59);
      if (sale.customerGstin) doc.text(`GSTIN: ${sale.customerGstin}`, 14, 64);

      // Table of Items
      const tableData = (sale.items || []).map((itm, idx) => [
        idx + 1,
        `${itm.name}\nSKU: ${itm.sku}`,
        itm.quantity,
        formatCurrency(itm.unitPrice, currencySymbol),
        `${itm.taxRate}%`,
        formatCurrency(itm.discount, currencySymbol),
        formatCurrency(itm.lineTotal, currencySymbol),
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['#', 'Item Description', 'Qty', 'Rate', 'Tax', 'Disc.', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 70 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 30, halign: 'right' },
        },
      });

      // Financial Summary
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      doc.text(`Subtotal:`, 140, finalY);
      doc.text(formatCurrency(sale.subtotal, currencySymbol), 195, finalY, { align: 'right' });

      doc.text(`Taxes (GST):`, 140, finalY + 6);
      doc.text(formatCurrency(sale.taxAmount, currencySymbol), 195, finalY + 6, { align: 'right' });

      if (sale.discountAmount > 0) {
        doc.text(`Bill Discount:`, 140, finalY + 12);
        doc.text(`-${formatCurrency(sale.discountAmount, currencySymbol)}`, 195, finalY + 12, { align: 'right' });
      }

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Grand Total:`, 140, finalY + 18);
      doc.text(formatCurrency(sale.grandTotal, currencySymbol), 195, finalY + 18, { align: 'right' });

      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      doc.text(`Amount Paid:`, 140, finalY + 24);
      doc.text(formatCurrency(sale.amountPaid, currencySymbol), 195, finalY + 24, { align: 'right' });

      if (sale.outstandingAmount > 0) {
        doc.setTextColor(239, 68, 68);
        doc.text(`Balance Due:`, 140, finalY + 30);
        doc.text(formatCurrency(sale.outstandingAmount, currencySymbol), 195, finalY + 30, { align: 'right' });
      }

      // Terms & Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(currentStore?.settings?.invoiceFooterNotes || 'Thank you for your business!', 14, finalY + 40);

      doc.save(`${sale.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setLayoutMode('a4')}
                className={`px-3 py-1 rounded-lg transition ${
                  layoutMode === 'a4' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                Standard Invoice (A4)
              </button>
              <button
                onClick={() => setLayoutMode('thermal')}
                className={`px-3 py-1 rounded-lg transition ${
                  layoutMode === 'thermal' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                Thermal Receipt (POS)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/30"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-100/50 flex justify-center">
          {layoutMode === 'a4' ? (
            /* A4 Modern Invoice */
            <div
              id="printable-invoice"
              className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 text-slate-800"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{currentStore?.name || 'StockSmart Store'}</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    {currentStore?.address?.street}, {currentStore?.address?.city}, {currentStore?.address?.state}{' '}
                    {currentStore?.address?.zipCode}
                  </p>
                  <p className="text-xs text-slate-500">Phone: {currentStore?.phone || '-'}</p>
                  <p className="text-xs text-slate-500">GSTIN: {currentStore?.gstin || 'Unregistered'}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 mb-2">
                    TAX INVOICE
                  </span>
                  <p className="text-sm font-bold text-slate-900">{sale.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(sale.saleDate)}</p>
                  <p className="text-xs font-medium text-indigo-600 mt-1 uppercase">Method: {sale.paymentMethod}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="py-4 border-b border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Billed To</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{sale.customerName || 'Walk-in Customer'}</p>
                  {sale.customerPhone && <p className="text-xs text-slate-500">Phone: {sale.customerPhone}</p>}
                  {sale.customerGstin && <p className="text-xs text-slate-500">GSTIN: {sale.customerGstin}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Invoice Status</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5">Item</th>
                      <th className="py-2.5 text-center">Qty</th>
                      <th className="py-2.5 text-right">Rate</th>
                      <th className="py-2.5 text-center">Tax</th>
                      <th className="py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(sale.items || []).map((itm, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5">
                          <p className="font-semibold text-slate-800">{itm.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {itm.sku}</p>
                        </td>
                        <td className="py-2.5 text-center font-medium">{itm.quantity}</td>
                        <td className="py-2.5 text-right">{formatCurrency(itm.unitPrice, currencySymbol)}</td>
                        <td className="py-2.5 text-center text-slate-500">{itm.taxRate}%</td>
                        <td className="py-2.5 text-right font-semibold text-slate-900">
                          {formatCurrency(itm.lineTotal, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(sale.subtotal, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Taxes (GST)</span>
                    <span>{formatCurrency(sale.taxAmount, currencySymbol)}</span>
                  </div>
                  {sale.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount</span>
                      <span>-{formatCurrency(sale.discountAmount, currencySymbol)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total</span>
                    <span>{formatCurrency(sale.grandTotal, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold pt-1">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(sale.amountPaid, currencySymbol)}</span>
                  </div>
                  {sale.changeGiven > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Change Given</span>
                      <span>{formatCurrency(sale.changeGiven, currencySymbol)}</span>
                    </div>
                  )}
                  {sale.outstandingAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Balance Outstanding</span>
                      <span>{formatCurrency(sale.outstandingAmount, currencySymbol)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Terms */}
              <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 space-y-1">
                <p className="font-medium text-slate-600">{currentStore?.settings?.invoiceFooterNotes}</p>
                <p>{currentStore?.settings?.termsAndConditions}</p>
              </div>
            </div>
          ) : (
            /* Thermal POS Receipt Layout (80mm width) */
            <div
              id="printable-invoice"
              className="w-72 bg-white p-4 rounded-xl shadow-sm border border-slate-300 font-mono text-[11px] text-slate-800"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h3 className="font-bold text-sm uppercase">{currentStore?.name || 'StockSmart'}</h3>
                <p className="text-[10px] text-slate-500">{currentStore?.address?.city || ''} - GST: {currentStore?.gstin || '-'}</p>
                <p className="text-[10px]">Ph: {currentStore?.phone || '-'}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                <p>Invoice: {sale.invoiceNumber}</p>
                <p>Date: {formatDateTime(sale.saleDate)}</p>
                <p>Cust: {sale.customerName || 'Walk-in'}</p>
                <p>Mode: {sale.paymentMethod.toUpperCase()}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold pb-1 text-[10px]">
                  <span>Item</span>
                  <span>Qty x Rate = Total</span>
                </div>
                {(sale.items || []).map((itm, i) => (
                  <div key={i} className="py-0.5">
                    <p className="font-medium truncate">{itm.name}</p>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {itm.quantity} x {formatCurrency(itm.unitPrice, currencySymbol)}
                      </span>
                      <span className="font-bold text-slate-900">{formatCurrency(itm.lineTotal, currencySymbol)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-right text-[10px]">
                <p>Subtotal: {formatCurrency(sale.subtotal, currencySymbol)}</p>
                <p>GST: {formatCurrency(sale.taxAmount, currencySymbol)}</p>
                {sale.discountAmount > 0 && <p className="text-emerald-700">Disc: -{formatCurrency(sale.discountAmount, currencySymbol)}</p>}
                <p className="text-xs font-bold pt-1 border-t border-slate-200">
                  TOTAL: {formatCurrency(sale.grandTotal, currencySymbol)}
                </p>
                <p>Paid: {formatCurrency(sale.amountPaid, currencySymbol)}</p>
                {sale.changeGiven > 0 && <p>Change: {formatCurrency(sale.changeGiven, currencySymbol)}</p>}
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-500">
                <p>*** THANK YOU VISIT AGAIN ***</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
