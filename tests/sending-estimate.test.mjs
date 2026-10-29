import { describe, it, expect } from 'vitest';
import { estimateSendingSchedule, sendingDaysToWeekdays } from '../src/lib/services/sending-estimate.ts';

const day = (iso) => new Date(`${iso}T00:00:00`);
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('estimateSendingSchedule', () => {
  it('finishes today when prospects fit in one daily limit on a sending day', () => {
    // Thursday 2026-10-29, Mon-Fri sending.
    const est = estimateSendingSchedule({ remaining: 4, dailyLimit: 100, sendingWeekdays: [1, 2, 3, 4, 5], from: day('2026-10-29') });
    expect(est.sendingDaysNeeded).toBe(1);
    expect(est.calendarDays).toBe(0);
    expect(fmt(est.finishDate)).toBe('2026-10-29');
  });

  it('skips non-sending days (Fri -> Mon -> Tue)', () => {
    // Friday 2026-10-30, 250 prospects at 100/day = 3 sending days: Fri, Mon, Tue.
    const est = estimateSendingSchedule({ remaining: 250, dailyLimit: 100, sendingWeekdays: [1, 2, 3, 4, 5], from: day('2026-10-30') });
    expect(est.sendingDaysNeeded).toBe(3);
    expect(est.calendarDays).toBe(4);
    expect(fmt(est.finishDate)).toBe('2026-11-03');
  });

  it('starts on the next sending day when today is not one', () => {
    // Saturday 2026-10-31, Mon-Fri sending: first sending day is Monday.
    const est = estimateSendingSchedule({ remaining: 10, dailyLimit: 100, sendingWeekdays: [1, 2, 3, 4, 5], from: day('2026-10-31') });
    expect(est.sendingDaysNeeded).toBe(1);
    expect(est.calendarDays).toBe(2);
    expect(fmt(est.finishDate)).toBe('2026-11-02');
  });

  it('returns zero days when nothing remains', () => {
    const est = estimateSendingSchedule({ remaining: 0, dailyLimit: 100, sendingWeekdays: [1, 2, 3, 4, 5], from: day('2026-10-29') });
    expect(est.sendingDaysNeeded).toBe(0);
    expect(est.calendarDays).toBe(0);
  });

  it('treats an empty weekday list as every day', () => {
    const est = estimateSendingSchedule({ remaining: 150, dailyLimit: 100, sendingWeekdays: [], from: day('2026-10-31') });
    expect(est.sendingDaysNeeded).toBe(2);
    expect(fmt(est.finishDate)).toBe('2026-11-01');
  });
});

describe('sendingDaysToWeekdays', () => {
  it('maps the schedule map to weekday numbers and defaults to Mon-Fri', () => {
    expect(sendingDaysToWeekdays({ monday: true, wednesday: true, sunday: false })).toEqual([1, 3]);
    expect(sendingDaysToWeekdays(undefined)).toEqual([1, 2, 3, 4, 5]);
  });
});
