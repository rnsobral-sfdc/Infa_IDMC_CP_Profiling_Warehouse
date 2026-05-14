import React, { useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Text as FluentText,
  Title1,
  Body1,
  makeStyles,
  shorthands,
  tokens,
  Tab,
  TabList,
  SelectTabEvent,
  SelectTabData,
  Card,
  Divider,
  Badge,
} from '@fluentui/react-components';
import Layout from '../src/components/Layout';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    ...shorthands.padding('24px')
  },
  header: {
    marginBottom: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    display: 'block',
    marginBottom: tokens.spacingVerticalS,
  },
  subtitle: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('24px')
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px')
  },
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontFamily: 'monospace',
    fontSize: '14px',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    '& th': {
      textAlign: 'left',
      ...shorthands.padding('12px'),
      backgroundColor: tokens.colorNeutralBackground2,
      fontWeight: 600,
      ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1)
    },
    '& td': {
      ...shorthands.padding('10px', '12px'),
      ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1)
    }
  }
});

const Documentation: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  const onTabSelect = (event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as string);
  };

  return (
    <Layout>
      <FluentProvider theme={webLightTheme}>
        <div className={styles.container}>
          <div className={styles.header}>
            <Title1 className={styles.title}>IDMC Profiling Extractor Documentation</Title1>
            <Body1 className={styles.subtitle}>
              Complete guide to installation, schema, and data access
            </Body1>
          </div>

          <TabList selectedValue={selectedTab} onTabSelect={onTabSelect}>
            <Tab value="overview">Overview</Tab>
            <Tab value="installation">Installation</Tab>
            <Tab value="api-flow">API Flow Tutorial</Tab>
            <Tab value="star-schema">Star Schema</Tab>
            <Tab value="tables">Tables & Fields</Tab>
            <Tab value="api-mapping">API Mapping</Tab>
            <Tab value="bi-integration">BI Integration</Tab>
          </TabList>

          <Divider />

          <div className={styles.content}>
            {selectedTab === 'overview' && <OverviewSection styles={styles} />}
            {selectedTab === 'installation' && <InstallationSection styles={styles} />}
            {selectedTab === 'api-flow' && <ApiFlowSection styles={styles} />}
            {selectedTab === 'star-schema' && <StarSchemaSection styles={styles} />}
            {selectedTab === 'tables' && <TablesSection styles={styles} />}
            {selectedTab === 'api-mapping' && <ApiMappingSection styles={styles} />}
            {selectedTab === 'bi-integration' && <BIIntegrationSection styles={styles} />}
          </div>
        </div>
      </FluentProvider>
    </Layout>
  );
};

