import { Inject } from '@nestjs/common';

export const DRIZZLE = Symbol('DRIZZLE');
export const InjectDrizzle = () => Inject(DRIZZLE);
