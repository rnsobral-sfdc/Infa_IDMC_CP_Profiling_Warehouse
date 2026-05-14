            {selectedTab === 'rule' && (
              <>
                {ruleStatistics.length > 0 ? (
                  ruleStatistics.map((rule) => (
                    <Card key={rule.rule_mapplet_id} className={styles.card}>
                      <div style={{ padding: tokens.spacingVerticalL }}>
                        {/* Rule Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacingVerticalL }}>
                          <div className={styles.sectionHeader}>
                            <CheckmarkCircle24Regular />
                            <div>
                              <Title3 style={{ marginBottom: tokens.spacingVerticalXXS }}>
                                {rule.name || rule.frs_id}
                              </Title3>
                              <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXXS, flexWrap: 'wrap' }}>
                                <Badge appearance="outline" color="informative">{rule.rule_type}</Badge>
                                {rule.dimension && (
                                  <Badge appearance="outline" color="brand">{rule.dimension}</Badge>
                                )}
                                {rule.is_exception && (
                                  <Badge appearance="filled" color="danger">Exception Rule</Badge>
                                )}
                              </div>
                              {rule.description && (
                                <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalXS, display: 'block' }}>
                                  {rule.description}
                                </FluentText>
                              )}
                            </div>
                          </div>
                          <APIInfoPopover
                            title="FRS Rule Metadata API"
                            endpoint="/frs/api/v1/Documents"
                            method="GET"
                            description="Fetches rule metadata including name, description, document type, and custom attributes (dimension, exception flag)"
                            baseUrl="https://na1.dm-us.informaticacloud.com"
                            parameters={{
                              "$filter": `id eq '${rule.frs_id}'`
                            }}
                            responseExample={{
                              value: [{
                                id: rule.frs_id,
                                name: rule.name,
                                description: rule.description,
                                documentType: rule.rule_type,
                                customAttributes: {
                                  stringAttrs: [
                                    { name: "DIMENSION", value: rule.dimension },
                                    { name: "EXCEPTION", value: String(rule.is_exception) }
                                  ]
                                }
                              }]
                            }}
                            highlightedFields={['name', 'documentType', 'customAttributes']}
                          />
                        </div>

                        <Divider style={{ marginBottom: tokens.spacingVerticalL }} />

                        {/* Input Mappings Section */}
                        <div style={{ marginBottom: tokens.spacingVerticalL }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                            <FluentText size={400} weight="semibold">
                              Input Mappings
                            </FluentText>
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Source columns feeding this rule
                            </FluentText>
                          </div>
                          {rule.input_mappings.length > 0 ? (
                            <div className={styles.tableContainer}>
                              <Table size="small" className={styles.table}>
                                <TableHeader>
                                  <TableRow>
                                    <TableHeaderCell>Source Column</TableHeaderCell>
                                    <TableHeaderCell>→</TableHeaderCell>
                                    <TableHeaderCell>Rule Input Port</TableHeaderCell>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rule.input_mappings.map((input, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>
                                        <TableCellLayout>
                                          <Badge appearance="filled" color="informative">
                                            {input.data_source_field_name}
                                          </Badge>
                                        </TableCellLayout>
                                      </TableCell>
                                      <TableCell>
                                        <TableCellLayout>
                                          <ChevronRight16Regular />
                                        </TableCellLayout>
                                      </TableCell>
                                      <TableCell>
                                        <TableCellLayout>
                                          <FluentText weight="semibold">{input.in_field_name}</FluentText>
                                        </TableCellLayout>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, fontStyle: 'italic' }}>
                              No input mappings configured
                            </FluentText>
                          )}
                        </div>

                        <Divider style={{ marginBottom: tokens.spacingVerticalL }} />

                        {/* Output Mappings Section */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                            <FluentText size={400} weight="semibold">
                              Output Statistics
                            </FluentText>
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Rule output columns with profiling metrics
                            </FluentText>
                          </div>

                          {rule.output_mappings.length > 0 ? (
                            rule.output_mappings.map((output, idx) => (
                              <div
                                key={idx}
                                style={{
                                  marginBottom: tokens.spacingVerticalL,
                                  padding: tokens.spacingVerticalL,
                                  backgroundColor: tokens.colorNeutralBackground2,
                                  borderRadius: tokens.borderRadiusMedium,
                                  border: `1px solid ${tokens.colorNeutralStroke1}`
                                }}
                              >
                                {/* Output Column Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                                  <div>
                                    <FluentText size={400} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalXXS }}>
                                      {output.out_field_name}
                                    </FluentText>
                                    <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' }}>
                                      <Badge appearance="outline" size="small">
                                        Key: {output.column_key}
                                      </Badge>
                                      <Badge appearance="outline" size="small" color="success">
                                        {output.datatype}
                                      </Badge>
                                      <Badge appearance="tint" size="small">
                                        {output.metric_count} metrics
                                      </Badge>
                                    </div>
                                  </div>
                                  <APIInfoPopover
                                    title="Rule Output Statistics API"
                                    endpoint={`/metric-store/api/v1/odata/Profiles('{profileId}')/Columns?runKey={runKey}`}
                                    method="GET"
                                    description="Fetches statistics for rule output columns (MAPPLETFIELD). The runKey parameter is critical to get data for the specific run."
                                    baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                                    parameters={{
                                      profileId: profileId as string || 'profile-uuid',
                                      runKey: run?.run_key || '1'
                                    }}
                                    responseExample={{
                                      value: [{
                                        columnKey: output.column_key,
                                        columnName: output.out_field_name,
                                        columnType: "MAPPLETFIELD",
                                        totalRows: 1671,
                                        nulCount: 0,
                                        nulPercent: 0,
                                        distinctCount: 5,
                                        distinctPercent: 0.3
                                      }]
                                    }}
                                    highlightedFields={['columnName', 'columnType', 'columnKey', 'totalRows']}
                                  />
                                </div>

                                {/* Metrics Grid - IDMC Style */}
                                <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                  {Object.entries(output.metrics).map(([metricKey, metricValue]) => {
                                    const displayValue = typeof metricValue === 'number'
                                      ? (metricKey.includes('PERCENT') || metricKey.includes('RATE')
                                        ? `${metricValue.toFixed(2)}%`
                                        : metricValue.toLocaleString())
                                      : metricValue;

                                    return (
                                      <div
                                        key={metricKey}
                                        style={{
                                          padding: tokens.spacingVerticalM,
                                          backgroundColor: tokens.colorNeutralBackground1,
                                          borderRadius: tokens.borderRadiusSmall,
                                          border: `1px solid ${tokens.colorNeutralStroke2}`
                                        }}
                                      >
                                        <FluentText
                                          size={200}
                                          style={{
                                            color: tokens.colorNeutralForeground3,
                                            display: 'block',
                                            marginBottom: tokens.spacingVerticalXXS
                                          }}
                                        >
                                          {metricKey.replace(/_/g, ' ')}
                                        </FluentText>
                                        <FluentText
                                          size={500}
                                          weight="semibold"
                                          style={{ display: 'block', fontFamily: 'monospace' }}
                                        >
                                          {displayValue}
                                        </FluentText>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          ) : (
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, fontStyle: 'italic' }}>
                              No output statistics available
                            </FluentText>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className={styles.card}>
                    <div style={{ padding: tokens.spacingVerticalXXL, textAlign: 'center' }}>
                      <CheckmarkCircle24Regular style={{ fontSize: '48px', color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM }} />
                      <Title3 style={{ marginBottom: tokens.spacingVerticalS }}>No Rule Statistics Available</Title3>
                      <Body1 style={{ color: tokens.colorNeutralForeground3 }}>
                        This profiling run does not include any data quality rules.
                      </Body1>
                    </div>
                  </Card>
                )}
              </>
            )}