// Overview Section
const OverviewSection: React.FC<{ styles: any }> = ({ styles }) => (
  <div className={styles.section}>
    <FluentText size={500} weight="semibold">Overview</FluentText>

    <Card>
      <FluentText>
        The <strong>IDMC Profiling Extractor</strong> is a data warehouse solution that extracts data quality profiling data
        from Informatica Data Quality (IDMC) and stores it in a local star schema database for analysis and reporting.
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold">Key Features</FluentText>
    <ul style={{ paddingLeft: '20px' }}>
      <li><FluentText>Automated extraction of profiling data from IDMC REST APIs</FluentText></li>
      <li><FluentText>Star schema design optimized for business intelligence</FluentText></li>
      <li><FluentText>Support for multiple IDMC organizations</FluentText></li>
      <li><FluentText>Incremental sync (delta-only updates)</FluentText></li>
      <li><FluentText>Stop/resume capability for long-running syncs</FluentText></li>
      <li><FluentText>Configurable sync schedules and limits</FluentText></li>
      <li><FluentText>Built-in web UI for management and exploration</FluentText></li>
      <li><FluentText>Direct database access for Power BI, Tableau, and other BI tools</FluentText></li>
    </ul>

    <FluentText size={400} weight="semibold">Architecture</FluentText>
    <Card>
      <FluentText style={{ fontFamily: 'monospace' }}>
        IDMC Cloud (REST APIs)<br/>
        &nbsp;&nbsp;↓<br/>
        Backend (FastAPI + SQLAlchemy)<br/>
        &nbsp;&nbsp;↓<br/>
        SQLite Database (Star Schema)<br/>
        &nbsp;&nbsp;↓<br/>
        Frontend (Next.js + FluentUI) + External BI Tools
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold">Technology Stack</FluentText>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Component</th>
          <th>Technology</th>
          <th>Version</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Backend</td>
          <td>Python + FastAPI</td>
          <td>Python 3.10+, FastAPI 0.100+</td>
        </tr>
        <tr>
          <td>Database</td>
          <td>SQLite</td>
          <td>3.x</td>
        </tr>
        <tr>
          <td>ORM</td>
          <td>SQLAlchemy</td>
          <td>2.0+</td>
        </tr>
        <tr>
          <td>Frontend</td>
          <td>Next.js + React</td>
          <td>Next.js 13+, React 18+</td>
        </tr>
        <tr>
          <td>UI Library</td>
          <td>Fluent UI v2</td>
          <td>9.x</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// Installation Section
const InstallationSection: React.FC<{ styles: any }> = ({ styles }) => (
  <div className={styles.section}>
    <FluentText size={500} weight="semibold">Installation Guide</FluentText>

    <FluentText size={400} weight="semibold">Prerequisites</FluentText>
    <ul style={{ paddingLeft: '20px' }}>
      <li><FluentText>Python 3.10 or higher</FluentText></li>
      <li><FluentText>Node.js 16 or higher</FluentText></li>
      <li><FluentText>npm or yarn package manager</FluentText></li>
      <li><FluentText>IDMC account with access to Data Quality profiling</FluentText></li>
      <li><FluentText>IDMC API credentials (username/password)</FluentText></li>
    </ul>

    <FluentText size={400} weight="semibold">Backend Setup</FluentText>
    <div className={styles.codeBlock}>
      {`# Clone repository (if using git)
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\\Scripts\\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -c "from app.core.database import init_db; init_db()"

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`}
    </div>

    <FluentText size={400} weight="semibold">Frontend Setup</FluentText>
    <div className={styles.codeBlock}>
      {`# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will be available at http://localhost:3000`}
    </div>

    <FluentText size={400} weight="semibold">First-Time Configuration</FluentText>
    <Card>
      <ol style={{ paddingLeft: '20px' }}>
        <li><FluentText>Navigate to <strong>http://localhost:3000</strong></FluentText></li>
        <li><FluentText>Go to <strong>Connections</strong> page</FluentText></li>
        <li><FluentText>Click <strong>Add Connection</strong></FluentText></li>
        <li><FluentText>Enter IDMC credentials:
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Name: Friendly name for connection</li>
            <li>Base URL: https://usw1.dm-us.informaticacloud.com/saas</li>
            <li>Profiling URL: https://na1-dqprofile.dm-us.informaticacloud.com/metric-store/api/v1</li>
            <li>Username: Your IDMC username</li>
            <li>Password: Your IDMC password</li>
          </ul>
        </FluentText></li>
        <li><FluentText>Click <strong>Test Connection</strong> to verify</FluentText></li>
        <li><FluentText>Go to <strong>Sync Jobs</strong> page</FluentText></li>
        <li><FluentText>Create a new sync job with your connection</FluentText></li>
        <li><FluentText>Click <strong>Run</strong> to start initial data sync</FluentText></li>
      </ol>
    </Card>

    <FluentText size={400} weight="semibold">Database Location</FluentText>
    <Card>
      <FluentText>
        The SQLite database file is located at: <strong>backend/idmc_profiling.db</strong>
      </FluentText>
      <FluentText style={{ marginTop: '8px' }}>
        This file contains all extracted profiling data and can be accessed directly by BI tools.
      </FluentText>
    </Card>
  </div>
);

// Star Schema Section
const StarSchemaSection: React.FC<{ styles: any }> = ({ styles }) => (
  <div className={styles.section}>
    <FluentText size={500} weight="semibold">Star Schema Design</FluentText>

    <Card>
      <FluentText>
        The data warehouse uses a <strong>star schema</strong> design pattern, which is optimized for analytical queries
        and business intelligence. Data is organized into <strong>dimension tables</strong> (descriptive attributes)
        and <strong>fact tables</strong> (measurable events/metrics).
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold">Schema Diagram</FluentText>
    <div className={styles.codeBlock}>
      {`┌─────────────────────┐
│   dim_dq_asset      │──┐
│  (Data Sources)     │  │
└─────────────────────┘  │
                         │
┌─────────────────────┐  │    ┌──────────────────────┐
│ dim_profiling_task  │──┼───►│ fact_profiling_result│
│   (Profile Tasks)   │  │    │    (Metrics/Stats)   │
└─────────────────────┘  │    └──────────────────────┘
                         │
┌─────────────────────┐  │
│  dim_profiling_run  │──┘
│  (Execution Runs)   │
└─────────────────────┘

Additional Dimension Tables:
- dim_data_source_field (Columns)
- dim_rule_mapplet (Data Quality Rules)
- dim_rule_occurrence (Rule Configurations)
- dim_connection (Connection Metadata)

Additional Fact Tables:
- fact_rule_input_mapping (Rule Inputs)
- fact_rule_output_mapping (Rule Outputs)
- fact_column_pattern (Pattern Analysis)
- fact_column_data_type (Type Inference)
- fact_column_value_frequency (Value Distribution)`}
    </div>

    <FluentText size={400} weight="semibold">Key Design Principles</FluentText>
    <ul style={{ paddingLeft: '20px' }}>
      <li><FluentText><strong>Dimensional Modeling</strong>: Business-friendly structure for reporting</FluentText></li>
      <li><FluentText><strong>Denormalization</strong>: Some duplication for query performance</FluentText></li>
      <li><FluentText><strong>Surrogate Keys</strong>: Natural keys from IDMC (UUIDs, run keys)</FluentText></li>
      <li><FluentText><strong>Slowly Changing Dimensions</strong>: Type 1 (overwrite) for most dimensions</FluentText></li>
      <li><FluentText><strong>Additive Facts</strong>: Metrics can be aggregated across dimensions</FluentText></li>
    </ul>

    <FluentText size={400} weight="semibold">Data Freshness & Sync Modes</FluentText>
    <Card>
      <FluentText>
        Data is synchronized from IDMC based on your sync job schedule. Two sync modes are available:
      </FluentText>
      <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
        <li><FluentText><strong>Incremental Sync:</strong> Only extracts new profiling runs since the last sync,
        minimizing API calls and sync time. Existing runs are skipped.</FluentText></li>
        <li><FluentText><strong>Full Sync:</strong> Extracts all profiling runs, including those already in the database.
        Use this when schema changes require repopulation (e.g., after adding composite primary keys to mapping tables).</FluentText></li>
      </ul>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '16px' }}>Schema Migration Notes</FluentText>
    <Card>
      <FluentText>
        <strong>Mapping Table Primary Keys:</strong> The fact_rule_output_mapping and fact_rule_input_mapping tables
        use composite primary keys (mapping_id, profiling_run_id) because IDMC reuses the same mapping_id across
        different profiling runs for the same rule. This design allows each run to maintain its own set of mappings,
        which is critical for historical trend analysis and drift detection.
      </FluentText>
      <FluentText style={{ marginTop: '8px' }}>
        If you have an existing database with single-column primary keys, use the fix_mapping_pk.sql migration script
        to recreate these tables with the correct schema.
      </FluentText>
    </Card>
  </div>
);

