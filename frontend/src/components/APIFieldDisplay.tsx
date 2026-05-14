import React, { useState } from 'react';
import {
  Button,
  makeStyles,
  tokens,
  Text as FluentText,
  Tooltip,
} from '@fluentui/react-components';
import { Copy24Regular, Checkmark24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusSmall,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  fieldLabel: {
    minWidth: '120px',
    fontWeight: tokens.fontWeightSemibold,
  },
  fieldValue: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
  },
  copyButton: {
    minWidth: 'auto',
  },
  usedInLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
});

interface APIField {
  label: string;
  value: string;
  usedIn?: string; // Description of where this field is used in other APIs
}

interface APIFieldDisplayProps {
  fields: APIField[];
  title?: string;
}

export const APIFieldDisplay: React.FC<APIFieldDisplayProps> = ({ fields, title }) => {
  const styles = useStyles();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={styles.container}>
      {title && (
        <FluentText size={300} weight="semibold" style={{ marginBottom: tokens.spacingVerticalXS }}>
          {title}
        </FluentText>
      )}
      {fields.map((field) => (
        <div key={field.label}>
          <div className={styles.fieldRow}>
            <FluentText className={styles.fieldLabel} size={200}>
              {field.label}:
            </FluentText>
            <FluentText className={styles.fieldValue} size={200}>
              {field.value}
            </FluentText>
            <Tooltip content={copiedField === field.label ? 'Copied!' : 'Copy to clipboard'} relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={copiedField === field.label ? <Checkmark24Regular /> : <Copy24Regular />}
                onClick={() => handleCopy(field.label, field.value)}
                className={styles.copyButton}
              />
            </Tooltip>
          </div>
          {field.usedIn && (
            <FluentText className={styles.usedInLabel} size={200} style={{ marginLeft: tokens.spacingHorizontalM, marginTop: '2px' }}>
              → Used in: {field.usedIn}
            </FluentText>
          )}
        </div>
      ))}
    </div>
  );
};
