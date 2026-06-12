// ------------------- РАБОТА С ХРАНИЛИЩЕМ -------------------
const STORAGE_KEY = "diary_app_data";

// Загрузка данных из localStorage
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    } else {
        // Начальные данные при первом запуске
        return {
            users: [
                {
                    id: "t1",
                    login: "teacher",
                    password: "123",
                    role: "teacher",
                    name: "Преподаватель"
                },
                {
                    id: "c1",
                    login: "cadet",
                    password: "123",
                    role: "cadet",
                    name: "Иван",
                    surname: "Иванов",
                    class: "9А",
                    grades: [
                        { subject: "Военно Тактическая Подготовка", grades: [5,4,5] },
                        { subject: "Русский язык", grades: [4,3,5] },
                        { subject: "Юридический", grades: [4,5,4] }
                    ]
                }
            ]
        };
    }
}

// Сохранение данных в localStorage
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Глобальный объект данных
let appData = loadData();
let users = appData.users;
let currentUser = null;
let currentCadetId = null;

const subjects = ["Военно Тактическая Подготовка", "Русский язык", "Юридический"];

// Вспомогательные функции
function getCadetById(id) {
    return users.find(u => u.id === id && u.role === "cadet");
}

function saveUsersToStorage() {
    appData.users = users;
    saveData(appData);
}

// Добавление курсанта
function addCadet(name, surname, className, login, password) {
    if (users.some(u => u.login === login)) {
        alert("Логин уже занят!");
        return false;
    }
    const newId = "c" + Date.now();
    const newCadet = {
        id: newId,
        login: login,
        password: password,
        role: "cadet",
        name: name,
        surname: surname,
        class: className,
        grades: subjects.map(s => ({ subject: s, grades: [] }))
    };
    users.push(newCadet);
    saveUsersToStorage();
    return true;
}

// Добавление оценки
function addGradeToCadet(cadetId, subjectName, grade) {
    const cadet = getCadetById(cadetId);
    if (!cadet) return false;
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && grade >= 2 && grade <= 5) {
        subj.grades.push(parseInt(grade));
        saveUsersToStorage();
        return true;
    }
    return false;
}

// Удаление последней оценки
function removeLastGrade(cadetId, subjectName) {
    const cadet = getCadetById(cadetId);
    if (!cadet) return;
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && subj.grades.length > 0) {
        subj.grades.pop();
        saveUsersToStorage();
    }
}

// Средний балл
function avg(grades) {
    if (!grades.length) return "—";
    return (grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1);
}

// ------------------- ОТРИСОВКА -------------------
function renderTeacherGrades(cadet) {
    const tbody = document.getElementById("gradesBody");
    tbody.innerHTML = "";
    if (!cadet || !cadet.grades) return;
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
        const delBtn = document.createElement("button");
        delBtn.innerText = "❌";
        delBtn.style.margin = "0";
        delBtn.onclick = () => {
            removeLastGrade(cadet.id, subj.subject);
            const updated = getCadetById(cadet.id);
            renderTeacherGrades(updated);
        };
        const actionCell = row.insertCell(3);
        actionCell.appendChild(delBtn);
    });
}

function renderCadetGrades(cadet) {
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
}

function updateCadetSelect() {
    const select = document.getElementById("cadetSelect");
    select.innerHTML = '<option value="">-- Выберите --</option>';
    const cadets = users.filter(u => u.role === "cadet");
    cadets.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.innerText = `${c.surname} ${c.name} (${c.class})`;
        select.appendChild(opt);
    });
}

// ------------------- УПРАВЛЕНИЕ ЭКРАНАМИ -------------------
function showLogin() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("teacherPanel").style.display = "none";
    document.getElementById("cadetPanel").style.display = "none";
    document.getElementById("errorMsg").innerText = "";
}

