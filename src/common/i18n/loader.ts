/* eslint-disable @typescript-eslint/no-require-imports */
import type { SupportedLanguage } from '../constants.js';

const enAuth = require('./translations/en/backend/auth.json') as Record<
  string,
  string
>;
const enErrors = require('./translations/en/backend/errors.json') as Record<
  string,
  string
>;
const enOrders = require('./translations/en/backend/orders.json') as Record<
  string,
  string
>;
const enPayments = require('./translations/en/backend/payments.json') as Record<
  string,
  string
>;
const enEmail = require('./translations/en/backend/email.json') as Record<
  string,
  string
>;

const frAuth = require('./translations/fr/backend/auth.json') as Record<
  string,
  string
>;
const frErrors = require('./translations/fr/backend/errors.json') as Record<
  string,
  string
>;
const frOrders = require('./translations/fr/backend/orders.json') as Record<
  string,
  string
>;
const frPayments = require('./translations/fr/backend/payments.json') as Record<
  string,
  string
>;
const frEmail = require('./translations/fr/backend/email.json') as Record<
  string,
  string
>;

const nlAuth = require('./translations/nl/backend/auth.json') as Record<
  string,
  string
>;
const nlErrors = require('./translations/nl/backend/errors.json') as Record<
  string,
  string
>;
const nlOrders = require('./translations/nl/backend/orders.json') as Record<
  string,
  string
>;
const nlPayments = require('./translations/nl/backend/payments.json') as Record<
  string,
  string
>;
const nlEmail = require('./translations/nl/backend/email.json') as Record<
  string,
  string
>;

const deAuth = require('./translations/de/backend/auth.json') as Record<
  string,
  string
>;
const deErrors = require('./translations/de/backend/errors.json') as Record<
  string,
  string
>;
const deOrders = require('./translations/de/backend/orders.json') as Record<
  string,
  string
>;
const dePayments = require('./translations/de/backend/payments.json') as Record<
  string,
  string
>;
const deEmail = require('./translations/de/backend/email.json') as Record<
  string,
  string
>;

const esAuth = require('./translations/es/backend/auth.json') as Record<
  string,
  string
>;
const esErrors = require('./translations/es/backend/errors.json') as Record<
  string,
  string
>;
const esOrders = require('./translations/es/backend/orders.json') as Record<
  string,
  string
>;
const esPayments = require('./translations/es/backend/payments.json') as Record<
  string,
  string
>;
const esEmail = require('./translations/es/backend/email.json') as Record<
  string,
  string
>;

const itAuth = require('./translations/it/backend/auth.json') as Record<
  string,
  string
>;
const itErrors = require('./translations/it/backend/errors.json') as Record<
  string,
  string
>;
const itOrders = require('./translations/it/backend/orders.json') as Record<
  string,
  string
>;
const itPayments = require('./translations/it/backend/payments.json') as Record<
  string,
  string
>;
const itEmail = require('./translations/it/backend/email.json') as Record<
  string,
  string
>;

export type Translations = Record<string, Record<string, string>>;

export const all: Record<SupportedLanguage, Translations> = {
  en: {
    auth: enAuth,
    errors: enErrors,
    orders: enOrders,
    payments: enPayments,
    email: enEmail,
  },
  fr: {
    auth: frAuth,
    errors: frErrors,
    orders: frOrders,
    payments: frPayments,
    email: frEmail,
  },
  nl: {
    auth: nlAuth,
    errors: nlErrors,
    orders: nlOrders,
    payments: nlPayments,
    email: nlEmail,
  },
  de: {
    auth: deAuth,
    errors: deErrors,
    orders: deOrders,
    payments: dePayments,
    email: deEmail,
  },
  es: {
    auth: esAuth,
    errors: esErrors,
    orders: esOrders,
    payments: esPayments,
    email: esEmail,
  },
  it: {
    auth: itAuth,
    errors: itErrors,
    orders: itOrders,
    payments: itPayments,
    email: itEmail,
  },
};
