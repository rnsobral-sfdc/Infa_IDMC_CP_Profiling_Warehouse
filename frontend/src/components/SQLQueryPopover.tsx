import React, { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Button,
  makeStyles,
  tokens,
  Text as FluentText,
} from '@fluentui/react-components';
import { Database24Regular, Copy24Regular, Checkmark24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  popoverSurface: {
    maxWidth: '700px',
    maxHeight: '600px',
    overflowY: 'auto',
    padding: tokens.spacingVerticalL,
  },
  header: {
    marginBottom: tokens.spacingVerticalM,
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalXS,
    display: 'block',
  },
  subtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    display: 'block',
  },
  sqlContainer: {
    position: 'relative',
    backgroundColor: tokens.colorNeutralBackground5,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  sql: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.5',
    color: tokens.colorNeutralForeground1,
    margin: 0,
    paddingRight: tokens.spacingHorizontalXXL,
  },
  copyButtonContainer: {
    position: 'absolute',
    top: tokens.spacingVerticalS,
    right: tokens.spacingHorizontalS,
  },
  triggerButton: {
    minWidth: 'auto',
    padding: '4px',
    height: '24px',
  },
});

interface SQLQueryPopoverProps {
  query: string;
  title?: string;
  columnName?: string;
  trigger?: React.ReactElement;
}

export const SQLQueryPopover: React.FC<SQLQueryPopoverProps> = ({
  query,
  title = 'SQL Query',
  columnName,
  trigger,
}) => {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy SQL query:', err);
    }
  };

  const defaultTrigger = (
    <Button
      appearance="subtle"
      size="small"
      icon={<Database24Regular />}
      className={styles.triggerButton}
      title="View SQL query"
    />
  );

  return (
    <Popover positioning="below-start" withArrow>
      <PopoverTrigger disableButtonEnhancement>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverSurface className={styles.popoverSurface}>
        <div className={styles.header}>
          <FluentText className={styles.title}>
            {title}
          </FluentText>
          {columnName && (
            <FluentText className={styles.subtitle}>
              Column: {columnName}
            </FluentText>
          )}
        </div>

        <div className={styles.sqlContainer}>
          <pre className={styles.sql}>{query}</pre>
          <div className={styles.copyButtonContainer}>
            <Button
              appearance="subtle"
              size="small"
              icon={copied ? <Checkmark24Regular /> : <Copy24Regular />}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy SQL query'}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
