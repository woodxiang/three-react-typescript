import { isBrowser, isNode } from '../environment';

test('browser detect test', () => {
  expect(isBrowser()).not.toBeTruthy();
});

test('node detect test', () => {
  expect(isNode()).toBeTruthy();
});
