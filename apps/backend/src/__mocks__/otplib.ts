export const generateSecret = jest.fn(() => 'MOCKSECRETBASE32ENCODED');

export const generateURI = jest.fn(
  (opts: { issuer: string; label: string; secret: string }) =>
    `otpauth://totp/${opts.issuer}:${opts.label}?secret=${opts.secret}&issuer=${opts.issuer}`,
);

export const verifySync = jest.fn(() => ({ valid: true, delta: 0 }));

export const verify = jest.fn(() => Promise.resolve({ valid: true, delta: 0 }));

export const generateSync = jest.fn(() => '123456');

export const generate = jest.fn(() => Promise.resolve('123456'));
