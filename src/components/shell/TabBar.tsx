'use client';

import { Tabs, Tab, Box } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { TAB_NAMES, type TabName } from '@/lib/constants';

const TAB_ICONS: Record<TabName, React.ReactElement> = {
  'Group Overview': <DashboardIcon sx={{ fontSize: 18 }} />,
  'Consumer Finance': <PersonIcon sx={{ fontSize: 18 }} />,
  'Trade Finance': <AccountBalanceIcon sx={{ fontSize: 18 }} />,
  'Corporate Finance': <BusinessIcon sx={{ fontSize: 18 }} />,
  'Risk & Concentrations': <WarningAmberIcon sx={{ fontSize: 18 }} />,
  'Forward Outlook': <TrendingUpIcon sx={{ fontSize: 18 }} />,
};

interface Props {
  activeTab: number;
  onTabChange: (index: number) => void;
}

export function TabBar({ activeTab, onTabChange }: Props) {
  return (
    <Box id="tour-tab-bar" sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: 'background.default' }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => onTabChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 44,
          '& .MuiTab-root': { minHeight: 44, py: 1 },
          '& .Mui-selected': { color: 'primary.light' },
          '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 2 },
        }}
      >
        {TAB_NAMES.map((name) => (
          <Tab
            key={name}
            label={name}
            icon={TAB_ICONS[name]}
            iconPosition="start"
            sx={{ gap: 0.5 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
