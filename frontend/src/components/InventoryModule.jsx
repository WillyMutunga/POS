import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Edit3, ShieldAlert, Archive, Tags, Layers, Save, Check, X, Download } from 'lucide-react';

export default function InventoryModule({ onAddLog }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null means "Create mode"
  
  // Form fields
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCat, setFormCat] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formRetail, setFormRetail] = useState('');
  const [formStock, setFormStock] = useState(0);
  const [formSerialTracked, setFormSerialTracked] = useState(false);
  const [formSerials, setFormSerials] = useState('');

  // Auto-reorder planning states
  const [suppliers, setSuppliers] = useState([]);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderItems, setReorderItems] = useState([]);

  const openReorderModal = async () => {
    try {
      const supRes = await api.getSuppliers();
      setSuppliers(supRes);
      
      // Get all low-stock products (quantity < 10)
      const lowStockProducts = products.filter(p => p.stock_quantity < 10);
      
      const defaultSupplierId = supRes[0]?.id || '';
      const items = lowStockProducts.map(p => ({
        product: p,
        quantity: 20,
        supplierId: defaultSupplierId,
        unit_cost: Number(p.cost_price)
      }));
      setReorderItems(items);
      setIsReorderModalOpen(true);
    } catch (err) {
      alert(`Failed to prepare reorder: ${err.message}`);
    }
  };

  const handleGenerateReorders = async () => {
    if (reorderItems.length === 0) return;
    
    // Group by supplier
    const grouped = {};
    reorderItems.forEach(item => {
      if (!item.supplierId) return;
      if (!grouped[item.supplierId]) {
        grouped[item.supplierId] = [];
      }
      grouped[item.supplierId].push({
        product: item.product.id,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost)
      });
    });
    
    try {
      for (const [supId, itemsList] of Object.entries(grouped)) {
        await api.placePurchaseOrder({
          supplier: Number(supId),
          items: itemsList
        });
      }
      
      alert("Successfully generated Purchase Order drafts for low-stock items.");
      setIsReorderModalOpen(false);
      loadData();
    } catch (err) {
      alert(`Failed to place purchase orders: ${err.message}`);
    }
  };

  const updateReorderItem = (index, field, value) => {
    const updated = [...reorderItems];
    updated[index][field] = value;
    setReorderItems(updated);
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory]);

  const loadData = async () => {
    try {
      const prodRes = await api.getProducts(search, selectedCategory);
      setProducts(prodRes);
      const catRes = await api.getCategories();
      setCategories(catRes);
    } catch (err) {
      console.error(err);
    }
  };

  const openDrawer = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormBarcode(product.barcode);
      setFormName(product.name);
      setFormDesc(product.description || '');
      setFormCat(product.category);
      setFormCost(product.cost_price);
      setFormRetail(product.retail_price);
      setFormStock(product.stock_quantity);
      setFormSerialTracked(product.serial_tracked);
      setFormSerials(product.serial_numbers || '');
    } else {
      setEditingProduct(null);
      setFormBarcode('');
      setFormName('');
      setFormDesc('');
      setFormCat(categories[0]?.id || '');
      setFormCost('');
      setFormRetail('');
      setFormStock(0);
      setFormSerialTracked(false);
      setFormSerials('');
    }
    setIsDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validate serials count if tracked
    let stockVal = Number(formStock);
    let serialList = formSerials.split(',').map(s => s.strip ? s.strip() : s.trim()).filter(Boolean);
    if (formSerialTracked && serialList.length !== stockVal) {
      alert(`The number of serial numbers (${serialList.length}) must match the stock quantity (${stockVal}).`);
      return;
    }

    const payload = {
      barcode: formBarcode,
      name: formName,
      description: formDesc,
      category: Number(formCat),
      cost_price: Number(formCost).toFixed(2),
      retail_price: Number(formRetail).toFixed(2),
      stock_quantity: stockVal,
      serial_tracked: formSerialTracked,
      serial_numbers: formSerials
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        onAddLog('PRODUCT_EDIT', `Updated product ${formName} (Barcode: ${formBarcode})`);
      } else {
        await api.createProduct(payload);
        onAddLog('PRODUCT_CREATE', `Created product ${formName} (Barcode: ${formBarcode})`);
      }
      setIsDrawerOpen(false);
      loadData();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  // Metrics calculations
  const totalStockVal = products.reduce((sum, p) => sum + (Number(p.cost_price) * p.stock_quantity), 0);
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10).length;

  // Filtered and sorted products for display & export
  const displayedProducts = products
    .filter(p => {
      if (stockFilter === 'out_of_stock') return p.stock_quantity <= 0;
      if (stockFilter === 'low_stock') return p.stock_quantity > 0 && p.stock_quantity < 10;
      if (stockFilter === 'needs_attention') return p.stock_quantity < 10;
      if (stockFilter === 'healthy') return p.stock_quantity >= 10;
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === 'stock_asc') return a.stock_quantity - b.stock_quantity;
      if (sortBy === 'stock_desc') return b.stock_quantity - a.stock_quantity;
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  const handleExportCSV = () => {
    const listToExport = displayedProducts.slice().sort((a, b) => a.stock_quantity - b.stock_quantity);
    const headers = [
      'Barcode',
      'Product Name',
      'Category',
      'Stock Quantity',
      'Stock Status',
      'Cost Price (KES)',
      'Retail Price (KES)',
      'Total Cost Valuation (KES)'
    ];

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = listToExport.map(p => {
      const status = p.stock_quantity <= 0 ? 'OUT OF STOCK' : p.stock_quantity < 10 ? 'LOW STOCK' : 'IN STOCK';
      const totalVal = (Number(p.cost_price || 0) * Number(p.stock_quantity || 0)).toFixed(2);
      return [
        escapeCsv(p.barcode),
        escapeCsv(p.name),
        escapeCsv(p.category_name || ''),
        p.stock_quantity,
        status,
        Number(p.cost_price || 0).toFixed(2),
        Number(p.retail_price || 0).toFixed(2),
        totalVal
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `stock_quantities_${stockFilter}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Dashboard Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div 
          className="cyber-card glow-hover"
          style={{ cursor: 'pointer', border: stockFilter === 'all' ? '1px solid var(--accent-cyan)' : undefined }}
          onClick={() => setStockFilter('all')}
          title="Click to show all products"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label className="cyber-label" style={{ cursor: 'pointer' }}>Total Unique SKUs</label>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{products.length}</div>
            </div>
            <Archive size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="cyber-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label className="cyber-label">Total Valuation (Cost)</label>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                KES {totalStockVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <Layers size={28} style={{ color: 'var(--accent-cyan)' }} />
          </div>
        </div>

        <div 
          className="cyber-card glow-hover" 
          style={{ cursor: 'pointer', border: stockFilter === 'low_stock' ? '2px solid var(--alert-orange)' : '1px solid var(--alert-orange-glow)' }}
          onClick={() => {
            setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock');
            setSortBy('stock_asc');
          }}
          title="Click to filter low stock items"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label className="cyber-label" style={{ color: 'var(--alert-orange)', cursor: 'pointer' }}>Low Stock (Click to Filter)</label>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--alert-orange)' }}>{lowStockCount}</div>
              <button
                type="button"
                className="cyber-button"
                style={{ marginTop: '0.35rem', padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  openReorderModal();
                }}
              >
                Auto-Reorder PO
              </button>
            </div>
            <ShieldAlert size={28} style={{ color: 'var(--alert-orange)' }} />
          </div>
        </div>

        <div 
          className="cyber-card glow-hover"
          style={{ cursor: 'pointer', border: stockFilter === 'out_of_stock' ? '2px solid #FF3333' : undefined }}
          onClick={() => {
            setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock');
            setSortBy('stock_asc');
          }}
          title="Click to filter depleted / out-of-stock items"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label className="cyber-label" style={{ cursor: 'pointer' }}>Out of Stock (Click to Filter)</label>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#FF3333' }}>{outOfStockCount}</div>
            </div>
            <ShieldAlert size={28} style={{ color: '#FF3333' }} />
          </div>
        </div>
      </div>

      {/* Filter and Add Button Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
          <input 
            type="text"
            className="cyber-input"
            style={{ maxWidth: '240px' }}
            placeholder="Search catalog by name/code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <select 
            className="cyber-input"
            style={{ maxWidth: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select 
            className="cyber-input"
            style={{ maxWidth: '210px', borderColor: stockFilter !== 'all' ? 'var(--alert-orange)' : undefined }}
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">Stock: All Items ({products.length})</option>
            <option value="needs_attention">Needs Restock &lt; 10 ({outOfStockCount + lowStockCount})</option>
            <option value="out_of_stock">Depleted / Out of Stock ({outOfStockCount})</option>
            <option value="low_stock">Low Stock 1-9 ({lowStockCount})</option>
            <option value="healthy">Healthy Stock 10+ ({products.length - outOfStockCount - lowStockCount})</option>
          </select>

          <select 
            className="cyber-input"
            style={{ maxWidth: '200px' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Sort: Default</option>
            <option value="stock_asc">Sort: Stock (Lowest First)</option>
            <option value="stock_desc">Sort: Stock (Highest First)</option>
            <option value="name_asc">Sort: Name (A - Z)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="cyber-button" 
            onClick={handleExportCSV}
            title="Download current stock list as CSV for Excel"
          >
            <Download size={16} /> Export Stock CSV ({displayedProducts.length})
          </button>

          <button className="cyber-button btn-lime" onClick={() => openDrawer()}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="cyber-table-container" style={{ background: 'var(--bg-dark)' }}>
        <table className="cyber-table cyber-table-mono">
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Product Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Cost Price</th>
              <th style={{ textAlign: 'right' }}>Retail Price</th>
              <th style={{ textAlign: 'center' }}>Stock Qty</th>
              <th style={{ textAlign: 'center' }}>Serial Tracking</th>
              <th style={{ width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedProducts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No products found matching the selected filters.
                </td>
              </tr>
            ) : (
              displayedProducts.map(prod => {
                const isOutOfStock = prod.stock_quantity <= 0;
                const isLowStock = prod.stock_quantity > 0 && prod.stock_quantity < 10;
                
                return (
                  <tr key={prod.id}>
                    <td>{prod.barcode}</td>
                    <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{prod.name}</td>
                    <td style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>{prod.category_name}</td>
                    <td style={{ textAlign: 'right' }}>KES {Number(prod.cost_price).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>KES {Number(prod.retail_price).toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`cyber-badge ${isOutOfStock ? 'badge-orange' : isLowStock ? 'badge-orange' : 'badge-lime'}`}>
                        {prod.stock_quantity} {isOutOfStock ? '(DEPLETED)' : isLowStock ? '(LOW)' : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {prod.serial_tracked ? (
                        <span className="cyber-badge badge-cyan" style={{ fontSize: '0.7rem' }}>TRACKED</span>
                      ) : (
                        <span style={{ color: 'var(--text-dark)', fontSize: '0.75rem' }}>OFF</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="cyber-button"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                        onClick={() => openDrawer(prod)}
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Details / Edit Drawer */}
      <div className={`cyber-drawer-right ${isDrawerOpen ? '' : 'collapsed'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem' }}>
          <h3 className="cyber-title">
            {editingProduct ? 'Modify SKU' : 'New Product Registry'}
          </h3>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="cyber-label">Barcode / SKU Identifier</label>
            <input 
              type="text" 
              className="cyber-input cyber-input-mono" 
              required
              value={formBarcode}
              onChange={(e) => setFormBarcode(e.target.value)}
              disabled={editingProduct}
            />
          </div>

          <div>
            <label className="cyber-label">Product Name</label>
            <input 
              type="text" 
              className="cyber-input" 
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div>
            <label className="cyber-label">Description</label>
            <textarea 
              className="cyber-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="cyber-label">Category</label>
              <select 
                className="cyber-input"
                required
                value={formCat}
                onChange={(e) => setFormCat(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="cyber-label">Stock Quantity</label>
              <input 
                type="number" 
                className="cyber-input cyber-input-mono"
                required
                min="0"
                value={formStock}
                onChange={(e) => setFormStock(Number(e.target.value))}
                disabled={formSerialTracked && editingProduct} // In serial-tracked editing, stock must be modified by serial adding
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="cyber-label">Cost Price (KES)</label>
              <input 
                type="number" 
                step="0.01"
                className="cyber-input cyber-input-mono" 
                required
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
              />
            </div>

            <div>
              <label className="cyber-label">Retail Price (KES)</label>
              <input 
                type="number" 
                step="0.01"
                className="cyber-input cyber-input-mono" 
                required
                value={formRetail}
                onChange={(e) => setFormRetail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ padding: '0.75rem', background: 'var(--bg-darker)', borderRadius: '2px', border: '1px solid var(--border-muted)', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                style={{ transform: 'scale(1.2)' }}
                checked={formSerialTracked}
                onChange={(e) => {
                  setFormSerialTracked(e.target.checked);
                  if (e.target.checked && !editingProduct) setFormStock(0); // If serial tracking active, qty will drive from count of serials
                }}
              />
              <span className="cyber-label" style={{ margin: 0 }}>Enable Unique Serial Number Tracking</span>
            </label>
          </div>

          {formSerialTracked && (
            <div style={{ marginTop: '0.5rem' }}>
              <label className="cyber-label">Active Stock Serial Numbers (Comma Separated)</label>
              <textarea 
                className="cyber-input cyber-input-mono" 
                style={{ minHeight: '100px', fontSize: '0.85rem' }}
                placeholder="e.g. SN-9812A, SN-9812B, SN-9812C"
                value={formSerials}
                onChange={(e) => {
                  setFormSerials(e.target.value);
                  const items = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setFormStock(items.length);
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Note: Total stock count will automatically lock to <strong>{formStock}</strong> to match serials.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="cyber-button btn-lime" 
            style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
          >
            <Save size={16} /> Save Product SKU
          </button>
        </form>
      </div>

      {/* Auto-Reorder PO planner Modal */}
      {isReorderModalOpen && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3 className="cyber-title" style={{ fontSize: '1.25rem' }}>Auto-Reorder Procurement Planner</h3>
              <p className="cyber-subtitle">Review low stock items and group-schedule purchase orders to suppliers.</p>
            </div>

            <div className="cyber-table-container" style={{ background: 'var(--bg-darker)', maxHeight: '350px', overflowY: 'auto' }}>
              <table className="cyber-table cyber-table-mono" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th style={{ textAlign: 'center' }}>In Stock</th>
                    <th style={{ textAlign: 'center' }}>Reorder Qty</th>
                    <th>Supplier Partner</th>
                    <th style={{ textAlign: 'right' }}>Est. Cost (ea)</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No low stock alerts detected. All catalog items have sufficient stock level.
                      </td>
                    </tr>
                  ) : (
                    reorderItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{item.product.name}</td>
                        <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>{item.product.stock_quantity}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="number" 
                            className="cyber-input cyber-input-mono"
                            style={{ width: '70px', padding: '0.1rem 0.3rem', textAlign: 'center' }}
                            value={item.quantity}
                            onChange={(e) => updateReorderItem(idx, 'quantity', Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <select 
                            className="cyber-input"
                            style={{ padding: '0.1rem 0.5rem', height: 'auto' }}
                            value={item.supplierId}
                            onChange={(e) => updateReorderItem(idx, 'supplierId', Number(e.target.value))}
                          >
                            <option value="">-- Assign Supplier --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>KES {Number(item.unit_cost).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-muted)', paddingTop: '1rem' }}>
              <button 
                className="cyber-button btn-orange"
                onClick={() => setIsReorderModalOpen(false)}
              >
                Cancel Planning
              </button>
              <button 
                className="cyber-button btn-lime"
                onClick={handleGenerateReorders}
                disabled={reorderItems.length === 0}
              >
                Generate PO Drafts
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
