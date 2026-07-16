import { forwardRef, type HTMLAttributes } from "react";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** dark = main glassmorphism panel, light = subtler glass. */
  variant?: "dark" | "light";
  /** Play the cinematic page-enter animation on mount. */
  enter?: boolean;
}

/**
 * Glassmorphism panel used for the hero card and section containers.
 * Wraps the existing .glass-card / .glass-card-dark styles.
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = "dark", enter = false, className = "", children, ...rest }, ref) => (
    <div
      ref={ref}
      className={`${variant === "light" ? "glass-card" : "glass-card-dark"}${enter ? " page-enter" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  ),
);

GlassCard.displayName = "GlassCard";
export default GlassCard;
