// ============================================
// НАСТРОЙКИ JSONBIN - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
// ============================================
const BIN_ID = "6a2bbc91da38895dfeb36372";      // СЮДА ВСТАВЬТЕ BIN ID
const API_KEY = "$2a$10$UmQWOYXwBDWudmpUaDxPIun6hLcIHC/xzlJ3GzKKDzLRDsEvMPPC6";    // СЮДА ВСТАВЬТЕ API KEY
// ============================================

const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

let appData = null;
let currentUser = null;
let currentTeacherCadetId = null;
const subjects = ["Военно Тактическая Подготовка", "Русский язык", "Юридический"];

async function loadData() {
    try {
        const res = await fetch(API_URL, { headers: { "X-Master-Key": API_KEY } });
        const data = await res.json();
        appData = data.record;
        if (!appData.users) {
            const def = { users: [], nextId: 1 };
            await fetch(API_URL, { method: 'PUT', headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY }, body: JSON.stringify(def) });
            appData = def;
        }
        return true;
    } catch(e) {
        document.getElementById('loginError').innerText = 'Ошибка: проверьте интернет и ключи JSONbin';
        return false;
    }
}

async function saveData() {
    await fetch(API_URL, {
        method: 'PUT',
        headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
        body: JSON.stringify(appData)
    });
}

function getCadet(id) { return appData.users.find(u => u.id === id && u.role === 'cadet'); }
function getCadets() { return appData.users.filter(u => u.role === 'cadet'); }

async function addCadet(name, surname, login, password) {
    if (appData.users.some(u => u.login === login)) { alert('Логин уже занят!'); return false; }
    const newId = 'c' + appData.nextId++;
    appData.users.push({
        id: newId, login, password, role: 'cadet', name, surname,
        grades: subjects.map(s => ({ subject: s, grades: [] })),
        tasks: []
    });
    await saveData();
    return true;
}

async function addGrade(cadetId, subjectName, grade) {
    const cadet = getCadet(cadetId);
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && grade >= 2 && grade <= 5) {
        subj.grades.push(parseInt(grade));
        await saveData();
        return true;
    }
    return false;
}

async function removeLastGrade(cadetId, subjectName) {
    const cadet = getCadet(cadetId);
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && subj.grades.length) {
        subj.grades.pop();
        await saveData();
    }
}

async function addTask(cadetId, text) {
    const cadet = getCadet(cadetId);
    if (cadet) {
        cadet.tasks.push({ text, resolved: false, date: new Date().toLocaleString() });
        await saveData();
        return true;
    }
    return false;
}

async function resolveTask(cadetId, idx) {
    const c = getCadet(cadetId);
    if (c && c.tasks[idx]) {
        c.tasks[idx].resolved = true;
        await saveData();
    }
}

async function deleteTask(cadetId, idx) {
    const c = getCadet(cadetId);
    if (c && c.tasks[idx]) {
        c.tasks.splice(idx, 1);
        await saveData();
    }
}

function avg(grades) {
    if (!grades.length) return '—';
    return (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1);
}

