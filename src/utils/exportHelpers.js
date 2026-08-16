/**
 * Export Utility Helpers for exporting reports to Excel (CSV with UTF-8 BOM) & PDF format.
 */

/**
 * Export array of objects or table data to CSV file formatted for Excel
 * @param {Array<Object>} data - Array of row items
 * @param {string} filename - Output file name without extension
 */
export const exportToExcel = (data, filename = 'Bao_cao_bao_tang_2026') => {
  if (!data || !data.length) {
    alert('Không có dữ liệu để xuất Excel!');
    return;
  }

  // Extract keys for headers
  const headers = Object.keys(data[0]);
  let csvContent = headers.join(',') + '\n';

  data.forEach((row) => {
    const rowValues = headers.map((header) => {
      let val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
      // Escape double quotes & handle commas
      val = val.replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    });
    csvContent += rowValues.join(',') + '\n';
  });

  // UTF-8 BOM for Excel Vietnamese text compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate formatted HTML layout and trigger browser PDF printing
 * @param {string} reportTitle - Title of the report
 * @param {string} contentHtml - HTML element string content to convert to PDF
 */
export const exportToPDF = (reportTitle, contentHtml) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép mở cửa sổ bật lên (popup) để tải/in báo cáo PDF!');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>${reportTitle}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1a1a1a; }
        h1 { color: #5C2C16; border-bottom: 2px solid #C5A059; padding-bottom: 8px; font-size: 22px; }
        .meta { margin-bottom: 20px; font-size: 13px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #F8F5F0; color: #5C2C16; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary-box { background: #FFFDF9; border: 1px solid #C5A059; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div>
        <h1>BẢO TÀNG LỊCH SỬ QUỐC GIA VIỆT NAM</h1>
        <div class="meta">
          <strong>${reportTitle}</strong><br/>
          <span>Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}</span> | 
          <span>Người lập: Quản trị hệ thống</span>
        </div>
        ${contentHtml}
        <div class="footer">
          Báo cáo tự động được xuất từ Hệ thống Quản lý & Tham quan Bảo tàng Trực tuyến
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
