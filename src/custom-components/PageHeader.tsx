import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Heading text shown on the left. */
  title?: string;
  /** Extra Tailwind classes for the title (default text colour is black). */
  titleStyle?: string;
  /** Supporting text rendered underneath the title. */
  description?: string;
  /** Extra Tailwind classes for the description (default text colour is black). */
  descriptionStyle?: string;
  /** Any node (e.g. a <Button />) rendered on the right side. */
  button?: ReactNode;
  /** Extra Tailwind classes for the header wrapper (default background is white). */
  className?: string;
}

function PageHeader({
  title,
  titleStyle = "",
  description,
  descriptionStyle = "",
  button,
  className = "",
}: PageHeaderProps) {
  return (
    <section
      className={`flex w-full flex-col gap-3 bg-white px-4 py-2 rounded-lg sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
    >
      <div className="min-w-0">
        {title && (
          <h1
            className={`text-xl font-bold tracking-tight text-black sm:text-2xl ${titleStyle}`}
          >
            {title}
          </h1>
        )}
        {description && (
          <p
            className={`mt-1 text-sm text-black sm:text-base ${descriptionStyle}`}
          >
            {description}
          </p>
        )}
      </div>

      {button && <div className="ml-auto shrink-0 pt-1 sm:pt-0">{button}</div>}
    </section>
  );
}

export default PageHeader;
