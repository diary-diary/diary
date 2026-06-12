// ============================================
// НАСТРОЙКИ - НИЧЕГО ВВОДИТЬ НЕ НАДО!
// Репозиторий определяется автоматически
// ============================================

// Автоматически получаем URL репозитория из текущей страницы
function getRepoInfo() {
    const url = window.location.href;
    // Для GitHub Pages: https://username.github.io/repo-name/
    const match = url.match(/https:\/\/([^.]+)\.github\.io\/([^\/]+)/);
    if (match) {
        return {
            owner: match[1],
            repo: match[2],
            path: 'data.json'
        };
    }
    // Если запущено локально - используем тестовые данные
    return null;
}

const repo = getRepoInfo();
const API_URL = repo ? `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${repo.path}` : null;
const RAW_URL = repo ? `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/main/${repo.path}` : null;

let appData = null;
let currentUser = null;
let currentTeacherCadetId = null;
const subjects = ["Военно Тактическая Подготовка", "Русский язык", "Юридический"];

// Обновление статуса синхронизации
function setSyncStatus(status, message) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = message;
    el.className = status;
    setTimeout(() => {
        if (document.getElementById('syncStatus').className === status) {
            document.getElementById('syncStatus').className = '';
            document.getElementById('syncStatus').textContent = '✅ Синхронизировано';
        }
    }, 2000);
}

// Загрузка данных из GitHub
async function loadData() {
    if (!RAW_URL) {
        console.log('Локальный режим - используем localStorage');
        const stored = localStorage.getItem('diary_local');
        if (stored) {
            appData = JSON.parse(stored);
        } else {
            appData = getDefaultData();
        }
        setSyncStatus('synced', '💾 Локальный режим');
        return true;
    }

    try {
        setSyncStatus('syncing', '🔄 Загрузка...');
        const response = await fetch(RAW_URL + '?t=' + Date.now());
        if (response.ok) {
            appData = await response.json();
            setSyncStatus('synced', '✅ Синхронизировано');
            return true;
        } else if (response.status === 404) {
            // Файла нет - создаём
            appData = getDefaultData();
            await saveData();
            setSyncStatus('synced', '✅ Данные созданы');
            return true;
        }
        throw new Error('Ошибка загрузки');
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        setSyncStatus('error-sync', '⚠️ Офлайн-режим');
        // В офлайн-режиме используем localStorage
        const stored = localStorage.getItem('diary_cache');
        if (stored) {
            appData = JSON.parse(stored);
        } else {
            appData = getDefaultData();
        }
        return true;
    }
}

// Сохранение данных в GitHub
async function saveData() {
    // Сохраняем кэш в localStorage
    localStorage.setItem('diary_cache', JSON.stringify(appData));
    
    if (!API_URL) {
        localStorage.setItem('diary_local', JSON.stringify(appData));
        setSyncStatus('synced', '💾 Сохранено локально');
        return true;
    }

    try {
        // Сначала получаем SHA текущего файла (для обновления)
        const getResponse = await fetch(API_URL, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        
        let sha = null;
        if (getResponse.ok) {
            const fileInfo = await getResponse.json();
            sha = fileInfo.sha;
        }
        
        // Подготавливаем содержимое в base64
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(appData, null, 2))));
        
        const body = {
            message: `Обновление данных ${new Date().toLocaleString()}`,
            content: content,
            branch: 'main'
        };
        if (sha) body.sha = sha;
        
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            setSyncStatus('synced', '✅ Сохранено на GitHub');
            return true;
        } else {
            throw new Error('Ошибка сохранения');
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        setSyncStatus('error-sync', '⚠️ Сохранено локально');
        localStorage.setItem('diary_local', JSON.stringify(appData));
        return false;
    }
}

// Начальные данные
function getDefaultData() {
    return {
        users: [
            { id: "t1", login: "teacher", password: "123", role: "teacher", name: "Преподаватель" },
            { id: "t2", login: "teacher2", password: "123", role: "teacher", name: "Преподаватель 2" },
            { id: "c1", login: "cadet", password: "123", role: "cadet", name: "Иван", surname: "Иванов",
              grades: subjects.map(s => ({ subject: s, grades: [5,4,5] })),
              tasks: [] }
        ],
        nextId: 2
    };
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
    const cadets = getCadets();
    grid.innerHTML = '';
    for (const cadet of cadets) {
        let allGrades = [];
        cadet.grades.forEach(s => allGrades.push(...s.grades));
        const totalAvg = allGrades.length ? avg(allGrades) : '—';
        const unresolved = cadet.tasks.filter(t => !t.resolved).length;
        const lastGrades = allGrades.slice(-3).join(', ');
        const card = document.createElement('div');
        card.className = 'cadet-card' + (currentTeacherCadetId === cadet.id ? ' selected' : '');
        card.innerHTML = `<h4>${cadet.surname} ${cadet.name}</h4><p>📋 ${cadet.login}</p><p>⭐ Средний балл: ${totalAvg}</p><p>⚠️ Долгов: ${unresolved}</p><div class="grades-preview">${lastGrades || 'нет'}</div><div class="badge">${allGrades.length}</div>`;
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
    }, 5000);
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
