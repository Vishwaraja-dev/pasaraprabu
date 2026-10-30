import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Users,
  Plus,
  Search,
  Phone,
  Clock,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import {
  Branch,
  BranchWithEmployees,
  BranchStatus,
  Employee,
} from '../types';
import {
  getBranchesWithEmployees,
  createBranch,
  updateBranch,
  deleteBranch,
  getEmployees,
} from '../lib/dataService';

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchWithEmployees[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BranchStatus>('All');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [viewingStaffBranch, setViewingStaffBranch] = useState<BranchWithEmployees | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    shop_identifier: 'Shop 1',
    address: '',
    city: '',
    state_zip: '',
    contact_number: '',
    manager_name: '',
    status: 'Active' as BranchStatus,
    opening_hours: '9:00 AM - 9:00 PM (Mon-Sun)',
    notes: '',
    capacity: 10,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [branchData, empData] = await Promise.all([
        getBranchesWithEmployees(),
        getEmployees(),
      ]);
      setBranches(branchData);
      setEmployees(empData);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingBranch(null);
    const nextNum = branches.length + 1;
    setFormData({
      name: `Shop ${nextNum} - New Location`,
      code: `BR-0${nextNum}`,
      shop_identifier: `Shop ${nextNum}`,
      address: '',
      city: '',
      state_zip: '',
      contact_number: '',
      manager_name: '',
      status: 'Active',
      opening_hours: '9:30 AM - 9:00 PM (Mon-Sun)',
      notes: '',
      capacity: 8,
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      shop_identifier: branch.shop_identifier,
      address: branch.address,
      city: branch.city,
      state_zip: branch.state_zip || '',
      contact_number: branch.contact_number,
      manager_name: branch.manager_name || '',
      status: branch.status,
      opening_hours: branch.opening_hours || '9:00 AM - 9:00 PM (Mon-Sun)',
      notes: branch.notes || '',
      capacity: branch.capacity || 10,
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Branch name is required';
    if (!formData.code.trim()) errs.code = 'Branch code is required';
    if (!formData.address.trim()) errs.address = 'Street address is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.contact_number.trim()) errs.contact_number = 'Contact number is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, formData);
      } else {
        await createBranch(formData);
      }
      setIsAddEditModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error saving branch:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBranch(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting branch:', err);
    }
  };

  // Filtered branches
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.manager_name && b.manager_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Aggregate stats
  const totalBranchesCount = branches.length;
  const activeCount = branches.filter((b) => b.status === 'Active').length;
  const totalAssignedStaff = branches.reduce((acc, b) => acc + b.assigned_employees_count, 0);
  const totalCapacity = branches.reduce((acc, b) => acc + (b.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Administration</span>
            <span>/</span>
            <span className="text-emerald-700 font-semibold">Store Branches</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Branch & Location Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage multi-store retail addresses, operational status, and staff headcount allocation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Stores</span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{totalBranchesCount}</span>
            <span className="text-xs text-emerald-700 font-medium">({activeCount} Active)</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Retail hubs registered</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Staff</span>
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{totalAssignedStaff}</span>
            <span className="text-xs text-slate-500 font-medium">of {employees.length} total</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Employees deployed across stores</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Headcount</span>
            <span className="p-1.5 rounded-md bg-purple-50 text-purple-700">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalBranchesCount > 0 ? (totalAssignedStaff / totalBranchesCount).toFixed(1) : 0}
            </span>
            <span className="text-xs text-slate-500">staff / branch</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Workforce distribution balance</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Store Capacity</span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalCapacity > 0 ? Math.round((totalAssignedStaff / totalCapacity) * 100) : 0}%
            </span>
            <span className="text-xs text-slate-500">({totalAssignedStaff}/{totalCapacity})</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Staffing capacity utilized</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by branch name, code, city, manager or street..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['All', 'Active', 'Inactive', 'Under Maintenance'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Branches List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading branch network...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No branches found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {searchQuery
              ? `No branch matched your search "${searchQuery}". Try a different search keyword.`
              : 'You have not added any branches yet. Click below to add your first store location.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBranches.map((branch) => {
            const capacity = branch.capacity || 10;
            const staffCount = branch.assigned_employees_count;
            const percentFilled = Math.min(100, Math.round((staffCount / capacity) * 100));

            return (
              <div
                key={branch.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Branch Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {branch.code}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {branch.shop_identifier}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5 tracking-tight line-clamp-1">
                        {branch.name}
                      </h3>
                    </div>

                    <span
                      className={`text-2xs font-semibold px-2 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                        branch.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : branch.status === 'Under Maintenance'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          branch.status === 'Active'
                            ? 'bg-emerald-500'
                            : branch.status === 'Under Maintenance'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {branch.status}
                    </span>
                  </div>

                  {/* Address Details */}
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-800 font-medium leading-relaxed">{branch.address}</p>
                        <p className="text-slate-500">{branch.city}{branch.state_zip ? `, ${branch.state_zip}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700">{branch.contact_number}</span>
                    </div>

                    {branch.opening_hours && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{branch.opening_hours}</span>
                      </div>
                    )}

                    {branch.manager_name && (
                      <div className="flex items-center gap-2 text-slate-700 pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Manager: <strong className="font-medium text-slate-900">{branch.manager_name}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Staff Headcount Section */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Staff Assigned</span>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {staffCount} <span className="text-slate-400 font-normal">/ {capacity} max</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentFilled >= 90
                            ? 'bg-amber-500'
                            : percentFilled > 0
                            ? 'bg-emerald-600'
                            : 'bg-slate-300'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>

                    {/* Quick preview of assigned staff */}
                    {staffCount > 0 ? (
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {branch.employees.slice(0, 4).map((emp) => (
                            <div
                              key={emp.id}
                              title={`${emp.name} (Assigned: ${emp.assigned_shop})`}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-2xs font-semibold text-slate-700"
                            >
                              {emp.name.charAt(0)}
                            </div>
                          ))}
                          {staffCount > 4 && (
                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-2xs font-medium text-slate-600">
                              +{staffCount - 4}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewingStaffBranch(branch)}
                          className="text-2xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5"
                        >
                          View Roster ({staffCount})
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2.5 flex items-center justify-between text-2xs text-slate-400">
                        <span>No employees assigned</span>
                        <button
                          type="button"
                          onClick={() => setViewingStaffBranch(branch)}
                          className="text-2xs font-semibold text-emerald-700 hover:underline"
                        >
                          Assign Staff
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Branch Card Footer Actions */}
                <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-2xs text-slate-400">
                    Added {new Date(branch.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(branch)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                      title="Edit Branch Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(branch.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete Branch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingBranch ? 'Edit Branch Location' : 'Add New Branch Location'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter branch address, contact details, and operational configurations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBranch} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shop 4 - Airport Retail Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none ${
                      formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-2xs text-rose-500 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-04"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2 text-sm font-mono bg-white border rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none ${
                      formErrors.code ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.code && (
                    <p className="text-2xs text-rose-500 mt-1">{formErrors.code}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shop Identifier Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop 4"
                    value={formData.shop_identifier}
                    onChange={(e) => setFormData({ ...formData, shop_identifier: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                  <p className="text-2xs text-slate-400 mt-1">Used to associate sales, orders, and employees</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as BranchStatus })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  >
                    <option value="Active">Active (Open for Business)</option>
                    <option value="Under Maintenance">Under Maintenance / Renovation</option>
                    <option value="Inactive">Inactive / Temporarily Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 142 Market Street, Commercial Arcade, Ground Floor Unit 12B"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none resize-none ${
                    formErrors.address ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {formErrors.address && (
                  <p className="text-2xs text-rose-500 mt-1">{formErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Downtown Central"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none ${
                      formErrors.city ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.city && (
                    <p className="text-2xs text-rose-500 mt-1">{formErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State & Postal Code / Zip
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NY 10001 or Maharashtra 400001"
                    value={formData.state_zip}
                    onChange={(e) => setFormData({ ...formData, state_zip: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1 (555) 123-4567"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none ${
                      formErrors.contact_number ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.contact_number && (
                    <p className="text-2xs text-rose-500 mt-1">{formErrors.contact_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Store Manager
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marcus Vance"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9:00 AM - 9:30 PM (Mon-Sun)"
                    value={formData.opening_hours}
                    onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Staff Capacity (Max Employees)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Notes & Facilities
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer parking available in basement, main stocking inventory depot."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none resize-none"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors"
                >
                  {editingBranch ? 'Save Branch Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Staff Assigned Modal */}
      {viewingStaffBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {viewingStaffBranch.code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Staff at {viewingStaffBranch.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingStaffBranch.assigned_employees_count} staff member(s) assigned to this store.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingStaffBranch(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {viewingStaffBranch.employees.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium">No employees assigned to this location.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You can assign staff members to &quot;{viewingStaffBranch.shop_identifier}&quot; from the Employees page.
                  </p>
                </div>
              ) : (
                viewingStaffBranch.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{emp.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {emp.assigned_shop}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">{emp.contact_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-900">
                        Age: {emp.age}
                      </span>
                      <div className="text-2xs text-slate-400">Joined {emp.date_of_joining}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Capacity: {viewingStaffBranch.assigned_employees_count} / {viewingStaffBranch.capacity || 10}
              </span>
              <button
                type="button"
                onClick={() => setViewingStaffBranch(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Branch?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Are you sure you want to remove this branch location? Employees and historical sales associated with this store identifier will not be deleted.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                Yes, Delete Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
