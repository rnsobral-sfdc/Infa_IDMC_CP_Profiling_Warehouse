import React, { ReactNode } from 'react';
import {
  Title1,
  Body1,
  Text as FluentText,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  header: {
    marginBottom: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalM,
  },
  titleSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    display: 'block',
    marginBottom: tokens.spacingVerticalS,
    fontWeight: tokens.fontWeightSemibold,
  },
  subtitle: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: tokens.spacingHorizontalXL,
  },
  apiHint: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
    marginTop: tokens.spacingVerticalM,
  },
  apiHintTitle: {
    display: 'block',
    marginBottom: tokens.spacingVerticalXXS,
    fontWeight: tokens.fontWeightSemibold,
  },
  apiHintText: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    lineHeight: '1.5',
  },
});

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  apiHint?: {
    step: string;
    description: string;
  };
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  apiHint,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <div className={styles.titleSection}>
          <Title1 className={styles.title}>{title}</Title1>
          <Body1 className={styles.subtitle}>{subtitle}</Body1>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      {apiHint && (
        <div className={styles.apiHint}>
          <FluentText size={300} className={styles.apiHintTitle}>
            {apiHint.step}
          </FluentText>
          <FluentText size={200} className={styles.apiHintText}>
            {apiHint.description}
          </FluentText>
        </div>
      )}
    </div>
  );
};
