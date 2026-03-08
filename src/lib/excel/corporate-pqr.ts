import ExcelJS from 'exceljs';
import type { ScopeSelection } from '@/lib/types';
import * as corp from '@/lib/queries/corporate';
import { addDataSheet, getTabColor, downloadWorkbook, getFilename, EXCEL } from './utils';

export async function generateCorporatePQR(scope?: ScopeSelection): Promise<void> {
  const [
    portfolioMetrics,
    topCustomers,
    industryConc,
    collateral,
    ltv,
    maturity,
    provisioning,
    ratingAnalysis,
    ratingMigration,
    watchlist,
    covenants,
    delinquency,
  ] = await Promise.all([
    corp.fetchCorporatePortfolioMetrics(scope),
    corp.fetchCorporateTopCustomers(scope),
    corp.fetchCorporateIndustryConcentration(scope),
    corp.fetchCorporateCollateralAnalysis(scope),
    corp.fetchCorporateLTVDistribution(scope),
    corp.fetchCorporateMaturityProfile(scope),
    corp.fetchCorporateProvisioningECL(scope),
    corp.fetchCorporateRatingAnalysis(scope),
    corp.fetchCorporateRatingMigration(scope),
    corp.fetchCorporateWatchlist(scope),
    corp.fetchCorporateCovenants(scope),
    corp.fetchCorporateDelinquency(scope),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Avaloura Portfolio Monitor';
  wb.created = new Date();
  const tabColor = getTabColor(3);

  // ── Sheet 1: Portfolio Overview (custom pivot) ──────────────────
  {
    const pmPeriods = new Set<string>();
    for (const r of portfolioMetrics) Object.keys(r.months).forEach(k => pmPeriods.add(k));
    const pmSorted = Array.from(pmPeriods).sort();
    const pmCols: Partial<import('exceljs').Column>[] = [
      { header: 'Particular', key: 'particular', width: 28 },
    ];
    for (const p of pmSorted) {
      pmCols.push({ header: `${p} Total`, key: `${p}_total`, width: 16, style: { numFmt: EXCEL.currency } });
      pmCols.push({ header: `${p} Fund-Based`, key: `${p}_fund`, width: 16, style: { numFmt: EXCEL.currency } });
      pmCols.push({ header: `${p} Non-Fund`, key: `${p}_nonfb`, width: 16, style: { numFmt: EXCEL.currency } });
    }
    const pmRows = portfolioMetrics.map(r => {
      const row: Record<string, unknown> = { particular: r.particular };
      for (const p of pmSorted) {
        const m = r.months[p];
        row[`${p}_total`] = m?.total ?? null;
        row[`${p}_fund`] = m?.fundBased ?? null;
        row[`${p}_nonfb`] = m?.nonFB ?? null;
      }
      return row;
    });
    addDataSheet(wb, 'Portfolio Overview', pmCols, pmRows, tabColor);
  }

  // ── Sheet 2: Top Customers ────────────────────────────────────
  {
    addDataSheet(
      wb,
      'Top Customers',
      [
        { header: 'Customer Name', key: 'customerName', width: 22 },
        { header: 'Sector', key: 'sector', width: 16 },
        { header: 'Sanctioned Limit', key: 'sanctionedLimit', width: 18, style: { numFmt: EXCEL.currency } },
        { header: 'Disbursed Amount', key: 'disbursedAmount', width: 18, style: { numFmt: EXCEL.currency } },
        { header: 'Current POS', key: 'currentPOS', width: 18, style: { numFmt: EXCEL.currency } },
        { header: 'Facility Type', key: 'facilityType', width: 16 },
        { header: 'Risk Rating', key: 'riskRating', width: 12 },
        { header: 'DPD', key: 'dpd', width: 8 },
        { header: 'IFRS Stage', key: 'ifrsStage', width: 10 },
        { header: 'Rank by Disbursement', key: 'rankByDisbursement', width: 16 },
        { header: 'Rank by POS', key: 'rankByPOS', width: 12 },
      ],
      topCustomers.map(r => ({
        customerName: r.customerName,
        sector: r.sector,
        sanctionedLimit: r.sanctionedLimit,
        disbursedAmount: r.disbursedAmount,
        currentPOS: r.currentPOS,
        facilityType: r.facilityType,
        riskRating: r.riskRating,
        dpd: r.dpd,
        ifrsStage: r.ifrsStage,
        rankByDisbursement: r.rankByDisbursement,
        rankByPOS: r.rankByPOS,
      })),
      tabColor,
    );
  }

  // ── Sheet 3: Industry Concentration ───────────────────────────
  {
    addDataSheet(
      wb,
      'Industry Concentration',
      [
        { header: 'Sector', key: 'sector', width: 18 },
        { header: 'Period', key: 'period', width: 14 },
        { header: 'Disbursement', key: 'disbursement', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'POS', key: 'pos', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Portfolio Share', key: 'portfolioShare', width: 14, style: { numFmt: EXCEL.percent } },
        { header: 'IRR', key: 'irr', width: 10, style: { numFmt: EXCEL.percent } },
        { header: 'Facility Count', key: 'facilityCount', width: 12 },
      ],
      industryConc.map(r => ({
        sector: r.sector,
        period: r.period,
        disbursement: r.disbursement,
        pos: r.pos,
        portfolioShare: r.portfolioShare,
        irr: r.irr,
        facilityCount: r.facilityCount,
      })),
      tabColor,
    );
  }

  // ── Sheet 4: Collateral Analysis ──────────────────────────────
  {
    addDataSheet(
      wb,
      'Collateral Analysis',
      [
        { header: 'Collateral Type', key: 'collateralType', width: 20 },
        { header: 'Facility Count', key: 'facilityCount', width: 12 },
        { header: 'Collateral Value', key: 'collateralValue', width: 18, style: { numFmt: EXCEL.currency } },
        { header: 'Exposure Covered', key: 'exposureCovered', width: 18, style: { numFmt: EXCEL.currency } },
        { header: 'Coverage Ratio', key: 'coverageRatio', width: 14, style: { numFmt: EXCEL.percent } },
      ],
      collateral.map(r => ({
        collateralType: r.collateralType,
        facilityCount: r.facilityCount,
        collateralValue: r.collateralValue,
        exposureCovered: r.exposureCovered,
        coverageRatio: r.coverageRatio,
      })),
      tabColor,
    );
  }

  // ── Sheet 5: LTV Distribution ─────────────────────────────────
  {
    addDataSheet(
      wb,
      'LTV Distribution',
      [
        { header: 'LTV Band', key: 'ltvBand', width: 14 },
        { header: 'Facility Count', key: 'facilityCount', width: 12 },
        { header: 'Balance', key: 'balance', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Portfolio Share', key: 'portfolioShare', width: 14, style: { numFmt: EXCEL.percent } },
      ],
      ltv.map(r => ({
        ltvBand: r.ltvBand,
        facilityCount: r.facilityCount,
        balance: r.balance,
        portfolioShare: r.portfolioShare,
      })),
      tabColor,
    );
  }

  // ── Sheet 6: Maturity Profile ─────────────────────────────────
  {
    addDataSheet(
      wb,
      'Maturity Profile',
      [
        { header: 'Maturity Band', key: 'maturityBand', width: 14 },
        { header: 'Facility Basis', key: 'facilityBasis', width: 14 },
        { header: 'Facility Count', key: 'facilityCount', width: 12 },
        { header: 'Balance', key: 'balance', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Portfolio Share', key: 'portfolioShare', width: 14, style: { numFmt: EXCEL.percent } },
      ],
      maturity.map(r => ({
        maturityBand: r.maturityBand,
        facilityBasis: r.facilityBasis,
        facilityCount: r.facilityCount,
        balance: r.balance,
        portfolioShare: r.portfolioShare,
      })),
      tabColor,
    );
  }

  // ── Sheet 7: Provisioning & ECL ───────────────────────────────
  {
    addDataSheet(
      wb,
      'Provisioning & ECL',
      [
        { header: 'Period', key: 'period', width: 14 },
        { header: 'IFRS Stage', key: 'ifrsStage', width: 10 },
        { header: 'Gross Exposure', key: 'grossExposure', width: 18, style: { numFmt: EXCEL.currency } },
        { header: 'Provision Amount', key: 'provisionAmount', width: 18, style: { numFmt: EXCEL.currency } },
        { header: 'PCR %', key: 'pcrPct', width: 12, style: { numFmt: EXCEL.percent } },
      ],
      provisioning.map(r => ({
        period: r.period,
        ifrsStage: r.ifrsStage,
        grossExposure: r.grossExposure,
        provisionAmount: r.provisionAmount,
        pcrPct: r.pcrPct,
      })),
      tabColor,
    );
  }

  // ── Sheet 8: Rating Analysis ──────────────────────────────────
  {
    addDataSheet(
      wb,
      'Rating Analysis',
      [
        { header: 'Period', key: 'period', width: 14 },
        { header: 'Rating Band', key: 'ratingBand', width: 14 },
        { header: 'Disbursement', key: 'disbursement', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'POS', key: 'pos', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Facility Count', key: 'facilityCount', width: 12 },
        { header: 'Portfolio Share', key: 'portfolioShare', width: 14, style: { numFmt: EXCEL.percent } },
      ],
      ratingAnalysis.map(r => ({
        period: r.period,
        ratingBand: r.ratingBand,
        disbursement: r.disbursement,
        pos: r.pos,
        facilityCount: r.facilityCount,
        portfolioShare: r.portfolioShare,
      })),
      tabColor,
    );
  }

  // ── Sheet 9: Rating Migration ─────────────────────────────────
  {
    addDataSheet(
      wb,
      'Rating Migration',
      [
        { header: 'Customer Name', key: 'customerName', width: 22 },
        { header: 'Sector', key: 'sector', width: 16 },
        { header: 'Prior Rating', key: 'priorRating', width: 12 },
        { header: 'Current Rating', key: 'currentRating', width: 12 },
        { header: 'Migration Direction', key: 'migrationDirection', width: 16 },
        { header: 'Trigger Reason', key: 'triggerReason', width: 20 },
        { header: 'Exposure', key: 'exposure', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Migration Date', key: 'migrationDate', width: 14 },
      ],
      ratingMigration.map(r => ({
        customerName: r.customerName,
        sector: r.sector,
        priorRating: r.priorRating,
        currentRating: r.currentRating,
        migrationDirection: r.migrationDirection,
        triggerReason: r.triggerReason,
        exposure: r.exposure,
        migrationDate: r.migrationDate,
      })),
      tabColor,
    );
  }

  // ── Sheet 10: Watchlist ───────────────────────────────────────
  {
    addDataSheet(
      wb,
      'Watchlist',
      [
        { header: 'Borrower', key: 'borrower', width: 22 },
        { header: 'Sector', key: 'sector', width: 16 },
        { header: 'Exposure', key: 'exposure', width: 16 },
        { header: 'EWS Trigger Type', key: 'ewsTriggerType', width: 18 },
        { header: 'Internal Rating', key: 'internalRating', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Remedial Action', key: 'remedialAction', width: 20 },
      ],
      watchlist.map(r => ({
        borrower: r.borrower,
        sector: r.sector,
        exposure: r.exposure,
        ewsTriggerType: r.ewsTriggerType,
        internalRating: r.internalRating,
        status: r.status,
        remedialAction: r.remedialAction,
      })),
      tabColor,
    );
  }

  // ── Sheet 11: Covenant Tracking ───────────────────────────────
  {
    addDataSheet(
      wb,
      'Covenant Tracking',
      [
        { header: 'Group ID', key: 'groupId', width: 10 },
        { header: 'Cust ID', key: 'custId', width: 10 },
        { header: 'Customer Name', key: 'customerName', width: 22 },
        { header: 'Date of Disbursal', key: 'dateOfDisbursal', width: 14 },
        { header: 'Sanctioned Limit', key: 'sanctionedLimit', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Disbursed Amount', key: 'disbursedAmount', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Current POS', key: 'currentPOS', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Facility Type', key: 'facilityType', width: 14 },
        { header: 'Security Type', key: 'securityType', width: 14 },
        { header: 'Security Cover', key: 'securityCover', width: 12 },
        { header: 'Risk Rating', key: 'riskRating', width: 10 },
        { header: 'Covenant Category', key: 'covenantCategory', width: 16 },
        { header: 'Covenant Type', key: 'covenantType', width: 14 },
        { header: 'Covenant Description', key: 'covenantDescription', width: 24 },
        { header: 'Covenant Frequency', key: 'covenantFrequency', width: 14 },
        { header: 'Submission Date', key: 'submissionDate', width: 14 },
        { header: 'Approval for Extension', key: 'approvalForExtension', width: 16 },
        { header: 'NPA Flag', key: 'npaFlag', width: 8 },
        { header: 'Restructured Flag', key: 'restructuredFlag', width: 12 },
        { header: 'Watchlist Flag', key: 'watchlistFlag', width: 10 },
        { header: 'Writeoff Flag', key: 'writeoffFlag', width: 10 },
      ],
      covenants.map(r => ({
        groupId: r.groupId,
        custId: r.custId,
        customerName: r.customerName,
        dateOfDisbursal: r.dateOfDisbursal,
        sanctionedLimit: r.sanctionedLimit,
        disbursedAmount: r.disbursedAmount,
        currentPOS: r.currentPOS,
        facilityType: r.facilityType,
        securityType: r.securityType,
        securityCover: r.securityCover,
        riskRating: r.riskRating,
        covenantCategory: r.covenantCategory,
        covenantType: r.covenantType,
        covenantDescription: r.covenantDescription,
        covenantFrequency: r.covenantFrequency,
        submissionDate: r.submissionDate,
        approvalForExtension: r.approvalForExtension,
        npaFlag: r.npaFlag,
        restructuredFlag: r.restructuredFlag,
        watchlistFlag: r.watchlistFlag,
        writeoffFlag: r.writeoffFlag,
      })),
      tabColor,
    );
  }

  // ── Sheet 12: Delinquency ─────────────────────────────────────
  {
    addDataSheet(
      wb,
      'Delinquency',
      [
        { header: 'Group ID', key: 'groupId', width: 10 },
        { header: 'Cust ID', key: 'custId', width: 10 },
        { header: 'Customer Name', key: 'customerName', width: 22 },
        { header: 'Sector', key: 'sector', width: 16 },
        { header: 'Industry', key: 'industry', width: 16 },
        { header: 'Sanctioned Limit', key: 'sanctionedLimit', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Disbursed Amount', key: 'disbursedAmount', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Current POS', key: 'currentPOS', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Facility Type', key: 'facilityType', width: 14 },
        { header: 'Security Type', key: 'securityType', width: 14 },
        { header: 'Security Cover', key: 'securityCover', width: 12 },
        { header: 'Rating at Disbursement', key: 'ratingAtDisbursement', width: 16 },
        { header: 'Current Rating', key: 'currentRating', width: 12 },
        { header: 'Renewal Done', key: 'renewalDone', width: 10 },
        { header: 'DPD at Month End', key: 'dpdAtMonthEnd', width: 12 },
        { header: 'Current DPD', key: 'currentDPD', width: 10 },
        { header: 'Reason for Delinquency', key: 'reasonForDelinquency', width: 20 },
        { header: 'Last Remedial Action', key: 'lastRemedialAction', width: 18 },
        { header: 'Update on Remedial', key: 'updateOnRemedial', width: 18 },
        { header: 'Current Status', key: 'currentStatus', width: 14 },
        { header: 'Next Step', key: 'nextStep', width: 18 },
      ],
      delinquency.map(r => ({
        groupId: r.groupId,
        custId: r.custId,
        customerName: r.customerName,
        sector: r.sector,
        industry: r.industry,
        sanctionedLimit: r.sanctionedLimit,
        disbursedAmount: r.disbursedAmount,
        currentPOS: r.currentPOS,
        facilityType: r.facilityType,
        securityType: r.securityType,
        securityCover: r.securityCover,
        ratingAtDisbursement: r.ratingAtDisbursement,
        currentRating: r.currentRating,
        renewalDone: r.renewalDone,
        dpdAtMonthEnd: r.dpdAtMonthEnd,
        currentDPD: r.currentDPD,
        reasonForDelinquency: r.reasonForDelinquency,
        lastRemedialAction: r.lastRemedialAction,
        updateOnRemedial: r.updateOnRemedial,
        currentStatus: r.currentStatus,
        nextStep: r.nextStep,
      })),
      tabColor,
    );
  }

  await downloadWorkbook(wb, getFilename(3));
}
