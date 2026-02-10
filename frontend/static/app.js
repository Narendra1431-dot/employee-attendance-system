const API_URL = "/api";
let currentUser = JSON.parse(localStorage.getItem("user"));
let token = localStorage.getItem("token");

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    if (window.location.pathname === "/dashboard") initDashboard();
    if (window.location.pathname === "/admin") initAdmin();
});

// --- Auth Module ---
function initAuth() {
    const loginForm = document.getElementById("login-form");
    const regForm = document.getElementById("register-form");
    const toggleBtn = document.getElementById("toggle-auth");
    const subtitle = document.getElementById("auth-subtitle");

    if (!loginForm) return;

    toggleBtn.onclick = (e) => {
        e.preventDefault();
        const isLogin = loginForm.style.display !== "none";
        loginForm.style.display = isLogin ? "none" : "block";
        regForm.style.display = isLogin ? "block" : "none";
        subtitle.innerText = isLogin ? "Create a new account" : "Sign in to your account";
        toggleBtn.innerText = isLogin ? "Already have an account? Sign in" : "Don't have an account? Register here";
    };

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append("username", document.getElementById("email").value);
        data.append("password", document.getElementById("password").value);

        try {
            const res = await fetch(`${API_URL}/auth/login`, { method: "POST", body: data });
            const result = await res.json();
            if (res.ok) {
                localStorage.setItem("token", result.access_token);
                localStorage.setItem("user", JSON.stringify(result));
                window.location.href = "/dashboard";
            } else {
                alert(result.detail || "Login failed");
            }
        } catch (err) {
            alert("Server connection error");
        }
    };

    regForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById("reg-name").value,
            email: document.getElementById("reg-email").value,
            password: document.getElementById("reg-password").value,
            role: document.getElementById("reg-role").value
        };

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Registration successful! Please login.");
                toggleBtn.click();
            } else {
                const err = await res.json();
                alert(err.detail || "Registration failed");
            }
        } catch (err) {
            alert("Server connection error");
        }
    };
}

function logout() {
    localStorage.clear();
    window.location.href = "/";
}

function setTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.style.setProperty('--primary', '#818cf8');
        root.style.setProperty('--dark', '#0f172a');
        root.style.setProperty('--glass', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--text', '#f8fafc');
        root.style.setProperty('--text-muted', '#94a3b8');
        document.body.style.background = 'radial-gradient(circle at top left, #1e1b4b, #0f172a)';
        document.getElementById('theme-toggle').innerText = '☀️';
    } else {
        root.style.setProperty('--primary', '#3b82f6');
        root.style.setProperty('--dark', '#f8fafc');
        root.style.setProperty('--glass', 'rgba(0, 0, 0, 0.05)');
        root.style.setProperty('--text', '#1f2937');
        root.style.setProperty('--text-muted', '#6b7280');
        document.body.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
        document.getElementById('theme-toggle').innerText = '🌙';
    }
    localStorage.setItem('theme', theme);

// Update chart themes
    updateChartThemes(theme);
}

// Update chart themes based on current theme
function updateChartThemes(theme) {
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const tickColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
    const tooltipBg = theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    const tooltipColor = theme === 'dark' ? '#000' : '#fff';

    // Update productivity chart
    if (window.productivityChart) {
        window.productivityChart.options.scales.x.grid.color = gridColor;
        window.productivityChart.options.scales.y.grid.color = gridColor;
        window.productivityChart.options.scales.x.ticks.color = tickColor;
        window.productivityChart.options.scales.y.ticks.color = tickColor;
        window.productivityChart.options.plugins.tooltip.backgroundColor = tooltipBg;
        window.productivityChart.options.plugins.tooltip.titleColor = tooltipColor;
        window.productivityChart.options.plugins.tooltip.bodyColor = tooltipColor;
        window.productivityChart.update();
    }

    // Update hours distribution chart
    if (window.hoursDistributionChart) {
        window.hoursDistributionChart.options.scales.x.grid.color = gridColor;
        window.hoursDistributionChart.options.scales.y.grid.color = gridColor;
        window.hoursDistributionChart.options.scales.x.ticks.color = tickColor;
        window.hoursDistributionChart.options.scales.y.ticks.color = tickColor;
        window.hoursDistributionChart.options.plugins.tooltip.backgroundColor = tooltipBg;
        window.hoursDistributionChart.options.plugins.tooltip.titleColor = tooltipColor;
        window.hoursDistributionChart.options.plugins.tooltip.bodyColor = tooltipColor;
        window.hoursDistributionChart.update();
    }

    // Update status overview chart
    if (window.statusOverviewChart) {
        window.statusOverviewChart.options.plugins.legend.labels.color = tickColor;
        window.statusOverviewChart.options.plugins.tooltip.backgroundColor = tooltipBg;
        window.statusOverviewChart.options.plugins.tooltip.titleColor = tooltipColor;
        window.statusOverviewChart.options.plugins.tooltip.bodyColor = tooltipColor;
        window.statusOverviewChart.update();
    }
}

// --- Dashboard Module ---
let workingTimerInterval;
let autoRefreshInterval;
let chart;
let breakStartTime = null;
let totalBreakTime = 0;
let isOnBreak = false;
let currentLogs = []; // Global variable to store current attendance logs

