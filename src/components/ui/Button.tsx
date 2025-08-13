import React, { ButtonHTMLAttributes, useState, useRef } from "react";
import LoadingIndicator from "./LoadingIndicator";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "warning"
    | "success"
    | "info"
    | "link";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  key: number;
}

const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counter = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const createRipple = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = btnRef.current!.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const sizeVal = Math.max(rect.width, rect.height) * 2;
    const key = counter.current++;

    setRipples((prev) => [...prev, { x, y, size: sizeVal, key }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.key !== key));
    }, 600);
  };

  const baseStyle =
    "relative overflow-hidden inline-flex items-center justify-center font-semibold rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-primary transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

  const variantStyles: Record<typeof variant, string> = {
    primary:
      "bg-golden-accent text-text-on-accent hover:bg-golden-accent-hover focus:ring-golden-focus-ring",
    secondary:
      "bg-dark-tertiary text-text-primary hover:bg-dark-border focus:ring-golden-focus-ring border border-dark-tertiary hover:border-dark-border",
    danger:
      "bg-functional-danger text-text-on-accent hover:opacity-80 focus:ring-functional-danger",
    warning:
      "bg-functional-warning text-text-on-accent hover:opacity-80 focus:ring-functional-warning",
    success:
      "bg-functional-success text-text-on-accent hover:bg-opacity-80 focus:ring-functional-success",
    info: "bg-functional-info text-text-on-accent hover:bg-opacity-80 focus:ring-functional-info",
    link: "text-golden-accent hover:text-golden-accent-hover hover:underline disabled:no-underline disabled:text-text-disabled p-0 bg-transparent focus:ring-golden-focus-ring",
  };

  const sizeStyles: Record<typeof size, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const currentSizeStyle = variant === "link" ? "" : sizeStyles[size];
  const combinedClassName = `${baseStyle} ${variantStyles[variant]} ${currentSizeStyle} ${className}`;

  return (
    <button
      {...props}
      ref={btnRef}
      disabled={disabled || isLoading}
      className={combinedClassName}
      onMouseDown={createRipple}
      onTouchStart={createRipple}
    >
      {ripples.map((r) => (
        <span
          key={r.key}
          className="absolute rounded-full bg-white/30 pointer-events-none transform scale-0 animate-ripple"
          style={{
            width: r.size,
            height: r.size,
            top: r.y - r.size / 2,
            left: r.x - r.size / 2,
          }}
        />
      ))}

      {isLoading && (
        <LoadingIndicator
          size={size === "lg" ? "md" : "sm"}
          className="absolute inset-0 flex items-center justify-center"
        />
      )}
      <span className={isLoading ? "opacity-0" : "opacity-100"}>
        {children}
      </span>
    </button>
  );
};

export default Button;
