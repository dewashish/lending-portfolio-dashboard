'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PRDSection } from '@/components/docs/PRDSection';

const METRIC_DEFS = [
  { key: 'FPD%', definition: 'First Payment Default rate — percentage of loans that miss their very first EMI payment.', formula: 'Loans with FPD / Total Disbursements in Cohort' },
  { key: '30+ DPD%', definition: 'Percentage of portfolio (by balance) that is 30 or more days past due.', formula: 'Balance(DPD >= 30) / Total AUM' },
  { key: '90+ DPD%', definition: 'Percentage of portfolio (by balance) that is 90 or more days past due. Typically classified as NPL.', formula: 'Balance(DPD >= 90) / Total AUM' },
  { key: 'Net Credit Loss', definition: 'Net losses after recoveries as a percentage of total portfolio.', formula: '(Write-offs - Recoveries) / Total AUM' },
  { key: 'Non-Starter Rate', definition: 'Percentage of originations that default within the first 3 EMI payments.', formula: 'Non-Starters / Total Disbursements' },
  { key: 'Roll Forward Rate', definition: 'Percentage of delinquent accounts that move to a worse DPD bucket in a period.', formula: 'Accounts Moving Worse / Total Delinquent Accounts' },
  { key: 'Resolution Rate', definition: 'Percentage of delinquent accounts that cure (return to current) in a period.', formula: 'Accounts Cured / Total Delinquent Accounts' },
  { key: 'NPL Ratio', definition: 'Non-Performing Loans as a percentage of total outstanding.', formula: 'NPL Balance / Total Outstanding' },
  { key: 'Stage 2+3%', definition: 'Percentage of portfolio classified as IFRS 9 Stage 2 (significant increase in credit risk) or Stage 3 (credit impaired).', formula: '(Stage 2 + Stage 3 Balance) / Total Balance' },
  { key: 'Avg EWS Score', definition: 'Average Early Warning System score across all monitored facilities. Higher scores indicate greater risk.', formula: 'Sum(EWS Scores) / Count(Facilities)' },
  { key: 'Collection Efficiency', definition: 'Ratio of actual collections received to the total amount due for collection.', formula: 'Amount Collected / Amount Due' },
  { key: 'Provision Coverage', definition: 'Ratio of total provisions (ECL) to gross NPL balance.', formula: 'Total ECL Provision / Gross NPL Balance' },
  { key: 'Security Cover', definition: 'Ratio of collateral value to outstanding exposure.', formula: 'Collateral Value / Outstanding Exposure' },
  { key: 'Covenant Breach Rate', definition: 'Percentage of corporate facilities with at least one covenant breach.', formula: 'Facilities with Breach / Total Facilities' },
  { key: 'LOS Achievement', definition: 'Loan origination performance vs target — disbursement amount achieved as a percentage of monthly target.', formula: 'MTD Disbursement / Monthly Target' },
];

