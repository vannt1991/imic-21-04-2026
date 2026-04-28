(function (root, factory) {
  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.bai3 = api;

  if (api.init) {
    api.init();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (root) {
  const doc = root.document && typeof root.document.getElementById === "function" ? root.document : null;

  const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

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
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return null;
    }

    return numbers.reduce((max, current) => (current > max ? current : max), numbers[0]);
  }

  function formatProducts(products) {
    return products
      .map((product, index) => {
        const availability = product.stock > 0 ? "Còn hàng" : "Hết hàng";
        return `${index + 1}. ${product.name} - ${currencyFormatter.format(product.price)} - ${availability}`;
      })
      .join("\n");
  }

  function addStudent(students, student) {
    return [...students, student];
  }

  function updateStudent(students, id, updates) {
    return students.map((student) => {
      if (student.id !== id) {
        return student;
      }

      return { ...student, ...updates };
    });
  }

  function deleteStudent(students, id) {
    return students.filter((student) => student.id !== id);
  }

  function formatListOutput(items) {
    return items.map((item) => `- ${item}`).join("\n");
  }

  function formatObjectOutput(entries) {
    return entries.map(([key, value]) => `${key}: ${value}`).join("\n");
  }

  function renderDemo(key) {
    if (!doc) {
      return;
    }

    const output = doc.getElementById("demo-output");
    if (!output) {
      return;
    }

    const demos = {
      ifelse: {
        title: "Demo if/else",
        summary: "Dùng if/else để tách 2 nhánh xử lý đơn giản.",
        result: "Ngày thường",
        bullets: [
          "Dữ liệu đầu vào: day = 2",
          "Điều kiện: nếu day === 1 thì là Chủ nhật, còn lại là Ngày thường.",
          "Dùng khi bài toán có 2 hoặc vài nhánh rẽ rõ ràng.",
        ],
        code: `const day = 2;

if (day === 1) {
  console.log("Chủ nhật");
} else {
  console.log("Ngày thường");
}`,
      },
      switch: {
        title: "Demo switch case",
        summary: "Dùng switch khi cần so sánh một giá trị với nhiều trường hợp.",
        result: "Thứ ba",
        bullets: [
          "Dữ liệu đầu vào: day = 2",
          "Mỗi case tương ứng một giá trị cụ thể.",
          "Thường đi kèm break để dừng đúng nhánh cần chạy.",
        ],
        code: `const day = 2;
let label = "";

switch (day) {
  case 1:
    label = "Chủ nhật";
    break;
  case 2:
    label = "Thứ hai";
    break;
  case 3:
    label = "Thứ ba";
    break;
  default:
    label = "Không hợp lệ";
}`,
      },
      for: {
        title: "Demo vòng lặp for",
        summary: "Dùng for khi biết trước số lần lặp hoặc muốn duyệt theo chỉ số.",
        result: formatListOutput(["0", "1", "2", "3", "4"]),
        bullets: [
          "Lặp 5 lần với biến đếm i.",
          "Rất hợp để duyệt mảng theo index.",
          "Dùng nhiều trong các bài học nhập môn.",
        ],
        code: `for (let i = 0; i < 5; i++) {
  console.log(i);
}`,
      },
      foreach: {
        title: "Demo forEach",
        summary: "Dùng forEach để duyệt từng phần tử của mảng.",
        result: formatListOutput(["Áo thun", "Quần jean", "Giày thể thao"]),
        bullets: [
          "Làm việc trực tiếp với từng phần tử mảng.",
          "Phù hợp khi chỉ cần đọc dữ liệu và thực hiện hành động.",
          "Không phù hợp nếu cần break giữa chừng.",
        ],
        code: `const products = ["Áo thun", "Quần jean", "Giày thể thao"];

products.forEach((product) => {
  console.log(product);
});`,
      },
      forin: {
        title: "Demo for...in",
        summary: "Dùng for...in để duyệt qua các key của object.",
        result: formatObjectOutput([
          ["name", "An"],
          ["age", 20],
          ["score", 8.5],
        ]),
        bullets: [
          "Mỗi lần lặp trả về key của object.",
          "Hữu ích khi cần đọc từng thuộc tính.",
          "Thường không dùng cho array nếu mục tiêu là duyệt giá trị.",
        ],
        code: `const student = { name: "An", age: 20, score: 8.5 };

for (const key in student) {
  console.log(key, student[key]);
}`,
      },
      while: {
        title: "Demo while",
        summary: "Dùng while khi chưa biết trước số lần lặp, chỉ biết điều kiện dừng.",
        result: formatListOutput(["3", "2", "1"]),
        bullets: [
          "Kiểm tra điều kiện trước khi chạy thân vòng lặp.",
          "Phù hợp cho bài toán lặp cho đến khi hết dữ liệu.",
          "Cần nhớ cập nhật biến điều kiện để tránh lặp vô hạn.",
        ],
        code: `let count = 3;

while (count > 0) {
  console.log(count);
  count--;
}`,
      },
      dowhile: {
        title: "Demo do...while",
        summary: "Dùng do...while khi muốn chạy ít nhất một lần rồi mới kiểm tra điều kiện.",
        result: formatListOutput(["Chạy ít nhất 1 lần"]),
        bullets: [
          "Thân vòng lặp luôn chạy trước.",
          "Sau đó mới kiểm tra điều kiện dừng.",
          "Hợp với các bài cần nhập lại dữ liệu ít nhất một lần.",
        ],
        code: `let tries = 0;

do {
  console.log("Chạy ít nhất 1 lần");
  tries++;
} while (tries < 1);`,
      },
      break: {
        title: "Demo break",
        summary: "Dùng break để thoát vòng lặp ngay khi gặp điều kiện dừng.",
        result: formatListOutput(["1", "2", "Dừng tại 3"]),
        bullets: [
          "Lặp qua các số từ 1 đến 5.",
          "Gặp số 3 thì dừng vòng lặp.",
          "Hữu ích khi chỉ cần xử lý tới một mốc nào đó.",
        ],
        code: `for (let i = 1; i <= 5; i++) {
  if (i === 3) {
    break;
  }
  console.log(i);
}`,
      },
      continue: {
        title: "Demo continue",
        summary: "Dùng continue để bỏ qua lần lặp hiện tại và chạy tiếp vòng sau.",
        result: formatListOutput(["1", "2", "Bỏ qua 3", "4", "5"]),
        bullets: [
          "Lặp qua các số từ 1 đến 5.",
          "Gặp số 3 thì bỏ qua không xử lý.",
          "Hợp khi cần lọc nhanh các giá trị không dùng.",
        ],
        code: `for (let i = 1; i <= 5; i++) {
  if (i === 3) {
    continue;
  }
  console.log(i);
}`,
      },
      average: {
        title: "Tính điểm trung bình",
        summary: "Dùng mảng điểm, cộng tổng rồi chia cho số lượng phần tử.",
        result: calculateAverage([8, 9, 7.5, 10]),
        bullets: [
          "Dữ liệu đầu vào: [8, 9, 7.5, 10]",
          "Kết quả trung bình: 8.63",
          "Ứng dụng: tính điểm học viên, điểm trung bình lớp, điểm kiểm tra.",
        ],
        code: `function calculateAverage(scores) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Number((total / scores.length).toFixed(2));
}`,
      },
      evenodd: {
        title: "Kiểm tra chẵn/lẻ",
        summary: "Dùng toán tử chia lấy dư để xác định số chẵn hay số lẻ.",
        result: isEven(17) ? "17 là số chẵn" : "17 là số lẻ",
        bullets: [
          "Dữ liệu đầu vào: 17",
          "Kết quả: số lẻ",
          "Ứng dụng: kiểm tra điều kiện cơ bản trong if/else.",
        ],
        code: `function isEven(number) {
  return number % 2 === 0;
}`,
      },
      max: {
        title: "Tìm phần tử lớn nhất",
        summary: "Duyệt qua mảng số và giữ lại giá trị lớn nhất đã gặp.",
        result: findMax([12, 7, 23, 9, 15]),
        bullets: [
          "Dữ liệu đầu vào: [12, 7, 23, 9, 15]",
          "Kết quả lớn nhất: 23",
          "Ứng dụng: tìm điểm cao nhất, giá lớn nhất, số lượt lớn nhất.",
        ],
        code: `function findMax(numbers) {
  return numbers.reduce((max, current) => current > max ? current : max);
}`,
      },
      products: {
        title: "Thao tác mảng sản phẩm",
        summary: "Duyệt mảng object, lấy thông tin và định dạng để hiển thị.",
        result: formatProducts([
          { id: 1, name: "Áo thun", price: 120000, stock: 18 },
          { id: 2, name: "Giày thể thao", price: 560000, stock: 0 },
          { id: 3, name: "Mũ lưỡi trai", price: 85000, stock: 12 },
        ]),
        bullets: [
          "Dùng object để mô tả từng sản phẩm.",
          "Dùng map/reduce/filter cho thao tác danh sách.",
          "Ứng dụng: giỏ hàng, kho hàng, danh mục sản phẩm.",
        ],
        code: `const products = [
  { id: 1, name: "Áo thun", price: 120000, stock: 18 }
];`,
      },
    };

    const demo = demos[key] || demos.average;

    output.innerHTML = `
      <div>
        <h3>${escapeHtml(demo.title)}</h3>
        <p>${escapeHtml(demo.summary)}</p>
      </div>
      <div>
        <p class="output-label">Giá trị minh họa</p>
        <pre><code>${escapeHtml(demo.result)}</code></pre>
      </div>
      <ul>
        ${demo.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
      </ul>
      <div>
        <p class="output-label">Mã mẫu</p>
        <pre><code>${escapeHtml(demo.code)}</code></pre>
      </div>
    `;

    const outputCard = output.closest(".output-card");
    if (outputCard) {
      outputCard.classList.add("is-highlighted");
      root.setTimeout(() => outputCard.classList.remove("is-highlighted"), 900);

      if (typeof outputCard.scrollIntoView === "function") {
        outputCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  function init() {
    if (!doc || doc.__bai3LessonInitialized) {
      return;
    }

    doc.__bai3LessonInitialized = true;

    doc.addEventListener("click", (event) => {
      const button = event.target.closest("[data-demo]");
      if (!button) {
        return;
      }

      renderDemo(button.dataset.demo);
    });

    doc.addEventListener("DOMContentLoaded", () => {
      renderDemo("average");
    });

    renderDemo("average");
  }

  return {
    calculateAverage,
    isEven,
    findMax,
    addStudent,
    updateStudent,
    deleteStudent,
    formatProducts,
    formatListOutput,
    formatObjectOutput,
    renderDemo,
    init,
    escapeHtml,
  };
});
