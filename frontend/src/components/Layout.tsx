import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Button,
  Badge,
  makeStyles,
  tokens,
  Tooltip,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Text as FluentText,
  Caption1,
  Body1Strong,
} from '@fluentui/react-components';
import {
  Home24Regular,
  PlugConnected24Regular,
  Database24Regular,
  Settings24Regular,
  ChartMultiple24Regular,
  PlugConnected24Filled,
  PlugDisconnected24Filled,
  Info24Regular,
} from '@fluentui/react-icons';
import { api } from '../lib/api';

const useStyles = makeStyles({
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  sidebar: {
    width: '240px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: tokens.spacingVerticalXL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXXS,
  },
  nav: {
    padding: tokens.spacingVerticalM,
    flex: 1,
  },
  navList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    textDecoration: 'none',
    color: tokens.colorNeutralForeground2,
    transition: 'all 0.2s',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2,
      color: tokens.colorNeutralForeground1,
    },
  },
  navLinkActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightSemibold,
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
  navIcon: {
    marginRight: tokens.spacingHorizontalM,
  },
  footer: {
    padding: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  main: {
    flex: 1,
    overflowY: 'auto',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    marginBottom: tokens.spacingVerticalXS,
  },
  connectionDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  connectionDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  connectionLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  connectionValue: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

interface LayoutProps {
  children: ReactNode;
}

interface Connection {
  id: number;
  name: string;
  org_id?: string;
  org_name?: string;
  last_test_status?: string;
}

export default function Layout({ children }: LayoutProps) {
  const styles = useStyles();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();

    // Poll for connection status every 30 seconds
    const interval = setInterval(() => {
      loadConnections();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Also reload when route changes (to pick up updates from connections page)
  useEffect(() => {
    loadConnections();
  }, [router.pathname]);

  async function loadConnections() {
    try {
      const data = await api.getConnections() as Connection[];
      setConnections(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load connections:', err);
      setLoading(false);
    }
  }

  const navigation = [
    { name: 'Home', href: '/', icon: Home24Regular },
    { name: 'Connections', href: '/connections', icon: PlugConnected24Regular },
    { name: 'Sync Jobs', href: '/sync-jobs', icon: Settings24Regular },
    { name: 'Profiling Tasks', href: '/profiling-tasks', icon: Database24Regular },
    { name: 'Reports', href: '/reports', icon: ChartMultiple24Regular },
    { name: 'Data Explorer', href: '/data-explorer', icon: Database24Regular },
    { name: 'Disclaimer', href: '/disclaimer', icon: Info24Regular },
    { name: 'Documentation', href: '/documentation', icon: Info24Regular },
  ];

  const isActive = (href: string) => router.pathname === href;

  const activeConnection = connections.find(c => c.last_test_status === 'SUCCESS');
  const hasConnection = activeConnection !== undefined;

  // Check if any connection is disconnected
  const hasDisconnectedConnection = connections.some(c => c.last_test_status === 'DISCONNECTED');

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.title}>IDMC Profiling</h1>
          <p className={styles.subtitle}>Data Warehouse</p>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                  >
                    <Icon className={styles.navIcon} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.footer}>
          {loading ? (
            <div className={styles.connectionStatus}>
              <span>Loading...</span>
            </div>
          ) : hasConnection ? (
            <div className={styles.connectionDetails}>
              <div className={styles.connectionStatus}>
                <PlugConnected24Filled style={{ color: tokens.colorPaletteGreenForeground1 }} />
                <span style={{ color: tokens.colorPaletteGreenForeground1, fontWeight: tokens.fontWeightSemibold }}>
                  Connected
                </span>
              </div>

              <div className={styles.connectionDetailItem}>
                <Caption1>Organization</Caption1>
                <Tooltip content={activeConnection.org_name || 'Unknown'} relationship="description">
                  <div className={styles.connectionValue}>
                    {activeConnection.org_name || 'Unknown'}
                  </div>
                </Tooltip>
              </div>

              <div className={styles.connectionDetailItem}>
                <Caption1>Org ID</Caption1>
                <Tooltip content={activeConnection.org_id || 'N/A'} relationship="description">
                  <div className={styles.connectionValue} style={{ fontFamily: 'monospace', fontSize: tokens.fontSizeBase100 }}>
                    {activeConnection.org_id || 'N/A'}
                  </div>
                </Tooltip>
              </div>

              <div className={styles.connectionDetailItem}>
                <Caption1>Connection</Caption1>
                <Tooltip content={activeConnection.name} relationship="description">
                  <div className={styles.connectionValue}>
                    {activeConnection.name}
                  </div>
                </Tooltip>
              </div>
            </div>
          ) : (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button
                  appearance="subtle"
                  icon={<PlugDisconnected24Filled style={{ color: tokens.colorPaletteRedForeground1 }} />}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span style={{ color: tokens.colorPaletteRedForeground1 }}>Not Connected</span>
                </Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem onClick={() => router.push('/connections')}>
                    Go to Connections
                  </MenuItem>
                  {connections.length > 0 && (
                    <MenuItem onClick={() => {
                      router.push('/connections');
                    }}>
                      Test Existing Connections
                    </MenuItem>
                  )}
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
