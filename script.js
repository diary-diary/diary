// ----- НАЧАЛЬНЫЕ ДАННЫЕ -----
let users = [];      // массив пользователей
let currentUser = null;
let currentCadetId = null;

// Предметы по умолчанию
const subjects = ["Военно Тактическая Подготовка", "Русский язык", "Юридический"];

// Инициализация данных (если нет в localStorage)
function initData() {
    const stored = localStorage.getItem("diary_app");
    if (stored) {
        users = JSON.parse(stored);
        return;
    }
    // Первый запуск: создаём преподавателя и одного курсанта
    users = [
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
    ];
    saveData();
}

function saveData() {
    localStorage.setItem("diary_app", JSON.stringify(users));
}

// Найти курсанта по id
function getCadetById(id) {
    return users.find(u => u.id === id && u.role === "cadet");
}

// Добавить курсанта
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
    saveData();
    return true;
}

// Добавить оценку курсанту
function addGradeToCadet(cadetId, subjectName, grade) {
    const cadet = getCadetById(cadetId);
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
    const cadet = getCadetById(cadetId);
    if (!cadet) return;
    const subj = cadet.grades.find(g => g.subject === subjectName);
    if (subj && subj.grades.length > 0) {
        subj.grades.pop();
        saveData();
    }
}

// Вычисление среднего
function avg(grades) {
    if (!grades.length) return "—";
    return (grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1);
}

// Отрисовка таблицы для преподавателя
function renderTeacherGrades(cadet) {
    const tbody = document.getElementById("gradesBody");
    tbody.innerHTML = "";
    if (!cadet || !cadet.grades) return;
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
        row.insertCell(2).innerText = avg(subj.grades);
        // Кнопка удалить последнюю
        const delBtn = document.createElement("button");
        delBtn.innerText = "❌";
        delBtn.style.margin = "0";
        delBtn.onclick = () => {
            removeLastGrade(cadet.id, subj.subject);
            renderTeacherGrades(getCadetById(cadet.id));
        };
        const actionCell = row.insertCell(3);
        actionCell.appendChild(delBtn);
    });
}

// Отрисовка для курсанта
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

// Обновить выпадающий список курсантов
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

// ----- УПРАВЛЕНИЕ ЭКРАНАМИ -----
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

// ----- АВТОРИЗАЦИЯ -----
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

// ----- ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ -----
document.addEventListener("DOMContentLoaded", () => {
    initData();
    showLogin();

    // Кнопка входа
    document.getElementById("doLogin").onclick = () => {
        const log = document.getElementById("login").value.trim();
        const pass = document.getElementById("password").value.trim();
        login(log, pass);
    };

    // Выход для преподавателя
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