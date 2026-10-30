import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Upload,
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  Store,
  Calendar,
  Phone,
  UserCheck,
} from 'lucide-react';
import { Employee, ShopId, SHOPS } from '../types';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadDocument,
} from '../lib/dataService';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    contact_number: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    assigned_shop: 'Shop 1' as ShopId,
    address_proof_url: '',
    address_proof_filename: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getEmployees();
    setEmployees(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: '',
      age: 25,
      contact_number: '',
      date_of_joining: new Date().toISOString().split('T')[0],
      assigned_shop: 'Shop 1',
      address_proof_url: '',
      address_proof_filename: '',
    });
    setSelectedFile(null);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setCurrentEmployee(emp);
    setFormData({
      name: emp.name,
      age: emp.age,
      contact_number: emp.contact_number,
      date_of_joining: emp.date_of_joining,
      assigned_shop: emp.assigned_shop,
      address_proof_url: emp.address_proof_url,
      address_proof_filename: emp.address_proof_filename || '',
    });
    setSelectedFile(null);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openViewModal = (emp: Employee) => {
    setCurrentEmployee(emp);
    setIsViewModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFormData((prev) => ({
        ...prev,
        address_proof_filename: file.name,
      }));
    }
  };

  const handleSaveEmployee = async (isEditing: boolean) => {
    if (!formData.name.trim()) {
      setFormError('Employee name is required.');
      return;
    }
    if (!formData.contact_number.trim()) {
      setFormError('Contact number is required.');
      return;
    }
    if (!formData.date_of_joining) {
      setFormError('Date of joining is required.');
      return;
    }
    if (formData.age < 16) {
      setFormError('Age must be at least 16.');
      return;
    }

    try {
      setUploadingFile(true);
      let proofUrl = formData.address_proof_url;
      let proofFilename = formData.address_proof_filename;

      if (selectedFile) {
        const uploadRes = await uploadDocument(selectedFile, 'employee-documents');
        proofUrl = uploadRes.url;
        proofFilename = uploadRes.filename;
      }

      if (isEditing && currentEmployee) {
        await updateEmployee(currentEmployee.id, {
          name: formData.name.trim(),
          age: Number(formData.age),
          contact_number: formData.contact_number.trim(),
          date_of_joining: formData.date_of_joining,
          assigned_shop: formData.assigned_shop,
          address_proof_url: proofUrl,
          address_proof_filename: proofFilename,
        });
        setIsEditModalOpen(false);
      } else {
        await createEmployee({
          name: formData.name.trim(),
          age: Number(formData.age),
          contact_number: formData.contact_number.trim(),
          date_of_joining: formData.date_of_joining,
          assigned_shop: formData.assigned_shop,
          address_proof_url: proofUrl,
          address_proof_filename: proofFilename,
        });
        setIsAddModalOpen(false);
      }

      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save employee.';
      setFormError(msg);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEmployee(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.contact_number.includes(search) ||
      emp.assigned_shop.toLowerCase().includes(search.toLowerCase());
    const matchesShop =
      selectedShopFilter === 'all' || emp.assigned_shop === selectedShopFilter;
    return matchesSearch && matchesShop;
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
            <input
              type="text"
              placeholder="Search by name, phone or shop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white/90 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-emerald-950"
            />
          </div>

          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600 hidden sm:block" />
            <select
              value={selectedShopFilter}
              onChange={(e) => setSelectedShopFilter(e.target.value)}
              className="text-sm bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
            >
              <option value="all">All Shops</option>
              {SHOPS.map((shop) => (
                <option key={shop} value={shop}>
                  {shop}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Employee Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/85 shadow-lg shadow-emerald-950/5 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-emerald-800/60">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description={
              search || selectedShopFilter !== 'all'
                ? 'Try adjusting your search query or shop filter.'
                : 'Get started by registering employees and assigning them to shops.'
            }
            actionLabel="Add First Employee"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-emerald-50/70 border-b border-emerald-100 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Age</th>
                  <th className="py-3 px-4">Contact Number</th>
                  <th className="py-3 px-4">Date of Joining</th>
                  <th className="py-3 px-4">Assigned Shop</th>
                  <th className="py-3 px-4">Address Proof</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/60 text-emerald-950">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-emerald-950 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                        {emp.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span>{emp.name}</span>
                    </td>
                    <td className="py-3.5 px-4">{emp.age} yrs</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-emerald-800">{emp.contact_number}</td>
                    <td className="py-3.5 px-4 text-emerald-800/80">{emp.date_of_joining}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={emp.assigned_shop} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      {emp.address_proof_url ? (
                        <a
                          href={emp.address_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-950 font-medium bg-emerald-50/80 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">
                            {emp.address_proof_filename || 'View Document'}
                          </span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-emerald-800/40 italic">No document</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openViewModal(emp)}
                          title="View Employee Details"
                          className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          title="Edit Employee / Reassign Shop"
                          className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(emp)}
                          title="Delete Employee"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? 'Edit Employee / Reassign Shop' : 'Add New Employee'}
        subtitle="Manage employee profile and assign to a specific physical store"
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEmployee(isEditModalOpen);
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
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age *</label>
              <input
                type="number"
                required
                min={16}
                max={99}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number *
              </label>
              <input
                type="tel"
                required
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Joining *
              </label>
              <input
                type="date"
                required
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Shop *
              </label>
              <select
                value={formData.assigned_shop}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_shop: e.target.value as ShopId })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              >
                {SHOPS.map((shop) => (
                  <option key={shop} value={shop}>
                    {shop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address proof document upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address Proof / ID Document (Upload to Supabase Storage)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="address_proof_input"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
              />
              <label
                htmlFor="address_proof_input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-6 h-6 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-950">
                  {selectedFile
                    ? selectedFile.name
                    : formData.address_proof_filename
                    ? formData.address_proof_filename
                    : 'Click to select document or ID copy'}
                </span>
                <span className="text-2xs text-emerald-800/60 font-medium">
                  PDF, PNG, JPG (Stored permanently in Supabase Storage)
                </span>
              </label>
            </div>
            {formData.address_proof_url && !selectedFile && (
              <p className="text-xs text-emerald-800/70 mt-1.5 flex items-center gap-1 font-medium">
                Current document attached. Upload a new file above to replace it.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-emerald-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 text-sm font-medium text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingFile}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs shadow-emerald-600/20"
            >
              {uploadingFile ? 'Saving...' : isEditModalOpen ? 'Update Employee' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Employee Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Employee Details"
        subtitle={`Staff ID: ${currentEmployee?.id || ''}`}
        maxWidth="md"
      >
        {currentEmployee && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/70">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                {currentEmployee.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-base text-emerald-950">{currentEmployee.name}</h4>
                <p className="text-xs text-emerald-800/70 font-medium">Age: {currentEmployee.age} years old</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
                <span className="text-emerald-800/60 font-medium block mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Contact Number
                </span>
                <span className="font-semibold text-emerald-950 text-sm font-mono">
                  {currentEmployee.contact_number}
                </span>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
                <span className="text-emerald-800/60 font-medium block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Date of Joining
                </span>
                <span className="font-semibold text-emerald-950 text-sm">
                  {currentEmployee.date_of_joining}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 text-xs">
              <span className="text-emerald-800/60 font-medium block mb-1 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-emerald-600" /> Assigned Shop
              </span>
              <StatusBadge status={currentEmployee.assigned_shop} />
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 text-xs">
              <span className="text-emerald-800/60 font-medium block mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" /> Address Proof Document
              </span>
              {currentEmployee.address_proof_url ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-emerald-950 truncate max-w-[200px]">
                      {currentEmployee.address_proof_filename || 'Address_Proof.pdf'}
                    </span>
                    <a
                      href={currentEmployee.address_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-950 font-semibold"
                    >
                      Open Document <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {currentEmployee.address_proof_url.startsWith('data:image') ||
                  currentEmployee.address_proof_url.includes('images.unsplash.com') ? (
                    <img
                      src={currentEmployee.address_proof_url}
                      alt="Address Proof Preview"
                      className="w-full h-36 object-cover rounded-xl border border-emerald-200"
                    />
                  ) : null}
                </div>
              ) : (
                <span className="text-emerald-800/40 italic">No document uploaded yet</span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-emerald-100">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(currentEmployee);
                }}
                className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-xl transition-colors border border-emerald-200"
              >
                Edit / Change Shop
              </button>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-emerald-950 bg-white hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Employee Record"
        message={`Are you sure you want to delete employee "${deleteTarget?.name}"? This action removes their assignment from ${deleteTarget?.assigned_shop}.`}
        confirmLabel="Delete Employee"
        isDestructive={true}
      />
    </div>
  );
};
