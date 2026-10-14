import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiChevronDown, FiCheck, FiSearch, FiX } from "react-icons/fi";
import "./Select.css";

/**
 * Universal Shared Select Component
 * - Replaces native <select> on all screen sizes
 * - Stays strictly inside viewport bounds (zero mobile horizontal stretch)
 * - Searchable when options count > 8 (or if searchable prop is true)
 * - Keyboard accessible (Enter, Space, Arrows, Escape)
 * - Emits standard event: onChange({ target: { name, value } })
 */
const Select = ({
  options = [],
  value = "",
  onChange,
  placeholder = "-- Select an option --",
  disabled = false,
  required = false,
  name = "",
  id = "",
  className = "",
  searchable,
  searchPlaceholder = "Search options...",
  ariaLabel = "Select option",
  autoFlip = true,
  menuWidth = "",
  dropdownStyle = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropUp, setDropUp] = useState(false);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsListRef = useRef(null);

  // Normalize options array into { value, label, subtitle, disabled }
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
      if (opt === null || opt === undefined) {
        return { value: "", label: "" };
      }
      if (typeof opt === "object") {
        return {
          value: opt.value ?? opt.id ?? opt._id ?? "",
          label: opt.label ?? opt.name ?? opt.productName ?? String(opt.value ?? ""),
          subtitle: opt.subtitle ?? opt.meta ?? "",
          disabled: Boolean(opt.disabled)
        };
      }
      return {
        value: opt,
        label: String(opt),
        subtitle: "",
        disabled: false
      };
    });
  }, [options]);

  // Determine if search input should be displayed (> 8 options by default)
  const isSearchEnabled = searchable ?? normalizedOptions.length > 8;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  const [calculatedMaxHeight, setCalculatedMaxHeight] = useState(280);

  // Auto flip dropdown upwards if not enough room below, respecting viewport and modal boundaries
  useEffect(() => {
    if (!isOpen) return;

    // Raise parent container z-index so subsequent fields/rows cannot overlap this dropdown
    const parentElevated = containerRef.current?.closest(
      ".form-group, tr, td, .newsale-item-card, .purchase-line-card"
    );
    if (parentElevated) {
      parentElevated.style.zIndex = "1055";
      parentElevated.style.position = "relative";
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const modal =
        containerRef.current.closest(".custom-modal-body") ||
        containerRef.current.closest(".modal-body") ||
        containerRef.current.closest(".custom-modal-container");

      let spaceBelow = window.innerHeight - rect.bottom - 16;
      let spaceAbove = rect.top - 16;

      if (modal) {
        const modalRect = modal.getBoundingClientRect();
        spaceBelow = Math.min(spaceBelow, modalRect.bottom - rect.bottom - 16);
        spaceAbove = Math.min(spaceAbove, rect.top - modalRect.top - 16);

        if (autoFlip && spaceBelow < 200 && spaceAbove > spaceBelow) {
          setDropUp(true);
          setCalculatedMaxHeight(Math.max(160, Math.min(280, spaceAbove)));
        } else {
          setDropUp(false);
          setCalculatedMaxHeight(Math.max(160, Math.min(280, spaceBelow)));
        }
      } else {
        // Outside modals (standard page views):
        // Flip upwards when space below is cramped (< 250px) and there is more room above
        if (autoFlip && spaceBelow < 250 && spaceAbove > spaceBelow) {
          setDropUp(true);
          setCalculatedMaxHeight(Math.max(220, Math.min(320, spaceAbove)));
        } else {
          setDropUp(false);
          // On a regular page, allow comfortable dropdown height (280-320px) since document can scroll
          setCalculatedMaxHeight(Math.max(240, Math.min(320, spaceBelow > 240 ? spaceBelow : 280)));
        }
      }
    }

    return () => {
      if (parentElevated) {
        parentElevated.style.zIndex = "";
        parentElevated.style.position = "";
      }
    };
  }, [isOpen, autoFlip]);


  // Focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchEnabled && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchEnabled]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const handleSelectOption = (opt) => {
    if (opt.disabled) return;
    if (onChange) {
      // Pass the primitive value as primary argument so setState(val) and handlers receive the exact value
      // Also provide synthetic event as second argument for any legacy event listeners
      onChange(opt.value, {
        target: {
          name,
          value: opt.value
        }
      });
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${isOpen ? "select-open" : ""} ${
        disabled ? "select-disabled" : ""
      } ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {/* Trigger Button */}
      <div
        className={`custom-select-trigger ${isOpen ? "trigger-open" : ""} ${
          !selectedOption || !selectedOption.value ? "trigger-placeholder" : ""
        }`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        id={id || undefined}
      >
        <div className="trigger-label-group">
          <span className="trigger-label">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption && selectedOption.value && selectedOption.subtitle ? (
            <span className="trigger-subtitle-label">
              {selectedOption.subtitle}
            </span>
          ) : null}
        </div>
        <FiChevronDown
          className={`trigger-icon ${isOpen ? "icon-rotated" : ""}`}
        />
      </div>

      {/* Hidden native input for required form validation support */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            opacity: 0,
            width: "100%",
            height: 0,
            position: "absolute",
            pointerEvents: "none"
          }}
          value={value}
          onChange={() => {}}
          required={required}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`custom-select-dropdown ${dropUp ? "dropdown-up" : "dropdown-down"}`}
          role="listbox"
          tabIndex={-1}
          style={{
            ...(menuWidth ? { width: menuWidth } : {}),
            ...dropdownStyle
          }}
        >
          {/* Inline Search Bar (shown when options > 8) */}
          {isSearchEnabled && (
            <div className="select-search-wrapper" onClick={(e) => e.stopPropagation()}>
              <FiSearch className="select-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="select-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="select-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div
            className="select-options-list"
            ref={optionsListRef}
            style={{
              maxHeight: isSearchEnabled
                ? `${Math.max(180, calculatedMaxHeight - 48)}px`
                : `${Math.max(220, calculatedMaxHeight)}px`
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    className={`select-option-item ${isSelected ? "option-selected" : ""} ${
                      opt.disabled ? "option-disabled" : ""
                    } ${isHighlighted ? "option-highlighted" : ""} ${
                      opt.subtitle ? "has-subtitle" : ""
                    }`}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                  >
                    <div className="option-text-group">
                      <span className="option-primary-label">{opt.label}</span>
                      {opt.subtitle && (
                        <span className="option-subtitle-label">{opt.subtitle}</span>
                      )}
                    </div>
                    {isSelected && <FiCheck className="option-check-icon" />}
                  </div>
                );
              })
            ) : (
              <div className="select-empty-notice">
                <span>No matching options found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Select;
