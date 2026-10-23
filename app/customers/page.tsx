import { Suspense } from "react";

import { CustomersPanel } from "@/components/customers/customers-panel";

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersPanel />
    </Suspense>
  );
}
