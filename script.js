// ============================================
// ЭЛЕКТРОННЫЙ ДНЕВНИК
// Версия: локальное хранение (без серверов)
// ============================================

const STORAGE_KEY = "diary_app_data";

// Начальные данные
function getDefaultData() {
    return {
        users: [
            { id: "t1", login: "teacher", password: "123", role: "teacher", name: "Преподаватель" },
            { id: "c1", login: "cadet", password: "123", role: "cadet", name: "Иван", surname: "Иванов",
              grades: [
                  { subject: "Военно Тактическая Подготовка", grades: [5,4,5] },
                  { subject: "Русский язык", grades: [4,3,5] },
                  { subject: "Юридический", grades: [4,5,4] }
              ],
              tasks: [] }
        ],
        nextId: 2
    };
}

// Загрузка данных
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    return getDefaultData();
}

// Сохранение данных
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    document.getElementById('status').textContent = '💾 Сохранено';
    document.getElementById('status').className = 'status status-save';
    setTimeout(() => {
        document.getElementById('status').textContent = '✅ Готово';
        document.getElementById('status').className = 'status status-online';
    }, 1500);
}

let appData = loadData();
let currentUser = null;
let currentTeacherCadetId = null;

const subjects = ["Военно Тактическая Подготовка", "Русский язык", "Юридический"];

// Вспомогательные функции
function getCadet(id) {
    return appData.users.find(u => u.id === id && u.role === 'cadet');
}

function getCadets() {
    return appData.users.filter(u => u.role === 'cadet');
}

// Добавить курсанта
function addCadet(name, surname, login, password) {
    if (appData.users.some(u => u.login === login)) {
        alert('Логин уже занят!');
        return false;
    }
    const newId = 'c' + appData.nextId++;
    const newCadet = {
        id: newId,
        login: login,
        password: password,
        role: 'cadet',
        name: name,
        surname: surname,
        grades: subjects.map(s => ({ subject: s, grades: [] })),
        tasks: []
    };
    appData.users.push(newCadet);
    saveData(appData);
    return true;
}

// Добавить оценку
function addGrade(cadetId, subjectName, grade) {
    const cadet = getCadet(cadetId);
    if (!cadet) return false;
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && grade >= 2 && grade <= 5) {
        subj.grades.push(parseInt(grade));
        saveData(appData);
        return true;
    }
    return false;
}

// Удалить последнюю оценку
function removeLastGrade(cadetId, subjectName) {
    const cadet = getCadet(cadetId);
    if (!cadet) return;
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && subj.grades.length > 0) {
        subj.grades.pop();
        saveData(appData);
    }
}

// Добавить отработку
function addTask(cadetId, text) {
    const cadet = getCadet(cadetId);
    if (cadet) {
        cadet.tasks.push({
            text: text,
            resolved: false,
            date: new Date().toLocaleString()
        });
        saveData(appData);
        return true;
    }
    return false;
}

// Отметить отработку выполненной
function resolveTask(cadetId, index) {
    const cadet = getCadet(cadetId);
    if (cadet && cadet.tasks[index]) {
        cadet.tasks[index].resolved = true;
        saveData(appData);
    }
}

// Удалить отработку
function deleteTask(cadetId, index) {
    const cadet = getCadet(cadetId);
    if (cadet && cadet.tasks[index]) {
        cadet.tasks.splice(index, 1);
        saveData(appData);
    }
}

// Средний балл
function avg(grades) {
    if (!grades.length) return '—';
    const sum = grades.reduce((a, b) => a + b, 0);
    return (sum / grades.length).toFixed(1);
}

