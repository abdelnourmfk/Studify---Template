# 🎨 Design System Guide - INFO_7 Platform

## Color Palette

### Primary Gradients (Role-Based)

#### 👨‍🎓 Student Dashboard
```
Gradient: from-blue-600 to-blue-800
RGB: #2563eb → #1e40af
Usage: Primary actions, badges, highlights
```

#### 👨‍🏫 Teacher Dashboard
```
Gradient: from-green-600 to-green-800
RGB: #16a34a → #166534
Usage: Primary actions, badges, highlights
```

#### 👨‍💼 Admin/Agent Dashboard
```
Gradient: from-purple-600 to-purple-800
RGB: #9333ea → #6b21a8
Usage: Primary actions, badges, highlights
```

### Secondary Colors

#### Background
```
Primary: #0f172a (slate-900)
Secondary: #1e293b (slate-800)
Tertiary: #334155 (slate-700)
Text on Dark: #f1f5f9 (slate-100)
```

#### Status Colors
```
Success: #10b981 (green-500)
Error: #ef4444 (red-500)
Warning: #f59e0b (amber-500)
Info: #3b82f6 (blue-500)
```

#### Semi-Transparent
```
Primary Overlay: rgba(15, 23, 42, 0.1)
Glass Background: rgba(255, 255, 255, 0.1)
Hover State: rgba(255, 255, 255, 0.05)
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 
             'Droid Sans', 'Helvetica Neue', sans-serif;
```

### Text Hierarchy

#### Headings
```
H1: 2.25rem (36px) | font-bold | text-white
H2: 1.875rem (30px) | font-bold | text-gray-100
H3: 1.5rem (24px) | font-semibold | text-gray-50
H4: 1.25rem (20px) | font-semibold | text-gray-100
```

#### Body Text
```
Large: 1.125rem (18px) | Regular weight
Default: 1rem (16px) | Regular weight
Small: 0.875rem (14px) | Regular weight
Tiny: 0.75rem (12px) | Regular weight
```

#### Special Text
```
Labels: 0.875rem | font-medium | text-gray-200
Captions: 0.75rem | font-normal | text-gray-400
Link: text-blue-400 | hover:text-blue-300 | transition
```

---

## Spacing System

### Consistent Spacing Scale
```
xs:  0.25rem (4px)
sm:  0.5rem  (8px)
md:  1rem    (16px)
lg:  1.5rem  (24px)
xl:  2rem    (32px)
2xl: 2.5rem  (40px)
3xl: 3rem    (48px)
4xl: 4rem    (64px)
```

### Usage Guidelines
```
Button padding:    px-4 py-3 (md h, md v)
Card padding:      p-8 (2xl)
Section margin:    mb-8 (2xl)
Input padding:     px-4 py-3 (md)
Modal padding:     p-8 (2xl)
```

---

## Components & Patterns

### Buttons

#### Primary Button
```jsx
className="bg-gradient-to-r from-blue-600 to-blue-700 
           hover:from-blue-700 hover:to-blue-800 
           text-white font-semibold rounded-lg 
           transition-all duration-300 
           transform hover:scale-[1.02] active:scale-95"
```

#### Secondary Button
```jsx
className="px-4 py-3 bg-white/10 border border-white/20 
           rounded-lg hover:bg-white/20 
           transition-all duration-300 text-white"
```

#### Icon Button
```jsx
className="p-2 rounded-lg hover:bg-gray-100 
           transition-colors"
```

### Input Fields

#### Default Input
```jsx
className="w-full px-4 py-3 bg-white/10 border border-white/20 
           rounded-lg focus:outline-none focus:border-blue-500 
           focus:ring-2 focus:ring-blue-500/20 
           transition-all text-white placeholder-gray-400"
```

#### Focus State
```
Border: blue-500 (or role-specific color)
Ring: 2px, color/20 opacity
Shadow: Subtle glow effect
Transition: 200ms duration
```

### Cards

#### Default Card
```jsx
className="bg-white/10 backdrop-blur-xl rounded-2xl 
           shadow-2xl border border-white/20 
           p-8 space-y-6"
```

