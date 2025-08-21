// Federal Register NOFAs Data Management and Display
// Author: Shiloh TD

class NOFAsManager {
    constructor() {
        this.nofasData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadNOFAsData();
    }
    
    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('nofas-search-btn');
        const searchInput = document.getElementById('nofas-search-input');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.performSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
            searchInput.addEventListener('input', () => this.performSearch());
        }
        
        // Filter functionality
        const filterContainer = document.querySelector('#nofas-tab .filters-grid');
        if (filterContainer) {
            filterContainer.addEventListener('change', () => this.applyFilters());
            filterContainer.addEventListener('input', () => this.applyFilters());
        }
        
        // Clear filters
        const clearBtn = document.getElementById('nofas-clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Export functionality
        const exportBtn = document.getElementById('nofas-export-results');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }
        
        // Table sorting
        document.querySelectorAll('#nofas-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
        });
    }
    
    async loadNOFAsData() {
        try {
            // Try to load NOFAs data from file first
            const response = await fetch('nofas_data.json');
            if (response.ok) {
                this.nofasData = await response.json();
                console.log('Loaded NOFAs data from file');
            } else {
                throw new Error('NOFAs data file not available');
            }
        } catch (error) {
            try {
                // Try to load live NOFAs data
                const response = await fetch('/api/nofas-data');
                if (response.ok) {
                    this.nofasData = await response.json();
                    console.log('Loaded live NOFAs data');
                } else {
                    throw new Error('Live data not available');
                }
            } catch (apiError) {
                console.warn('Loading sample NOFAs data:', apiError.message);
                this.nofasData = this.getSampleNOFAsData();
            }
        }
        
        this.filteredData = [...this.nofasData];
        this.updateStatistics();
        this.populateFilterOptions();
        this.displayData();
    }
    
    getSampleNOFAsData() {
        return [
            {
                id: "fr_sample_cdfi_2025",
                title: "Notice of Funds Availability for Community Development Financial Institutions Program",
                agency: "Department of the Treasury",
                document_number: "2025-01322",
                publication_date: "2025-01-17",
                effective_date: "2025-01-17",
                abstract: "The CDFI Fund invites applications for Financial Assistance (FA) or Technical Assistance (TA) awards under the Community Development Financial Institutions Program for fiscal year 2025. Subject to final appropriations, the CDFI Fund expects to award approximately $320 million through this NOFA.",
                funding_amount: 320000000,
                application_deadline: "Applications due by March 15, 2025",
                eligible_applicants: "Community Development Financial Institutions",
                html_url: "https://www.federalregister.gov/documents/2025/01/17/2025-01322/notice-of-funds-availability",
                contact_email: "cdfihelp@cdfi.treas.gov",
                keywords: ["funding", "community", "development", "financial", "institutions"],
                significant: true,
                docket_id: "CDFI-2025-0001"
            },
            {
                id: "fr_sample_ecap_2025",
                title: "Notice of Funds Availability (NOFA); Emergency Commodity Assistance Program (ECAP)",
                agency: "Department of Agriculture",
                document_number: "2025-04604",
                publication_date: "2025-03-19",
                effective_date: "2025-03-19",
                abstract: "The Farm Service Agency announces funding for ECAP, which will provide economic assistance payments to eligible producers of eligible commodities for the 2024 crop year. This program is authorized by the American Relief Act, 2025.",
                application_deadline: "Applications accepted through August 15, 2025",
                eligible_applicants: "Agricultural producers",
                html_url: "https://www.federalregister.gov/documents/2025/03/19/2025-04604/notice-of-funds-availability-nofa-emergency-commodity-assistance-program-ecap",
                contact_email: "ecap@usda.gov",
                keywords: ["agriculture", "commodity", "assistance", "emergency", "producers"],
                significant: false,
                docket_id: "FSA-2025-0012"
            },
            {
                id: "fr_sample_housing_2025",
                title: "Notice of Funding Availability for Community Development Block Grant Program",
                agency: "Department of Housing and Urban Development",
                document_number: "2025-02150",
                publication_date: "2025-02-01",
                effective_date: "2025-02-01",
                abstract: "HUD announces the availability of funds for the Community Development Block Grant program to support community development activities in eligible communities. This NOFA provides guidance for the fiscal year 2025 funding round.",
                funding_amount: 3500000000,
                application_deadline: "Applications due by April 30, 2025",
                eligible_applicants: "States, cities, counties, and urban counties",
                html_url: "https://www.federalregister.gov/documents/2025/02/01/2025-02150/notice-of-funding-availability",
                contact_email: "cdbg@hud.gov",
                keywords: ["housing", "community", "development", "block", "grant"],
                significant: true,
                docket_id: "HUD-2025-0025"
            },
            {
                id: "fr_sample_energy_2025",
                title: "Notice of Funding Opportunity for Clean Energy Innovation Program",
                agency: "Department of Energy",
                document_number: "2025-03201",
                publication_date: "2025-02-15",
                effective_date: "2025-02-15",
                abstract: "The Department of Energy announces funding opportunities for innovative clean energy technologies and research projects. This program supports the development of renewable energy solutions and energy efficiency improvements.",
                funding_amount: 500000000,
                application_deadline: "Applications due by May 1, 2025",
                eligible_applicants: "Universities, national laboratories, and private companies",
                html_url: "https://www.federalregister.gov/documents/2025/02/15/2025-03201/notice-of-funding-opportunity",
                contact_email: "cleanenergy@doe.gov",
                keywords: ["energy", "clean", "innovation", "renewable", "technology"],
                significant: true,
                docket_id: "DOE-2025-0008"
            },
            {
                id: "fr_sample_health_2025",
                title: "Notice of Funding Availability for Public Health Emergency Preparedness",
                agency: "Department of Health and Human Services",
                document_number: "2025-02800",
                publication_date: "2025-01-30",
                effective_date: "2025-01-30",
                abstract: "CDC announces funding availability for public health emergency preparedness cooperative agreements. These funds will support state and local health departments in preparing for and responding to public health emergencies.",
                funding_amount: 875000000,
                application_deadline: "Applications due by March 30, 2025",
                eligible_applicants: "State and local health departments",
                html_url: "https://www.federalregister.gov/documents/2025/01/30/2025-02800/notice-of-funding-availability",
                contact_email: "preparedness@cdc.gov",
                keywords: ["health", "emergency", "preparedness", "public", "response"],
                significant: true,
                docket_id: "CDC-2025-0003"
            }
        ];
    }
    
    updateStatistics() {
        // Update NOFAs statistics
        const total = this.nofasData.length;
        document.getElementById('nofas-stat-total').textContent = total;
        
        // Calculate recent NOFAs (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recent = this.nofasData.filter(nofa => {
            if (!nofa.publication_date) return false;
            const pubDate = new Date(nofa.publication_date);
            return pubDate >= thirtyDaysAgo;
        }).length;
        document.getElementById('nofas-stat-recent').textContent = recent;
        
        // Count unique agencies
        const agencies = new Set(this.nofasData.map(nofa => nofa.agency).filter(Boolean));
        document.getElementById('nofas-stat-agencies').textContent = agencies.size;
        
        // Calculate total funding
        const totalFunding = this.nofasData.reduce((sum, nofa) => sum + (nofa.funding_amount || 0), 0);
        document.getElementById('nofas-stat-funding').textContent = this.formatCurrency(totalFunding);
    }
    
    populateFilterOptions() {
        // Populate agency options
        const agencies = [...new Set(this.nofasData.map(nofa => nofa.agency).filter(Boolean))].sort();
        const agencySelect = document.getElementById('nofas-filter-agency');
        if (agencySelect) {
            agencySelect.innerHTML = '<option value="">All Agencies</option>';
            agencies.forEach(agency => {
                agencySelect.innerHTML += `<option value="${agency}">${agency}</option>`;
            });
        }
    }
    
    performSearch() {
        const searchInput = document.getElementById('nofas-search-input');
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        this.filteredData = this.nofasData.filter(nofa => {
            return nofa.title?.toLowerCase().includes(searchTerm) ||
                   nofa.agency?.toLowerCase().includes(searchTerm) ||
                   nofa.abstract?.toLowerCase().includes(searchTerm) ||
                   nofa.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
                   nofa.document_number?.toLowerCase().includes(searchTerm);
        });
        
        this.applyFilters();
    }
    
    applyFilters() {
        let data = this.filteredData;
        
        // Agency filter
        const agencyFilter = document.getElementById('nofas-filter-agency').value;
        if (agencyFilter) {
            data = data.filter(nofa => nofa.agency === agencyFilter);
        }
        
        // Date filter
        const dateFilter = document.getElementById('nofas-filter-date').value;
        if (dateFilter) {
            const now = new Date();
            let cutoffDate;
            
            switch (dateFilter) {
                case 'week':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'quarter':
                    cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case 'year':
                    cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
            }
            
            if (cutoffDate) {
                data = data.filter(nofa => {
                    if (!nofa.publication_date) return false;
                    const pubDate = new Date(nofa.publication_date);
                    return pubDate >= cutoffDate;
                });
            }
        }
        
        // Funding amount filter
        const fundingFilter = document.getElementById('nofas-filter-funding').value;
        if (fundingFilter) {
            data = data.filter(nofa => this.matchesFundingRange(nofa.funding_amount, fundingFilter));
        }
        
        // Deadline filter
        const deadlineFilter = document.getElementById('nofas-filter-deadline').value;
        if (deadlineFilter) {
            data = data.filter(nofa => this.matchesDeadlineFilter(nofa.application_deadline, deadlineFilter));
        }
        
        // Significance filter
        const significantFilter = document.getElementById('nofas-filter-significant').value;
        if (significantFilter) {
            const isSignificant = significantFilter === 'true';
            data = data.filter(nofa => nofa.significant === isSignificant);
        }
        
        // Docket ID filter
        const docketFilter = document.getElementById('nofas-filter-docket').value.trim();
        if (docketFilter) {
            data = data.filter(nofa => 
                nofa.docket_id?.toLowerCase().includes(docketFilter.toLowerCase())
            );
        }
        
        this.filteredData = data;
        this.currentPage = 1;
        this.displayData();
        this.updateResultsCount();
    }
    
    matchesFundingRange(amount, range) {
        if (!amount) return range === 'unspecified';
        
        switch (range) {
            case 'under-1m': return amount < 1000000;
            case '1m-10m': return amount >= 1000000 && amount < 10000000;
            case '10m-100m': return amount >= 10000000 && amount < 100000000;
            case 'over-100m': return amount >= 100000000;
            default: return true;
        }
    }
    
    matchesDeadlineFilter(deadline, filter) {
        if (!deadline) return filter !== 'open';
        
        // This is a simplified check - in a real implementation, 
        // you'd parse the deadline text to extract dates
        const deadlineText = deadline.toLowerCase();
        const now = new Date();
        
        switch (filter) {
            case 'open':
                return deadlineText.includes('open') || 
                       deadlineText.includes('accepting') ||
                       deadlineText.includes('due');
            case 'week':
                return deadlineText.includes('7 days') || 
                       deadlineText.includes('week');
            case 'month':
                return deadlineText.includes('30 days') || 
                       deadlineText.includes('month');
            case 'quarter':
                return deadlineText.includes('quarter') ||
                       deadlineText.includes('3 months');
            default:
                return true;
        }
    }
    
    clearFilters() {
        // Clear search input
        const searchInput = document.getElementById('nofas-search-input');
        if (searchInput) searchInput.value = '';
        
        // Clear all filter selects and inputs
        const filterContainer = document.querySelector('#nofas-tab .filters-grid');
        if (filterContainer) {
            filterContainer.querySelectorAll('select').forEach(select => {
                select.selectedIndex = 0;
            });
            filterContainer.querySelectorAll('input').forEach(input => {
                input.value = '';
            });
        }
        
        // Reset filtered data
        this.filteredData = [...this.nofasData];
        this.currentPage = 1;
        this.displayData();
        this.updateResultsCount();
    }
    
    displayData() {
        const tbody = document.getElementById('nofas-tbody');
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        pageData.forEach(nofa => {
            const row = this.createTableRow(nofa);
            tbody.appendChild(row);
        });
        
        this.updatePagination();
        this.updateResultsCount();
    }
    
    createTableRow(nofa) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <div class="grant-title">${nofa.title || 'N/A'}</div>
                <div class="grant-number">${nofa.document_number || ''}</div>
                ${nofa.significant ? '<span class="badge badge-significant">Significant</span>' : ''}
            </td>
            <td>
                <span class="agency-tag">${nofa.agency || 'N/A'}</span>
            </td>
            <td>${this.formatDate(nofa.publication_date)}</td>
            <td>${this.formatCurrency(nofa.funding_amount)}</td>
            <td>
                <div class="deadline-info">
                    ${nofa.application_deadline || 'Not specified'}
                </div>
            </td>
            <td>
                <a href="${nofa.html_url || '#'}" target="_blank" class="document-link">
                    ${nofa.document_number || 'N/A'}
                </a>
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="nofasManager.showDetails('${nofa.id}')">
                    View Details
                </button>
            </td>
        `;
        
        return row;
    }
    
    showDetails(id) {
        const nofa = this.nofasData.find(n => n.id === id);
        if (!nofa) return;
        
        const content = `
            <h2>${nofa.title}</h2>
            <div class="detail-section">
                <h3>Publication Information</h3>
                <p><strong>Agency:</strong> ${nofa.agency}</p>
                <p><strong>Document Number:</strong> ${nofa.document_number}</p>
                <p><strong>Publication Date:</strong> ${this.formatDate(nofa.publication_date)}</p>
                <p><strong>Effective Date:</strong> ${this.formatDate(nofa.effective_date)}</p>
                <p><strong>Significance:</strong> ${nofa.significant ? 'Significant under EO 12866' : 'Standard'}</p>
                ${nofa.docket_id ? `<p><strong>Docket ID:</strong> ${nofa.docket_id}</p>` : ''}
            </div>
            
            <div class="detail-section">
                <h3>Funding Information</h3>
                <p><strong>Funding Amount:</strong> ${this.formatCurrency(nofa.funding_amount)}</p>
                <p><strong>Application Deadline:</strong> ${nofa.application_deadline || 'Not specified'}</p>
                <p><strong>Eligible Applicants:</strong> ${nofa.eligible_applicants || 'Not specified'}</p>
            </div>
            
            <div class="detail-section">
                <h3>Abstract</h3>
                <p>${nofa.abstract || 'No abstract available'}</p>
            </div>
            
            ${nofa.keywords && nofa.keywords.length > 0 ? `
                <div class="detail-section">
                    <h3>Keywords</h3>
                    <p>${nofa.keywords.join(', ')}</p>
                </div>
            ` : ''}
            
            ${nofa.contact_email ? `
                <div class="detail-section">
                    <h3>Contact Information</h3>
                    <p><strong>Email:</strong> <a href="mailto:${nofa.contact_email}">${nofa.contact_email}</a></p>
                </div>
            ` : ''}
            
            <div class="detail-section">
                <h3>Documents</h3>
                ${nofa.html_url ? `<p><a href="${nofa.html_url}" target="_blank" class="btn btn-primary">View on FederalRegister.gov →</a></p>` : ''}
                ${nofa.pdf_url ? `<p><a href="${nofa.pdf_url}" target="_blank" class="btn btn-outline">Download PDF →</a></p>` : ''}
            </div>
        `;
        
        this.showModal(content);
    }
    
    showModal(content) {
        const modal = document.getElementById('grant-modal');
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = content;
        modal.style.display = 'block';
        
        // Close modal handlers
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
    
    updatePagination() {
        const pagination = document.getElementById('nofas-pagination');
        if (!pagination) return;
        
        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const currentPage = this.currentPage;
        
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        if (currentPage > 1) {
            pagination.innerHTML += `
                <button class="btn btn-outline" onclick="nofasManager.changePage(${currentPage - 1})">
                    Previous
                </button>
            `;
        }
        
        // Page numbers
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            const activeClass = i === currentPage ? 'btn-primary' : 'btn-outline';
            pagination.innerHTML += `
                <button class="btn ${activeClass}" onclick="nofasManager.changePage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        if (currentPage < totalPages) {
            pagination.innerHTML += `
                <button class="btn btn-outline" onclick="nofasManager.changePage(${currentPage + 1})">
                    Next
                </button>
            `;
        }
    }
    
    changePage(page) {
        this.currentPage = page;
        this.displayData();
    }
    
    updateResultsCount() {
        const countElement = document.getElementById('nofas-results-count');
        if (countElement) {
            const count = this.filteredData.length;
            countElement.textContent = `Showing ${count} NOFAs`;
        }
    }
    
    sortTable(column) {
        // Implementation for sorting functionality
        this.filteredData.sort((a, b) => {
            let aVal = a[column] || '';
            let bVal = b[column] || '';
            
            // Handle dates
            if (column.includes('date')) {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
            }
            
            // Handle numbers
            if (column === 'funding_amount') {
                aVal = aVal || 0;
                bVal = bVal || 0;
            }
            
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
        });
        
        this.displayData();
    }
    
    exportResults() {
        const data = this.filteredData;
        const filename = `nofas_export_${new Date().toISOString().split('T')[0]}.csv`;
        
        let csv = 'Title,Agency,Publication Date,Funding Amount,Deadline,Document Number,Significant,Docket ID\n';
        
        data.forEach(nofa => {
            csv += [
                nofa.title,
                nofa.agency,
                nofa.publication_date,
                nofa.funding_amount,
                nofa.application_deadline,
                nofa.document_number,
                nofa.significant,
                nofa.docket_id
            ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    formatCurrency(amount) {
        if (!amount) return 'Not specified';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Not specified';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }
}

// Initialize NOFAs manager when the page loads
let nofasManager;

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on a page with NOFAs elements
    if (document.getElementById('nofas-tab')) {
        nofasManager = new NOFAsManager();
        window.nofasManager = nofasManager; // Make globally accessible
    }
});