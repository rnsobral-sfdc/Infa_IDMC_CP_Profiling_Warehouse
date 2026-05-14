import React from 'react';
import {
  Card,
  Text as FluentText,
  Title1,
  Title3,
  Body1,
  makeStyles,
  tokens,
  Divider,
} from '@fluentui/react-components';
import { Warning24Regular } from '@fluentui/react-icons';
import Layout from '../src/components/Layout';
import { PageHeader } from '../src/components/PageHeader';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalXL,
  },
  warningIcon: {
    color: tokens.colorPaletteYellowForeground1,
    fontSize: '48px',
  },
  card: {
    padding: tokens.spacingVerticalXXL,
  },
  section: {
    marginBottom: tokens.spacingVerticalXL,
  },
  disclaimerBox: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusMedium,
    borderLeft: `4px solid ${tokens.colorPaletteYellowBorder1}`,
    marginTop: tokens.spacingVerticalL,
  },
  paragraph: {
    marginBottom: tokens.spacingVerticalM,
    lineHeight: '1.6',
  },
  emphasis: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteRedForeground1,
  },
  list: {
    marginLeft: tokens.spacingHorizontalXL,
    marginTop: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalM,
  },
  listItem: {
    marginBottom: tokens.spacingVerticalXS,
    lineHeight: '1.6',
  },
});

export default function DisclaimerPage() {
  const styles = useStyles();

  return (
    <Layout>
      <div className={styles.container}>
        <PageHeader
          title="Legal Disclaimer"
          subtitle="Educational Use Only - Please read carefully before using this software"
        />

        <Card className={styles.card}>
          <div className={styles.disclaimerBox}>
            <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>
              DISCLAIMER — EDUCATIONAL USE ONLY
            </Title3>
            <FluentText size={300} style={{ lineHeight: '1.6' }}>
              This software is provided for <span className={styles.emphasis}>educational and informational purposes only</span>.
            </FluentText>
          </div>

          <Divider style={{ margin: `${tokens.spacingVerticalXL} 0` }} />

          <div className={styles.section}>
            <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>Purpose and Scope</Title3>
            <FluentText size={300} className={styles.paragraph}>
              This software is intended solely to demonstrate and teach the use of Informatica Intelligent Data Management Cloud (IDMC) profiling APIs and does not constitute official Salesforce or Informatica documentation, product training, or professional services.
            </FluentText>
          </div>

          <Divider style={{ margin: `${tokens.spacingVerticalL} 0` }} />

          <div className={styles.section}>
            <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>No Warranties</Title3>
            <FluentText size={300} className={styles.paragraph}>
              THIS SOFTWARE IS PROVIDED "AS IS," <span className={styles.emphasis}>WITHOUT WARRANTY OF ANY KIND</span>, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NONINFRINGEMENT.
            </FluentText>
            <FluentText size={300} className={styles.paragraph}>
              IN NO EVENT SHALL SALESFORCE, INC., ITS AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THIS SOFTWARE OR THE USE OR RELIANCE UPON ANY INFORMATION CONTAINED HEREIN.
            </FluentText>
          </div>

          <Divider style={{ margin: `${tokens.spacingVerticalL} 0` }} />

          <div className={styles.section}>
            <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>Accuracy and Currency</Title3>
            <FluentText size={300} className={styles.paragraph}>
              Salesforce has made a good faith effort to ensure the accuracy of the information contained in this software as of the date of publication. Because Salesforce's and Informatica's products, procedures, APIs, and policies change from time to time, Salesforce cannot guarantee that the content will remain current or accurate over time.
            </FluentText>
            <FluentText size={300} className={styles.paragraph}>
              <span className={styles.emphasis}>This software is not a substitute for official product documentation</span>, and no information herein should be relied upon for production system design or implementation.
            </FluentText>
          </div>

          <Divider style={{ margin: `${tokens.spacingVerticalL} 0` }} />

          <div className={styles.section}>
            <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>Applicable Agreements</Title3>
            <FluentText size={300} className={styles.paragraph}>
              The rights and responsibilities of the parties with regard to your use of Salesforce's online software services shall be solely as set forth in the applicable mutually executed subscription agreement(s) or online Salesforce terms of service between the parties, available at:
            </FluentText>
            <FluentText size={300} className={styles.paragraph}>
              <a
                href="https://www.salesforce.com/company/legal/customer-agreements/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: tokens.colorBrandForeground1 }}
              >
                https://www.salesforce.com/company/legal/customer-agreements/
              </a>
            </FluentText>
          </div>

          <Divider style={{ margin: `${tokens.spacingVerticalL} 0` }} />

          <div className={styles.section}>
            <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>Trademarks and Third-Party Services</Title3>
            <FluentText size={300} className={styles.paragraph}>
              All product names, trademarks, and registered trademarks are the property of their respective owners.
            </FluentText>
            <FluentText size={300} className={styles.paragraph}>
              Use of any third-party API, including the IDMC profiling APIs, is subject to the applicable terms of service of that platform.
            </FluentText>
          </div>

          <Divider style={{ margin: `${tokens.spacingVerticalL} 0` }} />

          <div className={styles.section}>
            <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>Important Reminders</Title3>
            <div className={styles.list}>
              <FluentText size={300} className={styles.listItem} style={{ display: 'block' }}>
                • This is educational software for learning API usage patterns
              </FluentText>
              <FluentText size={300} className={styles.listItem} style={{ display: 'block' }}>
                • Always refer to official product documentation for production implementations
              </FluentText>
              <FluentText size={300} className={styles.listItem} style={{ display: 'block' }}>
                • API endpoints, parameters, and response formats may change without notice
              </FluentText>
              <FluentText size={300} className={styles.listItem} style={{ display: 'block' }}>
                • Test thoroughly in non-production environments before any production use
              </FluentText>
              <FluentText size={300} className={styles.listItem} style={{ display: 'block' }}>
                • Follow your organization's security and data governance policies
              </FluentText>
            </div>
          </div>

          <div style={{
            marginTop: tokens.spacingVerticalXXL,
            paddingTop: tokens.spacingVerticalL,
            borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
            textAlign: 'center'
          }}>
            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              Last Updated: May 2026
            </FluentText>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
