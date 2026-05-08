export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly i18nKey?: string,
    public readonly i18nParams?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
