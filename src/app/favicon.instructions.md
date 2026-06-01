# Favicon Instructions

To add the logo as favicon:

1. Go to https://favicon.io/favicon-converter/
2. Upload: public/logo-icon.png
3. Download the generated files
4. Place in /public/:
   - favicon.ico
   - favicon-16x16.png
   - favicon-32x32.png
   - apple-touch-icon.png

Then add to src/app/layout.tsx:
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