export default Documentation;

// Additional sections will be in separate components for brevity
const TablesSection: React.FC<{ styles: any }> = ({ styles }) => (
  <div className={styles.section}>
    <FluentText size={500} weight="semibold">Tables & Fields Reference</FluentText>

    <FluentText size={400} weight="semibold">Dimension Tables</FluentText>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">dim_dq_asset</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Data quality assets (databases, tables, files) being profiled</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>dq_asset_id</td><td>VARCHAR(255)</td><td>Primary key (UUID from IDMC)</td></tr>
          <tr><td>org_id</td><td>VARCHAR(255)</td><td>Organization identifier</td></tr>
          <tr><td>asset_name</td><td>VARCHAR(255)</td><td>Asset name</td></tr>
          <tr><td>asset_type</td><td>VARCHAR(100)</td><td>Type (DATABASE, TABLE, FILE, etc.)</td></tr>
          <tr><td>asset_subtype</td><td>VARCHAR(100)</td><td>Subtype details</td></tr>
        </tbody>
      </table>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">dim_profiling_task</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Profiling task configurations</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>profiling_task_id</td><td>VARCHAR(255)</td><td>Primary key (Profile ID from IDMC)</td></tr>
          <tr><td>org_id</td><td>VARCHAR(255)</td><td>Organization identifier</td></tr>
          <tr><td>dq_asset_id</td><td>VARCHAR(255)</td><td>FK to dim_dq_asset</td></tr>
          <tr><td>profiling_name</td><td>VARCHAR(255)</td><td>Profile/task name</td></tr>
          <tr><td>profiling_type</td><td>VARCHAR(100)</td><td>Type (full, sample, etc.)</td></tr>
          <tr><td>project_name</td><td>VARCHAR(255)</td><td>IDMC project name</td></tr>
          <tr><td>folder_path</td><td>VARCHAR(1000)</td><td>Folder path in IDMC</td></tr>
          <tr><td>created_by</td><td>VARCHAR(255)</td><td>User who created task</td></tr>
          <tr><td>created_at</td><td>DATETIME</td><td>Creation timestamp</td></tr>
          <tr><td>last_run_at</td><td>DATETIME</td><td>Last execution time</td></tr>
        </tbody>
      </table>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">dim_profiling_run</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Individual profiling executions</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>profiling_run_id</td><td>VARCHAR(255)</td><td>Primary key (Run ID from IDMC)</td></tr>
          <tr><td>profiling_task_id</td><td>VARCHAR(255)</td><td>FK to dim_profiling_task</td></tr>
          <tr><td>run_key</td><td>VARCHAR(50)</td><td>Sequential run number (1, 2, 3...)</td></tr>
          <tr><td>run_start_time</td><td>DATETIME</td><td>Run start timestamp</td></tr>
          <tr><td>run_end_time</td><td>DATETIME</td><td>Run end timestamp</td></tr>
          <tr><td>run_status</td><td>VARCHAR(50)</td><td>Status (Success, Failed, etc.)</td></tr>
          <tr><td>rows_profiled</td><td>INTEGER</td><td>Number of rows analyzed</td></tr>
        </tbody>
      </table>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">dim_data_source_field</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Column/field metadata from data sources</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>field_id</td><td>VARCHAR(255)</td><td>Primary key</td></tr>
          <tr><td>profiling_run_id</td><td>VARCHAR(255)</td><td>FK to dim_profiling_run</td></tr>
          <tr><td>field_name</td><td>VARCHAR(255)</td><td>Column/field name</td></tr>
          <tr><td>documented_datatype</td><td>VARCHAR(255)</td><td>Declared data type</td></tr>
          <tr><td>inferred_datatype</td><td>VARCHAR(255)</td><td>Inferred type from profiling</td></tr>
          <tr><td>is_nullable</td><td>INTEGER</td><td>1 if allows NULL</td></tr>
        </tbody>
      </table>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Fact Tables</FluentText>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">fact_profiling_result</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Profiling metrics and statistics (main fact table)</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>result_id</td><td>INTEGER</td><td>Primary key (auto-increment)</td></tr>
          <tr><td>profiling_run_id</td><td>VARCHAR(255)</td><td>FK to dim_profiling_run</td></tr>
          <tr><td>profiling_task_id</td><td>VARCHAR(255)</td><td>FK to dim_profiling_task</td></tr>
          <tr><td>column_name</td><td>VARCHAR(255)</td><td>Column being measured</td></tr>
          <tr><td>metric_type</td><td>VARCHAR(100)</td><td>Metric name (see list below)</td></tr>
          <tr><td>metric_value</td><td>FLOAT</td><td>Numeric metric value</td></tr>
          <tr><td>column_type</td><td>VARCHAR(50)</td><td>DATASOURCEFIELD or MAPPLETFIELD</td></tr>
        </tbody>
      </table>
      <FluentText size={200} style={{ marginTop: '12px' }}>
        <strong>Common Metric Types:</strong> TOTAL_ROWS, NULL_COUNT, NULL_PERCENT, DISTINCT_COUNT, DISTINCT_PERCENT,
        MIN_VALUE, MAX_VALUE, AVG_VALUE, STD_DEVIATION, MIN_LENGTH, MAX_LENGTH, AVG_LENGTH, BLANK_COUNT, BLANK_PERCENT,
        ZERO_COUNT, DUPLICATE_COUNT
      </FluentText>
      <FluentText size={200} style={{ marginTop: '8px', fontStyle: 'italic' }}>
        Note: IDMC uses AVG_VALUE (not AVERAGE) and STD_DEVIATION (not STANDARD_DEVIATION) for these metric types.
      </FluentText>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">fact_rule_output_mapping</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Maps data quality rule outputs to profiled columns</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>mapping_id</td><td>VARCHAR(255)</td><td>Primary key (composite with profiling_run_id)</td></tr>
          <tr><td>profiling_run_id</td><td>VARCHAR(255)</td><td>Primary key + FK to dim_profiling_run</td></tr>
          <tr><td>rule_mapplet_id</td><td>VARCHAR(255)</td><td>FK to dim_rule_mapplet</td></tr>
          <tr><td>org_id</td><td>VARCHAR(255)</td><td>Organization identifier</td></tr>
          <tr><td>column_key</td><td>INTEGER</td><td>Output column sequence</td></tr>
          <tr><td>out_field_name</td><td>VARCHAR(255)</td><td>Output field name (e.g., isValid)</td></tr>
          <tr><td>datatype</td><td>VARCHAR(100)</td><td>Output data type</td></tr>
          <tr><td>label</td><td>VARCHAR(255)</td><td>Display label</td></tr>
        </tbody>
      </table>
      <FluentText size={200} style={{ marginTop: '12px', fontStyle: 'italic' }}>
        <strong>Important:</strong> IDMC reuses the same mapping_id across multiple runs for the same rule output.
        The composite primary key (mapping_id, profiling_run_id) ensures each run can have its own copy of the mapping.
      </FluentText>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">fact_rule_input_mapping</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Maps data quality rule inputs to source columns</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>mapping_id</td><td>VARCHAR(255)</td><td>Primary key (composite with profiling_run_id)</td></tr>
          <tr><td>profiling_run_id</td><td>VARCHAR(255)</td><td>Primary key + FK to dim_profiling_run</td></tr>
          <tr><td>rule_mapplet_id</td><td>VARCHAR(255)</td><td>FK to dim_rule_mapplet</td></tr>
          <tr><td>org_id</td><td>VARCHAR(255)</td><td>Organization identifier</td></tr>
          <tr><td>data_source_field_name</td><td>VARCHAR(255)</td><td>Source column name</td></tr>
          <tr><td>in_field_name</td><td>VARCHAR(255)</td><td>Input parameter name</td></tr>
          <tr><td>data_source_field_precision</td><td>INTEGER</td><td>Field precision</td></tr>
          <tr><td>data_source_field_scale</td><td>INTEGER</td><td>Field scale</td></tr>
        </tbody>
      </table>
      <FluentText size={200} style={{ marginTop: '12px', fontStyle: 'italic' }}>
        <strong>Important:</strong> Like output mappings, input mapping_ids are reused across runs, requiring
        a composite primary key (mapping_id, profiling_run_id).
      </FluentText>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">fact_column_pattern</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Pattern analysis for string columns</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>pattern_id</td><td>VARCHAR(255)</td><td>Primary key</td></tr>
          <tr><td>profiling_run_id</td><td>VARCHAR(255)</td><td>FK to dim_profiling_run</td></tr>
          <tr><td>column_name</td><td>VARCHAR(255)</td><td>Column analyzed</td></tr>
          <tr><td>pattern_label</td><td>VARCHAR(500)</td><td>Pattern template (e.g., "X(3)-9(4)")</td></tr>
          <tr><td>row_count</td><td>INTEGER</td><td>Rows matching pattern</td></tr>
          <tr><td>satisfaction</td><td>FLOAT</td><td>Percentage of rows (0-100)</td></tr>
        </tbody>
      </table>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">fact_column_value_frequency</FluentText>
      <FluentText size={200} style={{ marginTop: '4px' }}>Most frequent values in columns</FluentText>
      <table className={styles.table} style={{ marginTop: '12px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>frequency_id</td><td>VARCHAR(255)</td><td>Primary key</td></tr>
          <tr><td>profiling_run_id</td><td>VARCHAR(255)</td><td>FK to dim_profiling_run</td></tr>
          <tr><td>column_name</td><td>VARCHAR(255)</td><td>Column analyzed</td></tr>
          <tr><td>column_value</td><td>TEXT</td><td>Actual value</td></tr>
          <tr><td>frequency</td><td>INTEGER</td><td>Number of occurrences</td></tr>
          <tr><td>percentage</td><td>FLOAT</td><td>Percentage of total rows</td></tr>
          <tr><td>is_outlier</td><td>INTEGER</td><td>1 if statistical outlier</td></tr>
        </tbody>
      </table>
    </Card>
  </div>
);

const ApiMappingSection: React.FC<{ styles: any }> = ({ styles }) => (
  <div className={styles.section}>
    <FluentText size={500} weight="semibold">API to Database Mapping</FluentText>

    <Card>
      <FluentText>
        This section documents which IDMC REST APIs populate which database tables and columns.
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold">API Endpoints Used</FluentText>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>API Endpoint</th>
          <th>Purpose</th>
          <th>Target Tables</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>/odata/Profiles</td>
          <td>List all profiling tasks</td>
          <td>dim_profiling_task, dim_dq_asset</td>
        </tr>
        <tr>
          <td>/odata/Profiles('id')/Runs</td>
          <td>Get runs for a profile</td>
          <td>dim_profiling_run</td>
        </tr>
        <tr>
          <td>/odata/Profiles('id')/Statistics</td>
          <td>Get column statistics</td>
          <td>fact_profiling_result, dim_data_source_field</td>
        </tr>
        <tr>
          <td>/odata/Profiles('id')/Columns('id')/Patterns</td>
          <td>Get pattern analysis</td>
          <td>fact_column_pattern</td>
        </tr>
        <tr>
          <td>/odata/Profiles('id')/Columns('id')/DataTypes</td>
          <td>Get data type inference</td>
          <td>fact_column_data_type</td>
        </tr>
        <tr>
          <td>/odata/Profiles('id')/Columns('id')/ValueFrequencies</td>
          <td>Get value distribution</td>
          <td>fact_column_value_frequency</td>
        </tr>
        <tr>
          <td>/FRS/api/v1/objects</td>
          <td>Get folder/project paths</td>
          <td>dim_profiling_task (path fields)</td>
        </tr>
        <tr>
          <td>/FRS/api/v1/mapplets</td>
          <td>Get DQ rules/mapplets</td>
          <td>dim_rule_mapplet</td>
        </tr>
        <tr>
          <td>/connection-details</td>
          <td>Get connection metadata</td>
          <td>dim_connection, dim_data_source_field</td>
        </tr>
        <tr>
          <td>/rule-occurrences</td>
          <td>Get rule configurations</td>
          <td>dim_rule_occurrence</td>
        </tr>
      </tbody>
    </table>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Detailed Mapping Examples</FluentText>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">Statistics API → fact_profiling_result</FluentText>
      <div className={styles.codeBlock}>
        {`API Response:
{
  "columnName": "CUSTOMER_ID",
  "numRowsOfData": 1000000,
  "numNullValues": 5,
  "numDistinctValues": 999995,
  "minLength": 5,
  "maxLength": 10
}

Database Records:
INSERT INTO fact_profiling_result (column_name, metric_type, metric_value)
VALUES
  ('CUSTOMER_ID', 'TOTAL_ROWS', 1000000),
  ('CUSTOMER_ID', 'NULL_COUNT', 5),
  ('CUSTOMER_ID', 'NULL_PERCENT', 0.0005),
  ('CUSTOMER_ID', 'DISTINCT_COUNT', 999995),
  ('CUSTOMER_ID', 'DISTINCT_PERCENT', 99.9995),
  ('CUSTOMER_ID', 'MIN_LENGTH', 5),
  ('CUSTOMER_ID', 'MAX_LENGTH', 10);`}
      </div>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">Patterns API → fact_column_pattern</FluentText>
      <div className={styles.codeBlock}>
        {`API Response:
{
  "patternLabel": "X(3)-9(4)",
  "numRowsOfData": 950000,
  "satisfaction": 95.0
}

Database Record:
INSERT INTO fact_column_pattern
  (column_name, pattern_label, row_count, satisfaction)
VALUES
  ('CUSTOMER_ID', 'X(3)-9(4)', 950000, 95.0);`}
      </div>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Incremental Sync Logic</FluentText>
    <Card>
      <FluentText>
        When <strong>Incremental Sync</strong> is enabled:
      </FluentText>
      <ol style={{ paddingLeft: '20px', marginTop: '8px' }}>
        <li><FluentText>System queries existing run IDs from dim_profiling_run</FluentText></li>
        <li><FluentText>Compares with runs returned by IDMC API</FluentText></li>
        <li><FluentText>Only syncs runs that don't exist in database</FluentText></li>
        <li><FluentText>Skips API calls for statistics/patterns/frequencies of existing runs</FluentText></li>
      </ol>
      <FluentText style={{ marginTop: '12px' }}>
        <strong>Result:</strong> Dramatically reduces sync time and API calls for subsequent syncs.
        Only new profiling runs (since last sync) are extracted.
      </FluentText>
    </Card>
  </div>
);

const ApiFlowSection: React.FC<{ styles: any }> = ({ styles }) => (
  <div className={styles.section}>
    <FluentText size={500} weight="semibold">API Flow Tutorial</FluentText>
    <FluentText>
      This tutorial explains the end-to-end sequence of API calls during a sync job,
      showing how parameters chain from one call to the next.
    </FluentText>

    <Card style={{ marginTop: '16px', padding: '12px' }}>
      <FluentText weight="semibold">Color-Coded Legend:</FluentText>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
        <Badge appearance="filled" color="success">Authentication</Badge>
        <Badge appearance="filled" color="informative">Discovery</Badge>
        <Badge appearance="filled" color="warning">Profiling Runs</Badge>
        <Badge appearance="filled" color="severe">Column Statistics</Badge>
        <Badge appearance="filled" color="important">Enhanced Data</Badge>
      </div>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Step 1: Authentication & Session Setup</FluentText>
    <Card>
      <Badge appearance="filled" color="success">POST /api/v2/user/login</Badge>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Purpose:</strong> Authenticate and establish session
      </FluentText>
      <div className={styles.codeBlock}>
{`Request Body:
{
  "username": "your-username",
  "password": "your-password"
}

Response (Extract these):
{
  "userInfo": {
    "id": "usr123",
    "orgId": "orgABC456",        ← SAVE THIS
    "orgName": "My Organization"
  },
  "products": [
    {
      "baseApiUrl": "https://usw3.dm-us.informaticacloud.com",
      "profilingUrl": "https://usw3-api.dm-us.informaticacloud.com/saas" ← SAVE THIS
    }
  ]
}

Cookies Set:
- icSessionId=xyz789...          ← AUTO-SAVED IN SESSION`}
      </div>
      <FluentText style={{ marginTop: '8px', fontStyle: 'italic' }}>
        ➜ <strong>Next Step Uses:</strong> orgId, profilingUrl, icSessionId cookie
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Step 2: Discover Profiling Tasks</FluentText>
    <Card>
      <Badge appearance="filled" color="informative">GET {`{profilingUrl}/public/core/v3/profiles`}</Badge>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Purpose:</strong> List all profiling tasks in the organization
      </FluentText>
      <div className={styles.codeBlock}>
{`Request Headers:
Cookie: icSessionId=xyz789...    ← FROM LOGIN

Response (Extract these):
[
  {
    "id": "prof123",             ← SAVE AS profileId
    "name": "Customer Data Profile",
    "assetId": "asset456",       ← SAVE THIS
    "assetType": "ProfileAsset",
    "frsId": "frs789",           ← SAVE THIS (FRS = Functional Reference Source)
    "connectionId": "conn001"    ← SAVE THIS
  },
  ...
]`}
      </div>
      <FluentText style={{ marginTop: '8px', fontStyle: 'italic' }}>
        ➜ <strong>Next Step Uses:</strong> profileId (as "id" param in next call)
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Step 3: Fetch Profiling Runs</FluentText>
    <Card>
      <Badge appearance="filled" color="warning">GET {`{profilingUrl}/public/core/v3/profiles/{profileId}/runs`}</Badge>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Purpose:</strong> Get execution history for a specific profiling task
      </FluentText>
      <div className={styles.codeBlock}>
{`Request:
GET .../profiles/prof123/runs  ← profileId FROM STEP 2

Response (Extract these):
[
  {
    "id": "run456",              ← SAVE AS runId
    "runKey": "20260505_143022", ← SAVE THIS (Unique run identifier)
    "status": "SUCCESS",
    "startTime": "2026-05-05T14:30:22Z",
    "endTime": "2026-05-05T14:35:45Z",
    "recordsProfiled": 150000
  },
  ...
]`}
      </div>
      <FluentText style={{ marginTop: '8px', fontStyle: 'italic' }}>
        ➜ <strong>Next Step Uses:</strong> profileId + runId (both needed for column stats)
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Step 4: Extract Column Statistics</FluentText>
    <Card>
      <Badge appearance="filled" color="severe">GET {`{profilingUrl}/public/core/v3/profiles/{profileId}/runs/{runId}/columns`}</Badge>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Purpose:</strong> Get detailed statistics for each column in the profiling run
      </FluentText>
      <div className={styles.codeBlock}>
{`Request:
GET .../profiles/prof123/runs/run456/columns
     ↑ FROM STEP 2    ↑ FROM STEP 3

Response (Extract these):
[
  {
    "id": "col789",              ← SAVE AS columnId
    "name": "customer_email",
    "dataType": "string",
    "totalCount": 150000,
    "nullCount": 523,
    "distinctCount": 147821,
    "min": "a@example.com",
    "max": "z@example.com",
    "avgLength": 24.5,
    "uniqueRatio": 0.9854
  },
  ...
]`}
      </div>
      <FluentText style={{ marginTop: '8px', fontStyle: 'italic' }}>
        ➜ <strong>Next Step Uses:</strong> profileId + runId + columnId (all three for enhanced data)
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Step 5: Enhanced Column Data (Patterns, DataTypes, Frequencies)</FluentText>
    <Card>
      <Badge appearance="filled" color="important">Multiple Endpoints</Badge>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Purpose:</strong> Get detailed breakdowns for each column
      </FluentText>

      <FluentText weight="semibold" style={{ marginTop: '12px' }}>5a. Column Patterns</FluentText>
      <div className={styles.codeBlock}>
{`GET .../profiles/prof123/runs/run456/columns/col789/patterns
     ↑ STEP 2         ↑ STEP 3        ↑ STEP 4

Response:
[
  {
    "pattern": "Aa@aaa.aaa",     // Email pattern
    "occurrences": 125000,
    "percentage": 83.33
  },
  {
    "pattern": "Aa@aaa.aa",
    "occurrences": 22000,
    "percentage": 14.67
  }
]`}
      </div>

      <FluentText weight="semibold" style={{ marginTop: '12px' }}>5b. Data Types</FluentText>
      <div className={styles.codeBlock}>
{`GET .../profiles/prof123/runs/run456/columns/col789/datatypes

Response:
[
  {
    "dataType": "string",
    "inferredCount": 149477,
    "percentage": 99.65
  },
  {
    "dataType": "null",
    "inferredCount": 523,
    "percentage": 0.35
  }
]`}
      </div>

      <FluentText weight="semibold" style={{ marginTop: '12px' }}>5c. Value Frequencies</FluentText>
      <div className={styles.codeBlock}>
{`GET .../profiles/prof123/runs/run456/columns/col789/valuefrequencies

Response:
[
  {
    "value": "john@example.com",
    "occurrences": 45,
    "percentage": 0.03,
    "totalRows": 150000,         // Total rows in run
    "rowIdentifier": 1234,       // Row ID where value appears
    "length": 17                 // Length of this value
  },
  ...
]`}
      </div>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Step 6: Metadata (FRS Paths & Rule Occurrences)</FluentText>
    <Card>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Purpose:</strong> Get data source details and rule validation information
      </FluentText>

      <FluentText weight="semibold" style={{ marginTop: '12px' }}>6a. FRS Path (Data Source)</FluentText>
      <div className={styles.codeBlock}>
{`GET {profilingUrl}/public/core/v3/frs/{frsId}/path
                                         ↑ FROM STEP 2

Response:
{
  "path": "/Connections/Salesforce/Customer_Table",
  "connectionId": "conn001",
  "connectionName": "Salesforce Prod"
}`}
      </div>

      <FluentText weight="semibold" style={{ marginTop: '12px' }}>6b. Rule Occurrences (Validation Thresholds)</FluentText>
      <div className={styles.codeBlock}>
{`GET {profilingUrl}/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/{profileId}
                                                                                                    ↑ FROM STEP 2

Request Headers:
IDS-SESSION-ID: {sessionId}      ← IMPORTANT: Profiling API uses IDS-SESSION-ID, not INFA-SESSION-ID

Response:
[
  {
    "id": "db492631-ec22-45ab-b9cc-ea86f3acfed6",
    "status": "READ",
    "metadata": "",
    "ruleOccurrenceRM": {
      "id": "db492631-ec22-45ab-b9cc-ea86f3acfed6",
      "name": "Consistency_LAST_NAME, MIDDLE_NAME_isValid",
      "description": "Consistency_LAST_NAME, MIDDLE_NAME_isValid",
      "ruleFRSId": "hdcKuZ8k4qYhI6d6RN60iG",
      "threshold": "84.0",         ← LOW threshold (minimum acceptable)
      "target": "95.0",            ← HIGH threshold (target/desired)
      "measuringMethod": "InformaticaCloudDataQuality",
      "frequency": "Daily",
      "criticality": "High",
      "type": "Consistency",
      "mappletColumnId": "8833a170-c542-44d7-9896-331843fde1e6"
    }
  }
]

Note: Not all rules have Rule Occurrences. Rule Occurrences are user-configured
in IDMC and link quality thresholds to profiling tasks. Rules without occurrences
use default thresholds (70% low, 90% high).`}
      </div>
    </Card>

    <Card style={{ marginTop: '24px', backgroundColor: tokens.colorNeutralBackground2 }}>
      <FluentText weight="semibold">Complete Flow Summary:</FluentText>
      <ol style={{ paddingLeft: '20px', marginTop: '8px' }}>
        <li><FluentText>Login → Get <code>orgId</code>, <code>profilingUrl</code>, <code>sessionId</code></FluentText></li>
        <li><FluentText>List Profiles → Get <code>profileId</code>, <code>frsId</code>, <code>connectionId</code></FluentText></li>
        <li><FluentText>Get Runs → Get <code>runId</code>, <code>runKey</code></FluentText></li>
        <li><FluentText>Get Columns → Get <code>columnId</code> + base statistics</FluentText></li>
        <li><FluentText>For each column → Get patterns, datatypes, valuefrequencies</FluentText></li>
        <li><FluentText>Get metadata → FRS paths, rule occurrences (thresholds)</FluentText></li>
      </ol>
      <FluentText style={{ marginTop: '12px', fontStyle: 'italic' }}>
        <strong>Key Insight:</strong> Each API call builds on data extracted from previous calls,
        creating a chain of parameters that flows through the entire sync process.
      </FluentText>
      <FluentText style={{ marginTop: '12px', fontStyle: 'italic' }}>
        <strong>Important Header:</strong> Rule Occurrence API requires <code>IDS-SESSION-ID</code> header
        (not <code>INFA-SESSION-ID</code>). This is specific to the profiling service endpoints.
      </FluentText>
    </Card>
  </div>
);

const BIIntegrationSection: React.FC<{ styles: any }> = ({ styles }) => (
  <div className={styles.section}>
    <FluentText size={500} weight="semibold">BI Tool Integration</FluentText>

    <Card>
      <FluentText>
        The SQLite database can be accessed directly by business intelligence tools for custom reporting and analysis.
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold">Power BI Connection</FluentText>
    <Card>
      <ol style={{ paddingLeft: '20px' }}>
        <li><FluentText>Open Power BI Desktop</FluentText></li>
        <li><FluentText>Click <strong>Get Data</strong> → <strong>More...</strong></FluentText></li>
        <li><FluentText>Search for and select <strong>SQLite Database</strong></FluentText></li>
        <li><FluentText>Browse to database file: <code>C:\Temp\Claude\ProfilingReport\backend\idmc_profiling.db</code></FluentText></li>
        <li><FluentText>Click <strong>OK</strong></FluentText></li>
        <li><FluentText>Navigator will show all tables</FluentText></li>
        <li><FluentText>Select tables to import (usually start with fact_profiling_result)</FluentText></li>
        <li><FluentText>Click <strong>Transform Data</strong> to model relationships</FluentText></li>
      </ol>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Tableau Connection</FluentText>
    <Card>
      <ol style={{ paddingLeft: '20px' }}>
        <li><FluentText>Open Tableau Desktop</FluentText></li>
        <li><FluentText>Click <strong>Connect</strong> → <strong>To a File</strong> → <strong>Other Databases (ODBC)</strong></FluentText></li>
        <li><FluentText>Select SQLite ODBC driver (install if needed)</FluentText></li>
        <li><FluentText>Configure connection:
          <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
            <li>Database: Path to idmc_profiling.db</li>
          </ul>
        </FluentText></li>
        <li><FluentText>Click <strong>Sign In</strong></FluentText></li>
        <li><FluentText>Drag tables to canvas to create joins</FluentText></li>
      </ol>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Excel/Access Connection</FluentText>
    <Card>
      <FluentText>
        <strong>Excel:</strong> Use ODBC connection with Microsoft Query or Power Query (Get Data → From Database → From ODBC)
      </FluentText>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Access:</strong> Link tables via ODBC → External Data → ODBC Database
      </FluentText>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Sample SQL Queries</FluentText>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">Data Quality Score by Task</FluentText>
      <div className={styles.codeBlock}>
        {`SELECT
    t.profiling_name AS Task,
    t.org_id AS Organization,
    COUNT(DISTINCT r.profiling_run_id) AS TotalRuns,
    AVG(CASE WHEN f.metric_type = 'NULL_PERCENT' THEN f.metric_value END) AS AvgNullPercent,
    AVG(CASE WHEN f.metric_type = 'DISTINCT_PERCENT' THEN f.metric_value END) AS AvgUniqueness
FROM dim_profiling_task t
JOIN dim_profiling_run r ON t.profiling_task_id = r.profiling_task_id
JOIN fact_profiling_result f ON r.profiling_run_id = f.profiling_run_id
WHERE f.column_type = 'DATASOURCEFIELD'
GROUP BY t.profiling_name, t.org_id
ORDER BY AvgNullPercent;`}
      </div>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">Top Columns by Pattern Cardinality</FluentText>
      <div className={styles.codeBlock}>
        {`SELECT
    t.profiling_name AS Task,
    p.column_name AS Column,
    COUNT(DISTINCT p.pattern_label) AS PatternCount,
    SUM(p.row_count) AS TotalRows
FROM fact_column_pattern p
JOIN dim_profiling_run r ON p.profiling_run_id = r.profiling_run_id
JOIN dim_profiling_task t ON r.profiling_task_id = t.profiling_task_id
WHERE r.run_key = (
    SELECT MAX(run_key) FROM dim_profiling_run
    WHERE profiling_task_id = r.profiling_task_id
)
GROUP BY t.profiling_name, p.column_name
HAVING PatternCount > 10
ORDER BY PatternCount DESC
LIMIT 20;`}
      </div>
    </Card>

    <Card style={{ marginBottom: '16px' }}>
      <FluentText size={300} weight="semibold">Rule Validation Trend</FluentText>
      <div className={styles.codeBlock}>
        {`SELECT
    t.profiling_name AS Task,
    rm.name AS RuleName,
    r.run_key AS RunNumber,
    r.run_start_time AS RunDate,
    SUM(CASE WHEN vf.column_value = 'TRUE' THEN vf.frequency ELSE 0 END) AS ValidRows,
    SUM(vf.frequency) AS TotalRows,
    ROUND(100.0 * SUM(CASE WHEN vf.column_value = 'TRUE' THEN vf.frequency ELSE 0 END) / SUM(vf.frequency), 2) AS ValidationScore
FROM dim_rule_mapplet rm
JOIN fact_rule_output_mapping om ON rm.rule_mapplet_id = om.rule_mapplet_id
JOIN fact_column_value_frequency vf ON om.out_field_name = vf.column_name
    AND om.profiling_run_id = vf.profiling_run_id
JOIN dim_profiling_run r ON vf.profiling_run_id = r.profiling_run_id
JOIN dim_profiling_task t ON r.profiling_task_id = t.profiling_task_id
WHERE vf.column_value IN ('TRUE', 'FALSE')
GROUP BY t.profiling_name, rm.name, r.run_key, r.run_start_time
ORDER BY t.profiling_name, rm.name, r.run_key;`}
      </div>
    </Card>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Best Practices</FluentText>
    <ul style={{ paddingLeft: '20px' }}>
      <li><FluentText><strong>Use Latest Run:</strong> Filter by MAX(run_key) for current state</FluentText></li>
      <li><FluentText><strong>Filter by org_id:</strong> Separate reports per organization</FluentText></li>
      <li><FluentText><strong>Join carefully:</strong> Use run_id to ensure metrics from same run</FluentText></li>
      <li><FluentText><strong>Index optimization:</strong> Database has indexes on key fields (org_id, run_key, etc.)</FluentText></li>
      <li><FluentText><strong>Data refresh:</strong> Set BI tool to refresh when sync job completes</FluentText></li>
    </ul>

    <FluentText size={400} weight="semibold" style={{ marginTop: '24px' }}>Database File Access</FluentText>
    <Card>
      <FluentText>
        <strong>File Path:</strong> <code>C:\Temp\Claude\ProfilingReport\backend\idmc_profiling.db</code>
      </FluentText>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Read-Only Mode:</strong> Recommended for BI tools to prevent lock conflicts
      </FluentText>
      <FluentText style={{ marginTop: '8px' }}>
        <strong>Concurrent Access:</strong> SQLite allows multiple readers, one writer
      </FluentText>
    </Card>
  </div>
);
