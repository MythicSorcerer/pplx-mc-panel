Title: Files view bulk delete + row interaction tweaks
Date: 2026-05-07

## Goal
Add a delete-mode bulk action in Files view, remove per-row edit/delete icons, and make row interactions consistent (name + emoji open/toggle). Increase spacing around the new file/folder input row.

## Non-goals
- New backend endpoints
- Permission model changes
- Editor redesign

## Current Context
- Files UI is in `client/src/views/FilesView.tsx`.
- Backend delete already supports recursive removal via `/api/files?path=...`.

## Approach (Chosen)
Delete-mode toggle with checkboxes:
- Default view is clean (no checkboxes).
- Clicking “Delete files” enters delete mode.
- Checkboxes appear left of each entry.
- Top right controls become “Delete selected” and “Cancel”.
- Row click still opens/toggles; checkbox is separate.
- Explicit confirm dialog warns about recursive deletion.

## UI/Interaction Details
- Remove per-row pencil and X icons.
- Add checkbox column before the expand arrow.
- Clicking the emoji (📁/📄) should open/toggle just like clicking the name.
- New file/folder input row gets larger vertical margins/padding to avoid rim-glow crowding.

## Data Flow
- Track `deleteMode` boolean and `selectedPaths` set.
- When delete mode is on, checkboxes toggle membership in `selectedPaths`.
- “Delete selected” performs sequential deletes via existing DELETE endpoint.
- On completion, clear selection and reload current directory.

## Error Handling
- If delete fails for any path, surface error and keep selection.
- Confirm dialog: “This will permanently delete selected files and folders (recursive).”

## Testing/Verification
- Visual: delete mode shows checkboxes and buttons; icons removed.
- Interaction: name/emoji/arrow open or toggle; checkbox only selects.
- Bulk delete removes files and non-empty folders; confirms recursively.
- New file/folder input row has increased spacing.
