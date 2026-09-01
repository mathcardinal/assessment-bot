function decideAction(daysPassed, status, reminderCount, isAttempt2, thresholds) {
  const { reminder1, reminder2, reminder3, autoClose, autoClose2, stuckReminderInterval } = thresholds;
  const дедлайн = isAttempt2 ? autoClose2 : autoClose;

  if (daysPassed >= дедлайн) return 'auto_close';

  if (status === 'в процессе') {
    if (daysPassed > 0 && daysPassed % stuckReminderInterval === 0) return 'reminder_2';
    return null;
  }

  if (!isAttempt2) {
    if (daysPassed >= reminder3 && reminderCount < 3) return 'reminder_3';
    if (daysPassed >= reminder2 && reminderCount < 2) return 'reminder_2';
    if (daysPassed >= reminder1 && reminderCount < 1) return 'reminder_1';
  }
  return null;
}

const T = { reminder1: 1, reminder2: 2, reminder3: 3, autoClose: 30, autoClose2: 3, stuckReminderInterval: 4 };

const cases = [
  ['застрял, день 0 (только начал) — не слать', 0, 'в процессе', 0, false, null],
  ['застрял, день 1 — не слать', 1, 'в процессе', 0, false, null],
  ['застрял, день 3 — не слать', 3, 'в процессе', 0, false, null],
  ['застрял, день 4 — слать', 4, 'в процессе', 0, false, 'reminder_2'],
  ['застрял, день 5 — не слать (не кратно 4)', 5, 'в процессе', 0, false, null],
  ['застрял, день 8 — слать снова', 8, 'в процессе', 0, false, 'reminder_2'],
  ['назначен, порог reminder_1 — работает как раньше', 1, 'назначен', 0, false, 'reminder_1'],
  ['назначен, повтор не шлём (счётчик уже учёл)', 1, 'назначен', 1, false, null],
  ['дедлайн — авто-закрытие даже если в процессе', 30, 'в процессе', 0, false, 'auto_close'],
];

let fail = 0;
for (const [name, daysPassed, status, reminderCount, isAttempt2, expected] of cases) {
  const got = decideAction(daysPassed, status, reminderCount, isAttempt2, T);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | got=${got} exp=${expected}`);
}
console.log(fail === 0 ? '\nALL PASS — напоминание застрявшим шлётся раз в 4 дня, а не каждый день' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