function showTeacher() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("teacherPanel").style.display = "block";
    document.getElementById("cadetPanel").style.display = "none";
    document.getElementById("gradesBlock").style.display = "none";
    updateCadetSelect();
}

function showCadet(cadet) {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("teacherPanel").style.display = "none";
    document.getElementById("cadetPanel").style.display = "block";
    document.getElementById("cadetInfo").innerHTML = `<p><strong>${cadet.surname} ${cadet.name}, ${cadet.class}</strong></p>`;
    renderCadetGrades(cadet);
}

// ------------------- АВТОРИЗАЦИЯ -------------------
function login(login, password) {
    const user = users.find(u => u.login === login && u.password === password);
    if (!user) {
        document.getElementById("errorMsg").innerText = "Неверный логин или пароль!";
        return false;
    }
    currentUser = user;
    if (user.role === "teacher") {
        showTeacher();
    } else {
        showCadet(user);
    }
    return true;
}

// ------------------- ЗАПУСК ПРИ ЗАГРУЗКЕ -------------------
document.addEventListener("DOMContentLoaded", () => {
    showLogin();

    // Кнопка входа
    document.getElementById("doLogin").onclick = () => {
        const log = document.getElementById("login").value.trim();
        const pass = document.getElementById("password").value.trim();
        login(log, pass);
    };

    // Выход
    document.getElementById("logoutTeacher").onclick = () => {
        currentUser = null;
        showLogin();
    };
    document.getElementById("logoutCadet").onclick = () => {
        currentUser = null;
        showLogin();
    };

    // Добавление курсанта
    document.getElementById("addCadetBtn").onclick = () => {
        const name = document.getElementById("newName").value.trim();
        const surname = document.getElementById("newSurname").value.trim();
        const className = document.getElementById("newClass").value.trim();
        const login = document.getElementById("newLogin").value.trim();
        const pass = document.getElementById("newPass").value.trim();
        if (!name || !surname || !className || !login || !pass) {
            alert("Заполните все поля!");
            return;
        }
        if (addCadet(name, surname, className, login, pass)) {
            alert("Курсант добавлен!");
            updateCadetSelect();
            document.getElementById("newName").value = "";
            document.getElementById("newSurname").value = "";
            document.getElementById("newClass").value = "";
            document.getElementById("newLogin").value = "";
            document.getElementById("newPass").value = "";
        } else {
            alert("Ошибка добавления");
        }
    };

    // Загрузка оценок выбранного курсанта
    document.getElementById("loadGradesBtn").onclick = () => {
        const cadetId = document.getElementById("cadetSelect").value;
        if (!cadetId) {
            alert("Выберите курсанта");
            return;
        }
        currentCadetId = cadetId;
        const cadet = getCadetById(cadetId);
        if (cadet) {
            document.getElementById("gradesBlock").style.display = "block";
            document.getElementById("selectedCadetName").innerHTML = `${cadet.surname} ${cadet.name} (${cadet.class})`;
            renderTeacherGrades(cadet);
        } else {
            alert("Курсант не найден");
        }
    };

    // Добавление оценки
    document.getElementById("addGradeBtn").onclick = () => {
        if (!currentCadetId) {
            alert("Сначала выберите курсанта и нажмите 'Загрузить оценки'");
            return;
        }
        const subject = document.getElementById("subjectForGrade").value;
        const gradeVal = document.getElementById("newGrade").value.trim();
        if (!gradeVal) {
            alert("Введите оценку (2-5)");
            return;
        }
        const gradeNum = parseInt(gradeVal);
        if (isNaN(gradeNum) || gradeNum < 2 || gradeNum > 5) {
            alert("Оценка должна быть от 2 до 5");
            return;
        }
        if (addGradeToCadet(currentCadetId, subject, gradeNum)) {
            document.getElementById("newGrade").value = "";
            const cadet = getCadetById(currentCadetId);
            renderTeacherGrades(cadet);
        } else {
            alert("Ошибка добавления");
        }
    };
});
