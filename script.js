"use strict";

/* ==================================
   DATA & INIT
================================== */
let allRecords = JSON.parse(localStorage.getItem("overtimeRecords")) || [];
let currentMonth = "";
let currentView = "month";

document.addEventListener("DOMContentLoaded", () => {
    renderMonthView();

    document.getElementById("processTextBtn").onclick = processTextData;
    document.getElementById("clearAllBtn").onclick = clearData;
    document.getElementById("backBtn").onclick = goBack;
    document.getElementById("manualForm").onsubmit = addManualData;

    // Jika impor file dipakai
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        fileInput.addEventListener("change", handleFileImport);
    }
});

/* ==================================
   NAVIGASI ANTAR VIEW
================================== */
function goBack() {
    if (currentView === "detail") renderEmployeeView(currentMonth);
    else renderMonthView();
}

function toggleVisibility(id) {
    const views = ["monthView", "employeeView", "detailView"];
    views.forEach(v => document.getElementById(v)?.classList.add("hidden"));
    document.getElementById(id)?.classList.remove("hidden");

    const backBtn = document.getElementById("backBtn");
    if (!backBtn) return;

    if (id === "monthView") {
        backBtn.classList.add("hidden");
        currentView = "month";
    } else {
        backBtn.classList.remove("hidden");
        currentView = (id === "employeeView") ? "employee" : "detail";
    }
}

/* ==================================
   FORMAT WAKTU
================================== */
function formatMinutes(min) {
    if (!min || min <= 0) return "-";
    if (min < 60) return `${min} menit`;
    if (min === 60) return `1 jam`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

/* ==================================
   RENDER VIEW
================================== */
function renderMonthView() {
    toggleVisibility("monthView");
    const container = document.getElementById("monthView");
    document.getElementById("viewTitle").innerText = "📊 Pilih Bulan";
    container.innerHTML = "";

    const months = [...new Set(allRecords.map(r => r.date.substring(0, 7)))].sort().reverse();

    if (!months.length) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">Belum ada data.</div>`;
        return;
    }

    months.forEach(m => {
        const btn = document.createElement("button");
        btn.className =
        "p-6 bg-white rounded-2xl shadow border border-gray-100 hover:border-purple-500 text-left transition hover:shadow-lg";
        btn.innerHTML = `<b class='text-purple-600 text-lg'>${m}</b><br><span class='text-xs text-gray-400'>Klik rekap karyawan</span>`;
        btn.onclick = () => { currentMonth = m; renderEmployeeView(m); };
        container.appendChild(btn);
    });
}

function renderEmployeeView(month) {
    toggleVisibility("employeeView");
    const container = document.getElementById("employeeView");
    document.getElementById("viewTitle").innerText = `👤 Karyawan - ${month}`;
    container.innerHTML = "";

    const dataBulan = allRecords.filter(r => r.date.startsWith(month));
    const names = [...new Set(dataBulan.map(r => r.name))].sort();

    names.forEach(name => {
        const records = dataBulan.filter(r => r.name === name);
        let totalMinutes = 0;
        records.forEach(r => totalMinutes += calculateOvertime(r.date, r.clockIn, r.clockOut).netMinutes);

        const btn = document.createElement("button");
        btn.className =
        "w-full p-5 bg-white rounded-2xl shadow-sm mb-3 flex justify-between items-center border-l-4 border-purple-500 hover:bg-purple-50 transition";
        btn.innerHTML = `
            <div class="text-left">
                <b class="text-gray-800 text-lg">${name}</b>
                <p class="text-xs text-gray-400 font-bold">${records.length} HARI TERDATA</p>
            </div>
            <div class="text-right flex flex-col items-end">
                <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-black mb-1">
                    ${formatMinutes(totalMinutes)}
                </span>
                <span class="text-purple-300 text-[10px] font-bold uppercase tracking-wider">Detail →</span>
            </div>`;
        btn.onclick = () => renderDetailView(month, name);
        container.appendChild(btn);
    });
}

function renderDetailView(month, name) {
    toggleVisibility("detailView");
    document.getElementById("viewTitle").innerText = `📄 Rekap: ${name}`;

    const tbody = document.getElementById("detailTableBody");
    tbody.innerHTML = "";

    const userRecords = allRecords.filter(
        r => r.name.toLowerCase() === name.toLowerCase() && r.date.startsWith(month)
    );

    const [year, m] = month.split("-").map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    const dayNames = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

    let totalMinutes = 0;

    for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${month}-${String(d).padStart(2,"0")}`;
        const idx = new Date(dateStr).getDay();
        if (idx === 0) continue;

        const record = userRecords.find(r => r.date === dateStr);
        const dayName = dayNames[idx];

        if (record) {
            const calc = calculateOvertime(record.date, record.clockIn, record.clockOut);
            totalMinutes += calc.netMinutes;

            tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4 text-sm font-medium">${record.date}</td>
                <td class="p-4 text-xs font-bold text-center">${dayName}</td>
                <td class="p-4 font-mono text-center">${record.clockIn}</td>
                <td class="p-4 font-mono text-center">${record.clockOut || ""}</td>
                <td class="p-4 text-center text-orange-600 font-bold text-xs">${formatMinutes(calc.sisaWaktuKerja)}</td>
                <td class="p-4 text-xs font-bold ${calc.color} text-center">${calc.detail}</td>
                <td class="p-4 font-black text-purple-700 text-center text-lg">${calc.display}</td>
            </tr>`;
        } else {
            tbody.innerHTML += `
            <tr class="border-b bg-red-50">
                <td class="p-4 font-medium text-red-600">${dateStr}</td>
                <td class="p-4 text-xs font-bold text-red-400 text-center">${dayName}</td>
                <td colspan="3" class="p-4 text-center text-red-500 font-bold italic text-xs">
                    ⚠️ TIDAK ADA DATA SCAN (ALPA)
                </td>
                <td class="p-4 text-center text-red-500 font-bold text-xs">-</td>
                <td class="p-4 font-black text-red-600 text-center text-lg">0</td>
            </tr>`;
        }
    }

    // tombol cetak
    const btn = document.getElementById("printBtn") || document.createElement("button");
    btn.id = "printBtn";
    btn.className = "bg-green-600 text-white px-4 py-2 rounded-xl font-bold my-3";
    btn.innerText = "🖨️ Cetak PDF";
    btn.onclick = () => printEmployeePDF(name, month, totalMinutes);

    document.getElementById("detailView").prepend(btn);
}

