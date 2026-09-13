import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      // The <marquee> element is obsolete but still used by Advertise.
      marquee: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        direction?: string;
      };
    }
  }
}

export {};