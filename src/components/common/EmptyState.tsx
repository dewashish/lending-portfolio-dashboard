'use client';

import { Box, Typography } from '@mui/material';
import FolderOffIcon from '@mui/icons-material/FolderOff';

interface Props {
  message?: string;
}

export function EmptyState({ message = 'No data available for selected filters' }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, opacity: 0.5 }}>
      <FolderOffIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
