// NVCA Federal Grants Database Application
// Author: Shiloh TD

let grantsData = [];
let filteredGrants = [];
let currentPage = 1;
const itemsPerPage = 20;

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    await loadGrantsData();
    setupEventListeners();
    populateFilters();
    updateTable();
    updateStatistics();
});

// Load grants data
async function loadGrantsData() {
    try {
        const response = await fetch('grants_data.json');
        grantsData = await response.json();
        filteredGrants = [...grantsData];
        console.log(`Loaded ${grantsData.length} grants`);
        updateResultsCount();
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading grants data:', error);
        showError('Failed to load grants data');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search
    document.getElementById('search-btn').addEventListener('click', filterGrants);
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterGrants();
    });
    
    // Filters
    document.getElementById('filter-agency').addEventListener('change', filterGrants);
    document.getElementById('filter-category').addEventListener('change', filterGrants);
    document.getElementById('filter-status').addEventListener('change', filterGrants);
    document.getElementById('filter-funding').addEventListener('change', filterGrants);
    document.getElementById('filter-instrument').addEventListener('change', filterGrants);
    document.getElementById('filter-deadline').addEventListener('change', filterGrants);
    document.getElementById('filter-costshare').addEventListener('change', filterGrants);
    document.getElementById('filter-cfda').addEventListener('input', filterGrants);
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('filter-agency').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-funding').value = '';
        document.getElementById('filter-instrument').value = '';
        document.getElementById('filter-deadline').value = '';
        document.getElementById('filter-costshare').value = '';
        document.getElementById('filter-cfda').value = '';
        filterGrants();
    });
    
    // Export results
    document.getElementById('export-results').addEventListener('click', exportResults);
    
    // Table sorting
    document.querySelectorAll('#grants-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => sortTable(th.dataset.sort));
    });
    
    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('grant-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

// Populate filter dropdowns
function populateFilters() {
    const agencies = [...new Set(grantsData.map(g => g.agency))].sort();
    const categories = [...new Set(grantsData.map(g => g.category))].sort();
    const statuses = [...new Set(grantsData.map(g => g.status))].sort();
    
    populateSelect('filter-agency', agencies);
    populateSelect('filter-category', categories);
    populateSelect('filter-status', statuses);
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    const currentValue = select.value;
    
    // Keep first option (All)
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
    
    select.value = currentValue;
}

// Filter grants
function filterGrants() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const agency = document.getElementById('filter-agency').value;
    const category = document.getElementById('filter-category').value;
    const status = document.getElementById('filter-status').value;
    const fundingRange = document.getElementById('filter-funding').value;
    const instrument = document.getElementById('filter-instrument').value;
    const deadline = document.getElementById('filter-deadline').value;
    const costShare = document.getElementById('filter-costshare').value;
    const cfda = document.getElementById('filter-cfda').value.toLowerCase();
    
    filteredGrants = grantsData.filter(grant => {
        // Search filter
        if (searchTerm && !matchesSearch(grant, searchTerm)) return false;
        
        // Agency filter
        if (agency && grant.agency !== agency) return false;
        
        // Category filter
        if (category && grant.category !== category) return false;
        
        // Status filter
        if (status && grant.status !== status) return false;
        
        // Funding range filter
        if (fundingRange && !matchesFundingRange(grant, fundingRange)) return false;
        
        // Funding instrument filter
        if (instrument && grant.funding_instrument !== instrument) return false;
        
        // Deadline filter
        if (deadline && !matchesDeadline(grant, deadline)) return false;
        
        // Cost sharing filter
        if (costShare === 'yes' && !grant.cost_sharing) return false;
        if (costShare === 'no' && grant.cost_sharing) return false;
        
        // CFDA filter
        if (cfda && (!grant.cfda_number || !grant.cfda_number.toLowerCase().includes(cfda))) return false;
        
        return true;
    });
    
    currentPage = 1;
    updateTable();
    updateResultsCount();
}

function matchesSearch(grant, term) {
    return (grant.title && grant.title.toLowerCase().includes(term)) ||
           (grant.agency && grant.agency.toLowerCase().includes(term)) ||
           (grant.description && grant.description.toLowerCase().includes(term)) ||
           (grant.opportunity_number && grant.opportunity_number.toLowerCase().includes(term));
}

function matchesFundingRange(grant, range) {
    const ceiling = grant.award_ceiling;
    if (!ceiling) return range === 'unspecified';
    
    switch(range) {
        case 'under-100k': return ceiling < 100000;
        case '100k-500k': return ceiling >= 100000 && ceiling < 500000;
        case '500k-1m': return ceiling >= 500000 && ceiling < 1000000;
        case '1m-5m': return ceiling >= 1000000 && ceiling < 5000000;
        case '5m-10m': return ceiling >= 5000000 && ceiling < 10000000;
        case 'over-10m': return ceiling >= 10000000;
        case 'unspecified': return !ceiling;
        default: return true;
    }
}

