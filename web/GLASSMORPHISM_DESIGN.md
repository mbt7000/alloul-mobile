# Glassmorphism Design System

## Overview
Premium dark glass aesthetic with blur and transparency effects. Inspired by modern UI design trends.

## Color Palette

### Base Colors
- **Primary Dark**: `#0F172A` (Slate-950)
- **Secondary Dark**: `#1E293B` (Slate-800)
- **Tertiary Dark**: `#334155` (Slate-700)
- **Text Primary**: `#F1F5F9` (Slate-100)
- **Text Secondary**: `#CBD5E1` (Slate-300)

### Accent Colors
- **Cyan**: `#00D4FF` - Primary accent
- **Purple**: `#A855F7` - Secondary accent
- **Emerald**: `#10B981` - Success accent

## Component Library

### GlassPanel
Base container with blur and transparency.

```jsx
<GlassPanel variant="lg" accent="cyan" interactive>
  Your content here
</GlassPanel>
```

**Variants:**
- `default` - Standard glass effect
- `sm` - Small with less blur
- `lg` - Large with more blur
- `xl` - Extra large for modals

### GlassButton
Interactive button with glass styling.

```jsx
<GlassButton variant="primary" size="md">
  Click me
</GlassButton>
```

**Variants:**
- `default` - Standard glass button
- `primary` - Cyan gradient with glow
- `secondary` - Subtle glass effect

**Sizes:**
- `sm` - Small
- `md` - Medium (default)
- `lg` - Large

### GlassInput
Text input with glass styling.

```jsx
<GlassInput
  label="Email"
  placeholder="Enter your email"
  error={error}
/>
```

### GlassCard
Card component with title and description.

```jsx
<GlassCard
  title="Feature Title"
  description="Feature description"
  accent="purple"
>
  Card content
</GlassCard>
```

### GlassModal
Modal dialog with glass background.

```jsx
<GlassModal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
>
  Modal content
</GlassModal>
```

### GlassGrid
Responsive grid for glass cards.

```jsx
<GlassGrid columns={3} gap="lg">
  <GlassCard title="Card 1" />
  <GlassCard title="Card 2" />
  <GlassCard title="Card 3" />
</GlassGrid>
```

## CSS Variables

All glass effects use CSS custom properties for consistency:

```css
--glass-bg-primary: rgba(15, 23, 42, 0.5);
--glass-blur: 8px;
--glass-shadow-md: 0 12px 32px rgba(0, 0, 0, 0.3);
--glass-accent-cyan: rgba(0, 212, 255, 0.1);
```

## Usage Examples

### Dashboard Layout
```jsx
<GlassPanel variant="lg" className="p-8">
  <h1 className="glass-text text-3xl font-bold mb-6">Dashboard</h1>
  
  <GlassGrid columns={3} gap="lg">
    <GlassCard title="Total Users" accent="cyan">
      <p className="glass-text text-2xl font-bold">1,234</p>
    </GlassCard>
    <GlassCard title="Revenue" accent="emerald">
      <p className="glass-text text-2xl font-bold">$45,678</p>
    </GlassCard>
    <GlassCard title="Growth" accent="purple">
      <p className="glass-text text-2xl font-bold">+23%</p>
    </GlassCard>
  </GlassGrid>
</GlassPanel>
```

### Form Layout
```jsx
<GlassModal isOpen={true} title="Create Project">
  <GlassInput label="Project Name" placeholder="Enter name" />
  <GlassInput label="Description" placeholder="Enter description" />
  
  <div className="flex gap-3 mt-6">
    <GlassButton variant="primary" className="flex-1">
      Create
    </GlassButton>
    <GlassButton variant="default" className="flex-1">
      Cancel
    </GlassButton>
  </div>
</GlassModal>
```

## Accessibility

- All components support dark mode
- Reduced motion is respected
- High contrast text for readability
- Focus states are clearly visible
- ARIA attributes are included

## Performance

- CSS-based glass effect (no JavaScript overhead)
- GPU-accelerated blur via `backdrop-filter`
- Lazy loading for modal components
- Optimized shadows for performance

## Browser Support

- Chrome/Edge 76+
- Firefox 103+
- Safari 9+
- Mobile browsers with backdrop-filter support

For older browsers, a solid fallback background is applied.

## Design Principles

1. **Depth** - Multiple layers with blur create visual depth
2. **Clarity** - High contrast text ensures readability
3. **Motion** - Smooth transitions enhance interactivity
4. **Consistency** - All components use the same design language
5. **Accessibility** - Support for all users

---

**Last Updated:** 2026-04-15
**Status:** Production Ready