#### Hover State
```jsx
className="card-hover" // from utilities
// Includes: shadow-xl, -translate-y-1, transition-all
```

### Forms

#### Form Groups
```jsx
className="space-y-4" // Vertical stacking
// - Label: text-sm font-medium text-gray-200 mb-2
// - Input: Full width input
// - Helper: text-xs text-gray-400 mt-1
```

#### Validation States
```
Valid: border-green-500, ring-green-500/20
Invalid: border-red-500, ring-red-500/20
Focus: border-primary-500, ring-primary-500/20
Disabled: opacity-50, cursor-not-allowed
```

### Navigation

#### Navbar
```jsx
className="fixed w-full top-0 z-50 
           transition-all duration-300
           shadow-lg backdrop-blur-md bg-white/95"
```

#### Tab Navigation
```jsx
// Active tab:
className="border-b-2 border-primary-500 text-primary-600"

// Inactive tab:
className="text-gray-500 hover:text-gray-700"

// Transitions: 300ms ease-out
```

### Badges & Tags

#### Role Badge
```jsx
className="px-3 py-1 rounded-full text-sm font-medium 
           text-white bg-gradient-to-r [role-gradient]"
```

#### Status Badge
```
Success: bg-green-500/20 text-green-200
Error: bg-red-500/20 text-red-200
Warning: bg-amber-500/20 text-amber-200
Info: bg-blue-500/20 text-blue-200
```

### Modals & Dialogs

#### Modal Container
```jsx
className="fixed inset-0 bg-black/50 backdrop-blur-sm 
           flex items-center justify-center z-50
           animate-fadeIn"
```

#### Modal Content
```jsx
className="bg-white/10 backdrop-blur-xl rounded-2xl 
           shadow-2xl border border-white/20 
           p-8 max-w-md w-full
           animate-scaleIn"
```

---

## Animation System

### Animation Durations
```
Fast:    150-200ms  (micro-interactions)
Medium:  300-400ms  (element transitions)
Slow:    500-800ms  (page transitions)
Very Slow: 1000ms+   (background animations)
```

### Easing Functions
```
ease-in:      Slow start
ease-out:     Slow end (most common)
ease-in-out:  Slow start and end
ease-linear:  Constant speed
cubic-bezier: Custom curves
```

### Common Animation Patterns

#### Entry Animations
```javascript
fadeInUp:   Fade + slide up (slow intro)
slideInLeft: Slide from left (navigation)
slideInRight: Slide from right (panels)
scaleIn:   Scale from center (modals)
```

#### Exit Animations
```javascript
fadeOut:   Fade out
slideDown: Slide down
scaleOut:  Scale to center
```

#### Interaction Animations
```javascript
Hover Scale: scale-105 (5% growth)
Click Scale: scale-95 (5% compression)
Loading Spin: 360° rotation, 2s linear infinite
```

#### Attention Animations
```javascript
Shake:   Alert/error state (0.5s)
Pulse:   Gentle pulsing (3s infinite)
Glow:    Glowing effect (2s infinite)
```

### Animation Utilities
```css
.animate-fadeIn       { animation: fadeIn 0.3s ease-in-out; }
.animate-fadeInUp     { animation: fadeInUp 0.5s ease-out; }
.animate-slideInLeft  { animation: slideInLeft 0.5s ease-out; }
.animate-shake        { animation: shake 0.5s ease-in-out; }
.animate-scaleIn      { animation: scaleIn 0.3s ease-out; }
.btn-hover            { hover:scale-105 active:scale-95; }
.card-hover           { hover:shadow-xl hover:-translate-y-1; }
```

---

## Responsive Design

### Breakpoints
```
Mobile:    < 640px   (default, no prefix)
sm:        ≥ 640px   (sm:)
md:        ≥ 768px   (md:)
lg:        ≥ 1024px  (lg:)
xl:        ≥ 1280px  (xl:)
2xl:       ≥ 1536px  (2xl:)
```

### Mobile-First Approach
```jsx
// Default (mobile)
className="flex flex-col gap-4"

// Tablet and up
className="flex flex-col gap-4 md:flex-row md:gap-8"

// Desktop and up
className="flex flex-col gap-4 md:flex-row md:gap-8 lg:gap-12"
```

