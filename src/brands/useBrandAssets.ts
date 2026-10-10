import { useCallback } from 'react';
import { useElements, type StudioElement } from '@/hooks/useElements';
import type { BrandAssets } from './compose';
import type { BrandKit, BrandProduct } from './types';

/**
 * The brand's pack shots and logo, read from the user's Elements by name
 * (e.g. @MasalaMania, @PromunchLogo). Anything missing just means the job
 * runs without that reference.
 */
export function useBrandAssets(brand: BrandKit) {
  const { elements, byName, isLoading } = useElements();

  const productElement = useCallback((p: BrandProduct): StudioElement | undefined => byName(p.element), [byName]);
  const logo = byName(brand.logoElement);

  /** References for one product, or one pack per product for the whole range. */
  const assetsFor = useCallback(
    (product?: BrandProduct): BrandAssets => {
      const packRefs = product
        ? productElement(product)?.image_urls ?? []
        : brand.products.map((p) => productElement(p)?.image_urls[0]).filter((u): u is string => !!u);
      return { packRefs, logoRefs: logo?.image_urls.slice(0, 1) ?? [] };
    },
    [brand.products, productElement, logo],
  );

  const ready = brand.products.filter((p) => productElement(p)).length;

  return { elements, isLoading, logo, productElement, assetsFor, ready };
}