// Отрисовка списка курсантов
function renderCadetsGrid() {
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
        card.className = 'cadet-card';
        if (currentTeacherCadetId === cadet.id) card.classList.add('selected');
        
        card.innerHTML = `
            <h4>${cadet.surname} ${cadet.name}</h4>
            <p>📋 ${cadet.login}</p>
            <p>⭐ Средний балл: ${totalAvg}</p>
            <p>⚠️ Долгов: ${unresolved}</p>
            <div class="grades-preview">📝 Оценки: ${lastGrades || 'нет'}</div>
            <div class="badge">📊 Всего: ${allGrades.length}</div>
        `;
        
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

// Отрисовка таблицы оценок для преподавателя
function renderTeacherGrades(cadetId) {
    const cadet = getCadet(cadetId);
    if (!cadet) return;
    
    const tbody = document.getElementById('gradesBody');
    tbody.innerHTML = '';
    
    for (const subj of cadet.grades) {
        const row = tbody.insertRow();
        
        // Название предмета
        row.insertCell(0).innerText = subj.subject;
        
        // Оценки
        const gradesCell = row.insertCell(1);
        const container = document.createElement('div');
        for (const g of subj.grades) {
            const span = document.createElement('span');
            span.className = 'grade';
            span.innerText = g;
            container.appendChild(span);
        }
        gradesCell.appendChild(container);
        
        // Средний балл
        row.insertCell(2).innerText = avg(subj.grades);
        
        // Долги
        const debtCount = cadet.tasks.filter(t => !t.resolved).length;
        row.insertCell(3).innerHTML = `<span style="background:#f39c12; padding:2px 10px; border-radius:20px; color:white;">${debtCount}</span>`;
        
        // Кнопка удаления
        const delBtn = document.createElement('button');
        delBtn.innerText = '❌';
        delBtn.onclick = () => {
            removeLastGrade(cadetId, subj.subject);
            renderTeacherGrades(cadetId);
            renderCadetsGrid();
        };
        row.insertCell(4).appendChild(delBtn);
    }
}

// Модальное окно с отработками
function showTaskModal(cadetId) {
    const cadet = getCadet(cadetId);
    if (!cadet) return;
    
    const modal = document.getElementById('taskModal');
    const tasksDiv = document.getElementById('tasksList');
    tasksDiv.innerHTML = '';
    
    for (let i = 0; i < cadet.tasks.length; i++) {
        const task = cadet.tasks[i];
        const div = document.createElement('div');
        div.innerHTML = `
            <strong>${task.date}</strong><br>
            <span style="${task.resolved ? 'text-decoration:line-through; color:green' : ''}">${task.text}</span>
            <div style="float:right">
                ${!task.resolved ? `<button class="resolveTask" data-idx="${i}" style="background:#27ae60; margin-right:5px;">✅ Отработано</button>` : ''}
                <button class="deleteTask" data-idx="${i}" style="background:#e74c3c;">🗑️</button>
            </div>
        `;
        tasksDiv.appendChild(div);
    }
    
    // Обработчики кнопок
    tasksDiv.querySelectorAll('.resolveTask').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            resolveTask(cadetId, idx);
            showTaskModal(cadetId);
            renderCadetsGrid();
            if (currentTeacherCadetId === cadetId) renderTeacherGrades(cadetId);
        };
    });
    
    tasksDiv.querySelectorAll('.deleteTask').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            deleteTask(cadetId, idx);
            showTaskModal(cadetId);
            renderCadetsGrid();
            if (currentTeacherCadetId === cadetId) renderTeacherGrades(cadetId);
        };
    });
    
    document.getElementById('assignTaskBtn').onclick = () => {
        const text = document.getElementById('newTaskText').value.trim();
        if (text) {
            addTask(cadetId, text);
            document.getElementById('newTaskText').value = '';
            showTaskModal(cadetId);
            renderCadetsGrid();
            if (currentTeacherCadetId === cadetId) renderTeacherGrades(cadetId);
        } else {
            alert('Введите текст отработки');
        }
    };
    
    modal.style.display = 'block';
}

// Панель курсанта
function renderCadetPanel(cadet) {
    document.getElementById('cadetInfo').innerHTML = `<p><strong>${cadet.surname} ${cadet.name}</strong></p>`;
    
    // Оценки
    const tbody = document.getElementById('cadetGradesBody');
    tbody.innerHTML = '';
    
    for (const subj of cadet.grades) {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = subj.subject;
        
        const gradesCell = row.insertCell(1);
        const container = document.createElement('div');
        for (const g of subj.grades) {
            const span = document.createElement('span');
            span.className = 'grade';
            span.innerText = g;
            container.appendChild(span);
        }
        gradesCell.appendChild(container);
        
        row.insertCell(2).innerText = avg(subj.grades);
    }
    
    // Отработки
    const tasksDiv = document.getElementById('cadetTasksList');
    tasksDiv.innerHTML = '';
    
    if (cadet.tasks.length === 0) {
        tasksDiv.innerHTML = '<p>✅ Нет отработок</p>';
    } else {
        for (const task of cadet.tasks) {
            const div = document.createElement('div');
            div.style.cssText = 'border:1px solid #ddd; padding:8px; margin:8px 0; border-radius:12px;';
            div.innerHTML = `
                <strong>📅 ${task.date}</strong><br>
                <span style="${task.resolved ? 'text-decoration:line-through; color:green' : ''}">${task.text}</span>
                <span style="float:right">${task.resolved ? '✅ Выполнено' : '❌ Не выполнено'}</span>
            `;
            tasksDiv.appendChild(div);
        }
    }
}