### Common Responsive Patterns
```jsx
// Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Navigation
className="hidden md:flex items-center gap-8"

// Padding
className="px-4 py-6 md:px-8 md:py-12"

// Text
className="text-sm md:text-base lg:text-lg"
```

---

## Accessibility (A11y)

### Color Contrast
```
Normal Text:     4.5:1 ratio minimum
Large Text:      3:1 ratio minimum
Interactive:     3:1 ratio for focus states
```

### Focus States
```jsx
// Always visible
outline: 2px solid blue (or ring-2 ring-blue-500)
outlineOffset: 2px
transition: 200ms
```

### ARIA Labels
```jsx
<button aria-label="Close menu" onClick={closeMenu}>
  ✕
</button>

<nav aria-label="Main navigation">
  ...
</nav>

<span aria-hidden="true">→</span>
```

### Keyboard Navigation
```
Tab:        Navigate through interactive elements
Enter:      Activate buttons/links
Escape:     Close modals/menus
Arrow Keys: Navigate within lists/tabs
```

---

## Loading States

### Loading Spinner
```jsx
<div className="w-5 h-5 border-2 border-white/30 
                border-t-white rounded-full 
                animate-spin"></div>
```

### Loading Skeleton
```jsx
<div className="bg-gray-300 animate-pulse rounded h-4 w-full mb-2"></div>
```

### Loading Text
```jsx
"Loading..." | "Processing..." | "Saving..."
```

---

## Dark Mode Considerations

### Color Strategy
```
Text on Dark:   Use light colors (100-200 range)
Backgrounds:    Use dark colors (800-900 range)
Accents:        Use bright, full-saturation colors
Borders:        Use white/20-50 transparency
```

### Contrast Requirements
```
AAA Compliance (recommended):
- Normal text: 7:1 ratio
- Large text: 4.5:1 ratio

AA Compliance (minimum):
- Normal text: 4.5:1 ratio
- Large text: 3:1 ratio
```

---

## Print Styles

```css
@media print {
  .no-print { display: none; }
  background: white;
  color: black;
  box-shadow: none;
}
```

---

## Performance Considerations

### CSS Optimization
```
✅ Use transform/opacity for animations
✅ Avoid animating layout properties
✅ Enable GPU acceleration (will-change)
✅ Minimize repaints/reflows
```

### Animation Best Practices
```javascript
✅ Keep animations under 300ms for microinteractions
✅ Use cubic-bezier() for natural motion
✅ Respect prefers-reduced-motion
✅ Test on low-end devices
```

### Loading Performance
```
✅ Lazy load images
✅ Code split components
✅ Minify CSS/JS
✅ Enable gzip compression
```

---

## Component Library

### Pre-built Components
- ✅ Navbar
- ✅ Login/Register Cards
- ✅ Dashboard Cards
- ✅ Data Tables
- ✅ Form Inputs
- ✅ Buttons (Primary, Secondary, Icon)
- ✅ Badges
- ✅ Modals
- ✅ Alerts
- ✅ Loading Spinners

### Custom Hooks
- ✅ useAuth (authentication state)
- ✅ useLocalStorage (persistent state)
- ✅ useWindowSize (responsive design)
- ✅ useFetch (API calls)

---

## Customization Guide

### Changing Primary Color
```javascript
// In Tailwind config
colors: {
  primary: {
    50: '#...',
    100: '#...',
    // ... 200-900
  }
}

// Update all gradients
from-primary-600 to-primary-800
```

### Adjusting Animations Speed
```css
/* In index.css */
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
  /* Change 0.3s to desired duration */
}
```

### Custom Theme
```javascript
// Create theme object
const theme = {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
  radius: '0.5rem',
  shadows: 'xl'
}
```

---

## Current Status

✅ **Complete**: Dark theme, gradients, animations, responsive design
⏳ **Future**: Light theme toggle, custom theme builder, component storybook

---

**Last Updated**: February 16, 2026  
**Version**: 1.0
