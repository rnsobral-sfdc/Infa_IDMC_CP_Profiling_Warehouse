import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../src/components/Layout';
import {
  Card,
  Button,
  Text as FluentText,
  Title1,
  Title3,
  Body1,
  makeStyles,
  tokens,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  PlugConnected24Regular,
  Database24Regular,
  Settings24Regular,
  ChartMultiple24Regular,
  ArrowRight24Regular,
  Lightbulb24Regular,
  Warning24Regular,
  Info24Regular,
} from '@fluentui/react-icons';
import { api } from '../src/lib/api';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    marginBottom: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    display: 'block',
    marginBottom: tokens.spacingVerticalS,
    fontWeight: tokens.fontWeightBold,
  },
  subtitle: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    lineHeight: '1.5',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalXXL,
  },
  featureCard: {
    padding: tokens.spacingVerticalXL,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: tokens.shadow16,
    },
  },
  featureIcon: {
    fontSize: '32px',
    marginBottom: tokens.spacingVerticalM,
  },
  featureTitle: {
    marginBottom: tokens.spacingVerticalS,
  },
  featureDescription: {
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalM,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalXXL,
  },
  statCard: {
    padding: tokens.spacingVerticalL,
    textAlign: 'center',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: tokens.fontWeightBold,
    marginBottom: tokens.spacingVerticalXS,
  },
  statLabel: {
    color: tokens.colorNeutralForeground3,
  },
  guideCard: {
    padding: tokens.spacingVerticalXL,
  },
  guideList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  guideStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
  },
  stepNumber: {
    minWidth: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: tokens.fontWeightSemibold,
  },
  tipCard: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorPaletteYellowBackground2,
    border: `1px solid ${tokens.colorPaletteYellowBorder2}`,
  },
  disclaimerBanner: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorPaletteYellowBackground1,
    borderLeft: `4px solid ${tokens.colorPaletteYellowBorder1}`,
    marginBottom: tokens.spacingVerticalXL,
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
  },
  disclaimerIcon: {
    color: tokens.colorPaletteYellowForeground1,
    fontSize: '24px',
    flexShrink: 0,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerLink: {
    marginLeft: tokens.spacingHorizontalS,
    color: tokens.colorBrandForeground1,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
});

