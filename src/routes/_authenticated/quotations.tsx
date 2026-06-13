import { createFileRoute } from "@tanstack/react-router";
import { DraftsList } from "./drafts";

export const Route = createFileRoute("/_authenticated/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Shop POS" }] }),
  component: () => <DraftsList type="quotation" title="Quotations" subtitle="Saved quotes you can convert into sales" />,
});