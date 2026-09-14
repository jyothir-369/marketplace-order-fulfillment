export interface OverviewRange {
  start: Date;
  end: Date;
  previousMonthStart: Date;
  previousMonthEnd: Date;
}

export function getOverviewRange(range: string = 'this_month'): OverviewRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  switch (range) {
    case 'last_30d':
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      start = new Date(end); start.setDate(end.getDate() - 29);
      prevEnd = new Date(end); prevEnd.setDate(end.getDate() - 30);
      prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 29);
      return { start, end, previousMonthStart: prevStart, previousMonthEnd: prevEnd };
    case 'this_quarter': {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      start = new Date(year, quarterStartMonth, 1);
      end = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
      const prevQ = quarterStartMonth - 3;
      prevStart = new Date(year, prevQ < 0 ? 0 : prevQ, 1);
      prevEnd = new Date(year, prevQ < 0 ? 0 : prevQ + 3, 0, 23, 59, 59, 999);
      return { start, end, previousMonthStart: prevStart, previousMonthEnd: prevEnd };
    }
    case 'ytd':
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
      prevStart = new Date(year - 1, 0, 1);
      prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      return { start, end, previousMonthStart: prevStart, previousMonthEnd: prevEnd };
    case 'all':
      start = new Date(2000, 0, 1);
      end = new Date(2099, 11, 31, 23, 59, 59, 999);
      prevStart = new Date(2000, 0, 1);
      prevEnd = new Date(2099, 11, 31, 23, 59, 59, 999);
      return { start, end, previousMonthStart: prevStart, previousMonthEnd: prevEnd };
    case 'this_month':
    default:
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(year, month - 1, 1);
      prevEnd = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end, previousMonthStart: prevStart, previousMonthEnd: prevEnd };
  }
}

export function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}
