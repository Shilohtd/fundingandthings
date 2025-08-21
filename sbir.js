// SBIR/STTR Data Management and Display
// Author: Shiloh TD

class SBIRManager {
    constructor() {
        this.sbirData = {
            awards: [],
            companies: [],
            solicitations: []
        };
        this.filteredData = {
            awards: [],
            companies: [],
            solicitations: []
        };
        this.currentPage = {
            awards: 1,
            companies: 1,
            solicitations: 1
        };
        this.itemsPerPage = 20;
        this.currentSubTab = 'awards';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSBIRData();
    }
    
    setupEventListeners() {
        // Sub-tab navigation
        document.querySelectorAll('.sub-tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const subtab = e.target.dataset.subtab;
                this.switchSubTab(subtab);
            });
        });
        
        // Search functionality for each sub-tab
        this.setupSearch('awards');
        this.setupSearch('companies');
        this.setupSearch('solicitations');
        
        // Filter functionality
        this.setupFilters('awards');
        this.setupFilters('companies');
        this.setupFilters('solicitations');
        
        // Clear filters
        this.setupClearFilters('awards');
        this.setupClearFilters('companies');
        this.setupClearFilters('solicitations');
        
        // Export functionality
        this.setupExport('awards');
        this.setupExport('companies');
        this.setupExport('solicitations');
    }
    
    setupSearch(type) {
        const searchBtn = document.getElementById(`sbir-${type}-search-btn`);
        const searchInput = document.getElementById(`sbir-${type}-search-input`);
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.performSearch(type));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch(type);
            });
            searchInput.addEventListener('input', () => this.performSearch(type));
        }
    }
    
    setupFilters(type) {
        const filterContainer = document.querySelector(`#${type}-subtab .filters-grid`);
        if (filterContainer) {
            filterContainer.addEventListener('change', () => this.applyFilters(type));
        }
    }
    
    setupClearFilters(type) {
        const clearBtn = document.getElementById(`sbir-${type}-clear-filters`);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters(type));
        }
    }
    
    setupExport(type) {
        const exportBtn = document.getElementById(`sbir-${type}-export-results`);
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults(type));
        }
    }
    
    switchSubTab(subtab) {
        // Update active sub-tab button
        document.querySelectorAll('.sub-tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-subtab="${subtab}"]`).classList.add('active');
        
        // Show corresponding content
        document.querySelectorAll('.sub-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${subtab}-subtab`).classList.add('active');
        
        this.currentSubTab = subtab;
    }
    
    async loadSBIRData() {
        try {
            // Try to load SBIR data from file first
            const response = await fetch('sbir_data.json');
            if (response.ok) {
                this.sbirData = await response.json();
                console.log('Loaded SBIR data from file');
            } else {
                throw new Error('SBIR data file not available');
            }
        } catch (error) {
            try {
                // Try to load live SBIR data
                const response = await fetch('/api/sbir-data');
                if (response.ok) {
                    this.sbirData = await response.json();
                    console.log('Loaded live SBIR data');
                } else {
                    throw new Error('Live data not available');
                }
            } catch (apiError) {
                console.warn('Loading sample SBIR data:', apiError.message);
                this.sbirData = this.getSampleSBIRData();
            }
        }
        
        this.filteredData = {
            awards: [...this.sbirData.awards],
            companies: [...this.sbirData.companies],
            solicitations: [...this.sbirData.solicitations]
        };
        
        this.updateStatistics();
        this.populateFilterOptions();
        this.displayData('awards');
        this.displayData('companies');
        this.displayData('solicitations');
    }
    
    getSampleSBIRData() {
        return {
            awards: [
                {
                    id: "sample_award_1",
                    firm: "TechCorp Innovations",
                    award_title: "Advanced AI for Autonomous Systems",
                    agency: "DOD",
                    phase: "Phase II",
                    award_amount: 1500000,
                    award_year: 2024,
                    company_location: "Austin, TX",
                    company_state: "TX",
                    company_employees: 45,
                    pi_name: "Dr. Sarah Johnson",
                    abstract: "Development of cutting-edge artificial intelligence systems for autonomous military applications, focusing on real-time decision making and adaptive learning algorithms.",
                    keywords: "AI, autonomous systems, machine learning, defense",
                    contract_number: "W911QX-24-C-0123"
                },
                {
                    id: "sample_award_2",
                    firm: "BioMed Solutions LLC",
                    award_title: "Novel Cancer Treatment Platforms",
                    agency: "NIH",
                    phase: "Phase I",
                    award_amount: 750000,
                    award_year: 2024,
                    company_location: "Boston, MA",
                    company_state: "MA",
                    company_employees: 12,
                    pi_name: "Dr. Michael Chen",
                    abstract: "Research and development of innovative cancer treatment methodologies using personalized medicine approaches and advanced biotechnology.",
                    keywords: "cancer, biotechnology, personalized medicine",
                    contract_number: "1R43CA123456-01"
                },
                {
                    id: "sample_award_3",
                    firm: "Quantum Dynamics Inc",
                    award_title: "Quantum Computing for Materials Science",
                    agency: "NSF",
                    phase: "Phase I",
                    award_amount: 500000,
                    award_year: 2024,
                    company_location: "Palo Alto, CA",
                    company_state: "CA",
                    company_employees: 8,
                    pi_name: "Dr. Lisa Wang",
                    abstract: "Exploration of quantum computing applications in materials science, focusing on molecular modeling and simulation of advanced materials.",
                    keywords: "quantum computing, materials science, simulation",
                    contract_number: "NSF-SBIR-2024-001"
                }
            ],
            companies: [
                {
                    id: "company_techcorp",
                    firm_name: "TechCorp Innovations",
                    location: "Austin, TX",
                    state: "TX",
                    employees: 45,
                    total_awards: 3,
                    total_funding: 2500000,
                    first_award_year: 2022,
                    latest_award_year: 2024,
                    agencies: ["DOD", "NASA"],
                    phases: ["Phase I", "Phase II"],
                    contact_name: "Dr. Sarah Johnson",
                    contact_email: "sjohnson@techcorp.com"
                },
                {
                    id: "company_biomed",
                    firm_name: "BioMed Solutions LLC",
                    location: "Boston, MA",
                    state: "MA",
                    employees: 12,
                    total_awards: 2,
                    total_funding: 1250000,
                    first_award_year: 2023,
                    latest_award_year: 2024,
                    agencies: ["NIH"],
                    phases: ["Phase I"],
                    contact_name: "Dr. Michael Chen",
                    contact_email: "mchen@biomedsolut.com"
                },
                {
                    id: "company_quantum",
                    firm_name: "Quantum Dynamics Inc",
                    location: "Palo Alto, CA",
                    state: "CA",
                    employees: 8,
                    total_awards: 1,
                    total_funding: 500000,
                    first_award_year: 2024,
                    latest_award_year: 2024,
                    agencies: ["NSF"],
                    phases: ["Phase I"],
                    contact_name: "Dr. Lisa Wang",
                    contact_email: "lwang@quantumdyn.com"
                }
            ],
            solicitations: [
                {
                    id: "solicitation_dod_2025",
                    title: "DoD SBIR 25.1 - Artificial Intelligence and Machine Learning",
                    agency: "DOD",
                    solicitation_number: "DOD-SBIR-25.1",
                    open_date: "2025-01-15",
                    close_date: "2025-04-15",
                    description: "Seeking innovative AI and ML solutions for defense applications including autonomous systems, cybersecurity, and predictive analytics.",
                    phases_offered: "Phase I, Phase II",
                    status: "Open",
                    solicitation_url: "https://www.sbir.gov/opportunities"
                },
                {
                    id: "solicitation_nih_2025",
                    title: "NIH SBIR - Biomedical Data Science and Informatics",
                    agency: "NIH",
                    solicitation_number: "NIH-SBIR-25.1",
                    open_date: "2025-02-01",
                    close_date: "2025-05-01",
                    description: "Development of computational tools and platforms for biomedical research, including data integration, analysis, and visualization.",
                    phases_offered: "Phase I, Phase II",
                    status: "Open",
                    solicitation_url: "https://www.sbir.gov/opportunities"
                },
                {
                    id: "solicitation_nsf_2025",
                    title: "NSF SBIR - Advanced Manufacturing Technologies",
                    agency: "NSF",
                    solicitation_number: "NSF-SBIR-25.1",
                    open_date: "2025-03-01",
                    close_date: "2025-06-01",
                    description: "Innovation in manufacturing processes, materials, and systems including additive manufacturing, robotics, and smart manufacturing.",
                    phases_offered: "Phase I, Phase II",
                    status: "Upcoming",
                    solicitation_url: "https://www.sbir.gov/opportunities"
                }
            ]
        };
    }
    
    updateStatistics() {
        // Update SBIR statistics
        document.getElementById('sbir-stat-awards').textContent = this.sbirData.awards.length;
        document.getElementById('sbir-stat-companies').textContent = this.sbirData.companies.length;
        
        const openSolicitations = this.sbirData.solicitations.filter(s => s.status === 'Open').length;
        document.getElementById('sbir-stat-solicitations').textContent = openSolicitations;
        
        const totalFunding = this.sbirData.awards.reduce((sum, award) => sum + (award.award_amount || 0), 0);
        document.getElementById('sbir-stat-funding').textContent = this.formatCurrency(totalFunding);
    }
    
    populateFilterOptions() {
        // Populate state options for awards and companies
        const states = [...new Set([
            ...this.sbirData.awards.map(a => a.company_state).filter(Boolean),
            ...this.sbirData.companies.map(c => c.state).filter(Boolean)
        ])].sort();
        
        ['awards', 'companies'].forEach(type => {
            const stateSelect = document.getElementById(`sbir-${type}-filter-state`);
            if (stateSelect) {
                stateSelect.innerHTML = '<option value="">All States</option>';
                states.forEach(state => {
                    stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
                });
            }
        });
    }
    
    performSearch(type) {
        const searchInput = document.getElementById(`sbir-${type}-search-input`);
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        this.filteredData[type] = this.sbirData[type].filter(item => {
            if (type === 'awards') {
                return item.award_title?.toLowerCase().includes(searchTerm) ||
                       item.firm?.toLowerCase().includes(searchTerm) ||
                       item.abstract?.toLowerCase().includes(searchTerm) ||
                       item.keywords?.toLowerCase().includes(searchTerm);
            } else if (type === 'companies') {
                return item.firm_name?.toLowerCase().includes(searchTerm) ||
                       item.location?.toLowerCase().includes(searchTerm);
            } else if (type === 'solicitations') {
                return item.title?.toLowerCase().includes(searchTerm) ||
                       item.description?.toLowerCase().includes(searchTerm);
            }
            return false;
        });
        
        this.applyFilters(type);
    }
    
    applyFilters(type) {
        let data = this.filteredData[type];
        
        if (type === 'awards') {
            const agencyFilter = document.getElementById('sbir-awards-filter-agency').value;
            const phaseFilter = document.getElementById('sbir-awards-filter-phase').value;
            const yearFilter = document.getElementById('sbir-awards-filter-year').value;
            const stateFilter = document.getElementById('sbir-awards-filter-state').value;
            
            if (agencyFilter) data = data.filter(item => item.agency === agencyFilter);
            if (phaseFilter) data = data.filter(item => item.phase === phaseFilter);
            if (yearFilter) data = data.filter(item => item.award_year?.toString() === yearFilter);
            if (stateFilter) data = data.filter(item => item.company_state === stateFilter);
            
        } else if (type === 'companies') {
            const stateFilter = document.getElementById('sbir-companies-filter-state').value;
            const fundingFilter = document.getElementById('sbir-companies-filter-funding').value;
            const awardsFilter = document.getElementById('sbir-companies-filter-awards').value;
            const employeesFilter = document.getElementById('sbir-companies-filter-employees').value;
            
            if (stateFilter) data = data.filter(item => item.state === stateFilter);
            if (fundingFilter) data = data.filter(item => this.matchesFundingRange(item.total_funding, fundingFilter));
            if (awardsFilter) data = data.filter(item => this.matchesAwardsRange(item.total_awards, awardsFilter));
            if (employeesFilter) data = data.filter(item => this.matchesEmployeesRange(item.employees, employeesFilter));
            
        } else if (type === 'solicitations') {
            const agencyFilter = document.getElementById('sbir-solicitations-filter-agency').value;
            const statusFilter = document.getElementById('sbir-solicitations-filter-status').value;
            const phasesFilter = document.getElementById('sbir-solicitations-filter-phases').value;
            
            if (agencyFilter) data = data.filter(item => item.agency === agencyFilter);
            if (statusFilter) data = data.filter(item => item.status === statusFilter);
            if (phasesFilter) data = data.filter(item => item.phases_offered?.includes(phasesFilter));
        }
        
        this.filteredData[type] = data;
        this.currentPage[type] = 1;
        this.displayData(type);
        this.updateResultsCount(type);
    }
    
    matchesFundingRange(amount, range) {
        if (!amount) return range === 'under-500k';
        switch (range) {
            case 'under-500k': return amount < 500000;
            case '500k-1m': return amount >= 500000 && amount < 1000000;
            case '1m-5m': return amount >= 1000000 && amount < 5000000;
            case '5m-10m': return amount >= 5000000 && amount < 10000000;
            case 'over-10m': return amount >= 10000000;
            default: return true;
        }
    }
    
    matchesAwardsRange(count, range) {
        switch (range) {
            case '1': return count === 1;
            case '2-5': return count >= 2 && count <= 5;
            case '6-10': return count >= 6 && count <= 10;
            case 'over-10': return count > 10;
            default: return true;
        }
    }
    
    matchesEmployeesRange(count, range) {
        if (!count) return true;
        switch (range) {
            case 'under-10': return count < 10;
            case '10-50': return count >= 10 && count <= 50;
            case '50-100': return count >= 50 && count <= 100;
            case 'over-100': return count > 100;
            default: return true;
        }
    }
    
    clearFilters(type) {
        // Clear search input
        const searchInput = document.getElementById(`sbir-${type}-search-input`);
        if (searchInput) searchInput.value = '';
        
        // Clear all filter selects
        const filterContainer = document.querySelector(`#${type}-subtab .filters-grid`);
        if (filterContainer) {
            filterContainer.querySelectorAll('select').forEach(select => {
                select.selectedIndex = 0;
            });
        }
        
        // Reset filtered data
        this.filteredData[type] = [...this.sbirData[type]];
        this.currentPage[type] = 1;
        this.displayData(type);
        this.updateResultsCount(type);
    }
    
    displayData(type) {
        const tbody = document.getElementById(`sbir-${type}-tbody`);
        if (!tbody) return;
        
        const startIndex = (this.currentPage[type] - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData[type].slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        pageData.forEach(item => {
            const row = this.createTableRow(type, item);
            tbody.appendChild(row);
        });
        
        this.updatePagination(type);
        this.updateResultsCount(type);
    }
    
    createTableRow(type, item) {
        const row = document.createElement('tr');
        
        if (type === 'awards') {
            row.innerHTML = `
                <td>
                    <div class="grant-title">${item.award_title || 'N/A'}</div>
                    <div class="grant-number">${item.contract_number || ''}</div>
                </td>
                <td>
                    <a href="#" onclick="sbirManager.showCompanyFromName('${(item.firm || '').replace(/'/g, "\\'")}'); return false;" class="company-link">
                        ${item.firm || 'N/A'}
                    </a>
                </td>
                <td>
                    <a href="#" onclick="sbirManager.filterByAgency('awards', '${(item.agency || '').replace(/'/g, "\\'")}'); return false;" class="agency-link">
                        <span class="agency-tag">${item.agency || 'N/A'}</span>
                    </a>
                </td>
                <td><span class="phase-tag phase-${(item.phase || '').replace(' ', '-').toLowerCase()}">${item.phase || 'N/A'}</span></td>
                <td>${this.formatCurrency(item.award_amount)}</td>
                <td>${item.award_year || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="sbirManager.showDetails('${type}', '${item.id}')">
                        View Details
                    </button>
                </td>
            `;
        } else if (type === 'companies') {
            row.innerHTML = `
                <td>
                    <div class="company-name">${item.firm_name || 'N/A'}</div>
                    <div class="company-contact">${item.contact_name || ''}</div>
                </td>
                <td>${item.location || 'N/A'}</td>
                <td>${item.total_awards || 0}</td>
                <td>${this.formatCurrency(item.total_funding)}</td>
                <td>${item.latest_award_year || 'N/A'}</td>
                <td>${item.employees || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="sbirManager.showDetails('${type}', '${item.id}')">
                        View Profile
                    </button>
                </td>
            `;
        } else if (type === 'solicitations') {
            row.innerHTML = `
                <td>
                    <div class="solicitation-title">${item.title || 'N/A'}</div>
                    <div class="solicitation-number">${item.solicitation_number || ''}</div>
                </td>
                <td>
                    <a href="#" onclick="sbirManager.filterByAgency('solicitations', '${(item.agency || '').replace(/'/g, "\\'")}'); return false;" class="agency-link">
                        <span class="agency-tag">${item.agency || 'N/A'}</span>
                    </a>
                </td>
                <td>${item.phases_offered || 'N/A'}</td>
                <td><span class="status-${(item.status || '').toLowerCase()}">${item.status || 'N/A'}</span></td>
                <td>${this.formatDate(item.open_date)}</td>
                <td>${this.formatDate(item.close_date)}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="sbirManager.showDetails('${type}', '${item.id}')">
                        View Details
                    </button>
                </td>
            `;
        }
        
        return row;
    }
    
    showDetails(type, id) {
        const item = this.sbirData[type].find(i => i.id === id);
        if (!item) return;
        
        let content = '';
        
        if (type === 'awards') {
            content = `
                <h2>${item.award_title}</h2>
                <div class="detail-section">
                    <h3>Award Information</h3>
                    <p><strong>Company:</strong> ${item.firm}</p>
                    <p><strong>Agency:</strong> ${item.agency}</p>
                    <p><strong>Phase:</strong> ${item.phase}</p>
                    <p><strong>Amount:</strong> ${this.formatCurrency(item.award_amount)}</p>
                    <p><strong>Year:</strong> ${item.award_year}</p>
                    <p><strong>Contract Number:</strong> ${item.contract_number}</p>
                </div>
                <div class="detail-section">
                    <h3>Company Details</h3>
                    <p><strong>Location:</strong> ${item.company_location}</p>
                    <p><strong>Employees:</strong> ${item.company_employees || 'N/A'}</p>
                    <p><strong>Principal Investigator:</strong> ${item.pi_name}</p>
                </div>
                <div class="detail-section">
                    <h3>Project Abstract</h3>
                    <p>${item.abstract || 'No abstract available'}</p>
                </div>
                <div class="detail-section">
                    <h3>Keywords</h3>
                    <p>${item.keywords || 'No keywords available'}</p>
                </div>
            `;
        } else if (type === 'companies') {
            content = `
                <h2>${item.firm_name}</h2>
                <div class="detail-section">
                    <h3>Company Overview</h3>
                    <p><strong>Location:</strong> ${item.location}</p>
                    <p><strong>Employees:</strong> ${item.employees || 'N/A'}</p>
                    <p><strong>Website:</strong> ${item.url ? `<a href="${item.url}" target="_blank">${item.url}</a>` : 'N/A'}</p>
                </div>
                <div class="detail-section">
                    <h3>SBIR Performance</h3>
                    <p><strong>Total Awards:</strong> ${item.total_awards}</p>
                    <p><strong>Total Funding:</strong> ${this.formatCurrency(item.total_funding)}</p>
                    <p><strong>First Award:</strong> ${item.first_award_year}</p>
                    <p><strong>Latest Award:</strong> ${item.latest_award_year}</p>
                    <p><strong>Agencies:</strong> ${item.agencies?.join(', ') || 'N/A'}</p>
                    <p><strong>Phases:</strong> ${item.phases?.join(', ') || 'N/A'}</p>
                </div>
                <div class="detail-section">
                    <h3>Contact Information</h3>
                    <p><strong>Contact:</strong> ${item.contact_name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${item.contact_email || 'N/A'}</p>
                </div>
                <div class="detail-section">
                    <h3>Actions</h3>
                    <button class="btn btn-primary" onclick="sbirManager.showAwardsForCompany('${item.firm_name.replace(/'/g, "\\'")}'); sbirManager.closeModal();">
                        View All Awards for This Company
                    </button>
                </div>
            `;
        } else if (type === 'solicitations') {
            content = `
                <h2>${item.title}</h2>
                <div class="detail-section">
                    <h3>Solicitation Information</h3>
                    <p><strong>Agency:</strong> ${item.agency}</p>
                    <p><strong>Solicitation Number:</strong> ${item.solicitation_number}</p>
                    <p><strong>Status:</strong> <span class="status-${(item.status || '').toLowerCase()}">${item.status}</span></p>
                    <p><strong>Phases Offered:</strong> ${item.phases_offered}</p>
                </div>
                <div class="detail-section">
                    <h3>Timeline</h3>
                    <p><strong>Open Date:</strong> ${this.formatDate(item.open_date)}</p>
                    <p><strong>Close Date:</strong> ${this.formatDate(item.close_date)}</p>
                </div>
                <div class="detail-section">
                    <h3>Description</h3>
                    <p>${item.description || 'No description available'}</p>
                </div>
                <div class="detail-section">
                    <h3>Apply</h3>
                    <p><a href="${item.solicitation_url || 'https://www.sbir.gov'}" target="_blank" class="btn btn-primary">Visit SBIR.gov to Apply</a></p>
                </div>
            `;
        }
        
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
    
    updatePagination(type) {
        const pagination = document.getElementById(`sbir-${type}-pagination`);
        if (!pagination) return;
        
        const totalItems = this.filteredData[type].length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const currentPage = this.currentPage[type];
        
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        if (currentPage > 1) {
            pagination.innerHTML += `
                <button class="btn btn-outline" onclick="sbirManager.changePage('${type}', ${currentPage - 1})">
                    Previous
                </button>
            `;
        }
        
        // Page numbers
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            const activeClass = i === currentPage ? 'btn-primary' : 'btn-outline';
            pagination.innerHTML += `
                <button class="btn ${activeClass}" onclick="sbirManager.changePage('${type}', ${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        if (currentPage < totalPages) {
            pagination.innerHTML += `
                <button class="btn btn-outline" onclick="sbirManager.changePage('${type}', ${currentPage + 1})">
                    Next
                </button>
            `;
        }
    }
    
    changePage(type, page) {
        this.currentPage[type] = page;
        this.displayData(type);
    }
    
    updateResultsCount(type) {
        const countElement = document.getElementById(`sbir-${type}-results-count`);
        if (countElement) {
            const count = this.filteredData[type].length;
            const typeLabel = type === 'awards' ? 'awards' : 
                             type === 'companies' ? 'companies' : 'solicitations';
            countElement.textContent = `Showing ${count} ${typeLabel}`;
        }
    }
    
    exportResults(type) {
        const data = this.filteredData[type];
        const filename = `sbir_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        
        let csv = '';
        
        if (type === 'awards') {
            csv = 'Award Title,Company,Agency,Phase,Amount,Year,State,PI Name,Contract Number\n';
            data.forEach(item => {
                csv += [
                    item.award_title,
                    item.firm,
                    item.agency,
                    item.phase,
                    item.award_amount,
                    item.award_year,
                    item.company_state,
                    item.pi_name,
                    item.contract_number
                ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
            });
        } else if (type === 'companies') {
            csv = 'Company Name,Location,State,Total Awards,Total Funding,Latest Award Year,Employees,Contact Name\n';
            data.forEach(item => {
                csv += [
                    item.firm_name,
                    item.location,
                    item.state,
                    item.total_awards,
                    item.total_funding,
                    item.latest_award_year,
                    item.employees,
                    item.contact_name
                ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
            });
        } else if (type === 'solicitations') {
            csv = 'Title,Agency,Solicitation Number,Status,Open Date,Close Date,Phases Offered\n';
            data.forEach(item => {
                csv += [
                    item.title,
                    item.agency,
                    item.solicitation_number,
                    item.status,
                    item.open_date,
                    item.close_date,
                    item.phases_offered
                ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
            });
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    formatCurrency(amount) {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
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
    
    // Cross-linking methods
    showCompanyFromName(companyName) {
        const company = this.sbirData.companies.find(c => 
            c.firm_name.toLowerCase() === companyName.toLowerCase()
        );
        
        if (company) {
            this.switchSubTab('companies');
            // Clear current filters
            this.clearFilters('companies');
            // Filter to show only this company
            const searchInput = document.getElementById('sbir-companies-search-input');
            if (searchInput) {
                searchInput.value = companyName;
                this.performSearch('companies');
            }
        } else {
            alert(`Company "${companyName}" not found in the companies database.`);
        }
    }
    
    filterByAgency(currentTab, agencyName) {
        const agencySelect = document.getElementById(`sbir-${currentTab}-filter-agency`);
        if (agencySelect) {
            agencySelect.value = agencyName;
            this.applyFilters(currentTab);
        }
    }
    
    showAwardsForCompany(companyName) {
        this.switchSubTab('awards');
        this.clearFilters('awards');
        const searchInput = document.getElementById('sbir-awards-search-input');
        if (searchInput) {
            searchInput.value = companyName;
            this.performSearch('awards');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('grant-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize SBIR manager when the page loads
let sbirManager;

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on a page with SBIR elements
    if (document.getElementById('sbir-tab')) {
        sbirManager = new SBIRManager();
        window.sbirManager = sbirManager; // Make globally accessible
    }
});