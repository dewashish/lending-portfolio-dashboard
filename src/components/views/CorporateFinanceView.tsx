'use client';

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
} from '@mui/material';
import { formatCurrency } from '@/lib/format';
import type { PortfolioData, FilterState } from '@/lib/types';

interface Props {
  portfolio: PortfolioData;
  filters: FilterState;
}

export function CorporateFinanceView({ portfolio }: Props) {
  const watchlist = portfolio.corporateWatchlist;
  const covenants = portfolio.covenantTracking;
  const delinquency = portfolio.corporateDelinquency;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Corporate Watchlist */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Corporate Watchlist
        </Typography>
        {watchlist.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No watchlist data available
          </Typography>
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
                {watchlist.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.borrower}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {row.exposure}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.ewsTriggerType}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.internalRating}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor:
                            row.status === 'Active'
                              ? 'rgba(76,175,80,0.15)'
                              : row.status === 'Under Review'
                                ? 'rgba(255,152,0,0.15)'
                                : 'rgba(244,67,54,0.15)',
                          color:
                            row.status === 'Active'
                              ? '#4caf50'
                              : row.status === 'Under Review'
                                ? '#ff9800'
                                : '#f44336',
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

      {/* Covenant Tracking */}
      {covenants.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
            Covenant Tracking
          </Typography>
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
                {covenants.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.facilityType}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.sanctionedLimit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.currentPOS)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.riskRating}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.covenantDescription}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.covenantFrequency}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {row.npaFlag && (
                          <Chip label="NPA" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(244,67,54,0.15)', color: '#f44336' }} />
                        )}
                        {row.watchlistFlag && (
                          <Chip label="WL" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(255,152,0,0.15)', color: '#ff9800' }} />
                        )}
                        {row.restructuredFlag && (
                          <Chip label="Restruct" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(156,39,176,0.15)', color: '#ce93d8' }} />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Corporate Delinquency */}
      {delinquency.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
            Delinquency Overview
          </Typography>
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
                {delinquency.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.currentPOS)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: row.currentDPD > 90 ? '#f44336' : row.currentDPD > 30 ? '#ff9800' : '#4caf50',
                      }}
                    >
                      {row.currentDPD}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.currentRating}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.reasonForDelinquency}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.currentStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}
