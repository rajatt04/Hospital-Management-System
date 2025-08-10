let patients = [];
let currentPage = 1;
const pageSize = 6;

document.getElementById('patientForm').addEventListener('submit', savePatient);
document.getElementById('clearBtn').addEventListener('click', clearForm);
document.getElementById('refreshBtn').addEventListener('click', () => renderPatients(getPagedPatients()));
document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('filterDept').addEventListener('change', applyFilters);
document.getElementById('sortBy').addEventListener('change', applyFilters);
document.getElementById('order').addEventListener('change', applyFilters);
document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
document.getElementById('nextPage').addEventListener('click', () => changePage(1));
document.getElementById('statsBtn').addEventListener('click', toggleStats);

// CSV Import/Export
document.getElementById('importCsvBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', importCSV);
document.getElementById('exportBtn').addEventListener('click', exportCSV);

function savePatient(e) {
  e.preventDefault();
  const id = document.getElementById('patientId').value;
  const patient = {
    id: id || Date.now().toString(),
    name: document.getElementById('name').value,
    age: parseInt(document.getElementById('age').value),
    gender: document.getElementById('gender').value,
    department: document.getElementById('department').value,
    phone: document.getElementById('phone').value,
    notes: document.getElementById('notes').value,
    admission_date: new Date().toLocaleDateString(),
    status: "Admitted"
  };

  if (id) {
    const index = patients.findIndex(p => p.id === id);
    patients[index] = patient;
  } else {
    patients.push(patient);
  }
  clearForm();
  applyFilters();
}

function clearForm() {
  document.getElementById('patientForm').reset();
  document.getElementById('patientId').value = '';
}

function applyFilters() {
  let filtered = [...patients];
  const search = document.getElementById('search').value.toLowerCase();
  const dept = document.getElementById('filterDept').value;
  const sortBy = document.getElementById('sortBy').value;
  const order = document.getElementById('order').value;

  if (search) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.phone.includes(search));
  }
  if (dept) {
    filtered = filtered.filter(p => p.department === dept);
  }

  filtered.sort((a, b) => {
    if (order === 'asc') return a[sortBy] > b[sortBy] ? 1 : -1;
    return a[sortBy] < b[sortBy] ? 1 : -1;
  });

  currentPage = 1;
  renderPatients(filtered.slice(0, pageSize));
  updatePagerInfo(filtered.length);
}

function getPagedPatients() {
  const start = (currentPage - 1) * pageSize;
  return patients.slice(start, start + pageSize);
}

function changePage(dir) {
  const totalPages = Math.ceil(patients.length / pageSize);
  if ((dir === -1 && currentPage > 1) || (dir === 1 && currentPage < totalPages)) {
    currentPage += dir;
    renderPatients(getPagedPatients());
    updatePagerInfo(patients.length);
  }
}

function updatePagerInfo(total) {
  document.getElementById('pagerInfo').textContent = `Page ${currentPage} of ${Math.ceil(total / pageSize)}`;
}

function renderPatients(list) {
  const container = document.getElementById('patientsCards');
  container.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4';
    card.innerHTML = `
      <div class="card shadow-sm border-0 h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="mb-0">${p.name}</h5>
            <span class="badge bg-${getDeptColor(p.department)} badge-dept">${p.department}</span>
          </div>
          <p class="text-muted mb-1"><i class="bi bi-person"></i> Age: ${p.age} | ${p.gender}</p>
          <p class="text-muted mb-1"><i class="bi bi-telephone"></i> ${p.phone || 'N/A'}</p>
          <p class="mb-2"><i class="bi bi-calendar-event"></i> Admitted: ${p.admission_date}</p>
          <span class="badge ${p.status === 'Admitted' ? 'bg-success' : 'bg-secondary'}">${p.status}</span>
        </div>
        <div class="card-footer bg-light d-flex justify-content-end gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick="editPatient('${p.id}')">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePatient('${p.id}')">
            <i class="bi bi-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function getDeptColor(dept) {
  switch(dept) {
    case 'Cardiology': return 'danger';
    case 'Orthopedics': return 'warning';
    case 'Neurology': return 'info';
    case 'Pediatrics': return 'success';
    case 'General Medicine': return 'primary';
    default: return 'secondary';
  }
}

function editPatient(id) {
  const p = patients.find(pt => pt.id === id);
  document.getElementById('patientId').value = p.id;
  document.getElementById('name').value = p.name;
  document.getElementById('age').value = p.age;
  document.getElementById('gender').value = p.gender;
  document.getElementById('department').value = p.department;
  document.getElementById('phone').value = p.phone;
  document.getElementById('notes').value = p.notes;
}

function deletePatient(id) {
  patients = patients.filter(p => p.id !== id);
  applyFilters();
}

function toggleStats() {
  const statsCard = document.getElementById('statsCard');
  statsCard.classList.toggle('d-none');
  if (!statsCard.classList.contains('d-none')) {
    const stats = {};
    patients.forEach(p => {
      stats[p.department] = (stats[p.department] || 0) + 1;
    });
    let html = '<h6>Department Stats</h6><ul>';
    for (let dept in stats) {
      html += `<li>${dept}: ${stats[dept]} patients</li>`;
    }
    html += '</ul>';
    document.getElementById('statsBody').innerHTML = html;
  }
}

function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const lines = evt.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      const [name, age, gender, department, phone, notes] = line.split(',');
      patients.push({
        id: Date.now().toString() + Math.random(),
        name, age: parseInt(age), gender, department, phone, notes,
        admission_date: new Date().toLocaleDateString(),
        status: "Admitted"
      });
    });
    applyFilters();
  };
  reader.readAsText(file);
}

function exportCSV() {
  const rows = patients.map(p => [p.name, p.age, p.gender, p.department, p.phone, p.notes].join(','));
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'patients.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Demo patients
patients = [
  { id: '1', name: 'John Doe', age: 45, gender: 'Male', department: 'Cardiology', phone: '1234567890', notes: '', admission_date: '10/08/2025', status: 'Admitted' },
  { id: '2', name: 'Jane Smith', age: 32, gender: 'Female', department: 'Neurology', phone: '9876543210', notes: '', admission_date: '09/08/2025', status: 'Admitted' }
];
applyFilters();
