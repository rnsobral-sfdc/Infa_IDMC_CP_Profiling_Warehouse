import React from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Button,
  Text as FluentText,
  makeStyles,
  tokens,
  Divider,
} from '@fluentui/react-components';
import { Info16Regular, Copy16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  popoverSurface: {
    minWidth: '500px',
    maxWidth: '600px',
    padding: tokens.spacingVerticalL,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalS,
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    minWidth: '140px',
  },
  value: {
    flex: 1,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
  },
  copyButton: {
    minWidth: 'auto',
  },
});

interface TaskInfoPopoverProps {
  profilingId: string;
  frsId?: string;
  frsProjectId?: string;
  frsFolderId?: string;
  connectionId?: string;
  isFilterEnabled?: boolean;
  samplingOptions?: any;
}

export const TaskInfoPopover: React.FC<TaskInfoPopoverProps> = ({
  profilingId,
  frsId,
  frsProjectId,
  frsFolderId,
  connectionId,
  isFilterEnabled,
  samplingOptions,
}) => {
  const styles = useStyles();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Popover>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          icon={<Info16Regular />}
          size="small"
          style={{ minWidth: 'auto', padding: '4px' }}
        />
      </PopoverTrigger>

      <PopoverSurface className={styles.popoverSurface}>
        <FluentText weight="semibold" size={400} style={{ display: 'block', marginBottom: tokens.spacingVerticalM }}>
          Profiling Task Details
        </FluentText>

        <Divider style={{ marginBottom: tokens.spacingVerticalM }} />

        <div className={styles.row}>
          <FluentText className={styles.label}>Profiling ID:</FluentText>
          <FluentText className={styles.value}>{profilingId}</FluentText>
          <Button
            appearance="subtle"
            icon={<Copy16Regular />}
            size="small"
            className={styles.copyButton}
            onClick={() => copyToClipboard(profilingId)}
            title="Copy to clipboard"
          />
        </div>

        {frsId && (
          <div className={styles.row}>
            <FluentText className={styles.label}>frsId (Profile):</FluentText>
            <FluentText className={styles.value}>{frsId}</FluentText>
            <Button
              appearance="subtle"
              icon={<Copy16Regular />}
              size="small"
              className={styles.copyButton}
              onClick={() => copyToClipboard(frsId)}
              title="Copy to clipboard"
            />
          </div>
        )}

        {frsProjectId && (
          <div className={styles.row}>
            <FluentText className={styles.label}>frsProjectId:</FluentText>
            <FluentText className={styles.value}>{frsProjectId}</FluentText>
            <Button
              appearance="subtle"
              icon={<Copy16Regular />}
              size="small"
              className={styles.copyButton}
              onClick={() => copyToClipboard(frsProjectId)}
              title="Copy to clipboard"
            />
          </div>
        )}

        {connectionId && (
          <div className={styles.row}>
            <FluentText className={styles.label}>Connection ID:</FluentText>
            <FluentText className={styles.value}>{connectionId}</FluentText>
            <Button
              appearance="subtle"
              icon={<Copy16Regular />}
              size="small"
              className={styles.copyButton}
              onClick={() => copyToClipboard(connectionId)}
              title="Copy to clipboard"
            />
          </div>
        )}

        <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />

        <FluentText size={200} style={{ display: 'block', marginBottom: tokens.spacingVerticalS, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold }}>
          💡 How to get Project/Folder Path:
        </FluentText>
        <FluentText size={200} style={{ display: 'block', marginBottom: tokens.spacingVerticalXS, lineHeight: '1.4' }}>
          1. Call this API once per task:
        </FluentText>
        <FluentText size={200} style={{ display: 'block', marginBottom: tokens.spacingVerticalS, fontFamily: tokens.fontFamilyMonospace, backgroundColor: tokens.colorNeutralBackground3, padding: tokens.spacingVerticalXS }}>
          GET /saas/public/core/v3/objects?q=type=='Project'
        </FluentText>
        <FluentText size={200} style={{ display: 'block', marginBottom: tokens.spacingVerticalXS, lineHeight: '1.4' }}>
          2. Find the object where <strong>id</strong> matches <strong>frsProjectId</strong> above
        </FluentText>
        <FluentText size={200} style={{ display: 'block', marginBottom: tokens.spacingVerticalM, lineHeight: '1.4' }}>
          3. The <strong>path</strong> field contains the full project/folder path
        </FluentText>

        <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />

        {isFilterEnabled !== undefined && (
          <div className={styles.row}>
            <FluentText className={styles.label}>Filter Enabled:</FluentText>
            <FluentText className={styles.value}>
              {isFilterEnabled ? 'Yes' : 'No'}
            </FluentText>
          </div>
        )}

        {samplingOptions && (
          <div className={styles.row}>
            <FluentText className={styles.label}>Sampling Options:</FluentText>
            <FluentText className={styles.value}>
              {JSON.stringify(samplingOptions, null, 2)}
            </FluentText>
          </div>
        )}
      </PopoverSurface>
    </Popover>
  );
};
