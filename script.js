// ------------------- ХРАНИЛИЩЕ -------------------
const STORAGE_KEY = "diary_system";

// Структура по умолчанию (преподаватель + один курсант)
const defaultData = {
    users: [
        { id: "t1", login: "teacher", password: "123", role: "teacher", name: "Преподаватель" },
        { id: "c1", login: "cadet", password: "123", role: "cadet", name: "Иван", surname: "Иванов",
          grades: [
              { subject: "Военно Тактическая Подготовка", grades: [5,4,5] },
              { subject: "Русский язык", grades: [4,3,5] },
              { subject: "Юридический", grades: [4,5,4] }
          ],
          tasks: []  // массив { text, resolved, date }
        }
    ],
    nextId: 2
};

// Загрузка данных
let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData;
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

const subjects = ["Военно Тактическая Подготовка", "Русский язык", "Юридический"];

// Получить курсанта по id
function getCadet(id) {
    return appData.users.find(u => u.id === id && u.role === "cadet");
}

// Добавить курсанта
function addCadet(name, surname, login, password) {
    if (appData.users.some(u => u.login === login)) {
        alert("Логин уже занят!");
        return false;
    }
    const newId = "c" + appData.nextId++;
    const newCadet = {
        id: newId,
        login, password,
        role: "cadet",
        name, surname,
        grades: subjects.map(s => ({ subject: s, grades: [] })),
        tasks: []
    };
    appData.users.push(newCadet);
    saveData();
    return true;
}

// Добавить оценку
function addGrade(cadetId, subjectName, grade) {
    const cadet = getCadet(cadetId);
    if (!cadet) return false;
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && grade >= 2 && grade <= 5) {
        subj.grades.push(parseInt(grade));
        saveData();
        return true;
    }
    return false;
}

// Удалить последнюю оценку
function removeLastGrade(cadetId, subjectName) {
    const cadet = getCadet(cadetId);
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && subj.grades.length) {
        subj.grades.pop();
        saveData();
    }
}

// Добавить отработку
function addTask(cadetId, text) {
    const cadet = getCadet(cadetId);
    if (cadet) {
        cadet.tasks.push({ text, resolved: false, date: new Date().toLocaleString() });
        saveData();
        return true;
    }
    return false;
}

// Отметить отработку выполненной
function resolveTask(cadetId, index) {
    const cadet = getCadet(cadetId);
    if (cadet && cadet.tasks[index]) {
        cadet.tasks[index].resolved = true;
        saveData();
    }
}

// Удалить отработку
function deleteTask(cadetId, index) {
    const cadet = getCadet(cadetId);
    if (cadet && cadet.tasks[index]) {
        cadet.tasks.splice(index, 1);
        saveData();
    }
}

// Средний балл
function avg(grades) {
    if (!grades.length) return "—";
    return (grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1);
}

// ------------------- ОТРИСОВКА UI (преподаватель) -------------------
let currentTeacherCadetId = null;

function renderCadetsGrid() {
    const grid = document.getElementById("cadetsGrid");
    if (!grid) return;
    const cadets = appData.users.filter(u => u.role === "cadet");
    grid.innerHTML = "";
    cadets.forEach(cadet => {
        // Вычисляем общий средний балл
        let allGrades = [];
        cadet.grades.forEach(s => allGrades.push(...s.grades));
        const totalAvg = allGrades.length ? avg(allGrades) : "—";
        const unresolvedTasks = cadet.tasks.filter(t => !t.resolved).length;
        
        const card = document.createElement("div");
        card.className = "cadet-card";
        if (currentTeacherCadetId === cadet.id) card.classList.add("selected");
        card.innerHTML = `
            <h4>${cadet.surname} ${cadet.name}</h4>
            <p>📋 Логин: ${cadet.login}</p>
            <p>⭐ Средний балл: ${totalAvg}</p>
            <p>⚠️ Долгов: ${unresolvedTasks}</p>
            <div class="badge">Оценок: ${allGrades.length}</div>
        `;
        card.onclick = () => {
            document.querySelectorAll(".cadet-card").forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            currentTeacherCadetId = cadet.id;
            document.getElementById("gradesBlock").style.display = "block";
            document.getElementById("selectedCadetName").innerHTML = `${cadet.surname} ${cadet.name}`;
            renderTeacherGrades(cadet.id);
        };
        grid.appendChild(card);
    });
}

