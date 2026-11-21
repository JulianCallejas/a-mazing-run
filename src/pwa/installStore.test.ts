import { describe, expect, it, vi } from 'vitest';
import { createInstallStore, type BeforeInstallPromptEvent } from './installStore';

const fakePromptEvent = () => {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  return event;
};

describe('createInstallStore', () => {
  it('captures the event even when nobody is subscribed yet', () => {
    const target = new EventTarget();
    const store = createInstallStore(target, () => false);
    const event = fakePromptEvent();

    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(store.getState().deferred).toBe(event);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const target = new EventTarget();
    const store = createInstallStore(target, () => false);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    target.dispatchEvent(fakePromptEvent());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    target.dispatchEvent(fakePromptEvent());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('hands the event out only once', () => {
    const target = new EventTarget();
    const store = createInstallStore(target, () => false);
    const event = fakePromptEvent();
    target.dispatchEvent(event);

    expect(store.consume()).toBe(event);
    expect(store.consume()).toBeNull();
    expect(store.getState().deferred).toBeNull();
  });

  it('marks the app installed and drops the event on appinstalled', () => {
    const target = new EventTarget();
    const store = createInstallStore(target, () => false);
    target.dispatchEvent(fakePromptEvent());

    target.dispatchEvent(new Event('appinstalled'));

    expect(store.getState()).toEqual({ deferred: null, standalone: true });
  });

  it('starts as standalone when the app already runs installed', () => {
    const store = createInstallStore(new EventTarget(), () => true);
    expect(store.getState().standalone).toBe(true);
  });
});
