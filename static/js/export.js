/**
 * TRINET (TM) - Export Module
 * Client-side and server-side data export to Excel (.xlsx) and CSV
 */

const TrinetExport = {
  currentFormat: 'xlsx',

  init() {
    // Format toggle buttons in floating toolbar
    document.querySelectorAll('.export-format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFormat = e.target.getAttribute('data-format');
      });
    });

    // Trigger export button
    const triggerBtn = document.getElementById('trigger-export-btn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => this.exportSelected());
    }

    // Header export button (exports current filtered view)
    const headerExportBtn = document.getElementById('header-export-btn');
    if (headerExportBtn) {
      headerExportBtn.addEventListener('click', () => this.exportFiltered());
    }

    // Modal export single button
    const modalExportBtn = document.getElementById('modal-export-single-btn');
    if (modalExportBtn) {
      modalExportBtn.addEventListener('click', () => {
        if (TrinetCompany.currentCompany) {
          this.exportCompanies([TrinetCompany.currentCompany], 'xlsx', `${TrinetCompany.currentCompany.company_name}_Profile.xlsx`);
        }
      });
    }
  },

  updateToolbar(selectedCount) {
    const toolbar = document.getElementById('bulk-export-toolbar');
    const countSpan = document.getElementById('export-selected-count');
    if (toolbar && countSpan) {
      countSpan.textContent = selectedCount;
      if (selectedCount > 0) {
        toolbar.classList.remove('hidden');
      } else {
        toolbar.classList.add('hidden');
      }
    }
  },

  async exportSelected() {
    const selectedIds = Array.from(TrinetResults.selectedCompanyIds);
    if (selectedIds.length === 0) {
      TrinetApp.showToast('Select at least one company to export.', 'info');
      return;
    }

    TrinetApp.showToast(`Exporting ${selectedIds.length} companies...`, 'info');
    await this.serverExport({ selectedCompanyIds: selectedIds }, this.currentFormat, `TRINET_Selected_${selectedIds.length}_Manufacturers.${this.currentFormat}`);
  },

  async exportFiltered() {
    const filters = TrinetFilters.getFilterPayload();
    TrinetApp.showToast('Generating filtered export...', 'info');
    await this.serverExport({ filters }, 'xlsx', `TRINET_Manufacturers_Export.xlsx`);
  },

  async serverExport(payload, format, filename) {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, format })
      });

      if (!response.ok) throw new Error('Export generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      TrinetApp.showToast('Export downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      TrinetApp.showToast('Error generating export. Please try again.', 'error');
    }
  },

  // Client-side quick export via SheetJS
  exportCompanies(companies, format = 'xlsx', filename = 'TRINET_Export.xlsx') {
    if (typeof XLSX === 'undefined') {
      TrinetApp.showToast('Excel library loading...', 'info');
      return;
    }

    const rows = companies.map(c => ({
      "Company Name": c.company_name,
      "Industry": c.industry || '',
      "Sub-Industry": c.sub_industry || '',
      "Email": c.email || '',
      "Phone": c.phone || '',
      "City": c.headquarters_city || '',
      "State": c.headquarters_state || '',
      "Year Established": c.establishment_year || '',
      "Website": c.website || '',
      "Scale": c.company_scale || '',
      "Scale Score": c.scale_score || '',
      "Employees": c.employee_count || '',
      "Facilities": c.facility_count || 1,
      "Exporter": c.is_exporter ? "Yes" : "No",
      "Public Company": c.is_public_company ? "Yes" : "No",
      "Verification Status": c.verification_status || 'UNVERIFIED'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Companies");

    XLSX.writeFile(workbook, filename);
    TrinetApp.showToast('Export complete!', 'success');
  }
};
