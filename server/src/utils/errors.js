export class AppError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export function assert(condition, status, message, code) {
  if (!condition) throw new AppError(status, message, code);
}
export const missing = () => new AppError(404, 'This record is unavailable.', 'NOT_FOUND');
