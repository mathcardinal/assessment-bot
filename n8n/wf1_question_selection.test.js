function датаЧисло(v) {
  if (!v) return 0;
  const s = String(v).trim();
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function перемешать(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function виденное(история, employeeId) {
  const виден = {};
  for (const s of история) {
    if (String(s.employee_id) !== String(employeeId)) continue;
    const когда = датаЧисло(s.sent_at);
    for (const qid of String(s.question_ids || '').split(',').map(x => x.trim()).filter(Boolean)) {
      if (!(qid in виден) || когда > виден[qid]) виден[qid] = когда;
    }
  }
  return виден;
}

function отобрать(пул, виден, сколько, rnd) {
  const свежесть = q => датаЧисло(q.активен_с);
  const невиданные = пул.filter(q => !(q.question_id in виден));
  const виданные = пул.filter(q => q.question_id in виден);

  const поПартиям = {};
  for (const q of невиданные) (поПартиям[свежесть(q)] ||= []).push(q);
  const порядокПартий = Object.keys(поПартиям).map(Number).sort((a, b) => b - a);
  const сначала = [];
  for (const п of порядокПартий) сначала.push(...перемешать(поПартиям[п], rnd));

  const потом = виданные
    .map(q => [виден[q.question_id], q])
    .sort((a, b) => a[0] - b[0])
    .map(x => x[1]);

  return [...сначала, ...потом].slice(0, сколько);
}

function верные(raw) {
  return String(raw ?? '').split(',').map(s => s.trim().toUpperCase()).filter(s => ['A', 'B', 'C', 'D'].includes(s));
}

function заваленные(перваяПопытка, банкПоId) {
  const qids = String(перваяПопытка.question_ids || '').split(',').map(x => x.trim()).filter(Boolean);
  const ответы = JSON.parse(перваяПопытка.answers || '{}');
  return qids.filter(qid => {
    const ответ = String(ответы[qid] ?? '').trim().toUpperCase();
    if (!ответ) return true;
    return !верные(bankОтвет(банкПоId, qid)).includes(ответ);
  });
}

function bankОтвет(банкПоId, qid) {
  return банкПоId[qid] ? банкПоId[qid].правильный_ответ : '';
}

function отобратьПопытка2(пул, виден, перваяПопытка, банкПоId, сколько, rnd) {
  const пулПоId = Object.fromEntries(пул.map(q => [q.question_id, q]));
  const завал = заваленные(перваяПопытка, банкПоId).filter(q => q in пулПоId).map(q => пулПоId[q]);
  const взято = new Set(завал.map(q => q.question_id));
  const остаток = отобрать(пул.filter(q => !взято.has(q.question_id)), виден, сколько, rnd);
  return [...завал, ...остаток].slice(0, сколько);
}

// ---------------------------------------------------------------- тесты ----
let сид = 42;
const rnd = () => ((сид = (сид * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const банк = (n, дата, префикс) =>
  Array.from({ length: n }, (_, i) => ({ question_id: `${префикс}${i + 1}`, активен_с: дата, правильный_ответ: 'A' }));

let fail = 0;
const проверить = (имя, факт, ожид) => {
  const ok = JSON.stringify(факт) === JSON.stringify(ожид);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${имя}${ok ? '' : `\n     получили ${JSON.stringify(факт)}\n     ждали    ${JSON.stringify(ожид)}`}`);
};

// парсер дат
проверить('дата dd.mm.yyyy', датаЧисло('06.08.2026'), Date.UTC(2026, 7, 6));
проверить('дата с временем', датаЧисло('10.06.2026, 14:25:02'), Date.UTC(2026, 5, 10, 14, 25, 2));
проверить('дата ISO', датаЧисло('2026-06-11T15:54:46.973Z'), Date.parse('2026-06-11T15:54:46.973Z'));
проверить('пустая дата', датаЧисло(''), 0);
проверить('свежая новее старой', датаЧисло('06.08.2026') > датаЧисло('15.07.2026'), true);

// случай Васи: 30 старых невиданных + 10 свежих
{
  const пул = [...банк(30, '15.07.2026', 'OLD'), ...банк(10, '06.08.2026', 'NEW')];
  const выбор = отобрать(пул, {}, 10, rnd);
  проверить('Вася: срез собран из свежей партии', выбор.every(q => q.question_id.startsWith('NEW')), true);
  проверить('Вася: ровно 10', выбор.length, 10);
  проверить('Вася: без дублей', new Set(выбор.map(q => q.question_id)).size, 10);
}

// свежих меньше десяти — добираем старыми невиданными
{
  const пул = [...банк(30, '15.07.2026', 'OLD'), ...банк(3, '06.08.2026', 'NEW')];
  const выбор = отобрать(пул, {}, 10, rnd);
  const новых = выбор.filter(q => q.question_id.startsWith('NEW')).length;
  проверить('свежих 3 — все вошли', новых, 3);
  проверить('добрали старыми до десяти', выбор.length, 10);
}

// не виданное всегда раньше виданного
{
  const пул = банк(12, '15.07.2026', 'Q');
  const виден = { Q1: датаЧисло('01.08.2026'), Q2: датаЧисло('01.08.2026') };
  const выбор = отобрать(пул, виден, 10, rnd).map(q => q.question_id);
  проверить('виденные не попали, невиданных хватило', выбор.some(q => q === 'Q1' || q === 'Q2'), false);
}

// невиданных не хватает — добор самыми давними
{
  const пул = банк(11, '15.07.2026', 'Q');
  const виден = {};
  for (let i = 1; i <= 10; i++) виден[`Q${i}`] = datesOf(i);
  function datesOf(i) { return датаЧисло(`0${i <= 9 ? i : 9}.08.2026`); }
  const выбор = отобрать(пул, виден, 10, rnd).map(q => q.question_id);
  проверить('первым идёт единственный невиданный', выбор[0], 'Q11');
  проверить('добрали до десяти', выбор.length, 10);
  проверить('следом самый давний виденный', выбор[1], 'Q1');
  проверить('самый свежий виденный — последний', выбор[выбор.length - 1], 'Q9');
}

// перемешивание внутри партии даёт разные наборы разным людям
{
  const пул = банк(17, '06.08.2026', 'Q');
  сид = 1;
  const a = отобрать(пул, {}, 10, rnd).map(q => q.question_id).join(',');
  сид = 999;
  const b = отобрать(пул, {}, 10, rnd).map(q => q.question_id).join(',');
  проверить('у разных людей наборы не совпадают', a !== b, true);
}

// вторая попытка: заваленные + невиданные
{
  const пул = [...банк(10, '15.07.2026', 'OLD'), ...банк(10, '06.08.2026', 'NEW')];
  const банкПоId = Object.fromEntries(пул.map(q => [q.question_id, q]));
  const первая = {
    question_ids: 'OLD1,OLD2,OLD3,OLD4,OLD5,OLD6,OLD7,OLD8,OLD9,OLD10',
    answers: JSON.stringify({ OLD1: 'A', OLD2: 'B', OLD3: 'A', OLD4: 'C', OLD5: 'A', OLD6: 'A', OLD7: 'A', OLD8: 'A', OLD9: 'A' }),
  };
  const завал = заваленные(первая, банкПоId);
  проверить('заваленные: неверные плюс неотвеченный', завал, ['OLD2', 'OLD4', 'OLD10']);

  const виден = {};
  for (const q of первая.question_ids.split(',')) виден[q] = датаЧисло('01.08.2026');
  const выбор = отобратьПопытка2(пул, виден, первая, банкПоId, 10, rnd).map(q => q.question_id);
  проверить('вторая попытка: сначала заваленные', выбор.slice(0, 3), ['OLD2', 'OLD4', 'OLD10']);
  проверить('вторая попытка: добита свежими невиданными', выбор.slice(3).every(q => q.startsWith('NEW')), true);
  проверить('вторая попытка: ровно 10', выбор.length, 10);
  проверить('вторая попытка: без дублей', new Set(выбор).size, 10);
}

// вторая попытка при нескольких верных ответах
{
  const банкПоId = { Q1: { правильный_ответ: 'A,C' }, Q2: { правильный_ответ: 'B' } };
  const первая = { question_ids: 'Q1,Q2', answers: JSON.stringify({ Q1: 'C', Q2: 'D' }) };
  проверить('ответ C при верных A,C не считается завалом', заваленные(первая, банкПоId), ['Q2']);
}

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
