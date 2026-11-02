import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FileText, Printer, ShieldCheck, Download } from 'lucide-react';

export default function ReportsModule({ currentUser }) {
  const [reportType, setReportType] = useState(
    currentUser.role === 'admin' || currentUser.role === 'manager' ? 'sales' : 'cashier_daily'
  );
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all', 'needs_restock', 'out_of_stock', 'low_stock'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReportData(null);
    loadReport();
  }, [reportType, selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'sales' || reportType === 'cashier_daily') {
        const sales = await api.getSales();
        
        if (reportType === 'cashier_daily') {
           // Filter for selected date's sales by current user
           const filtered = sales.filter(s => {
               const sDateObj = new Date(s.timestamp);
               const sDateStr = `${sDateObj.getFullYear()}-${String(sDateObj.getMonth() + 1).padStart(2, '0')}-${String(sDateObj.getDate()).padStart(2, '0')}`;
               return sDateStr === selectedDate && String(s.cashier) === String(currentUser.id);
           });
           setReportData(filtered);
        } else {
           // Filter all sales by selected date
           const filtered = sales.filter(s => {
               const sDateObj = new Date(s.timestamp);
               const sDateStr = `${sDateObj.getFullYear()}-${String(sDateObj.getMonth() + 1).padStart(2, '0')}-${String(sDateObj.getDate()).padStart(2, '0')}`;
               return sDateStr === selectedDate;
           });
           setReportData(filtered);
        }
      } else if (reportType === 'inventory') {
        const products = await api.getProducts();
        setReportData(products);
      } else if (reportType === 'financial') {
        const summary = await api.getAnalyticsSummary();
        setReportData(summary);
      } else if (reportType === 'shifts') {
        const shifts = await api.getShifts();
        setReportData(shifts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getFilteredInventory = () => {
    if (!Array.isArray(reportData)) return [];
    return reportData
      .filter(p => {
        if (inventoryFilter === 'out_of_stock') return p.stock_quantity <= 0;
        if (inventoryFilter === 'low_stock') return p.stock_quantity > 0 && p.stock_quantity < 10;
        if (inventoryFilter === 'needs_restock') return p.stock_quantity < 10;
        return true;
      })
      .slice()
      .sort((a, b) => a.stock_quantity - b.stock_quantity);
  };

  const handleDownloadInventoryCSV = () => {
    const items = getFilteredInventory();
    const headers = [
      'SKU / Barcode',
      'Product Name',
      'Category',
      'Units in Stock',
      'Status',
      'Cost Price (KES)',
      'Retail Price (KES)',
      'Asset Valuation (KES)'
    ];
    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = items.map(prod => {
      const status = prod.stock_quantity <= 0 ? 'OUT OF STOCK' : prod.stock_quantity < 10 ? 'LOW STOCK' : 'IN STOCK';
      const valuation = (Number(prod.cost_price || 0) * Number(prod.stock_quantity || 0)).toFixed(2);
      return [
        escapeCsv(prod.barcode),
        escapeCsv(prod.name),
        escapeCsv(prod.category_name || ''),
        prod.stock_quantity,
        status,
        Number(prod.cost_price || 0).toFixed(2),
        Number(prod.retail_price || 0).toFixed(2),
        valuation
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_report_${inventoryFilter}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="cyber-title" style={{ fontSize: '1.25rem' }}>Reports Center</h2>
          <p className="cyber-subtitle">Generate exportable audit-ready summaries for store accounting.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {reportType === 'inventory' && Array.isArray(reportData) && (
            <button className="cyber-button btn-lime" onClick={handleDownloadInventoryCSV}>
              <Download size={14} /> Download Stock CSV
            </button>
          )}
          <button className="cyber-button" onClick={handlePrint}>
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

        {/* Selectors and Date Picker */}
        <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-dark)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-muted)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <>
                <button 
                  className={`cyber-button ${reportType === 'sales' ? 'btn-lime' : ''}`}
                  onClick={() => setReportType('sales')}
                >
                  Sales Transactions
                </button>
                <button 
                  className={`cyber-button ${reportType === 'inventory' ? 'btn-lime' : ''}`}
                  onClick={() => setReportType('inventory')}
                >
                  Stock Quantities & Valuation
                </button>
              </>
            )}

            <button 
              className={`cyber-button ${reportType === 'cashier_daily' ? 'btn-lime' : ''}`}
              onClick={() => setReportType('cashier_daily')}
            >
              My Daily Z-Report
            </button>

            {currentUser.role === 'admin' && (
              <>
                <button 
                  className={`cyber-button ${reportType === 'financial' ? 'btn-lime' : ''}`}
                  onClick={() => setReportType('financial')}
                >
                  Profit & Loss Summary
                </button>
                <button 
                  className={`cyber-button ${reportType === 'shifts' ? 'btn-lime' : ''}`}
                  onClick={() => setReportType('shifts')}
                >
                  Shift Drawer Audits
                </button>
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {reportType === 'inventory' && (
              <select
                className="cyber-input"
                style={{ width: 'auto' }}
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
              >
                <option value="all">Show: All Stock Items</option>
                <option value="needs_restock">Show: Needs Restock (&lt; 10)</option>
                <option value="out_of_stock">Show: Out of Stock Only (0)</option>
                <option value="low_stock">Show: Low Stock Only (1-9)</option>
              </select>
            )}
            <label className="cyber-label" style={{ marginBottom: 0 }}>Report Date:</label>
            <input 
              type="date" 
              className="cyber-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>
        </div>

      {/* Report Display Container */}
      <div className="cyber-card" style={{ flex: 1, overflowY: 'auto' }} id="printable-report-area">
        {loading || !reportData ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '4rem', fontFamily: 'var(--font-mono)' }}>GENERATING COMPLIANCE RECORD...</p>
        ) : (
          <div>
            <div style={{ borderBottom: '2px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <h3 className="cyber-title" style={{ fontSize: '1.2rem' }}>
                  {reportType === 'sales' && 'Sales Register Report'}
                  {reportType === 'cashier_daily' && 'My Daily Z-Report (Shift Totals)'}
                  {reportType === 'inventory' && 'Stock Quantities & Valuation Statement'}
                  {reportType === 'financial' && 'Income Statement (P&L)'}
                  {reportType === 'shifts' && 'Shift Drawer Audits'}
                </h3>
                <p className="cyber-subtitle" style={{ fontSize: '0.85rem' }}>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} | For Date: {new Date(selectedDate).toLocaleDateString()}</p>
              </div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>LIGHTS ELECTRICALS ERP</div>
            </div>

            {/* Sales report */}
            {reportType === 'sales' && (
              <div className="cyber-table-container">
                <table className="cyber-table cyber-table-mono">
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th>Timestamp</th>
                      <th>Customer</th>
                      <th>Cashier</th>
                      <th style={{ textAlign: 'right' }}>Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData) && reportData.map(sale => (
                      <tr key={sale.id}>
                        <td>#{sale.id}</td>
                        <td>{new Date(sale.timestamp).toLocaleString()}</td>
                        <td style={{ fontFamily: 'var(--font-sans)' }}>{sale.customer_name || 'Walk-in'}</td>
                        <td style={{ fontFamily: 'var(--font-sans)' }}>{sale.cashier_name}</td>
                        <td style={{ textAlign: 'right' }}>KES {Number(sale.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cashier Daily Z-Report */}
            {reportType === 'cashier_daily' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px', margin: '0 auto', padding: '1rem', background: 'var(--bg-darker)', borderRadius: '4px' }}>
                <h4 style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px dashed var(--border-muted)', paddingBottom: '1rem' }}>
                  CASHIER SHIFT TOTALS<br/><br/>
                  <span style={{color:'var(--accent-cyan)'}}>{currentUser.name}</span><br/>
                  <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{new Date(selectedDate).toLocaleDateString()}</span>
                </h4>
                
                {(() => {
                  if (!Array.isArray(reportData)) return null;
                  
                  let totalCash = 0;
                  let totalMpesa = 0;
                  let totalCard = 0;
                  let totalCredit = 0;
                  let grandTotal = 0;
                  
                  reportData.forEach(sale => {
                     grandTotal += Number(sale.total);
                     if (sale.payment_method === 'Cash') totalCash += Number(sale.total);
                     if (sale.payment_method === 'M-Pesa') totalMpesa += Number(sale.total);
                     if (sale.payment_method === 'Card') totalCard += Number(sale.total);
                     if (sale.payment_method === 'Credit') totalCredit += Number(sale.total);
                     if (sale.payment_method === 'Mixed') {
                         totalCash += Number(sale.mixed_cash_amount || 0);
                         totalMpesa += Number(sale.mixed_mpesa_amount || 0);
                     }
                  });

                  return (
                    <>
                      {currentUser.role !== 'cashier' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Cash Collected:</span>
                          <span className="currency">KES {totalCash.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>M-Pesa Collected:</span>
                        <span className="currency">KES {totalMpesa.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Card Payments:</span>
                        <span className="currency">KES {totalCard.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.5rem' }}>
                        <span>Store Credit:</span>
                        <span className="currency">KES {totalCredit.toLocaleString()}</span>
                      </div>
                      
                      {currentUser.role !== 'cashier' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--accent-cyan)', paddingBottom: '0.5rem', fontWeight: 'bold' }}>
                          <span>Gross Shift Sales:</span>
                          <span className="currency" style={{ color: 'var(--success-lime)', fontSize: '1.15rem' }}>
                            KES {grandTotal.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {currentUser.role === 'cashier' && (
                        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--alert-orange)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
                          Blind shift closing is enforced. Cash totals are hidden.
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', justifyContent: 'center' }}>
                        <span>Transactions: {reportData.length}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Inventory Valuation Report */}
            {reportType === 'inventory' && (
              <div className="cyber-table-container">
                <table className="cyber-table cyber-table-mono">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'center' }}>Units in Stock</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Cost Price</th>
                      <th style={{ textAlign: 'right' }}>Retail Price</th>
                      <th style={{ textAlign: 'right' }}>Asset Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredInventory().map(prod => {
                      const valuation = Number(prod.cost_price) * prod.stock_quantity;
                      const isDepleted = prod.stock_quantity <= 0;
                      const isLow = prod.stock_quantity > 0 && prod.stock_quantity < 10;
                      return (
                        <tr key={prod.id}>
                          <td>{prod.barcode}</td>
                          <td style={{ fontFamily: 'var(--font-sans)' }}>{prod.name}</td>
                          <td style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>{prod.category_name || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: isDepleted ? '#FF3333' : isLow ? 'var(--alert-orange)' : 'var(--success-lime)' }}>
                            {prod.stock_quantity}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`cyber-badge ${isDepleted || isLow ? 'badge-orange' : 'badge-lime'}`}>
                              {isDepleted ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>KES {Number(prod.cost_price).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>KES {Number(prod.retail_price).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>
                            KES {valuation.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Income P&L Statement */}
            {reportType === 'financial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px', margin: '0 auto', padding: '1rem', background: 'var(--bg-darker)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.5rem' }}>
                  <span>Gross POS Revenue:</span>
                  <span className="currency" style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>
                    KES {Number(reportData.total_sales_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.5rem' }}>
                  <span>Cost of Goods Sold (COGS):</span>
                  <span className="currency" style={{ color: 'var(--alert-orange)' }}>
                    KES {(Number(reportData.total_sales_amount) - Number(reportData.net_profit)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--accent-cyan)', paddingBottom: '0.5rem', fontWeight: 'bold' }}>
                  <span>Net Operating Profit:</span>
                  <span className="currency" style={{ color: 'var(--success-lime)', fontSize: '1.15rem' }}>
                    KES {Number(reportData.net_profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                  <ShieldCheck size={16} /> <span>Audited compliance record verified.</span>
                </div>
              </div>
            )}

            {/* Shifts Drawer Audits */}
            {reportType === 'shifts' && (
              <div className="cyber-table-container">
                <table className="cyber-table cyber-table-mono">
                  <thead>
                    <tr>
                      <th>Shift #</th>
                      <th>Cashier</th>
                      <th>Open Time</th>
                      <th>Close Time</th>
                      <th style={{ textAlign: 'right' }}>Expected Cash</th>
                      <th style={{ textAlign: 'right' }}>Actual Cash</th>
                      <th style={{ textAlign: 'right' }}>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData) && reportData.map(shift => (
                      <tr key={shift.id}>
                        <td>#{shift.id}</td>
                        <td style={{ fontFamily: 'var(--font-sans)' }}>{shift.cashier_name}</td>
                        <td>{new Date(shift.open_time).toLocaleString()}</td>
                        <td>{shift.close_time ? new Date(shift.close_time).toLocaleString() : 'Open'}</td>
                        <td style={{ textAlign: 'right' }}>KES {Number(shift.ending_cash || shift.starting_cash).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{shift.actual_cash ? `KES ${Number(shift.actual_cash).toLocaleString()}` : '—'}</td>
                        <td style={{ textAlign: 'right', color: Number(shift.variance) < 0 ? 'var(--alert-orange)' : 'var(--text-main)' }}>
                          {shift.variance ? `KES ${Number(shift.variance).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
