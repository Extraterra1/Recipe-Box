# Mobile Recipe Panels Design

## Scope

On screens below 760px, replace the simultaneously visible Ingredients and Directions sections in recipe detail with one reading area controlled by a two-option pill toggle. Keep the existing tablet and desktop layouts unchanged.

## Interaction

- Ingredients is selected whenever a recipe detail opens or the selected recipe changes.
- The `Ingredients` and `Directions` buttons form an accessible labelled tab list. The selected button exposes its state and controls the visible panel.
- Tapping a button changes the visible panel immediately.
- A deliberate horizontal swipe left changes Ingredients to Directions; a swipe right changes Directions to Ingredients.
- A swipe must travel at least 50 pixels and be more horizontal than vertical. Vertical cooking-page scrolling must not switch panels.
- Swiping beyond the first or last panel is a no-op.

## Presentation

The mobile toggle is a compact, full-width segmented pill using the existing warm neutral surfaces, separator, typography, and deep food-red accent. Each target remains at least 44 pixels tall. Only the mobile layout hides the inactive panel; from 760px upward both existing panels remain visible in their current layout and the toggle is hidden.

## Accessibility and motion

The control uses tab semantics with `aria-selected`, `aria-controls`, labelled tab panels, and keyboard-operable native buttons. Panel changes use a restrained opacity/transform transition and respect the existing reduced-motion rule. Touch handling does not cancel ordinary vertical scrolling.

## Testing

Component tests cover Ingredients as the default, tap switching, left/right swipe switching, ignoring short or vertical gestures, and resetting to Ingredients when a different recipe opens. CSS assertions protect the mobile-only toggle/inactive-panel behavior and the unchanged wider-screen presentation.
