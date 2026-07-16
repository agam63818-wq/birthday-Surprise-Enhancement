import { forwardRef, type ButtonHTMLAttributes } from "react";

export type GlowButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Primary CTA button — shimmer sweep + soft glow bloom on hover/focus.
 * Built on the existing .btn-primary styling (script font is fine here:
 * CTA labels are short emotional copy). Use for "Open It", "Continue", etc.
 */
const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className = "", children, ...rest }, ref) => (
    <button ref={ref} className={`btn-primary glow-btn ${className}`.trim()} {...rest}>
      {children}
    </button>
  ),
);

GlowButton.displayName = "GlowButton";
export default GlowButton;
