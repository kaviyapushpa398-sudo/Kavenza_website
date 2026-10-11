import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

type ContainerProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * Centralized max-width + horizontal padding wrapper.
 * Keeps content alignment consistent across every section.
 */
export function Container<T extends ElementType = "div">({
  as,
  children,
  className = "",
  ...rest
}: ContainerProps<T>) {
  const Tag = as || "div";

  return (
    <Tag
      className={`mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
