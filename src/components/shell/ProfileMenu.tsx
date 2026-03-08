'use client';

import {
  Menu, MenuItem, Box, Typography, Divider,
  ListItemIcon, ListItemText,
} from '@mui/material';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import DescriptionIcon from '@mui/icons-material/Description';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LogoutIcon from '@mui/icons-material/Logout';
import ExploreIcon from '@mui/icons-material/Explore';
import { useUser, type UserRole } from '@/lib/user-context';
import { useRouter } from 'next/navigation';
import { APP_VERSION } from '@/lib/version';
import { useTour } from '@/lib/tour-context';

interface Props {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  cro: 'CRO',
  product_analyst: 'Product Analyst',
  risk_analyst: 'Risk Analyst',
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: '#7c3aed',
  cro: '#0284c7',
  product_analyst: '#059669',
  risk_analyst: '#d97706',
};

export function ProfileMenu({ anchorEl, open, onClose }: Props) {
  const { profile } = useUser();
  const router = useRouter();
  const { startTour } = useTour();

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleStartTour = () => {
    onClose();
    setTimeout(() => startTour(), 300);
  };

  const handleSignOut = async () => {
    onClose();
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/signout';
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      slotProps={{ paper: { sx: { width: 300 } } }}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
          {profile?.displayName ?? 'User'}
        </Typography>
        {profile?.role && (
          <Typography variant="caption" sx={{ color: ROLE_COLORS[profile.role], fontWeight: 600 }}>
            {ROLE_LABELS[profile.role]}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* ── Navigation items ── */}
      <MenuItem onClick={() => handleNavigate('/dashboard/integration-guide')} sx={{ fontSize: '0.85rem' }}>
        <ListItemIcon><IntegrationInstructionsIcon fontSize="small" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem' }}>Integration Guide</ListItemText>
      </MenuItem>

      <MenuItem onClick={() => handleNavigate('/dashboard/docs')} sx={{ fontSize: '0.85rem' }}>
        <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem' }}>Product Documentation</ListItemText>
      </MenuItem>

      <MenuItem onClick={() => handleNavigate('/dashboard/about')} sx={{ fontSize: '0.85rem' }}>
        <ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem' }}>About Us</ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => {
          window.location.href = 'mailto:dewashish.dey05@gmail.com?subject=Avaloura Portfolio Monitor - Support Request';
          onClose();
        }}
        sx={{ fontSize: '0.85rem' }}
      >
        <ListItemIcon><SupportAgentIcon fontSize="small" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem' }}>Support</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleStartTour} sx={{ fontSize: '0.85rem' }}>
        <ListItemIcon><ExploreIcon fontSize="small" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem' }}>Take a Tour</ListItemText>
      </MenuItem>

      <Divider />

      {/* ── Footer ── */}
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
          Avaloura Portfolio Monitor
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', lineHeight: 1.4 }}>
          v{APP_VERSION} &middot; &copy; Dewashish Dey
        </Typography>
      </Box>

      <Divider />

      {/* ── Sign Out ── */}
      <MenuItem onClick={handleSignOut}>
        <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', color: 'error.main' }}>
          Sign Out
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}
