import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { productVendors, vendors } from '../../database/schema/index.js';

export type VendorRow = typeof vendors.$inferSelect;
export type ProductVendorRow = typeof productVendors.$inferSelect;

export interface ResolvedVendor {
  productVendor: ProductVendorRow;
  vendor: VendorRow;
}

const EU_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

@Injectable()
export class VendorsService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  countryToRegion(country: string | null | undefined): string {
    if (!country) return 'GLOBAL';
    const code = country.toUpperCase();
    if (code === 'GB' || code === 'UK') return 'UK';
    if (code === 'US') return 'US';
    if (EU_COUNTRIES.has(code)) return 'EU';
    return 'GLOBAL';
  }

  async resolveVendor(
    productId: string,
    region: string,
  ): Promise<ResolvedVendor | undefined> {
    const candidateRegions =
      region === 'GLOBAL' ? ['GLOBAL'] : [region, 'GLOBAL'];

    const rows = await this.db
      .select({
        pv: productVendors,
        v: vendors,
      })
      .from(productVendors)
      .innerJoin(vendors, eq(vendors.id, productVendors.vendorId))
      .where(
        and(
          eq(productVendors.productId, productId),
          inArray(productVendors.region, candidateRegions),
          eq(vendors.isActive, true),
        ),
      )
      .orderBy(asc(productVendors.region));

    const primary = rows.find(
      (row) => row.pv.region === region && row.pv.isPrimary,
    );
    if (primary) return { productVendor: primary.pv, vendor: primary.v };

    const anyForRegion = rows.find((row) => row.pv.region === region);
    if (anyForRegion) {
      return { productVendor: anyForRegion.pv, vendor: anyForRegion.v };
    }

    const globalPrimary = rows.find(
      (row) => row.pv.region === 'GLOBAL' && row.pv.isPrimary,
    );
    if (globalPrimary) {
      return { productVendor: globalPrimary.pv, vendor: globalPrimary.v };
    }

    const anyGlobal = rows.find((row) => row.pv.region === 'GLOBAL');
    return anyGlobal
      ? { productVendor: anyGlobal.pv, vendor: anyGlobal.v }
      : undefined;
  }
}
