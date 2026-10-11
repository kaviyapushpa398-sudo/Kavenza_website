# Individual product pages (future)

Not implemented yet. When routing is introduced, each product from
`src/data/products.ts` should get a page here, matched by its `slug`:

```
/products/campusflow-ai  -> data.products.find(p => p.slug === "campusflow-ai")
/products/clipmind-ai    -> data.products.find(p => p.slug === "clipmind-ai")
```

The "Explore Product" buttons on the homepage (`components/ProductCard.tsx`)
already link to `/products/{slug}`, so once a router is added, wiring these
pages up is just a matter of adding routes — no changes needed on the
homepage side.

Wrap each routed product page in `components/PageTransition.tsx` for the
shared, reduced-motion-aware enter treatment. Use the router's location key
with `AnimatePresence` when adding exit transitions so route changes remain
intentional and accessible.