const GLOSSARY = [
  { term: 'AUM', definition: 'Assets Under Management — total outstanding loan balance across the portfolio.' },
  { term: 'DPD', definition: 'Days Past Due — number of days a payment is overdue from its scheduled date.' },
  { term: 'ECL', definition: 'Expected Credit Loss — IFRS 9 provision methodology based on probability-weighted credit losses.' },
  { term: 'EWS', definition: 'Early Warning System — scoring model that identifies facilities showing signs of credit deterioration before they become delinquent.' },
  { term: 'FPD', definition: 'First Payment Default — a loan that misses its very first scheduled payment.' },
  { term: 'IFRS 9', definition: 'International Financial Reporting Standard 9 — accounting standard for financial instruments requiring ECL-based provisioning in 3 stages.' },
  { term: 'LMS', definition: 'Loan Management System — core banking system that manages loan accounts, payments, and balances post-disbursement.' },
  { term: 'LOS', definition: 'Loan Origination System — system that manages the loan application lifecycle from lead generation to disbursement.' },
  { term: 'LTV', definition: 'Loan-to-Value — ratio of the loan amount to the appraised value of the collateral.' },
  { term: 'MOB', definition: 'Months on Book — age of a loan since origination, used in vintage analysis.' },
  { term: 'NPA', definition: 'Non-Performing Asset — a loan where the borrower has stopped making scheduled payments (typically 90+ DPD).' },
  { term: 'NPL', definition: 'Non-Performing Loan — synonymous with NPA; a loan classified as credit-impaired.' },
  { term: 'PCR', definition: 'Provision Coverage Ratio — ratio of provisions held to total NPL balance.' },
  { term: 'POS', definition: 'Principal Outstanding — the current outstanding principal balance of a loan or portfolio.' },
  { term: 'PQR', definition: 'Portfolio Quality Report — periodic report summarizing portfolio health metrics for risk committee review.' },
  { term: 'RAG', definition: 'Red-Amber-Green status indicator used for risk appetite governance.' },
  { term: 'RWA', definition: 'Risk-Weighted Assets — bank assets weighted by credit risk for capital adequacy calculation.' },
  { term: 'Stage 1', definition: 'IFRS 9 classification for performing loans with no significant increase in credit risk since origination.' },
  { term: 'Stage 2', definition: 'IFRS 9 classification for loans with significant increase in credit risk but not yet credit-impaired.' },
  { term: 'Stage 3', definition: 'IFRS 9 classification for credit-impaired loans (defaulted/NPL).' },
  { term: 'TDD', definition: 'Transaction Due Diligence — pre/post disbursal analysis of borrower credit bureau data.' },
];

const SUBSIDIARIES = [
  { name: 'Samman Capital', shortCode: 'SC', country: 'UAE', currency: 'AED', region: 'MENA' },
  { name: 'First Woman Bank', shortCode: 'FWB', country: 'Egypt', currency: 'EGP', region: 'MENA' },
  { name: 'Beltone', shortCode: 'BT', country: 'Egypt', currency: 'EGP', region: 'MENA' },
  { name: 'Mirabank', shortCode: 'MB', country: 'Colombia', currency: 'COP', region: 'Americas' },
  { name: 'LuloBank', shortCode: 'LB', country: 'USA', currency: 'USD', region: 'Americas' },
];

export function Appendices() {
  return (
    <PRDSection id="appendices" title="Appendices" sectionNumber={16}>
      {/* Appendix A: Metric Definitions */}
      <Accordion defaultExpanded sx={{ mb: 2, '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Appendix A: Key Metric Definitions</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell>Definition</TableCell>
                  <TableCell>Formula</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {METRIC_DEFS.map((m) => (
                  <TableRow key={m.key} hover>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.key}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{m.definition}</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontFamily: '"IBM Plex Mono", monospace', color: 'text.secondary' }}>{m.formula}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Appendix B: Glossary */}
      <Accordion defaultExpanded sx={{ mb: 2, '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Appendix B: Glossary</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 100 }}>Term</TableCell>
                  <TableCell>Definition</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {GLOSSARY.map((g) => (
                  <TableRow key={g.term} hover>
                    <TableCell>
                      <Chip label={g.term} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem', fontFamily: '"IBM Plex Mono", monospace' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{g.definition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Appendix C: Subsidiary Registry */}
      <Accordion defaultExpanded sx={{ mb: 2, '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Appendix C: Subsidiary Registry</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subsidiary</TableCell>
                  <TableCell>Short Code</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Currency</TableCell>
                  <TableCell>Region</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SUBSIDIARIES.map((s) => (
                  <TableRow key={s.shortCode} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                    <TableCell>
                      <Chip label={s.shortCode} size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', fontFamily: '"IBM Plex Mono", monospace' }} />
                    </TableCell>
                    <TableCell>{s.country}</TableCell>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.78rem' }}>{s.currency}</TableCell>
                    <TableCell>{s.region}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 3, p: 2, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          End of Product Requirements Document
        </Typography>
      </Box>
    </PRDSection>
  );
}
