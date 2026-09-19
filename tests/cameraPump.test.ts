import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FramePumpController } from '../src/components/AIPoseCoach/FramePumpController.ts';

describe('FramePumpController', () => {
  it('initializes in stopped state', () => {
    const controller = new FramePumpController();
    assert.equal(controller.running, false);
    assert.equal(controller.scheduledFrameId, null);
  });

  it('starts and schedules initial frame', () => {
    const controller = new FramePumpController();
    let scheduledId = 0;
    const mockRequest = (cb: FrameRequestCallback) => {
      scheduledId = 101;
      return 101;
    };
    const mockCancel = (id: number) => {};

    controller.start(async () => {}, mockRequest, mockCancel);
    assert.equal(controller.running, true);
    assert.equal(controller.scheduledFrameId, 101);
  });

  it('calls cancelAnimationFrame when stopped', () => {
    const controller = new FramePumpController();
    let cancelledId: number | null = null;
    const mockRequest = () => 42;
    const mockCancel = (id: number) => {
      cancelledId = id;
    };

    controller.start(async () => {}, mockRequest, mockCancel);
    assert.equal(controller.running, true);

    controller.stop(mockCancel);
    assert.equal(controller.running, false);
    assert.equal(controller.scheduledFrameId, null);
    assert.equal(cancelledId, 42);
  });

  it('prevents duplicate loops by cancelling previous request on restart', () => {
    const controller = new FramePumpController();
    const cancelledIds: number[] = [];
    let nextId = 1;
    const mockRequest = () => nextId++;
    const mockCancel = (id: number) => {
      cancelledIds.push(id);
    };

    controller.start(async () => {}, mockRequest, mockCancel); // id: 1
    controller.start(async () => {}, mockRequest, mockCancel); // id: 2

    assert.equal(controller.running, true);
    assert.equal(controller.scheduledFrameId, 2);
    assert.deepEqual(cancelledIds, [1]);
  });

  it('does NOT schedule next frame if stop() was called during in-flight processing', async () => {
    const controller = new FramePumpController();
    let requestCount = 0;
    let registeredCallback: FrameRequestCallback | null = null;

    const mockRequest = (cb: FrameRequestCallback) => {
      requestCount++;
      registeredCallback = cb;
      return requestCount;
    };
    const mockCancel = () => {};

    let resolveInFlight: (() => void) | null = null;
    const inFlightPromise = new Promise<void>((resolve) => {
      resolveInFlight = resolve;
    });

    controller.start(async () => {
      await inFlightPromise;
    }, mockRequest, mockCancel);

    // Initial frame was scheduled (requestCount = 1)
    assert.equal(requestCount, 1);
    assert.ok(registeredCallback);

    // Trigger the scheduled frame loop
    const loopPromise = (registeredCallback as any)(performance.now());

    // While in-flight, stop is called (e.g. user navigated away or camera disabled)
    controller.stop(mockCancel);
    assert.equal(controller.running, false);

    // Resolve in-flight processing
    resolveInFlight!();
    await loopPromise;

    // requestCount should NOT have incremented beyond 1 because isRunning was false!
    assert.equal(requestCount, 1);
    assert.equal(controller.scheduledFrameId, null);
  });

  it('recovers from errors during frame processing without freezing', async () => {
    const controller = new FramePumpController();
    let requestCount = 0;
    let registeredCallback: FrameRequestCallback | null = null;

    const mockRequest = (cb: FrameRequestCallback) => {
      requestCount++;
      registeredCallback = cb;
      return requestCount;
    };
    const mockCancel = () => {};

    controller.start(async () => {
      throw new Error('Pose estimation transient error');
    }, mockRequest, mockCancel);

    assert.equal(requestCount, 1);
    // Execute frame that throws
    await (registeredCallback as any)(performance.now());

    // Next tick should still have been scheduled
    assert.equal(requestCount, 2);
    assert.equal(controller.running, true);
  });
});