export default function Home() {
  const styles = useStyles();
  const router = useRouter();
  const [stats, setStats] = useState({
    connections: 0,
    tasks: 0,
    runs: 0,
    results: 0,
    loading: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [connections, dashboardStats] = await Promise.all([
        api.getConnections() as Promise<any[]>,
        api.getDashboardStats().catch(() => ({ total_profiling_tasks: 0, total_profiling_runs: 0, total_profiling_results: 0 })) as Promise<any>,
      ]);

      setStats({
        connections: connections.length,
        tasks: dashboardStats.total_profiling_tasks || 0,
        runs: dashboardStats.total_profiling_runs || 0,
        results: dashboardStats.total_profiling_results || 0,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      setStats({ connections: 0, tasks: 0, runs: 0, results: 0, loading: false });
    }
  }

  const features = [
    {
      icon: <PlugConnected24Regular />,
      title: 'Connections',
      description: 'Configure and test IDMC API connections with automatic profiling URL detection',
      href: '/connections',
      color: tokens.colorPaletteBlueBorder2,
      stat: stats.connections,
      statLabel: 'Active Connections'
    },
    {
      icon: <Settings24Regular />,
      title: 'Sync Jobs',
      description: 'Schedule recurring data extraction with incremental or full sync modes',
      href: '/sync-jobs',
      color: tokens.colorPaletteGreenBorder2,
      stat: stats.runs,
      statLabel: 'Total Runs'
    },
    {
      icon: <Database24Regular />,
      title: 'Profiling Tasks',
      description: 'View all profiling tasks with hierarchical project/folder structure',
      href: '/profiling-tasks',
      color: tokens.colorPalettePurpleBorder2,
      stat: stats.tasks,
      statLabel: 'Tasks Synced'
    },
    {
      icon: <ChartMultiple24Regular />,
      title: 'Reports',
      description: 'Analyze profiling results with trends, drift calculations, and insights',
      href: '/reports',
      color: tokens.colorPaletteOrangeBorder2,
      stat: stats.results,
      statLabel: 'Results Stored'
    },
  ];

  const steps = [
    'Create an IDMC connection in the Connections page',
    'Test the connection to verify credentials and auto-detect settings',
    'View available profiling tasks in the Profiling Tasks dashboard',
    'Create a sync job to automatically pull data on a schedule',
    'Trigger manual sync or wait for scheduled execution',
    'Analyze results with trends and drift in Reports',
  ];

  return (
    <Layout>
      <div className={styles.container}>
        {/* Disclaimer Banner */}
        <Card className={styles.disclaimerBanner}>
          <Warning24Regular className={styles.disclaimerIcon} />
          <div className={styles.disclaimerContent}>
            <FluentText weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>
              Educational Use Only
            </FluentText>
            <FluentText size={300}>
              This software is for educational purposes to learn IDMC APIs. It is not official Salesforce/Informatica documentation or product training.
              <span
                className={styles.disclaimerLink}
                onClick={() => router.push('/disclaimer')}
              >
                Read full disclaimer
              </span>
            </FluentText>
          </div>
          <Button
            appearance="subtle"
            icon={<Info24Regular />}
            onClick={() => router.push('/disclaimer')}
          >
            View Details
          </Button>
        </Card>

        <div className={styles.header}>
          <Title1 className={styles.title}>IDMC Profiling Data Warehouse</Title1>
          <Body1 className={styles.subtitle}>
            Extract, store, and analyze data profiling results from Informatica IDMC
          </Body1>
        </div>

        {/* Statistics merged with feature cards below */}

        {/* Feature Cards with Stats */}
        {stats.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXL }}>
            <Spinner label="Loading..." />
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {features.map((feature) => (
              <Card
                key={feature.href}
                className={styles.featureCard}
                onClick={() => router.push(feature.href)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacingVerticalM }}>
                  <div className={styles.featureIcon} style={{ color: feature.color }}>
                    {feature.icon}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '28px', fontWeight: tokens.fontWeightBold, color: feature.color }}>
                      {feature.stat}
                    </div>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {feature.statLabel}
                    </FluentText>
                  </div>
                </div>
                <Title3 className={styles.featureTitle}>{feature.title}</Title3>
                <FluentText className={styles.featureDescription}>{feature.description}</FluentText>
                <Button
                  appearance="subtle"
                  icon={<ArrowRight24Regular />}
                  iconPosition="after"
                  style={{ marginTop: tokens.spacingVerticalS }}
                >
                  Go to {feature.title}
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Start Guide */}
        <Card className={styles.guideCard}>
          <Title3 style={{ marginBottom: tokens.spacingVerticalL }}>Quick Start Guide</Title3>
          <ul className={styles.guideList}>
            {steps.map((step, index) => (
              <li key={index} className={styles.guideStep}>
                <div className={styles.stepNumber}>{index + 1}</div>
                <Body1>{step}</Body1>
              </li>
            ))}
          </ul>
        </Card>

        {/* Tip */}
        <Card className={styles.tipCard} style={{ marginTop: tokens.spacingVerticalL }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacingHorizontalM }}>
            <Lightbulb24Regular style={{ color: tokens.colorPaletteYellowForeground1, marginTop: '2px' }} />
            <div>
              <FluentText weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>
                💡 Getting Started
              </FluentText>
              <FluentText size={300}>
                Start by creating a connection to your IDMC instance. The system will automatically detect
                your organization and profiling API URL. Once connected, you can sync profiling tasks and
                view comprehensive analytics.
              </FluentText>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
