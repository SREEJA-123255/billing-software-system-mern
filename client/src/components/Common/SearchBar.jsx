import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import "./SearchBar.css";

/**
 * Universal Shared SearchBar Component
 * - Full width on mobile screens
 * - Concise, non-truncated placeholders
 * - Quick clear button
 */
const SearchBar = ({
  value = "",
  onChange,
  onClear,
  placeholder = "Search...",
  id = "universal-search-input",
  className = ""
}) => {
  const handleChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) onChange("");
  };

  return (
    <div className={`universal-search-bar ${className}`}>
      <FiSearch className="search-bar-icon" />
      <input
        type="text"
        id={id}
        className="search-bar-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          className="search-bar-clear-btn"
          onClick={handleClear}
          aria-label="Clear search query"
        >
          <FiX />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