function renderTeacherGrades(cadetId) {
    const cadet = getCadet(cadetId);
    if (!cadet) return;
    const tbody = document.getElementById("gradesBody");
    tbody.innerHTML = "";
    cadet.grades.forEach(subj => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = subj.subject;
        // Оценки
        const gradesCell = row.insertCell(1);
        const container = document.createElement("div");
        subj.grades.forEach(g => {
            const span = document.createElement("span");
            span.className = "grade";
            span.innerText = g;
            container.appendChild(span);
        });
        gradesCell.appendChild(container);
        // Средний балл
        row.insertCell(2).innerText = avg(subj.grades);
        // Количество долгов (не используется в этой таблице, можно пропустить)
        const tasksCount = cadet.tasks.filter(t => !t.resolved).length;
        row.insertCell(3).innerHTML = `<span style="background:#f39c12; padding:2px 8px; border-radius:20px;">${tasksCount}</span>`;
        // Кнопка удалить оценку
        const delBtn = document.createElement("button");
        delBtn.innerText = "❌";
        delBtn.onclick = () => {
            removeLastGrade(cadetId, subj.subject);
            renderTeacherGrades(cadetId);
            renderCadetsGrid(); // обновить средние баллы в карточках
        };
        const actionCell = row.insertCell(4);
        actionCell.appendChild(delBtn);
    });
}

// Модальное окно с отработками для преподавателя
function showTaskModal(cadetId) {
    const cadet = getCadet(cadetId);
    if (!cadet) return;
    const modal = document.getElementById("taskModal");
    const tasksDiv = document.getElementById("tasksList");
    tasksDiv.innerHTML = "";
    cadet.tasks.forEach((task, idx) => {
        const div = document.createElement("div");
        div.innerHTML = `
            <strong>${task.date}</strong><br>
            <span style="${task.resolved ? 'text-decoration:line-through; color:green' : ''}">${task.text}</span>
            <div style="float:right">
                ${!task.resolved ? `<button class="resolveTask" data-idx="${idx}">✅ Отработано</button>` : ""}
                <button class="deleteTask" data-idx="${idx}">🗑️</button>
            </div>
        `;
        tasksDiv.appendChild(div);
    });
    // Навешиваем обработчики
    tasksDiv.querySelectorAll(".resolveTask").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            resolveTask(cadetId, idx);
            showTaskModal(cadetId);
            renderCadetsGrid();
            renderTeacherGrades(cadetId);
        };
    });
    tasksDiv.querySelectorAll(".deleteTask").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            deleteTask(cadetId, idx);
            showTaskModal(cadetId);
            renderCadetsGrid();
            renderTeacherGrades(cadetId);
        };
    });
    modal.style.display = "block";
    document.getElementById("assignTaskBtn").onclick = () => {
        const text = document.getElementById("newTaskText").value.trim();
        if (text) {
            addTask(cadetId, text);
            document.getElementById("newTaskText").value = "";
            showTaskModal(cadetId);
            renderCadetsGrid();
            renderTeacherGrades(cadetId);
        } else alert("Введите текст");
    };
}

// ------------------- ПАНЕЛЬ КУРСАНТА -------------------
function renderCadetPanel(cadet) {
    document.getElementById("cadetInfo").innerHTML = `<p><strong>${cadet.surname} ${cadet.name}</strong></p>`;
    // Оценки
    const tbody = document.getElementById("cadetGradesBody");
    tbody.innerHTML = "";
    cadet.grades.forEach(subj => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = subj.subject;
        const gradesCell = row.insertCell(1);
        const container = document.createElement("div");
        subj.grades.forEach(g => {
            const span = document.createElement("span");
            span.className = "grade";
            span.innerText = g;
            container.appendChild(span);
        });
        gradesCell.appendChild(container);
        row.insertCell(2).innerText = avg(subj.grades);
    });
    // Отработки
    const tasksDiv = document.getElementById("cadetTasksList");
    tasksDiv.innerHTML = "";
    if (cadet.tasks.length === 0) {
        tasksDiv.innerHTML = "<p>Нет отработок.</p>";
    } else {
        cadet.tasks.forEach(task => {
            const div = document.createElement("div");
            div.style.border = "1px solid #ccc";
            div.style.padding = "8px";
            div.style.margin = "5px 0";
            div.style.borderRadius = "12px";
            div.innerHTML = `
                <strong>${task.date}</strong><br>
                <span style="${task.resolved ? 'text-decoration:line-through; color:green' : ''}">${task.text}</span>
                <span style="float:right">${task.resolved ? "✅ Отработано" : "❌ Не отработано"}</span>
            `;
            tasksDiv.appendChild(div);
        });
    }
}