async function initDashboard() {
    if (!token) return logout();

    document.getElementById("welcome-msg").innerHTML = `Welcome, <span style="font-weight: 300;">${currentUser.name}</span>`;
    if (currentUser.role !== "EMPLOYEE") {
        document.getElementById("admin-nav").style.display = "block";
    }

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.getElementById('theme-toggle').onclick = () => {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const clockBtn = document.getElementById("clock-btn");
    const activityLog = document.getElementById("activity-log");
    const currentStatus = document.getElementById("current-status");

    const refreshDashboard = async () => {
        const res = await fetch(`${API_URL}/attendance/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const logs = await res.json();

        activityLog.innerHTML = "";
        logs.forEach(log => {
            const row = `<tr>
                <td>${log.date}</td>
                <td>${formatTime(log.check_in)}</td>
                <td>${log.check_out ? formatTime(log.check_out) : '--'}</td>
                <td><span class="badge badge-${log.status.toLowerCase().replace('-', '')}">${log.status}</span></td>
                <td>${calculateDuration(log.check_in, log.check_out)}</td>
            </tr>`;
            activityLog.insertAdjacentHTML("beforeend", row);
        });

        // Update current status card
        // Robust local date calculation
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayLog = logs.find(l => l.date === todayStr);

        console.log("Current Logs:", logs);
        console.log("Today String:", todayStr);
        console.log("Matched Log:", todayLog);

        if (todayLog) {
            currentStatus.innerText = todayLog.check_out ? "Checked Out" : "Working";
            currentStatus.className = `badge badge-${todayLog.status.toLowerCase().replace('-', '')} status-change`;
            clockBtn.innerText = todayLog.check_out ? "Done for Today" : "Clock Out";
            if (todayLog.check_out) clockBtn.disabled = true;
            startWorkingTimer(todayLog.check_in, todayLog.check_out);
        } else {
            currentStatus.innerText = "Not Started";
            currentStatus.className = "badge status-change";
            clockBtn.innerText = "Clock In";
            stopWorkingTimer();
        }

        // Update weekly count and chart
        updateWeeklyStats(logs);

        // Update today's stats
        updateTodayStats(logs);
    };

    const startWorkingTimer = (checkIn, checkOut) => {
        stopWorkingTimer();
        const startTime = new Date(checkIn);
        const endTime = checkOut ? new Date(checkOut) : new Date();

        workingTimerInterval = setInterval(() => {
            const now = new Date();
            const elapsed = checkOut ? endTime - startTime : now - startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById("working-timer").innerText = `Worked: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    };

    const stopWorkingTimer = () => {
        if (workingTimerInterval) {
            clearInterval(workingTimerInterval);
            workingTimerInterval = null;
            document.getElementById("working-timer").innerText = "";
        }
    };

    const updateWeeklyStats = (logs) => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weeklyLogs = logs.filter(log => new Date(log.date) >= weekAgo);
        document.getElementById("weekly-count").innerText = weeklyLogs.length;

        // Update chart
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = days.map(day => {
            const dayLogs = weeklyLogs.filter(log => {
                const logDate = new Date(log.date);
                return logDate.toLocaleDateString('en-US', { weekday: 'short' }) === day;
            });
            return dayLogs.length;
        });

        if (chart) chart.destroy();
        const ctx = document.getElementById('weekly-chart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Attendance',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    };

    clockBtn.onclick = async () => {
        clockBtn.classList.add('animate-pulse');
        const res = await fetch(`${API_URL}/attendance/clock`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            refreshDashboard();
            showNotification("Clock action successful!", "success");
        } else {
            const err = await res.json();
            alert(err.detail);
            showNotification("Clock action failed!", "error");
        }
        setTimeout(() => clockBtn.classList.remove('animate-pulse'), 1000);
    };

    // Break button functionality
    const breakBtn = document.getElementById("break-btn");
    breakBtn.onclick = () => {
        if (isOnBreak) {
            // End break
            const breakDuration = (new Date() - breakStartTime) / 1000 / 60; // minutes
            totalBreakTime += breakDuration;
            breakStartTime = null;
            isOnBreak = false;
            breakBtn.innerText = "Start Break";
            breakBtn.style.background = "var(--warning)";
            showNotification("Break ended!", "info");
        } else {
            // Start break
            breakStartTime = new Date();
            isOnBreak = true;
            breakBtn.innerText = "End Break";
            breakBtn.style.background = "var(--success)";
            showNotification("Break started!", "info");
        }
        updateTodayStats([]);
    };

    // Auto-refresh every 30 seconds
    autoRefreshInterval = setInterval(refreshDashboard, 30000);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Initialize calendar
    initCalendar();

    // Clock out reminder
    setInterval(checkClockOutReminder, 60000); // Check every minute

    refreshDashboard();
}

// --- Admin Module ---
async function initAdmin() {
    if (!token || currentUser.role === "EMPLOYEE") return window.location.href = "/dashboard";

    const empList = document.getElementById("employee-list");
    const attList = document.getElementById("all-attendance-list");
    const statsPresent = document.getElementById("stats-present");
    const statsLate = document.getElementById("stats-late");
    const statsAbsent = document.getElementById("stats-absent");
    const integrityReport = document.getElementById("integrity-report");
    const manEmpSelect = document.getElementById("man-emp-id");

    const fetchStats = async () => {
        const res = await fetch(`${API_URL}/stats/daily`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        statsPresent.innerText = data.Present;
        statsLate.innerText = data.Late;
        statsAbsent.innerText = data.Absent;
    };

    const fetchEmployees = async (search = "") => {
        const res = await fetch(`${API_URL}/employees/?search=${search}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        empList.innerHTML = "";
        manEmpSelect.innerHTML = '<option value="">Select Employee...</option>';
        data.items.forEach(emp => {
            const row = `<tr>
                <td>${emp.employee_code}</td>
                <td>${emp.name}</td>
                <td>${emp.department || '--'}</td>
                <td>${emp.designation || '--'}</td>
                <td>
                    <button onclick="openEditEmpModal(${JSON.stringify(emp).replace(/"/g, '&quot;')})" class="btn" style="color: var(--primary); padding: 4px;">Edit</button>
                    <button onclick="deleteEmployee(${emp.id})" class="btn" style="color: var(--danger); padding: 4px;">Delete</button>
                </td>
            </tr>`;
            empList.insertAdjacentHTML("beforeend", row);
            manEmpSelect.insertAdjacentHTML("beforeend", `<option value="${emp.id}">${emp.name} (${emp.employee_code})</option>`);
        });
    };

    const fetchAllAttendance = async () => {
        const res = await fetch(`${API_URL}/attendance/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        attList.innerHTML = "";
        data.forEach(log => {
            const row = `<tr>
                <td>${log.date}</td>
                <td>${log.employee_id}</td>
                <td>${formatTime(log.check_in)}</td>
                <td>${log.check_out ? formatTime(log.check_out) : '--'}</td>
                <td><span class="badge badge-${log.status.toLowerCase().replace('-', '')}">${log.status}</span></td>
                <td>
                    <button onclick="deleteAttendanceRecord(${log.id})" class="btn" style="color: var(--danger); padding: 4px;">Delete</button>
                </td>
            </tr>`;
            attList.insertAdjacentHTML("beforeend", row);
        });
    };

    const fetchIntegrity = async () => {
        const res = await fetch(`${API_URL}/stats/integrity`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        integrityReport.innerHTML = "";
        if (data.anomalies.length === 0) {
            integrityReport.innerHTML = '<p style="color: var(--success);">No issues detected!</p>';
        }
        data.anomalies.forEach(issue => {
            integrityReport.insertAdjacentHTML("beforeend", `
                <div class="glass-container" style="padding: 12px; border-left: 3px solid var(--danger);">
                    <div style="font-weight: 600; font-size: 0.8rem;">${issue.type} - ${issue.date}</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem;">${issue.employee}: ${issue.details}</div>
                </div>
            `);
        });
    };

    window.deleteEmployee = async (id) => {
        if (!confirm("Are you sure? This will delete the employee and their user account.")) return;
        const res = await fetch(`${API_URL}/employees/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) fetchEmployees();
    };

    window.deleteAttendanceRecord = async (id) => {
        if (!confirm("Delete this attendance record? This action is logged.")) return;
        const res = await fetch(`${API_URL}/attendance/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            fetchAllAttendance();
            fetchStats();
        }
    };

    window.openEditEmpModal = (emp) => {
        document.getElementById("edit-emp-id").value = emp.id;
        document.getElementById("edit-emp-code").value = emp.employee_code;
        document.getElementById("edit-emp-name").value = emp.name;
        document.getElementById("edit-emp-dept").value = emp.department || '';
        document.getElementById("edit-emp-desig").value = emp.designation || '';
        document.getElementById("edit-emp-modal").style.display = "flex";
    };

    window.closeEditEmpModal = () => document.getElementById("edit-emp-modal").style.display = "none";

    window.saveEmployeeEdit = async () => {
        const id = document.getElementById("edit-emp-id").value;
        const payload = {
            employee_code: document.getElementById("edit-emp-code").value,
            name: document.getElementById("edit-emp-name").value,
            department: document.getElementById("edit-emp-dept").value,
            designation: document.getElementById("edit-emp-desig").value
        };

        const res = await fetch(`${API_URL}/employees/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Employee updated!");
            closeEditEmpModal();
            fetchEmployees();
        } else {
            const err = await res.json();
            alert(err.detail || "Update failed");
        }
    };

    window.openManualAttendanceModal = () => {
        document.getElementById("man-date").value = new Date().toLocaleDateString('sv-SE');
        document.getElementById("manual-att-modal").style.display = "flex";
    };

    window.closeManualAttendanceModal = () => document.getElementById("manual-att-modal").style.display = "none";

    window.submitManualAttendance = async () => {
        const dateStr = document.getElementById("man-date").value;
        const checkInTime = document.getElementById("man-check-in").value;
        const checkOutTime = document.getElementById("man-check-out").value;

        const payload = {
            employee_id: parseInt(document.getElementById("man-emp-id").value),
            date: dateStr,
            check_in: `${dateStr}T${checkInTime}:00`,
            check_out: checkOutTime ? `${dateStr}T${checkOutTime}:00` : null,
            status: document.getElementById("man-status").value,
            notes: document.getElementById("man-notes").value
        };

        const res = await fetch(`${API_URL}/attendance/manual`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Record created!");
            closeManualAttendanceModal();
            fetchAllAttendance();
            fetchStats();
        } else {
            const err = await res.json();
            alert(err.detail || "Failed to create record");
        }
    };

    document.getElementById("emp-search").oninput = (e) => fetchEmployees(e.target.value);

    fetchStats();
    fetchEmployees();
    fetchAllAttendance();
    fetchIntegrity();
}

// --- Helpers ---
function formatTime(isoStr) {
    if (!isoStr) return '--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateDuration(start, end) {
    if (!start || !end) return '--';
    const diff = (new Date(end) - new Date(start)) / 1000 / 3600;
    return `${diff.toFixed(1)} hrs`;
}

function showNotification(message, type) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Attendance System', {
            body: message,
            icon: '/static/favicon.ico' // Assuming you have a favicon
        });
    }
}

// Config Modal functions
function openConfigModal() { document.getElementById("config-modal").style.display = "flex"; }
function closeConfigModal() { document.getElementById("config-modal").style.display = "none"; }

async function saveConfig() {
    const start = document.getElementById("config-start").value;
    const grace = document.getElementById("config-grace").value;

    await Promise.all([
        fetch(`${API_URL}/config/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ key: "office_start", value: start })
        }),
        fetch(`${API_URL}/config/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ key: "grace_period", value: grace })
        })
    ]);

    alert("Settings saved!");
    closeConfigModal();
    window.location.reload();
}

async function exportCSV() {
    const start = prompt("Enter start date (YYYY-MM-DD):", "2026-01-01");
    const end = prompt("Enter end date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (start && end) {
        window.open(`${API_URL}/stats/export/csv?start_date=${start}&end_date=${end}&token=${token}`);
        // Note: For real-world use, we might need a different token transfer mechanism for window.open
    }
}

// --- New Advanced Features ---

// Update today's stats including break time and productivity
function updateTodayStats(logs) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayLog = logs.find(l => l.date === todayStr);

    let hours = 0;
    let breakTime = totalBreakTime / 60; // Convert to hours
    let productivity = 85; // Default productivity

    if (todayLog && todayLog.check_in) {
        const checkIn = new Date(todayLog.check_in);
        const checkOut = todayLog.check_out ? new Date(todayLog.check_out) : now;
        hours = (checkOut - checkIn) / (1000 * 60 * 60) - breakTime;
        productivity = Math.max(0, Math.min(100, 85 + (hours - 8) * 5)); // Simple calculation
    }

    document.getElementById('today-hours').innerText = hours.toFixed(1);
    document.getElementById('break-time').innerText = breakTime.toFixed(1);
    document.getElementById('productivity').innerText = `${productivity.toFixed(0)}%`;
}

// Calculate overtime for the week
function updateOvertimeWeek(logs) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyLogs = logs.filter(log => new Date(log.date) >= weekAgo);

    let totalOvertime = 0;
    weeklyLogs.forEach(log => {
        if (log.check_in && log.check_out) {
            const hours = (new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60 * 60);
            if (hours > 8) totalOvertime += hours - 8;
        }
    });

    document.getElementById('overtime-week').innerText = totalOvertime.toFixed(1);
}

// Initialize team overview
async function initTeamOverview() {
    if (currentUser.role === "EMPLOYEE") return; // Only for admins/managers

    try {
        const res = await fetch(`${API_URL}/employees/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const employees = await res.json();

        const teamContainer = document.getElementById('team-overview');
        teamContainer.innerHTML = '';

        for (const emp of employees.items) {
            const attRes = await fetch(`${API_URL}/attendance/?employee_id=${emp.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const logs = await attRes.json();

            const todayStr = new Date().toISOString().split('T')[0];
            const todayLog = logs.find(l => l.date === todayStr);

            let status = 'Not Started';
            let statusClass = 'badge';
            if (todayLog) {
                if (todayLog.check_out) {
                    status = 'Checked Out';
                } else {
                    status = 'Working';
                    statusClass = 'badge-present';
                }
            }

            const teamMember = document.createElement('div');
            teamMember.className = 'team-member';
            teamMember.innerHTML = `
                <div class="team-member-avatar">${emp.name.charAt(0).toUpperCase()}</div>
                <div class="team-member-info">
                    <div class="team-member-name">${emp.name}</div>
                    <div class="team-member-status">${status}</div>
                </div>
            `;
            teamContainer.appendChild(teamMember);
        }
    } catch (err) {
        console.error('Failed to load team overview:', err);
    }
}

// Export to PDF
async function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Attendance Report', 20, 30);

    try {
        const res = await fetch(`${API_URL}/attendance/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const logs = await res.json();

        let y = 50;
        doc.setFontSize(12);
        doc.text('Date', 20, y);
        doc.text('Check In', 60, y);
        doc.text('Check Out', 100, y);
        doc.text('Status', 140, y);
        doc.text('Hours', 180, y);
        y += 10;

        logs.slice(0, 20).forEach(log => { // Limit to 20 entries for PDF
            doc.text(log.date, 20, y);
            doc.text(formatTime(log.check_in), 60, y);
            doc.text(log.check_out ? formatTime(log.check_out) : '--', 100, y);
            doc.text(log.status, 140, y);
            doc.text(calculateDuration(log.check_in, log.check_out), 180, y);
            y += 10;
        });

        doc.save('attendance-report.pdf');
        showNotification("PDF exported successfully!", "success");
    } catch (err) {
        showNotification("Failed to export PDF!", "error");
    }
}

// Initialize calendar with attendance data
let currentCalendarDate = new Date();
let attendanceLogs = [];

function initCalendar() {
    // Add month navigation
    document.getElementById('prev-month').onclick = () => updateCalendar(-1);
    document.getElementById('next-month').onclick = () => updateCalendar(1);
    renderCalendar();
}

function renderCalendar() {
    const calendarElement = document.getElementById('calendar');
    const monthElement = document.getElementById('calendar-month');

    // Set month/year display
    monthElement.innerText = currentCalendarDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
    });

    // Get first day of month and last day
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    calendarElement.innerHTML = '';

    // Create calendar grid
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        const dayNumber = currentDate.getDate();
        const isCurrentMonth = currentDate.getMonth() === currentCalendarDate.getMonth();

        if (isCurrentMonth) {
            // Check if this date has attendance data
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

            // Get attendance log for this date
            const log = attendanceLogs.find(l => l.date === dateStr);

            if (log) {
                // Has attendance data
                const attendanceStatus = log.status;
                const duration = calculateDuration(log.check_in, log.check_out);
                const statusClass = attendanceStatus.toLowerCase().replace('-', '');

                dayElement.className += ` calendar-day-${statusClass}`;

                // Display symbols and data
                let symbol = '';
                let displayText = '';
                if (attendanceStatus === 'Present') {
                    symbol = '✅';
                    displayText = `${dayNumber}<br><small>${duration}</small>`;
                } else if (attendanceStatus === 'Late') {
                    symbol = '⏰';
                    displayText = `${dayNumber}<br><small>${duration}</small>`;
                } else if (attendanceStatus === 'Half-Day') {
                    symbol = '⚠️';
                    displayText = `${dayNumber}<br><small>${duration}</small>`;
                }
                dayElement.innerHTML = `${symbol} ${displayText}`;

                // Add tooltip with details
                const statusText = attendanceStatus === 'Present' ? `Present: ${duration}` : attendanceStatus === 'Late' ? `Late: ${duration}` : 'Half-Day';
                dayElement.title = `${statusText}\nCheck-in: ${formatTime(log.check_in)}\nCheck-out: ${log.check_out ? formatTime(log.check_out) : 'N/A'}\nHours: ${duration}`;

                // Make dynamic - add click handler for details
                dayElement.onclick = () => showAttendanceDetails(log);
                dayElement.style.cursor = 'pointer';
            } else {
                // No attendance data - assume absent
                dayElement.className += ' calendar-day-absent';
                dayElement.innerHTML = `❌ ${dayNumber}<br><small>Absent</small>`;
                dayElement.title = 'Absent';
                dayElement.onclick = () => showAttendanceDetails(null, dateStr);
                dayElement.style.cursor = 'pointer';
            }

            // Highlight today
            const today = new Date();
            if (currentDate.toDateString() === today.toDateString()) {
                dayElement.className += ' calendar-day-today';
            }
        } else {
            dayElement.className += ' calendar-day-other-month';
            dayElement.innerText = dayNumber;
        }

        calendarElement.appendChild(dayElement);
    }
}

function updateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

function getAttendanceStatusForDate(dateStr) {
    // Check attendance logs for the given date
    const log = attendanceLogs.find(l => l.date === dateStr);
    return log ? log.status : null;
}

// Update calendar data when dashboard refreshes
function updateCalendarData(logs) {
    attendanceLogs = logs;
    renderCalendar();
}

// Show attendance details modal
function showAttendanceDetails(log, dateStr = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content glass-container" style="max-width: 400px; padding: 20px;">
            <h3 style="margin-bottom: 15px;">Attendance Details</h3>
            ${log ? `
                <div style="margin-bottom: 10px;">
                    <strong>Date:</strong> ${log.date}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Status:</strong> <span class="badge badge-${log.status.toLowerCase().replace('-', '')}">${log.status}</span>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Check-in:</strong> ${formatTime(log.check_in)}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Check-out:</strong> ${log.check_out ? formatTime(log.check_out) : 'Not checked out'}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Duration:</strong> ${calculateDuration(log.check_in, log.check_out)}
                </div>
            ` : `
                <div style="margin-bottom: 10px;">
                    <strong>Date:</strong> ${dateStr}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Status:</strong> <span class="badge badge-absent">Absent</span>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Note:</strong> No attendance record found for this date.
                </div>
            `}
            <button onclick="this.closest('.modal-overlay').remove()" class="btn" style="margin-top: 15px;">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Clock out reminder
function checkClockOutReminder() {
    if (workingTimerInterval && !isOnBreak) {
        const now = new Date();
        const todayLog = {}; // Get current log
        if (todayLog.check_in) {
            const hoursWorked = (now - new Date(todayLog.check_in)) / (1000 * 60 * 60);
            if (hoursWorked >= 8) {
                showNotification("You've worked 8 hours! Consider clocking out.", "warning");
            }
        }
    }
}

// Settings modal functions
function openSettingsModal() {
    // Load current settings from localStorage
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    document.getElementById('notify-clock-in').checked = settings.notifyClockIn !== false;
    document.getElementById('notify-break').checked = settings.notifyBreak !== false;
    document.getElementById('notify-overtime').checked = settings.notifyOvertime !== false;
    document.getElementById('default-view').value = settings.defaultView || 'dashboard';
    document.getElementById('theme-preference').value = settings.themePreference || 'auto';
    document.getElementById('working-hours').value = settings.workingHours || 8;

    document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

// Handle settings form submission
document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.onsubmit = (e) => {
            e.preventDefault();
            const settings = {
                notifyClockIn: document.getElementById('notify-clock-in').checked,
                notifyBreak: document.getElementById('notify-break').checked,
                notifyOvertime: document.getElementById('notify-overtime').checked,
                defaultView: document.getElementById('default-view').value,
                themePreference: document.getElementById('theme-preference').value,
                workingHours: parseInt(document.getElementById('working-hours').value)
            };
            localStorage.setItem('userSettings', JSON.stringify(settings));
            showNotification('Settings saved successfully!', 'success');
            closeSettingsModal();
            applySettings(settings);
        };
    }
});

