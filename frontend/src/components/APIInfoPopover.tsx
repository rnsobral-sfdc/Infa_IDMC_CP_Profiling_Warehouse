import React, { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Button,
  makeStyles,
  tokens,
  Text as FluentText,
  Divider,
  Tooltip,
} from '@fluentui/react-components';
import { Info24Regular, Copy24Regular, Checkmark24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  popoverSurface: {
    maxWidth: '600px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  section: {
    marginBottom: tokens.spacingVerticalM,
  },
  sectionTitle: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalXS,
    display: 'block',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusSmall,
    display: 'block',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  endpoint: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  jsonContainer: {
    backgroundColor: tokens.colorNeutralBackground5,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  jsonHighlight: {
    backgroundColor: '#ffeb3b',
    padding: '2px 4px',
    borderRadius: tokens.borderRadiusSmall,
  },
  paramList: {
    marginLeft: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalXXS,
  },
  paramItem: {
    marginBottom: tokens.spacingVerticalXXS,
  },
  keyFieldsContainer: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: tokens.spacingVerticalS,
  },
  keyFieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusSmall,
    marginBottom: tokens.spacingVerticalXXS,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  keyFieldLabel: {
    minWidth: '100px',
    fontWeight: tokens.fontWeightSemibold,
  },
  keyFieldValue: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
  },
  usedInLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    marginLeft: tokens.spacingHorizontalM,
    marginTop: '2px',
    display: 'block',
  },
  copyButton: {
    minWidth: 'auto',
  },
});

interface KeyField {
  label: string;
  value: string;
  usedIn?: string; // Description of where this field is used in other APIs
}

interface APIInfoPopoverProps {
  title: string;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  parameters?: Record<string, any>;
  responseExample?: any;
  highlightedFields?: string[];
  description?: string;
  keyFields?: KeyField[]; // Important fields for API chaining
  baseUrl?: string; // Base URL for curl example
}

