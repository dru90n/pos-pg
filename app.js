// ============ 1. Inisialisasi Supabase ===============
const SUPABASE_URL = 'https://qcxwhrkegsdrcohlbqon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeHdocmtlZ3NkcmNvaGxicW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MDg1MjMsImV4cCI6MjA2NzE4NDUyM30.lL2Q1EdLKPYEEfzCQcjXKzT-lxZ_e2Be608lXtatBUY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ 2. Data Terapis Per Kategori ============
const terapisMap = {
  'Paket Standard': ['Ayu', 'Budi', 'Cici'],
  'Paket Lengkap': ['Dedi', 'Ema', 'Fitri']
};

// ============ 3. Navigasi Menu ============
function showSection(id) {
  ['new', 'close', 'tarik'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add('hidden');
  });
  const show = document.getElementById(id);
  if (show) show.classList.remove('hidden');
}

// ============ 4. Tambah Layanan Dinamis ============
function tambahLayanan() {
  const wrapper = document.getElementById('layanan-wrapper');
  if (!wrapper) return;

  const container = document.createElement('div');
  container.className = 'layanan-item';

  const select = document.createElement('select');
  select.name = 'kategori';
  select.required = true;

  const optDefault = document.createElement('option');
  optDefault.disabled = true;
  optDefault.selected = true;
  optDefault.textContent = '-- Pilih Kategori --';
  select.appendChild(optDefault);

  for (const kategori in terapisMap) {
    const opt = document.createElement('option');
    opt.value = kategori;
    opt.textContent = kategori;
    select.appendChild(opt);
  }

  const terapisBox = document.createElement('div');
  terapisBox.className = 'terapis-box';

  select.addEventListener('change', () => {
    const kategori = select.value;
    terapisBox.innerHTML = '';
    terapisMap[kategori].forEach(nama => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'terapis';
      checkbox.value = nama;
      const label = document.createElement('label');
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + nama));
      terapisBox.appendChild(label);
      terapisBox.appendChild(document.createElement('br'));
    });
  });

  container.appendChild(select);
  container.appendChild(terapisBox);
  wrapper.appendChild(container);
}

// ============ 5. Submit New Order ============
document.getElementById('new-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nama = document.getElementById('nama').value;
  const ruang = document.getElementById('ruang').value;
  const tanggal = new Date().toISOString().split('T')[0];
  const jam_masuk = new Date().toISOString();

  const layanan = [];
  const layananItems = document.querySelectorAll('.layanan-item');
  layananItems.forEach(item => {
    const kategori = item.querySelector('select[name="kategori"]').value;
    const terapis = Array.from(item.querySelectorAll('input[name="terapis"]:checked')).map(cb => cb.value);
    if (kategori && terapis.length > 0) {
      layanan.push({ kategori, terapis });
    }
  });

  if (layanan.length === 0) {
    alert('Minimal 1 layanan harus dipilih.');
    return;
  }

  const { error } = await supabase.from('orders').insert({
    nama_customer: nama,
    ruang,
    layanan,
    jam_masuk,
    tanggal,
    status: 'open'
  });

  if (error) {
    alert('Gagal menyimpan order: ' + error.message);
  } else {
    alert('Order berhasil disimpan!');
    document.getElementById('new-form').reset();
    document.getElementById('layanan-wrapper').innerHTML = '';
    tambahLayanan();
  }
});

// ============ 6. Cari Order ============
async function cariOrder() {
  const q = document.getElementById('cari').value.toLowerCase();
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'open');
  if (error) return alert('Gagal tarik data');

  const hasil = data.filter(row => {
    const matchNama = row.nama_customer.toLowerCase().includes(q);
    const matchRuang = row.ruang.toLowerCase().includes(q);
    const matchTerapis = (row.layanan || []).some(l => (l.terapis || []).some(t => t.toLowerCase().includes(q)));
    return matchNama || matchRuang || matchTerapis;
  });

  const list = document.getElementById('hasil-cari');
  list.innerHTML = '';
  hasil.forEach(row => {
    const li = document.createElement('li');
    li.textContent = `${row.nama_customer} (${row.ruang}) - ${row.layanan.map(l => l.kategori).join(', ')}`;
    li.onclick = () => closeOrder(row);
    list.appendChild(li);
  });
}

// ============ 7. Close Order ============
async function closeOrder(order) {
  const jam_keluar = new Date();
  const jam_masuk = new Date(order.jam_masuk);
  const durasiJam = Math.floor((jam_keluar - jam_masuk) / (1000 * 60 * 30)) / 2;

  let total = 0;
  (order.layanan || []).forEach(l => {
    const tarifPerJam = l.kategori === 'Paket Lengkap' ? 350 : 250;
    const hargaAwal = l.kategori === 'Paket Lengkap' ? 1000 : 750;
    const jamTambahan = Math.max(0, durasiJam - 3);
    total += hargaAwal + Math.floor(jamTambahan) * tarifPerJam;
  });

  const metode = prompt(`Durasi: ${durasiJam.toFixed(1)} jam. Total: $${total}\nMasukkan metode pembayaran (Pelunasan / Pending Bill)`);
  if (!metode) return;

  const { error } = await supabase.from('orders').update({
    jam_keluar,
    durasi: durasiJam,
    total,
    metode_pembayaran: metode,
    status: 'closed'
  }).eq('id', order.id);

  if (error) {
    alert('Gagal close order: ' + error.message);
  } else {
    alert('Order ditutup!');
    cariOrder();
  }
}

// ============ 8. Tarik Data ============
async function tarikData() {
  const { data, error } = await supabase.from('orders').select('*');
  const table = document.getElementById('data-table');
  table.innerHTML = '';
  if (error) return alert('Gagal tarik data');

  const header = table.insertRow();
  ['Nama', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Ruang', 'Layanan', 'Durasi', 'Total', 'Metode', 'Status'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    header.appendChild(th);
  });

  data.forEach(row => {
    const tr = table.insertRow();
    tr.insertCell().textContent = row.nama_customer;
    tr.insertCell().textContent = row.tanggal;
    tr.insertCell().textContent = row.jam_masuk;
    tr.insertCell().textContent = row.jam_keluar || '-';
    tr.insertCell().textContent = row.ruang;
    tr.insertCell().textContent = (row.layanan || []).map(l => `${l.kategori} [${(l.terapis || []).join(', ')}]`).join(' | ');
    tr.insertCell().textContent = row.durasi || '-';
    tr.insertCell().textContent = row.total || '-';
    tr.insertCell().textContent = row.metode_pembayaran || '-';
    tr.insertCell().textContent = row.status;
  });
}

// ============ 9. Export ke Excel ============
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

// ============ 10. Inisialisasi Awal ============
document.addEventListener('DOMContentLoaded', () => {
  tambahLayanan();
});
