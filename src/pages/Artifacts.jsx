import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Plus, Search, Eye, Pencil, Trash2, Filter, LayoutGrid, List, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ArtifactFormModal } from '@/components/artifacts/ArtifactFormModal';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';
import { removeVietnameseTones } from '@/utils/artifactSearch';

export const Artifacts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const { artifacts, categories, deleteArtifact, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedPeriod, setSelectedPeriod] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [artifactToEdit, setArtifactToEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDetailArtifact, setSelectedDetailArtifact] = useState(null);

  // Sync queryParam if present in URL
  useEffect(() => {
    if (queryParam) setSearchTerm(queryParam);
  }, [queryParam]);

  // Sync categoryParam if present in URL (DM01, DM08... or category name)
  useEffect(() => {
    if (categoryParam && categories && categories.length > 0) {
      const cleanParam = categoryParam.trim().toLowerCase();
      const matched = categories.find(
        (c) =>
          (c.id && c.id.toLowerCase() === cleanParam) ||
          (c.name && c.name.toLowerCase() === cleanParam)
      );
      if (matched) {
        setSelectedCategory(matched.name);
        setViewMode('grid');
        setCurrentPage(1);
      }
    }
  }, [categoryParam, categories]);

  // Filtered Artifacts list
  const filteredArtifacts = useMemo(() => {
    const cleanSearch = removeVietnameseTones(searchTerm);

    return artifacts.filter((item) => {
      const nameClean = removeVietnameseTones(item.name || '');
      const catClean = removeVietnameseTones(item.category || '');
      const cultureClean = removeVietnameseTones(item.culture || item.period || '');
      const descClean = removeVietnameseTones(item.description || '');
      const idClean = item.id.toLowerCase();

      const matchSearch =
        !cleanSearch ||
        nameClean.includes(cleanSearch) ||
        catClean.includes(cleanSearch) ||
        cultureClean.includes(cleanSearch) ||
        descClean.includes(cleanSearch) ||
        idClean.includes(cleanSearch);

      const matchCategory =
        selectedCategory === 'Tất cả' || item.category === selectedCategory;
      const matchPeriod =
        selectedPeriod === 'Tất cả' ||
        (item.culture && item.culture.includes(selectedPeriod)) ||
        (item.period && item.period.includes(selectedPeriod));
      const matchStatus =
        selectedStatus === 'Tất cả' || item.status === selectedStatus;

      return matchSearch && matchCategory && matchPeriod && matchStatus;
    });
  }, [artifacts, searchTerm, selectedCategory, selectedPeriod, selectedStatus]);

  // Pagination calculation
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;
  const totalPages = Math.ceil(filteredArtifacts.length / itemsPerPage) || 1;
  const paginatedArtifacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredArtifacts.slice(start, start + itemsPerPage);
  }, [filteredArtifacts, currentPage, itemsPerPage]);

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteArtifact(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleClearCategoryFilter = () => {
    setSelectedCategory('Tất cả');
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('category');
    setSearchParams(newParams);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Tất cả');
    setSelectedPeriod('Tất cả');
    setSelectedStatus('Tất cả');
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    newParams.delete('category');
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto px-4 py-6 font-sans">
      {/* Header Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Khám phá / <span className="text-museum-brown font-bold">Danh mục hiện vật</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight uppercase">
            BỘ SƯU TẬP HIỆN VẬT BẢO TÀNG
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Tra cứu và tìm kiếm thông tin hiện vật lịch sử theo từ khóa và danh mục
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle Button */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-museum-brown shadow-xs'
                  : 'text-gray-500 hover:text-museum-brown'
              }`}
              title="Xem dạng thẻ (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-museum-brown shadow-xs'
                  : 'text-gray-500 hover:text-museum-brown'
              }`}
              title="Xem dạng bảng (Table)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Add Artifact Button */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                setArtifactToEdit(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm hiện vật mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Nhập từ khóa tìm kiếm tên hiện vật, văn hóa, niên đại..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold focus:bg-white"
          />
        </div>

        {/* Category Filter */}
        <div className="lg:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2.5 bg-gray-50 text-xs font-medium text-gray-700 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          >
            <option value="Tất cả">Danh mục: Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Period Filter */}
        <div className="lg:col-span-2">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2.5 bg-gray-50 text-xs font-medium text-gray-700 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          >
            <option value="Tất cả">Thời kỳ: Tất cả</option>
            <option value="Đông Sơn">Thời Đông Sơn</option>
            <option value="Lý">Thời Lý</option>
            <option value="Trần">Thời Trần</option>
            <option value="Lê">Thời Lê</option>
            <option value="Nguyễn">Thời Nguyễn</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        <div className="lg:col-span-2">
          <button
            onClick={resetFilters}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 font-medium px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Hiển thị <strong>{filteredArtifacts.length}</strong> hiện vật
            {searchTerm && <span> cho từ khóa "<strong className="text-museum-brown">{searchTerm}</strong>"</span>}
          </span>
          {categoryParam && selectedCategory !== 'Tất cả' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-museum-ivory border border-museum-cream text-museum-brown text-xs font-semibold shadow-2xs">
              <span>Đang lọc theo danh mục: <strong className="text-museum-brown font-bold">{selectedCategory}</strong></span>
              <button
                onClick={handleClearCategoryFilter}
                className="ml-1 text-museum-gold hover:text-museum-brown-dk underline cursor-pointer font-bold transition-colors"
                title="Xoá bộ lọc danh mục"
              >
                [Xoá bộ lọc]
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Main Content View: Grid or Table */}
      {filteredArtifacts.length === 0 ? (
        /* Empty State: "Không tìm thấy" as required by Requirement 8 */
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-red-50 text-danger rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-museum-brown">Không tìm thấy kết quả nào phù hợp</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            Rất tiếc, không tìm thấy hiện vật nào ứng với từ khóa "<strong>{searchTerm}</strong>" hoặc bộ lọc hiện tại. Vui lòng thử tìm từ khóa khác hoặc đặt lại bộ lọc.
          </p>
          <button
            onClick={resetFilters}
            className="px-6 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            Đặt lại từ khóa & bộ lọc
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID / CARD VIEW (Requirement 8) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedArtifacts.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedDetailArtifact(item)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="aspect-[4/3] relative overflow-hidden bg-museum-cream">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = '/images/trong-dong.jpg';
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-museum-brown/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-sm text-museum-brown group-hover:text-museum-gold transition-colors line-clamp-1">
                    {item.name}
                  </h3>
                  <div className="text-[11px] text-gray-400 font-semibold">
                    {item.culture || item.period} {item.date ? `• ${item.date}` : ''}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-gray-50 flex items-center justify-between mt-2">
                <span className="text-[11px] text-emerald-700 font-semibold">
                  📍 {item.location || 'Khu trưng bày A'}
                </span>
                <span className="text-xs font-bold text-museum-brown group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Chi tiết &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW (Admin friendly) */
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
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
                    onClick={() => setSelectedDetailArtifact(item)}
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
                    <td className="py-3 px-4 text-gray-600">{item.culture || item.period}</td>
                    <td className="py-3 px-4 text-gray-500">{item.location}</td>
                    <td className="py-3 px-4">
                      <Badge>{item.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDetailArtifact(item)}
                          className="p-1.5 text-gray-400 hover:text-museum-brown hover:bg-museum-cream rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {currentUser?.role === 'admin' && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredArtifacts.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredArtifacts.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {/* Detail Modal */}
      <ArtifactDetailModal
        artifact={selectedDetailArtifact}
        isOpen={!!selectedDetailArtifact}
        onClose={() => setSelectedDetailArtifact(null)}
      />

      {/* Artifact Form Modal (Admin Edit/Add) */}
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
