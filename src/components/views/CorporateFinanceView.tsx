'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { formatCurrency, formatNumber } from '@/lib/format';
import { ChartSkeleton } from '@/components/common/LoadingSkeleton';
import {
  useCorporateWatchlist,
  useCorporateCovenants,
  useCorporateDelinquency,
  useCorporatePortfolioMetrics,
} from '@/hooks/useCorporateData';
import type { ScopeSelection } from '@/lib/types';

const SUB_TABS = ['Overview', 'Watchlist', 'Covenants', 'Delinquency'] as const;

interface Props {
  scope?: ScopeSelection;
}

export function CorporateFinanceView({ scope }: Props) {
  const [subTab, setSubTab] = useState(0);

  const { data: watchlist, isLoading } = useCorporateWatchlist(scope);
  const { data: covenants } = useCorporateCovenants(scope);
  const { data: delinquency } = useCorporateDelinquency(scope);
  const { data: portfolio } = useCorporatePortfolioMetrics(scope);

  const activeCount = (watchlist ?? []).filter(r => r.status === 'Active').length;
  const reviewCount = (watchlist ?? []).filter(r => r.status === 'Under Review').length;
  const delinquentCount = (delinquency ?? []).filter(r => r.currentDPD > 0).length;

  const kpis: KPIItem[] = [
    { label: 'Watchlist Count', value: formatNumber((watchlist ?? []).length), color: (watchlist ?? []).length > 0 ? '#ff9800' : '#4caf50' },
    { label: 'Active Cases', value: formatNumber(activeCount), color: activeCount > 0 ? '#4caf50' : undefined },
    { label: 'Under Review', value: formatNumber(reviewCount), color: reviewCount > 0 ? '#ff9800' : undefined },
    { label: 'Delinquent', value: formatNumber(delinquentCount), color: delinquentCount > 0 ? '#f44336' : '#4caf50' },
  ];

  const renderSection = () => {
    if (isLoading) return <ChartSkeleton key="loading" height={400} />;

    switch (subTab) {
      case 0:
        return (
          <Box key="sub-0" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {(portfolio ?? []).length > 0 && (
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>Portfolio Summary</Typography>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Particular</TableCell>
                        {Object.keys((portfolio ?? [])[0]?.months ?? {}).map((month) => (
                          <TableCell key={month} align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>{month}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(portfolio ?? []).map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{row.particular}</TableCell>
                          {Object.values(row.months).map((val, mIdx) => (
                            <TableCell key={mIdx} align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                              {typeof val.total === 'number' ? formatCurrency(val.total) : val.total}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>
                Summary: {formatNumber((watchlist ?? []).length)} watchlist items, {formatNumber((covenants ?? []).length)} covenants, {formatNumber((delinquency ?? []).length)} delinquent accounts
              </Typography>
            </Card>
          </Box>
        );
      case 1:
        return (
          <Card key="sub-1" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>Corporate Watchlist</Typography>
            {(watchlist ?? []).length === 0 ? (
              <Typography variant="caption" color="text.secondary">No watchlist data available</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Borrower</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sector</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Exposure</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>EWS Trigger</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rating</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Remedial Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(watchlist ?? []).map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.borrower}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{row.exposure}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.ewsTriggerType}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.internalRating}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Chip
                            label={row.status}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 20,
                              bgcolor: row.status === 'Active' ? 'rgba(76,175,80,0.15)' : row.status === 'Under Review' ? 'rgba(255,152,0,0.15)' : 'rgba(244,67,54,0.15)',
                              color: row.status === 'Active' ? '#4caf50' : row.status === 'Under Review' ? '#ff9800' : '#f44336',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.remedialAction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        );
      case 2:
        return (
          <Card key="sub-2" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>Covenant Tracking</Typography>
            {(covenants ?? []).length === 0 ? (
              <Typography variant="caption" color="text.secondary">No covenant data available</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sanctioned</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Current POS</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rating</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Covenant</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Frequency</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Flags</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(covenants ?? []).map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.facilityType}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(row.sanctionedLimit)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(row.currentPOS)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.riskRating}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.covenantDescription}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.covenantFrequency}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {row.npaFlag && <Chip label="NPA" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(244,67,54,0.15)', color: '#f44336' }} />}
                            {row.watchlistFlag && <Chip label="WL" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(255,152,0,0.15)', color: '#ff9800' }} />}
                            {row.restructuredFlag && <Chip label="Restruct" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(156,39,176,0.15)', color: '#ce93d8' }} />}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        );
      case 3:
        return (
          <Card key="sub-3" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>Delinquency Overview</Typography>
            {(delinquency ?? []).length === 0 ? (
              <Typography variant="caption" color="text.secondary">No delinquency data available</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sector</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Current POS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DPD</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rating</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Reason</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(delinquency ?? []).map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(row.currentPOS)}</TableCell>
                        <TableCell align="right" sx={{
                          fontSize: '0.75rem',
                          fontFamily: 'IBM Plex Mono, monospace',
                          color: row.currentDPD > 90 ? '#f44336' : row.currentDPD > 30 ? '#ff9800' : '#4caf50',
                        }}>
                          {row.currentDPD}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.currentRating}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.reasonForDelinquency}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.currentStatus}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <KPIRow items={kpis} />

      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.72rem', fontWeight: 600, textTransform: 'none', px: 1.5, py: 0.5 },
          '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Box sx={{ pt: 1 }}>{renderSection()}</Box>
    </Box>
  );
}
