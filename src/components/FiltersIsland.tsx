import React from "react";
import CompanySelect from "./CompanySelect.js";

export default function FiltersIsland({ filters, setFilters }: {
  filters: { company: string; category: string };
  setFilters: React.Dispatch<React.SetStateAction<{ company: string; category: string }>>;
}) {
  return (
    <div>
      <CompanySelect
        activeCompany={filters.company}
        onCompanyChange={company => setFilters(f => ({ ...f, company }))}
      />
    </div>
  );
}
