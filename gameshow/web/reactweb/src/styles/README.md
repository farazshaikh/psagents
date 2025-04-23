# Styling and Theming System

## Overview
This directory contains our application's styling system, built with CSS variables for easy theming and consistent design across components.

## Directory Structure
```
styles/
├── themes/              # Theme-specific CSS variable definitions
│   └── instagram.css    # Instagram theme (current default)
├── global.css           # Global styles and utility classes
└── README.md           # This documentation
```

## Theming System

### How It Works
- All theme-specific values (colors, spacing, typography, etc.) are defined as CSS variables in theme files
- Global styles and components use these variables instead of hard-coded values
- Switching themes only requires changing the theme import in `global.css`

### Current Theme: Instagram
The current theme (`instagram.css`) provides variables following Instagram's design patterns:
- Color scheme (Instagram blue, greys, etc.)
- Typography (system fonts, specific sizes)
- Spacing (4px grid system)
- Border radius values
- Shadow styles
- Container widths
- Transition timings

### Theme Variables
Available CSS variables are organized into categories:

```css
/* Colors */
--primary
--primary-light
--primary-dark
--secondary
--secondary-light
--secondary-dark

/* Backgrounds */
--background-white
--background-light
--background-dark
--border-color
--separator-color

/* Typography */
--font-family-primary
--font-family-secondary
--font-size-[xs/sm/base/lg/xl/2xl/3xl]
--font-weight-[normal/medium/semibold/bold]

/* Spacing */
--spacing-[xs/sm/md/lg/xl/2xl/3xl]

/* Borders */
--radius-[sm/md/lg/full]

/* Shadows */
--shadow-[sm/md/lg/xl]

/* Z-index */
--z-[negative/elevate/sticky/drawer/modal/popover/toast]

/* Transitions */
--transition-[fast/normal/slow]

/* Containers */
--container-[sm/md/lg/xl]
```

### Using the Theme
1. In component CSS:
```css
.my-component {
  color: var(--text-primary);
  padding: var(--spacing-md);
  background: var(--background-light);
  border-radius: var(--radius-md);
}
```

2. Using utility classes (from global.css):
```html
<div class="bg-light p-md text-primary">
  Styled content
</div>
```

## Creating New Themes

1. Create a new theme file in the `themes` directory:
```
styles/themes/your-theme.css
```

2. Copy the variable structure from `instagram.css`

3. Update the values to match your theme's design system

4. Switch to the new theme by updating the import in `global.css`:
```css
@import './themes/your-theme.css';
```

## Best Practices

1. **Always Use Variables**
   - Never hardcode values that could be reused
   - Use theme variables for consistency

2. **Component-Specific Styles**
   - Keep component styles focused and specific
   - Use theme variables for all themeable properties

3. **Utility Classes**
   - Use utility classes from `global.css` for common patterns
   - Create new utility classes if patterns are repeated often

4. **Responsive Design**
   - Use the provided breakpoints for consistency
   - Follow mobile-first approach

5. **Documentation**
   - Document any new variables added to themes
   - Update this README when making significant changes

## Common Patterns

### Cards
```css
.card {
  background: var(--background-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
}
```

### Buttons
```css
.button-primary {
  background-color: var(--primary);
  color: var(--text-white);
  padding: var(--spacing-xs) var(--spacing-lg);
  border-radius: var(--radius-md);
}
```

### Text Styles
```css
.heading {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-2xl);
  color: var(--text-primary);
}
```

## Contributing
When contributing to the styling system:
1. Follow the existing variable naming conventions
2. Document any new variables or patterns
3. Test changes across different screen sizes
4. Ensure backward compatibility when modifying existing variables 