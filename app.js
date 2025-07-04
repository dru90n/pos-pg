// ============ 1. Inisialisasi Supabase ===============
const SUPABASE_URL = 'https://qcxwhrkegsdrcohlbqon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeHdocmtlZ3NkcmNvaGxicW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MDg1MjMsImV4cCI6MjA2NzE4NDUyM30.lL2Q1EdLKPYEEfzCQcjXKzT-lxZ_e2Be608lXtatBUY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ 2. Data Terapis Per Kategori ============
const terapisMap = {
  'Paket Standard': ['Ayu', 'Budi', 'Cici'],
  'Paket Lengkap': ['Dedi', 'Ema', 'Fitri']
};

// ============ 3. Fungsi Navigasi Menu ================
function showSection(id) {
  ['new', 'close', 'tarik'].forEach(s => {
    document.getElementById(s).classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
}

// ============ 4. Render Terapis Berdasarkan Kategori ============
function renderTerapis() {
  const kategori = document.getElementById('kategori').value;
  const wrapper = document.getElementById('terapis-wrapper');
  wrapper.innerHTML = '';

  if (terapisMap[kategori]) {
    terapisMap[kategori].forEach(nama => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'terapis';
      checkbox.value = nama;
      const label = document.createElement('label');
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + nama));
      wrapper.appendChild(label);
      wrapper.appendChild(document.createElement('br'));
    });
  }
}

// ============ 5. New Order Submit ============
async function submitNewOrder(e) {
  e.preventDefault();
  const nama = document.getElementById('nama').value;
  const ruang = document.getElementById('ruang').value;
  const kategori = document.getElementById('kategori').value;
  const terapis = Array.from(document.querySelectorAll('input[name="terapis"]:checked')).map(i => i.value);
  const jam_masuk = new Date().toISOString();
  const tanggal = new Date().toISOString().split('T')[0];

  const { error } = await supabase.from('orders').insert({
    nama_customer: nama,
    ruang,
    kategori,
    terapis,
    jam_masuk,
    tanggal,
    status: 'open'
  });

  if (error) {
    alert('Gagal simpan order: ' + error.message);
  } else {
    alert('Order berhasil disimpan!');
    e.target.reset();
    renderTerapis();
  }
}

// ============ 6. Cari Order Terbuka ============
async function cariOrder() {
  const q = document.getElementById('cari').value.toLowerCase();
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'open');

  const hasil = data.filter(row =>
    row.nama_customer.toLowerCase().includes(q) ||
    row.ruang.toLowerCase().includes(q) ||
    (row.terapis || []).some(t => t.toLowerCase().includes(q))
  );

  const list = document.getElementById('hasil-cari');
  list.innerHTML = '';
  hasil.forEach(row => {
    const li = document.createElement('li');
    li.textContent = `${row.nama_customer} (${row.kategori}) di ruang ${row.ruang}`;
    li.onclick = () => closeOrder(row);
    list.appendChild(li);
  });
}

// ============ 7. Close Order ============
async function closeOrder(order) {
  const jam_keluar = new Date();
  const jam_masuk = new Date(order.jam_masuk);
  const selisihMs = jam_keluar - jam_masuk;
  let durasiJam = Math.floor(selisihMs / (1000 * 60 * 30)) / 2;

  const jamTambahan = Math.max(0, durasiJam - 3);
  const tarif = order.kategori === 'Paket Lengkap' ? 350 : 250;
  const hargaVoucher = order.kategori === 'Paket Lengkap' ? 1000 : 750;
  const total = hargaVoucher + Math.floor(jamTambahan) * tarif;

  const metode = prompt(`Durasi: ${durasiJam.toFixed(1)} jam. Total: $${total}\nMasukkan metode pembayaran (Pelunasan / Pending Bill)`);

  if (!metode) return;

  const { error } = await supabase.from('orders').update({
    jam_keluar: jam_keluar.toISOString(),
    durasi: durasiJam,
    total,
    metode_pembayaran: metode,
    status: 'closed'
  }).eq('id', order.id);

  if (error) {
    alert('Gagal close order: ' + error.message);
  } else {
    alert('Order berhasil ditutup!');
    cariOrder();
  }
}

// ============ 8. Tarik & Tampilkan Data ============
async function tarikData() {
  const { data, error } = await supabase.from('orders').select('*');
  const table = document.getElementById('data-table');
  table.innerHTML = '';
  if (error) {
    alert('Gagal tarik data');
    return;
  }

  const header = table.insertRow();
  ['Nama', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Kategori', 'Terapis', 'Ruang', 'Durasi', 'Total', 'Metode', 'Status'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    header.appendChild(th);
  });

  data.forEach(row => {
    const tr = table.insertRow();
    tr.insertCell().textContent = row.nama_customer;
    tr.insertCell().textContent = row.tanggal;
    tr.insertCell().textContent = new Date(row.jam_masuk).toLocaleString();
    tr.insertCell().textContent = row.jam_keluar ? new Date(row.jam_keluar).toLocaleString() : '-';
    tr.insertCell().textContent = row.kategori;
    tr.insertCell().textContent = (row.terapis || []).join(', ');
    tr.insertCell().textContent = row.ruang;
    tr.insertCell().textContent = row.durasi?.toFixed(1) || '-';
    tr.insertCell().textContent = row.total || '-';
    tr.insertCell().textContent = row.metode_pembayaran || '-';
    tr.insertCell().textContent = row.status;
  });
}

// ============ 9. Export XLS ============
function exportXLS() {
  const table = document.getElementById('data-table').outerHTML;
  const blob = new Blob(["\ufeff", table], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders.xls";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============ 10. Jalankan Setelah HTML Siap ============
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('kategori').addEventListener('change', renderTerapis);
});