export const APIInfoPopover: React.FC<APIInfoPopoverProps> = ({
  title,
  endpoint,
  method = 'GET',
  parameters,
  responseExample,
  highlightedFields = [],
  description,
  keyFields = [],
  baseUrl,
}) => {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const buildCurlCommand = () => {
    if (!baseUrl) return '';

    // Replace parameter placeholders in endpoint with actual values
    let fullEndpoint = endpoint;
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        fullEndpoint = fullEndpoint.replace(`{${key}}`, String(value));
      });
    }

    const fullUrl = `${baseUrl}${fullEndpoint}`;

    let curl = `curl -X ${method} "${fullUrl}"`;
    curl += ` \\\n  -H "IDS-SESSION-ID: {your-session-id}"`;
    curl += ` \\\n  -H "Content-Type: application/json"`;

    return curl;
  };

  const handleCopyCurl = async () => {
    try {
      const curl = buildCurlCommand();
      await navigator.clipboard.writeText(curl);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const highlightJSON = (obj: any, path: string = ''): string => {
    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj !== 'object') {
      const currentPath = path;
      const shouldHighlight = highlightedFields.some(field =>
        currentPath.includes(field) || field === path
      );

      const valueStr = typeof obj === 'string' ? `"${obj}"` : String(obj);
      return shouldHighlight ? `<span class="highlight">${valueStr}</span>` : valueStr;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';

      const items = obj.map((item, idx) => {
        const itemPath = `${path}[${idx}]`;
        return `    ${highlightJSON(item, itemPath)}`;
      }).join(',\n');

      return `[\n${items}\n  ]`;
    }

    const entries = Object.entries(obj).map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      const shouldHighlightKey = highlightedFields.some(field =>
        field === key || currentPath.includes(field)
      );

      const keyStr = shouldHighlightKey ? `<span class="highlight">"${key}"</span>` : `"${key}"`;
      const valueStr = highlightJSON(value, currentPath);

      return `    ${keyStr}: ${valueStr}`;
    }).join(',\n');

    return `{\n${entries}\n  }`;
  };

  const renderJSON = () => {
    if (!responseExample) return null;

    const jsonStr = highlightJSON(responseExample);

    return (
      <div className={styles.jsonContainer}>
        <pre
          style={{
            margin: 0,
            fontFamily: 'monospace',
            fontSize: tokens.fontSizeBase200,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          dangerouslySetInnerHTML={{
            __html: jsonStr.replace(
              /<span class="highlight">(.*?)<\/span>/g,
              `<span style="background-color: #ffeb3b; padding: 2px 4px; border-radius: 2px;">$1</span>`
            )
          }}
        />
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={(e, data) => setOpen(data.open)}>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          size="small"
          icon={<Info24Regular />}
          aria-label="API Information"
        />
      </PopoverTrigger>
      <PopoverSurface className={styles.popoverSurface}>
        <div>
          <FluentText size={400} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
            {title}
          </FluentText>

          {description && (
            <div className={styles.section}>
              <FluentText size={200}>{description}</FluentText>
            </div>
          )}

          <Divider style={{ marginBottom: tokens.spacingVerticalM }} />

          <div className={styles.section}>
            <FluentText className={styles.sectionTitle} size={300}>API Endpoint</FluentText>
            <div className={styles.code}>
              <span style={{ color: tokens.colorPaletteDarkOrangeForeground1 }}>{method}</span>
              {' '}
              <span className={styles.endpoint}>{endpoint}</span>
            </div>
          </div>

          {parameters && Object.keys(parameters).length > 0 && (
            <div className={styles.section}>
              <FluentText className={styles.sectionTitle} size={300}>Parameters</FluentText>
              <div className={styles.paramList}>
                {Object.entries(parameters).map(([key, value]) => (
                  <div key={key} className={styles.paramItem}>
                    <FluentText size={200}>
                      <strong>{key}:</strong> {String(value)}
                    </FluentText>
                  </div>
                ))}
              </div>
            </div>
          )}

          {baseUrl && (
            <div className={styles.section}>
              <FluentText className={styles.sectionTitle} size={300}>
                curl Command
              </FluentText>
              <FluentText size={200} style={{ marginBottom: tokens.spacingVerticalXS, color: tokens.colorNeutralForeground3 }}>
                Full API call with all parameters bound. Replace session-id with your actual token.
              </FluentText>
              <div style={{ position: 'relative' }}>
                <pre className={styles.code} style={{ paddingRight: '40px' }}>
                  {buildCurlCommand()}
                </pre>
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <Tooltip content={copiedCurl ? 'Copied!' : 'Copy curl command'} relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={copiedCurl ? <Checkmark24Regular /> : <Copy24Regular />}
                      onClick={handleCopyCurl}
                      className={styles.copyButton}
                    />
                  </Tooltip>
                </div>
              </div>
            </div>
          )}

          {keyFields.length > 0 && (
            <div className={styles.section}>
              <FluentText className={styles.sectionTitle} size={300}>
                Key Fields for API Chaining
              </FluentText>
              <FluentText size={200} style={{ marginBottom: tokens.spacingVerticalXS, color: tokens.colorNeutralForeground3 }}>
                These fields are used to call other APIs. Click copy to use in your own API calls.
              </FluentText>
              <div className={styles.keyFieldsContainer}>
                {keyFields.map((field) => (
                  <div key={field.label}>
                    <div className={styles.keyFieldRow}>
                      <FluentText className={styles.keyFieldLabel} size={200}>
                        {field.label}
                      </FluentText>
                      <FluentText className={styles.keyFieldValue} size={200}>
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
                      <FluentText className={styles.usedInLabel} size={200}>
                        → Used in: {field.usedIn}
                      </FluentText>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {responseExample && (
            <div className={styles.section}>
              <FluentText className={styles.sectionTitle} size={300}>
                Response Example
                {highlightedFields.length > 0 && (
                  <span style={{ fontWeight: 'normal', fontSize: tokens.fontSizeBase200, marginLeft: tokens.spacingHorizontalXS }}>
                    (highlighted fields are displayed in the UI)
                  </span>
                )}
              </FluentText>
              {renderJSON()}
            </div>
          )}
        </div>
      </PopoverSurface>
    </Popover>
  );
};
