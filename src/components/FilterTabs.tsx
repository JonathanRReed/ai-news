import React from 'react';

interface FilterTabsProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}

const categories = ['All', 'Research', 'Models', 'Products'];

export default function FilterTabs({ activeCategory, onCategoryChange }: FilterTabsProps) {
  return (
    <div className="flex flex-nowrap sm:flex-wrap gap-2 sm:gap-4 my-4 sm:my-6 justify-center overflow-x-auto hide-scrollbar w-full min-w-0">
      {categories.map(cat => (
        <button
          key={cat}
          className={`px-5 sm:px-6 py-2 rounded-full font-semibold border-2 transition-all duration-150 text-base focus:outline-none shadow-md \
            ${activeCategory === cat
              ? 'bg-cyan text-black shadow-[0_0_16px_4px_rgba(77,255,240,0.6)] border-cyan/80'
              : 'bg-oled text-cyan border-cyan/40 hover:bg-magenta hover:text-white hover:border-magenta/60'}`}
          onClick={() => onCategoryChange(cat)}
          aria-pressed={activeCategory === cat}
        >
          {cat}
        </button>
      ))}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
