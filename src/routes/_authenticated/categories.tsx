import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/simple-crud";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "Categories — Photon POS" }] }),
  component: () => (
    <SimpleCrud
      table="categories"
      title="Categories"
      subtitle="Group your products"
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