function applySettings(settings) {
    // Apply theme preference
    if (settings.themePreference === 'dark') {
        setTheme('dark');
    } else if (settings.themePreference === 'light') {
        setTheme('light');
    } else {
        // Auto - could detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }

    // Apply working hours for overtime calculation
    // This would be used in updateOvertimeWeek function
}

function saveSettings() {
    const settings = {
        notifyClockIn: document.getElementById('notify-clock-in').checked,
        notifyBreak: document.getElementById('notify-break').checked,
        notifyOvertime: document.getElementById('notify-overtime').checked,
        defaultView: document.getElementById('default-view').value,
        themePreference: document.getElementById('theme-preference').value,
        workingHours: parseInt(document.getElementById('working-hours').value)
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    showNotification('Settings saved successfully!', 'success');
    closeSettingsModal();
    applySettings(settings);
}

// Initialize productivity chart
function initProductivityChart() {
    const ctx = document.getElementById('productivity-chart').getContext('2d');
    window.productivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Productivity %',
                data: [85, 88, 82, 90, 87, 0, 0], // Will be updated with real data
                borderColor: 'rgba(34, 197, 94, 1)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 10,
                pointHoverBackgroundColor: 'rgba(34, 197, 94, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(34, 197, 94, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return `Day: ${context[0].label}`;
                        },
                        label: function(context) {
                            return `Productivity: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });

    // Add period selector functionality
    document.getElementById('analytics-period').addEventListener('change', function(e) {
        updateAllCharts(e.target.value);
    });

// Initialize other charts
initHoursDistributionChart();
initStatusOverviewChart();
updateAllCharts('week');

// Add refresh analytics button functionality
document.getElementById('refresh-analytics').addEventListener('click', function() {
    updateAllCharts(document.getElementById('analytics-period').value);
    showNotification('Analytics refreshed!', 'success');
});

// Initialize hours distribution chart
function initHoursDistributionChart() {
    const ctx = document.getElementById('hours-distribution-chart').getContext('2d');
    window.hoursDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Hours Worked',
                data: [8.5, 9.0, 7.5, 8.8, 8.2, 0, 0],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 12,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return `Day: ${context[0].label}`;
                        },
                        label: function(context) {
                            return `Hours: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize status overview chart
function initStatusOverviewChart() {
    const ctx = document.getElementById('status-overview-chart').getContext('2d');
    window.statusOverviewChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Late', 'Absent'],
            datasets: [{
                data: [5, 1, 1],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update all charts based on period
function updateAllCharts(period = 'week') {
    updateProductivityChart(period);
    updateHoursDistributionChart(period);
    updateStatusOverviewChart(period);
    updateAnalyticsMetrics(period);
}

// Update hours distribution chart
function updateHoursDistributionChart(period = 'week') {
    if (!window.hoursDistributionChart) return;

    let labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let data = [8.5, 9.0, 7.5, 8.8, 8.2, 0, 0];

    if (period === 'month') {
        labels = Array.from({length: 30}, (_, i) => `Day ${i + 1}`);
        data = Array.from({length: 30}, () => Math.floor(Math.random() * 4) + 6);
    } else if (period === 'quarter') {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'];
        data = [40.5, 42.0, 38.5, 43.8, 41.2, 39.5, 44.2, 40.7, 43.0, 45.3, 42.9, 44.1];
    }

    window.hoursDistributionChart.data.labels = labels;
    window.hoursDistributionChart.data.datasets[0].data = data;
    window.hoursDistributionChart.update();
}

// Update status overview chart
function updateStatusOverviewChart(period = 'week') {
    if (!window.statusOverviewChart) return;

    // Sample data - in real app, this would come from API based on period
    let data = [5, 1, 1]; // Present, Late, Absent

    if (period === 'month') {
        data = [22, 3, 5];
    } else if (period === 'quarter') {
        data = [85, 12, 18];
    }

    window.statusOverviewChart.data.datasets[0].data = data;
    window.statusOverviewChart.update();
}

// Update analytics metrics
function updateAnalyticsMetrics(period = 'week') {
    // Sample metrics - in real app, these would be calculated from API data
    let avgDailyHours = 8.2;
    let totalOvertime = 2.5;
    let attendanceRate = 83;
    let efficiencyScore = 87;

    if (period === 'month') {
        avgDailyHours = 8.1;
        totalOvertime = 12.3;
        attendanceRate = 85;
        efficiencyScore = 89;
    } else if (period === 'quarter') {
        avgDailyHours = 8.3;
        totalOvertime = 45.7;
        attendanceRate = 82;
        efficiencyScore = 86;
    }

    document.getElementById('avg-daily-hours').innerText = avgDailyHours.toFixed(1);
    document.getElementById('total-overtime').innerText = totalOvertime.toFixed(1);
    document.getElementById('attendance-rate').innerText = `${attendanceRate}%`;
    document.getElementById('efficiency-score').innerText = `${efficiencyScore}%`;
}
}

// Update productivity chart with real data
function updateProductivityChart(period = 'week') {
    if (!window.productivityChart) return;

    const now = new Date();
    let days = 7;
    let labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (period === 'month') {
        days = 30;
        labels = Array.from({length: 30}, (_, i) => `Day ${i + 1}`);
    } else if (period === 'quarter') {
        days = 12;
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'];
    }

    // Generate distinct sample data based on period (in real app, this would come from API)
    let data;
    if (period === 'week') {
        data = [85, 88, 82, 90, 87, 0, 0]; // Week data
    } else if (period === 'month') {
        data = Array.from({length: 30}, () => Math.floor(Math.random() * 15) + 80); // Month data
    } else if (period === 'quarter') {
        data = [86, 89, 84, 91, 88, 85, 92, 87, 90, 93, 89, 91]; // Quarter data
    }

    window.productivityChart.data.labels = labels;
    window.productivityChart.data.datasets[0].data = data;
    window.productivityChart.update();
}

// Initialize notifications
function initNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    const sampleNotifications = [
        { type: 'info', message: 'Welcome to Attendance Intel!', time: '2 hours ago' },
        { type: 'success', message: 'Clock-in recorded successfully', time: '5 hours ago' },
        { type: 'warning', message: 'Remember to take your break!', time: '1 day ago' }
    ];

    notificationsList.innerHTML = '';
    sampleNotifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item notification-${notification.type}`;
        notificationItem.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${notification.time}</div>
            </div>
        `;
        notificationsList.appendChild(notificationItem);
    });
}

// Quick action functions
function quickClockAction() {
    document.getElementById('clock-btn').click();
    showNotification('Quick clock action initiated!', 'info');
}

function viewProfile() {
    showNotification('Profile view - Feature coming soon!', 'info');
}

function viewSchedule() {
    showNotification('Schedule view - Feature coming soon!', 'info');
}

function contactHR() {
    showNotification('Opening HR contact form...', 'info');
    // Could open a modal or redirect to HR contact page
}

function generateQuickReport() {
    showNotification('Generating quick report...', 'info');
    // Trigger PDF export
    exportPDF();
}

function requestLeave() {
    showNotification('Leave request form - Feature coming soon!', 'info');
    // Could open a leave request modal
}

function clearNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    notificationsList.innerHTML = '<div class="notification-item notification-info"><div class="notification-content"><div class="notification-message">All notifications cleared!</div><div class="notification-time">Just now</div></div></div>';
    showNotification('Notifications cleared!', 'success');
}

// Update activity summary
function updateActivitySummary(logs, period = 'week') {
    // Sample data for different periods to demonstrate functionality
    let totalHours, avgProductivity, totalBreaks, perfectDays;

    if (period === 'week') {
        totalHours = 45.5;
        avgProductivity = 87;
        totalBreaks = 5.0;
        perfectDays = 5;
    } else if (period === 'month') {
        totalHours = 180.2;
        avgProductivity = 89;
        totalBreaks = 22.0;
        perfectDays = 20;
    } else if (period === 'quarter') {
        totalHours = 540.8;
        avgProductivity = 91;
        totalBreaks = 65.0;
        perfectDays = 58;
    }

    // Update labels based on period
    const periodLabel = period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Quarter';

    document.getElementById('total-hours-week').innerText = totalHours.toFixed(1);
    document.getElementById('avg-productivity').innerText = `${avgProductivity}%`;
    document.getElementById('total-breaks').innerText = totalBreaks.toFixed(1);
    document.getElementById('perfect-days').innerText = perfectDays;

    // Update label text
    document.querySelector('#activity-summary .activity-summary-item:nth-child(1) .label').innerText = `Total Hours This ${periodLabel}`;
}

// Update dashboard to include all features
async function initDashboard() {
    if (!token) return logout();

    document.getElementById("welcome-msg").innerHTML = `Welcome, <span style="font-weight: 300;">${currentUser.name}</span>`;
    if (currentUser.role !== "EMPLOYEE") {
        document.getElementById("admin-nav").style.display = "block";
    }

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.getElementById('theme-toggle').onclick = () => {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const clockBtn = document.getElementById("clock-btn");
    const activityLog = document.getElementById("activity-log");
    const currentStatus = document.getElementById("current-status");

    const refreshDashboard = async () => {
        const res = await fetch(`${API_URL}/attendance/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const logs = await res.json();

        activityLog.innerHTML = "";
        logs.forEach(log => {
            const row = `<tr>
                <td>${log.date}</td>
                <td>${formatTime(log.check_in)}</td>
                <td>${log.check_out ? formatTime(log.check_out) : '--'}</td>
                <td><span class="badge badge-${log.status.toLowerCase().replace('-', '')}">${log.status}</span></td>
                <td>${calculateDuration(log.check_in, log.check_out)}</td>
            </tr>`;
            activityLog.insertAdjacentHTML("beforeend", row);
        });

        // Update current status card
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayLog = logs.find(l => l.date === todayStr);

        if (todayLog) {
            currentStatus.innerText = todayLog.check_out ? "Checked Out" : "Working";
            currentStatus.className = `badge badge-${todayLog.status.toLowerCase().replace('-', '')} status-change`;
            clockBtn.innerText = todayLog.check_out ? "Done for Today" : "Clock Out";
            if (todayLog.check_out) clockBtn.disabled = true;
            startWorkingTimer(todayLog.check_in, todayLog.check_out);
        } else {
            currentStatus.innerText = "Not Started";
            currentStatus.className = "badge status-change";
            clockBtn.innerText = "Clock In";
            stopWorkingTimer();
        }

        // Update weekly count and chart
        updateWeeklyStats(logs);

        // Update today's stats
        updateTodayStats(logs);

        // Update activity summary
        updateActivitySummary(logs);

        // Update calendar data
        updateCalendarData(logs);

        // Show break button when clocked in
        if (todayLog && !todayLog.check_out) {
            document.getElementById('break-btn').style.display = 'block';
        } else {
            document.getElementById('break-btn').style.display = 'none';
        }
    };

    const startWorkingTimer = (checkIn, checkOut) => {
        stopWorkingTimer();
        const startTime = new Date(checkIn);
        const endTime = checkOut ? new Date(checkOut) : new Date();

        workingTimerInterval = setInterval(() => {
            const now = new Date();
            const elapsed = checkOut ? endTime - startTime : now - startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById("working-timer").innerText = `Worked: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    };

    const stopWorkingTimer = () => {
        if (workingTimerInterval) {
            clearInterval(workingTimerInterval);
            workingTimerInterval = null;
            document.getElementById("working-timer").innerText = "";
        }
    };

    const updateWeeklyStats = (logs) => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weeklyLogs = logs.filter(log => new Date(log.date) >= weekAgo);
        document.getElementById("weekly-count").innerText = weeklyLogs.length;

        // Update chart if needed
    };

    clockBtn.onclick = async () => {
        clockBtn.classList.add('animate-pulse');
        const res = await fetch(`${API_URL}/attendance/clock`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            refreshDashboard();
            showNotification("Clock action successful!", "success");
        } else {
            const err = await res.json();
            alert(err.detail);
            showNotification("Clock action failed!", "error");
        }
        setTimeout(() => clockBtn.classList.remove('animate-pulse'), 1000);
    };

    // Break button functionality
    const breakBtn = document.getElementById("break-btn");
    breakBtn.onclick = () => {
        if (isOnBreak) {
            const breakDuration = (new Date() - breakStartTime) / 1000 / 60;
            totalBreakTime += breakDuration;
            breakStartTime = null;
            isOnBreak = false;
            breakBtn.innerText = "Start Break";
            breakBtn.style.background = "var(--warning)";
            showNotification("Break ended!", "info");
        } else {
            breakStartTime = new Date();
            isOnBreak = true;
            breakBtn.innerText = "End Break";
            breakBtn.style.background = "var(--success)";
            showNotification("Break started!", "info");
        }
        updateTodayStats([]);
    };

    // Auto-refresh every 30 seconds
    autoRefreshInterval = setInterval(refreshDashboard, 30000);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Initialize calendar
    initCalendar();

    // Initialize team overview
    initTeamOverview();

    // Initialize productivity chart
    initProductivityChart();

    // Initialize notifications
    initNotifications();

    // Quick action buttons
    document.getElementById('quick-report').onclick = generateQuickReport;
    document.getElementById('quick-leave').onclick = requestLeave;

    // Export buttons
    document.getElementById('export-csv').onclick = exportCSV;
    document.getElementById('export-pdf').onclick = exportPDF;

    // Clear notifications
    document.getElementById('clear-notifications').onclick = clearNotifications;

    // Activity period selector
    document.getElementById('activity-period').addEventListener('change', function(e) {
        updateActivitySummary(currentLogs, e.target.value);
    });

    refreshDashboard();
}