// ------------------- АВТОРИЗАЦИЯ -------------------
let currentUser = null;

function login(login, password) {
    const user = appData.users.find(u => u.login === login && u.password === password);
    if (!user) {
        document.getElementById("loginError").innerText = "Неверный логин или пароль";
        return false;
    }
    currentUser = user;
    document.getElementById("loginForm").style.display = "none";
    if (user.role === "teacher") {
        document.getElementById("teacherPanel").style.display = "block";
        document.getElementById("cadetPanel").style.display = "none";
        renderCadetsGrid();
        document.getElementById("gradesBlock").style.display = "none";
        currentTeacherCadetId = null;
    } else {
        document.getElementById("teacherPanel").style.display = "none";
        document.getElementById("cadetPanel").style.display = "block";
        renderCadetPanel(user);
    }
    return true;
}

function logout() {
    currentUser = null;
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("teacherPanel").style.display = "none";
    document.getElementById("cadetPanel").style.display = "none";
    document.getElementById("loginError").innerText = "";
    document.getElementById("loginInput").value = "";
    document.getElementById("passwordInput").value = "";
}

// ------------------- ЗАПУСК -------------------
document.addEventListener("DOMContentLoaded", () => {
    // Показать форму входа
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("teacherPanel").style.display = "none";
    document.getElementById("cadetPanel").style.display = "none";

    // Кнопка входа
    document.getElementById("loginBtn").onclick = () => {
        const loginVal = document.getElementById("loginInput").value.trim();
        const passVal = document.getElementById("passwordInput").value.trim();
        login(loginVal, passVal);
    };

    // Выход
    document.getElementById("logoutTeacher").onclick = logout;
    document.getElementById("logoutCadet").onclick = logout;

    // Добавление курсанта
    document.getElementById("addCadetBtn").onclick = () => {
        const name = document.getElementById("newName").value.trim();
        const surname = document.getElementById("newSurname").value.trim();
        const login = document.getElementById("newLogin").value.trim();
        const pass = document.getElementById("newPass").value.trim();
        if (!name || !surname || !login || !pass) {
            alert("Заполните все поля");
            return;
        }
        if (addCadet(name, surname, login, pass)) {
            alert("Курсант добавлен");
            renderCadetsGrid();
            document.getElementById("newName").value = "";
            document.getElementById("newSurname").value = "";
            document.getElementById("newLogin").value = "";
            document.getElementById("newPass").value = "";
        } else {
            alert("Логин уже существует");
        }
    };

    // Добавление оценки
    document.getElementById("addGradeBtn").onclick = () => {
        if (!currentTeacherCadetId) {
            alert("Выберите курсанта из списка");
            return;
        }
        const subject = document.getElementById("subjectForGrade").value;
        const gradeVal = document.getElementById("newGrade").value.trim();
        if (!gradeVal) return alert("Введите оценку");
        const gradeNum = parseInt(gradeVal);
        if (isNaN(gradeNum) || gradeNum < 2 || gradeNum > 5) return alert("Оценка от 2 до 5");
        if (addGrade(currentTeacherCadetId, subject, gradeNum)) {
            document.getElementById("newGrade").value = "";
            renderTeacherGrades(currentTeacherCadetId);
            renderCadetsGrid(); // обновить средние баллы в карточках
        } else alert("Ошибка");
    };

    // Кнопка отработок
    document.getElementById("showTaskModalBtn").onclick = () => {
        if (!currentTeacherCadetId) {
            alert("Выберите курсанта");
            return;
        }
        showTaskModal(currentTeacherCadetId);
    };

    // Закрытие модального окна
    const modal = document.getElementById("taskModal");
    document.querySelector(".close").onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
});
