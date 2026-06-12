import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/simple-crud";

export const Route = createFileRoute("/_authenticated/brands")({
  head: () => ({ meta: [{ title: "Brands — Photon POS" }] }),
  component: () => (
    <SimpleCrud
      table="brands"
      title="Brands"
      subtitle="Manufacturer / brand names"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "description", label: "Description" },
      ]}
      columns={[
        { key: "name", label: "Name", className: "font-medium" },
        { key: "description", label: "Description", muted: true },
      ]}
    />
  ),
});