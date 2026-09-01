const БУКВЫ = ['A', 'B', 'C', 'D'];

function разобрать(raw) {
  return String(raw ?? '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => БУКВЫ.includes(s));
}

function верно(raw, ответ, newLogic) {
  if (!newLogic) return ответ === raw;
  return разобрать(raw).includes(String(ответ ?? '').trim().toUpperCase());
}

function текстВерного(raw, answerMap, newLogic) {
  if (!newLogic) return answerMap[raw] || raw;
  const буквы = разобрать(raw);
  return буквы.length ? буквы.map(l => answerMap[l] || l).join('\n') : (answerMap[raw] || raw);
}

const map = { A: 'Поэкземплярный', B: 'Объемно-сортовой', C: 'Разрешительный', D: 'Послабление' };

const cases = [
  ['одна буква, попал', 'B', 'B', true, true],
  ['одна буква, мимо', 'B', 'A', false, false],
  ['два верных, первый', 'A,C', 'A', true, false],
  ['два верных, второй', 'A,C', 'C', true, false],
  ['два верных, мимо', 'A,C', 'B', false, false],
  ['пробел после запятой', 'A, C', 'C', true, false],
  ['нижний регистр в банке', 'a,c', 'A', true, false],
  ['все четыре верных', 'A,B,C,D', 'D', true, false],
  ['мусорная буква отброшена', 'A,E', 'E', false, false],
  ['мусорная буква не мешает', 'A,E', 'A', true, false],
  ['пустой правильный_ответ', '', 'A', false, false],
  ['правильный_ответ отсутствует', undefined, 'A', false, false],
  ['нет ответа сотрудника', 'A,C', '', false, false],
  ['нет ответа при одном верном', 'B', undefined, false, false],
];

let fail = 0;

for (const [name, raw, ответ, expNew, expOld] of cases) {
  const got = верно(raw, ответ, true);
  const old = верно(raw, ответ, false);
  const ok = got === expNew && old === expOld;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | new=${got} (ждали ${expNew}) | old=${old} (было ${expOld})`);
}

const текстКейсы = [
  ['одна буква — как раньше', 'B', 'Объемно-сортовой'],
  ['две буквы — обе строкой', 'A,C', 'Поэкземплярный\nРазрешительный'],
  ['пробел не мешает', 'A, C', 'Поэкземплярный\nРазрешительный'],
  ['мусор — как раньше, сырое значение', 'X', 'X'],
  ['пусто — как раньше', '', ''],
];

for (const [name, raw, exp] of текстКейсы) {
  const got = текстВерного(raw, map, true);
  const ok = got === exp;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | текст: ${name} | ${JSON.stringify(got)} (ждали ${JSON.stringify(exp)})`);
}

const разбивкаНаДашборде = (correct, ans) =>
  String(correct ?? '').split('\n').map(s => s.trim()).filter(Boolean).includes(String(ans ?? '').trim());

const дашборд = [
  ['старая строка, один верный', 'Объемно-сортовой', 'Объемно-сортовой', true],
  ['старая строка, неверный', 'Объемно-сортовой', 'Поэкземплярный', false],
  ['две строки, первая', 'Поэкземплярный\nРазрешительный', 'Поэкземплярный', true],
  ['две строки, вторая', 'Поэкземплярный\nРазрешительный', 'Разрешительный', true],
  ['две строки, мимо', 'Поэкземплярный\nРазрешительный', 'Послабление', false],
  ['косая черта внутри варианта', '20 000 / в месяц\n35 000 / в месяц', '35 000 / в месяц', true],
  ['нет ответа', 'Объемно-сортовой', 'нет ответа', false],
];

for (const [name, correct, ans, exp] of дашборд) {
  const got = разбивкаНаДашборде(correct, ans);
  const ok = got === exp;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | дашборд: ${name} | ${got} (ждали ${exp})`);
}

console.log(fail === 0
  ? '\nALL PASS — одиночная буква ведёт себя как раньше, «A,C» засчитывает оба варианта'
  : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
