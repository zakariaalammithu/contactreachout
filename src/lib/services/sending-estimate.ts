/**
 * Estimates how long a running campaign needs to finish sending, from the
 * prospects still unprocessed, the daily submission limit, and the weekdays
 * sending is allowed on. Pure and date-injectable so it can be unit tested.
 * Weekdays use JavaScript's numbering: 0 = Sunday, 6 = Saturday. An empty
 * weekday list means every day is allowed; a daily limit of 0 or less means
 * no daily cap (everything fits in one sending day).
 */
export interface SendingEstimate {
  /** Sending days required (days on which sending actually happens). */
  sendingDaysNeeded: number;
  /** Calendar days from `from` until the finish day (0 = finishes today). */
  calendarDays: number;
  /** The date sending finishes (midnight, local time). */
  finishDate: Date;
}

export function estimateSendingSchedule(input: {
  remaining: number;
  dailyLimit: number;
  sendingWeekdays: number[];
  from?: Date;
}): SendingEstimate {
  const from = input.from ? new Date(input.from) : new Date();
  from.setHours(0, 0, 0, 0);
  if (input.remaining <= 0) {
    return { sendingDaysNeeded: 0, calendarDays: 0, finishDate: from };
  }
  const perDay = input.dailyLimit > 0 ? input.dailyLimit : input.remaining;
  const needed = Math.ceil(input.remaining / perDay);
  const allowed = new Set(input.sendingWeekdays.length > 0 ? input.sendingWeekdays : [0, 1, 2, 3, 4, 5, 6]);
  let counted = 0;
  let calendarDays = 0;
  const cursor = new Date(from);
  while (counted < needed) {
    if (allowed.has(cursor.getDay())) counted++;
    if (counted >= needed) break;
    cursor.setDate(cursor.getDate() + 1);
    calendarDays++;
  }
  return { sendingDaysNeeded: needed, calendarDays, finishDate: cursor };
}

/** Converts a schedule's {monday..sunday: boolean} map to weekday numbers. */
export function sendingDaysToWeekdays(sendingDays?: Record<string, boolean> | null): number[] {
  if (!sendingDays) return [1, 2, 3, 4, 5];
  const order: Array<[string, number]> = [
    ['sunday', 0],
    ['monday', 1],
    ['tuesday', 2],
    ['wednesday', 3],
    ['thursday', 4],
    ['friday', 5],
    ['saturday', 6],
  ];
  return order.filter(([key]) => sendingDays[key]).map(([, day]) => day);
}
