import React, { useState, useEffect, useMemo } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Button,
  Input,
  Checkbox,
  makeStyles,
  tokens,
  Spinner,
  Text as FluentText,
} from '@fluentui/react-components';
import { Filter24Regular, Dismiss24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  popoverSurface: {
    minWidth: '350px',
    maxWidth: '450px',
    maxHeight: '600px',
    padding: tokens.spacingVerticalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  searchInput: {
    width: '100%',
  },
  actionRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'space-between',
  },
  checkboxList: {
    flex: 1,
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalS,
    maxHeight: '350px',
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    padding: tokens.spacingVerticalXS,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  valueCount: {
    marginLeft: 'auto',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  filterButton: {
    minWidth: 'auto',
    padding: '4px',
    position: 'relative',
  },
  filterButtonActive: {
    color: tokens.colorBrandForeground1,
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundInverted,
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  emptyText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
  },
});

interface DistinctValue {
  value: any;
  display: string;
  count?: number;
}

interface ColumnFilterPanelProps {
  tableName: string;
  columnName: string;
  columnType: string;
  selectedValues: any[];
  onApply: (values: any[]) => void;
  onClear: () => void;
}

export const ColumnFilterPanel: React.FC<ColumnFilterPanelProps> = ({
  tableName,
  columnName,
  columnType,
  selectedValues,
  onApply,
  onClear,
}) => {
  const styles = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [distinctValues, setDistinctValues] = useState<DistinctValue[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(selectedValues.map(v => String(v)))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch distinct values when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchDistinctValues();
    }
  }, [isOpen, tableName, columnName]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchDistinctValues();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function fetchDistinctValues() {
    try {
      setLoading(true);
      setError(null);

      let url = `http://localhost:8000/data-explorer/tables/${tableName}/columns/${columnName}/distinct?include_counts=true&limit=1000`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setDistinctValues([]);
      } else {
        setDistinctValues(data.values || []);
      }
    } catch (err: any) {
      console.error('Error fetching distinct values:', err);
      setError(err.message || 'Failed to load values');
      setDistinctValues([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredValues = useMemo(() => {
    if (!searchTerm) return distinctValues;
    const lowerSearch = searchTerm.toLowerCase();
    return distinctValues.filter(v =>
      v.display.toLowerCase().includes(lowerSearch)
    );
  }, [distinctValues, searchTerm]);

  function handleCheckboxChange(value: string, checked: boolean) {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(value);
      } else {
        newSet.delete(value);
      }
      return newSet;
    });
  }

  function handleSelectAll() {
    const allValues = new Set(filteredValues.map(v => String(v.value)));
    setSelectedItems(allValues);
  }

  function handleClearAll() {
    setSelectedItems(new Set());
  }

  function handleApply() {
    const values = Array.from(selectedItems).map(v => {
      if (v === 'null') return null;
      // Try to parse as number if it looks like one
      if (!isNaN(Number(v)) && v !== '') {
        return Number(v);
      }
      return v;
    });
    onApply(values);
    setIsOpen(false);
  }

  function handleCancel() {
    // Reset to originally selected values
    setSelectedItems(new Set(selectedValues.map(v => String(v))));
    setSearchTerm('');
    setIsOpen(false);
  }

  function handleClearFilter() {
    setSelectedItems(new Set());
    onClear();
    setIsOpen(false);
  }

  const hasActiveFilter = selectedValues.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={(e, data) => setIsOpen(data.open)}>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          size="small"
          icon={<Filter24Regular />}
          className={`${styles.filterButton} ${hasActiveFilter ? styles.filterButtonActive : ''}`}
          aria-label={`Filter ${columnName}. ${hasActiveFilter ? `${selectedValues.length} values selected` : 'No filter applied'}`}
          title={`Filter ${columnName}`}
        >
          {hasActiveFilter && (
            <span className={styles.badge}>{selectedValues.length}</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverSurface className={styles.popoverSurface}>
        <div className={styles.header}>
          <FluentText weight="semibold" size={400}>Filter: {columnName}</FluentText>
          <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Type: {columnType}
          </FluentText>
        </div>

        <Input
          className={styles.searchInput}
          placeholder="Search values..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          contentBefore={<Filter24Regular />}
          contentAfter={
            searchTerm && (
              <Button
                appearance="transparent"
                size="small"
                icon={<Dismiss24Regular />}
                onClick={() => setSearchTerm('')}
              />
            )
          }
        />

        <div className={styles.actionRow}>
          <Button appearance="subtle" size="small" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button appearance="subtle" size="small" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>

        <div className={styles.checkboxList}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Spinner size="medium" label="Loading values..." />
            </div>
          ) : error ? (
            <FluentText className={styles.errorText}>{error}</FluentText>
          ) : filteredValues.length === 0 ? (
            <FluentText className={styles.emptyText}>No values found</FluentText>
          ) : (
            filteredValues.map((item, index) => {
              const valueKey = String(item.value);
              const isChecked = selectedItems.has(valueKey);
              const isNull = item.value === null || item.value === 'null';

              return (
                <div
                  key={index}
                  className={styles.checkboxItem}
                  onClick={() => handleCheckboxChange(valueKey, !isChecked)}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(e, data) => handleCheckboxChange(valueKey, data.checked === true)}
                  />
                  <FluentText
                    size={300}
                    style={{
                      marginLeft: tokens.spacingHorizontalS,
                      fontStyle: isNull ? 'italic' : 'normal',
                      color: isNull ? tokens.colorNeutralForeground4 : undefined,
                    }}
                  >
                    {item.display}
                  </FluentText>
                  {item.count !== undefined && (
                    <FluentText className={styles.valueCount}>
                      ({item.count})
                    </FluentText>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {selectedItems.size} selected
          </FluentText>
          <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
            {hasActiveFilter && (
              <Button appearance="subtle" size="small" onClick={handleClearFilter}>
                Clear Filter
              </Button>
            )}
            <Button appearance="subtle" size="small" onClick={handleCancel}>
              Cancel
            </Button>
            <Button appearance="primary" size="small" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