async function renderCadetsGrid() {
    const grid = document.getElementById('cadetsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const cadet of getCadets()) {
        let allGrades = [];
        cadet.grades.forEach(s => allGrades.push(...s.grades));
        const totalAvg = allGrades.length ? avg(allGrades) : '—';
        const unresolved = cadet.tasks.filter(t => !t.resolved).length;
        const lastGrades = allGrades.slice(-3).join(', ');
        const card = document.createElement('div');
        card.className = 'cadet-card' + (currentTeacherCadetId === cadet.id ? ' selected' : '');
        card.innerHTML = `<h4>${cadet.surname} ${cadet.name}</h4><p>📋 ${cadet.login}</p><p>⭐ Средний балл: ${totalAvg}</p><p>⚠️ Долгов: ${unresolved}</p><div class="grades-preview">Оценки: ${lastGrades || 'нет'}</div><div class="badge">Всего: ${allGrades.length}</div>`;
        card.onclick = () => {
            document.querySelectorAll('.cadet-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentTeacherCadetId = cadet.id;
            document.getElementById('gradesBlock').style.display = 'block';
            document.getElementById('selectedCadetName').innerHTML = `${cadet.surname} ${cadet.name}`;
            renderTeacherGrades(cadet.id);
        };
        grid.appendChild(card);
    }
}

async function renderTeacherGrades(cadetId) {
    const cadet = getCadet(cadetId);
    if (!cadet) return;
    const tbody = document.getElementById('gradesBody');
    tbody.innerHTML = '';
    cadet.grades.forEach(subj => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = subj.subject;
        const cell = row.insertCell(1);
        const container = document.createElement('div');
        subj.grades.forEach(g => { let s = document.createElement('span'); s.className = 'grade'; s.innerText = g; container.appendChild(s); });
        cell.appendChild(container);
        row.insertCell(2).innerText = avg(subj.grades);
        const debtCount = cadet.tasks.filter(t => !t.resolved).length;
        row.insertCell(3).innerHTML = `<span style="background:#f39c12; padding:2px 10px; border-radius:20px; color:white;">${debtCount}</span>`;
        const delBtn = document.createElement('button');
        delBtn.innerText = '❌';
        delBtn.onclick = async () => { await removeLastGrade(cadetId, subj.subject); await renderTeacherGrades(cadetId); await renderCadetsGrid(); };
        row.insertCell(4).appendChild(delBtn);
    });
}

async function showTaskModal(cadetId) {
    const cadet = getCadet(cadetId);
    const modal = document.getElementById('taskModal');
    const tasksDiv = document.getElementById('tasksList');
    tasksDiv.innerHTML = '';
    cadet.tasks.forEach((task, idx) => {
        const div = document.createElement('div');
        div.innerHTML = `<strong>${task.date}</strong><br><span style="${task.resolved ? 'text-decoration:line-through; color:green' : ''}">${task.text}</span>
            <div style="float:right">${!task.resolved ? `<button class="resolveTask" data-idx="${idx}" style="background:#27ae60;">✅ Отработано</button>` : ''}
            <button class="deleteTask" data-idx="${idx}" style="background:#e74c3c;">🗑️</button></div>`;
        tasksDiv.appendChild(div);
    });
    tasksDiv.querySelectorAll('.resolveTask').forEach(btn => {
        btn.onclick = async () => { await resolveTask(cadetId, parseInt(btn.dataset.idx)); await showTaskModal(cadetId); await renderCadetsGrid(); await renderTeacherGrades(cadetId); };
    });
    tasksDiv.querySelectorAll('.deleteTask').forEach(btn => {
        btn.onclick = async () => { await deleteTask(cadetId, parseInt(btn.dataset.idx)); await showTaskModal(cadetId); await renderCadetsGrid(); await renderTeacherGrades(cadetId); };
    });
    document.getElementById('assignTaskBtn').onclick = async () => {
        const text = document.getElementById('newTaskText').value.trim();
        if (text) { await addTask(cadetId, text); document.getElementById('newTaskText').value = ''; await showTaskModal(cadetId); await renderCadetsGrid(); await renderTeacherGrades(cadetId); }
        else alert('Введите текст отработки');
    };
    modal.style.display = 'block';
}

async function renderCadetPanel(cadet) {
    document.getElementById('cadetInfo').innerHTML = `<p><strong>${cadet.surname} ${cadet.name}</strong></p>`;
    const tbody = document.getElementById('cadetGradesBody');
    tbody.innerHTML = '';
    cadet.grades.forEach(subj => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = subj.subject;
        const cell = row.insertCell(1);
        const container = document.createElement('div');
        subj.grades.forEach(g => { let s = document.createElement('span'); s.className = 'grade'; s.innerText = g; container.appendChild(s); });
        cell.appendChild(container);
        row.insertCell(2).innerText = avg(subj.grades);
    });
    const tasksDiv = document.getElementById('cadetTasksList');
    tasksDiv.innerHTML = '';
    if (cadet.tasks.length === 0) tasksDiv.innerHTML = '<p>Нет отработок.</p>';
    else cadet.tasks.forEach(task => {
        const div = document.createElement('div');
        div.style.cssText = 'border:1px solid #ccc; padding:8px; margin:5px 0; border-radius:12px;';
        div.innerHTML = `<strong>${task.date}</strong><br><span style="${task.resolved ? 'text-decoration:line-through; color:green' : ''}">${task.text}</span><span style="float:right">${task.resolved ? '✅ Отработано' : '❌ Не отработано'}</span>`;
        tasksDiv.appendChild(div);
    });
}

