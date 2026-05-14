import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHeaderCell,
  TableCellLayout,
  Spinner,
  Text as FluentText,
  makeStyles,
  tokens,
  Dropdown,
  Option,
  Input,
  Label,
} from '@fluentui/react-components';
import {
  ArrowSync24Regular,
  Database24Regular,
  Search24Regular,
  FilterDismiss24Regular,
  Copy24Regular,
} from '@fluentui/react-icons';
import { useRouter } from 'next/router';
import Layout from '../src/components/Layout';
import { api } from '../src/lib/api';
import { PageHeader } from '../src/components/PageHeader';
import { ColumnFilterPanel } from '../src/components/ColumnFilterPanel';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
  },
  card: {
    marginBottom: tokens.spacingVerticalL,
  },
  controlsRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    minWidth: '250px',
  },
  statsRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    maxHeight: '70vh',
    position: 'relative',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: tokens.colorNeutralBackground3,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  tableHeaderCell: {
    padding: tokens.spacingVerticalM,
    textAlign: 'left',
    borderBottom: `2px solid ${tokens.colorNeutralStroke2}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    minWidth: '150px',
    maxWidth: '300px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tableCell: {
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    minWidth: '150px',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
  },
  firstColumn: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 5,
    borderRight: `3px solid ${tokens.colorBrandStroke1}`,
    fontWeight: tokens.fontWeightSemibold,
    minWidth: '200px',
    maxWidth: '200px',
  },
  firstColumnHeader: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground3,
    zIndex: 15,
    borderRight: `3px solid ${tokens.colorBrandStroke1}`,
    minWidth: '200px',
    maxWidth: '200px',
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  columnName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  columnType: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  cellContent: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cellWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    position: 'relative',
  },
  cellText: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyButtonCell: {
    opacity: 0,
    transition: 'opacity 0.2s',
    minWidth: 'auto',
    height: '24px',
    padding: '0 4px',
  },
  cellWrapperHover: {
    ':hover .copy-button': {
      opacity: 1,
    },
  },
  paginationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
  },
});

interface TableInfo {
  table_name: string;
  row_count: number;
  column_count: number;
  columns: string[];
}

interface TableData {
  table_name: string;
  columns: string[];
  column_types: { [key: string]: string };
  data: any[];
  total_count: number;
  limit: number;
  offset: number;
  returned_rows: number;
}

export default function DataExplorerPage() {
  const styles = useStyles();

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and filters
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [orderBy, setOrderBy] = useState<string>('');
  const [orderDesc, setOrderDesc] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, any[]>>({});

  const router = useRouter();

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    try {
      setLoadingTables(true);
      const response = await fetch('http://localhost:8000/data-explorer/tables');
      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setTables(data);
      } else {
        console.error('API returned non-array data:', data);
        setTables([]);
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error loading tables:', err);
      setError(err.message || 'Failed to load tables');
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }

  async function loadTableData() {
    if (!selectedTable) return;

    try {
      setLoading(true);
      setError(null);

      let url = `http://localhost:8000/data-explorer/tables/${selectedTable}?limit=${limit}&offset=${offset}`;

      if (orderBy) {
        url += `&order_by=${orderBy}&order_desc=${orderDesc}`;
      }

      // Add filters
      if (Object.keys(columnFilters).length > 0) {
        url += `&filters=${encodeURIComponent(JSON.stringify(columnFilters))}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setTableData(null);
      } else {
        setTableData(data);
      }
    } catch (err: any) {
      console.error('Error loading table data:', err);
      setError(err.message || 'Failed to load table data');
      setTableData(null);
    } finally {
      setLoading(false);
    }
  }

  // Initialize filters from URL on mount
  useEffect(() => {
    if (router.isReady && router.query.filters) {
      try {
        const parsed = JSON.parse(router.query.filters as string);
        setColumnFilters(parsed);
      } catch (e) {
        console.error('Failed to parse filters from URL:', e);
      }
    }
  }, [router.isReady, router.query.filters]);

  // Update URL when filters change
  useEffect(() => {
    if (selectedTable && router.isReady) {
      const query: any = { table: selectedTable };
      if (Object.keys(columnFilters).length > 0) {
        query.filters = JSON.stringify(columnFilters);
      }
      router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
    }
  }, [columnFilters, selectedTable, router.isReady]);

  useEffect(() => {
    if (selectedTable) {
      setOffset(0); // Reset offset when changing tables
      loadTableData();
    }
  }, [selectedTable]);

  // Reload data when filters, pagination, or sorting changes
  useEffect(() => {
    if (selectedTable) {
      loadTableData();
    }
  }, [offset, limit, orderBy, orderDesc, columnFilters]);

  useEffect(() => {
    if (selectedTable) {
      loadTableData();
    }
  }, [offset, limit, orderBy, orderDesc]);

  const handleNextPage = () => {
    if (tableData && offset + limit < tableData.total_count) {
      setOffset(offset + limit);
    }
  };

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  const handleColumnHeaderClick = (columnName: string) => {
    if (orderBy === columnName) {
      // Toggle direction
      setOrderDesc(!orderDesc);
    } else {
      setOrderBy(columnName);
      setOrderDesc(false);
    }
  };

  const handleFilterApply = (columnName: string, values: any[]) => {
    setColumnFilters(prev => {
      const updated = { ...prev };
      if (values.length === 0) {
        delete updated[columnName];
      } else {
        updated[columnName] = values;
      }
      return updated;
    });
    setOffset(0); // Reset to first page when filtering
  };

  const handleFilterClear = (columnName: string) => {
    setColumnFilters(prev => {
      const updated = { ...prev };
      delete updated[columnName];
      return updated;
    });
    setOffset(0);
  };

  const handleClearAllFilters = () => {
    setColumnFilters({});
    setOffset(0);
  };

  const selectedTableInfo = Array.isArray(tables) ? tables.find(t => t.table_name === selectedTable) : undefined;

  return (
    <Layout>
      <div className={styles.container}>
        <PageHeader
          title="Data Explorer"
          subtitle="Browse and inspect star schema tables for troubleshooting"
          actions={
            <>
              <Button
                appearance="primary"
                icon={<ArrowSync24Regular />}
                onClick={loadTables}
                disabled={loadingTables}
              >
                Refresh Tables
              </Button>
            </>
          }
        />

        {/* Controls */}
        <Card className={styles.card}>
          <div style={{ padding: tokens.spacingVerticalL }}>
            <div className={styles.controlsRow}>
              <div className={styles.controlGroup}>
                <Label>Select Table</Label>
                <Dropdown
                  placeholder="Choose a table..."
                  value={selectedTable}
                  onOptionSelect={(e, data) => setSelectedTable(data.optionValue as string)}
                  disabled={loadingTables}
                >
                  {Array.isArray(tables) && tables.map(table => (
                    <Option key={table.table_name} value={table.table_name}>
                      {table.table_name} ({table.row_count.toLocaleString()} rows)
                    </Option>
                  ))}
                </Dropdown>
              </div>

              <div className={styles.controlGroup}>
                <Label>Rows per page</Label>
                <Dropdown
                  value={limit.toString()}
                  onOptionSelect={(e, data) => {
                    setLimit(parseInt(data.optionValue as string));
                    setOffset(0);
                  }}
                >
                  <Option value="50">50</Option>
                  <Option value="100">100</Option>
                  <Option value="250">250</Option>
                  <Option value="500">500</Option>
                  <Option value="1000">1000</Option>
                </Dropdown>
              </div>

              {selectedTable && (
                <Button
                  appearance="primary"
                  icon={<Search24Regular />}
                  onClick={loadTableData}
                  disabled={loading}
                >
                  Load Data
                </Button>
              )}

              {Object.keys(columnFilters).length > 0 && (
                <Button
                  appearance="subtle"
                  icon={<FilterDismiss24Regular />}
                  onClick={handleClearAllFilters}
                >
                  Clear All Filters ({Object.keys(columnFilters).length})
                </Button>
              )}
            </div>

            {/* Stats */}
            {selectedTableInfo && (
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>Total Rows</FluentText>
                  <FluentText size={400} weight="semibold">{selectedTableInfo.row_count.toLocaleString()}</FluentText>
                </div>
                <div className={styles.statItem}>
                  <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>Columns</FluentText>
                  <FluentText size={400} weight="semibold">{selectedTableInfo.column_count}</FluentText>
                </div>
                {tableData && (
                  <>
                    <div className={styles.statItem}>
                      <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>Showing</FluentText>
                      <FluentText size={400} weight="semibold">
                        {offset + 1} - {Math.min(offset + limit, tableData.total_count)} of {tableData.total_count.toLocaleString()}
                      </FluentText>
                    </div>
                    {tableData.unfiltered_count && tableData.unfiltered_count !== tableData.total_count && (
                      <div className={styles.statItem}>
                        <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>Total (unfiltered)</FluentText>
                        <FluentText size={400} weight="semibold">{tableData.unfiltered_count.toLocaleString()}</FluentText>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXXL }}>
            <Spinner label="Loading table data..." size="large" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
              <FluentText style={{ color: tokens.colorPaletteRedForeground1, marginBottom: tokens.spacingVerticalM, display: 'block' }}>
                {error}
              </FluentText>
              <Button onClick={loadTableData}>Retry</Button>
            </div>
          </Card>
        )}

        {/* Table Data */}
        {!loading && !error && tableData && (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead className={styles.tableHeader}>
                  <tr>
                    {tableData.columns.map((col, index) => (
                      <th
                        key={col}
                        className={`${styles.tableHeaderCell} ${index === 0 ? styles.firstColumnHeader : ''}`}
                      >
                        <div className={styles.columnHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
                            <span
                              className={styles.columnName}
                              onClick={() => handleColumnHeaderClick(col)}
                              style={{ cursor: 'pointer', flex: 1 }}
                              title={`Click to sort by ${col}`}
                            >
                              {col}
                              {orderBy === col && (
                                <span style={{ marginLeft: tokens.spacingHorizontalXS }}>
                                  {orderDesc ? '↓' : '↑'}
                                </span>
                              )}
                            </span>
                            <ColumnFilterPanel
                              tableName={selectedTable}
                              columnName={col}
                              columnType={tableData.column_types[col]}
                              selectedValues={columnFilters[col] || []}
                              onApply={(values) => handleFilterApply(col, values)}
                              onClear={() => handleFilterClear(col)}
                            />
                          </div>
                          <span className={styles.columnType}>{tableData.column_types[col]}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {tableData.columns.map((col, colIndex) => {
                        const cellValue = row[col] !== null ? String(row[col]) : 'NULL';
                        const displayValue = row[col] !== null ? String(row[col]) : null;

                        return (
                          <td
                            key={col}
                            className={`${styles.tableCell} ${colIndex === 0 ? styles.firstColumn : ''}`}
                            onMouseEnter={(e) => {
                              const btn = e.currentTarget.querySelector('.copy-button') as HTMLElement;
                              if (btn) btn.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              const btn = e.currentTarget.querySelector('.copy-button') as HTMLElement;
                              if (btn) btn.style.opacity = '0';
                            }}
                          >
                            <div className={styles.cellWrapper}>
                              <span className={styles.cellText}>
                                {displayValue !== null ? (
                                  displayValue
                                ) : (
                                  <span style={{ color: tokens.colorNeutralForeground4, fontStyle: 'italic' }}>NULL</span>
                                )}
                              </span>
                              <Button
                                appearance="subtle"
                                size="small"
                                icon={<Copy24Regular />}
                                className="copy-button"
                                style={{
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  minWidth: 'auto',
                                  height: '24px',
                                  padding: '0 4px'
                                }}
                                title={`Cell Value:\n${cellValue}\n\nClick to copy`}
                                onClick={async () => {
                                  await navigator.clipboard.writeText(cellValue);
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={styles.paginationRow}>
              <Button
                onClick={handlePreviousPage}
                disabled={offset === 0}
              >
                Previous
              </Button>
              <FluentText>
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(tableData.total_count / limit)}
              </FluentText>
              <Button
                onClick={handleNextPage}
                disabled={offset + limit >= tableData.total_count}
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && !tableData && selectedTable && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalXXL, textAlign: 'center' }}>
              <Database24Regular style={{ fontSize: '48px', color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM }} />
              <FluentText style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>Click "Load Data" to view table contents</FluentText>
              <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                💡 Tip: First column will be frozen when scrolling horizontally
              </FluentText>
            </div>
          </Card>
        )}

        {!selectedTable && !loadingTables && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalXXL, textAlign: 'center' }}>
              <Database24Regular style={{ fontSize: '48px', color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM }} />
              <FluentText style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>Select a table to explore</FluentText>
              <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Use this tool to inspect star schema data and troubleshoot issues
              </FluentText>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
