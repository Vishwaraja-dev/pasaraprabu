import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Store,
  DollarSign,
  Package,
} from 'lucide-react';
import { Product, ShopId, SHOPS, StockStatus } from '../types';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustProductStock,
} from '../lib/dataService';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

const CATEGORIES = ['Clothing', 'Footwear', 'Accessories', 'Electronics', 'Home', 'General'];

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Quick Stock Adjustment Modal
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [stockAdjustType, setStockAdjustType] = useState<'increase' | 'reduce'>('increase');
  const [stockAdjustAmount, setStockAdjustAmount] = useState<number>(5);
  const [stockAdjustReason, setStockAdjustReason] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Clothing',
    purchase_price: 15.0,
    selling_price: 30.0,
    current_stock: 20,
    minimum_stock: 5,
    shop: 'Shop 1' as ShopId,
  });
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      category: 'Clothing',
      purchase_price: 15.0,
      selling_price: 30.0,
      current_stock: 20,
      minimum_stock: 5,
      shop: 'Shop 1',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setCurrentProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      category: p.category,
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      current_stock: p.current_stock,
      minimum_stock: p.minimum_stock,
      shop: p.shop,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = async (isEditing: boolean) => {
    if (!formData.name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!formData.sku.trim()) {
      setFormError('SKU code is required.');
      return;
    }
    if (formData.selling_price < 0 || formData.purchase_price < 0) {
      setFormError('Prices cannot be negative.');
      return;
    }

    try {
      if (isEditing && currentProduct) {
        await updateProduct(currentProduct.id, {
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          category: formData.category,
          purchase_price: Number(formData.purchase_price),
          selling_price: Number(formData.selling_price),
          current_stock: Number(formData.current_stock),
          minimum_stock: Number(formData.minimum_stock),
          shop: formData.shop,
        });
        setIsEditModalOpen(false);
      } else {
        await createProduct({
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          category: formData.category,
          purchase_price: Number(formData.purchase_price),
          selling_price: Number(formData.selling_price),
          current_stock: Number(formData.current_stock),
          minimum_stock: Number(formData.minimum_stock),
          shop: formData.shop,
        });
        setIsAddModalOpen(false);
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product.';
      setFormError(msg);
    }
  };

  const openStockAdjustment = (product: Product, type: 'increase' | 'reduce') => {
    setStockAdjustProduct(product);
    setStockAdjustType(type);
    setStockAdjustAmount(5);
    setStockAdjustReason(type === 'increase' ? 'Manual stock count inward' : 'Damaged / audit correction');
  };

  const handleExecuteStockAdjust = async () => {
    if (!stockAdjustProduct) return;
    const delta = stockAdjustType === 'increase' ? stockAdjustAmount : -stockAdjustAmount;
    await adjustProductStock(stockAdjustProduct.id, delta);
    setStockAdjustProduct(null);
    await loadData();
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    await deleteProduct(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  };

  const getStockStatus = (p: Product): StockStatus => {
    if (p.current_stock <= 0) return 'Out of Stock';
    if (p.current_stock <= p.minimum_stock) return 'Low Stock';
    return 'In Stock';
  };

  // Filtered
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchesShop = selectedShop === 'all' || p.shop === selectedShop;
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

    const status = getStockStatus(p);
    const matchesStock = selectedStockFilter === 'all' || status.toLowerCase() === selectedStockFilter;

    return matchesSearch && matchesShop && matchesCat && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Top filter bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/90 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950"
            />
          </div>

          {/* Shop Filter */}
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="text-xs bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
          >
            <option value="all">All Shops</option>
            {SHOPS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={selectedStockFilter}
            onChange={(e) => setSelectedStockFilter(e.target.value)}
            className="text-xs bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in stock">In Stock</option>
            <option value="low stock">Low Stock</option>
            <option value="out of stock">Out of Stock</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/85 shadow-lg shadow-emerald-950/5 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-emerald-800/60">Loading inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No products in stock"
            description="Add products to your catalog to track inventory across your retail shops."
            actionLabel="Add Product"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-emerald-50/70 border-b border-emerald-100 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Shop</th>
                  <th className="py-3 px-4 text-right">Purchase Price</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-right">Stock Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/60 text-emerald-950">
                {filteredProducts.map((p) => {
                  const status = getStockStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-emerald-950">{p.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-emerald-800">{p.sku}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="bg-emerald-100/70 text-emerald-900 border border-emerald-200/70 px-2 py-0.5 rounded-lg font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.shop} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-medium text-emerald-800/80">
                        ${Number(p.purchase_price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-sm font-extrabold text-emerald-950">
                        ${Number(p.selling_price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-extrabold text-base ${
                            p.current_stock === 0
                              ? 'text-rose-600'
                              : p.current_stock <= p.minimum_stock
                              ? 'text-amber-600'
                              : 'text-emerald-950'
                          }`}
                        >
                          {p.current_stock}
                        </span>
                        <span className="block text-2xs text-emerald-800/60 font-medium">
                          Min: {p.minimum_stock}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openStockAdjustment(p, 'increase')}
                            title="Increase Stock (+)"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100/80 rounded-lg transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openStockAdjustment(p, 'reduce')}
                            title="Reduce Stock (-)"
                            className="p-1.5 text-amber-700 hover:bg-amber-100/80 rounded-lg transition-colors"
                          >
                            <ArrowDownRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            title="Delete Product"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Quick Stock Adjustment Modal */}
      <Modal
        isOpen={!!stockAdjustProduct}
        onClose={() => setStockAdjustProduct(null)}
        title={
          stockAdjustType === 'increase'
            ? `Increase Stock: ${stockAdjustProduct?.name}`
            : `Reduce Stock: ${stockAdjustProduct?.name}`
        }
        subtitle={`Current Stock: ${stockAdjustProduct?.current_stock} units (${stockAdjustProduct?.shop})`}
        maxWidth="sm"
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity to {stockAdjustType === 'increase' ? 'Add' : 'Deduct'} *
            </label>
            <input
              type="number"
              min={1}
              value={stockAdjustAmount}
              onChange={(e) => setStockAdjustAmount(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Reference
            </label>
            <input
              type="text"
              value={stockAdjustReason}
              onChange={(e) => setStockAdjustReason(e.target.value)}
              placeholder="e.g. Audit correction, physical stock count"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
            <span className="text-slate-500">Resulting Stock Level:</span>
            <span className="font-bold text-base text-slate-900">
              {stockAdjustProduct
                ? stockAdjustType === 'increase'
                  ? stockAdjustProduct.current_stock + stockAdjustAmount
                  : Math.max(0, stockAdjustProduct.current_stock - stockAdjustAmount)
                : 0}{' '}
              units
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStockAdjustProduct(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteStockAdjust}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs ${
                stockAdjustType === 'increase'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              Confirm Adjustment
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? 'Edit Product' : 'Add New Product'}
        subtitle="Catalog definition and initial stock level"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveProduct(isEditModalOpen);
          }}
          className="space-y-4 text-sm"
        >
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Classic Oxford Cotton Shirt"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU / Product Code *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SHIRT-OX-001"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min={0}
                value={formData.purchase_price}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_price: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min={0}
                value={formData.selling_price}
                onChange={(e) =>
                  setFormData({ ...formData, selling_price: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.current_stock}
                onChange={(e) =>
                  setFormData({ ...formData, current_stock: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Stock *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.minimum_stock}
                onChange={(e) =>
                  setFormData({ ...formData, minimum_stock: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shop *</label>
              <select
                value={formData.shop}
                onChange={(e) =>
                  setFormData({ ...formData, shop: e.target.value as ShopId })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {SHOPS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-emerald-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 text-sm text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors"
            >
              {isEditModalOpen ? 'Update Product' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This removes it from inventory.`}
        confirmLabel="Delete Product"
      />
    </div>
  );
};
