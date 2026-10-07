import { createElement, type ComponentType } from "react";
import AdmitCardCard, { type AdmitCardCardProps } from "../../AdmitCardCard";

export type AdmitCardTemplateId = "template1" | "template2";

export const DEFAULT_TEMPLATE_ID: AdmitCardTemplateId = "template1";

const TestTemplate2: ComponentType<AdmitCardCardProps> = (props) =>
  createElement(
    "div",
    null,
    createElement(
      "p",
      { className: "text-center font-bold text-red-600 print:hidden" },
      "TEMPLATE 2 TEST"
    ),
    createElement(AdmitCardCard, props)
  );

export const TEMPLATE_COMPONENTS: Record<
  AdmitCardTemplateId,
  ComponentType<AdmitCardCardProps>
> = {
  template1: AdmitCardCard,
  template2: TestTemplate2,
};

export function isValidTemplateId(id: unknown): id is AdmitCardTemplateId {
  return (
    typeof id === "string" &&
    Object.prototype.hasOwnProperty.call(TEMPLATE_COMPONENTS, id)
  );
}