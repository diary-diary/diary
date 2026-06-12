<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Подключение к SQLite базе данных
$dbFile = __DIR__ . '/database.sqlite';
$db = new SQLite3($dbFile);

// Создание таблиц, если их нет
$db->exec("
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE,
        password TEXT,
        role TEXT,
        name TEXT
    )
");

$db->exec("
    CREATE TABLE IF NOT EXISTS cadets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        surname TEXT,
        name TEXT,
        patronymic TEXT,
        grades TEXT
    )
");

// Добавление тестового преподавателя, если нет
$check = $db->querySingle("SELECT COUNT(*) FROM users WHERE login='teacher'");
if (!$check) {
    $db->exec("INSERT INTO users (login, password, role, name) VALUES ('teacher', '123', 'teacher', 'Преподаватель')");
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

function response($success, $data = null, $error = null) {
    echo json_encode(['success' => $success, 'data' => $data, 'error' => $error]);
    exit;
}

switch ($action) {
    case 'getAll':
        $result = $db->query("SELECT * FROM cadets ORDER BY id");
        $cadets = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $row['grades'] = json_decode($row['grades'], true) ?: [];
            $cadets[] = $row;
        }
        response(true, ['cadets' => $cadets]);
        break;
        
    case 'addCadet':
        $surname = $input['surname'] ?? '';
        $name = $input['name'] ?? '';
        $patronymic = $input['patronymic'] ?? '';
        $defaultGrades = json_encode([
            "Военно Тактическая Подготовка" => [],
            "Русский язык" => [],
            "Юридический" => []
        ]);
        $stmt = $db->prepare("INSERT INTO cadets (surname, name, patronymic, grades) VALUES (:surname, :name, :patronymic, :grades)");
        $stmt->bindValue(':surname', $surname, SQLITE3_TEXT);
        $stmt->bindValue(':name', $name, SQLITE3_TEXT);
        $stmt->bindValue(':patronymic', $patronymic, SQLITE3_TEXT);
        $stmt->bindValue(':grades', $defaultGrades, SQLITE3_TEXT);
        $stmt->execute();
        response(true);
        break;
        
    case 'deleteCadet':
        $id = $input['id'] ?? 0;
        $stmt = $db->prepare("DELETE FROM cadets WHERE id = :id");
        $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
        $stmt->execute();
        response(true);
        break;
        
    case 'addMark':
        $cadetId = $input['cadetId'] ?? 0;
        $subject = $input['subject'] ?? '';
        $mark = $input['mark'] ?? '';
        
        $result = $db->querySingle("SELECT grades FROM cadets WHERE id = $cadetId", true);
        if ($result) {
            $grades = json_decode($result['grades'], true);
            if (!isset($grades[$subject])) $grades[$subject] = [];
            $grades[$subject][] = $mark;
            $newGrades = json_encode($grades);
            $stmt = $db->prepare("UPDATE cadets SET grades = :grades WHERE id = :id");
            $stmt->bindValue(':grades', $newGrades, SQLITE3_TEXT);
            $stmt->bindValue(':id', $cadetId, SQLITE3_INTEGER);
            $stmt->execute();
            response(true);
        } else {
            response(false, null, 'Курсант не найден');
        }
        break;
        
    case 'deleteMark':
        $cadetId = $input['cadetId'] ?? 0;
        $subject = $input['subject'] ?? '';
        $index = $input['index'] ?? -1;
        
        $result = $db->querySingle("SELECT grades FROM cadets WHERE id = $cadetId", true);
        if ($result && $index >= 0) {
            $grades = json_decode($result['grades'], true);
            if (isset($grades[$subject]) && isset($grades[$subject][$index])) {
                array_splice($grades[$subject], $index, 1);
                $newGrades = json_encode($grades);
                $stmt = $db->prepare("UPDATE cadets SET grades = :grades WHERE id = :id");
                $stmt->bindValue(':grades', $newGrades, SQLITE3_TEXT);
                $stmt->bindValue(':id', $cadetId, SQLITE3_INTEGER);
                $stmt->execute();
                response(true);
            } else {
                response(false, null, 'Оценка не найдена');
            }
        } else {
            response(false, null, 'Курсант не найден');
        }
        break;
        
    case 'removeLastMark':
        $cadetId = $input['cadetId'] ?? 0;
        $subject = $input['subject'] ?? '';
        
        $result = $db->querySingle("SELECT grades FROM cadets WHERE id = $cadetId", true);
        if ($result) {
            $grades = json_decode($result['grades'], true);
            if (isset($grades[$subject]) && count($grades[$subject]) > 0) {
                array_pop($grades[$subject]);
                $newGrades = json_encode($grades);
                $stmt = $db->prepare("UPDATE cadets SET grades = :grades WHERE id = :id");
                $stmt->bindValue(':grades', $newGrades, SQLITE3_TEXT);
                $stmt->bindValue(':id', $cadetId, SQLITE3_INTEGER);
                $stmt->execute();
                response(true);
            } else {
                response(true); // Нет оценок для удаления
            }
        } else {
            response(false, null, 'Курсант не найден');
        }
        break;
        
    default:
        response(false, null, 'Неизвестное действие');
}
?>
