import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/simple-crud";

export const Route = createFileRoute("/_authenticated/units")({
  head: () => ({ meta: [{ title: "Units — Photon POS" }] }),
  component: () => (
    <SimpleCrud
      table="units"
      title="Units"
      subtitle="Units of measurement (Pc, Box, Mtr, Set…)"
      fields={[
        { key: "name", label: "Name (e.g. Pieces)", required: true },
        { key: "short_name", label: "Short (e.g. Pc)", required: true },
      ]}
      columns={[
        { key: "name", label: "Name", className: "font-medium" },
        { key: "short_name", label: "Short" },
      ]}
    />
  ),
});