async function login(login, pass) {
    const user = appData.users.find(u => u.login === login && u.password === pass);
    if (!user) { document.getElementById('loginError').innerText = 'Неверный логин или пароль'; return; }
    currentUser = user;
    document.getElementById('loginForm').style.display = 'none';
    if (user.role === 'teacher') {
        document.getElementById('teacherPanel').style.display = 'block';
        document.getElementById('cadetPanel').style.display = 'none';
        await renderCadetsGrid();
        document.getElementById('gradesBlock').style.display = 'none';
        currentTeacherCadetId = null;
    } else {
        document.getElementById('teacherPanel').style.display = 'none';
        document.getElementById('cadetPanel').style.display = 'block';
        await renderCadetPanel(user);
    }
}

function logout() {
    currentUser = null;
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('teacherPanel').style.display = 'none';
    document.getElementById('cadetPanel').style.display = 'none';
    document.getElementById('loginError').innerText = '';
    document.getElementById('loginInput').value = '';
    document.getElementById('passwordInput').value = '';
}

let updateInterval = null;
function startAutoRefresh() {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(async () => {
        if (currentUser) {
            const oldData = JSON.stringify(appData);
            await loadData();
            if (JSON.stringify(appData) !== oldData) {
                if (currentUser.role === 'teacher') {
                    await renderCadetsGrid();
                    if (currentTeacherCadetId) await renderTeacherGrades(currentTeacherCadetId);
                } else {
                    const updated = appData.users.find(u => u.id === currentUser.id);
                    if (updated) await renderCadetPanel(updated);
                }
            }
        }
    }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('teacherPanel').style.display = 'none';
    document.getElementById('cadetPanel').style.display = 'none';
    await loadData();
    startAutoRefresh();

    document.getElementById('loginBtn').onclick = () => login(document.getElementById('loginInput').value.trim(), document.getElementById('passwordInput').value.trim());
    document.getElementById('logoutTeacher').onclick = logout;
    document.getElementById('logoutCadet').onclick = logout;

    document.getElementById('addCadetBtn').onclick = async () => {
        const name = document.getElementById('newName').value.trim();
        const surname = document.getElementById('newSurname').value.trim();
        const login = document.getElementById('newLogin').value.trim();
        const pass = document.getElementById('newPass').value.trim();
        if (!name || !surname || !login || !pass) { alert('Заполните все поля'); return; }
        if (await addCadet(name, surname, login, pass)) {
            alert('Курсант добавлен!');
            await renderCadetsGrid();
            document.getElementById('newName').value = '';
            document.getElementById('newSurname').value = '';
            document.getElementById('newLogin').value = '';
            document.getElementById('newPass').value = '';
        }
    };

    document.getElementById('addGradeBtn').onclick = async () => {
        if (!currentTeacherCadetId) { alert('Выберите курсанта из списка'); return; }
        const grade = parseInt(document.getElementById('newGrade').value);
        if (isNaN(grade) || grade < 2 || grade > 5) { alert('Оценка должна быть от 2 до 5'); return; }
        if (await addGrade(currentTeacherCadetId, document.getElementById('subjectForGrade').value, grade)) {
            document.getElementById('newGrade').value = '';
            await renderTeacherGrades(currentTeacherCadetId);
            await renderCadetsGrid();
        }
    };

    document.getElementById('showTaskModalBtn').onclick = () => {
        if (!currentTeacherCadetId) { alert('Выберите курсанта из списка'); return; }
        showTaskModal(currentTeacherCadetId);
    };

    const modal = document.getElementById('taskModal');
    document.querySelector('.close').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
});
