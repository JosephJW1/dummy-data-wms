import React, { useState, useEffect, useRef } from 'react';

interface Option { value: string | number; label: string; }
interface Props {
  options: Option[];
  value: any;
  onChange: (val: any) => void;
  placeholder: string;
  isDarkMode: boolean;
}

const SearchableDropdown: React.FC<Props> = ({ options, value, onChange, placeholder, isDarkMode }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayValue = isOpen ? search : (selectedOption ? selectedOption.label : '');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text ${isDarkMode ? 'bg-gray-900 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
          if (value) onChange('');
        }}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <ul className={`absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded shadow-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-200 text-gray-800'}`}>
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <li 
              key={opt.value}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-500 hover:text-white ${String(value) === String(opt.value) ? 'bg-blue-100 text-blue-800' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
            >
              {opt.label}
            </li>
          )) : (
            <li className="px-3 py-2 text-sm text-gray-400 italic">No matches found</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableDropdown;