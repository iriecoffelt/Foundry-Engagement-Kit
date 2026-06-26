interface SlideOverBackdropProps {
  onClose: () => void;
}

/** Dims content behind a slide-over panel on narrow viewports (hidden on lg+). */
export function SlideOverBackdrop({ onClose }: SlideOverBackdropProps) {
  return (
    <button
      type="button"
      aria-label="Close panel"
      className="fixed inset-0 z-[90] bg-black/50 lg:hidden"
      onClick={onClose}
    />
  );
}

/** Classes for a right-side detail panel that becomes a slide-over below lg. */
export const slideOverPanelClass =
  "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[90] max-lg:w-[min(22rem,100vw)] max-lg:shadow-2xl";
