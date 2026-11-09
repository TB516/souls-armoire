# Outfits

The schema stores outfits across `outfit`, `outfit_equipment`, and `outfit_image`.
Each outfit belongs to one game and one Better Auth user. Titles are required and
limited to 100 characters; descriptions are required and limited to 2,000.
There is no update timestamp. Submission publishes immutable outfits, with no drafts,
revisions, or editing.

## Equipment

An outfit can have one catalog item in each of six positions: head, chest, arms,
legs, left hand, and right hand. All positions are optional. Armor must match its
position; either hand accepts an armament. Foreign keys and a check constraint
enforce the game's catalog and these slot rules. The schema does not model
two-handing or other wielding details.

## Images

An outfit can have up to two portraits and one landscape image. The database
stores each image's role and unique object-storage key, not its bytes, dimensions,
or file size. RustFS supplies S3-compatible storage in development.

Portraits are 800 × 1200 pixels and the landscape image is 1200 × 800. Each stored
image is a WebP file of at most 2 MB, and `src/lib/outfit-submission.ts` defines these
limits for the browser and server. Publishing requires `portrait-1` as the thumbnail.
The database limits image roles but cannot require that an outfit has an image, so
the publishing operation enforces this minimum.

## Publishing

Signed-in users submit outfits at `/<game>/submit`. The browser accepts any image it
can decode, up to 20 MB, and crops it at the fixed aspect ratio. On publishing, it
scales each crop to the role's dimensions and converts it to WebP. Original files are
never uploaded. Browsers that cannot encode WebP show an error instead of publishing.

The server checks the session, then the submitted fields, WebP signatures, dimensions,
sizes, and equipment. Equipment must exist in the game's catalog and fit its position.
Each account can publish 10 outfits in any rolling 24 hours, counted from its outfit
rows. The insert transaction locks the author's user row so concurrent submissions
cannot exceed the limit. Deleting outfits will lower this count once deletion exists.

Images are stored under `outfits/<outfit id>/<role>.webp` before the database insert,
so a committed outfit always has its images. If an upload or the insert fails, that
attempt's objects are deleted. A failed cleanup is logged and leaves orphaned objects.

Deleting a user cascades to their outfit, equipment-selection, and image rows.
The database cannot delete the corresponding objects from storage; account
deletion must handle those separately when implemented.
