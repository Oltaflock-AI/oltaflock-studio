
# Add Oltaflock Logo to App

## Overview
Add the blue feather Oltaflock logo that was just uploaded to the project, displaying it in:
1. Auth page header
2. Main dashboard header  
3. Browser favicon

## Changes Required

### 1. Copy Logo Files
Copy the uploaded logo to two locations:
- `src/assets/oltaflock-logo.jpeg` - For use in React components (Auth.tsx, Index.tsx)
- `public/favicon.jpeg` - For the browser tab favicon

### 2. Update Auth Page (`src/pages/Auth.tsx`)
Replace the placeholder Feather icon with the actual logo:
- Add import: `import oltaflockLogo from '@/assets/oltaflock-logo.jpeg'`
- Replace the icon container with an `<img>` tag showing the logo
- Remove unused `Feather` from lucide-react imports

### 3. Update Dashboard (`src/pages/Index.tsx`)  
Replace the placeholder Feather icon with the actual logo:
- Add import: `import oltaflockLogo from '@/assets/oltaflock-logo.jpeg'`
- Replace the icon container with an `<img>` tag showing the logo
- Remove unused `Feather` from lucide-react imports

### 4. Verify Favicon
The `index.html` already has the correct favicon link:
```html
<link rel="icon" href="/favicon.jpeg" type="image/jpeg">
```
Just need to ensure the file is copied to `public/favicon.jpeg`.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/assets/oltaflock-logo.jpeg` | Create (copy from upload) |
| `public/favicon.jpeg` | Create (copy from upload) |
| `src/pages/Auth.tsx` | Modify - use logo image |
| `src/pages/Index.tsx` | Modify - use logo image |

## Technical Notes
- Using `src/assets` for React component imports provides better bundling and type safety
- Using `public/` for favicon since it's referenced directly in HTML
- The logo will appear at approximately 32x32px in the header and 40x40px on the auth page
