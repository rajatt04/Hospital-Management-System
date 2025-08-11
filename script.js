// script.js

const API_BASE = "/patients";

let currentPage = 1;
const perPage = 10;

const patientForm = document.getElementById("patientForm");
const patientIdInput = document.getElementById("patientId");
const nameInput = document.getElementById("name");
const ageInput = document.getElementById("age");
const genderInput = document.getElementById("gender");
const departmentInput = document.getElementById("department");
const phoneInput = document.getElementById("phone");
const notesInput = document.getElementById("notes");

const searchInput = document.getElementById("search");
const filterDept = document.getElementById("filterDept");
const sortBySelect = document.getElementById("sortBy");
const orderSelect = document.getElementById("order");

const patientsCards = document.getElementById("patientsCards");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pagerInfo = document.getElementById("pagerInfo");
const statsBtn = document.getElementById("statsBtn");
const statsCard = document.getElementById("statsCard");
const statsBody = document.getElementById("statsBody");

const refreshBtn = document.getElementById("refreshBtn");
const importCsvBtn = document.getElementById("importCsvBtn");
const importFileInput = document.getElementById("importFile");
const exportBtn = document.getElementById("exportBtn");

function buildQueryParams(params) {
  return Object.entries(params)
    .filter(([_, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function fetchPatients(page = 1) {
  const q = {
    page,
    per_page: perPage,
    search: searchInput.value.trim(),
    department: filterDept.value,
    sort_by: sortBySelect.value,
    order: orderSelect.value,
  };

  const queryString = buildQueryParams(q);
  try {
    const res = await fetch(`${API_BASE}?${queryString}`);
    if (!res.ok) throw new Error(`Error fetching patients: ${res.statusText}`);
    const data = await res.json();

    renderPatients(data.items);
    updatePagination(data.total, data.page, data.per_page);
    statsCard.classList.add("d-none");
  } catch (err) {
    alert(err.message);
  }
}

function renderPatients(patients) {
  patientsCards.innerHTML = "";

  if (!patients.length) {
    patientsCards.innerHTML = `<p class="text-center text-muted">No patients found.</p>`;
    return;
  }

  patients.forEach((patient) => {
    const card = document.createElement("div");
    card.className = "col-md-6 col-lg-4";

    const statusBadgeClass = patient.status === "discharged" ? "bg-success" : "bg-primary";

    const firstLetter = patient.name ? patient.name[0].toUpperCase() : "?";

    card.innerHTML = `
      <div class="card h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-center mb-2">
            <div class="user-pfp">${firstLetter}</div>
            <h5 class="card-title mb-0">${patient.name}</h5>
          </div>
          <p class="mb-1"><strong>Age:</strong> ${patient.age}</p>
          <p class="mb-1"><strong>Gender:</strong> ${patient.gender}</p>
          <p class="mb-1"><strong>Department:</strong> ${patient.department}</p>
          <p class="mb-1"><strong>Phone:</strong> ${patient.phone || "-"}</p>
          <p class="mb-1"><strong>Status:</strong> <span class="badge ${statusBadgeClass}">${patient.status}</span></p>
          <p class="mb-3 text-truncate"><strong>Notes:</strong> ${patient.notes || "-"}</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${patient.id}">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${patient.id}">
              <i class="bi bi-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;

    patientsCards.appendChild(card);
  });

  // Attach listeners to Edit/Delete buttons
  document.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      loadPatient(id);
    })
  );

  document.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this patient?")) {
        deletePatient(id);
      }
    })
  );
}

function updatePagination(total, page, perPage) {
  currentPage = page;
  const totalPages = Math.ceil(total / perPage);

  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= totalPages || totalPages === 0;

  pagerInfo.textContent = `Page ${page} of ${totalPages} (${total} patients)`;
}

async function loadPatient(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error("Failed to load patient");
    const patient = await res.json();

    patientIdInput.value = patient.id;
    nameInput.value = patient.name;
    ageInput.value = patient.age;
    genderInput.value = patient.gender;
    departmentInput.value = patient.department;
    phoneInput.value = patient.phone || "";
    notesInput.value = patient.notes || "";
  } catch (err) {
    alert(err.message);
  }
}

async function deletePatient(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete patient");
    await fetchPatients(currentPage);
  } catch (err) {
    alert(err.message);
  }
}

patientForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = patientIdInput.value.trim();
  const payload = {
    name: nameInput.value.trim(),
    age: parseInt(ageInput.value, 10),
    gender: genderInput.value,
    department: departmentInput.value,
    phone: phoneInput.value.trim(),
    notes: notesInput.value.trim(),
  };

  if (!payload.name || !payload.age || !payload.gender || !payload.department) {
    alert("Please fill all required fields.");
    return;
  }

  try {
    let res;
    if (id) {
      // Update
      res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      // Create
      res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to save patient");
    }

    patientForm.reset();
    patientIdInput.value = "";
    await fetchPatients(currentPage);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("clearBtn").addEventListener("click", () => {
  patientForm.reset();
  patientIdInput.value = "";
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    fetchPatients(currentPage - 1);
  }
});
nextPageBtn.addEventListener("click", () => {
  fetchPatients(currentPage + 1);
});

searchInput.addEventListener("input", () => fetchPatients(1));
filterDept.addEventListener("change", () => fetchPatients(1));
sortBySelect.addEventListener("change", () => fetchPatients(1));
orderSelect.addEventListener("change", () => fetchPatients(1));

refreshBtn.addEventListener("click", () => fetchPatients(currentPage));

statsBtn.addEventListener("click", async () => {
  try {
    // For example stats: count patients by department and status
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Failed to fetch patients for stats");
    const data = await res.json();

    const countsByDept = {};
    const countsByStatus = {};

    data.items.forEach((p) => {
      countsByDept[p.department] = (countsByDept[p.department] || 0) + 1;
      countsByStatus[p.status] = (countsByStatus[p.status] || 0) + 1;
    });

    const deptStats = Object.entries(countsByDept)
      .map(([d, c]) => `<li>${d}: <strong>${c}</strong></li>`)
      .join("");
    const statusStats = Object.entries(countsByStatus)
      .map(([s, c]) => `<li>${s}: <strong>${c}</strong></li>`)
      .join("");

    statsBody.innerHTML = `
      <h6>Patients by Department</h6>
      <ul>${deptStats || "<li>No data</li>"}</ul>
      <h6>Patients by Status</h6>
      <ul>${statusStats || "<li>No data</li>"}</ul>
    `;

    statsCard.classList.toggle("d-none");
  } catch (err) {
    alert(err.message);
  }
});

importCsvBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/import_csv", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to import CSV");
    }
    alert("CSV imported successfully!");
    importFileInput.value = "";
    fetchPatients(currentPage);
  } catch (err) {
    alert(err.message);
  }
});

exportBtn.addEventListener("click", () => {
  // Direct download via link
  const link = document.createElement("a");
  link.href = "/export_csv";
  link.download = "patients.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Initial load
fetchPatients(currentPage);