function matchesDeadline(grant, deadline) {
    if (!grant.close_date) return false;
    
    const closeDate = new Date(grant.close_date);
    const today = new Date();
    const daysDiff = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
    
    switch(deadline) {
        case 'week': return daysDiff <= 7 && daysDiff >= 0;
        case 'month': return daysDiff <= 30 && daysDiff >= 0;
        case 'quarter': return daysDiff <= 90 && daysDiff >= 0;
        case 'halfyear': return daysDiff <= 180 && daysDiff >= 0;
        case 'year': return daysDiff <= 365 && daysDiff >= 0;
        default: return true;
    }
}

// Sort table
let sortColumn = '';
let sortDirection = 'asc';

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    filteredGrants.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // Handle nulls
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';
        
        // Numeric comparison for award_ceiling
        if (column === 'award_ceiling' || column === 'total_funding') {
            valA = valA || 0;
            valB = valB || 0;
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        
        // Date comparison
        if (column === 'close_date' || column === 'posted_date') {
            valA = new Date(valA || '2099-12-31');
            valB = new Date(valB || '2099-12-31');
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        
        // String comparison
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    updateTable();
}

// Update table
function updateTable() {
    const tbody = document.getElementById('grants-tbody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageGrants = filteredGrants.slice(start, end);
    
    tbody.innerHTML = '';
    
    if (pageGrants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No grants found</td></tr>';
        updatePagination();
        return;
    }
    
    const today = new Date();
    
    pageGrants.forEach(grant => {
        const closeDate = grant.close_date ? new Date(grant.close_date) : null;
        const daysUntilClose = closeDate ? Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24)) : null;
        
        let deadlineClass = 'deadline-normal';
        if (daysUntilClose !== null) {
            if (daysUntilClose <= 7) deadlineClass = 'deadline-urgent';
            else if (daysUntilClose <= 30) deadlineClass = 'deadline-soon';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(grant.title)}</td>
            <td>${escapeHtml(grant.agency)}</td>
            <td>${escapeHtml(grant.category)}</td>
            <td>${escapeHtml(grant.funding_instrument || 'Grant')}</td>
            <td>${formatCurrency(grant.award_ceiling)}</td>
            <td class="${deadlineClass}">${formatDate(grant.close_date)}</td>
            <td>
                <a href="#" class="view-btn" onclick="showGrantDetails('${grant.id}'); return false;">View</a>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredGrants.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.onclick = () => {
            currentPage--;
            updateTable();
            window.scrollTo(0, 0);
        };
        pagination.appendChild(prevBtn);
    }
    
    // Page numbers
    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // First page
    if (startPage > 1) {
        addPageButton(1);
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 0.5rem';
            pagination.appendChild(dots);
        }
    }
    
    // Page range
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 0.5rem';
            pagination.appendChild(dots);
        }
        addPageButton(totalPages);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.onclick = () => {
            currentPage++;
            updateTable();
            window.scrollTo(0, 0);
        };
        pagination.appendChild(nextBtn);
    }
    
    function addPageButton(pageNum) {
        const btn = document.createElement('button');
        btn.textContent = pageNum;
        btn.className = pageNum === currentPage ? 'active' : '';
        btn.onclick = () => {
            currentPage = pageNum;
            updateTable();
            window.scrollTo(0, 0);
        };
        pagination.appendChild(btn);
    }
}

