import { getOverviewRange } from './aggregation.helpers';

describe('aggregation helpers', () => {
  it('this_month returns correct bounds', () => {
    const r = getOverviewRange('this_month');
    expect(r.start.getMonth()).toBe(new Date().getMonth());
    expect(r.previousMonthStart.getMonth()).toBe(new Date().getMonth() - 1);
  });

  it('all uses wide window', () => {
    const r = getOverviewRange('all');
    expect(r.start.getFullYear()).toBe(2000);
  });

  it('last_30d starts 29 days before end', () => {
    const r = getOverviewRange('last_30d');
    const diff = (r.end.getTime() - r.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(29);
  });
});
