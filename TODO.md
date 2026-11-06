# Hue Helper — Product outcomes

## Color scanning and picking
- [x] Identify colors from a live device camera with a marker over the area being analyzed; tap or keyboard-navigate to sample points.
- [x] Allow users to upload an image and choose a point or area in it to identify its color.
- [x] Provide clear camera-permission and scanning-error messages, and keep photo upload and manual color entry available when camera access is unavailable.

## Color identification and catalog
- [x] Display a large color sample with automatically adjusted text contrast and identify the nearest common color name, HEX, RGB, and HSL values.
- [x] Include 148 CSS named colors in a broad catalog searchable by color name or HEX, RGB, and HSL color code.
- [x] Show similar/nearest catalog color names when the sampled color does not exactly match a named catalog color.
- [x] Let users type named colors, HEX values, RGB values, and HSL values to identify colors.
- [x] Accept sampled colors across the RGB color range, rather than limiting identification to a small preset palette.
- [x] Expand the color-name catalog beyond the existing 148 CSS colors with the curated 32,004-name `meodai/color-names` dataset; retain the CSS colors and make the expanded entries available to search, typed-name identification, and nearest-color matching.
- [x] Keep the expanded catalog usable on mobile by rendering results in pages rather than placing tens of thousands of swatches in the page at once; searches must still cover the full catalog.
- [x] Credit the expanded color-name dataset in the app.

## Saved results and sharing
- [x] Save scan results locally so previously identified colors can be revisited.
- [x] Provide quick copying of color codes and sharing of an identification result.
- [ ] Let users add the currently identified color to a persistent palette, view the palette's color swatches and HEX values, and remove individual colors or clear the palette.
- [ ] Let users export the palette as a downloadable PNG image and copy or share its color names and HEX values; keep export and sharing actions available on mobile and desktop.

## Responsive, accessible, and multilingual interface
- [x] Make the application responsive and fully functional on mobile and desktop, touch-friendly, and accessible.
- [x] Make color identification clear and easy to understand for people who do not know color names.
- [x] Provide a language selector for Indonesian and English, translate the app's navigation, labels, buttons, help, status, and error messages into both languages, and persist the user's selected language.
- [x] Automatically default to Indonesian when the browser language is Indonesian and to English otherwise; update the page's language metadata when the selection changes.
- [ ] Translate the new palette-building, export, share, removal, and status text into Indonesian and English.
