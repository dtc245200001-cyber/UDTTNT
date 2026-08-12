import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Plus, Search, Eye, Pencil, Trash2, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ArtifactFormModal } from '@/components/artifacts/ArtifactFormModal';

export const Artifacts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const { artifacts, categories, deleteArtifact } = useApp();

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedPeriod, setSelectedPeriod] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [artifactToEdit, setArtifactToEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Sync queryParam if present
  useEffect(() => {
    if (queryParam) setSearchTerm(queryParam);
  }, [queryParam]);

  // Filtered Artifacts list
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.culture.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        selectedCategory === 'Tất cả' || item.category === selectedCategory;
      const matchPeriod =
        selectedPeriod === 'Tất cả' || item.culture.includes(selectedPeriod) || item.period.includes(selectedPeriod);
      const matchStatus =
        selectedStatus === 'Tất cả' || item.status === selectedStatus;

      return matchSearch && matchCategory && matchPeriod && matchStatus;
    });
  }, [artifacts, searchTerm, selectedCategory, selectedPeriod, selectedStatus]);

  // Pagination calculation
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredArtifacts.length / itemsPerPage) || 1;
  const paginatedArtifacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredArtifacts.slice(start, start + itemsPerPage);
  }, [filteredArtifacts, currentPage]);

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteArtifact(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Hiện vật</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            QUẢN LÝ HIỆN VẬT
          </h2>
        </div>
        <button
          onClick={() => {
            setArtifactToEdit(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>+ Thêm hiện vật</span>
        </button>
      </div>

      {/* Top Toolbar: Search & 3 Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, mã, văn hóa..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-xs text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold focus:bg-white"
          />
        </div>

        {/* Filter 1: Danh mục */}
        <div className="lg:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          >
            <option value="Tất cả">Danh mục: Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 2: Thời kỳ */}
        <div className="lg:col-span-3">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          >
            <option value="Tất cả">Thời kỳ: Tất cả</option>
            <option value="Đông Sơn">Đông Sơn</option>
            <option value="Lý">Thời Lý</option>
            <option value="Trần">Thời Trần</option>
            <option value="Lê">Thời Lê</option>
            <option value="Nguyễn">Thời Nguyễn</option>
          </select>
        </div>

        {/* Filter 3: Trạng thái */}
        <div className="lg:col-span-2">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          >
            <option value="Tất cả">Trạng thái: Tất cả</option>
            <option value="Đang trưng bày">Đang trưng bày</option>
            <option value="Trong kho">Trong kho</option>
            <option value="Bảo trì">Bảo trì</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        {filteredArtifacts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[768px]">
              <thead>
                <tr className="bg-museum-ivory text-museum-brown text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4 w-16">Ảnh</th>
                  <th className="py-3.5 px-4">Tên hiện vật</th>
                  <th className="py-3.5 px-4">Danh mục</th>
                  <th className="py-3.5 px-4">Thời kỳ</th>
                  <th className="py-3.5 px-4">Vị trí</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {paginatedArtifacts.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/artifacts/${item.id}`)}
                    className="hover:bg-museum-cream/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-center font-medium text-gray-400">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-50"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-museum-brown group-hover:text-museum-gold transition-colors">
                      {item.name}
                      <span className="block text-[11px] font-normal text-gray-400">{item.id}</span>
                    </td>
                    <td className="py-3 px-4 font-medium">{item.category}</td>
                    <td className="py-3 px-4 text-gray-600">{item.culture}</td>
                    <td className="py-3 px-4 text-gray-500">{item.location}</td>
                    <td className="py-3 px-4">
                      <Badge>{item.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/artifacts/${item.id}`)}
                          className="p-1.5 text-gray-400 hover:text-museum-brown hover:bg-museum-cream rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setArtifactToEdit(item);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-museum-gold hover:bg-museum-cream rounded-lg transition-colors"
                          title="Sửa hiện vật"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 text-gray-400 hover:text-danger hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa hiện vật"
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

        {/* Pagination */}
        {filteredArtifacts.length > 0 && (
          <div className="px-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredArtifacts.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Artifact Form Modal */}
      <ArtifactFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        artifactToEdit={artifactToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};
