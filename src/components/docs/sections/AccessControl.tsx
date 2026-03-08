'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Box } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';
import { DiagramBox } from '@/components/docs/DiagramBox';

const ROLES = [
  {
    role: 'Super Admin',
    color: '#7c3aed',
    permissions: { viewDashboard: true, exportReports: true, editRiskAppetite: true, manageUsers: true, viewAllSubs: true },
  },
  {
    role: 'CRO',
    color: '#0284c7',
    permissions: { viewDashboard: true, exportReports: true, editRiskAppetite: false, manageUsers: false, viewAllSubs: true },
  },
  {
    role: 'Product Analyst',
    color: '#059669',
    permissions: { viewDashboard: true, exportReports: true, editRiskAppetite: false, manageUsers: false, viewAllSubs: false },
  },
  {
    role: 'Risk Analyst',
    color: '#d97706',
    permissions: { viewDashboard: true, exportReports: true, editRiskAppetite: false, manageUsers: false, viewAllSubs: true },
  },
];

const PERM_LABELS: Record<string, string> = {
  viewDashboard: 'View Dashboard',
  exportReports: 'Export Reports',
  editRiskAppetite: 'Edit Risk Appetite',
  manageUsers: 'Manage Users',
  viewAllSubs: 'View All Subsidiaries',
};

export function AccessControl() {
  return (
    <PRDSection id="access-control" title="Access Control" sectionNumber={12}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform implements role-based access control (RBAC) with four user roles. Authentication
        is handled via Supabase Auth with OAuth 2.0 support. Administrative functions (risk appetite
        configuration) are further protected by a PIN-based secondary authentication mechanism.
      </Typography>

      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1.5 }}>Role Permission Matrix</Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              {Object.values(PERM_LABELS).map((label) => (
                <TableCell key={label} sx={{ textAlign: 'center' }}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ROLES.map((r) => (
              <TableRow key={r.role} hover>
                <TableCell>
                  <Chip label={r.role} size="small" sx={{ bgcolor: r.color, color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />
                </TableCell>
                {Object.keys(PERM_LABELS).map((key) => (
                  <TableCell key={key} sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.82rem' }}>
                      {r.permissions[key as keyof typeof r.permissions] ? '\u2705' : '\u2014'}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DiagramBox title="Authentication Flow">
{`  ┌──────────┐     ┌──────────────┐     ┌──────────────┐
  │  Login   │────▶│  Supabase    │────▶│  Dashboard   │
  │  Page    │     │  OAuth 2.0   │     │  (Protected) │
  └──────────┘     └──────────────┘     └──────┬───────┘
                                               │
                                    ┌──────────┴───────────┐
                                    │                      │
                              ┌─────┴──────┐         ┌────┴──────┐
                              │ Standard   │         │   Admin   │
                              │ Features   │         │ Features  │
                              │ (all roles)│         │ (PIN req) │
                              └────────────┘         └───────────┘

  Session:  JWT cookie-based authentication
  Admin:    PIN dialog required for Risk Appetite editing
  Profile:  Role badge displayed in profile menu
  Signout:  Clears session + redirects to login`}
      </DiagramBox>

      <Box sx={{ mt: 3, p: 2, borderLeft: 3, borderColor: 'warning.main', bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>PIN-Protected Admin Access</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, fontSize: '0.82rem' }}>
          The Risk Appetite Drawer requires secondary authentication via a 4-digit PIN. This prevents
          accidental or unauthorized modification of risk thresholds, even for users with admin roles.
          The admin session locks automatically after inactivity. The PIN can be configured in system settings.
        </Typography>
      </Box>
    </PRDSection>
  );
}
