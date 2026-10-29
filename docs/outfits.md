# Outfits

The schema stores outfits across `outfit`, `outfit_equipment`, and `outfit_image`.
Each outfit belongs to one game and one Better Auth user. Titles are required and
limited to 100 characters; descriptions are required and limited to 2,000.
There is no update timestamp. The planned submission flow will publish immutable
outfits, with no drafts, revisions, or editing.

## Equipment

An outfit can have one catalog item in each of six positions: head, chest, arms,
legs, left hand, and right hand. All positions are optional. Armor must match its
position; either hand accepts an armament. The `outfit_position_slot` table lists
the slot each position accepts, and foreign keys enforce the game's catalog and
these rules. The schema does not model two-handing or other wielding details.

## Images

An outfit can have up to two portraits and one landscape image. The database
stores each image's role and unique object-storage key, not its bytes, dimensions,
or file size. RustFS supplies S3-compatible storage in development. Uploads and
image validation are not implemented yet; the planned upload flow will accept
WebP and enforce fixed dimensions and file-size limits.

Publishing will require `portrait-1` as the thumbnail. The database limits image
roles but cannot require that an outfit has an image, so the publishing service
must enforce this minimum.

Deleting a user cascades to their outfit, equipment-selection, and image rows.
The database cannot delete the corresponding objects from storage; account
deletion must handle those separately when implemented.