/* ==================================
   LOGIKA LEMBUR
================================== */
function calculateOvertime(date, clockIn, clockOut) {
    const d = new Date(date);
    const day = d.getDay();
    const toM = t => { const [h,m]=t.split(":").map(Number); return h*60+m; };

    const inM = clockIn ? toM(clockIn) : 0;
    const workStart = 8 * 60;
    const workEnd = (day === 6) ? 14 * 60 : 17 * 60;

    if (!clockOut) {
        return { netMinutes: 0, detail: "-", display: "-", color: "text-gray-300", sisaWaktuKerja: Math.max(0, workEnd - inM) };
    }

    const outM = toM(clockOut);
    const overtimeM = Math.max(0, outM - workEnd);
    const lateM = Math.max(0, inM - workStart);

    const netM = Math.max(0, overtimeM - lateM);
    return {
        netMinutes: netM,
        detail: formatMinutes(netM),
        display: formatMinutes(netM),
        color: netM > 0 ? "text-green-600" : "text-gray-300",
        sisaWaktuKerja: Math.max(0, lateM - overtimeM)
    };
}

/* ==================================
   STORAGE & INPUT
================================== */
function saveAndRefresh() {
    localStorage.setItem("overtimeRecords", JSON.stringify(allRecords));
    renderMonthView();
}

function clearData() {
    if (confirm("Hapus semua data?")) {
        localStorage.removeItem("overtimeRecords");
        allRecords = [];
        renderMonthView();
    }
}

function addManualData(e) {
    e.preventDefault();
    const n = empName.value, d = empDate.value, i = empClockIn.value, o = empClockOut.value;

    let rec = allRecords.find(r => r.name.toLowerCase() === n.toLowerCase() && r.date === d);
    if (!rec) allRecords.push({ name: n, date: d, clockIn: i, clockOut: o });
    else { rec.clockIn = i; rec.clockOut = o; }

    saveAndRefresh();
    e.target.reset();
}

/* ==================================
   IMPORT FILE + TEXT
================================== */
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        document.getElementById("textInput").value = reader.result;
        alert("File berhasil dimuat — silakan klik PROSES DATA");
    };
    reader.readAsText(file);
}

function processTextData() {
    const text = (textInput.value || "").trim();
    if (!text) return alert("Tidak ada data yang bisa diproses.");

    const lines = text.split("\n");
    let added = 0;

    for (const line of lines) {
        if (!line.trim()) continue;

        const clean = line.replace(/[\u00A0\u1680​\u180e\u2000-\u200b\u202f\u205f\u3000]/g, " ");
        const parts = clean.trim().split(/\s+/);

        const dateIndex = parts.findIndex(p => /^\d{4}-\d{2}-\d{2}$/.test(p));
        const timeIndex = parts.findIndex(p => /^\d{2}:\d{2}/.test(p));
        if (dateIndex === -1 || timeIndex === -1) continue;

        const name = parts[3] || "Karyawan";
        const date = parts[dateIndex];
        const time = parts[timeIndex].substring(0,5);

        let rec = allRecords.find(r => r.name.toLowerCase() === name.toLowerCase() && r.date === date);

        if (!rec) allRecords.push({ name, date, clockIn: time, clockOut: "" });
        else {
            if (time < rec.clockIn) rec.clockIn = time;
            if (!rec.clockOut || time > rec.clockOut) rec.clockOut = time;
        }
        added++;
    }

    if (!added) return alert("File terbaca, tetapi tidak ada baris valid.");
    saveAndRefresh();
    alert(`Berhasil memproses ${added} baris data!`);
    textInput.value = "";
}

/* ==================================
   CETAK PDF (STABIL)
================================== */
function printEmployeePDF(name, month) {
    if (!window.jspdf || !window.html2canvas) {
        alert("Library jsPDF / html2canvas belum dimuat.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const source = document.getElementById("detailView");

    html2canvas(source, { scale: 2 })
        .then(canvas => {
            const pdf = new jsPDF("p","mm","a4");
            const pageW = pdf.internal.pageSize.getWidth();
            const imgH = (canvas.height * pageW) / canvas.width;

            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageW, imgH);
            pdf.save(`Rekap-Lembur-${name}-${month}.pdf`);
        })
        .catch(err => {
            console.error(err);
            alert("Gagal membuat PDF, silakan coba lagi!");
        });
}
