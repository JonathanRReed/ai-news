import React, { useState } from 'react';
import FilterTabs from './FilterTabs.js';
import CompanySelect from './CompanySelect.js';

export default function InteractiveFilters() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeCompany, setActiveCompany] = useState('All');
  return (
    <>
      <FilterTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <CompanySelect activeCompany={activeCompany} onCompanyChange={setActiveCompany} />
    </>
  );
}