// Show grant details
function showGrantDetails(grantId) {
    const grant = grantsData.find(g => g.id === grantId);
    if (!grant) return;
    
    const today = new Date();
    const closeDate = grant.close_date ? new Date(grant.close_date) : null;
    const daysUntilClose = closeDate ? Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24)) : null;
    
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2>${escapeHtml(grant.title)}</h2>
        ${grant.opportunity_number ? `<p style="color: #666;">Opportunity Number: ${escapeHtml(grant.opportunity_number)}</p>` : ''}
        
        <div class="grant-detail-grid">
            <div class="grant-detail-section">
                <h4>Basic Information</h4>
                <strong>Agency:</strong> ${escapeHtml(grant.agency)}<br>
                ${grant.agency_code ? `<strong>Agency Code:</strong> ${escapeHtml(grant.agency_code)}<br>` : ''}
                <strong>Category:</strong> ${escapeHtml(grant.category)}<br>
                <strong>Status:</strong> <span class="status-badge status-${grant.status.toLowerCase()}">${escapeHtml(grant.status)}</span><br>
                <strong>Funding Type:</strong> ${escapeHtml(grant.funding_instrument || 'Grant')}<br>
                ${grant.cfda_number ? `<strong>CFDA Number:</strong> ${escapeHtml(grant.cfda_number)}<br>` : ''}
            </div>
            
            <div class="grant-detail-section">
                <h4>Funding Details</h4>
                <strong>Award Range:</strong> ${formatCurrency(grant.award_floor)} - ${formatCurrency(grant.award_ceiling)}<br>
                ${grant.total_funding ? `<strong>Total Program Funding:</strong> ${formatCurrency(grant.total_funding)}<br>` : ''}
                ${grant.expected_awards ? `<strong>Expected Awards:</strong> ${grant.expected_awards}<br>` : ''}
                <strong>Cost Sharing:</strong> ${grant.cost_sharing ? 'Required' : 'Not Required'}<br>
            </div>
            
            <div class="grant-detail-section">
                <h4>Important Dates</h4>
                <strong>Posted:</strong> ${formatDate(grant.posted_date)}<br>
                <strong>Closes:</strong> <span class="${daysUntilClose && daysUntilClose <= 30 ? 'deadline-urgent' : ''}">${formatDate(grant.close_date)}</span><br>
                ${daysUntilClose !== null ? `<strong>Days Until Close:</strong> ${daysUntilClose} days<br>` : ''}
            </div>
            
            <div class="grant-detail-section">
                <h4>Eligibility</h4>
                ${grant.eligibility ? `<p>${escapeHtml(grant.eligibility)}</p>` : '<p>No specific eligibility information available.</p>'}
                ${grant.eligibility_code ? `<p><strong>Eligibility Code:</strong> ${escapeHtml(grant.eligibility_code)}</p>` : ''}
            </div>
        </div>
        
        <h3>Description</h3>
        <p>${escapeHtml(grant.description || 'No description available')}</p>
        
        ${grant.contact_email ? `
            <h3>Contact Information</h3>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(grant.contact_email)}">${escapeHtml(grant.contact_email)}</a></p>
        ` : ''}
        
        ${grant.url ? `
            <div style="margin-top: 2rem;">
                <a href="${escapeHtml(grant.url)}" target="_blank" class="btn btn-primary">
                    View on Grants.gov →
                </a>
            </div>
        ` : ''}
    `;
    
    document.getElementById('grant-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('grant-modal').style.display = 'none';
}

// Update statistics
function updateStatistics() {
    const stats = {
        total: grantsData.length,
        open: grantsData.filter(g => g.status === 'Open').length,
        agencies: new Set(grantsData.map(g => g.agency)).size,
        totalFunding: grantsData.reduce((sum, g) => {
            if (g.total_funding) return sum + g.total_funding;
            if (g.award_ceiling) return sum + (g.award_ceiling * (g.expected_awards || 1));
            return sum;
        }, 0)
    };
    
    document.getElementById('stat-total').textContent = stats.total.toLocaleString();
    document.getElementById('stat-open').textContent = stats.open.toLocaleString();
    document.getElementById('stat-agencies').textContent = stats.agencies.toLocaleString();
    document.getElementById('stat-funding').textContent = formatCurrency(stats.totalFunding);
}

function updateResultsCount() {
    document.getElementById('results-count').textContent = `Showing ${filteredGrants.length} of ${grantsData.length} grants`;
}

// Export results
function exportResults() {
    if (filteredGrants.length === 0) {
        alert('No grants to export');
        return;
    }
    
    const dataToExport = filteredGrants.map(g => ({
        'Title': g.title,
        'Agency': g.agency,
        'Category': g.category,
        'Funding Type': g.funding_instrument || 'Grant',
        'Min Award': g.award_floor || '',
        'Max Award': g.award_ceiling || '',
        'Total Funding': g.total_funding || '',
        'Close Date': g.close_date || '',
        'Posted Date': g.posted_date || '',
        'CFDA Number': g.cfda_number || '',
        'Opportunity Number': g.opportunity_number || '',
        'Cost Sharing': g.cost_sharing ? 'Yes' : 'No',
        'Expected Awards': g.expected_awards || '',
        'Contact Email': g.contact_email || '',
        'URL': g.url || ''
    }));
    
    // Convert to CSV
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in values
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') ? `"${escaped}"` : escaped;
            }).join(',')
        )
    ].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `grants_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility functions
function formatCurrency(amount) {
    if (!amount && amount !== 0) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return 'Not specified';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch {
        return dateStr;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showError(message) {
    console.error(message);
    // Could add user-facing error display here
}

// Update the last updated timestamp
function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        lastUpdatedElement.textContent = now.toLocaleDateString('en-US', options);
    }
}