// Авторизация
function login(login, password) {
    const user = appData.users.find(u => u.login === login && u.password === password);
    if (!user) {
        document.getElementById('loginError').innerText = 'Неверный логин или пароль';
        return false;
    }
    
    currentUser = user;
    document.getElementById('loginForm').style.display = 'none';
    
    if (user.role === 'teacher') {
        document.getElementById('teacherPanel').style.display = 'block';
        document.getElementById('cadetPanel').style.display = 'none';
        renderCadetsGrid();
        document.getElementById('gradesBlock').style.display = 'none';
        currentTeacherCadetId = null;
    } else {
        document.getElementById('teacherPanel').style.display = 'none';
        document.getElementById('cadetPanel').style.display = 'block';
        renderCadetPanel(user);
    }
    return true;
}

function logout() {
    currentUser = null;
    currentTeacherCadetId = null;
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('teacherPanel').style.display = 'none';
    document.getElementById('cadetPanel').style.display = 'none';
    document.getElementById('loginError').innerText = '';
    document.getElementById('loginInput').value = '';
    document.getElementById('passwordInput').value = '';
}

// ============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Показываем форму входа
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('teacherPanel').style.display = 'none';
    document.getElementById('cadetPanel').style.display = 'none';
    
    // Кнопка входа
    document.getElementById('loginBtn').onclick = () => {
        const loginVal = document.getElementById('loginInput').value.trim();
        const passVal = document.getElementById('passwordInput').value.trim();
        login(loginVal, passVal);
    };
    
    // Кнопки выхода
    document.getElementById('logoutTeacher').onclick = logout;
    document.getElementById('logoutCadet').onclick = logout;
    
    // Добавление курсанта
    document.getElementById('addCadetBtn').onclick = () => {
        const name = document.getElementById('newName').value.trim();
        const surname = document.getElementById('newSurname').value.trim();
        const loginVal = document.getElementById('newLogin').value.trim();
        const passVal = document.getElementById('newPass').value.trim();
        
        if (!name || !surname || !loginVal || !passVal) {
            alert('Заполните все поля');
            return;
        }
        
        if (addCadet(name, surname, loginVal, passVal)) {
            alert('Курсант добавлен!');
            renderCadetsGrid();
            document.getElementById('newName').value = '';
            document.getElementById('newSurname').value = '';
            document.getElementById('newLogin').value = '';
            document.getElementById('newPass').value = '';
        }
    };
    
    // Добавление оценки
    document.getElementById('addGradeBtn').onclick = () => {
        if (!currentTeacherCadetId) {
            alert('Выберите курсанта из списка');
            return;
        }
        
        const subject = document.getElementById('subjectForGrade').value;
        const gradeVal = document.getElementById('newGrade').value.trim();
        
        if (!gradeVal) {
            alert('Введите оценку');
            return;
        }
        
        const gradeNum = parseInt(gradeVal);
        if (isNaN(gradeNum) || gradeNum < 2 || gradeNum > 5) {
            alert('Оценка должна быть от 2 до 5');
            return;
        }
        
        if (addGrade(currentTeacherCadetId, subject, gradeNum)) {
            document.getElementById('newGrade').value = '';
            renderTeacherGrades(currentTeacherCadetId);
            renderCadetsGrid();
        }
    };
    
    // Кнопка отработок
    document.getElementById('showTaskModalBtn').onclick = () => {
        if (!currentTeacherCadetId) {
            alert('Выберите курсанта из списка');
            return;
        }
        showTaskModal(currentTeacherCadetId);
    };
    
    // Закрытие модального окна
    const modal = document.getElementById('taskModal');
    document.querySelector('.close').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
});
