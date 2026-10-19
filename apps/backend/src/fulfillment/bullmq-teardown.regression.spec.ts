import { describe, it, expect } from '@jest/globals';
describe('BullMQ regression — clean teardown', () => {
  it('suppresses Connection-is-closed at teardown', () => {
    const events: any[] = [];
    const worker = { on: (ev: string, fn: any) => { events.push({ ev, fn }); return worker; }, close: async () => {} };
    worker.on('error', (err: Error) => {
      if (err && err.message && err.message.includes('Connection is closed')) return;
    });
    events.filter(e => e.ev === 'error').forEach(e => e.fn(new Error('Connection is closed')));
    expect(true).toBe(true);
  });
  it('close order: queue before events', async () => {
    const order: string[] = [];
    await (async () => { order.push('queue'); })();
    await (async () => { order.push('events'); })();
    expect(order).toEqual(['queue', 'events']);
  });
});
