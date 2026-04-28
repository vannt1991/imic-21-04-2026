#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

DEMO="${1:-all}"

DEMO="$DEMO" node <<'NODE'
const bai3 = require('./main.js');

const demos = {
  average() {
    console.log('average:', bai3.calculateAverage([8, 9, 7.5, 10]));
  },
  evenodd() {
    console.log('isEven(17):', bai3.isEven(17));
    console.log('isEven(14):', bai3.isEven(14));
  },
  max() {
    console.log('max:', bai3.findMax([12, 7, 23, 9, 15]));
  },
  students() {
    const students = [{ id: 1, name: 'An', score: 8 }];
    const nextStudents = bai3.addStudent(students, { id: 2, name: 'Binh', score: 7.5 });
    const updatedStudents = bai3.updateStudent(nextStudents, 2, { score: 8 });
    const finalStudents = bai3.deleteStudent(updatedStudents, 1);

    console.log('students:', JSON.stringify(finalStudents, null, 2));
  },
  products() {
    console.log(
      bai3.formatProducts([
        { id: 1, name: 'Ao thun', price: 120000, stock: 18 },
        { id: 2, name: 'Giay the thao', price: 560000, stock: 0 },
        { id: 3, name: 'Mu luoi trai', price: 85000, stock: 12 },
      ])
    );
  },
};

const demo = process.env.DEMO || 'all';

if (demo === 'all') {
  Object.values(demos).forEach((fn) => fn());
} else if (demos[demo]) {
  demos[demo]();
} else {
  console.error('Usage: ./run.sh [all|average|evenodd|max|students|products]');
  process.exit(1);
}
NODE
