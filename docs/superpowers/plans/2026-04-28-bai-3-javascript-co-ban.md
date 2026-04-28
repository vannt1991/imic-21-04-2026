# Buoi 3 JavaScript Co Ban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tao mot thu muc `bai_3` co trang trinh chieu truc tiep ve JavaScript co ban, kem `main.js` chua bo bai tap nen tang va demo tuong tac.

**Architecture:** Toan bo noi dung buoi hoc duoc dong goi trong `bai_3` de mo truc tiep tu `bai_3/index.html`. Trang dung bo cuc dang slide/section de giao vien dieu huong theo tung phan, `style.css` rieng de giu giao dien on dinh, va `main.js` cung cap cac ham mau cho bien, dieu kien, vong lap, function, array/object va bai tap quan ly sinh vien.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript.

---

### Task 1: Tao khung trang trinh chieu

**Files:**
- Create: `bai_3/index.html`

- [ ] **Step 1: Viet khung HTML day du**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buoi 3 - JavaScript co ban</title>
  <link rel="stylesheet" href="./style.css">
  <script defer src="./main.js"></script>
</head>
<body>
  <header class="hero">
    <div class="container hero-layout">
      <div class="hero-copy">
        <p class="eyebrow">Buoi 3 · JavaScript co ban</p>
        <h1>Bien, dieu kien, vong lap, ham</h1>
        <p class="hero-text">Trang nay dung de trinh chieu truc tiep trong lop, tap trung vao logic JavaScript co ban va cac bai tap mau.</p>
      </div>
    </div>
  </header>
</body>
</html>
```

- [ ] **Step 2: Mo file trong trinh duyet de kiem tra co the load truc tiep**

Run: `open bai_3/index.html`
Expected: Trang HTML hien thi tieu de buoi hoc va khong bao loi tai trang.

- [ ] **Step 3: Lien ket style va script cua thu muc con**

```html
<link rel="stylesheet" href="./style.css">
<script defer src="./main.js"></script>
```

- [ ] **Step 4: Kiem tra lai duong dan tu goc repo**

Run: `open bai_3/index.html`
Expected: Duong dan CSS/JS dung vi cung nam trong `bai_3`.

- [ ] **Step 5: Luu thay doi**

```bash
git add bai_3/index.html
git commit -m "feat: add bai 3 presentation shell"
```

### Task 2: Tao giao dien trinh chieu

**Files:**
- Create: `bai_3/style.css`

- [ ] **Step 1: Viet bo cuc va mau chu de rieng**

```css
:root {
  --bg: #f4efe6;
  --surface: rgba(255, 255, 255, 0.82);
  --text: #172033;
  --muted: #5b6677;
  --primary: #1d4ed8;
  --accent: #f97316;
  --line: rgba(29, 78, 216, 0.12);
}
```

- [ ] **Step 2: Tao style cho hero, nav, section, card, button va code block**

```css
.hero { padding: 72px 0 28px; }
.hero-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); gap: 24px; }
.section { padding: 32px; margin-top: 24px; border-radius: 28px; background: rgba(255, 255, 255, 0.42); border: 1px solid var(--line); }
.card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border-radius: 999px; text-decoration: none; }
.button-primary { background: var(--primary); color: #fff; }
```

- [ ] **Step 3: Kiem tra responsive cho desktop va mobile**

Run: `open bai_3/index.html`
Expected: Hero cap nhat theo man hinh, section khong vo bo cuc o do rong nho.

- [ ] **Step 4: Kiem tra do ro cua code block va output panel**

Run: `open bai_3/index.html`
Expected: Code block de doc, chu dong nhat quan, cac khoi demo khong bi sat le.

- [ ] **Step 5: Luu thay doi**

```bash
git add bai_3/style.css
git commit -m "feat: style bai 3 lesson page"
```

### Task 3: Tao main.js cho bai tap va demo

**Files:**
- Create: `bai_3/main.js`

- [ ] **Step 1: Viet cac ham mau cho bien, dieu kien, vong lap, function, array, object**

```javascript
function calculateAverage(scores) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return 0;
  }

  const total = scores.reduce((sum, score) => sum + Number(score), 0);
  return Number((total / scores.length).toFixed(2));
}

function isEven(number) {
  return Number(number) % 2 === 0;
}

function findMax(numbers) {
  return Math.max(...numbers);
}
```

- [ ] **Step 2: Viet ham quan ly danh sach sinh vien**

```javascript
function addStudent(students, student) {
  return [...students, student];
}

function updateStudent(students, id, updates) {
  return students.map((student) =>
    student.id === id ? { ...student, ...updates } : student
  );
}

function deleteStudent(students, id) {
  return students.filter((student) => student.id !== id);
}
```

- [ ] **Step 3: Tao demo output va gan su kien button**

```javascript
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-demo]");
  if (!button) return;

  renderDemo(button.dataset.demo);
});
```

- [ ] **Step 4: Expose cac ham mau ra `window.bai3` de giao vien mo Console demo nhanh**

```javascript
window.bai3 = {
  calculateAverage,
  isEven,
  findMax,
  addStudent,
  updateStudent,
  deleteStudent
};
```

- [ ] **Step 5: Kiem tra output tren trang**

Run: `open bai_3/index.html`
Expected: Nut demo cap nhat ket qua trung binh, chan/le, max va danh sach san pham.

- [ ] **Step 6: Luu thay doi**

```bash
git add bai_3/main.js
git commit -m "feat: add bai 3 javascript exercises"
```

### Task 4: Kiem tra hoan chinh

**Files:**
- Test: `bai_3/index.html`

- [ ] **Step 1: Mo lai trang va soat noi dung**

Run: `open bai_3/index.html`
Expected: Trang hien thi day du muc tieu, noi dung chinh, thuc hanh va bai tap ve nha.

- [ ] **Step 2: Kiem tra duong dan file**

Run: `find bai_3 -maxdepth 1 -type f | sort`
Expected: Co `index.html`, `style.css`, `main.js`.

- [ ] **Step 3: Luu neu can commit tong**

```bash
git add bai_3
git commit -m "feat: add bai 3 javascript lesson"
```
