export function expectMockToBeCalledWith(fn: jest.Mock, n: number, args: any[][]) {
  expect(fn).toBeCalledTimes(n);
  [...Array(n)].map(
    (_, i: number) =>
      expect(fn.mock.calls[i]).toEqual(args[i]));
}
