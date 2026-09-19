import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FramePumpController } from '../../src/components/AIPoseCoach/FramePumpController.ts';
import { MockAnimationFrameController } from '../mocks/browserMocks.ts';

describe('Pure Logic: Headless Camera Frame Pump Controller', () => {
  it('initializes in stopped state', () => {
    const controller = new FramePumpController();
    assert.equal(controller.running, false);
    assert.equal(controller.scheduledFrameId, null);
  });

  it('starts and schedules initial frame through mock controller', () => {
    const controller = new FramePumpController();
    const rafMock = new MockAnimationFrameController();

    controller.start(
      async () => {},
      rafMock.requestAnimationFrame,
      rafMock.cancelAnimationFrame
    );

    assert.equal(controller.running, true);
    assert.equal(rafMock.pendingCount, 1);
    assert.equal(controller.scheduledFrameId, 1);
  });

  it('stops and removes scheduled frame from queue', () => {
    const controller = new FramePumpController();
    const rafMock = new MockAnimationFrameController();

    controller.start(
      async () => {},
      rafMock.requestAnimationFrame,
      rafMock.cancelAnimationFrame
    );
    assert.equal(rafMock.pendingCount, 1);

    controller.stop(rafMock.cancelAnimationFrame);
    assert.equal(controller.running, false);
    assert.equal(controller.scheduledFrameId, null);
    assert.equal(rafMock.pendingCount, 0);
  });

  it('steps through deterministic frame execution', async () => {
    const controller = new FramePumpController();
    const rafMock = new MockAnimationFrameController();
    let frameProcessedCount = 0;

    controller.start(
      async () => {
        frameProcessedCount++;
      },
      rafMock.requestAnimationFrame,
      rafMock.cancelAnimationFrame
    );

    assert.equal(frameProcessedCount, 0);
    assert.equal(rafMock.pendingCount, 1);

    // Step 1 frame
    rafMock.step();
    // Allow microtask to resolve
    await new Promise((r) => setImmediate(r));
    assert.equal(frameProcessedCount, 1);
    assert.equal(rafMock.pendingCount, 1, 'Should have scheduled next frame');

    // Step 2nd frame
    rafMock.step();
    await new Promise((r) => setImmediate(r));
    assert.equal(frameProcessedCount, 2);

    controller.stop(rafMock.cancelAnimationFrame);
    assert.equal(rafMock.pendingCount, 0);
  });

  it('drops in-flight async frames when stopped during processing', async () => {
    const controller = new FramePumpController();
    const rafMock = new MockAnimationFrameController();
    let resolveInFlight: (() => void) | null = null;

    controller.start(
      async () => {
        await new Promise<void>((r) => {
          resolveInFlight = r;
        });
      },
      rafMock.requestAnimationFrame,
      rafMock.cancelAnimationFrame
    );

    assert.equal(rafMock.pendingCount, 1);
    // Execute scheduled tick
    rafMock.step();

    // While in-flight, stop is called (e.g. camera off / navigation)
    controller.stop(rafMock.cancelAnimationFrame);
    assert.equal(controller.running, false);

    // Resolve in-flight execution
    resolveInFlight!();
    await new Promise((r) => setImmediate(r));

    // Must NOT schedule another frame!
    assert.equal(rafMock.pendingCount, 0);
    assert.equal(controller.scheduledFrameId, null);
  });

  it('recovers cleanly from errors in frame callback without locking', async () => {
    const controller = new FramePumpController();
    const rafMock = new MockAnimationFrameController();
    let calls = 0;

    controller.start(
      async () => {
        calls++;
        if (calls === 1) throw new Error('Transient MediaPipe failure');
      },
      rafMock.requestAnimationFrame,
      rafMock.cancelAnimationFrame
    );

    // Execute first tick (throws)
    rafMock.step();
    await new Promise((r) => setImmediate(r));
    assert.equal(calls, 1);
    assert.equal(rafMock.pendingCount, 1, 'Next frame must still be scheduled after error');

    // Execute second tick (succeeds)
    rafMock.step();
    await new Promise((r) => setImmediate(r));
    assert.equal(calls, 2);

    controller.stop(rafMock.cancelAnimationFrame);
  });
});
