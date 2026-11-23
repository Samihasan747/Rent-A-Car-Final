# Presentation-only vehicle assets

The backend `cars_table` has no image column, so vehicle imagery is resolved in
the frontend by `src/lib/car-images.ts` using the car's model (with the name as
a fallback). Nothing here is stored in or served by the API.

Files are local SVG illustrations. Replacing them with photography only
requires dropping in a new file with the same name — no component changes.
