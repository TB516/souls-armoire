# Next steps

The schema, equipment catalog, local object storage, development seed, cached
outfit queries, and authenticated submission are in place. The catalog supports title
search, per-position equipment filters, sorting, and outfit pages with screenshots and
equipment links. Signed-in users can publish rate-limited, immutable outfits.

1. Implement outfit and account deletion, including stored image objects as well as
   database rows. The publication limit counts existing outfits, so decide whether
   deleted outfits should still count toward it.
2. Add moderation for published outfits.

Before deployment, configure CDN caching for equipment catalogs and static icons,
including how catalog updates invalidate cached responses.

Drafts, revisions, editing, and soft deletion are outside the first version.
